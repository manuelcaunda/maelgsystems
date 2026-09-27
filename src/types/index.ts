/**
 * Tipos da API do MaelG Systems.
 *
 * Estes tipos descrevem o que esta **na base de dados**. Se um campo nao existe
 * na tabela, nao existe aqui — a API nao inventa dados para tapar buracos.
 * O que e calculado (MRR, contagens) vem de `metricas()`, nunca do registo.
 */

// ---------------------------------------------------------------------------
// Enums, em espelho dos ENUMs do MySQL
// ---------------------------------------------------------------------------

export const ESTADOS_TENANT = ['trial', 'active', 'suspended', 'cancelled'] as const;
export type EstadoTenant = (typeof ESTADOS_TENANT)[number];

export const ESTADOS_PRODUTO = ['active', 'inactive', 'deprecated'] as const;
export type EstadoProduto = (typeof ESTADOS_PRODUTO)[number];

export const ESTADOS_ASSINATURA = ['trial', 'active', 'suspended', 'cancelled'] as const;
export type EstadoAssinatura = (typeof ESTADOS_ASSINATURA)[number];

export const PERIODOS = ['monthly', 'quarterly', 'annual'] as const;
export type Periodo = (typeof PERIODOS)[number];

export const ESTADOS_PAGAMENTO = ['pending', 'paid', 'failed', 'refunded'] as const;
export type EstadoPagamento = (typeof ESTADOS_PAGAMENTO)[number];

export const ESTADOS_PROVISIONAMENTO = ['pendente', 'em_curso', 'provisionado', 'erro'] as const;
export type EstadoProvisionamento = (typeof ESTADOS_PROVISIONAMENTO)[number];

/** 'YYYY-MM-DD' */
export type DataSQL = string;

// ---------------------------------------------------------------------------
// produto
// ---------------------------------------------------------------------------

export interface Product {
  id: number;
  slug: string; // 'maelgest'
  name: string;
  description: string;
  version: string;
  /** URL base da API do produto. Guardada aqui, usada para lhe falar. */
  apiUrl: string;
  status: EstadoProduto;
  createdAt: string;
}

/**
 * Credenciais de acesso a um produto.
 *
 * Vem **separado** de `Product` de proposito: a lista de produtos nunca traz o
 * segredo. So se pede explicitamente, e so para quem tem permissao.
 */
export interface AcessoProduto {
  produtoSlug: string;
  urlBase: string;
  caminhoEscolas: string;
  caminhoDados: string;
  chave: string;
  segredo: string;
  escopo: string;
  ultimoUsoEm: string | null;
}

// ---------------------------------------------------------------------------
// plano
// ---------------------------------------------------------------------------

export interface Plan {
  id: number;
  produtoSlug: string;
  codigo: string; // unico dentro do produto
  nome: string;
  priceAoa: number;
  maxStudents: number;
  maxUsers: number;
  maxStorageGb: number;
  isActive: boolean;
  criadoEm: string;
}

// ---------------------------------------------------------------------------
// tenant
// ---------------------------------------------------------------------------

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
}

export interface Tenant {
  id: number;
  codigo: string; // 'TEN-0000-0000'
  produtoSlug: string;
  /** Codigo MAELG da escola no produto, preenchido pelo produto. */
  escolaCodigo: string | null;
  escolaId: number | null;
  nome: string;
  nif: string | null;
  tipo: string | null;
  designacao: string | null;
  regimeEnsino: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  province: string | null;
  city: string | null;
  status: EstadoTenant;
  trialEndsAt: DataSQL | null;
  nextBillingDate: DataSQL | null;
  firstAdminName: string | null;
  firstAdminEmail: string | null;
  firstAdminPhone: string | null;
  firstAdminCodigo: string | null;
  primeiroAcessoPendente: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
  cancelledReason: string | null;
  cancelledAt: string | null;
  provisionamento: EstadoProvisionamento;
  provisionamentoErro: string | null;
  /** Quantas vezes fomos chamar a API do produto sem sucesso. */
  provisionamentoTentativas: number;
  provisionamentoEm: string | null;
  provisionamentoConcluidoEm: string | null;
  notas: string | null;
  criadoEm: string;
  atualizadoEm: string;
  /**
   * Plano em vigor, tirado do JOIN com `subscription` + `plano`. Vaem
   * denormalizados para a lista nao precisar de um segundo pedido; se nao
   * houver assinatura, sao null.
   */
  planoId: number | null;
  planoCodigo: string | null;
  planoNome: string | null;
  planoPrecoAoa: number | null;
}

// ---------------------------------------------------------------------------
// subscription
// ---------------------------------------------------------------------------

export interface Subscription {
  id: number;
  tenantId: number;
  planId: number;
  status: EstadoAssinatura;
  interval: Periodo;
  priceAoa: number;
  startDate: DataSQL | null;
  trialEndsAt: DataSQL | null;
  nextBillingDate: DataSQL | null;
  autoRenew: boolean;
  /** Denormalizado para a listagem, vem do JOIN. */
  tenantNome?: string;
  produtoSlug?: string;
  planoNome?: string;
}

export interface SubscriptionHistory {
  id: number;
  subscriptionId: number;
  evento: string;
  nota: string | null;
  data: DataSQL | null;
}

// ---------------------------------------------------------------------------
// pagamento
// ---------------------------------------------------------------------------

export interface NovoPagamento {
  tenantId: number;
  amountAoa: number;
  paymentMethod: string;
  reference?: string;
  proofVoucherName?: string;
  notas?: string;
  paidAt?: string;
  reativarSeSuspenso?: boolean;
}

// operador
// ---------------------------------------------------------------------------

/**
 * Conta nova. O backend valida o papel contra a lista fechada
 * (`PAPEIS_OPERADOR`) e hasha a password com bcrypt -- nunca enviamos hash.
 */
export interface NovoOperador {
  name: string;
  email: string;
  password: string;
  role: PapelOperador;
}

export interface Payment {
  id: number;
  receiptNumber: string; // 'RC-2026/001'
  tenantId: number;
  subscriptionId: number | null;
  amountAoa: number;
  status: EstadoPagamento;
  paymentMethod: string | null;
  reference: string | null;
  proofVoucherName: string | null;
  notas: string | null;
  paidAt: string | null;
  dueDate: DataSQL | null;
  criadoEm: string;
  atualizadoEm: string;
  tenantNome?: string;
  produtoSlug?: string;
}

// ---------------------------------------------------------------------------
// audit_log
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: number;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  details: string | null;
  changes: string | null;
  criadoEm: string;
}

// ---------------------------------------------------------------------------
// plataforma
// ---------------------------------------------------------------------------

/** Tabela chave/valor: o formato e livre, o conteudo e' do operador. */
export interface PlatformSettings {
  platformName?: string;
  platformUrl?: string;
  supportEmail?: string;
  activeMaintenance?: boolean;
  emailTemplates?: {
    provisioned?: string;
    suspended?: string;
    invoicePending?: string;
  };
}

export interface MetricasPlataforma {
  totalTenants: number;
  activeTenants: number;
  trials: number;
  suspendedTenants: number;
  mrrAoa: number;
  activePlans: number;
  activeProducts: number;
  activeOperators: number;
}

// ---------------------------------------------------------------------------
// operadores
// ---------------------------------------------------------------------------

/** Papeis de operador da plataforma, por ordem de privilegio. */
export const PAPEIS_OPERADOR = [
  'super_admin',
  'product_admin',
  'finance_admin',
  'support_admin',
  'auditor',
] as const;

export type PapelOperador = (typeof PAPEIS_OPERADOR)[number];

export interface Operator {
  id: number;
  name: string;
  email: string;
  role: PapelOperador;
  twoFactorEnabled: boolean;
  active: boolean;
  lastAccess: string | null;
  createdAt: string;
}
