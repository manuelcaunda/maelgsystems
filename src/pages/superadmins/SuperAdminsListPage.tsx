import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/formatters';
import { ShieldCheck, Sparkles, Plus, Trash2, Edit, X } from 'lucide-react';
import { PATHS } from '../../router/paths';

export function SuperAdminsListPage() {
  const navigate = useNavigate();
  const { operators, addOperator, updateOperator, deleteOperator, isSuperAdmin, theme } = useBackoffice();

  // State for Add/Edit Modal
  const [isOpen, setIsOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'support_admin' as 'super_admin' | 'finance_admin' | 'support_admin',
    active: true
  });

  // State for Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleOpenCreate = () => {
    setEditingOperator(null);
    setFormData({
      name: '',
      email: '',
      role: 'support_admin',
        active: true
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (op: any) => {
    setEditingOperator(op);
    setFormData({
      name: op.name,
      email: op.email,
      role: op.role,
      active: op.active !== undefined ? op.active : true
    });
    setIsOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteOperator(deleteId);
      setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingOperator) {
      updateOperator(editingOperator.id, formData);
    } else {
      addOperator(formData);
    }
    setIsOpen(false);
  };

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHeader
        title="Equipa & Permissões"
        description="Gestão de utilizadores administrativos, monitorização de acessos e atribuição de funções (RBAC)."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Equipa' }]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={ShieldCheck}
              onClick={() => navigate(PATHS.superadmins.rbacMatrix)}
            >
              Matriz de Permissões
            </Button>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={handleOpenCreate}
              >
                Novo Operador
              </Button>
            )}
          </div>
        }
      />

      {/* Grid of Operators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {operators.map((op) => {
          let roleLabel = 'Super Admin';
          let borderHighlight = 'border-slate-850';
          let roleStyle = 'text-amber-500 bg-amber-500/10 border border-amber-500/15';

          if (op.role === 'finance_admin') {
            roleLabel = 'Financeiro';
            roleStyle = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15';
          } else if (op.role === 'support_admin') {
            roleLabel = 'Suporte';
            roleStyle = 'text-sky-400 bg-sky-500/10 border border-sky-500/15';
          }

          return (
            <Card
              key={op.id}
              variant="default"
              padding="lg"
              className={`hover:border-amber-500/40 hover:shadow-lg transition-all ${borderHighlight}`}
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src={''}
                    alt={op.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border border-slate-800"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white dark:text-slate-900 truncate">{op.name}</h3>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">{op.email}</span>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(op)}
                      className="p-1 rounded bg-[#2B3139] hover:bg-[#353C45] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Editar Operador"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(op.id)}
                      className="p-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Remover Operador"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nível de Função:</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono uppercase tracking-wide ${roleStyle}`}>
                    {roleLabel}
                  </span>
                </div>

                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-500">Último Acesso:</span>
                  <strong className="text-slate-300 dark:text-slate-700 text-[11px] font-medium">
                    {formatDateTime(op.lastAccess)}
                  </strong>
                </div>

                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-500">Estado de Acesso:</span>
                  <span className={`flex items-center gap-1.5 ${op.active !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`h-2 w-2 rounded-full ${op.active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {op.active !== false ? 'Ativo' : 'Bloqueado'}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card variant="muted" padding="md" className="flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="text-xs text-slate-400 leading-relaxed font-sans">
          <p className="font-semibold text-slate-300 dark:text-slate-800">Auditoria de Acessos Coordenada</p>
          <p className="mt-1">
            Cada sessão de operador iniciada no Control Plane MaelG é monitorizada por logs de transação que associam de forma irreversível o IP de rede, timestamp e antes/depois de qualquer modificação de planos ou liquidações.
          </p>
        </div>
      </Card>

      {/* CREATE/EDIT OPERATOR MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-2xl shadow-xl border overflow-y-auto max-h-[90vh] ${
            theme === 'dark' ? 'bg-[#1E2329] border-[#2B3139] text-[#EAECEF]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 dark:border-slate-100 font-sans">
              <h2 className="text-base font-bold text-white dark:text-slate-900">
                {editingOperator ? 'Editar Operador' : 'Adicionar Operador'}
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do operador"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@maelg.ao"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Nível de Função (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="super_admin">Super Admin (Acesso Total)</option>
                  <option value="finance_admin">Financeiro (AGT & Faturação)</option>
                  <option value="support_admin">Suporte Técnico (Somente Leitura + Impersonate)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active-checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="accent-amber-500"
                />
                <label htmlFor="active-checkbox" className="text-slate-300 dark:text-slate-700 font-medium">Permitir acesso operacional ativo</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 dark:border-slate-100">
                <Button variant="ghost" onClick={() => setIsOpen(false)} type="button">
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  {editingOperator ? 'Guardar Alterações' : 'Criar Operador'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-2xl shadow-xl border ${
            theme === 'dark' ? 'bg-[#1E2329] border-[#2B3139]' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-base font-bold text-white dark:text-slate-900">Confirmar Remoção</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
              Deseja realmente remover este operador da equipa do MaelG Systems?
              Ele perderá o acesso a todas as ferramentas do painel e as permissões de monitorização.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SuperAdminsListPage;
