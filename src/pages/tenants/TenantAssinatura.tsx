import { useState } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useBackoffice } from '../../context/BackofficeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatAOA, formatDate, getDaysRemaining } from '../../utils/formatters';
import { Sparkles, Calendar, Layers, History, Clock, ArrowRightLeft, X } from 'lucide-react';

export function TenantSubscriptionPage() {
  const tenant = useTenant();
  const {
    plans,
    subscriptions,
    auditLogs,
    canManageTenants,
    changePlan,
    extendTrial } = useBackoffice();

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('');
  const [trialExtensionDays, setTrialExtensionDays] = useState(7);

  if (!tenant) return null;

  const subscription = subscriptions.find((s) => s.tenantId === tenant.id);
  const currentPlan = plans.find((p) => p.id === subscription?.planId) ?? plans.find((p) => p.codigo === tenant.planoCodigo);

  // O historico da assinatura vive no audit log: e' ai que a plataforma
  // regista quem trocou o plano, extendeu o trial, o produto respondeu, etc.
  const eventos = auditLogs
    .filter((l) => l.entityId === String(tenant.id))
    .slice(0, 20);
  
  // Available plans for this specific product
  const availablePlans = plans.filter((p) => p.produtoSlug === tenant.produtoSlug && p.isActive === true);

  const isTrial = tenant.status === 'trial';
  const isCancelled = tenant.status === 'cancelled';

  const handlePlanChange = () => {
    if (selectedPlanSlug) {
      changePlan(tenant.id, selectedPlanSlug);
      setShowPlanModal(false);
    }
  };

  const handleTrialExtension = () => {
    if (trialExtensionDays > 0) {
      extendTrial(tenant.id, Number(trialExtensionDays));
      setShowTrialModal(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner highlight of plan */}
      {currentPlan && (
        <Card variant="highlighted" padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[11px] text-indigo-400 font-mono font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Assinatura Ativa · Suite de Produtos
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-none">{currentPlan.nome}</h2>
            <p className="text-xs text-slate-400 max-w-xl font-mono">{currentPlan.codigo}</p>
          </div>

          <div className="flex flex-col items-start md:items-end justify-center shrink-0">
            <span className="text-[11px] text-slate-500 font-mono">Taxa Recorrente</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight mt-1">
              {formatAOA(currentPlan.priceAoa)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono capitalize mt-1">
              Cobrado mensalmente
            </span>
          </div>
        </Card>
      )}

      {/* Grid of basic attributes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status contract */}
        <Card variant="default" padding="md" className="space-y-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Estado do Vínculo</span>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              {isTrial ? 'Licença Experimental (Trial)' : isCancelled ? 'Vínculo Rescindido' : 'Subscrição Comercial'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">
            {isTrial ? `${getDaysRemaining(tenant.trialEndsAt)} dias de testes restantes` : 'Cobrança padrão por fatura'}
          </span>
        </Card>

        {/* Start dates */}
        <Card variant="default" padding="md" className="space-y-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Início da Instância</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              {formatDate(tenant.criadoEm)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">Contrato ativo por tempo indeterminado</span>
        </Card>

        {/* Expiry / Billing date */}
        <Card variant="default" padding="md" className="space-y-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
            {isTrial ? 'Vencimento do Período' : 'Próxima Fatura'}
          </span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              {formatDate(isTrial ? tenant.trialEndsAt : tenant.nextBillingDate)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">
            {isTrial ? 'Conversão manual requerida' : 'Geração de fatura a 5 dias do vencimento'}
          </span>
        </Card>
      </div>

      {/* Plan Limits Card */}
      {currentPlan && (
        <Card variant="default" padding="lg" className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Limites Ativos do Plano</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[
              { label: 'Alunos', valor: currentPlan.maxStudents },
              { label: 'Utilizadores', valor: currentPlan.maxUsers },
              { label: 'Armazenamento', valor: currentPlan.maxStorageGb, gb: true },
            ].map((limite) => (
              <div key={limite.label} className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-center font-mono">
                <div className="text-[10px] text-slate-500">{limite.label}</div>
                <div className="text-sm font-extrabold text-white mt-1.5">
                  {limite.valor === 0 ? 'Ilimitado' : `${limite.valor}${limite.gb ? ' GB' : ''}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Operator controls */}
      {canManageTenants && !isCancelled && (
        <Card variant="default" padding="lg" className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Operações da Assinatura</h3>
          <p className="text-xs text-slate-400">Gerir de forma manual os parâmetros comerciais do contrato, extensões de prazos e upgrade/downgrade de planos.</p>
          
          <div className="flex flex-wrap gap-2.5 pt-1.5">
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowRightLeft}
              onClick={() => {
                setSelectedPlanSlug((tenant.planoNome ?? ''));
                setShowPlanModal(true);
              }}
            >
              Mudar de Plano
            </Button>

            {isTrial && (
              <Button
                variant="secondary"
                size="sm"
                icon={Clock}
                onClick={() => {
                  setTrialExtensionDays(7);
                  setShowTrialModal(true);
                }}
              >
                Estender Trial
              </Button>
            )}

            {isTrial && (
              <Button
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={() => {
                  // Simply change plan to a paid plan of the product
                  const paidPlan = availablePlans.find(p => !p.codigo.includes('trial'));
                  if (paidPlan) {
                    changePlan(tenant.id, paidPlan.codigo);
                  }
                }}
              >
                Converter em Subscrição Paga
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Timeline of subscription events */}
      {subscription && (
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-white">Histórico de Eventos</h3>
          </div>

          <div className="relative border-l border-slate-900 ml-3 pl-5 space-y-5 py-2">
            {eventos.map((evento) => (
              <div key={evento.id} className="relative">
                {/* Timeline dot */}
                <span className="absolute -left-[25.5px] top-1.5 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">{evento.action}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {formatDate(evento.criadoEm)} · Operador: {evento.actorName || 'sistema'}
                  </div>
                  {evento.details && (
                    <p className="text-[11px] text-slate-400 mt-1 max-w-2xl font-sans italic bg-slate-950/40 p-2 border border-slate-900 rounded-md">
                      {evento.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* PLAN MODAL (Change Plan) */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPlanModal(false)} />
          
          <div className="relative bg-slate-950 border border-slate-900 rounded-xl max-w-sm w-full p-5 shadow-2xl animate-fade-in text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Alterar Plano</h3>
              <button onClick={() => setShowPlanModal(false)} className="p-1 rounded bg-slate-900 text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <label className="text-slate-500 font-semibold">Escolha o Novo Plano de Produção</label>
              <div className="space-y-2">
                {availablePlans.map((p) => (
                  <label
                    key={p.codigo}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-colors ${
                      selectedPlanSlug === p.codigo
                        ? 'border-indigo-500 bg-indigo-500/5'
                        : 'border-slate-900 bg-slate-900/40 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="plan"
                        value={p.codigo}
                        checked={selectedPlanSlug === p.codigo}
                        onChange={() => setSelectedPlanSlug(p.codigo)}
                        className="text-indigo-500 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-200">{p.nome}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{''}</div>
                      </div>
                    </div>
                    <strong className="text-slate-300 font-mono text-[11px] shrink-0 ml-3">{formatAOA(p.priceAoa)}</strong>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-900">
              <Button size="sm" onClick={() => setShowPlanModal(false)}>Cancelar</Button>
              <Button size="sm" variant="primary" onClick={handlePlanChange} disabled={selectedPlanSlug === (tenant.planoNome ?? '')}>
                Salvar Alteração
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRIAL EXTENSION MODAL */}
      {showTrialModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTrialModal(false)} />
          
          <div className="relative bg-slate-950 border border-slate-900 rounded-xl max-w-xs w-full p-5 shadow-2xl animate-fade-in text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Estender Período</h3>
              <button onClick={() => setShowTrialModal(false)} className="p-1 rounded bg-slate-900 text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Dias de Prorrogação Experimental</label>
                <select
                  value={trialExtensionDays}
                  onChange={(e) => setTrialExtensionDays(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 py-2 px-3 rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value={7}>Mais 7 dias de tolerância</option>
                  <option value={14}>Mais 14 dias (Trial completo)</option>
                  <option value={30}>Mais 30 dias de bónus</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-900">
              <Button size="sm" onClick={() => setShowTrialModal(false)}>Cancelar</Button>
              <Button size="sm" variant="primary" onClick={handleTrialExtension}>Estender Licença</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TenantSubscriptionPage;
