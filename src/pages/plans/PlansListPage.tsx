import { useState } from 'react';
import { useBackoffice } from '../../context/BackofficeContext';
import type { Plan } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatAOA } from '../../utils/formatters';
import { Plus, Trash2, Edit, X } from 'lucide-react';

export function PlansListPage() {
  const { plans, products, addPlan, updatePlan, deletePlan, isSuperAdmin, theme } = useBackoffice();
  const [showInactive, setShowInactive] = useState(false);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    priceAoa: 0,
    produtoSlug: '',
    isActive: true,
    maxStudents: 0,
    maxUsers: 0,
    maxStorageGb: 0 });

  // Delete State
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      nome: '',
      codigo: '',
      priceAoa: 0,
      produtoSlug: products[0]?.slug || '',
      isActive: true,
      maxStudents: 0,
      maxUsers: 0,
      maxStorageGb: 0 });
    setIsOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      nome: plan.nome,
      codigo: plan.codigo,
      priceAoa: plan.priceAoa,
      produtoSlug: plan.produtoSlug,
      isActive: plan.isActive,
      maxStudents: plan.maxStudents,
      maxUsers: plan.maxUsers,
      maxStorageGb: plan.maxStorageGb });
    setIsOpen(true);
  };

  const handleDeleteClick = (slug: string) => {
    setDeleteSlug(slug);
  };

  const handleConfirmDelete = () => {
    if (deleteSlug) {
      deletePlan(deleteSlug);
      setDeleteSlug(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.codigo.trim()) return;

    const dataToSend = {
      produtoSlug: formData.produtoSlug,
      codigo: formData.codigo.trim(),
      nome: formData.nome.trim(),
      priceAoa: formData.priceAoa,
      maxStudents: formData.maxStudents,
      maxUsers: formData.maxUsers,
      maxStorageGb: formData.maxStorageGb,
      isActive: formData.isActive };

    if (editingPlan) {
      updatePlan(editingPlan.codigo, dataToSend);
    } else {
      addPlan(dataToSend);
    }
    setIsOpen(false);
  };

  // Filter plans
  const filteredPlans = plans.filter((p) => showInactive || p.isActive === true);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Planos & Tarifários"
        description="Configure os moldes comerciais das licenças, limites técnicos de alunos/volume fiscal e periodicidades."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Planos & Tarifários' }]}
        actions={
          isSuperAdmin ? (
            <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
              Criar Plano
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <Card variant="default" padding="sm" className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors select-none ${
              showInactive
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-slate-950 dark:bg-slate-100 border-slate-900 dark:border-slate-300 text-slate-500 hover:text-slate-300'
            }`}
          >
            {showInactive ? 'A mostrar todos os planos' : 'Ocultar Inativos'}
          </button>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {filteredPlans.length} Planos configurados
        </span>
      </Card>

      {/* Plan Grid with tabular comparative fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-slate-100">
        {filteredPlans.map((plan) => {
          const product = products.find((p) => p.slug === plan.produtoSlug);
          return (
            <Card key={plan.codigo} variant="default" padding="lg" className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white dark:text-slate-950 tracking-tight flex items-center gap-2">
                      {plan.nome}
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1 py-0.5 rounded">
                        /{plan.codigo}
                      </span>
                    </h3>
                    <span className="text-[10px] text-amber-500 font-mono uppercase tracking-wide">
                      Módulo: {product?.name || plan.produtoSlug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge domain="plan" status={plan.isActive ? 'active' : 'inactive'} />
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(plan)}
                          className="p-1 rounded bg-[#2B3139] hover:bg-[#353C45] text-amber-400 hover:text-amber-300 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(plan.codigo)}
                          className="p-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{''}</p>

                {/* Key limits compare area */}
                <div className="space-y-2 bg-slate-950/60 dark:bg-slate-50/60 p-3 rounded-lg border border-slate-900/60 dark:border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block border-b border-slate-900 dark:border-slate-200 pb-1.5 mb-1.5">
                    Limites e Parâmetros Fiscais
                  </span>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Alunos:</span>
                      <strong className="text-slate-300 dark:text-slate-800">
                        {plan.maxStudents === 0 ? 'Ilimitado' : plan.maxStudents}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Utilizadores:</span>
                      <strong className="text-slate-300 dark:text-slate-800">
                        {plan.maxUsers === 0 ? 'Ilimitado' : plan.maxUsers}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Armazenamento:</span>
                      <strong className="text-slate-300 dark:text-slate-800">
                        {plan.maxStorageGb === 0 ? 'Ilimitado' : `${plan.maxStorageGb} GB`}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900 dark:border-slate-200 flex justify-between items-baseline shrink-0">
                <span className="text-[10px] text-slate-500 font-mono">Taxa Recorrente</span>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-white dark:text-slate-950 leading-none">
                    {formatAOA(plan.priceAoa)}
                  </span>
                  <span className="text-[9px] text-slate-500 block font-mono capitalize">
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE/EDIT MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-lg p-6 rounded-2xl shadow-xl border overflow-y-auto max-h-[90vh] ${
            theme === 'dark' ? 'bg-[#1E2329] border-[#2B3139] text-[#EAECEF]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 dark:border-slate-100">
              <h2 className="text-base font-bold text-white dark:text-slate-900">
                {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Nome do Plano</label>
                  <input
                    type="text"
                    required
                    placeholder="MaelRH Pro"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Slug de Identificação</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    placeholder="maelrh-pro"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().trim() })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Módulo SaaS Associado</label>
                  <select
                    value={formData.produtoSlug}
                    onChange={(e) => setFormData({ ...formData, produtoSlug: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    {products.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Taxa Mensal (em AOA)</label>
                  <input
                    type="number"
                    required
                    placeholder="150000"
                    value={formData.priceAoa}
                    onChange={(e) => setFormData({ ...formData, priceAoa: Number(e.target.value) })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Estado comercial</label>
                    <select
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                      className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                    >
                      <option value="active">Disponível (Ativo)</option>
                      <option value="inactive">Oculto (Inativo)</option>
                    </select>
                  </div>
                </div>

              {/* LIMITES: as tres colunas que a tabela plano tem */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3 dark:border-slate-200 dark:bg-slate-50">
                <span className="font-bold text-amber-500 uppercase tracking-wider text-[10px] block">
                  Limites do Plano
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Alunos
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                      className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900"
                    />
                    <span className="text-[9px] text-slate-600">0 = ilimitado</span>
                  </div>
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Utilizadores
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                      className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900"
                    />
                    <span className="text-[9px] text-slate-600">0 = ilimitado</span>
                  </div>
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Armazenamento (GB)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.maxStorageGb}
                      onChange={(e) => setFormData({ ...formData, maxStorageGb: Number(e.target.value) })}
                      className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900"
                    />
                    <span className="text-[9px] text-slate-600">0 = ilimitado</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 dark:border-slate-100">
                <Button variant="ghost" onClick={() => setIsOpen(false)} type="button">
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  {editingPlan ? 'Guardar Alterações' : 'Criar Plano'}
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
              Tem a certeza de que deseja eliminar o plano <strong className="text-rose-400">{deleteSlug}</strong>?
              Esta ação removerá permanentemente as configurações fiscais deste tarifário.
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
export default PlansListPage;
