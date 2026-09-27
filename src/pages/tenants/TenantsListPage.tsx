import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { TenantListaCard } from './TenantListaCard';
import { PROVINCES_ANGOLA } from '../../utils/formatters';
import { Search, Plus, Filter, Users, X, MapPin } from 'lucide-react';
import { PATHS } from '../../router/paths';

export function TenantsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenants, products, plans, canManageTenants } = useBackoffice();

  // Get active filters from URL query params or fallback to local
  const querySearch = searchParams.get('q') || '';
  const queryProduct = searchParams.get('product') || 'all';
  const queryStatus = searchParams.get('status') || 'all';
  const queryProvince = searchParams.get('province') || 'all';

  const [searchTerm, setSearchTerm] = useState(querySearch);
  const [selectedProduct, setSelectedProduct] = useState(queryProduct);
  const [selectedStatus, setSelectedStatus] = useState(queryStatus);
  const [selectedProvince, setSelectedProvince] = useState(queryProvince);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Sync state changes with query params
  const updateParams = (key: string, val: string) => {
    const updated = new URLSearchParams(searchParams);
    if (val === 'all' || val === '') {
      updated.delete(key);
    } else {
      updated.set(key, val);
    }
    setSearchParams(updated);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    updateParams('q', term);
  };

  const handleProductChange = (prod: string) => {
    setSelectedProduct(prod);
    updateParams('product', prod);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    updateParams('status', status);
  };

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    updateParams('province', province);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedProduct('all');
    setSelectedStatus('all');
    setSelectedProvince('all');
    setSearchParams({});
    setIsMobileFiltersOpen(false);
  };

  // Filter computation
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nif.includes(searchTerm);
        
      const matchProduct = selectedProduct === 'all' || t.productSlug === selectedProduct;
      const matchStatus = selectedStatus === 'all' || t.status === selectedStatus;
      const matchProvince = selectedProvince === 'all' || t.province === selectedProvince;

      return matchSearch && matchProduct && matchStatus && matchProvince;
    });
  }, [tenants, searchTerm, selectedProduct, selectedStatus, selectedProvince]);

  const activeFiltersCount = [
    selectedProduct !== 'all',
    selectedStatus !== 'all',
    selectedProvince !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes (Tenants)"
        description="Gestão de ciclo de vida das instâncias provisionadas, planos associados e dados operacionais."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Clientes' }]}
        actions={
          canManageTenants && (
            <Button variant="primary" size="md" icon={Plus} onClick={() => navigate(PATHS.tenants.create)}>
              Novo Cliente
            </Button>
          )
        }
      />

      {/* Filter Toolbar Card */}
      <Card variant="default" padding="sm" className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Pesquise por Instituição, Código (TEN-...) ou NIF..."
            />
          </div>

          {/* Controls Trigger for Mobile and Inline Grid for Desktop */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Filter Panel */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              {/* Product selector */}
              <select
                value={selectedProduct}
                onChange={(e) => handleProductChange(e.target.value)}
                className="bg-slate-950 border border-slate-900 py-1.5 px-2.5 rounded-lg text-slate-300 focus:outline-none font-sans cursor-pointer text-xs"
              >
                <option value="all">Todos os Produtos</option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Status selector */}
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-slate-950 border border-slate-900 py-1.5 px-2.5 rounded-lg text-slate-300 focus:outline-none font-sans cursor-pointer text-xs"
              >
                <option value="all">Todos os Estados</option>
                <option value="active">Ativo</option>
                <option value="trial">Experimental (Trial)</option>
                <option value="suspended">Suspenso</option>
                <option value="cancelled">Cancelado</option>
              </select>

              {/* Province selector */}
              <select
                value={selectedProvince}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="bg-slate-950 border border-slate-900 py-1.5 px-2.5 rounded-lg text-slate-300 focus:outline-none font-sans cursor-pointer text-xs max-w-[150px]"
              >
                <option value="all">Todas Províncias</option>
                {PROVINCES_ANGOLA.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              className="md:hidden flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-slate-200 py-2 px-3 rounded-lg text-xs"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="bg-indigo-600 text-white font-mono text-[9px] px-1.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Clear Filters Button */}
            {(searchTerm || activeFiltersCount > 0) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-indigo-400 px-2 py-1 select-none font-mono transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Filters Summary line */}
        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
          <span>A mostrar {filteredTenants.length} de {tenants.length} clientes registados</span>
          {activeFiltersCount > 0 && (
            <span className="text-slate-400">
              Filtros ativos: {[
                selectedProduct !== 'all' ? `Produto: ${selectedProduct}` : null,
                selectedStatus !== 'all' ? `Estado: ${selectedStatus}` : null,
                selectedProvince !== 'all' ? `Província: ${selectedProvince}` : null,
              ].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </Card>

      {/* Main Listing Viewport */}
      {filteredTenants.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-slate-900/80 border border-slate-850/60 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-950 bg-slate-950/40 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 font-semibold">Instituição</th>
                  <th className="py-3 px-4 font-semibold">Plano Associado</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold">Província</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-950 text-xs">
                {filteredTenants.map((t) => {
                  const plan = plans.find((p) => p.slug === t.planSlug);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(PATHS.tenants.detail(t.id))}
                      className="hover:bg-slate-900/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 group-hover:text-white leading-normal">
                          {t.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          {t.code} · NIF: {t.nif}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-300">{plan?.name || t.planSlug}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 capitalize">Produto: {t.productSlug}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge domain="tenant" status={t.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>{t.province}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-indigo-400 font-semibold hover:text-indigo-300 text-xs inline-flex items-center gap-1 transition-colors">
                          Gerir
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid Layout */}
          <div className="block md:hidden space-y-3">
            {filteredTenants.map((t) => (
              <TenantListaCard
                key={t.id}
                tenant={t}
                plan={plans.find((p) => p.slug === t.planSlug)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          description={
            searchTerm || activeFiltersCount > 0
              ? 'Tente alterar os termos de pesquisa ou limpar os filtros para ver todos os clientes.'
              : 'Não existem clientes registados na base de dados.'
          }
          action={
            searchTerm || activeFiltersCount > 0
              ? { label: 'Limpar Filtros', onClick: handleResetFilters }
              : canManageTenants
              ? { label: 'Registar Primeiro Cliente', onClick: () => navigate(PATHS.tenants.create) }
              : undefined
          }
        />
      )}

      {/* Mobile Filters Drawer Bottom Sheet */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileFiltersOpen(false)} />
          <div className="relative w-full bg-slate-950 border-t border-slate-900 rounded-t-2xl p-5 shadow-2xl animate-slide-up flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Filtros de Clientes</h3>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="p-1 rounded bg-slate-900 border border-slate-850 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Produto</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 py-2 px-3 rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value="all">Todos os Produtos</option>
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Estado do Serviço</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 py-2 px-3 rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value="all">Todos os Estados</option>
                  <option value="active">Ativo</option>
                  <option value="trial">Experimental (Trial)</option>
                  <option value="suspended">Suspenso</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Province */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Província</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 py-2 px-3 rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value="all">Todas Províncias</option>
                  {PROVINCES_ANGOLA.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Limpar
              </button>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="flex-1 py-2 bg-indigo-600 rounded-lg text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TenantsListPage;
