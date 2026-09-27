import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatAOA } from '../../utils/formatters';
import { GraduationCap, Activity, ChevronRight, Network, Plus, Trash2, Edit, Globe, X } from 'lucide-react';

export function ProductsListPage() {
  const navigate = useNavigate();
  const { products, tenants, addProduct, updateProduct, deleteProduct, isSuperAdmin, theme } = useBackoffice();
  
  // State for Create/Edit Modal
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  // Espelha as colunas de `produto`, mais a credencial de acesso. A credencial
  // so se escreve ao criar: depois de criada, nao ha endpoint que a mude.
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    version: '',
    apiUrl: '',
    produtoChave: '',
    produtoSegredo: '',
    status: 'active' as 'active' | 'inactive' | 'deprecated' });

  // O primeiro plano do produto. A API nao aceita um produto sem nenhum.
  const [plano, setPlano] = useState({
    codigo: '',
    nome: '',
    priceAoa: '',
    maxStudents: '0',
    maxUsers: '0',
    maxStorageGb: '0' });

  // State for Delete Confirmation
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    // A credencial nao e gerada aqui: o operador escreve-a. Um segredo criado
    // no browser e um segredo que ja passou pelo browser. A URL do produto
    // tambem se escreve: um `localhost` pre-preenchido ia para producao sem
    // ninguem dar por isso.
    setFormData({
      name: '',
      slug: '',
      description: '',
      version: '',
      apiUrl: '',
      produtoChave: '',
      produtoSegredo: '',
      status: 'active' });
    setPlano({ codigo: '', nome: '', priceAoa: '', maxStudents: '0', maxUsers: '0', maxStorageGb: '0' });
    setIsOpen(true);
  };

  const handleOpenEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card navigation
    setEditingProduct(p);
    // a credencial nao volta do servidor: nao ha endpoint que a devolva
    setFormData({
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      version: p.version || '',
      apiUrl: p.apiUrl || '',
      produtoChave: '',
      produtoSegredo: '',
      status: p.status || 'active' });
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
      // criar: a credencial e o primeiro plano sao obrigatorios
      if (!formData.produtoChave || !formData.produtoSegredo || !formData.apiUrl) return;
      if (!plano.codigo || !plano.nome || !plano.priceAoa) return;
      addProduct({
        ...formData,
        primeiroPlano: {
          codigo: plano.codigo,
          nome: plano.nome,
          priceAoa: Number(plano.priceAoa),
          maxStudents: Number(plano.maxStudents),
          maxUsers: Number(plano.maxUsers),
          maxStorageGb: Number(plano.maxStorageGb),
          isActive: true } });
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
          const doProduto = tenants.filter((t) => t.produtoSlug === p.slug);
          const count = doProduto.filter((t) => t.status === 'active').length;
          // Receita real: soma das assinaturas activas deste produto. Vem dos
          // tenants que ja temos em memoria, nao de um campo guardado no produto.
          const mrr = doProduto
            .filter((t) => t.status === 'active')
            .reduce((total, t) => total + (t.planoPrecoAoa ?? 0), 0);
          
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
                  <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">{''}</p>
                </div>

                {/* Onde a API do produto vive, e que versao esta em producao */}
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 dark:bg-slate-950/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-mono uppercase tracking-wider">
                    <Globe className="w-3.5 h-3.5" />
                    API do Produto
                  </div>
                  <div className="text-xs font-mono text-slate-200 break-all">
                    {p.apiUrl || 'Sem URL'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    versão {p.version || '—'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px] border-t border-slate-900/60 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Clientes Ativos:</span>
                    <strong className="text-slate-200 font-semibold">{count}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Receita MRR:</span>
                    <strong className="text-emerald-400 font-semibold">{formatAOA(mrr)}</strong>
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
                    placeholder="http://localhost:8100"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Chave do Produto</label>
                  <input
                    type="text"
                    required={!editingProduct}
                    placeholder="prod-maelgest-local"
                    value={formData.produtoChave}
                    onChange={(e) => setFormData({ ...formData, produtoChave: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Segredo (mín. 16 caracteres)</label>
                  <input
                    type="password"
                    required={!editingProduct}
                    placeholder={editingProduct ? 'não é possível alterar depois' : 'mínimo 16 caracteres'}
                    value={formData.produtoSegredo}
                    onChange={(e) => setFormData({ ...formData, produtoSegredo: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">
                    Fica cifrado em AES-256-GCM na base. Esta é a mesma credencial
                    que o produto usa para nos chamar.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Versão</label>
                  <input
                    type="text"
                    placeholder="1.0.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
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
                    <option value="inactive">Inativo</option>
                    <option value="deprecated">Descontinuado</option>
                  </select>
                </div>
              </div>

              {/* O primeiro plano. A API nao aceita um produto sem planos. */}
              {!editingProduct && (
                <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/40 space-y-3">
                  <h4 className="font-bold text-slate-300">Primeiro plano</h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Um produto sem plano nao e contratavel. Os restantes planos
                    criam-se depois, em Planos.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Código</label>
                      <input
                        type="text"
                        required
                        placeholder="basico"
                        value={plano.codigo}
                        onChange={(e) => setPlano({ ...plano, codigo: e.target.value })}
                        className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Nome</label>
                      <input
                        type="text"
                        required
                        placeholder="Básico"
                        value={plano.nome}
                        onChange={(e) => setPlano({ ...plano, nome: e.target.value })}
                        className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Preço (AOA)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={plano.priceAoa}
                        onChange={(e) => setPlano({ ...plano, priceAoa: e.target.value })}
                        className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    {([
                      ['maxStudents', 'Alunos'],
                      ['maxUsers', 'Utilizadores'],
                      ['maxStorageGb', 'Armazen. (GB)'],
                    ] as const).map(([campo, rotulo]) => (
                      <div key={campo}>
                        <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">{rotulo}</label>
                        <input
                          type="number"
                          min="0"
                          value={plano[campo]}
                          onChange={(e) => setPlano({ ...plano, [campo]: e.target.value })}
                          className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    0 = ilimitado.
                  </p>
                </div>
              )}

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
