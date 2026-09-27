import { getTenantStatusMeta, getPaymentStatusMeta } from '../../utils/formatters';

interface StatusBadgeProps {
  domain: 'tenant' | 'payment' | 'subscription' | 'plan' | 'user';
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ domain, status, size = 'sm' }: StatusBadgeProps) {
  let label = status;
  let bgClass = 'bg-slate-500/10 border-slate-500/20';
  let textClass = 'text-slate-400';

  if (domain === 'tenant' || domain === 'subscription') {
    const meta = getTenantStatusMeta(status);
    label = meta.label;
    bgClass = meta.bg;
    textClass = meta.text;
  } else if (domain === 'payment') {
    const meta = getPaymentStatusMeta(status);
    label = meta.label;
    bgClass = meta.bg;
    textClass = meta.text;
  } else if (domain === 'plan' || domain === 'user') {
    if (status === 'active' || status === 'true') {
      label = 'Ativo';
      bgClass = 'bg-emerald-500/10 border-emerald-500/20';
      textClass = 'text-emerald-400';
    } else if (status === 'beta') {
      label = 'Beta';
      bgClass = 'bg-indigo-500/10 border-indigo-500/20';
      textClass = 'text-indigo-400';
    } else {
      label = 'Inativo';
      bgClass = 'bg-slate-500/10 border-slate-500/20';
      textClass = 'text-slate-400';
    }
  }

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-mono border',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium border',
  };

  return (
    <span className={`inline-flex items-center shrink-0 uppercase tracking-wide ${sizes[size]} ${bgClass} ${textClass}`}>
      {label}
    </span>
  );
}
