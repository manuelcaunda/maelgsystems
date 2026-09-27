import { useLocation, NavLink } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  History,
  Lock,
  Settings,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';
import { PATHS } from '../../router/paths';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { pathname } = useLocation();
  const { tenants, payments, isSuperAdmin, currentUser } = useBackoffice();

  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      label: 'Painel Central',
      path: PATHS.dashboard,
      icon: LayoutDashboard,
      badge: null,
      roleRequired: null,
    },
    {
      label: 'Clientes (Tenants)',
      path: PATHS.tenants.list,
      icon: Users,
      badge: activeTenantsCount > 0 ? `${activeTenantsCount} Ativos` : null,
      roleRequired: null,
    },
    {
      label: 'Pagamentos & Caixa',
      path: PATHS.payments.list,
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} Pendentes` : null,
      roleRequired: null,
    },
    {
      label: 'Análise & Relatórios',
      path: PATHS.reports,
      icon: TrendingUp,
      badge: null,
      roleRequired: null,
    },
    {
      label: 'Módulos & Produtos',
      path: PATHS.products.list,
      icon: GraduationCap,
      badge: null,
      roleRequired: null,
    },
    {
      label: 'Auditoria Imutável',
      path: PATHS.audit.list,
      icon: History,
      badge: null,
      roleRequired: null,
    },
    {
      label: 'Equipa & Permissões',
      path: PATHS.superadmins.list,
      icon: ShieldCheck,
      badge: null,
      roleRequired: 'super_admin',
    },
    {
      label: 'Configurações',
      path: PATHS.settings.root,
      icon: Settings,
      badge: null,
      roleRequired: 'super_admin',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 border-r border-slate-900/80">
      {/* Mini Profile summary in sidebar */}
      <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-lg mb-4 flex items-center gap-2.5">
        <div className="relative">
          <div
            className="w-8 h-8 text-[11px] rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-semibold border border-slate-700"
            title={currentUser?.name}
          >
            {iniciais(currentUser?.name)}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full"></span>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-200 leading-tight truncate">{currentUser?.name || ''}</div>
          <div className="text-[9px] text-slate-500 font-mono leading-none mt-1 uppercase truncate">
            {currentUser?.role === 'super_admin' ? 'Acesso Total' : 'Operador'}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2 px-1">Menu Geral</p>

      {/* Nav List */}
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const hasAccess = !item.roleRequired || (item.roleRequired === 'super_admin' && isSuperAdmin);
          const active = isActive(item.path);

          return (
            <div key={item.path}>
              {hasAccess ? (
                <NavLink
                  to={item.path}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between w-full text-xs font-medium py-2.5 px-3 rounded-lg transition-all ${
                    active
                      ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
                      : 'border border-transparent hover:bg-slate-900/60 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
                      active ? 'bg-indigo-600/20 text-indigo-300' : 'bg-slate-900 text-slate-500 border border-slate-850'
                    }`}>
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 opacity-0 group-hover:opacity-100" />
                  )}
                </NavLink>
              ) : (
                <div
                  className="flex items-center justify-between w-full text-xs font-medium py-2.5 px-3 rounded-lg border border-transparent text-slate-600 bg-slate-900/10 cursor-not-allowed select-none opacity-60"
                  title="Permissões insuficientes para aceder a esta secção."
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-slate-700" />
                    <span>{item.label}</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-slate-900/85 pt-4 text-center">
        <div className="text-[10px] text-slate-600 font-mono">MaelG Control v1.4.0</div>
        <div className="text-[9px] text-slate-700 font-mono mt-0.5">AGT Certified System · Angola</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sidebar is persistent on large devices) */}
      <aside className="hidden lg:block w-64 h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onCloseMobile} />

          {/* Drawer Panel */}
          <div className="relative w-64 max-w-xs h-full flex flex-col z-10 animate-slide-right">
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
export default Sidebar;

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
