/**
 * Formatter utilities for MaelG Backoffice.
 */

export function formatAOA(amount: number | null): string {
  if (amount === undefined || amount === null) return '0 AOA';
  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} AOA`;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  // Format as dd mmm yyyy (e.g. 26 Set 2026)
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const formattedDate = formatDate(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formattedDate} às ${hours}:${minutes}`;
}

export function getDaysRemaining(dateString?: string | null): number {
  if (!dateString) return 0;
  const target = new Date(dateString);
  const now = new Date();
  
  // Reset times to compare dates only
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

export function getTenantStatusMeta(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'active':
      return { label: 'Ativo', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' };
    case 'trial':
      return { label: 'Trial', bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-400' };
    case 'suspended':
      return { label: 'Suspenso', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' };
    case 'cancelled':
      return { label: 'Cancelado', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' };
    default:
      return { label: status, bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400' };
  }
}

export function getPaymentStatusMeta(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'paid':
      return { label: 'Liquidado', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' };
    case 'pending':
      return { label: 'Pendente', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' };
    case 'failed':
      return { label: 'Falhado', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' };
    case 'refunded':
      return { label: 'Reembolsado', bg: 'bg-indigo-500/10 border-indigo-500/20', text: 'text-indigo-400' };
    default:
      return { label: status, bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400' };
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'bank_transfer':
      return 'Transferência Bancária';
    case 'multicaixa_referencia':
      return 'Referência Multicaixa';
    case 'cash':
      return 'Numerário';
    case 'check':
      return 'Cheque';
    default:
      return method;
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Administrador';
    case 'finance_admin':
      return 'Operador Financeiro';
    case 'support_admin':
      return 'Operador de Suporte';
    default:
      return role;
  }
}

export const PROVINCES_ANGOLA = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire'
];
