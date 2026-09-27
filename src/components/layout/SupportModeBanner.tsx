import { useBackoffice } from '../../context/BackofficeContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export function SupportModeBanner() {
  const { impersonatingTenant, stopImpersonation } = useBackoffice();

  if (!impersonatingTenant) return null;

  return (
    <div className="bg-indigo-600 text-white px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md border-b border-indigo-700 animate-slide-in">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-indigo-200 animate-pulse" />
        <span>
          Sessão de Suporte Ativa para:{' '}
          <strong className="text-white underline">{impersonatingTenant.name}</strong> ({impersonatingTenant.code})
        </span>
        <span className="hidden md:inline-block text-[11px] bg-indigo-700 px-2 py-0.5 rounded text-indigo-100 font-normal">
          Modo Apenas de Leitura / Auditoria
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1.5 bg-indigo-800 hover:bg-rose-700 hover:text-white px-2.5 py-1 rounded text-xs font-semibold text-indigo-100 transition-colors"
        title="Sair da sessão de suporte"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sair do Suporte
      </button>
    </div>
  );
}
export default SupportModeBanner;
