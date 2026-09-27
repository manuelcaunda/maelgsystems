/**
 * Produtos, planos e o acesso de cada produto a API.
 *
 * Um produto so existe completo quando tem, no minimo, um plano. Por isso
 * `criarProdutoComEsqueleto` cria as tres coisas numa transaccao: produto,
 * produto_acesso e planos. Se um plano falhar, nao fica produto pela metade.
 */
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { emTransacao, getPool } from '../db';
import { decifrar, cifrar, compararSeguro } from '../cifra';
import type { ContagemRow, PlanoRow, ProdutoAcessoRow, ProdutoRow } from './tabelas';
import type { AcessoProduto, Plan, Product } from '../../types';

export class ProdutoErro extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function paraProduto(r: ProdutoRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.nome,
    description: r.descricao ?? '',
    version: r.versao ?? '',
    apiUrl: r.api_url ?? '',
    status: r.status,
    createdAt: r.criado_em.toISOString(),
  };
}

function paraPlano(r: PlanoRow): Plan {
  return {
    id: r.id,
    produtoSlug: r.produto_slug ?? '',
    codigo: r.codigo,
    nome: r.nome,
    priceAoa: Number(r.priceAoa),
    maxStudents: r.maxStudents,
    maxUsers: r.maxUsers,
    maxStorageGb: r.maxStorageGb,
    isActive: r.isActive === 1,
    criadoEm: r.criado_em.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function listarProdutos(): Promise<Product[]> {
  const [rows] = await getPool().query<ProdutoRow[]>('SELECT * FROM produto ORDER BY id');
  return rows.map(paraProduto);
}

export async function procurarProduto(slug: string): Promise<Product | null> {
  const [rows] = await getPool().query<ProdutoRow[]>(
    'SELECT * FROM produto WHERE slug = ? LIMIT 1',
    [slug],
  );
  return rows[0] ? paraProduto(rows[0]) : null;
}

export async function listarPlanos(produtoSlug?: string): Promise<Plan[]> {
  // `pr.slug AS produto_slug` vem do proprio JOIN: o mapper precisa do slug do
  // produto em cada linha, e sem a coluna nao ha como saber a que produto
  // pertence cada plano (e nao ha como filtrar na UI).
  const [rows] = produtoSlug
    ? await getPool().query<PlanoRow[]>(
        `SELECT p.*, pr.slug AS produto_slug FROM plano p
         JOIN produto pr ON pr.id = p.produto_id
         WHERE pr.slug = ? ORDER BY p.id`,
        [produtoSlug],
      )
    : await getPool().query<PlanoRow[]>(
        `SELECT p.*, pr.slug AS produto_slug FROM plano p
         JOIN produto pr ON pr.id = p.produto_id
         ORDER BY pr.slug, p.id`,
      );
  return rows.map(paraPlano);
}

// ---------------------------------------------------------------------------
// Credenciais de acesso de cada produto
// ---------------------------------------------------------------------------

interface AcessoRow extends ProdutoAcessoRow {
  api_url: string | null;
  slug: string;
}

/**
 * As credenciais com que o maelgsystems fala com o produto — e, pela simetria,
 * tambem as que o produto usa para falar com o maelgsystems. Uma so credencial
 * por produto, guardada num lado so.
 */
export async function obterAcesso(produtoSlug: string): Promise<AcessoProduto | null> {
  const [rows] = await getPool().query<AcessoRow[]>(
    `SELECT a.*, p.api_url, p.slug
     FROM produto_acesso a
     JOIN produto p ON p.id = a.produto_id
     WHERE p.slug = ? AND a.activo = 1
     ORDER BY a.id LIMIT 1`,
    [produtoSlug],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    produtoSlug: r.slug,
    urlBase: r.api_url ?? '',
    caminhoEscolas: r.caminho_escolas,
    caminhoDados: r.caminho_dados,
    chave: r.chave,
    segredo: decifrar(r.segredo),
    escopo: r.escopo,
    ultimoUsoEm: r.ultimo_uso_em?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

export interface NovoPlano {
  codigo: string;
  nome: string;
  priceAoa?: number;
  maxStudents?: number;
  maxUsers?: number;
  maxStorageGb?: number;
  isActive?: boolean;
}

export interface NovoProduto {
  slug: string;
  nome: string;
  descricao?: string;
  versao?: string;
  apiUrl: string;
  produtoChave: string;
  produtoSegredo: string;
  caminhoEscolas?: string;
  caminhoDados?: string;
  planos: NovoPlano[];
}

function validarPlanos(planos: NovoPlano[]): void {
  if (!Array.isArray(planos) || planos.length === 0) {
    throw new ProdutoErro('Um produto precisa de pelo menos um plano.');
  }
  const vistos = new Set<string>();
  for (const p of planos) {
    if (!p?.codigo || !p?.nome) {
      throw new ProdutoErro('Cada plano precisa de codigo e nome.');
    }
    if (vistos.has(p.codigo)) {
      throw new ProdutoErro(`Codigo de plano repetido: ${p.codigo}`);
    }
    vistos.add(p.codigo);
  }
}

/**
 * O catalogo de recursos, numa so lista.
 *
 * Vive em codigo, e nao so no `INSERT ... SELECT` da migration 004, porque um
 * produto novo pode ser criado a qualquer momento — muito depois de a migration
 * ter corrido. A migration semeia o que existe; esta funcao semeia o que
 * nasce depois. Duas listas iguais, ou um produto novo ficava sem catalogo e a
 * equipa so descobria isso no resgate, com uma escola a meio de uma subscricao.
 *
 * `como_contar` e' o nome do contador no produto. Um recurso aqui que o
 * produto nao implemente tem de aparecer como nao-aplicavel, nunca como
 * ilimitado.
 */
export const CATALOGO_RECURSOS: ReadonlyArray<{
  chave: string;
  nome: string;
  unidade: string;
  comoContar: string;
  bloqueia: boolean;
}> = [
  { chave: 'alunos', nome: 'Alunos', unidade: 'aluno', comoContar: 'alunos_matriculados', bloqueia: true },
  { chave: 'funcionarios', nome: 'Funcionarios', unidade: 'funcionario', comoContar: 'funcionarios_ativos', bloqueia: true },
  { chave: 'turmas', nome: 'Turmas', unidade: 'turma', comoContar: 'turmas_ativas', bloqueia: true },
  { chave: 'utilizadores', nome: 'Utilizadores', unidade: 'utilizador', comoContar: 'utilizadores_ativos', bloqueia: true },
  { chave: 'armazenamento', nome: 'Armazenamento', unidade: 'GB', comoContar: 'armazenamento_gb', bloqueia: true },
  // A validade da subscricao nao se cumpre recusando um pedido, resolve-se
  // expirando a subscricao. Fica no catalogo porque e' uma especificacao do
  // plano da mesma maneira que as outras.
  { chave: 'duracao', nome: 'Duracao da subscricao', unidade: 'mes', comoContar: 'validade_subscricao', bloqueia: false },
];

/**
 * Semeia o catalogo de um produto. Idempotente: um produto ja semeado nao ganha
 * duplicados, porque `uk_recurso (produto_id, chave)` resolve.
 */
async function semearCatalogo(conn: PoolConnection, produtoId: number): Promise<void> {
  for (const r of CATALOGO_RECURSOS) {
    await conn.execute(
      `INSERT IGNORE INTO plano_recurso
         (produto_id, chave, nome, unidade, como_contar, bloqueia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [produtoId, r.chave, r.nome, r.unidade, r.comoContar, r.bloqueia ? 1 : 0],
    );
  }
}

/**
 * Passa os tres numeros legacy do plano para o catalogo de recursos.
 *
 * `alunos`, `utilizadores` e `armazenamento` sao os recursos que ja tinham
 * numero. Ficam de fora os que ainda nao existem: um recurso sem numero nao se
 * inventa a 0, porque 0 no catalogo significa "ilimitado", e escrever
 * "ilimitado" sem ninguem ter perguntado e' inventar preco.
 */
async function gravarLimitesIniciais(
  conn: PoolConnection,
  planoId: number,
  produtoId: number,
  valores: { alunos: number; utilizadores: number; armazenamento: number },
): Promise<void> {
  const porChave: Record<string, number> = {
    alunos: valores.alunos,
    utilizadores: valores.utilizadores,
    armazenamento: valores.armazenamento,
  };
  const [recursos] = await conn.query<RowDataPacket[]>(
    'SELECT id, chave FROM plano_recurso WHERE produto_id = ?',
    [produtoId],
  );
  const porId = new Map(recursos.map((r) => [String(r.chave), Number(r.id)]));
  for (const [chave, valor] of Object.entries(porChave)) {
    const recursoId = porId.get(chave);
    if (recursoId === undefined) continue;
    await conn.execute(
      'INSERT INTO plano_limite (plano_id, recurso_id, valor) VALUES (?, ?, ?)',
      [planoId, recursoId, valor],
    );
  }
}

/**
 * Cria o produto com o esqueleto completo: produto + acesso + planos, tudo numa
 * transaccao. E o unico caminho para criar um produto — nao existe criar
 * produto e depois adicionar planos, porque a meio do caminho havia um produto
 * que ninguem podia contratar.
 */
export async function criarProdutoComEsqueleto(dados: NovoProduto): Promise<Product> {
  const slug = (dados.slug ?? '').trim().toLowerCase();
  if (!SLUG.test(slug)) {
    throw new ProdutoErro('O slug so pode ter minusculas, numeros e hifens. Ex: maelgest');
  }
  if (!dados.nome?.trim()) throw new ProdutoErro('O nome do produto e obrigatorio.');
  if (!dados.apiUrl?.trim()) throw new ProdutoErro('O URL da API do produto e obrigatorio.');
  if (!dados.produtoChave?.trim()) throw new ProdutoErro('A chave de acesso do produto e obrigatoria.');
  if (!dados.produtoSegredo || dados.produtoSegredo.length < 16) {
    throw new ProdutoErro('O segredo do produto precisa de pelo menos 16 caracteres.');
  }
  validarPlanos(dados.planos);

  // o id nao interessa: relemos o produto pelo slug logo abaixo
  await emTransacao(async (conn) => {
    const [r] = await conn.execute<ResultSetHeader>(
      `INSERT INTO produto (slug, nome, descricao, versao, api_url, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [slug, dados.nome.trim(), dados.descricao ?? null, dados.versao ?? null, dados.apiUrl.trim()],
    );

    await conn.execute(
      `INSERT INTO produto_acesso (produto_id, chave, segredo, caminho_escolas, caminho_dados)
       VALUES (?, ?, ?, ?, ?)`,
      [
        r.insertId,
        dados.produtoChave.trim(),
        cifrar(dados.produtoSegredo),
        dados.caminhoEscolas ?? '/api/v1/plataforma/escolas',
        dados.caminhoDados ?? '/api/v1/plataforma/escolas',
      ],
    );

    // O catalogo antes dos planos: `gravarLimitesIniciais` procura os recursos
    // por chave, e se o catalogo ainda nao existe nao ha o que preencher.
    await semearCatalogo(conn, Number(r.insertId));

    for (const p of dados.planos) {
      const [pl] = await conn.execute<ResultSetHeader>(
        `INSERT INTO plano (produto_id, codigo, nome, priceAoa, maxStudents, maxUsers, maxStorageGb, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.insertId,
          p.codigo.trim(),
          p.nome.trim(),
          p.priceAoa ?? 0,
          p.maxStudents ?? 0,
          p.maxUsers ?? 0,
          p.maxStorageGb ?? 0,
          p.isActive === false ? 0 : 1,
        ],
      );

      // Os mesmos tres numeros vao tambem para `plano_limite`. Grabam-se os
      // dois porque e' a unica altura em que o `plano` ainda tem estes
      // campos: a partir daqui o catalogo manda. Sem esta segunda escrita, um
      // produto novo nasce sem limites e nenhuma referencia tem retrato para
      // tirar — a equipa veria o erro no resgate, nao na venda.
      await gravarLimitesIniciais(conn, Number(pl.insertId), Number(r.insertId), {
        alunos: p.maxStudents ?? 0,
        utilizadores: p.maxUsers ?? 0,
        armazenamento: p.maxStorageGb ?? 0,
      });
    }
  });

  const criado = await procurarProduto(slug);
  if (!criado) throw new ProdutoErro('Produto criado mas nao encontrado.', 500);
  return criado;
}

export async function actualizarProduto(
  slug: string,
  campos: { nome?: string; descricao?: string; versao?: string; apiUrl?: string; status?: string },
): Promise<Product> {
  const p = await procurarProduto(slug);
  if (!p) throw new ProdutoErro('Produto nao encontrado.', 404);

  const sets: string[] = [];
  const args: unknown[] = [];
  if (campos.nome !== undefined) { sets.push('nome = ?'); args.push(campos.nome); }
  if (campos.descricao !== undefined) { sets.push('descricao = ?'); args.push(campos.descricao); }
  if (campos.versao !== undefined) { sets.push('versao = ?'); args.push(campos.versao); }
  if (campos.apiUrl !== undefined) { sets.push('api_url = ?'); args.push(campos.apiUrl); }
  if (campos.status !== undefined) {
    if (!['active', 'inactive', 'deprecated'].includes(campos.status)) {
      throw new ProdutoErro('Estado invalido: active, inactive ou deprecated.');
    }
    sets.push('status = ?');
    args.push(campos.status);
  }

  if (sets.length) {
    await getPool().query(`UPDATE produto SET ${sets.join(', ')} WHERE slug = ?`, [...args, slug]);
  }
  const actualizado = await procurarProduto(slug);
  if (!actualizado) throw new ProdutoErro('Produto nao encontrado.', 404);
  return actualizado;
}

export async function criarPlano(produtoSlug: string, dados: NovoPlano): Promise<Plan> {
  const [prod] = await getPool().query<ProdutoRow[]>(
    'SELECT * FROM produto WHERE slug = ? LIMIT 1',
    [produtoSlug],
  );
  const produto = prod[0];
  if (!produto) throw new ProdutoErro('Produto nao encontrado.', 404);

  try {
    const [r] = await getPool().execute<ResultSetHeader>(
      `INSERT INTO plano (produto_id, codigo, nome, priceAoa, maxStudents, maxUsers, maxStorageGb, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        produto.id,
        dados.codigo.trim(),
        dados.nome.trim(),
        dados.priceAoa ?? 0,
        dados.maxStudents ?? 0,
        dados.maxUsers ?? 0,
        dados.maxStorageGb ?? 0,
        dados.isActive === false ? 0 : 1,
      ],
    );
    const planos = await listarPlanos(produtoSlug);
    const criado = planos.find((p) => p.id === r.insertId);
    if (!criado) throw new ProdutoErro('Plano criado mas nao encontrado.', 500);
    return criado;
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new ProdutoErro(
        `O produto ${produtoSlug} ja tem um plano com o codigo ${dados.codigo}.`,
        409,
      );
    }
    throw e;
  }
}

export async function actualizarPlano(
  planoId: number,
  campos: Partial<NovoPlano>,
): Promise<Plan> {
  const [rows] = await getPool().query<PlanoRow[]>('SELECT * FROM plano WHERE id = ? LIMIT 1', [planoId]);
  const plano = rows[0];
  if (!plano) throw new ProdutoErro('Plano nao encontrado.', 404);

  const sets: string[] = [];
  const args: unknown[] = [];
  if (campos.nome !== undefined) { sets.push('nome = ?'); args.push(campos.nome); }
  if (campos.priceAoa !== undefined) { sets.push('priceAoa = ?'); args.push(campos.priceAoa); }
  if (campos.maxStudents !== undefined) { sets.push('maxStudents = ?'); args.push(campos.maxStudents); }
  if (campos.maxUsers !== undefined) { sets.push('maxUsers = ?'); args.push(campos.maxUsers); }
  if (campos.maxStorageGb !== undefined) { sets.push('maxStorageGb = ?'); args.push(campos.maxStorageGb); }
  if (campos.isActive !== undefined) { sets.push('isActive = ?'); args.push(campos.isActive ? 1 : 0); }

  if (sets.length) {
    await getPool().query(`UPDATE plano SET ${sets.join(', ')} WHERE id = ?`, [...args, planoId]);
  }
  const [outro] = await getPool().query<PlanoRow[]>(
    `SELECT p.*, pr.slug AS produto_slug FROM plano p
     JOIN produto pr ON pr.id = p.produto_id
     WHERE p.id = ?`,
    [planoId],
  );
  return paraPlano(outro[0]);
}

/**
 * Plano com assinaturas nao se apaga: a FK bloqueia. Preferimos desactivar,
 * para o historico do tenant continuar a fazer sentido.
 */
export async function eliminarPlano(planoId: number): Promise<void> {
  const [rows] = await getPool().query<PlanoRow[]>('SELECT * FROM plano WHERE id = ? LIMIT 1', [planoId]);
  if (!rows[0]) throw new ProdutoErro('Plano nao encontrado.', 404);
  await getPool().execute('UPDATE plano SET isActive = 0 WHERE id = ?', [planoId]);
}

export async function eliminarProduto(slug: string): Promise<void> {
  const p = await procurarProduto(slug);
  if (!p) throw new ProdutoErro('Produto nao encontrado.', 404);
  const [rows] = await getPool().query<ContagemRow[]>(
    'SELECT COUNT(*) AS n FROM tenant WHERE produto_slug = ?',
    [slug],
  );
  if (Number(rows[0].n) > 0) {
    throw new ProdutoErro(
      `O produto tem ${rows[0].n} tenant(s). Descontinua-o em vez de o apagar.`,
      409,
    );
  }
  await getPool().execute('DELETE FROM produto WHERE slug = ?', [slug]);
}

/**
 * Verifica a credencial que um produto traz num header. Devolve o slug do
 * produto se bater, `null` se nao. Nao distingue "chave nao existe" de
 * "segredo errado" — o resposta tem de ser igual nos dois casos.
 */
export async function verificarCredencialProduto(
  chave: string,
  segredo: string,
): Promise<string | null> {
  if (!chave || !segredo) return null;
  const [rows] = await getPool().query<(ProdutoAcessoRow & { slug: string })[]>(
    `SELECT a.*, p.slug
     FROM produto_acesso a
     JOIN produto p ON p.id = a.produto_id
     WHERE a.chave = ? AND a.activo = 1
     LIMIT 1`,
    [chave],
  );
  const r = rows[0];
  if (!r) return null;

  let guardada: string;
  try {
    guardada = decifrar(r.segredo);
  } catch (e) {
    console.error(`[credencial] segredo do produto ${r.slug} ilegivel:`, e);
    return null;
  }
  return compararSeguro(guardada, segredo) ? r.slug : null;
}

/** Marca que a credencial foi usada, para o "ultimo uso" do dashboard ser real. */
export async function marcarCredencialUsada(chave: string): Promise<void> {
  await getPool().execute(
    'UPDATE produto_acesso SET ultimo_uso_em = NOW() WHERE chave = ?',
    [chave],
  );
}
