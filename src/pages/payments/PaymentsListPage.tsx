import { useState } from 'react';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatAOA, formatDate, getPaymentMethodLabel } from '../../utils/formatters';
import { Search, Plus, CreditCard, X, Trash2, FileText } from 'lucide-react';

export function PaymentsListPage() {
  const { payments, tenants, canManagePayments, registerPayment, deletePayment, theme } = useBackoffice();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Form states
  const [selectedTenantId, setSelectedPlanTenantId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'multicaixa_referencia' | 'cash' | 'check'>('bank_transfer');

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
  };

  const handleOpenCreate = () => {
    setSelectedPlanTenantId(null);
    setPaymentAmount(0);
    setPaymentNotes('');
    setPaymentReference('');
    setPaymentMethod('bank_transfer');
    setShowRegisterModal(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      alert('Selecione uma instituição.');
      return;
    }

    // Um pagamento e' um recibo: cria-se, nao se edita. Quem emite o recibo e'
    // a plataforma (RC-ano/sequencia) e quem calcula a proxima data de
    // facturacao e' a assinatura. O status nao vem no pedido.
    registerPayment({
      tenantId: selectedTenantId,
      amountAoa: Number(paymentAmount),
      paymentMethod,
      reference: paymentReference || undefined,
      notas: paymentNotes || undefined });
    setShowRegisterModal(false);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deletePayment(deleteId);
      setDeleteId(null);
    }
  };

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      (p.tenantNome ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Pagamentos & Caixa"
        description="Faturamento consolidado de mensalidades, faturas pendentes, controlo de reembolsos e recibos fiscais."
        breadcrumbs={[{ label: 'MaelG Systems' }, { label: 'Pagamentos' }]}
        actions={
          canManagePayments && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={handleOpenCreate}
            >
              Emitir Nova Fatura
            </Button>
          )
        }
      />

      {/* Filter toolbar */}
      <Card variant="default" padding="sm" className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 dark:bg-slate-50 border border-slate-900 dark:border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs text-white dark:text-slate-950 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
              placeholder="Pesquise por cliente ou fatura (FT-...)"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 dark:bg-slate-100 border border-slate-900 dark:border-slate-300 py-1.5 px-2.5 rounded-lg text-slate-300 dark:text-slate-900 focus:outline-none font-sans cursor-pointer text-xs"
            >
              <option value="all">Todos os Estados</option>
              <option value="paid">Liquidado</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhado</option>
              <option value="refunded">Reembolsado</option>
            </select>

            {(searchTerm || selectedStatus !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-amber-500 px-2 py-1 font-mono transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Listing Viewport */}
      {filteredPayments.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#1E2329] dark:bg-white border border-[#2B3139] dark:border-slate-200 rounded-xl overflow-hidden text-slate-100 dark:text-slate-900">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#2B3139] dark:border-slate-200 bg-slate-950/40 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 font-semibold">Cliente / Instituição</th>
                  <th className="py-3 px-4 font-semibold">Documento</th>
                  <th className="py-3 px-4 font-semibold">Valor Facturado</th>
                  <th className="py-3 px-4 font-semibold">Data Limite / Pago Em</th>
                  <th className="py-3 px-4 font-semibold">Método</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 dark:divide-slate-200 text-xs">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <strong className="text-slate-100 dark:text-slate-900 font-semibold">{p.tenantNome}</strong>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-400">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white dark:text-slate-900">
                      {formatAOA(p.amountAoa)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {p.status === 'paid' ? (
                        <span>Pago a {formatDate(p.paidAt)}</span>
                      ) : (
                        <span className={p.status === 'pending' ? 'text-amber-500 font-semibold' : 'text-slate-500'}>
                          Vence a {formatDate(p.dueDate)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {p.paymentMethod ? getPaymentMethodLabel(p.paymentMethod) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge domain="payment" status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canManagePayments ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDeleteClick(p.id)}
                            className="p-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : p.status === 'paid' ? (
                        <span
                          className="text-slate-500 inline-flex items-center gap-1 text-xs"
                          title={p.reference ? `Referencia: ${p.reference}` : undefined}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {p.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden space-y-3">
            {filteredPayments.map((p) => (
              <Card key={p.id} variant="default" padding="md" className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white dark:text-slate-900 truncate max-w-[160px]">{p.tenantNome}</h4>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge domain="payment" status={p.status} />
                  </div>
                </div>
                <div className="flex justify-between items-baseline font-mono text-xs">
                  <span className="text-slate-500 text-[10px]">Factura / Valor:</span>
                  <span className="text-slate-200 dark:text-slate-800">
                    {p.receiptNumber} · <strong className="text-white dark:text-slate-900 font-bold">{formatAOA(p.amountAoa)}</strong>
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex justify-between items-center">
                  <span>Método: {p.paymentMethod ? getPaymentMethodLabel(p.paymentMethod) : '-'}</span>
                  <span>
                    {p.status === 'paid' ? `Pago: ${formatDate(p.paidAt)}` : `Vence: ${formatDate(p.dueDate)}`}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="Nenhum registo de pagamento"
          description="Nenhuma fatura comercial correspondente aos filtros de pesquisa foi localizada no sistema."
          action={searchTerm || selectedStatus !== 'all' ? { label: 'Limpar Filtros', onClick: handleResetFilters } : undefined}
        />
      )}

      {/* NEW/EDIT INVOICE MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-2xl shadow-xl border overflow-y-auto max-h-[90vh] ${
            theme === 'dark' ? 'bg-[#1E2329] border-[#2B3139] text-[#EAECEF]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold text-white dark:text-slate-950 uppercase tracking-wider font-mono">
                Registar Pagamento
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="p-1 rounded bg-slate-900 dark:bg-slate-100 text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Cliente / Instituição *</label>
                <select
                  value={selectedTenantId ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedPlanTenantId(id);
                    // O valor por defecto e' o plano que o tenant tem: nao se
                    // adivinha o preco a partir do nome do plano.
                    const tenant = tenants.find((t) => t.id === id);
                    setPaymentAmount(tenant?.planoPrecoAoa ?? 0);
                  }}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-850 dark:border-slate-300 py-2 px-3 rounded-lg text-slate-300 dark:text-slate-900 focus:outline-none"
                  required
                >
                  {tenants.filter(t => t.status !== 'cancelled').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Valor da Fatura (AOA) *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-850 dark:border-slate-300 rounded-lg py-2 px-3 text-white dark:text-slate-900 focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold">Refer&ecirc;ncia (Multicaixa / Dep&oacute;sito)</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-850 dark:border-slate-300 py-2 px-3 text-white dark:text-slate-900 focus:outline-none font-mono"
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold">Método *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-855 dark:border-slate-300 py-2 px-3 rounded-lg text-slate-300 dark:text-slate-900 focus:outline-none"
                    required
                  >
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="multicaixa_referencia">Referência Multicaixa</option>
                    <option value="cash">Numerário</option>
                    <option value="check">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Observações Complementares</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-850 dark:border-slate-300 rounded-lg p-2.5 text-slate-300 dark:text-slate-900 focus:outline-none h-20 placeholder-slate-600"
                  placeholder="Escreva anotações sobre este faturamento..."
                />
              </div>

              <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-800 dark:border-slate-100">
                <Button size="sm" type="button" onClick={() => setShowRegisterModal(false)}>Cancelar</Button>
                <Button size="sm" variant="primary" type="submit">
                  Registar
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
            <h3 className="text-base font-bold text-white dark:text-slate-900">Confirmar Eliminação</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
              Deseja realmente remover esta fatura e todos os seus registos de pagamento?
              Esta ação é permanente e irrevogável no Control Plane.
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
export default PaymentsListPage;
