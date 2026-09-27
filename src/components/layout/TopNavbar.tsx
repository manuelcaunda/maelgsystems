import { useBackoffice } from '../../context/BackofficeContext';
import { Menu, X, PlusCircle, Sparkles, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../router/paths';

interface TopNavbarProps {
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export function TopNavbar({ onToggleMobileMenu, isMobileMenuOpen }: TopNavbarProps) {
  const { currentUser, canManageTenants, theme, toggleTheme } = useBackoffice();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-slate-950 dark:bg-slate-950 border-b border-slate-900 px-4 sm:px-6 h-14 flex items-center justify-between text-slate-100 shadow-md">
      {/* Zone 1: Brand title, one line */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-1 text-slate-400 hover:text-slate-100 lg:hidden focus:outline-none"
          aria-label="Abrir menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span
          onClick={() => navigate(PATHS.dashboard)}
          className="text-md sm:text-lg font-extrabold tracking-tight text-white font-sans flex items-center gap-2 cursor-pointer select-none"
        >
          <span className="bg-amber-500 text-black font-bold p-1 rounded text-xs leading-none">M</span>
          MaelG <span className="text-amber-500 font-semibold">Systems</span>
          <span className="text-slate-500 font-normal hidden md:inline text-xs border-l border-slate-800 pl-2">Control Plane</span>
        </span>
      </div>

      {/* Zone 2: Navigation Links or Contextual Area */}
      <div className="hidden lg:flex items-center gap-5 text-xs text-slate-500 font-mono">
        <span>Angola</span>
        <span>·</span>
        <span className="text-amber-500 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
          AOA Fiscal Control
        </span>
      </div>

      {/* Zone 3: Theme Toggle + Primary Actions + Switchable Role Simulator */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:text-amber-300 transition-colors focus:outline-none"
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Role Switcher Simulator */}
        {/* Primary action */}
        {canManageTenants && (
          <button
            onClick={() => navigate(PATHS.tenants.create)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-semibold py-1.5 px-2.5 rounded-lg transition-colors border border-amber-400/20 shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Tenant</span>
          </button>
        )}

        {/* Active operator profile */}
        <div className="flex items-center gap-2 border-l border-slate-900 pl-3">
          <div
            className="w-7 h-7 text-[10px] rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-semibold border border-slate-700"
            title={currentUser?.name}
          >
            {iniciais(currentUser?.name)}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-200 leading-none">{currentUser?.name || ''}</div>
            <div className="text-[9px] text-slate-500 font-mono leading-none mt-1 uppercase">
              {currentUser?.role ?? 'Operador'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
export default TopNavbar;

/**
 * Avatar sem imagem: a base nao tem fotos de operador. Duas iniciais tiradas
 * do nome — melhor do que um `<img src="">` a pedir um ficheiro que nao existe.
 */
function iniciais(nome?: string): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
