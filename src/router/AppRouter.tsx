import { Navigate, Route, Routes } from 'react-router-dom';
import { PATHS } from './paths';
import { BackofficeLayout } from '../components/layout/BackofficeLayout';

// Pages list
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { TenantsListPage } from '../pages/tenants/TenantsListPage';
import { CreateTenantPage } from '../pages/tenants/CreateTenantPage';
import { TenantLayout } from '../pages/tenants/TenantLayout';
import { TenantPerfil } from '../pages/tenants/TenantPerfil';
import { TenantSubscriptionPage } from '../pages/tenants/TenantAssinatura';
import { TenantBillingPage } from '../pages/tenants/TenantFaturacao';
import { TenantAuditPage } from '../pages/tenants/TenantAuditoria';
import { TenantMaelGestPage } from '../pages/tenants/TenantMaelGest';

import { ProductsListPage } from '../pages/products/ProductsListPage';
import { ProductIntegrationPage } from '../pages/products/ProductIntegrationPage';

import { PlansListPage } from '../pages/plans/PlansListPage';
import { PaymentsListPage } from '../pages/payments/PaymentsListPage';
import { AuditListPage } from '../pages/audit/AuditListPage';
import { SuperAdminsListPage } from '../pages/superadmins/SuperAdminsListPage';
import { RbacMatrixPage } from '../pages/superadmins/RbacMatrixPage';
import { PlatformSettingsPage } from '../pages/settings/PlatformSettingsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';

/**
 * Router principal da aplicação MaelG Backoffice.
 */
export function AppRouter() {
  return (
    <Routes>
      {/* Redirecionamento da raiz para o dashboard */}
      <Route index element={<Navigate to={PATHS.dashboard} replace />} />

      {/* Rotas que partilham o layout do backoffice */}
      <Route element={<BackofficeLayout />}>
        <Route path={PATHS.dashboard} element={<DashboardPage />} />
        
        {/* Tenants / Clientes */}
        <Route path={PATHS.tenants.list} element={<TenantsListPage />} />
        <Route path={PATHS.tenants.create} element={<CreateTenantPage />} />
        
        {/* Tenant Detail sub-tabs */}
        <Route path="/tenants/:id" element={<TenantLayout />}>
          <Route index element={<TenantPerfil />} />
          <Route path="assinatura" element={<TenantSubscriptionPage />} />
          <Route path="faturacao" element={<TenantBillingPage />} />
          <Route path="auditoria" element={<TenantAuditPage />} />
          <Route path="maelgest" element={<TenantMaelGestPage />} />
        </Route>

        {/* Produtos */}
        <Route path={PATHS.products.list} element={<ProductsListPage />} />
        <Route path="/produtos/:slug/integracao" element={<ProductIntegrationPage />} />

        {/* Planos */}
        <Route path={PATHS.plans.list} element={<PlansListPage />} />

        {/* Pagamentos */}
        <Route path={PATHS.payments.list} element={<PaymentsListPage />} />

        {/* Auditoria */}
        <Route path={PATHS.audit.list} element={<AuditListPage />} />

        {/* Super Admins */}
        <Route path={PATHS.superadmins.list} element={<SuperAdminsListPage />} />
        <Route path={PATHS.superadmins.rbacMatrix} element={<RbacMatrixPage />} />

        {/* Configurações */}
        <Route path={PATHS.settings.root} element={<PlatformSettingsPage />} />

        {/* Relatórios */}
        <Route path={PATHS.reports} element={<ReportsPage />} />
      </Route>

      {/* 404 - Página não encontrada */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-extrabold text-white font-mono">404</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          A página que procura não existe ou foi movida para outro endereço.
        </p>
        <a
          href={PATHS.dashboard}
          className="inline-block mt-5 text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 text-white rounded-lg transition-colors"
        >
          ← Voltar ao Painel Central
        </a>
      </div>
    </div>
  );
}
export default AppRouter;
