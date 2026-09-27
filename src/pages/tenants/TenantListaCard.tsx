import { Tenant, Plan } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../utils/formatters';
import { ChevronRight, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../router/paths';

interface TenantListaCardProps {
  tenant: Tenant;
  plan: Plan | undefined;
}

export function TenantListaCard({ tenant, plan }: TenantListaCardProps) {
  const navigate = useNavigate();
  const isTrial = tenant.status === 'trial';
  const displayDate = isTrial ? tenant.trialEndsAt : tenant.nextBillingAt;
  const dateLabel = isTrial ? 'Fim de Testes:' : 'Próx. Fatura:';

  return (
    <Card
      variant="default"
      padding="md"
      className="hover:border-slate-800 transition-colors cursor-pointer select-none"
      onClick={() => navigate(PATHS.tenants.detail(tenant.id))}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white leading-tight truncate">{tenant.name}</h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-mono mt-1">
            <Globe className="w-3 h-3 shrink-0 text-slate-600" />
            <span className="truncate">{tenant.code} · {tenant.province}</span>
          </div>
        </div>
        <StatusBadge domain="tenant" status={tenant.status} />
      </div>

      <div className="mt-3 pt-3 border-t border-slate-900/60 flex items-center justify-between text-[11px]">
        <div>
          <span className="text-slate-500">Plano:</span>{' '}
          <strong className="text-slate-300 font-medium">{plan?.name || tenant.planSlug}</strong>
        </div>
        {displayDate && (
          <div className="text-right font-mono">
            <span className="text-slate-500 mr-1">{dateLabel}</span>
            <span className="text-slate-300">{formatDate(displayDate)}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex justify-end">
        <span className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5">
          Gerir Conta <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  );
}
export default TenantListaCard;
