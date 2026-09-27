import { useState } from 'react';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/formatters';
import {
  Settings,
  Mail,
  Cpu,
  Save,
  CheckCircle,
  Play,
  Loader2,
  X
} from 'lucide-react';

export function PlatformSettingsPage() {
  const { settings, updateSettings, triggerJob, isSuperAdmin } = useBackoffice();
  const [activeTab, setActiveTab] = useState<'platform' | 'emails' | 'jobs'>('platform');

  // Platform Form states
  const [platformName, setPlatformName] = useState(settings.platformName);
  const [platformUrl, setPlatformUrl] = useState(settings.platformUrl);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [activeMaintenance, setActiveMaintenance] = useState(settings.activeMaintenance);

  // Email Templates states
  const [provisionedTemplate, setProvisionedTemplate] = useState(settings.emailTemplates.provisioned);
  const [suspendedTemplate, setSuspendedTemplate] = useState(settings.emailTemplates.suspended);
  const [invoiceTemplate, setInvoiceTemplate] = useState(settings.emailTemplates.invoicePending);

  const handleSavePlatform = () => {
    updateSettings({
      platformName,
      platformUrl,
      supportEmail,
      activeMaintenance,
    });
  };

  const handleSaveEmails = () => {
    updateSettings({
      emailTemplates: {
        provisioned: provisionedTemplate,
        suspended: suspendedTemplate,
        invoicePending: invoiceTemplate,
      },
    });
  };

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHeader
        title="Configurações"
        description="Configure os parâmetros do ecossistema Control Plane, templates de emails transacionais e cron-jobs de faturamento."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Configurações' }]}
      />

      {/* Settings layout with local sub-tabs */}
      <div className="flex border-b border-slate-900 gap-1.5 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('platform')}
          className={`text-xs font-semibold px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'platform'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Parâmetros Gerais
          </span>
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className={`text-xs font-semibold px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'emails'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Modelos de Emails
          </span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`text-xs font-semibold px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'jobs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Tarefas de Background (Jobs)
          </span>
        </button>
      </div>

      {!isSuperAdmin && (
        <Card variant="highlighted" padding="sm" className="border-rose-500/20 bg-rose-950/10 text-rose-300">
          <p className="text-xs font-semibold">
            Nota: A sua função atual de operador é restrita. Apenas Super Administradores podem salvar alterações ou desencadear cron-jobs nesta consola.
          </p>
        </Card>
      )}

      {/* ACTIVE PANEL CONTENT */}
      {activeTab === 'platform' && (
        <Card variant="default" padding="lg" className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <h3 className="text-sm font-semibold text-white">Parâmetros da Plataforma</h3>
            {isSuperAdmin && (
              <Button variant="primary" size="sm" icon={Save} onClick={handleSavePlatform}>
                Salvar Alterações
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Nome do Control Plane</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                disabled={!isSuperAdmin}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">URL de Acesso</label>
              <input
                type="text"
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                disabled={!isSuperAdmin}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:outline-none font-mono disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Email de Contacto de Suporte</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={!isSuperAdmin}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:outline-none font-mono disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <div className="flex items-center gap-2 p-2 bg-slate-950/40 rounded-lg border border-slate-900">
                <input
                  type="checkbox"
                  id="maint"
                  checked={activeMaintenance}
                  onChange={(e) => setActiveMaintenance(e.target.checked)}
                  disabled={!isSuperAdmin}
                  className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 h-4 w-4"
                />
                <label htmlFor="maint" className="text-slate-300 font-semibold select-none cursor-pointer leading-none">
                  Ativar Modo de Manutenção do Control Plane
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'emails' && (
        <Card variant="default" padding="lg" className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <h3 className="text-sm font-semibold text-white">Modelos de Emails Transacionais</h3>
            {isSuperAdmin && (
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveEmails}>
                Salvar Templates
              </Button>
            )}
          </div>

          <div className="space-y-4 text-xs font-sans">
            {/* Provision template */}
            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Email: Novo Cliente Provisionado (Sucesso)</label>
              <textarea
                value={provisionedTemplate}
                onChange={(e) => setProvisionedTemplate(e.target.value)}
                disabled={!isSuperAdmin}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-slate-300 font-mono focus:outline-none h-28 disabled:opacity-50"
              />
            </div>

            {/* Suspended template */}
            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Email: Alerta de Conta Suspensa por Falta de Pagamento</label>
              <textarea
                value={suspendedTemplate}
                onChange={(e) => setSuspendedTemplate(e.target.value)}
                disabled={!isSuperAdmin}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-slate-300 font-mono focus:outline-none h-28 disabled:opacity-50"
              />
            </div>

            {/* Invoice pending template */}
            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Email: Fatura Comercial Pendente de Liquidação</label>
              <textarea
                value={invoiceTemplate}
                onChange={(e) => setInvoiceTemplate(e.target.value)}
                disabled={!isSuperAdmin}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-slate-300 font-mono focus:outline-none h-28 disabled:opacity-50"
              />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'jobs' && (
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-900">
            <h3 className="text-sm font-semibold text-white">Tarefas Programadas do Control Plane (Cron-Jobs)</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Disparadores automáticos de faturamento mensal e rastreio de limites</p>
          </div>

          <div className="divide-y divide-slate-900/60 text-xs">
            {settings.jobs.map((job) => {
              const isRunning = job.status === 'running';
              return (
                <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-200">{job.name}</h4>
                      <span className="text-[10px] font-mono bg-slate-950 border border-slate-900 text-slate-500 py-0.5 px-1.5 rounded">
                        Expr: {job.schedule}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                      <span>Última Execução: {formatDateTime(job.lastRun)}</span>
                      <span>·</span>
                      <span>Próxima: {formatDateTime(job.nextRun)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold font-mono border px-2 py-0.5 rounded ${
                      isRunning
                        ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                      {job.status}
                    </span>
                    {isSuperAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Play}
                        loading={isRunning}
                        onClick={() => triggerJob(job.id)}
                      >
                        Executar Agora
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
export default PlatformSettingsPage;
