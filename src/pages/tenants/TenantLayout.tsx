import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { useTenant } from '../../hooks/useTenant';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Card } from '../../components/ui/Card';
import { ShieldAlert, Play, Ban, Trash2, Settings, ChevronDown, Clock, ChevronRight } from 'lucide-react';
import { PATHS } from '../../router/paths';

export function TenantLayout() {
  const tenant = useTenant();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    canManageTenants,
    suspendTenant,
    reactivateTenant,
    cancelTenant,
    deleteTenant,
    currentUser } = useBackoffice();

  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  if (!tenant) return null; // Hook redirects inside if not found

  const isSuspended = tenant.status === 'suspended';
  const isTrial = tenant.status === 'trial';
  const isCancelled = tenant.status === 'cancelled';

  // Sub-tabs configuration
  const tabs = [
    { label: 'Perfil', path: `/tenants/${tenant.id}`, exact: true },
    { label: 'Assinatura & Plano', path: `/tenants/${tenant.id}/assinatura` },
    { label: 'Faturação & Recibos', path: `/tenants/${tenant.id}/faturacao` },
    { label: 'Auditoria Logs', path: `/tenants/${tenant.id}/auditoria` },
  ];

  // Only super_admin or product_admin see the product outputs
  const showProductOutputTab = currentUser?.role === 'super_admin' && tenant.produtoSlug === 'maelgest';
  if (showProductOutputTab) {
    tabs.push({ label: 'Saídas MaelGest', path: `/tenants/${tenant.id}/maelgest` });
  }

  const isTabActive = (tabPath: string, exact = false) => {
    if (exact) return pathname === tabPath;
    return pathname === tabPath || pathname.startsWith(tabPath + '/');
  };

  const handleSuspend = () => {
    suspendTenant(tenant.id, suspendReason);
    setShowSuspendModal(false);
  };

  const handleReactivate = () => {
    reactivateTenant(tenant.id);
    setShowReactivateModal(false);
  };

  const handleCancel = () => {
    cancelTenant(tenant.id, 'Cancelamento definitivo solicitado.');
    setShowCancelModal(false);
  };

  const handleDelete = () => {
    deleteTenant(tenant.id);
    setShowDeleteModal(false);
    navigate(PATHS.tenants.list);
  };

  return (
    <div className="space-y-6">
      {/* Header with quick descriptors */}
      <PageHeader
        title={tenant.nome}
        description={`Código: ${tenant.codigo} · NIF: ${tenant.nif} · ${tenant.city}, ${tenant.province}`}
        breadcrumbs={[
          { label: 'Clientes', href: PATHS.tenants.list },
          { label: tenant.nome },
          {
            label: pathname.includes('assinatura')
              ? 'Assinatura'
              : pathname.includes('faturacao')
              ? 'Faturação'
              : pathname.includes('auditoria')
              ? 'Auditoria'
              : pathname.includes('maelgest')
              ? 'Saídas MaelGest'
              : 'Perfil'
          }
        ]}
        backHref={PATHS.tenants.list}
        actions={
          <div className="relative">
            {canManageTenants && (
              <>
                <button
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  className="flex items-center gap-1.5 bg-[#2B3139] border border-slate-800 hover:bg-[#353C45] text-slate-200 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold select-none transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-500" />
                  Gerir Conta
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActionsOpen ? 'rotate-180' : ''}`} />
                </button>

                {isActionsOpen && (
                  <>
                    {/* Overlay to close menu on click outside */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsActionsOpen(false)} />
                    
                    <div className="absolute right-0 mt-1.5 w-56 bg-[#1E2329] border border-[#2B3139] text-[#EAECEF] rounded-lg shadow-2xl p-1 z-20 text-xs font-sans animate-fade-in divide-y divide-[#2B3139]">
                      <div className="py-1">
                        
                        {!isCancelled && (
                          isSuspended ? (
                            <button
                              onClick={() => {
                                setIsActionsOpen(false);
                                setShowReactivateModal(true);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-emerald-400 hover:bg-slate-900 rounded-md font-semibold text-left cursor-pointer"
                            >
                              <Play className="w-4 h-4 shrink-0" />
                              Reativar Serviço
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setIsActionsOpen(false);
                                setShowSuspendModal(true);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-amber-400 hover:bg-slate-900 rounded-md font-semibold text-left cursor-pointer"
                            >
                              <Ban className="w-4 h-4 shrink-0" />
                              Suspender Serviço
                            </button>
                          )
                        )}
                      </div>
                      
                      {!isCancelled && (
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setIsActionsOpen(false);
                              setShowCancelModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-slate-900 rounded-md font-semibold text-left cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            Cancelar Contrato
                          </button>
                        </div>
                      )}

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsActionsOpen(false);
                            setShowDeleteModal(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-slate-900 rounded-md font-semibold text-left cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 shrink-0 text-rose-600" />
                          Eliminar Permanentemente (CRUD)
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        }
      />

      {/* State Alerts (If active state warnings apply) */}
      {isSuspended && (
        <Card variant="highlighted" padding="sm" className="border-amber-500/30 bg-amber-950/10 text-amber-200">
          <div className="flex items-center gap-2.5 text-xs font-sans">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Atenção:</strong> Esta instituição encontra-se suspensa do sistema devido a incumprimento de faturamento.
            </span>
          </div>
        </Card>
      )}

      {isTrial && (
        <Card variant="default" padding="sm" className="border-sky-500/20 bg-sky-950/15 text-sky-200">
          <div className="flex items-center justify-between gap-3 text-xs font-sans flex-wrap">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Esta instituição encontra-se em período experimental de 14 dias (Trial ativo).
              </span>
            </div>
            {canManageTenants && (
              <button
                onClick={() => navigate(`/tenants/${tenant.id}/assinatura`)}
                className="text-[11px] font-bold text-sky-400 hover:underline inline-flex items-center gap-0.5 font-mono cursor-pointer"
              >
                Estender Trial ou Mudar Plano <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </Card>
      )}

      {isCancelled && (
        <Card variant="highlighted" padding="sm" className="border-rose-500/30 bg-rose-950/10 text-rose-200">
          <div className="flex items-center gap-2.5 text-xs font-sans">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Contrato Cancelado:</strong> O ambiente deste cliente foi desmantelado de forma definitiva e as bases de dados isoladas encontram-se arquivadas.
            </span>
          </div>
        </Card>
      )}

      {/* Horizontal Tabs Navigation */}
      <div className="border-b border-slate-900 dark:border-slate-200 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        {tabs.map((tab) => {
          const active = isTabActive(tab.path, tab.exact);
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-all select-none ${
                active
                  ? 'border-amber-500 text-amber-500 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-300 dark:hover:text-slate-800 hover:border-slate-800'
              }`}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      {/* Tabs Target Area rendering child routes */}
      <div className="min-h-[300px]">
        <Outlet />
      </div>

      {/* CONFIRM DIALOGS */}

      {/* Suspend Tenant Dialog */}
      <ConfirmDialog
        open={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        onConfirm={handleSuspend}
        title={`Suspender ${tenant.nome}`}
        description="Esta ação bloqueia o acesso de todos os colaboradores, alunos e utilizadores administrativos do cliente ao software. O faturamento mensal continuará a correr."
        confirmLabel="Suspender Serviço"
        variant="warning"
        motivo={suspendReason}
        onMotivoChange={setSuspendReason}
        motivoLabel="Motivo da suspensão"
        motivoObrigatorio
        motivoPlaceholder="Ex.: pendência por liquidar. Fica registado na auditoria."
        consequences={[
          { label: 'Estado do Serviço', value: 'Bloqueado (Suspenso)' },
          { label: 'Utilizadores Impactados', value: 'Todos os utilizadores' },
          { label: 'Faturamento', value: 'Mantém-se ativo' }
        ]}
        requireTyping={undefined}
      />

      {/* Reactivate Tenant Dialog */}
      <ConfirmDialog
        open={showReactivateModal}
        onClose={() => setShowReactivateModal(false)}
        onConfirm={handleReactivate}
        title={`Reativar ${tenant.nome}`}
        description="Esta ação restabelece o acesso imediato de todos os utilizadores ao ambiente operacional. Todos os serviços serão re-inicializados na BD correspondente."
        confirmLabel="Reativar Serviço"
        variant="default"
      />

      {/* Cancel Tenant Dialog */}
      <ConfirmDialog
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title={`CANCELAR DEFINITIVAMENTE ${tenant.nome}`}
        description="Esta ação desliga de forma definitiva a base de dados de produção do cliente. Todos os dados são congelados e o faturamento será suspenso de imediato. ESTA AÇÃO É IRREVERSÍVEL!"
        confirmLabel="Confirmar Cancelamento Definitivo"
        variant="danger"
        consequences={[
          { label: 'Estado do Contrato', value: 'Cancelado (Encerrado)' },
          { label: 'Base de Dados Física', value: 'Arquivada e Separada' },
          { label: 'Controlo Fiscal', value: 'Envio de SAF-T final' }
        ]}
        requireTyping={tenant.nome}
      />

      {/* Delete Tenant Dialog (Full CRUD option) */}
      <ConfirmDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={`ELIMINAR CLIENTE ${tenant.nome.toUpperCase()}`}
        description="Esta ação removerá completamente o registo deste cliente da base de dados física do Control Plane MaelG Systems. Todas as subscrições, pagamentos associados e históricos serão eliminados permanentemente. ESTA AÇÃO É ABSOLUTAMENTE IRREVERSÍVEL!"
        confirmLabel="Eliminar Definitivamente"
        variant="danger"
        consequences={[
          { label: 'Operação CRUD', value: 'DELETE (Física)' },
          { label: 'Dados de Subscrição', value: 'Removidos permanentemente' },
          { label: 'Histórico de Faturas', value: 'Eliminado da Base Local' }
        ]}
        requireTyping={tenant.nome}
      />
    </div>
  );
}
export default TenantLayout;
