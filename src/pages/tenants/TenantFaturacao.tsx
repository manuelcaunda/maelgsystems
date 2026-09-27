import { useState } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useBackoffice } from '../../context/BackofficeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatAOA, formatDate, getPaymentMethodLabel } from '../../utils/formatters';
import {
  CreditCard,
  Plus,
  History,
  FileCheck2,
  Calendar,
  DollarSign,
  Download,
  CheckCircle2,
  X
} from 'lucide-react';

export function TenantBillingPage() {
  const tenant = useTenant();
  const {
    payments,
    canManagePayments,
    registerPayment,
  } = useBackoffice();

  const [showPayModal, setShowPayModal] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'multicaixa_referencia' | 'cash' | 'check'>('bank_transfer');
  const [paymentNotes, setPaymentNotes] = useState('');

  if (!tenant) return null;

  // Filter payments of this tenant
  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
  const pendingPayments = tenantPayments.filter((p) => p.status === 'pending');

  const handleOpenPayModal = (id: string) => {
    setActivePaymentId(id);
    setPaymentMethod('bank_transfer');
    setPaymentNotes('');
    setShowPayModal(true);
  };

  const handleClearInvoice = () => {
    const payment = payments.find(p => p.id === activePaymentId);
    if (payment) {
      registerPayment({
        id: activePaymentId,
        status: 'paid',
        paymentMethod,
        notes: paymentNotes || 'Liquidado e confirmado via Control Plane.',
        paymentDate: new Date().toISOString(),
        receiptUrl: `REC-2026-00${payment.id.split('-')[1] || '99'}.pdf`
      });
      setShowPayModal(false);
    }
  };

  const handleRegisterGenericInvoice = () => {
    // Registers a brand new monthly invoice
    const amount = tenant.planSlug.includes('pro') ? 350000 : 150000;
    registerPayment({
      tenantId: tenant.id,
      amount,
      status: 'pending',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header with quick creation action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Razão de Cobrança e Pagamentos</h3>
          <p className="text-[11px] text-slate-500">Histórico de faturas emitidas e controlo de liquidações fiscais</p>
        </div>
        {canManagePayments && tenant.status !== 'cancelled' && (
          <Button variant="secondary" size="sm" icon={Plus} onClick={handleRegisterGenericInvoice}>
            Emitir Fatura Manual
          </Button>
        )}
      </div>

      {tenantPayments.length > 0 ? (
        <>
          {/* Desktop Invoice List */}
          <div className="hidden md:block bg-slate-900/80 border border-slate-850/60 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-950 bg-slate-950/40 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 font-semibold">Documento</th>
                  <th className="py-3 px-4 font-semibold">Valor Facturado</th>
                  <th className="py-3 px-4 font-semibold">Vencimento / Pago Em</th>
                  <th className="py-3 px-4 font-semibold">Método</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-950 text-xs">
                {tenantPayments.map((p) => {
                  const isPaid = p.status === 'paid';
                  const isPending = p.status === 'pending';
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                        {p.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatAOA(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {isPaid ? (
                          <span className="text-slate-400">Pago a {formatDate(p.paymentDate)}</span>
                        ) : (
                          <span className={isPending ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
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
                        {isPending && canManagePayments ? (
                          <button
                            onClick={() => handleOpenPayModal(p.id)}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold font-sans hover:underline text-xs"
                          >
                            Liquidar
                          </button>
                        ) : p.receiptUrl ? (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              alert(`Simulando download do recibo oficial AGT para ${p.invoiceNumber}. Ficheiro: ${p.receiptUrl}`);
                            }}
                            className="text-slate-500 hover:text-slate-200 inline-flex items-center gap-1 hover:underline text-xs font-sans"
                          >
                            <Download className="w-3 h-3" /> Recibo
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Invoice Card View */}
          <div className="block md:hidden space-y-3">
            {tenantPayments.map((p) => {
              const isPaid = p.status === 'paid';
              const isPending = p.status === 'pending';
              
              return (
                <Card key={p.id} variant="default" padding="md" className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-200 text-xs">{p.invoiceNumber}</span>
                    <StatusBadge domain="payment" status={p.status} />
                  </div>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-slate-500 text-[10px]">Valor:</span>
                    <strong className="text-sm font-black text-white">{formatAOA(p.amount)}</strong>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex justify-between items-center">
                    <span className="text-slate-500">Vencimento:</span>
                    <span>{isPaid ? `Pago a ${formatDate(p.paymentDate)}` : `Vence a ${formatDate(p.dueDate)}`}</span>
                  </div>

                  {isPending && canManagePayments && (
                    <div className="pt-2 flex justify-end">
                      <Button size="sm" variant="primary" onClick={() => handleOpenPayModal(p.id)}>
                        Liquidar Fatura
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma fatura registada"
          description="Este cliente encontra-se em modo experimental (trial) ou não tem registos de faturação ativos."
          action={
            canManagePayments && tenant.status !== 'cancelled'
              ? { label: 'Emitir Fatura de Produção', onClick: handleRegisterGenericInvoice }
              : undefined
          }
        />
      )}

      {/* PAYMENT MODAL (Manually trigger payment) */}
      {showPayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          
          <div className="relative bg-slate-950 border border-slate-900 rounded-xl max-w-sm w-full p-5 shadow-2xl animate-fade-in text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Liquidar Fatura</h3>
              <button onClick={() => setShowPayModal(false)} className="p-1 rounded bg-slate-900 text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Método de Liquidação</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 py-2 px-3 rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value="bank_transfer">Transferência Bancária Directa</option>
                  <option value="multicaixa_referencia">Referência de Pagamento Multicaixa</option>
                  <option value="cash">Numerário / Caixa</option>
                  <option value="check">Cheque Contabilizado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold">Notas e Comprovativo</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20 placeholder-slate-600"
                  placeholder="Escreva detalhes como número de transacção bancária ou observações..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-900">
              <Button size="sm" onClick={() => setShowPayModal(false)}>Cancelar</Button>
              <Button size="sm" variant="primary" onClick={handleClearInvoice}>Confirmar Liquidação</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TenantBillingPage;
