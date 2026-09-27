import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { formatAOA } from '../../utils/formatters';
import { TrendingUp, Users, DollarSign, MapPin, Award, Globe } from 'lucide-react';

export function ReportsPage() {
  const { tenants, products, plans } = useBackoffice();

  // Computations
  const activeTenants = tenants.filter(t => t.status === 'active');
  const trialTenants = tenants.filter(t => t.status === 'trial');
  const suspendedTenants = tenants.filter(t => t.status === 'suspended');

  const totalMrr = activeTenants.reduce((sum, t) => {
    const plan = plans.find(p => p.slug === t.planSlug);
    return sum + (plan?.price || 0);
  }, 0);

  // Group by provinces
  const provinceCounts: { [key: string]: number } = {};
  tenants.forEach(t => {
    provinceCounts[t.province] = (provinceCounts[t.province] || 0) + 1;
  });

  const sortedProvinces = Object.entries(provinceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top active tenants list by price
  const topTenants = activeTenants
    .map(t => {
      const plan = plans.find(p => p.slug === t.planSlug);
      return {
        ...t,
        price: plan?.price || 0,
        planName: plan?.name || t.planSlug
      };
    })
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHeader
        title="Análise & Relatórios"
        description="Agregados macrofinanceiros, distribuição geográfica de licenças e rácios de retenção do ecossistema."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Análise & Relatórios' }]}
      />

      {/* Grid of basic totals */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="default" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Faturamento Anualizado (ARR)</span>
          <div className="text-sm sm:text-base font-black font-mono text-white">{formatAOA(totalMrr * 12)}</div>
        </Card>
        <Card variant="default" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Taxa de Churn (Anual)</span>
          <div className="text-sm sm:text-base font-black font-mono text-indigo-400">1.8%</div>
        </Card>
        <Card variant="default" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Contratos Ativos</span>
          <div className="text-sm sm:text-base font-black font-mono text-emerald-400">{activeTenants.length}</div>
        </Card>
        <Card variant="default" padding="sm" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Modo de Avaliação (Trial)</span>
          <div className="text-sm sm:text-base font-black font-mono text-sky-400">{trialTenants.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* MRR por Produto (3 barras) */}
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">MRR por Módulo de Produto</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Valores recorrentes mensais arrecadados por tipo de suite</p>
          </div>

          <div className="space-y-4 pt-1 text-xs">
            {products.map((p) => {
              const pct = totalMrr > 0 ? (p.mrr / totalMrr) * 100 : 0;
              return (
                <div key={p.slug} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-slate-300">{p.name}</span>
                    <strong className="font-mono text-white text-xs">{formatAOA(p.mrr)}</strong>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    {pct.toFixed(1)}% de contribuição de MRR
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribuição regional */}
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Sedes Regionais de Clientes</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Top 5 províncias de Angola com maior concentração de instâncias</p>
          </div>

          <div className="space-y-3.5 pt-1 text-xs">
            {sortedProvinces.map(([prov, count]) => (
              <div key={prov} className="flex justify-between items-center border-b border-slate-950 pb-2 last:border-none">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="font-medium text-slate-200">{prov}</span>
                </div>
                <strong className="font-mono text-indigo-400 font-bold bg-indigo-600/5 px-2 py-0.5 rounded border border-indigo-500/10">
                  {count} {count === 1 ? 'Cliente' : 'Clientes'}
                </strong>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Tenants by Contribution */}
        <Card variant="default" padding="lg" className="lg:col-span-2 space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Top Clientes por Volume Recorrente</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Contratos ativos com maior peso no MRR global consolidado</p>
          </div>

          <div className="space-y-3 text-xs">
            {topTenants.map((t, idx) => (
              <div
                key={t.id}
                className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 font-mono w-4">#{idx + 1}</span>
                  <div>
                    <h4 className="font-bold text-slate-200">{t.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Código: {t.code} · Província: {t.province}
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 font-mono self-end sm:self-center">
                  <span className="text-slate-500 text-[10px]">Plano: {t.planName} · </span>
                  <strong className="text-white text-xs font-bold">{formatAOA(t.price)}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
export default ReportsPage;
