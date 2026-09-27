import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatAOA } from '../../utils/formatters';
import {
  GraduationCap,
  Users,
  Terminal,
  Activity,
  ChevronRight,
  TrendingUp,
  KeyRound,
  Network,
  Plus,
  Trash2,
  Edit,
  User,
  Mail,
  Phone,
  Link,
  Shield,
  FileCode,
  Sparkles,
  X
} from 'lucide-react';

export function ProductsListPage() {
  const navigate = useNavigate();
  const { products, tenants, addProduct, updateProduct, deleteProduct, isSuperAdmin, theme } = useBackoffice();
  
  // State for Create/Edit Modal
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    iconName: 'Terminal',
    apiEndpoint: '',
    token: '',
    status: 'active' as 'active' | 'beta' | 'inactive',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
  });

  // State for Delete Confirmation
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      iconName: 'Terminal',
      apiEndpoint: 'https://api.maelg.ao/internal/v1',
      token: `tok_${Math.random().toString(36).substring(2, 12)}`,
      status: 'active',
      adminName: '',
      adminEmail: '',
      adminPhone: '',
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card navigation
    setEditingProduct(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      description: p.description,
      iconName: p.iconName || 'Terminal',
      apiEndpoint: p.apiEndpoint || '',
      token: p.token || '',
      status: p.status || 'active',
      adminName: p.adminName || '',
      adminEmail: p.adminEmail || '',
      adminPhone: p.adminPhone || '',
    });
    setIsOpen(true);
  };

  const handleDeleteClick = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent navigation
    setDeleteSlug(slug);
  };

  const handleConfirmDelete = () => {
    if (deleteSlug) {
      deleteProduct(deleteSlug);
      setDeleteSlug(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) return;

    if (editingProduct) {
      updateProduct(editingProduct.slug, formData);
    } else {
      addProduct(formData);
    }
    setIsOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Módulos & Produtos"
        description="Gestão de catálogos de software, integradores de bases de dados (Data Planes) e tokens de segurança de APIs internas."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Módulos & Produtos' }]}
        actions={
          isSuperAdmin ? (
            <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
              Criar Produto
            </Button>
          ) : undefined
        }
      />

      {/* Main Grid with products cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {products.map((p) => {
          // Count active tenants in this product
          const count = tenants.filter(t => t.productSlug === p.slug && t.status === 'active').length;
          
          return (
            <Card
              key={p.slug}
              variant="default"
              padding="lg"
              className="hover:border-amber-500/40 hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              onClick={() => navigate(`/produtos/${p.slug}/integracao`)}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge domain="plan" status={p.status} />
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleOpenEdit(p, e)}
                          className="p-1 rounded bg-[#2B3139] hover:bg-[#353C45] text-amber-400 hover:text-amber-300 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(p.slug, e)}
                          className="p-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white dark:text-slate-100 tracking-tight group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    {p.name}
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                      /{p.slug}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">{p.description}</p>
                </div>

                {/* Associated Product Administrator */}
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 dark:bg-slate-950/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-mono uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" />
                    Administrador Técnico
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    {p.adminName || 'Não atribuído'}
                  </div>
                  {(p.adminEmail || p.adminPhone) && (
                    <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 font-mono">
                      {p.adminEmail && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {p.adminEmail}
                        </span>
                      )}
                      {p.adminPhone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {p.adminPhone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px] border-t border-slate-900/60 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Clientes Ativos:</span>
                    <strong className="text-slate-200 font-semibold">{count}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Receita MRR:</span>
                    <strong className="text-emerald-400 font-semibold">{formatAOA(p.mrr)}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-900/60 dark:border-slate-800 flex items-center justify-between text-xs text-amber-400 font-semibold group-hover:text-amber-300">
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Network className="w-3.5 h-3.5" />
                  Consola de API e Logs
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Info card resilience */}
      <Card variant="muted" padding="md">
        <div className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
          <Activity className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-300">Monitor de Barramento e Disponibilidade Assíncrona</p>
            <p className="mt-1">
              Caso um dos produtos sofra uma quebra temporária (Data Plane offline), o Control Plane MaelG garante a resiliência das ações de faturamento agendadas e retoma as sagas pendentes assim que a ligação API for restabelecida, graças ao sistema de idempotência interno.
            </p>
          </div>
        </div>
      </Card>

      {/* CREATE/EDIT MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-lg p-6 rounded-2xl shadow-xl border overflow-y-auto max-h-[90vh] ${
            theme === 'dark' ? 'bg-[#1E2329] border-[#2B3139] text-[#EAECEF]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 dark:border-slate-100">
              <h2 className="text-base font-bold text-white dark:text-slate-900">
                {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="MaelRH"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Slug de Identificação</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    placeholder="maelrh"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Descrição Comercial</label>
                <textarea
                  required
                  placeholder="SaaS de Processamento de Salários, Segurança Social e IRT..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Endpoint de API de Integração</label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.maelrh.ao/internal/v1"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Chave API de Segurança</label>
                  <input
                    type="text"
                    required
                    placeholder="mrh_beta_tok_..."
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Ícone Lucide</label>
                  <input
                    type="text"
                    required
                    placeholder="Users"
                    value={formData.iconName}
                    onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Estado do Catálogo</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">Ativo (Produção)</option>
                    <option value="beta">Fase Beta</option>
                    <option value="inactive">Inativo / Descontinuado</option>
                  </select>
                </div>
              </div>

              {/* PRODUCT ADMINISTRATOR CARD CREATION */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <h4 className="font-bold text-amber-500 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Administrador Técnico Associado
                </h4>
                <p className="text-[10px] text-slate-400">
                  Defina o responsável de engenharia por este Data Plane do produto no ecossistema MaelG Systems.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-0.5 text-[10px] font-mono uppercase">Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Sr. Yuri Francisco"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-0.5 text-[10px] font-mono uppercase">E-mail Profissional</label>
                      <input
                        type="email"
                        required
                        placeholder="y.francisco@maelg.ao"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-0.5 text-[10px] font-mono uppercase">Contacto Telefónico</label>
                      <input
                        type="text"
                        required
                        placeholder="+244 934 555 666"
                        value={formData.adminPhone}
                        onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                        className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 dark:border-slate-100">
                <Button variant="ghost" onClick={() => setIsOpen(false)} type="button">
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  {editingProduct ? 'Guardar Alterações' : 'Criar Produto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteSlug && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-2xl shadow-xl border ${
            theme === 'dark' ? 'bg-[#1E2329] border-[#2B3139]' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-base font-bold text-white dark:text-slate-900">Confirmar Eliminação</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
              Tem a certeza de que deseja remover o produto <strong className="text-rose-400">{deleteSlug}</strong> do catálogo do MaelG Systems?
              Esta ação é permanente e afetará as configurações de provisionamento associadas.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setDeleteSlug(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ProductsListPage;
