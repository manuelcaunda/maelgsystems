import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatAOA, getDaysRemaining } from '../../utils/formatters';
import {
  Clock,
  AlertTriangle,
  Ban,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { PATHS } from '../../router/paths';

export function DashboardPage() {
  const navigate = useNavigate();
  const { tenants, payments, products, plans } = useBackoffice();
  const [credentialsLog, setCredentialsLog] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch('/api/credenciais');
        if (res.ok) setCredentialsLog(await res.text());
      } catch (e) {
        console.error('Error loading credentials logs:', e);
      }
    }
    loadLogs();
  }, []);

  // ─────────────────────────────────────────────
  // Computations
  // ─────────────────────────────────────────────
  
  // Calculate MRR from active subscriptions
  const activeTenants = tenants.filter(t => t.status === 'active');
  const totalMrr = activeTenants.reduce((sum, t) => {
    const plan = plans.find(p => p.codigo === (t.planoNome ?? ''));
    return sum + (plan?.priceAoa || 0);
  }, 0);

  // Expiring Trials (next 7 days)
  const expiringTrials = tenants.filter(t => {
    if (t.status !== 'trial' || !t.trialEndsAt) return false;
    const days = getDaysRemaining(t.trialEndsAt);
    return days <= 7;
  });

  // Urgent trials warning (<= 2 days)
  const hasUrgentTrial = expiringTrials.some(t => getDaysRemaining(t.trialEndsAt) <= 2);

  // Pending payments sum
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amountAoa, 0);

  // Suspended tenants
  const suspendedTenantsCount = tenants.filter(t => t.status === 'suspended').length;

  // Active products
  const activeProductsCount = products.filter((p) => p.status === 'active').length;

  // ─────────────────────────────────────────────
  // Actionable Attention List ("Requer atenção")
  // ─────────────────────────────────────────────
  
  interface AttentionItem {
    id: string;
    type: 'suspended' | 'overdue_payment' | 'trial_expiry';
    title: string;
    description: string;
    daysCount: number; // for priority sorting
    actionUrl: string;
    amount?: number;
  }

  const attentionItems: AttentionItem[] = [];

  // 1. Suspended tenants (Priority 1)
  tenants.filter(t => t.status === 'suspended').forEach(t => {
    attentionItems.push({
      id: `att-susp-${t.id}`,
      type: 'suspended',
      title: t.nome,
      description: `Serviço suspenso · NIF ${t.nif} · Localizado em ${t.province}`,
      daysCount: 999, // ultra high priority
      actionUrl: `/tenants/${t.id}`
    });
  });

  // 2. Overdue payments (Priority 2)
  pendingPayments.forEach(p => {
    // Sem data de vencimento nao ha atraso a medir: nao inventamos dias.
    if (!p.dueDate) return;
    const dueDate = new Date(p.dueDate);
    const delayDays = Math.max(0, Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    attentionItems.push({
      id: `att-pay-${p.id}`,
      type: 'overdue_payment',
      title: p.tenantNome ?? `Tenant ${p.tenantId}`,
      description: `Fatura ${p.receiptNumber} vencida há ${delayDays} dias · ${formatAOA(p.amountAoa)}`,
      daysCount: delayDays,
      actionUrl: `/tenants/${p.tenantId}/faturacao`,
      amount: p.amountAoa
    });
  });

  // 3. Trials expiring soon (Priority 3)
  expiringTrials.forEach(t => {
    const days = getDaysRemaining(t.trialEndsAt);
    attentionItems.push({
      id: `att-trial-${t.id}`,
      type: 'trial_expiry',
      title: t.nome,
      description: `Período de testes expira em ${days} ${days === 1 ? 'dia' : 'dias'} · Plano: ${(plans.find(p => p.codigo === (t.planoNome ?? ''))?.nome || (t.planoNome ?? ''))}`,
      daysCount: 10 - days, // lower remaining days = higher priority
      actionUrl: `/tenants/${t.id}/assinatura`
    });
  });

  // Sort according to rules specified in Prompt 2:
  // 1. Suspensões ativas (daysCount: 999)
  // 2. Pagamentos em atraso > 30 dias (daysCount > 30)
  // 3. Trials expira < 2 dias (daysCount = 8 ou 9)
  // 4. Outras faturas vencidas, trials etc.
  const sortedAttentionItems = attentionItems.sort((a, b) => b.daysCount - a.daysCount).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Central"
        description="Cockpit de administração e controlo de licenças da suite de produtos MaelG."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Painel Central' }]}
        actions={
          <Button variant="primary" size="md" icon={Plus} onClick={() => navigate(PATHS.tenants.create)}>
            Novo Cliente
          </Button>
        }
      />

      {/* BLOCO 1 — Faixa de contexto (1 linha) */}
      <div className="text-xs text-slate-400 font-mono flex items-center gap-2 select-none">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
        <span>Setembro de 2026</span>
        <span className="text-slate-700">·</span>
        <span>{tenants.length} Clientes</span>
        <span className="text-slate-700">·</span>
        <span>{activeProductsCount} Produtos Ativos</span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-300 font-bold">MRR {formatAOA(totalMrr)}</span>
      </div>

      {/* BLOCO 2 — 3 KPIs grandes (não 4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1 — MRR Total */}
        <Card
          variant="default"
          padding="md"
          className="hover:border-slate-800 transition-colors cursor-pointer group relative overflow-hidden"
          onClick={() => navigate(PATHS.reports)}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium font-sans">MRR Total</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono tracking-tight text-white mt-2 tabular-nums">
            {formatAOA(totalMrr)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-semibold">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% vs mês anterior</span>
          </div>
          <div className="absolute right-2 bottom-2 text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </div>
        </Card>

        {/* KPI 2 — Trials a Expirar */}
        <Card
          variant="default"
          padding="md"
          className="hover:border-slate-800 transition-colors cursor-pointer group relative overflow-hidden"
          onClick={() => navigate(`${PATHS.tenants.list}?status=trial`)}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium font-sans">Trials a Expirar (7d)</span>
            <Clock className={`w-4 h-4 ${hasUrgentTrial ? 'text-amber-500 animate-pulse' : 'text-sky-400'}`} />
          </div>
          <div className={`text-2xl font-extrabold font-mono tracking-tight mt-2 ${
            expiringTrials.length > 0 ? (hasUrgentTrial ? 'text-amber-400' : 'text-sky-400') : 'text-white'
          }`}>
            {expiringTrials.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 truncate font-sans">
            {expiringTrials.length > 0
              ? expiringTrials.map(t => t.nome.split(' ')[0]).join(', ')
              : 'Nenhum trial expira esta semana'}
          </div>
          {hasUrgentTrial && (
            <div className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
          )}
          <div className="absolute right-2 bottom-2 text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </div>
        </Card>

        {/* KPI 3 — Pendências Financeiras */}
        <Card
          variant="default"
          padding="md"
          className="hover:border-slate-800 transition-colors cursor-pointer group relative overflow-hidden"
          onClick={() => navigate(`${PATHS.payments.list}?status=pending`)}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium font-sans">Pendências em Caixa</span>
            <AlertTriangle className={`w-4 h-4 ${pendingPayments.length > 0 ? 'text-amber-500' : 'text-slate-500'}`} />
          </div>
          <div className="text-2xl font-extrabold font-mono tracking-tight text-amber-400 mt-2">
            {formatAOA(totalPendingAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-sans">
            {pendingPayments.length} faturadas vencidas · {suspendedTenantsCount} clientes suspensos
          </div>
          <div className="absolute right-2 bottom-2 text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </div>
        </Card>
      </div>

      {/* BLOCO 3 — Gráfico de evolução de MRR (largura total, barras verticais) */}
      <Card variant="default" padding="lg" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">Evolução do Faturamento Mensal (MRR)</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Visão histórica consolidada dos últimos 6 meses</p>
          </div>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-900 text-[10px] font-mono">
            <span className="px-2 py-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-md font-bold select-none cursor-default">6M</span>
            <span className="px-2 py-1 text-slate-600 rounded-md cursor-not-allowed select-none" title="Disponível em breve">12M</span>
            <span className="px-2 py-1 text-slate-600 rounded-md cursor-not-allowed select-none" title="Disponível em breve">YTD</span>
          </div>
        </div>

        {/* Vertical Chart Bars simulation */}
        <div className="pt-2">
          <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2">
            {/* Apr */}
            <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
              <div className="w-full bg-slate-800/80 hover:bg-slate-700/80 rounded-t-md transition-all duration-200 relative" style={{ height: '55%' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-all select-none whitespace-nowrap text-slate-300">
                  1.120.000 AOA
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Abr</span>
            </div>
            {/* May */}
            <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
              <div className="w-full bg-slate-800/80 hover:bg-slate-700/80 rounded-t-md transition-all duration-200 relative" style={{ height: '62%' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-all select-none whitespace-nowrap text-slate-300">
                  1.250.000 AOA
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Mai</span>
            </div>
            {/* Jun */}
            <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
              <div className="w-full bg-slate-800/80 hover:bg-slate-700/80 rounded-t-md transition-all duration-200 relative" style={{ height: '70%' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-all select-none whitespace-nowrap text-slate-300">
                  1.420.000 AOA
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Jun</span>
            </div>
            {/* Jul */}
            <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
              <div className="w-full bg-slate-800/80 hover:bg-slate-700/80 rounded-t-md transition-all duration-200 relative" style={{ height: '75%' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-all select-none whitespace-nowrap text-slate-300">
                  1.500.000 AOA
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Jul</span>
            </div>
            {/* Aug */}
            <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
              <div className="w-full bg-slate-800/80 hover:bg-slate-700/80 rounded-t-md transition-all duration-200 relative" style={{ height: '85%' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-all select-none whitespace-nowrap text-slate-300">
                  1.710.000 AOA
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ago</span>
            </div>
            {/* Sept (Active highlighted) */}
            <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
              <div className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-t-md transition-all duration-200 relative" style={{ height: '94%' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-indigo-950/80 px-1.5 py-0.5 rounded text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-all select-none whitespace-nowrap text-slate-200">
                  {formatAOA(totalMrr)} (Ativo)
                </span>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold font-mono">Set</span>
            </div>
          </div>

          <div className="border-t border-slate-900/60 mt-4 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-500 font-mono gap-2">
            <span>Legenda: Cor em Indigo indica o mês corrente ativo. Hover mostra os dados exatos.</span>
            <span>Mês atual: {formatAOA(totalMrr)} · {activeTenants.length} Tenants</span>
          </div>
        </div>
      </Card>

      {/* BLOCO 4 — "Requer atenção" (lista consolidada ordenada por urgência) */}
      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-900 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">Requer Atenção Administrativa</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Cobranças pendentes, trials a expirar e suspensões ordenados por prioridade operacional</p>
          </div>
          <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-900 text-slate-500 font-mono">
            {sortedAttentionItems.length} Itens
          </span>
        </div>

        {sortedAttentionItems.length > 0 ? (
          <div className="divide-y divide-slate-900/60">
            {sortedAttentionItems.map((item) => {
              let Icon = Clock;
              let iconBg = 'text-sky-400 bg-sky-500/10 border-sky-500/10';
              let badgeLabel = 'Trial Expira';
              let badgeStyle = 'text-sky-400 bg-sky-500/10 border-sky-500/20';

              if (item.type === 'suspended') {
                Icon = Ban;
                iconBg = 'text-rose-400 bg-rose-500/10 border-rose-500/10';
                badgeLabel = 'Suspenso';
                badgeStyle = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
              } else if (item.type === 'overdue_payment') {
                Icon = AlertTriangle;
                iconBg = 'text-amber-400 bg-amber-500/10 border-amber-500/10';
                badgeLabel = 'Fatura Vencida';
                badgeStyle = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(item.actionUrl)}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-900/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg border shrink-0 ${iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] uppercase tracking-wider font-semibold font-mono py-0.5 px-2 rounded-md border ${badgeStyle}`}>
                      {badgeLabel}
                    </span>
                    <button className="text-slate-600 hover:text-slate-400 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={CheckCircle2}
              title="Tudo em ordem"
              description="Nenhum trial a expirar nos próximos 7 dias e nenhuma cobrança pendente identificada."
            />
          </div>
        )}

        {sortedAttentionItems.length > 0 && (
          <div className="p-3 bg-slate-900/20 text-center border-t border-slate-900">
            <button
              onClick={() => navigate(PATHS.tenants.list)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 font-mono"
            >
              Ver Todos os Clientes Ativos
            </button>
          </div>
        )}
      </Card>

      {/* BLOCO 5 — Simulador de Envio de E-mails / Credenciais Emitidas */}
      <Card variant="default" padding="lg" className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <h3 className="text-sm font-semibold text-white">MaelG Mail — Consola de Credenciais por E-mail (Simulador)</h3>
          </div>
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/credenciais');
                if (res.ok) setCredentialsLog(await res.text());
              } catch (e) {}
            }}
            className="text-[10px] font-mono text-amber-500 hover:text-amber-400 underline cursor-pointer"
          >
            Actualizar Logs
          </button>
        </div>
        
        <p className="text-[11px] text-slate-400">
          Esta consola monitoriza as credenciais de primeiro acesso (Director Geral + Código de Escola) geradas no processo de aprovisionamento, simulando o envio de correio electrónico institucional:
        </p>

        <pre className="p-3 bg-slate-950/80 border border-slate-900 rounded-lg text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
          {credentialsLog || 'Nenhum e-mail de credencial registado no servidor ainda.'}
        </pre>
      </Card>
    </div>
  );
}
export default DashboardPage;
