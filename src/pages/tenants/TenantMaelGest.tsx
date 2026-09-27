import { useTenant } from '../../hooks/useTenant';
import { useBackoffice } from '../../context/BackofficeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDateTime } from '../../utils/formatters';
import {
  FileCode,
  Server,
  Code2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Link2,
} from 'lucide-react';
import type { EstadoProvisionamento } from '../../types';

const ESTADO_META: Record<EstadoProvisionamento, { label: string; classe: string; Icone: typeof CheckCircle2 }> = {
  pendente: { label: 'Pendente', classe: 'bg-slate-950/60 text-slate-400 border-slate-800', Icone: Clock },
  em_curso: { label: 'A chamar o produto', classe: 'bg-sky-950/50 text-sky-400 border-sky-900', Icone: Clock },
  provisionado: { label: 'Escola confirmada', classe: 'bg-emerald-950/50 text-emerald-400 border-emerald-900', Icone: CheckCircle2 },
  erro: { label: 'O produto não respondeu', classe: 'bg-amber-950/50 text-amber-400 border-amber-900', Icone: AlertTriangle },
};

export function TenantMaelGestPage() {
  const tenant = useTenant();
  const { reprovisionarTenant } = useBackoffice();

  if (!tenant) return null;

  if (tenant.produtoSlug !== 'maelgest') {
    return (
      <EmptyState
        icon={FileCode}
        title="Mapeamento de produto diferente"
        description={`Esta secção descreve o aprovisionamento no produto ${tenant.produtoSlug}. Este tenant está registado noutro produto.`}
      />
    );
  }

  const meta = ESTADO_META[tenant.provisionamento];
  const EstadoIcone = meta.Icone;
  const podeTentar = tenant.provisionamento === 'erro' || tenant.provisionamento === 'pendente';

  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Aprovisionamento da escola</h3>
          <p className="text-[11px] text-slate-500">
            O que o produto devolveu quando a plataforma o chamou pela API
          </p>
        </div>

        {podeTentar && (
          <Button variant="primary" size="sm" icon={RefreshCw} onClick={() => reprovisionarTenant(tenant.id)}>
            Tentar de novo
          </Button>
        )}
      </div>

      <div className={`flex items-center gap-2 border rounded-lg px-4 py-3 ${meta.classe}`}>
        <EstadoIcone className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold">{meta.label}</span>
        {tenant.provisionamentoTentativas > 0 && (
          <span className="text-[11px] opacity-70">
            {tenant.provisionamentoTentativas} {tenant.provisionamentoTentativas === 1 ? 'tentativa' : 'tentativas'}
          </span>
        )}
      </div>

      {tenant.provisionamentoErro && (
        <Card variant="default" padding="md" className="space-y-2 border-amber-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            Motivo do falhanço
          </div>
          <p className="text-[11px] font-mono text-slate-300 break-words">{tenant.provisionamentoErro}</p>
          <p className="text-[10px] text-slate-500">
            A inscrição comercial existe; só a escola ficou por criar. Retry não duplica nada.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="default" padding="md" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <Link2 className="w-3 h-3" />
            Código da escola no produto
          </span>
          <div className="text-base font-bold font-mono text-white break-all">
            {tenant.escolaCodigo || '—'}
          </div>
        </Card>

        <Card variant="default" padding="md" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <Server className="w-3 h-3" />
            Id da escola no produto
          </span>
          <div className="text-base font-bold font-mono text-white">
            {tenant.escolaId ?? '—'}
          </div>
        </Card>
      </div>

      <Card variant="default" padding="lg" className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
          <Code2 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-white">Linha do tempo</h3>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-3">
            <dt className="text-slate-500">Inscrição criada</dt>
            <dd className="text-white font-mono mt-1">{formatDateTime(tenant.criadoEm)}</dd>
          </div>
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-3">
            <dt className="text-slate-500">Última chamada ao produto</dt>
            <dd className="text-white font-mono mt-1">{formatDateTime(tenant.provisionamentoEm)}</dd>
          </div>
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-3">
            <dt className="text-slate-500">Escola confirmada</dt>
            <dd className="text-white font-mono mt-1">{formatDateTime(tenant.provisionamentoConcluidoEm)}</dd>
          </div>
        </dl>

        <p className="text-[10px] text-slate-500">
          A plataforma nunca escreve na base de dados do produto: só fala com a API dele. Quando quem cria a escola é
          um utilizador dentro da app, o produto é que chama a plataforma e preenche{' '}
          <code className="text-slate-400">escolaCodigo</code> e <code className="text-slate-400">escolaId</code>{' '}
          por essa via.
        </p>
      </Card>
    </div>
  );
}
export default TenantMaelGestPage;
