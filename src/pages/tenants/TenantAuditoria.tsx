import { useTenant } from '../../hooks/useTenant';
import { useBackoffice } from '../../context/BackofficeContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDateTime } from '../../utils/formatters';
import { History, Shield, Terminal, User, AlertCircle } from 'lucide-react';

export function TenantAuditPage() {
  const tenant = useTenant();
  const { auditLogs } = useBackoffice();

  if (!tenant) return null;

  // Filter logs for this specific tenant
  const tenantLogs = auditLogs.filter(
    (log) => log.entityId === tenant.id || log.details.includes(tenant.name) || log.details.includes(tenant.code)
  );

  return (
    <div className="space-y-4 font-sans">
      <div>
        <h3 className="text-sm font-semibold text-white">Rastreador de Auditoria Completo</h3>
        <p className="text-[11px] text-slate-500">Registo imutável de todas as ações de ciclo de vida e comandos fiscais efetuados pelos operadores</p>
      </div>

      {tenantLogs.length > 0 ? (
        <Card variant="default" padding="lg">
          <div className="relative border-l border-slate-900 ml-4 pl-6 space-y-6 py-2">
            {tenantLogs.map((log) => {
              let Icon = Terminal;
              let iconColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/10';

              if (log.action.includes('suspend') || log.action.includes('cancel')) {
                Icon = AlertCircle;
                iconColor = 'text-rose-400 bg-rose-500/10 border-rose-500/10';
              } else if (log.action.includes('paid') || log.action.includes('reactivate')) {
                Icon = Shield;
                iconColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10';
              }

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline dot */}
                  <span className="absolute -left-[30px] top-1 flex items-center justify-center bg-slate-950 border border-slate-900 rounded-full p-1 shrink-0 text-slate-500">
                    <Icon className="w-3.5 h-3.5" />
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{log.details}</span>
                      <span className="text-[9px] uppercase tracking-wider font-mono font-semibold py-0.5 px-1.5 rounded bg-slate-950 border border-slate-900 text-slate-500">
                        ID: {log.id}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.operatorName} ({log.operatorRole === 'super_admin' ? 'Super Admin' : 'Operador'})
                      </span>
                      <span>·</span>
                      <span>IP: {log.operatorIp}</span>
                      <span>·</span>
                      <span>{formatDateTime(log.timestamp)}</span>
                    </div>

                    {/* Before / After state differences if available */}
                    {(log.before || log.after) && (
                      <div className="mt-2.5 p-3 bg-slate-950 rounded-lg border border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono">
                        {log.before && (
                          <div>
                            <span className="text-slate-600 block mb-1 uppercase tracking-wider">Estado Anterior:</span>
                            <pre className="text-rose-400 bg-rose-950/10 p-2 rounded border border-rose-950/20 overflow-x-auto whitespace-pre-wrap max-h-32">
                              {log.before}
                            </pre>
                          </div>
                        )}
                        {log.after && (
                          <div className={!log.before ? 'sm:col-span-2' : ''}>
                            <span className="text-slate-600 block mb-1 uppercase tracking-wider">Novo Estado Aplicado:</span>
                            <pre className="text-emerald-400 bg-emerald-950/10 p-2 rounded border border-emerald-950/20 overflow-x-auto whitespace-pre-wrap max-h-32">
                              {log.after}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={History}
          title="Sem registos de auditoria"
          description="Nenhum log de alteração operacional foi encontrado na trilha de auditoria para esta instituição."
        />
      )}
    </div>
  );
}
export default TenantAuditPage;
