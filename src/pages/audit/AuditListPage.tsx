import { useState } from 'react';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDateTime } from '../../utils/formatters';
import { Search, History, Terminal, User, AlertCircle, ShieldAlert } from 'lucide-react';

export function AuditListPage() {
  const { auditLogs } = useBackoffice();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    return (
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHeader
        title="Auditoria Imutável"
        description="Rastreador legal de alterações e comandos emitidos por operadores do Control Plane."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Auditoria Logs' }]}
      />

      <Card variant="default" padding="sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            placeholder="Pesquise logs por descrição, operador ou identificador de transação..."
          />
        </div>
      </Card>

      {/* Audit Log Timeline */}
      {filteredLogs.length > 0 ? (
        <Card variant="default" padding="lg">
          <div className="relative border-l border-slate-900 ml-4 pl-6 space-y-6 py-2">
            {filteredLogs.map((log) => {
              let Icon = Terminal;
              let iconColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/10';

              if (log.action.includes('suspend') || log.action.includes('cancel')) {
                Icon = AlertCircle;
                iconColor = 'text-rose-400 bg-rose-500/10 border-rose-500/10';
              } else if (log.action.includes('paid') || log.action.includes('reactivate')) {
                Icon = ShieldAlert;
                iconColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10';
              }

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline dot */}
                  <span className="absolute -left-[30px] top-1.5 flex items-center justify-center bg-slate-950 border border-slate-900 rounded-full p-1 text-slate-500 shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 leading-normal">{log.details}</span>
                      <span className="text-[9px] uppercase tracking-wider font-mono font-semibold py-0.5 px-1.5 rounded bg-slate-950 border border-slate-900 text-slate-500">
                        {log.id}
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

                    {/* Diff JSON data representation */}
                    {(log.before || log.after) && (
                      <div className="mt-2.5 p-3 bg-slate-950 rounded-lg border border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono leading-relaxed">
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
          description="Nenhum log operacional correspondente aos filtros de pesquisa foi localizado no Control Plane."
          action={searchTerm ? { label: 'Limpar Filtro', onClick: () => setSearchTerm('') } : undefined}
        />
      )}
    </div>
  );
}
export default AuditListPage;
