import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Check, X, ShieldAlert } from 'lucide-react';
import { PATHS } from '../../router/paths';

export function RbacMatrixPage() {
  const permissions = [
    { action: 'Provisionar novos clientes (Data Plane)', super: true, finance: false, support: true },
    { action: 'Suspender ou reativar serviços de clientes', super: true, finance: false, support: true },
    { action: 'Alterar planos tarifários de clientes', super: true, finance: false, support: true },
    { action: 'Estender períodos de teste (Trial)', super: true, finance: false, support: true },
    { action: 'Registrar pagamentos e emitir faturas manuais', super: true, finance: true, support: false },
    { action: 'Cancelar contratos de forma definitiva (D)', super: true, finance: false, support: false },
    { action: 'Visualizar payloads de provisionamento JSON', super: true, finance: false, support: false },
    { action: 'Visualizar scripts SQL de infraestrutura física', super: true, finance: false, support: false },
    { action: 'Efetuar simulação de suporte (Impersonate)', super: true, finance: false, support: false },
    { action: 'Alterar parâmetros globais da plataforma', super: true, finance: false, support: false },
    { action: 'Executar cron-jobs manuais de background', super: true, finance: false, support: false },
  ];

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHeader
        title="Matriz de Permissões (RBAC)"
        description="Consulte os privilégios estáticos mapeados para cada nível de operador administrativo da plataforma."
        breadcrumbs={[
          { label: 'Equipa', href: PATHS.superadmins.list },
          { label: 'Matriz RBAC' }
        ]}
        backHref={PATHS.superadmins.list}
      />

      <Card variant="default" padding="none" className="overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-950 bg-slate-950/40 text-[11px] font-mono uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4 font-semibold">Ação Operacional</th>
              <th className="py-3 px-4 font-semibold text-center w-24">Super Admin</th>
              <th className="py-3 px-4 font-semibold text-center w-24">Financeiro</th>
              <th className="py-3 px-4 font-semibold text-center w-24">Suporte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-950 text-xs">
            {permissions.map((p, idx) => (
              <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                <td className="py-3.5 px-4 font-medium text-slate-200">
                  {p.action}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex justify-center">
                    {p.super ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex justify-center">
                    {p.finance ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex justify-center">
                    {p.support ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card variant="muted" padding="md">
        <div className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed font-sans">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-300">Modo de Simulação RBAC Ativo</p>
            <p className="mt-1">
              Para testar de forma interativa como os botões de ciclo de vida ou ecrãs de faturamento respondem de acordo com as permissões acima, altere a sua função de operador ativa utilizando o seletor rápido localizado no topo do cabeçalho da plataforma.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
export default RbacMatrixPage;
