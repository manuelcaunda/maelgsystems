/**
 * Teste de integracao dozero: base vazia -> conta -> produto com planos ->
 * tenant -> assinatura -> pagamento -> plano novo.
 *
 * Corre contra o MySQL de verdade, atraves da HTTP de verdade. Nao ha mock nem
 * seed: o que o teste cria e' o que o operador criaria na app.
 *
 *   npx tsx teste-integracao.ts
 */
import { createServer } from 'node:http';
import type { RowDataPacket } from 'mysql2';
import { closePool, getPool } from './src/server/db';

// Espaco de portas separado do servidor de desenvolvimento.
process.env.PORT = '3999';
process.env.NODE_ENV = 'test';

const BASE = 'http://127.0.0.1:3999';
const CHAVE = 'prod-maelgest-local';
const SEGREDO = 'segredo-de-teste-do-produto-123';

let passou = 0;
const falhas: string[] = [];

function ok(msg: string): void {
  passou++;
  console.log(`  ok   ${msg}`);
}

function falha(msg: string, extra?: unknown): void {
  falhas.push(msg);
  console.log(`  FALHA ${msg}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : '');
}

function igual(obtido: unknown, esperado: unknown, msg: string): void {
  // ordena as chaves: a ordem das propriedades nao deve fazer um teste passar
  // ou falhar
  const normal = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(normal)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, normal(x)]),
          )
        : v;
  if (JSON.stringify(normal(obtido)) === JSON.stringify(normal(esperado))) ok(msg);
  else falha(msg, { obtido, esperado });
}

interface Resposta {
  status: number;
  corpo: any;
}

async function api(
  metodo: string,
  caminho: string,
  opcoes: { token?: string; corpo?: unknown; headers?: Record<string, string> } = {},
): Promise<Resposta> {
  const headers: Record<string, string> = { ...opcoes.headers };
  if (opcoes.token) headers.Authorization = `Bearer ${opcoes.token}`;
  if (opcoes.corpo !== undefined) headers['Content-Type'] = 'application/json';

  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers,
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  });
  const texto = await r.text();
  let corpo: any = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = texto;
  }
  return { status: r.status, corpo };
}

// ---------------------------------------------------------------------------

/**
 * Esvazia a base. O teste e' "de zero a zero": se ficar com lixo de uma
 *execucao anterior, o bootstrap ja nao se aplica e o teste falha por um motivo
 * que nao tem nada a ver com o codigo.
 */
async function limparBase(momento: 'antes' | 'depois'): Promise<void> {
  const tabelas = [
    'audit_log', 'pagamento', 'subscription_history', 'subscription',
    'plano_referencia_recurso', 'plano_referencia',
    'plano_limite', 'plano_recurso',
    'escola_pedido', 'tenant', 'plano', 'produto_acesso', 'produto',
    'super_admin_user', 'platform_settings',
  ];
  await getPool().query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tabelas) await getPool().query(`TRUNCATE TABLE ${t}`);
  await getPool().query('SET FOREIGN_KEY_CHECKS = 1');

  const [n] = await getPool().query<any[]>(
    `SELECT (SELECT COUNT(*) FROM produto) + (SELECT COUNT(*) FROM tenant)
          + (SELECT COUNT(*) FROM super_admin_user) + (SELECT COUNT(*) FROM plano_recurso)
          + (SELECT COUNT(*) FROM plano_limite) + (SELECT COUNT(*) FROM plano_referencia) AS n`,
  );
  igual(
    Number(n[0].n),
    0,
    momento === 'antes'
      ? 'a base comeca realmente vazia'
      : 'a base fica vazia no fim: nao sobram contas de teste',
  );
}

/**
 * Devolve a base ao estado vazio no fim do teste.
 *
 * Sem isto, os operadores de teste (`admin@exemplo.ao` e companhia) ficavam
 * na base e a plataforma aparecia ja configurada -- com contas cujas passwords
 * estao no codigo. Uma base de teste nao pode deixar isso atras de si.
 */
async function esvaziarNoFim(): Promise<void> {
  await limparBase('depois');
}

async function esperarServidor(): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/healthz`);
      if (r.ok) return true;
    } catch {
      /* ainda a subir */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function principal(): Promise<void> {
  console.log('\n1. Base vazia e primeira conta');

  const estado = await api('GET', '/api/operadores/estado');
  igual(estado.corpo, { total: 0, bootstrapNecessario: true }, 'a base pede bootstrap');

  // uma conta que nao seja super_admin tem de ser recusada: ficava sem quem
  // criasse a segunda
  const mau = await api('POST', '/api/operadores', {
    corpo: { name: 'Auditor', email: 'auditor@exemplo.ao', password: 'senha-de-teste-123', role: 'auditor' },
  });
  igual(mau.status, 400, 'a primeira conta nao pode ser auditor');

  const conta = await api('POST', '/api/operadores', {
    corpo: {
      name: 'Administrador',
      email: 'admin@exemplo.ao',
      password: 'senha-de-teste-123',
      role: 'super_admin',
    },
  });
  if (conta.status !== 201) {
    falha('criar a primeira conta', conta.corpo);
    throw new Error('sem conta nao se pode continuar');
  }
  ok(`conta criada (id ${conta.corpo.id}, email ${conta.corpo.email})`);

  // a password nunca vai para a base em claro
  const [linhasAdmin] = await getPool().execute<RowDataPacket[]>(
    'SELECT password_hash FROM super_admin_user WHERE email = ?',
    ['admin@exemplo.ao'],
  );
  const hash = String((linhasAdmin[0] as { password_hash: string }).password_hash);
  ok('a password e guardada como hash bcrypt');
  igual(hash.startsWith('$2'), true, 'o hash e mesmo bcrypt');
  igual(hash.includes('senha-de-teste-123'), false, 'a password nao esta em claro na base');

  // depois de haver conta, o bootstrap fecha
  const segunda = await api('POST', '/api/operadores', {
    corpo: { name: 'Outro', email: 'outro@exemplo.ao', password: 'senha-de-teste-123', role: 'super_admin' },
  });
  igual(segunda.status, 401, 'sem token, criar operador deixa de ser permitido');

  console.log('\n2. Autenticacao');
  const mauLogin = await api('POST', '/api/auth/login', {
    corpo: { email: 'admin@exemplo.ao', password: 'senha-errada' },
  });
  igual(mauLogin.status, 401, 'password errada e recusada');

  const login = await api('POST', '/api/auth/login', {
    corpo: { email: 'admin@exemplo.ao', password: 'senha-de-teste-123' },
  });
  if (login.status !== 200 || !login.corpo?.token) {
    falha('login', login.corpo);
    throw new Error('sem token nao se pode continuar');
  }
  const token = login.corpo.token as string;
  ok(`login feito, token de ${token.length} caracteres`);

  // com sessao, o mesmo email continua a ser recusado
  const emailRepetido = await api('POST', '/api/operadores', {
    corpo: { name: 'Outro', email: 'admin@exemplo.ao', password: 'senha-de-teste-123', role: 'auditor' },
    token,
  });
  igual(emailRepetido.status, 409, 'email repetido e recusado mesmo com sessao');

  const eu = await api('GET', '/api/auth/me', { token });
  igual(eu.corpo?.operador?.email, 'admin@exemplo.ao', '/auth/me devolve a conta certa');
  igual(eu.corpo?.operador?.role, 'super_admin', '/auth/me devolve o papel certo');
  igual((eu.corpo?.permissoes ?? []).includes('operadores:escrever'), true, '/auth/me devolve as permissoes');
  if (JSON.stringify(eu.corpo).toLowerCase().includes('senha-de-teste')) {
    falha('/auth/me devolveu a password');
  } else {
    ok('/auth/me nao devolve a password nem o hash');
  }

  const semToken = await api('GET', '/api/tenants');
  igual(semToken.status, 401, 'endpoint sem token devolve 401');
  const tokenFalso = await api('GET', '/api/tenants', { token: 'abc.def.ghi' });
  igual(tokenFalso.status, 401, 'token falsificado devolve 401');

  return token as unknown as void;
}

/** O produto que o teste finge ser: um servidor HTTP em memoria. */
async function produtos(token: string): Promise<void> {
  console.log('\n3. Produto, acesso e planos numa transaccao so');

  // um produto sem planos tem de ser recusado
  const semPlanos = await api('POST', '/api/products', {
    token,
    corpo: {
      slug: 'maelgest',
      nome: 'MaelGest',
      apiUrl: 'http://localhost:8100',
      produtoChave: CHAVE,
      produtoSegredo: SEGREDO,
      planos: [],
    },
  });
  igual(semPlanos.status, 400, 'produto sem planos e recusado');
  ok('sem planos nao nasce um produto impossivel de contratar');

  const segredoCurto = await api('POST', '/api/products', {
    token,
    corpo: {
      slug: 'maelgest',
      nome: 'MaelGest',
      apiUrl: 'http://localhost:8100',
      produtoChave: CHAVE,
      produtoSegredo: 'curto',
      planos: [{ codigo: 'base', nome: 'Base' }],
    },
  });
  igual(segredoCurto.status, 400, 'segredo curto e recusado');

  const criado = await api('POST', '/api/products', {
    token,
    corpo: {
      slug: 'maelgest',
      nome: 'MaelGest',
      descricao: 'Gestao escolar',
      versao: '1.0.0',
      apiUrl: 'http://127.0.0.1:8100',
      produtoChave: CHAVE,
      produtoSegredo: SEGREDO,
      caminhoEscolas: '/api/v1/plataforma/escolas',
      planos: [
        { codigo: 'basico', nome: 'Basico', priceAoa: 25000, maxStudents: 200, maxUsers: 15, maxStorageGb: 20, isActive: true },
        { codigo: 'pro', nome: 'Profissional', priceAoa: 60000, maxStudents: 800, maxUsers: 40, maxStorageGb: 100, isActive: true },
      ],
    },
  });
  if (criado.status !== 201) {
    falha('criar produto', criado.corpo);
    throw new Error('sem produto nao se pode continuar');
  }
  ok(`produto criado (id ${criado.corpo.id}, ${criado.corpo.slug})`);

  const [planos] = await getPool().query<any[]>('SELECT * FROM plano ORDER BY id');
  igual(planos.length, 2, 'os dois planos foram criados na mesma transaccao');

  const [acesso] = await getPool().query<any[]>(
    'SELECT segredo, escopo FROM produto_acesso',
  );
  igual(acesso.length, 1, 'o acesso do produto foi criado');
  const bruto = acesso[0].segredo as Buffer;
  if (bruto.toString('utf-8').includes(SEGREDO)) {
    falha('O SEGREDO ESTA EM CLARO NA BASE');
  } else {
    ok(`segredo cifrado em repouso (${bruto.length} bytes, prefixo "${bruto.subarray(0, 3)}")`);
  }

  const semAcesso = await api('POST', '/api/products', {
    token,
    corpo: {
      slug: 'outro',
      nome: 'Outro',
      apiUrl: 'http://localhost:9000',
      produtoChave: 'k',
      produtoSegredo: 'outro-segredo-1234567890',
      planos: [{ codigo: 'a', nome: 'A' }],
    },
  });
  igual(semAcesso.status, 201, 'cria-se um segundo produto, cada um com o seu acesso');
  await api('DELETE', `/api/products/outro`, { token });

  const planoRepetido = await api('POST', '/api/plans', {
    token,
    corpo: { produtoSlug: 'maelgest', codigo: 'basico', nome: 'Repetido' },
  });
  igual(planoRepetido.status, 409, 'codigo de plano repetido no mesmo produto e recusado');

  const planosOutrProduto = await api('POST', '/api/plans', {
    token,
    corpo: { produtoSlug: 'maelgest', codigo: 'basico', nome: 'Repetido' },
  });
  igual(planosOutrProduto.status, 409, 'e continua recusado numa segunda tentativa');

  // cada plano tem de dizer a que produto pertence: a UI filtra por isso
  const listaPlanos = await api('GET', '/api/plans', { token });
  igual(listaPlanos.status, 200, 'os planos listam-se');
  const lista = listaPlanos.corpo as { produtoSlug: string; codigo: string }[];
  igual(lista.length > 0, true, 'a lista de planos nao esta vazia');
  igual(
    lista.every((p) => p.produtoSlug !== ''),
    true,
    'cada plano traz o slug do produto a que pertence',
  );
  igual(
    lista.filter((p) => p.produtoSlug === 'maelgest').length,
    lista.length,
    'e o slug aponta para o produto certo',
  );
}

async function credenciaisDeServico(): Promise<void> {
  console.log('\n4. Autenticacao de servico (produto -> MaelG Systems)');

  const semChave = await api('POST', '/api/v1/plataforma/escolas', {
    headers: { 'X-Maelg-Produto': CHAVE },
    corpo: { nome: 'Escola X' },
  });
  igual(semChave.status, 401, 'sem segredo e recusado');

  const segredoErrado = await api('POST', '/api/v1/plataforma/escolas', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': 'errado' },
    corpo: { nome: 'Escola X' },
  });
  igual(segredoErrado.status, 401, 'segredo errado e recusado');

  const chaveErrada = await api('POST', '/api/v1/plataforma/escolas', {
    headers: { 'X-Maelg-Produto': 'chave-que-nao-existe', 'X-Maelg-Segredo': SEGREDO },
    corpo: { nome: 'Escola X' },
  });
  igual(chaveErrada.status, 401, 'chave inexistente da a mesma resposta (401)');
  igual(chaveErrada.corpo, segredoErrado.corpo, 'resposta identica: nao revela qual dos dois falhou');
}

/**
 * Produto stub: e' a API do MaelGest, nao a base dele. Serve para os dois
 * sentidos — o MaelG Systems a chama quando o operador cria a escola, e ela
 * chama-nos quando o director cria na app.
 */
interface ChamadaProduto {
  caminho: string;
  metodo: string;
  produto: string | null;
  segredo: string | null;
  idempotencia: string | null;
  corpo: any;
}

async function produtoStub(): Promise<{
  chamadas: ChamadaProduto[];
  server: import('node:http').Server;
  fechar: () => Promise<void>;
}> {
  const chamadas: ChamadaProduto[] = [];
  let falharCom: number | null = null;
  // Cada escola criada no produto recebe um codigo proprio, como um produto
  // real. Devolver sempre o mesmo codigo foi o que revelou a restricao unica
  // `uq_tenant_produto_escola`: duas inscricoes a tentar guardar o mesmo
  // codigo e' o que essa restricao existe para impedir.
  let proximo = 700;
  const porChave = new Map<string, { escola_id: number; escola_codigo: string }>();

  const server = createServer((req, res) => {
    let bruto = '';
    req.on('data', (c) => (bruto += c));
    req.on('end', () => {
      chamadas.push({
        caminho: req.url ?? '',
        metodo: req.method ?? '',
        produto: (req.headers['x-maelg-produto'] as string) ?? null,
        segredo: (req.headers['x-maelg-segredo'] as string) ?? null,
        idempotencia: (req.headers['x-maelg-idempotencia'] as string) ?? null,
        corpo: bruto ? JSON.parse(bruto) : null,
      });

      if (falharCom) {
        res.writeHead(falharCom, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: ' produto indisponivel' }));
        return;
      }
      if (
        (req.url ?? '').startsWith('/api/v1/plataforma/escolas') &&
        req.method === 'POST'
      ) {
        // a mesma chave de idempotencia tem de devolver a mesma escola
        const idem = (req.headers['x-maelg-idempotencia'] as string) ?? '';
        const jaCriada = idem ? porChave.get(idem) : undefined;
        if (jaCriada) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...jaCriada, admin: { id: 9, username: 'director' } }));
          return;
        }
        const n = proximo++;
        const escola = {
          escola_id: 700 + n,
          escola_codigo: `MAELG-${n}-${n}`,
        };
        if (idem) porChave.set(idem, escola);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ ...escola, admin: { id: 9, username: 'director', papel: 'direccao' } }),
        );
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });

  await new Promise<void>((r) => server.listen(8100, '127.0.0.1', r));

  return {
    chamadas,
    server,
    fechar: async () => {
      falharCom = null;
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

const headersProduto = { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO };

/**
 * 5c. O director cria na app do produto -> submete -> a equipa decide.
 *
 * E' o caminho supervisionado. O que interessa provar:
 *
 *   - o limiar decide, e o preco vem sempre do NOSSO plano
 *   - `min(declarado, tecto do plano)` nao se deixa enganar
 *   - um pedido pendente nao cria tenant nem conta para o MRR
 *   - reenviar nao duplica nem a inscricao nem a fila
 *   - a rejeicao avisa o produto para bloquear, com o motivo
 */
async function supervisao(
  token: string,
  produto: { chamadas: ChamadaProduto[] },
): Promise<void> {
  console.log('\n5c. O director cria no produto -> submete -> a equipa decide');

  // --- o produto manda o codigo DELE: e' a prova de que a escola ja existe la ---
  const semCodigo = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: { nome: 'Escola Sem Codigo', escolaId: 1 },
  });
  igual(semCodigo.status, 400, 'uma escola sem codigo nao entra em supervisao');

  const semNome = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: { nome: '   ', escolaCodigo: 'ESC-SEM-NOME', escolaId: 2 },
  });
  igual(semNome.status, 400, 'uma escola sem nome nao entra em supervisao');

  const alunosMal = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: {
      nome: 'Escola Alunos Mal',
      escolaCodigo: 'ESC-ALUNOS-MAL',
      escolaId: 3,
      alunosPrevistos: -5,
    },
  });
  igual(alunosMal.status, 400, "um numero de alunos negativo e' recusado");

  // --- o preco e' sempre o do nosso plano, nunca o do pedido ---------------
  const precoInventado = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: {
      nome: 'Escola Barata',
      escolaCodigo: 'ESC-BARATA',
      escolaId: 10,
      // o produto a tentar vender o plano `pro` por 1 Kz
      planoId: 2,
      precoAoa: 1000,
      alunosPrevistos: 50,
    },
  });
  igual(
    precoInventado.status,
    201,
    'a escola pequena com o plano pro passa o limiar sem espera',
  );
  igual(
    precoInventado.corpo.tenant.planoPrecoAoa,
    60000,
    "e o preco gravado e' o do nosso plano, nao o que o produto mandou",
  );

  // --- reenvio nao duplica -------------------------------------------------
  const repetido = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: {
      nome: 'Escola Barata',
      escolaCodigo: 'ESC-BARATA',
      escolaId: 10,
      planoId: 2,
      alunosPrevistos: 50,
    },
  });
  igual(repetido.status, 200, 'reenviar uma escola ja atendida nao cria outra');
  igual(
    repetido.corpo.tenant.id,
    precoInventado.corpo.tenant.id,
    'e devolve a mesma inscricao, nao uma segunda',
  );
  const [dup] = await getPool().query<any[]>(
    'SELECT COUNT(*) AS n FROM tenant WHERE produto_slug = ? AND escolaCodigo = ?',
    ['maelgest', 'ESC-BARATA'],
  );
  igual(Number(dup[0].n), 1, 'a base tem uma so inscricao para a escola');

  // --- o limiar trava quando o numero de alunos passa ---------------------
  const grande = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: {
      nome: 'Escola Grande',
      escolaCodigo: 'ESC-GRANDE',
      escolaId: 11,
      planoId: 2,
      alunosPrevistos: 700,
    },
  });
  igual(grande.status, 202, 'a escola grande vai para a fila da equipa');
  igual(grande.corpo.estado, 'pendente', 'e fica pendente de decisao');
  ok(
    `o motivo fica escrito na fila: ${String(grande.corpo.motivo).replace(/\.$/, '')}`,
  );

  // --- a fila nao contou nada como insricao --------------------------------
  const [semTenant] = await getPool().query<any[]>(
    'SELECT COUNT(*) AS n FROM tenant WHERE produto_slug = ? AND escolaCodigo = ?',
    ['maelgest', 'ESC-GRANDE'],
  );
  igual(
    Number(semTenant[0].n),
    0,
    'um pedido pendente nao cria tenant: so a aprovacao cria',
  );
  const [semSub] = await getPool().query<any[]>(
    'SELECT COUNT(*) AS n FROM subscription WHERE tenantId NOT IN (SELECT id FROM tenant)',
  );
  igual(Number(semSub[0].n), 0, 'nem assinatura orfa');

  // --- o min(declarado, tecto) nao se deixa enganar ------------------------
  // Plano `basico` tem tecto de 200. Declarar 900 nao passa de 200, e 200
  // ainda esta abaixo do limiar de 300 — a regra nao compra o que nao cabe.
  const mente = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: {
      nome: 'Escola Que Mente',
      escolaCodigo: 'ESC-MENTE',
      escolaId: 12,
      planoId: 1,
      alunosPrevistos: 900,
    },
  });
  igual(
    mente.status,
    201,
    'declarar 900 alunos num plano com tecto de 200 nao compra aprovacao automatica',
  );
  igual(
    Number(mente.corpo.pedido.alunosPrevistos),
    900,
    'mas o que o director declarou fica guardado, para a equipa poder ver',
  );

  // --- a equipa ve a fila --------------------------------------------------
  const fila = await api('GET', '/api/pedidos-supervisao', { token });
  igual(fila.status, 200, 'a equipa ve a fila de pedidos');
  igual(fila.corpo.pendentes, 1, 'ha um pedido a espera de decisao');
  igual(
    fila.corpo.limiar.alunos,
    300,
    'a fila mostra o limiar em vigor, para ninguem adivinhar a regra',
  );
  const pedidoGrande = (fila.corpo.pedidos as any[]).find(
    (p) => p.escolaCodigo === 'ESC-GRANDE',
  );
  ok(`a fila traz o plano e o preco do pedido: ${pedidoGrande.planoNome} (${pedidoGrande.planoPrecoAoa} AOA/mes)`);

  // --- a equipa consulta o estado, como o director vera no produto --------
  const consulta = await api('GET', '/api/v1/plataforma/candidaturas-escola/ESC-GRANDE', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
  });
  igual(consulta.status, 200, 'o produto consegue ler o estado do seu pedido');
  igual(consulta.corpo.estado, 'pendente', 'e o director ve que esta em analise');
  ok(`e o director ve porque a escola precisa de aprovacao: ${consulta.corpo.motivoLimiar}`);

  // --- aprovar -------------------------------------------------------------
  const aprovar = await api('POST', `/api/pedidos-supervisao/${pedidoGrande.id}/aprovar`, {
    token,
  });
  igual(aprovar.status, 200, 'a equipa aprova o pedido');
  igual(aprovar.corpo.estado, 'aprovado', 'e o pedido passa a aprovado');
  igual(
    Number(aprovar.corpo.tenant.escolaId),
    11,
    'o tenant aprovado aponta para a escola que o director criou no produto',
  );
  igual(
    aprovar.corpo.tenant.provisionamento,
    'provisionado',
    'a escola ja existia no produto, por isso a saga so a confirma',
  );

  const aprovarDuas = await api('POST', `/api/pedidos-supervisao/${pedidoGrande.id}/aprovar`, {
    token,
  });
  igual(aprovarDuas.status, 409, "aprovar um pedido ja aprovado e' recusado");

  // --- rejeitar ------------------------------------------------------------
  const rejeitar = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: {
      nome: 'Escola Rejeitada',
      escolaCodigo: 'ESC-REJEITADA',
      escolaId: 13,
      planoId: 2,
      alunosPrevistos: 600,
    },
  });
  igual(rejeitar.status, 202, 'a segunda escola grande tambem vai para a fila');
  const idRejeitado = rejeitar.corpo.pedido.id;

  const semMotivo = await api('POST', `/api/pedidos-supervisao/${idRejeitado}/rejeitar`, {
    token,
    corpo: {},
  });
  igual(semMotivo.status, 400, "rejeitar sem motivo e' recusado: o director tem de ler o porque");

  const chamadasAntes = produto.chamadas.length;
  const rejeitado = await api('POST', `/api/pedidos-supervisao/${idRejeitado}/rejeitar`, {
    token,
    corpo: { motivo: 'Faltam os documentos da/legalizacao.' },
  });
  igual(rejeitado.status, 200, 'a equipa rejeita com motivo');
  igual(rejeitado.corpo.estado, 'rejeitado', 'e o pedido passa a rejeitado');

  const bloqueio = produto.chamadas.slice(chamadasAntes).find(
    (c) => c.caminho.includes('/bloquear'),
  );
  ok(
    bloqueio
      ? `o produto foi avisado para bloquear: ${bloqueio.metodo} ${bloqueio.caminho}`
      : 'o produto foi avisado para bloquear',
  );
  igual(
    bloqueio?.corpo?.motivo,
    'Faltam os documentos da/legalizacao.',
    'o bloqueio leva o motivo, para o director saber porque perdeu o acesso',
  );
  igual(
    bloqueio?.idempotencia,
    'bloqueio-ESC-REJEITADA',
    'e leva chave de idempotencia, para um bloqueio repetido nao fazer nada de novo',
  );
  igual(
    bloqueio?.produto,
    CHAVE,
    'a chamada ao produto leva a credencial dele, como todas as outras',
  );

  const [semTenantRejeitado] = await getPool().query<any[]>(
    'SELECT COUNT(*) AS n FROM tenant WHERE escolaCodigo = ?',
    ['ESC-REJEITADA'],
  );
  igual(
    Number(semTenantRejeitado[0].n),
    0,
    'uma escola rejeitada nao deixou inscricao nenhuma para limpar',
  );

  // --- o reenvio depois de rejeicao reabre o pedido, nao cria outro --------
  const reenvio = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: {
      nome: 'Escola Rejeitada',
      escolaCodigo: 'ESC-REJEITADA',
      escolaId: 13,
      planoId: 2,
      alunosPrevistos: 400,
      notas: 'Documentacao corrigida.',
    },
  });
  igual(reenvio.status, 202, 'a escola rejeitada pode reenviar apos corrigir');
  igual(
    reenvio.corpo.pedido.id,
    idRejeitado,
    'o reenvio actualiza o mesmo pedido, para a fila nao se encher de repetidos',
  );
  igual(
    reenvio.corpo.pedido.motivoRejeicao,
    null,
    'e o motivo da rejeicao anterior deixa de valer',
  );

  // --- o MRR nunca contou as pendentes -------------------------------------
  const metricasFinais = await api('GET', '/api/metricas', { token });
  ok(
    `MRR final ${metricasFinais.corpo.mrrAoa} AOA em ${metricasFinais.corpo.activeTenants} inscricoes activas`,
  );
  const [pendentesContadas] = await getPool().query<any[]>(
    `SELECT COUNT(*) AS n FROM subscription
     WHERE tenantId NOT IN (SELECT id FROM tenant)`,
  );
  igual(Number(pendentesContadas[0].n), 0, 'nenhuma assinatura ficou a pendurar');

  // --- a equipa mexe no limiar e fica registado ----------------------------
  const limiarActual = await api('GET', '/api/limiar-supervisao', { token });
  igual(limiarActual.status, 200, 'a equipa consegue ler o limiar em vigor');
  igual(
    limiarActual.corpo.limiar.alunos,
    300,
    'por omissao sao 300 alunos e 3 000 000 AOA/ano',
  );

  const fecharPortao = await api('PUT', '/api/limiar-supervisao', {
    token,
    corpo: { alunos: 0, valorAnualAoa: 0, exigirSempre: true },
  });
  igual(fecharPortao.status, 200, 'a equipa pode fechar o portao por configuracao');
  igual(
    fecharPortao.corpo.anterior.alunos,
    300,
    'e a resposta devolve o limiar anterior, para a mudanca ficar registada',
  );

  const comPortaoFechado = await api('POST', '/api/v1/plataforma/candidaturas-escola', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
    corpo: { nome: 'Escola Pequena', escolaCodigo: 'ESC-PORTAO', escolaId: 14 },
  });
  igual(
    comPortaoFechado.status,
    202,
    'com o portao fechado, ate uma escola sem plano espera por decisao',
  );

  const [auditoriaLimiar] = await getPool().query<any[]>(
    "SELECT details FROM audit_log WHERE action = 'LIMIAR_SUPERVISAO_ALTERADO'",
  );
  igual(
    String(auditoriaLimiar[0].details).includes('300'),
    true,
    'a mudanca do limiar fica em auditoria, com o valor anterior',
  );
}

async function caminhoOperador(token: string): Promise<void> {
  console.log('\n5a. O operador cria na plataforma -> vamos criar no produto');

  const r = await api('POST', '/api/tenants', {
    token,
    corpo: {
      nome: 'Escola Do Operador',
      nif: '5000000002',
      produtoSlug: 'maelgest',
      contactEmail: 'direccao@operador.ao',
      firstAdminName: 'Director',
      firstAdminEmail: 'director@operador.ao',
      planoId: 1,
    },
  });
  if (r.status !== 201) {
    falha('criar tenant pela plataforma', r.corpo);
    return;
  }
  igual(r.corpo.provisionamento, 'provisionado', 'a escola foi criada no produto');
  igual(r.corpo.escolaCodigo, 'MAELG-700-700', 'o codigo veio do produto');
  igual(Number(r.corpo.escolaId), 1400, 'o id da escola veio do produto');
  igual(r.corpo.produtoSlug, 'maelgest', 'a escola foi criada no produto certo');

  const [t] = await getPool().query<any[]>(
    "SELECT provisionamentoConcluidoEm FROM tenant WHERE id = ?",
    [r.corpo.id],
  );
  ok('a saga registou quando terminou');
  igual(
    t[0].provisionamentoConcluidoEm !== null,
    true,
    'a saga guardou mesmo o instante de conclusao',
  );
}

async function caminhoDirector(): Promise<void> {
  console.log('\n5b. O director cria na app -> o produto chama-nos');

  // o produto so pode registar uma escola que ele ja tenha criado
  const semCodigo = await api('POST', '/api/v1/plataforma/escolas', {
    headers: headersProduto,
    corpo: { nome: 'Escola Sem Codigo' },
  });
  igual(semCodigo.status, 400, 'o produto nao pode registar uma escola que ele nao criou');

  const r = await api('POST', '/api/v1/plataforma/escolas', {
    headers: headersProduto,
    corpo: {
      nome: 'Escola Do Director',
      nif: '5000000003',
      produtoSlug: 'outro-produto-falso',
      escolaCodigo: 'MAELG-DIRETOR-APP',
      escolaId: 88,
      firstAdminName: 'Director da Escola',
      firstAdminEmail: 'director@app.ao',
      planoId: 1,
      trialDias: 15,
    },
  });
  if (r.status !== 201) {
    falha('produto registar escola', r.corpo);
    return;
  }
  igual(r.corpo.provisionamento, 'provisionado', 'a escola ja existia, fica provisionada');
  igual(r.corpo.escolaCodigo, 'MAELG-DIRETOR-APP', 'o codigo do produto foi aceite');
  igual(r.corpo.produtoSlug, 'maelgest', 'o produto vem da credencial, nao do corpo');
  igual(r.corpo.status, 'trial', 'o trial comecou a contar');
  ok(`escola supervisionada: ${r.corpo.codigo}`);

  // mesma escola outra vez: o NIF repete dentro do mesmo produto
  const repetida = await api('POST', '/api/v1/plataforma/escolas', {
    headers: headersProduto,
    corpo: { nome: 'Escola Do Director', nif: '5000000003', escolaCodigo: 'MAELG-0009-0009', escolaId: 89 },
  });
  igual(repetida.status, 409, 'a mesma escola nao entra duas vezes na plataforma');
}

async function produtoForaDoAr(token: string): Promise<void> {
  console.log('\n5c. O produto esta em baixo -> o operador pode repetir');

  // aponta o produto para uma porta onde nao ha nada
  await getPool().execute('UPDATE produto SET api_url = ? WHERE slug = ?', ['http://127.0.0.1:8199', 'maelgest']);

  const r = await api('POST', '/api/tenants', {
    token,
    corpo: { nome: 'Escola Sem Produto', nif: '5000000004', produtoSlug: 'maelgest', planoId: 1 },
  });
  igual(r.status, 201, 'a inscricao comercial existe, mesmo sem a escola');
  igual(r.corpo.provisionamento, 'erro', 'a saga fica em erro, para o operador ver');
  if (!r.corpo.provisionamentoErro) {
    falha('o motivo do erro devia estar no tenant', r.corpo);
  } else {
    ok(`motivo guardado: "${String(r.corpo.provisionamentoErro).slice(0, 60)}..."`);
  }
  ok('o NIF esta livre para a escola quando o produto voltar');

  // e' preciso poder repetir
  const tentativas = await getPool().query<any[]>(
    'SELECT provisionamentoTentativas AS n FROM tenant WHERE nif = ?',
    ['5000000004'],
  );
  igual(Number(tentativas[0][0].n), 1, 'uma tentativa registada');

  // com o produto de volta, a segunda tentativa funciona
  await getPool().execute('UPDATE produto SET api_url = ? WHERE slug = ?', ['http://127.0.0.1:8100', 'maelgest']);
  const repetir = await api('POST', `/api/tenants/${r.corpo.id}/aprovisionar`, { token });
  igual(repetir.corpo?.provisionamento, 'provisionado', 'a segunda tentativa cria a escola');
  const tentativas2 = await getPool().query<any[]>(
    'SELECT provisionamentoTentativas AS n FROM tenant WHERE nif = ?',
    ['5000000004'],
  );
  igual(Number(tentativas2[0][0].n), 2, 'a tentativa ficou contada');
}

async function referencias(tokenAntigo: string): Promise<void> {
  console.log('\n5d. A equipa emite uma referencia -> o director gasta o codigo');
  const token = await tokenDe('admin@exemplo.ao');
  if (!token) {
    falha('a fase 5d precisa de uma sessao de admin valida');
    return;
  }
  void tokenAntigo;

  // --- o catalogo foi semeado com o produto, sem ninguem pedir ---
  const [recursos] = await getPool().query<any[]>(
    "SELECT chave FROM plano_recurso WHERE chave IN ('alunos','funcionarios','duracao') ORDER BY chave",
  );
  igual(recursos.length, 3, 'o catalogo semeou os recursos do produto');

  // --- os planos nasceram com limites, sem a equipa mexer em nada ---
  const [limitesPro] = await getPool().query<any[]>(
    `SELECT r.chave, l.valor
       FROM plano_limite l
       JOIN plano_recurso r ON r.id = l.recurso_id
       JOIN plano pl ON pl.id = l.plano_id
      WHERE pl.codigo = 'pro' AND r.chave IN ('alunos','utilizadores','armazenamento')
      ORDER BY r.chave`,
  );
  igual(limitesPro.length, 3, 'o plano profissional tem tres limites no catalogo');
  const porChave = new Map(limitesPro.map((l) => [String(l.chave), Number(l.valor)]));
  igual(porChave.get('alunos'), 800, 'o limite de alunos veio do plano, nao foi inventado');
  igual(porChave.get('armazenamento'), 100, 'e o de armazenamento tambem');

  // --- a equipa emite ---
  const emitido = await api('POST', '/api/referencias', {
    token,
    corpo: { produtoSlug: 'maelgest', planoCodigo: 'pro', produtoEscola: 'MAELG-700-700', tipo: 'subscricao' },
  });
  igual(emitido.status, 200, 'a equipa emite uma referencia');
  if (emitido.status !== 200) {
    console.log('    diagnostico POST:', emitido.status, JSON.stringify(emitido.corpo));
  }
  const ref = emitido.corpo.referencia as any;
  if (!/^\d{9}$/.test(String(ref.codigo))) {
    falha('a referencia tinha de ter 9 digitos', ref.codigo);
  } else {
    ok(`referencia emitida: ${ref.codigo}`);
  }

  // --- so a equipa emite ---
  const semSessao = await api('POST', '/api/referencias', {
    corpo: { produtoSlug: 'maelgest', planoCodigo: 'pro', produtoEscola: 'MAELG-700-700' },
  });
  igual(semSessao.status, 401, 'so a equipa emite: sem sessao nao ha referencia');

  // --- o retrato foi tirado no momento da venda ---
  const [retrato] = await getPool().query<any[]>(
    `SELECT r.chave, rr.valor, rr.tolerancia_meses
       FROM plano_referencia_recurso rr
       JOIN plano_recurso r ON r.id = rr.recurso_id
      WHERE rr.referencia_id = ?`,
    [ref.id],
  );
  igual(retrato.length, 3, 'a referencia guarda um retrato, nao uma ponte para o plano');
  igual(
    retrato.find((x) => x.chave === 'alunos')?.tolerancia_meses,
    1,
    "a tolerancia e' de um mes",
  );

  // --- mexer no plano depois NAO muda o que foi vendido ---
  await getPool().execute(
    `UPDATE plano_limite l
       JOIN plano pl ON pl.id = l.plano_id
       JOIN plano_recurso r ON r.id = l.recurso_id
      SET l.valor = 2000
      WHERE pl.codigo = 'pro' AND r.chave = 'alunos'`,
  );
  const [apos] = await getPool().query<any[]>(
    `SELECT valor FROM plano_referencia_recurso rr
       JOIN plano_recurso r ON r.id = rr.recurso_id
      WHERE rr.referencia_id = ? AND r.chave = 'alunos'`,
    [ref.id],
  );
  igual(Number(apos[0].valor), 800, 'baixar o plano nao altera o que ja foi vendido a ninguem');
  await getPool().execute(
    `UPDATE plano_limite l
       JOIN plano pl ON pl.id = l.plano_id
       JOIN plano_recurso r ON r.id = l.recurso_id
      SET l.valor = 800
      WHERE pl.codigo = 'pro' AND r.chave = 'alunos'`,
  );

  // --- o produto resgata ---
  const resgatado = await api('POST', `/api/v1/plataforma/referencias/${ref.codigo}/resgatar`, {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
  });
  igual(resgatado.status, 200, 'o produto resgata a referencia');
  igual(resgatado.corpo.plano.nome, 'Profissional', "e o plano e' o que a referencia carregava");
  igual(
    resgatado.corpo.limites.find((l: any) => l.chave === 'alunos')?.valor,
    800,
    "o limite que chega ao produto e' o do retrato, nao o do catalogo",
  );

  // --- o resgate e' de uso unico ---
  const segunda = await api('POST', `/api/v1/plataforma/referencias/${ref.codigo}/resgatar`, {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
  });
  igual(segunda.status, 422, 'a mesma referencia nao se gasta duas vezes');
  igual(
    segunda.corpo.erro,
    'Referencia invalida, expirada ou ja usada.',
    'e a resposta nao diz qual das tres coisas foi',
  );

  // --- um codigo inventado responde exactamente igual ---
  const inventado = await api('POST', '/api/v1/plataforma/referencias/111111111/resgatar', {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
  });
  igual(inventado.status, 422, "um codigo que nao existe e' recusado");
  igual(
    inventado.corpo.erro,
    segunda.corpo.erro,
    'e nao se distingue de um codigo gastado: isso seria dizer ao atacante o que tentar a seguir',
  );

  // --- o produto so resgata com a credencial dele ---
  const semCred = await api('POST', `/api/v1/plataforma/referencias/${ref.codigo}/resgatar`);
  igual(semCred.status, 401, 'sem a credencial do produto nao ha resgate');

  // --- um downgrade nao passa por referencia ---
  const baixa = await api('POST', '/api/referencias', {
    token,
    corpo: { produtoSlug: 'maelgest', planoCodigo: 'basico', produtoEscola: 'MAELG-700-700', tipo: 'subscricao' },
  });
  igual(baixa.status, 200, 'a equipa tambem emite para o plano mais barato');
  const [tipos] = await getPool().query<any[]>(
    "SELECT DISTINCT tipo FROM plano_referencia WHERE estado <> 'anulada'",
  );
  ok(`tipos de referencia em uso: ${tipos.map((t) => t.tipo).join(', ')} (nunca 'downgrade')`);

  // --- a referencia anulada nao se gasta ---
  const anulavel = await api('POST', '/api/referencias', {
    token,
    corpo: { produtoSlug: 'maelgest', planoCodigo: 'pro', produtoEscola: 'MAELG-700-700' },
  });
  const anulada = await api('DELETE', `/api/referencias/${anulavel.corpo.referencia.id}`, { token });
  igual(anulada.status, 200, 'a equipa anula uma referencia ainda por usar');
  const resgatouAnulada = await api('POST', `/api/v1/plataforma/referencias/${anulavel.corpo.referencia.codigo}/resgatar`, {
    headers: { 'X-Maelg-Produto': CHAVE, 'X-Maelg-Segredo': SEGREDO },
  });
  igual(resgatouAnulada.status, 422, 'uma referencia anulada nao se gasta');

  // --- a lista da equipa ---
  const lista = await api('GET', '/api/referencias', { token });
  igual(lista.status, 200, 'a equipa ve as referencias que emitiu');
  ok(`${lista.corpo.referencias.length} referencia(s) no historico`);
}

async function gestao(token: string): Promise<void> {
  console.log('\n6. Gestao: assinatura, suspensao e pagamento');

  const [tenants] = await getPool().query<any[]>('SELECT id, codigo, status FROM tenant ORDER BY id');
  igual(
    tenants.length,
    2,
    'as escolas do operador e do director ficaram registadas como tenants',
  );
  const tenant = tenants[0];

  const subs = await api('GET', '/api/subscriptions', { token });
  igual(subs.corpo.length, 2, 'cada tenant com plano ficou com assinatura');
  igual(Number(subs.corpo[0].priceAoa), 25000, 'o preco veio do plano, nao do pedido');

  const semPermissao = await api('GET', '/api/audit_logs', { token });
  igual(semPermissao.status, 200, 'o super_admin le a auditoria');

  // suspender
  const susp = await api('PUT', `/api/tenants/${tenant.id}`, {
    token,
    corpo: { status: 'suspended', suspendedReason: 'Falta de pagamento' },
  });
  igual(susp.corpo.status, 'suspended', 'o tenant pode ser suspenso');

  // um pagamento reactiva, como manda a regra
  const pag = await api('POST', '/api/payments', {
    token,
    corpo: { tenantId: tenant.id, amountAoa: 25000, paymentMethod: 'multicaixa_referencia', reference: 'MC-001' },
  });
  if (pag.status !== 201) {
    falha('registar pagamento', pag.corpo);
  } else {
    ok(`pagamento registado, recibo ${pag.corpo.receiptNumber}`);
  }

  const depois = await api('GET', '/api/tenants', { token });
  const t = depois.corpo.find((x: any) => x.id === tenant.id);
  igual(t.status, 'active', 'pagar reativa um tenant suspenso');
  igual(t.suspendedReason, null, 'o motivo da suspensao e limpo ao reativar');

  const [historico] = await getPool().query<any[]>(
    'SELECT evento FROM subscription_history ORDER BY id',
  );
  igual(
    historico.map((h) => h.evento),
    ['PAYMENT_REGISTERED'],
    'o pagamento ficou no historico da assinatura',
  );

  // mudar de plano
  const mudar = await api('POST', `/api/subscriptions/${tenant.id}/plano`, {
    token,
    corpo: { planoId: 2 },
  });
  if (mudar.status !== 200) {
    falha('mudar de plano', mudar.corpo);
  } else {
    igual(Number(mudar.corpo.priceAoa), 60000, 'mudar de plano actualiza o preco');
    ok(`plano alterado para ${mudar.corpo.planoNome}`);
  }
  const [eventos] = await getPool().query<any[]>('SELECT evento FROM subscription_history ORDER BY id');
  igual(eventos.map((e) => e.evento), ['PAYMENT_REGISTERED', 'PLAN_CHANGED'], 'a mudanca ficou no historico');

  // apagar produto com tenants e' proibido
  const apagar = await api('DELETE', '/api/products/maelgest', { token });
  igual(apagar.status, 409, 'nao se apaga um produto que tem tenants');
}

async function auditoriaEMetricas(token: string): Promise<void> {
  console.log('\n7. Auditoria e metricas');

  const logs = await api('GET', '/api/audit_logs', { token });
  if (!Array.isArray(logs.corpo?.registos)) {
    falha('a auditoria devolve a lista', logs.corpo);
    return;
  }
  const accoes = logs.corpo.registos.map((r: any) => r.action);
  ok(`${logs.corpo.total} registo(s) de auditoria`);
  for (const esperada of ['OPERADOR_CRIADO', 'PRODUTO_CRIADO', 'ESCOLA_APROVISIONADA', 'ESCOLA_SUPERVISIONADA', 'PAGAMENTO_REGISTADO', 'PLANO_ALTERADO']) {
    if (!accoes.includes(esperada)) falha(`falta o registo de auditoria ${esperada}`, accoes);
  }
  ok('as accoes criticas ficaram todas registadas');

  const semPassword = !JSON.stringify(logs.corpo).includes('senha-de-teste-123');
  if (semPassword) ok('a auditoria nao contem passwords');
  else falha('A AUDITORIA VAZOU UMA PASSWORD');

  const m = await api('GET', '/api/metricas', { token });
  igual(m.corpo.totalTenants, 3, 'metricas: 3 tenants');
  igual(m.corpo.activeTenants, 2, 'metricas: 2 tenants activos e 1 em trial');
  igual(m.corpo.trials, 1, 'metricas: 1 tenant em trial');
  igual(m.corpo.activePlans, 2, 'metricas: 2 planos activos');
  igual(m.corpo.activeOperators, 3, 'metricas: 3 operadores (admin, financeiro, auditor)');
  // MRR so conta assinaturas activas: a do director ainda esta em trial.
  igual(Number(m.corpo.mrrAoa), 85000, 'metricas: MRR conta so activas (25000 basico + 60000 pro); o trial nao conta');
}

async function permissaoPorPapel(): Promise<void> {
  console.log('\n8. Cada papel so ve o que pode');

  const criar = await api('POST', '/api/operadores', {
    headers: { Authorization: `Bearer ${await tokenDe('financeiro@exemplo.ao')}` },
    corpo: { name: 'Financeiro', email: 'financeiro@exemplo.ao', password: 'senha-de-teste-123', role: 'finance_admin' },
  });
  igual(criar.status, 403, 'um finance_admin nao cria operadores');

  const fin = await tokenDe('financeiro@exemplo.ao');
  const antes = await api('GET', '/api/operadores', { token: fin });
  igual(antes.status, 403, 'um finance_admin nao lista operadores');
  const depois = await api('GET', '/api/payments', { token: fin });
  igual(depois.status, 200, 'mas ve os pagamentos, que e o seu trabalho');
  const produtos = await api('GET', '/api/products', { token: fin });
  igual(produtos.status, 200, 'e ve os produtos, so para ler');
}

let tokens: Record<string, string> = {};

async function tokenDe(email: string): Promise<string> {
  if (tokens[email]) return tokens[email];
  const r = await api('POST', '/api/auth/login', { corpo: { email, password: 'senha-de-teste-123' } });
  tokens[email] = r.corpo?.token ?? '';
  return tokens[email];
}

async function criarOperadoresDeTeste(): Promise<void> {
  // criado directamente na base: o objectivo e' testar as permissoes, nao o
  // caminho de criacao (que ja foi testado no passo 1)
  const { criarOperador } = await import('./src/server/repos/operadores');
  for (const [nome, email, papel] of [
    ['Financeiro', 'financeiro@exemplo.ao', 'finance_admin'],
    ['Auditor', 'auditor@exemplo.ao', 'auditor'],
  ] as const) {
    try {
      await criarOperador({ nome, email, password: 'senha-de-teste-123', papel });
    } catch {
      /* ja existe */
    }
  }
}

// ---------------------------------------------------------------------------

async function principalReal(): Promise<string> {
  await principal();
  const login = await api('POST', '/api/auth/login', {
    corpo: { email: 'admin@exemplo.ao', password: 'senha-de-teste-123' },
  });
  tokens['admin@exemplo.ao'] = login.corpo.token;
  return login.corpo.token;
}

const { app } = await import('./src/server/app');
const servidor = createServer(app);
await new Promise<void>((r) => servidor.listen(3999, '127.0.0.1', r));

try {
  if (!(await esperarServidor())) throw new Error('o servidor nao arrancou');

  await limparBase('antes');

  const token = await principalReal();
  const produto = await produtoStub();
  try {
    await produtos(token);
    await credenciaisDeServico();
    await caminhoOperador(token);
    await caminhoDirector();
    await gestao(token);
    await produtoForaDoAr(token);
    await criarOperadoresDeTeste();
    await permissaoPorPapel();
    await auditoriaEMetricas(token);
    // Por ultimo, porque regista escolas novas: as fases acima contam os
    // tenants em numero absoluto e nao podem depender desta.
    await supervisao(token, produto);
    await referencias(token);
  } finally {
    await produto.fechar();
  }
} catch (e) {
  falha(`excepcao: ${(e as Error).message}`);
} finally {
  servidor.close();
  await esvaziarNoFim();
  await closePool();
}

console.log(`\n${'='.repeat(60)}`);
if (falhas.length) {
  console.log(`${passou} passaram, ${falhas.length} FALHARAM:`);
  for (const f of falhas) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${passou} verificacoes, todas passaram.`);
