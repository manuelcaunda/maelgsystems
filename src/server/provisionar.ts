/**
 * Aprovisionamento de escola + 1.º utilizador (Director Geral) na BD REAL do MaelGest.
 *
 * Portado de `maelg/server.py` (asyncmy → mysql2, bcrypt → bcryptjs).
 *
 * Faz, numa única transacção:
 *   1. cria a escola (código gerado pelo sistema, nunca do pedido);
 *   2. cria o utilizador admin (Director Geral);
 *   3. liga-o como 1.º utilizador (utilizador_escola + usuario_papel);
 *   4. cria o perfil de funcionário e marca a escola com 1.º acesso pendente;
 *   5. espelha o tenant na base `maelg` (melhor-esforço, não bloqueia).
 *
 * O 1.º login do Director Geral dispara o onboarding em 2 passos.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool, getMaelgConnection, carregarConfig } from './maelgest-db';

// Espelham as regras do MaelGest (sem importar o backend).
export const TIPOS_ESCOLA = ['publica', 'privada'] as const;
export const DESIGNACOES = [
  'colegio', 'liceu', 'complexo_escolar', 'instituto_tecnico',
  'instituto_politecnico', 'magisterio', 'outro',
] as const;
export const REGIMES_ENSINO = ['geral', 'tecnico', 'pedagogico', 'misto'] as const;

/** bcrypt do backend usa gensalt() = 12 rounds em bcrypt 4.x. */
const BCRYPT_ROUNDS = 12;

export class ProvisionamentoError extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
    this.name = 'ProvisionamentoError';
  }
}

export interface ProvisionamentoInput {
  escola_nome: string;
  admin_nome: string;
  admin_email: string;
  admin_password: string;
  escola_tipo?: string;
  escola_designacao?: string;
  escola_regime_ensino?: string;
  escola_endereco?: string | null;
  escola_contacto_telefone?: string | null;
  escola_contacto_email?: string | null;
  nif?: string | null;
  province?: string | null;
  notes?: string | null;
  trialDays?: number;
}

export interface ProvisionamentoResult {
  escola_id: number;
  escola_codigo: string;
  escola_nome: string;
  admin_id: number;
  admin_codigo: string;
  admin_email: string;
  papel_id: number;
  funcionario_id: number;
  primeiro_acesso: 'onboarding_pendente';
  tenant_mirrorado: boolean;
  tenant_mirror_erro?: string;
}

/**
 * Código no formato MAELG-0000-0000, gerado pelo sistema.
 * Usa crypto (o server.py usava secrets.randbelow) e preserva os zeros à esquerda.
 */
export function gerarCodigoMaelG(): string {
  const n = String(crypto.randomInt(0, 100_000_000)).padStart(8, '0');
  return `MAELG-${n.slice(0, 4)}-${n.slice(4)}`;
}

function validarEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

function validarTelefone(tel: string): boolean {
  return /^(?:\+244)?9\d{8}$/.test(tel.trim());
}

function validar(dados: ProvisionamentoInput) {
  const escola_nome = (dados.escola_nome || '').trim();
  const admin_nome = (dados.admin_nome || '').trim();
  const admin_email = (dados.admin_email || '').trim();
  const admin_password = dados.admin_password || '';
  const tipo = dados.escola_tipo || 'publica';
  const designacao = dados.escola_designacao || 'colegio';
  const regime = dados.escola_regime_ensino || 'geral';

  if (escola_nome.length < 3) {
    throw new ProvisionamentoError(400, 'Nome da escola deve ter pelo menos 3 caracteres.');
  }
  if (admin_nome.length < 3) {
    throw new ProvisionamentoError(400, 'Nome do Director Geral deve ter pelo menos 3 caracteres.');
  }
  if (!validarEmail(admin_email)) {
    throw new ProvisionamentoError(400, 'Email do admin inválido.');
  }
  if (admin_password.length < 8) {
    throw new ProvisionamentoError(400, 'A palavra-passe deve ter pelo menos 8 caracteres.');
  }
  if (!(TIPOS_ESCOLA as readonly string[]).includes(tipo)) {
    throw new ProvisionamentoError(400, `Tipo inválido. Opções: ${TIPOS_ESCOLA.join(', ')}`);
  }
  if (!(DESIGNACOES as readonly string[]).includes(designacao)) {
    throw new ProvisionamentoError(400, `Designação inválida. Opções: ${DESIGNACOES.join(', ')}`);
  }
  if (!(REGIMES_ENSINO as readonly string[]).includes(regime)) {
    throw new ProvisionamentoError(400, `Regime de ensino inválido. Opções: ${REGIMES_ENSINO.join(', ')}`);
  }
  if (dados.escola_contacto_telefone && !validarTelefone(dados.escola_contacto_telefone)) {
    throw new ProvisionamentoError(400, 'Telefone inválido (ex.: +244 9XX XXX XXX).');
  }

  return { escola_nome, admin_nome, admin_email, admin_password, tipo, designacao, regime };
}

async function existe(conn: any, sql: string, params: any[]): Promise<boolean> {
  const [rows] = await conn.execute(sql, params);
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Espelha o tenant na base `maelg`.
 *
 * O `server.py` fazia isto com `planId = 1` hardcoded dentro de um
 * `try/except: pass` — e como a tabela `produto` está vazia, a FK falhava e a
 * excepção escondia a falha (a tabela `tenant` ficou com 0 linhas).
 * Aqui procuramos os IDs reais e, se não existirem, registamos o motivo em vez
 * de o engolir. Não bloqueia: o MaelGest já está garantido pela transacção.
 */
async function espelharTenant(
  r: ProvisionamentoResult,
  dados: ProvisionamentoInput,
  v: ReturnType<typeof validar>,
  trialDays: number,
): Promise<{ ok: boolean; erro?: string }> {
  let conn;
  try {
    conn = await getMaelgConnection();
  } catch (e) {
    return { ok: false, erro: `sem ligação à BD 'maelg': ${e instanceof Error ? e.message : e}` };
  }

  try {
    const [prods]: any[] = await conn.execute('SELECT id FROM produto WHERE slug = ? LIMIT 1', ['maelgest']);
    if (!prods.length) {
      return { ok: false, erro: "produto 'maelgest' inexistente na BD 'maelg' — tenant não espelhado" };
    }
    const produtoId = prods[0].id;

    const [planos]: any[] = await conn.execute(
      'SELECT id FROM plano WHERE produto_id = ? AND isActive = 1 ORDER BY priceAoa ASC LIMIT 1',
      [produtoId],
    );
    if (!planos.length) {
      return { ok: false, erro: `nenhum plano activo para o produto ${produtoId} — tenant não espelhado` };
    }

    const hoje = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const trialFim = new Date(hoje.getTime() + trialDays * 86400000);

    await conn.execute(
      `INSERT INTO tenant
         (codigo, escolaCodigo, escolaId, nome, nif, tipo, designacao, regimeEnsino,
          contactEmail, contactPhone, province, city, productSlug, planId, status,
          trialEndsAt, nextBillingDate, firstAdminName, firstAdminEmail, firstAdminPhone,
          firstAdminCodigo, primeiroAcessoPendente, notes, maelgestOutput)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        `TEN-${String(r.escola_id).padStart(4, '0')}`,
        r.escola_codigo,
        r.escola_id,
        v.escola_nome,
        dados.nif || '',
        v.tipo,
        v.designacao,
        v.regime,
        dados.escola_contacto_email || v.admin_email,
        dados.escola_contacto_telefone || '',
        dados.province || '',
        dados.escola_endereco || '',
        'maelgest',
        planos[0].id,
        'trial',
        fmt(trialFim),
        fmt(trialFim),
        v.admin_nome,
        v.admin_email,
        dados.escola_contacto_telefone || '',
        r.admin_codigo,
        1,
        dados.notes || 'Tenant criado pela plataforma MaelG Systems.',
        JSON.stringify({ sucesso: true, escola_id: r.escola_id }),
      ],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  } finally {
    await conn.end().catch(() => {});
  }
}

export async function provisionar(dados: ProvisionamentoInput): Promise<ProvisionamentoResult> {
  const v = validar(dados);
  const trialDays = dados.trialDays ?? 14;

  const pool = getPool();
  const conn = await pool.getConnection();

  let escola_id = 0;
  let admin_id = 0;
  let codigo_escola = '';
  let codigo_admin = '';
  let papel_id = 0;
  let funcionario_id = 0;

  try {
    await conn.beginTransaction();

    if (await existe(conn, 'SELECT 1 FROM escola WHERE nome = ?', [v.escola_nome])) {
      throw new ProvisionamentoError(409, 'Já existe uma escola com este nome.');
    }
    if (await existe(conn, 'SELECT 1 FROM utilizador WHERE email = ?', [v.admin_email])) {
      throw new ProvisionamentoError(409, 'Este email já está em uso. Escolha outro.');
    }

    codigo_escola = gerarCodigoMaelG();
    while (await existe(conn, 'SELECT 1 FROM escola WHERE codigo = ?', [codigo_escola])) {
      codigo_escola = gerarCodigoMaelG();
    }
    codigo_admin = gerarCodigoMaelG();
    while (await existe(conn, 'SELECT 1 FROM utilizador WHERE codigo = ?', [codigo_admin])) {
      codigo_admin = gerarCodigoMaelG();
    }

    const [rEscola]: any[] = await conn.execute(
      `INSERT INTO escola (codigo, nome, tipo, designacao, regime_ensino, endereco, contacto_telefone)
       VALUES (?,?,?,?,?,?,?)`,
      [
        codigo_escola, v.escola_nome, v.tipo, v.designacao, v.regime,
        dados.escola_endereco ?? null, dados.escola_contacto_telefone ?? null,
      ],
    );
    escola_id = rEscola.insertId;

    const password_hash = bcrypt.hashSync(v.admin_password, BCRYPT_ROUNDS);
    const [rUtil]: any[] = await conn.execute(
      `INSERT INTO utilizador (codigo, email, nome, password_hash, ativo, is_super_admin)
       VALUES (?,?,?,?,1,0)`,
      [codigo_admin, v.admin_email, v.admin_nome, password_hash],
    );
    admin_id = rUtil.insertId;

    const [papeis]: any[] = await conn.execute("SELECT id FROM papel WHERE nome = 'director_geral' LIMIT 1");
    if (!papeis.length) {
      throw new ProvisionamentoError(
        500,
        "Papel 'director_geral' inexistente na BD. Arranque o backend da escola uma vez para ele sincronizar o RBAC (papel_permissao).",
      );
    }
    papel_id = papeis[0].id;

    await conn.execute(
      `INSERT INTO utilizador_escola (utilizador_id, escola_id, papel_id) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE papel_id = VALUES(papel_id)`,
      [admin_id, escola_id, papel_id],
    );
    await conn.execute(
      `INSERT INTO usuario_papel (usuario_id, papel_id, escola_id) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE papel_id = VALUES(papel_id)`,
      [admin_id, papel_id, escola_id],
    );

    const [func]: any[] = await conn.execute(
      'SELECT id FROM funcionario WHERE utilizador_id = ? LIMIT 1',
      [admin_id],
    );
    if (func.length) {
      funcionario_id = func[0].id;
    } else {
      const [rFunc]: any[] = await conn.execute(
        `INSERT INTO funcionario
           (nome, escola_id, data_admissao, categoria, tipo_professor, numero_agente, utilizador_id, cargo)
         VALUES (?,?,CURDATE(),'PEPS','especialista',NULL,?,'Director Geral')`,
        [v.admin_nome, escola_id, admin_id],
      );
      funcionario_id = rFunc.insertId;
    }

    await conn.execute(
      'UPDATE escola SET director_id = ?, primeiro_acesso_pendente = 1 WHERE id = ?',
      [funcionario_id, escola_id],
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }

  const resultado: ProvisionamentoResult = {
    escola_id,
    escola_codigo: codigo_escola,
    escola_nome: v.escola_nome,
    admin_id,
    admin_codigo: codigo_admin,
    admin_email: v.admin_email,
    papel_id,
    funcionario_id,
    primeiro_acesso: 'onboarding_pendente',
    tenant_mirrorado: false,
  };

  const mirror = await espelharTenant(resultado, dados, v, trialDays);
  resultado.tenant_mirrorado = mirror.ok;
  if (!mirror.ok && mirror.erro) {
    resultado.tenant_mirror_erro = mirror.erro;
    console.warn(`[provisionar] tenant não espelhado em 'maelg': ${mirror.erro}`);
  }

  return resultado;
}

export { carregarConfig };
