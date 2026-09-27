/**
 * Pedidos de supervision de escola.
 *
 * A escola e' criada pelo director na app do produto. O produto submete-a aqui e
 * ha uma decisao da equipa MaelG em cima. Este repo e' o "antes": enquanto o
 * pedido for `pendente` nao existe tenant, nao existe assinatura e a escola nao
 * conta para o MRR.
 *
 * O que decide se o pedido precisa mesmo de decisao humana e' o **limiar**, e
 * nao o bom senso de quem submeta. Ver `decidirLimiar`.
 */
import { getPool } from '../db';
import { lerSettings } from './tenants';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type EstadoPedido = 'pendente' | 'aprovado' | 'rejeitado';

export interface LimiarSupervisao {
  /** A partir deste numero de alunos o pedido vai a decisao humana. */
  alunos: number;
  /** A partir deste valor anual (AOA) o pedido vai a decisao humana. */
  valorAnualAoa: number;
  /**
   * Se true, mesmo uma escola pequena espera por decisao. Existe para
   * Poderem abrir o portao a limpo sem mexer no codigo.
   */
  exigirSempre: boolean;
}

export const LIMIAR_POR_OMISSAO: LimiarSupervisao = {
  alunos: 300,
  valorAnualAoa: 3_000_000,
  exigirSempre: false,
};

export interface PedidoEscola {
  id: number;
  produtoSlug: string;
  escolaCodigo: string;
  escolaId: number;
  nome: string;
  nif: string | null;
  tipo: string | null;
  designacao: string | null;
  regimeEnsino: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  province: string | null;
  city: string | null;
  firstAdminName: string | null;
  firstAdminEmail: string | null;
  firstAdminPhone: string | null;
  notas: string | null;
  alunosPrevistos: number | null;
  planoId: number | null;
  trialDias: number | null;
  exigeAprovacao: boolean;
  motivoLimiar: string | null;
  estado: EstadoPedido;
  motivoRejeicao: string | null;
  tenantId: number | null;
  decididoPor: number | null;
  decididoEm: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
  /** Nome do plano, para a fila mostrar o que esta em jogo. */
  planoNome: string | null;
  planoPrecoAoa: number | null;
  /** Quem decidiu, para a fila mostrar quem assinou. */
  decididoPorNome: string | null;
}

interface PedidoRow extends RowDataPacket {
  id: number;
  produto_slug: string;
  escola_codigo: string;
  escola_id: number;
  nome: string;
  nif: string | null;
  tipo: string | null;
  designacao: string | null;
  regime_ensino: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  province: string | null;
  city: string | null;
  first_admin_name: string | null;
  first_admin_email: string | null;
  first_admin_phone: string | null;
  notas: string | null;
  alunos_previstos: number | null;
  plano_id: number | null;
  trial_dias: number | null;
  exige_aprovacao: number;
  motivo_limiar: string | null;
  estado: EstadoPedido;
  motivo_rejeicao: string | null;
  tenant_id: number | null;
  decidido_por: number | null;
  decidido_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
  plano_nome: string | null;
  plano_preco: number | null;
  decidido_por_nome: string | null;
}

/** As colunas que a fila precisa, com os dois JOIN opcionais. */
const SELECAO = `
  SELECT pd.*, pl.nome AS plano_nome, pl.priceAoa AS plano_preco,
         op.name AS decidido_por_nome
  FROM escola_pedido pd
  LEFT JOIN plano pl ON pl.id = pd.plano_id
  LEFT JOIN super_admin_user op ON op.id = pd.decidido_por`;

function paraPedido(r: PedidoRow): PedidoEscola {
  return {
    id: r.id,
    produtoSlug: r.produto_slug,
    escolaCodigo: r.escola_codigo,
    escolaId: r.escola_id,
    nome: r.nome,
    nif: r.nif,
    tipo: r.tipo,
    designacao: r.designacao,
    regimeEnsino: r.regime_ensino,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    province: r.province,
    city: r.city,
    firstAdminName: r.first_admin_name,
    firstAdminEmail: r.first_admin_email,
    firstAdminPhone: r.first_admin_phone,
    notas: r.notas,
    alunosPrevistos: r.alunos_previstos,
    planoId: r.plano_id,
    trialDias: r.trial_dias,
    exigeAprovacao: r.exige_aprovacao === 1,
    motivoLimiar: r.motivo_limiar,
    estado: r.estado,
    motivoRejeicao: r.motivo_rejeicao,
    tenantId: r.tenant_id,
    decididoPor: r.decidido_por,
    decididoEm: r.decidido_em,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
    planoNome: r.plano_nome,
    planoPrecoAoa: r.plano_preco === null ? null : Number(r.plano_preco),
    decididoPorNome: r.decidido_por_nome,
  };
}

/** Le o limiar das settings. Um valor mal formado cai no omissao. */
export async function lerLimiar(): Promise<LimiarSupervisao> {
  let bruto: unknown;
  try {
    bruto = (await lerSettings()).limiarSupervisao;
  } catch {
    return { ...LIMIAR_POR_OMISSAO };
  }
  if (!bruto || typeof bruto !== 'object') return { ...LIMIAR_POR_OMISSAO };
  const b = bruto as Record<string, unknown>;
  const num = (v: unknown, omissao: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : omissao;
  return {
    alunos: num(b.alunos, LIMIAR_POR_OMISSAO.alunos),
    valorAnualAoa: num(b.valorAnualAoa, LIMIAR_POR_OMISSAO.valorAnualAoa),
    exigirSempre: b.exigirSempre === true,
  };
}

export interface DecisaoLimiar {
  exigeAprovacao: boolean;
  motivo: string | null;
  /** Para a fila: o que foi usado para decidir. */
  alunosEficazes: number | null;
  valorAnualAoa: number;
  limiar: LimiarSupervisao;
}

/**
 * Decide se o pedido vai a fila ou passa direto.
 *
 * O preco vem sempre do **nosso** plano. E o numero de alunos que conta nao e'
 * o declarado e' o menor entre o declarado e o tecto do plano: uma escola que
 * declara 500 alunos num plano limitado a 40 e' tratada como 40, porque e' o
 * maximo que ela pode sequer ter. Um plano sem tecto (`maxStudents = 0`) nao
 * esconde nada, por isso o declarado passa.
 *
 * Sem isto a regra seria decorativa: bastava declarar 20 alunos.
 */
export function decidirLimiar(dados: {
  alunosPrevistos: number | null;
  planoPrecoAoa: number | null;
  planoMaxStudents: number | null;
  limiar: LimiarSupervisao;
}): DecisaoLimiar {
  const valorAnualAoa = (dados.planoPrecoAoa ?? 0) * 12;

  let alunosEficazes: number | null = null;
  if (dados.alunosPrevistos !== null) {
    const tecto = dados.planoMaxStudents ?? 0;
    alunosEficazes = tecto > 0 ? Math.min(dados.alunosPrevistos, tecto) : dados.alunosPrevistos;
  }

  const Razoes: string[] = [];
  if (dados.limiar.exigirSempre) {
    Razoes.push('portao de aprovacao fechado por configuracao');
  }
  if (alunosEficazes !== null && alunosEficazes >= dados.limiar.alunos) {
    Razoes.push(
      `${alunosEficazes} alunos (limiar ${dados.limiar.alunos})`,
    );
  }
  if (valorAnualAoa >= dados.limiar.valorAnualAoa) {
    Razoes.push(
      `${valorAnualAoa.toLocaleString('pt-AO')} AOA/ano (limiar ${dados.limiar.valorAnualAoa.toLocaleString('pt-AO')})`,
    );
  }

  return {
    exigeAprovacao: Razoes.length > 0,
    motivo: Razoes.length ? `Exige aprovacao: ${Razoes.join('; ')}.` : null,
    alunosEficazes,
    valorAnualAoa,
    limiar: dados.limiar,
  };
}

export interface NovoPedidoEscola {
  produtoSlug: string;
  escolaCodigo: string;
  escolaId: number;
  nome: string;
  nif?: string | null;
  tipo?: string | null;
  designacao?: string | null;
  regimeEnsino?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  province?: string | null;
  city?: string | null;
  firstAdminName?: string | null;
  firstAdminEmail?: string | null;
  firstAdminPhone?: string | null;
  notas?: string | null;
  alunosPrevistos?: number | null;
  planoId?: number | null;
  trialDias?: number | null;
  exigeAprovacao: boolean;
  motivoLimiar: string | null;
}

/**
 * Regista (ou renova) o pedido de uma escola.
 *
 * Reenvio apos rejeicao actualiza a MESMA linha e conta uma tentativa, em vez
 * de criar um segundo pedido. Sem isto, um director que rejeita e reenvia
 * cinco vezes enche a fila com a mesma escola e a equipa perde o rasto.
 */
export async function submeterPedido(d: NovoPedidoEscola): Promise<{ pedido: PedidoEscola; criado: boolean }> {
  const [existente] = await getPool().query<PedidoRow[]>(
    `${SELECAO} WHERE pd.produto_slug = ? AND pd.escola_codigo = ? LIMIT 1`,
    [d.produtoSlug, d.escolaCodigo],
  );

  if (existente[0] && existente[0].estado !== 'rejeitado') {
    // ja esta pendente ou ja foi aprovado: reenviar nao faz sentido e criar
    // outro pedido so duplicaria a escola na fila.
    return { pedido: paraPedido(existente[0]), criado: false };
  }

  const [r] = await getPool().execute<ResultSetHeader>(
    `INSERT INTO escola_pedido
       (produto_slug, escola_codigo, escola_id, nome, nif, tipo, designacao,
        regime_ensino, contact_email, contact_phone, province, city,
        first_admin_name, first_admin_email, first_admin_phone, notas,
        alunos_previstos, plano_id, trial_dias, exige_aprovacao, motivo_limiar,
        estado, motivo_rejeicao)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pendente',NULL)
     ON DUPLICATE KEY UPDATE
       escola_id = VALUES(escola_id),
       nome = VALUES(nome), nif = VALUES(nif), tipo = VALUES(tipo),
       designacao = VALUES(designacao), regime_ensino = VALUES(regime_ensino),
       contact_email = VALUES(contact_email), contact_phone = VALUES(contact_phone),
       province = VALUES(province), city = VALUES(city),
       first_admin_name = VALUES(first_admin_name),
       first_admin_email = VALUES(first_admin_email),
       first_admin_phone = VALUES(first_admin_phone), notas = VALUES(notas),
       alunos_previstos = VALUES(alunos_previstos), plano_id = VALUES(plano_id),
       trial_dias = VALUES(trial_dias),
       exige_aprovacao = VALUES(exige_aprovacao),
       motivo_limiar = VALUES(motivo_limiar),
       estado = 'pendente', motivo_rejeicao = NULL,
       tenant_id = NULL, decidido_por = NULL, decidido_em = NULL`,
    [
      d.produtoSlug, d.escolaCodigo, d.escolaId, d.nome, d.nif ?? null, d.tipo ?? null,
      d.designacao ?? null, d.regimeEnsino ?? null, d.contactEmail ?? null,
      d.contactPhone ?? null, d.province ?? null, d.city ?? null,
      d.firstAdminName ?? null, d.firstAdminEmail ?? null, d.firstAdminPhone ?? null,
      d.notas ?? null, d.alunosPrevistos ?? null, d.planoId ?? null, d.trialDias ?? null,
      d.exigeAprovacao ? 1 : 0, d.motivoLimiar,
    ],
  );

  // insertId e' 0 quando o ON DUPLICATE KEY actualizou a linha existente.
  const criado = r.insertId !== 0 && r.affectedRows > 0;
  const pedido = await procurarPedidoPorEscola(d.produtoSlug, d.escolaCodigo);
  if (!pedido) throw new Error('Pedido de escola registado mas nao encontrado.');
  return { pedido, criado };
}

export async function procurarPedido(id: number): Promise<PedidoEscola | null> {
  const [rows] = await getPool().query<PedidoRow[]>(`${SELECAO} WHERE pd.id = ? LIMIT 1`, [id]);
  return rows[0] ? paraPedido(rows[0]) : null;
}

export async function procurarPedidoPorEscola(
  produtoSlug: string,
  escolaCodigo: string,
): Promise<PedidoEscola | null> {
  const [rows] = await getPool().query<PedidoRow[]>(
    `${SELECAO} WHERE pd.produto_slug = ? AND pd.escola_codigo = ? LIMIT 1`,
    [produtoSlug, escolaCodigo],
  );
  return rows[0] ? paraPedido(rows[0]) : null;
}

/** A fila da equipa. `estado` a null traz tudo; por omissao so os pendentes. */
export async function listarPedidos(estado?: EstadoPedido | null): Promise<PedidoEscola[]> {
  const where = estado ? 'WHERE pd.estado = ?' : "WHERE pd.estado = 'pendente'";
  const args = estado ? [estado] : [];
  const [rows] = await getPool().query<PedidoRow[]>(
    `${SELECAO} ${where} ORDER BY pd.criado_em ASC LIMIT 500`,
    args,
  );
  return rows.map(paraPedido);
}

export async function contarPedidosPendentes(): Promise<number> {
  const [rows] = await getPool().query<(RowDataPacket & { n: number })[]>(
    "SELECT COUNT(*) AS n FROM escola_pedido WHERE estado = 'pendente'",
  );
  return Number(rows[0]?.n ?? 0);
}

/**
 * Aprova o pedido. O `tenant` nasce **aqui**, nao na submissao: e' este o
 * momento em que a equipa assume a escola.
 *
 * `operadorId` e' null quando a aprovacao foi automatica pelo limiar: ninguem
 * assinou a decisao, e fingir que alguem assinou seria uma mentira na
 * auditoria.
 */
export async function marcarPedidoAprovado(
  id: number,
  operadorId: number | null,
  tenantId: number,
): Promise<void> {
  await getPool().execute(
    `UPDATE escola_pedido
     SET estado = 'aprovado', motivo_rejeicao = NULL, tenant_id = ?,
         decidido_por = ?, decidido_em = NOW()
     WHERE id = ? AND estado = 'pendente'`,
    [tenantId, operadorId, id],
  );
}

/**
 * Rejeita o pedido. Nao ha `tenant` a limpar porque nunca foi criado — e' o
 * ganho de separar as duas coisas.
 */
export async function marcarPedidoRejeitado(
  id: number,
  operadorId: number | null,
  motivo: string,
): Promise<void> {
  await getPool().execute(
    `UPDATE escola_pedido
     SET estado = 'rejeitado', motivo_rejeicao = ?, decidido_por = ?, decidido_em = NOW()
     WHERE id = ? AND estado = 'pendente'`,
    [motivo, operadorId, id],
  );
}

/** Reabre um pedido para o director poder corrigir e reenviar. */
export async function reabrirPedido(id: number): Promise<PedidoEscola | null> {
  await getPool().execute(
    `UPDATE escola_pedido
     SET estado = 'pendente', motivo_rejeicao = NULL, decidido_por = NULL, decidido_em = NULL
     WHERE id = ? AND estado = 'rejeitado'`,
    [id],
  );
  return procurarPedido(id);
}
