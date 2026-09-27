/**
 * Tenants, assinaturas, pagamentos e configuracao da plataforma.
 *
 * O `codigo` do tenant e `TEN-XXXX-XXXX`, gerado com crypto (nada de
 * `Date.now()`, que da colisões). O `escolaCodigo`/`escolaId` sao a ligacao
 * ao produto — preenchidos pelo produto quando este regista o tenant.
 */
import crypto from 'crypto';
import type { ResultSetHeader } from 'mysql2';
import { emTransacao, getPool } from '../db';
import type { ContagemRow, PagamentoRow, PlanoRow, SubscriptionRow, TenantRow } from './tabelas';
import type { RowDataPacket } from 'mysql2';
import type { MetricasPlataforma, Payment, Subscription, Tenant } from '../../types';
import { ProdutoErro } from './produtos';

export class TenantErro extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

/** TEN-XXXX-XXXX, com zeros a esquerda, igual ao formato MAELG do produto. */
export function gerarCodigoTenant(): string {
  const n = (bytes: number) =>
    crypto.randomInt(0, 10 ** bytes).toString().padStart(bytes, '0');
  return `TEN-${n(4)}-${n(4)}`;
}

export function gerarCodigoMaElg(): string {
  const n = (bytes: number) =>
    crypto.randomInt(0, 10 ** bytes).toString().padStart(bytes, '0');
  return `MAELG-${n(4)}-${n(4)}`;
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

function paraTenant(r: TenantRow): Tenant {
  return {
    id: r.id,
    codigo: r.codigo,
    produtoSlug: r.produto_slug,
    escolaCodigo: r.escolaCodigo,
    escolaId: r.escolaId,
    nome: r.nome,
    nif: r.nif,
    tipo: r.tipo,
    designacao: r.designacao,
    regimeEnsino: r.regimeEnsino,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    province: r.province,
    city: r.city,
    status: r.status,
    trialEndsAt: r.trialEndsAt ? dataSql(r.trialEndsAt) : null,
    nextBillingDate: r.nextBillingDate ? dataSql(r.nextBillingDate) : null,
    firstAdminName: r.firstAdminName,
    firstAdminEmail: r.firstAdminEmail,
    firstAdminPhone: r.firstAdminPhone,
    firstAdminCodigo: r.firstAdminCodigo,
    primeiroAcessoPendente: r.primeiroAcessoPendente === 1,
    suspendedReason: r.suspendedReason,
    suspendedAt: r.suspendedAt?.toISOString() ?? null,
    cancelledReason: r.cancelledReason,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    provisionamento: r.provisionamento,
    provisionamentoErro: r.provisionamentoErro,
    provisionamentoTentativas: r.provisionamentoTentativas ?? 0,
    provisionamentoEm: r.provisionamentoEm?.toISOString() ?? null,
    provisionamentoConcluidoEm: r.provisionamentoConcluidoEm?.toISOString() ?? null,
    notas: r.notas,
    criadoEm: r.criado_em.toISOString(),
    atualizadoEm: r.atualizado_em.toISOString(),
    planoId: r.planoId,
    planoCodigo: r.planoCodigo,
    planoNome: r.planoNome,
    planoPrecoAoa: r.planoPrecoAoa === null ? null : Number(r.planoPrecoAoa),
  };
}

/** O mysql2 devolve DATE como Date no fuso local; a API fala YYYY-MM-DD. */
function dataSql(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dataSqlOuNull(d: Date | null): string | null {
  return d ? dataSql(d) : null;
}

const SELECT_TENANT = `
  SELECT t.*,
         s.id          AS planoId,
         p.codigo      AS planoCodigo,
         p.nome        AS planoNome,
         p.priceAoa    AS planoPrecoAoa
  FROM tenant t
  LEFT JOIN subscription s ON s.tenantId = t.id
  LEFT JOIN plano p         ON p.id = s.planId
`;

export async function listarTenants(): Promise<Tenant[]> {
  const [rows] = await getPool().query<TenantRow[]>(
    `${SELECT_TENANT} ORDER BY t.id DESC`,
  );
  return rows.map(paraTenant);
}

export async function procurarTenant(codigoOuId: string | number): Promise<Tenant | null> {
  const eNumero = typeof codigoOuId === 'number' || /^\d+$/.test(codigoOuId);
  const [rows] = await getPool().query<TenantRow[]>(
    `${SELECT_TENANT} WHERE ${eNumero ? 't.id' : 't.codigo'} = ? LIMIT 1`,
    [eNumero ? Number(codigoOuId) : codigoOuId],
  );
  return rows[0] ? paraTenant(rows[0]) : null;
}

export interface NovoTenant {
  nome: string;
  produtoSlug: string;
  nif?: string;
  tipo?: string;
  designacao?: string;
  regimeEnsino?: string;
  contactEmail?: string;
  contactPhone?: string;
  province?: string;
  city?: string;
  firstAdminName?: string;
  firstAdminEmail?: string;
  firstAdminPhone?: string;
  notas?: string;
  planoId?: number;
  trialDias?: number;
  /** Preenchido pelo produto, que e quem tem a escola. */
  escolaCodigo?: string;
  escolaId?: number;
}

/**
 * Regista o tenant e a assinatura numa transaccao, e depois vai criar a escola
 * na base do produto. Sao dois passos de proposito:
 *
 *   1. transaccao MySQL — o tenant e a assinatura nascem juntos, ou nenhum
 *   2. chamada HTTP ao produto — a escola e' criada la
 *
 * Se a chamada ao produto falhar, o tenant fica em `erro` com o motivo, e o
 * operador pode tentar de novo. Nao desfazemos o passo 1: a inscricao
 * comercial e' um facto, mesmo que a escola ainda nao exista no produto.
 */
export async function criarTenant(dados: NovoTenant): Promise<Tenant> {
  if (!dados.nome?.trim()) throw new TenantErro('O nome e obrigatorio.');
  if (!dados.produtoSlug?.trim()) throw new TenantErro('O produto e obrigatorio.');

  const codigo = gerarCodigoTenant();
  const trial = dados.trialDias && dados.trialDias > 0 ? dados.trialDias : 0;
  const trialEnds = trial
    ? new Date(Date.now() + trial * 86400000).toISOString().slice(0, 10)
    : null;

  let tenantId: number;
  try {
    tenantId = await emTransacao(async (conn) => {
    const [r] = await conn.execute<ResultSetHeader>(
      `INSERT INTO tenant
         (codigo, produto_slug, escolaCodigo, escolaId, nome, nif, tipo, designacao,
          regimeEnsino, contactEmail, contactPhone, province, city,
          firstAdminName, firstAdminEmail, firstAdminPhone,
          status, trialEndsAt, notas, provisionamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        dados.produtoSlug.trim(),
        dados.escolaCodigo ?? null,
        dados.escolaId ?? null,
        dados.nome.trim(),
        dados.nif ?? null,
        dados.tipo ?? null,
        dados.designacao ?? null,
        dados.regimeEnsino ?? null,
        dados.contactEmail ?? null,
        dados.contactPhone ?? null,
        dados.province ?? null,
        dados.city ?? null,
        dados.firstAdminName ?? null,
        dados.firstAdminEmail ?? null,
        dados.firstAdminPhone ?? null,
        trial ? 'trial' : 'active',
        trialEnds,
        dados.notas ?? null,
        'pendente',  // o estado da saga e' decidido depois, por `aprovisionar`
      ],
    );

    if (dados.planoId) {
      await conn.execute(
        `INSERT INTO subscription (tenantId, planId, status, \`interval\`, priceAoa, startDate, trialEndsAt, nextBillingDate)
         SELECT ?, id, ?, 'monthly', priceAoa, CURDATE(), ?, ?
         FROM plano WHERE id = ?`,
        [
          r.insertId,
          trial ? 'trial' : 'active',
          trialEnds,
          trialEnds,
          dados.planoId,
        ],
      );
    }
    return r.insertId;
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') {
      // `uq_tenant_produto_nif`: a mesma escola ja inscrita neste produto
      throw new TenantErro(
        dados.nif
          ? `Ja existe uma escola com o NIF ${dados.nif} em ${dados.produtoSlug}.`
          : 'Ja existe uma inscricao igual neste produto.',
        409,
      );
    }
    throw e;
  }

  const criado = await procurarTenant(String(tenantId));
  if (!criado) throw new TenantErro('Tenant criado mas nao encontrado.', 500);
  return criado;
}

/**
 * Cria a escola na base do produto e regista o resultado. Separate de
 * `criarTenant` para o mesmo codigo servir para a primeira tentativa e para as
 * seguintes (`reprovisionar`).
 *
 * A transaccao de criacao ja passou; aqui so Actualizamos o estado da saga.
 */
export async function provisionarEscola(
  tenantId: number,
  aoCorrer: (d: {
    produtoSlug: string;
    tenantCodigo: string;
    escolaId: number;
    escolaCodigo: string;
  }) => Promise<void>,
  erro: (d: { produtoSlug: string; tenantCodigo: string; motivo: string }) => Promise<void>,
): Promise<Tenant> {
  const t = await tenantPorId(tenantId);
  if (!t) throw new TenantErro('Tenant nao encontrado.', 404);
  if (t.provisionamento === 'provisionado') {
    throw new TenantErro('A escola ja esta aprovisionada.', 409);
  }

  await getPool().execute(
    `UPDATE tenant
     SET provisionamento = 'em_curso', provisionamentoEm = NOW(), provisionamentoTentativas = provisionamentoTentativas + 1
     WHERE id = ?`,
    [tenantId],
  );

  try {
    await aoCorrer({
      produtoSlug: t.produto_slug,
      tenantCodigo: t.codigo,
      escolaId: t.escolaId ?? 0,
      escolaCodigo: t.escolaCodigo ?? '',
    });
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    await getPool().execute(
      `UPDATE tenant
       SET provisionamento = 'erro', provisionamentoErro = ?, provisionamentoEm = NULL
       WHERE id = ?`,
      [motivo, tenantId],
    );
    await erro({ produtoSlug: t.produto_slug, tenantCodigo: t.codigo, motivo });
    throw e;
  }

  const depois = await tenantPorId(tenantId);
  if (!depois) throw new TenantErro('Tenant nao encontrado.', 404);
  return paraTenant(depois);
}

/** Marca a escola como criada no produto. */
export async function marcarProvisionado(
  tenantId: number,
  escolaId: number,
  escolaCodigo: string,
  primeiroAcessoPendente: boolean,
  firstAdminCodigo?: string,
): Promise<void> {
  await getPool().execute(
    `UPDATE tenant
     SET provisionamento = 'provisionado', provisionamentoErro = NULL,
         provisionamentoEm = NULL, provisionamentoConcluidoEm = NOW(),
         escolaId = ?, escolaCodigo = ?, primeiroAcessoPendente = ?,
         firstAdminCodigo = COALESCE(?, firstAdminCodigo)
     WHERE id = ?`,
    [escolaId, escolaCodigo, primeiroAcessoPendente ? 1 : 0, firstAdminCodigo ?? null, tenantId],
  );
}

/** Marca a saga como falhada, com o motivo que a UI mostra ao operador. */
export async function marcarErroProvisionamento(tenantId: number, motivo: string): Promise<void> {
  await getPool().execute(
    `UPDATE tenant
     SET provisionamento = 'erro', provisionamentoErro = ?, provisionamentoEm = NULL
     WHERE id = ?`,
    [motivo, tenantId],
  );
}

async function tenantPorId(id: number): Promise<TenantRow | null> {
  const [rows] = await getPool().query<TenantRow[]>(
    `${SELECT_TENANT} WHERE t.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function actualizarTenant(
  codigoOuId: string,
  campos: Partial<NovoTenant> & { status?: string; suspendedReason?: string; notas?: string },
): Promise<Tenant> {
  const atual = await procurarTenant(codigoOuId);
  if (!atual) throw new TenantErro('Tenant nao encontrado.', 404);
  const id = Number(atual.id);

  const mapa: Record<string, string> = {
    nome: 'nome',
    nif: 'nif',
    tipo: 'tipo',
    designacao: 'designacao',
    regimeEnsino: 'regimeEnsino',
    contactEmail: 'contactEmail',
    contactPhone: 'contactPhone',
    province: 'province',
    city: 'city',
    firstAdminName: 'firstAdminName',
    firstAdminEmail: 'firstAdminEmail',
    firstAdminPhone: 'firstAdminPhone',
    escolaCodigo: 'escolaCodigo',
    notas: 'notas',
    suspendedReason: 'suspendedReason',
  };

  const sets: string[] = [];
  const args: unknown[] = [];
  for (const [chave, coluna] of Object.entries(mapa)) {
    const v = (campos as Record<string, unknown>)[chave];
    if (v !== undefined) {
      sets.push(`${coluna} = ?`);
      args.push(v === '' ? null : v);
    }
  }
  if (campos.escolaId !== undefined) { sets.push('escolaId = ?'); args.push(campos.escolaId); }
  if (campos.status !== undefined) {
    if (!['trial', 'active', 'suspended', 'cancelled'].includes(campos.status)) {
      throw new TenantErro('Estado invalido: trial, active, suspended ou cancelled.');
    }
    sets.push('status = ?');
    args.push(campos.status);
    if (campos.status === 'suspended') {
      sets.push('suspendedAt = NOW()', 'suspendedReason = ?');
      args.push(campos.suspendedReason ?? 'Sem motivo indicado');
    }
    if (campos.status === 'cancelled') {
      sets.push('cancelledAt = NOW()');
    }
  }
  // escola definida significa que o produto ja a criou
  if (campos.escolaCodigo) {
    sets.push("provisionamento = 'provisionado'", 'provisionamentoErro = NULL');
  }

  if (sets.length) {
    await getPool().query(`UPDATE tenant SET ${sets.join(', ')} WHERE id = ?`, [...args, id]);
  }
  const actualizado = await procurarTenant(String(id));
  if (!actualizado) throw new TenantErro('Tenant nao encontrado.', 404);
  return actualizado;
}

export async function eliminarTenant(codigoOuId: string): Promise<void> {
  const t = await procurarTenant(codigoOuId);
  if (!t) throw new TenantErro('Tenant nao encontrado.', 404);
  await getPool().execute('DELETE FROM tenant WHERE id = ?', [Number(t.id)]);
}

// ---------------------------------------------------------------------------
// Assinaturas
// ---------------------------------------------------------------------------

export async function listarSubscriptions(): Promise<Subscription[]> {
  const [rows] = await getPool().query<(SubscriptionRow & {
    tenant_nome: string;
    plano_nome: string;
    produto_slug: string;
  })[]>(
    `SELECT s.*, t.nome AS tenant_nome, p.nome AS plano_nome, t.produto_slug
     FROM subscription s
     JOIN tenant t ON t.id = s.tenantId
     JOIN plano p ON p.id = s.planId
     ORDER BY s.id DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    planId: r.planId,
    status: r.status,
    interval: r.interval,
    priceAoa: Number(r.priceAoa),
    startDate: dataSqlOuNull(r.startDate),
    trialEndsAt: dataSqlOuNull(r.trialEndsAt),
    nextBillingDate: dataSqlOuNull(r.nextBillingDate),
    autoRenew: r.autoRenew === 1,
    tenantNome: r.tenant_nome,
    produtoSlug: r.produto_slug,
    planoNome: r.plano_nome,
  }));
}

/** Muda de plano. O `effectiveDate` e o que o IDEIA.md previa. */
export async function mudarPlano(
  tenantId: number,
  planoId: number,
  effectiveDate?: string,
): Promise<Subscription> {
  const [plano] = await getPool().query<PlanoRow[]>('SELECT * FROM plano WHERE id = ?', [planoId]);
  if (!plano[0]) throw new TenantErro('Plano nao encontrado.', 404);

  await emTransacao(async (conn) => {
    await conn.execute(
      `INSERT INTO subscription_history (subscriptionId, evento, nota, data)
       SELECT id, 'PLAN_CHANGED', ?, ? FROM subscription WHERE tenantId = ?`,
      [`Para ${plano[0].nome}`, effectiveDate ?? new Date().toISOString().slice(0, 10), tenantId],
    );
    await conn.execute(
      `UPDATE subscription
       SET planId = ?, priceAoa = ?, startDate = COALESCE(?, startDate)
       WHERE tenantId = ?`,
      [planoId, plano[0].priceAoa, effectiveDate ?? null, tenantId],
    );
  });

  const subs = await listarSubscriptions();
  const s = subs.find((x) => x.tenantId === tenantId);
  if (!s) throw new TenantErro('Assinatura nao encontrada.', 404);
  return s;
}

/** Suporte estende o trial. Auditoria em subscription_history. */
export async function estenderTrial(
  tenantId: number,
  diasExtra: number,
  motivo: string,
): Promise<Subscription> {
  if (!diasExtra || diasExtra <= 0) throw new TenantErro('Indica quantos dias a estender.');
  if (!motivo?.trim()) throw new TenantErro('Indica o motivo da extensao.');

  await emTransacao(async (conn) => {
    await conn.execute(
      `INSERT INTO subscription_history (subscriptionId, evento, nota, data)
       SELECT id, 'TRIAL_EXTENDED', ?, CURDATE() FROM subscription WHERE tenantId = ?`,
      [`+${diasExtra} dias. ${motivo}`, tenantId],
    );
    await conn.execute(
      `UPDATE subscription
       SET trialEndsAt = DATE_ADD(COALESCE(trialEndsAt, CURDATE()), INTERVAL ? DAY),
           nextBillingDate = DATE_ADD(COALESCE(trialEndsAt, CURDATE()), INTERVAL ? DAY)
       WHERE tenantId = ?`,
      [diasExtra, diasExtra, tenantId],
    );
    await conn.execute(
      `UPDATE tenant SET trialEndsAt = DATE_ADD(COALESCE(trialEndsAt, CURDATE()), INTERVAL ? DAY)
       WHERE id = ?`,
      [diasExtra, tenantId],
    );
  });

  const subs = await listarSubscriptions();
  const s = subs.find((x) => x.tenantId === tenantId);
  if (!s) throw new TenantErro('Assinatura nao encontrada.', 404);
  return s;
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export async function listarPagamentos(): Promise<Payment[]> {
  const [rows] = await getPool().query<(PagamentoRow & {
    tenant_nome: string;
    produto_slug: string;
  })[]>(
    `SELECT pg.*, t.nome AS tenant_nome, t.produto_slug
     FROM pagamento pg JOIN tenant t ON t.id = pg.tenantId
     ORDER BY pg.id DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    tenantId: r.tenantId,
    subscriptionId: r.subscriptionId,
    amountAoa: Number(r.amountAoa),
    status: r.status,
    paymentMethod: r.paymentMethod,
    reference: r.reference,
    proofVoucherName: r.proofVoucherName,
    notas: r.notas,
    paidAt: r.paidAt?.toISOString() ?? null,
    dueDate: dataSqlOuNull(r.dueDate),
    criadoEm: r.criado_em.toISOString(),
    atualizadoEm: r.atualizado_em.toISOString(),
    tenantNome: r.tenant_nome,
    produtoSlug: r.produto_slug,
  }));
}

export interface NovoPagamento {
  tenantId: number;
  amountAoa: number;
  paymentMethod: string;
  reference?: string;
  proofVoucherName?: string;
  notas?: string;
  paidAt?: string;
  /** Pagar reactiva um tenant suspenso. Regra do IDEIA.md. */
  reativarSeSuspenso?: boolean;
}

export async function registarPagamento(dados: NovoPagamento): Promise<Payment> {
  if (!dados.tenantId) throw new TenantErro('Indica o tenant.');
  if (!dados.amountAoa || dados.amountAoa <= 0) {
    throw new TenantErro('O valor tem de ser maior que zero.');
  }

  const [t] = await getPool().query<TenantRow[]>('SELECT * FROM tenant WHERE id = ?', [dados.tenantId]);
  if (!t[0]) throw new TenantErro('Tenant nao encontrado.', 404);

  const recibo = await proximoRecibo();

  const resultado = await emTransacao(async (conn) => {
    const [s] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM subscription WHERE tenantId = ? LIMIT 1',
      [dados.tenantId],
    );
    const subId = s[0] ? Number((s[0] as { id: number }).id) : null;

    const [r] = await conn.execute<ResultSetHeader>(
      `INSERT INTO pagamento
         (receiptNumber, tenantId, subscriptionId, amountAoa, status, paymentMethod,
          reference, proofVoucherName, notas, paidAt, dueDate)
       VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, COALESCE(?, NOW()), CURDATE())`,
      [
        recibo,
        dados.tenantId,
        subId,
        dados.amountAoa,
        dados.paymentMethod,
        dados.reference ?? null,
        dados.proofVoucherName ?? null,
        dados.notas ?? null,
        dados.paidAt ?? null,
      ],
    );

    if (subId) {
      await conn.execute(
        `INSERT INTO subscription_history (subscriptionId, evento, nota, data)
         VALUES (?, 'PAYMENT_REGISTERED', ?, CURDATE())`,
        [subId, `${dados.amountAoa} AOA, recibo ${recibo}.`],
      );
    }

    // regra do IDEIA.md: pagar reactiva um tenant suspenso
    let reativado = false;
    if (dados.reativarSeSuspenso !== false && t[0].status === 'suspended') {
      await conn.execute(
        `UPDATE tenant SET status = 'active', suspendedReason = NULL, suspendedAt = NULL
         WHERE id = ? AND status = 'suspended'`,
        [dados.tenantId],
      );
      reativado = true;
    }

    if (subId) {
      await conn.execute(
        `UPDATE subscription SET status = 'active',
           nextBillingDate = DATE_ADD(NOW(), INTERVAL 1 MONTH)
         WHERE id = ? AND status <> 'cancelled'`,
        [subId],
      );
    }

    return { id: r.insertId, reativado };
  });

  const todos = await listarPagamentos();
  const p = todos.find((x) => x.id === resultado.id);
  if (!p) throw new TenantErro('Pagamento registado mas nao encontrado.', 500);
  return p;
}

/** RC-AAAA/NNN, sequencial por ano. */
async function proximoRecibo(): Promise<string> {
  const ano = new Date().getFullYear();
  const [rows] = await getPool().query<ContagemRow[]>(
    "SELECT COUNT(*) AS n FROM pagamento WHERE receiptNumber LIKE ?",
    [`RC-${ano}/%`],
  );
  return `RC-${ano}/${String(Number(rows[0].n) + 1).padStart(3, '0')}`;
}

export async function eliminarPagamento(id: number): Promise<void> {
  const [r] = await getPool().execute<ResultSetHeader>('DELETE FROM pagamento WHERE id = ?', [id]);
  if (r.affectedRows === 0) throw new TenantErro('Pagamento nao encontrado.', 404);
}

// ---------------------------------------------------------------------------
// Configuracao
// ---------------------------------------------------------------------------

export async function lerSettings(): Promise<Record<string, unknown>> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM platform_settings');
  const saida: Record<string, unknown> = {};
  for (const r of rows) {
    const chave = String((r as { setting_key: string }).setting_key);
    const bruto = (r as { setting_value: string | null }).setting_value;
    try {
      saida[chave] = bruto ? JSON.parse(bruto) : null;
    } catch {
      saida[chave] = bruto;
    }
  }
  return saida;
}

export async function gravarSettings(
  valores: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  for (const [chave, valor] of Object.entries(valores)) {
    await getPool().execute(
      `INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [chave, JSON.stringify(valor)],
    );
  }
  return lerSettings();
}

/** Metricas de topo para o dashboard. Tudo contado na base, nada inventado. */
export async function metricas(): Promise<MetricasPlataforma> {
  const [t] = await getPool().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM tenant)                                        AS totalTenants,
       (SELECT COUNT(*) FROM tenant WHERE status = 'active')                AS activeTenants,
       (SELECT COUNT(*) FROM tenant WHERE status = 'trial')                 AS trials,
       (SELECT COUNT(*) FROM tenant WHERE status = 'suspended')             AS suspendedTenants,
       (SELECT COALESCE(SUM(priceAoa), 0) FROM subscription WHERE status = 'active') AS mrrAoa,
       (SELECT COUNT(*) FROM plano WHERE isActive = 1)                      AS activePlans,
       (SELECT COUNT(*) FROM produto WHERE status = 'active')               AS activeProducts,
       (SELECT COUNT(*) FROM super_admin_user WHERE activo = 1)             AS activeOperators`,
  );
  const linha = t[0] as Record<string, number>;
  return {
    totalTenants: Number(linha.totalTenants),
    activeTenants: Number(linha.activeTenants),
    trials: Number(linha.trials),
    suspendedTenants: Number(linha.suspendedTenants),
    mrrAoa: Number(linha.mrrAoa),
    activePlans: Number(linha.activePlans),
    activeProducts: Number(linha.activeProducts),
    activeOperators: Number(linha.activeOperators),
  };
}

export { ProdutoErro };
