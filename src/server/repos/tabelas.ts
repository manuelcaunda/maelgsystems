/**
 * Modelos das tabelas da base `maelg`.
 *
 * Uma interface por tabela, com os nomes das colunas exactos. O objectivo e
 * evitar trabalhar com chaves soltas: o TypeScript passa a apanhar um nome de
 * coluna errado na hora de compilar, em vez de falhar em producao com
 * "Unknown column".
 *
 * As interfaces dos repositorios sao as mesmas — aqui so fica a forma crua da
 * linha, tal como o MySQL a devolve. O que vai para a API e a forma camelCase
 * dos tipos em `src/types`.
 */
import type { RowDataPacket } from 'mysql2';
import type { Papel } from '../config';

export type PapelOperador = Papel;

export interface ProdutoRow extends RowDataPacket {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  versao: string | null;
  api_url: string | null;
  status: 'active' | 'inactive' | 'deprecated';
  criado_em: Date;
  atualizado_em: Date;
}

export interface ProdutoAcessoRow extends RowDataPacket {
  id: number;
  produto_id: number;
  chave: string;
  segredo: Buffer;
  caminho_escolas: string;
  caminho_dados: string;
  escopo: string;
  activo: number;
  criado_em: Date;
  ultimo_uso_em: Date | null;
}

export interface PlanoRow extends RowDataPacket {
  id: number;
  produto_id: number;
  codigo: string;
  nome: string;
  priceAoa: number;
  maxStudents: number;
  maxUsers: number;
  maxStorageGb: number;
  isActive: number;
  criado_em: Date;
  atualizado_em: Date;
  /**
   * Slug do produto, vindo do JOIN. Nao e' coluna de `plano`: so aparece
   * quando o SELECT traz `pr.slug AS produto_slug`. E' o que permite dizer a
   * que produto pertence cada plano.
   */
  produto_slug?: string;
}

export interface TenantRow extends RowDataPacket {
  id: number;
  codigo: string;
  produto_slug: string;
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
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  firstAdminName: string | null;
  firstAdminEmail: string | null;
  firstAdminPhone: string | null;
  firstAdminCodigo: string | null;
  primeiroAcessoPendente: number;
  suspendedReason: string | null;
  suspendedAt: Date | null;
  cancelledReason: string | null;
  cancelledAt: Date | null;
  provisionamento: 'pendente' | 'provisionado' | 'erro';
  provisionamentoErro: string | null;
  notas: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface SubscriptionRow extends RowDataPacket {
  id: number;
  tenantId: number;
  planId: number;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  interval: 'monthly' | 'quarterly' | 'annual';
  priceAoa: number;
  startDate: Date | null;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  autoRenew: number;
  criado_em: Date;
  atualizado_em: Date;
}

export interface PagamentoRow extends RowDataPacket {
  id: number;
  receiptNumber: string;
  tenantId: number;
  subscriptionId: number | null;
  amountAoa: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string | null;
  reference: string | null;
  proofVoucherName: string | null;
  notas: string | null;
  paidAt: Date | null;
  dueDate: Date | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface OperadorRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: PapelOperador;
  twoFactorEnabled: number;
  activo: number;
  criado_por: number | null;
  lastLoginAt: Date | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface AuditLogRow extends RowDataPacket {
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
  criado_em: Date;
}

/** Linha auxiliar para contagens — so o numero. */
export interface ContagemRow extends RowDataPacket {
  n: number;
}

/** Linha auxiliar para checagens de existencia. */
export interface ExisteRow extends RowDataPacket {
  existe: number;
}
