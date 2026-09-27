import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface Consequence {
  label: string;
  value: string;
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  requireTyping?: string;
  consequences?: Consequence[];
  /**
   * Motivo da accao. Vem por callback porque o dialog e' controlado: quem o
   * abre guarda o texto e envia-o para a API. Uma suspensao sem motivo
   * registado nao serve para explicar ao cliente porque perdeu o acesso.
   */
  motivo?: string;
  onMotivoChange?: (motivo: string) => void;
  motivoLabel?: string;
  motivoObrigatorio?: boolean;
  motivoPlaceholder?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  requireTyping,
  consequences,
  motivo,
  onMotivoChange,
  motivoLabel = 'Motivo',
  motivoObrigatorio = false,
  motivoPlaceholder,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Save the element that triggered the modal
  useEffect(() => {
    if (open) {
      triggerElementRef.current = document.activeElement as HTMLElement;
      setTypedValue(''); // reset
      
      // Focus on close button or input
      setTimeout(() => {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable && focusable.length > 0) {
          (focusable[0] as HTMLElement).focus();
        }
      }, 50);
    } else {
      triggerElementRef.current?.focus();
    }
  }, [open]);

  // Trap focus and handle escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isConfirmDisabled =
    (requireTyping ? typedValue !== requireTyping : false) ||
    (motivoObrigatorio ? !(motivo ?? '').trim() : false);

  let btnColor = 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white';
  let iconColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/10';
  let iconComponent = <Info className="w-5 h-5" />;

  if (variant === 'danger') {
    btnColor = 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white disabled:opacity-50 disabled:hover:bg-rose-600';
    iconColor = 'text-rose-400 bg-rose-500/10 border-rose-500/10';
    iconComponent = <AlertTriangle className="w-5 h-5" />;
  } else if (variant === 'warning') {
    btnColor = 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white disabled:opacity-50 disabled:hover:bg-amber-600';
    iconColor = 'text-amber-400 bg-amber-500/10 border-amber-500/10';
    iconComponent = <AlertTriangle className="w-5 h-5" />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Content wrapper: centered on desktop, bottom-sheet on mobile */}
      <div
        ref={modalRef}
        className="relative bg-slate-950 border border-slate-900 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-slide-up sm:animate-fade-in text-slate-100"
      >
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-lg border ${iconColor} shrink-0 hidden sm:block`}>
            {iconComponent}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="sm:hidden text-amber-500">{iconComponent}</span>
              {title}
            </h2>
            <p id="confirm-desc" className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              {description}
            </p>

            {/* Consequences summary list */}
            {consequences && consequences.length > 0 && (
              <div className="mt-4 p-3 bg-slate-900/60 rounded-lg border border-slate-900 flex flex-col gap-1.5">
                {consequences.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500">{c.label}:</span>
                    <span className="text-slate-300 font-medium">{c.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Motivo da accao */}
            {onMotivoChange && (
              <div className="mt-4">
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  {motivoLabel}
                  {motivoObrigatorio && <span className="text-rose-400"> *</span>}
                </label>
                <textarea
                  value={motivo ?? ''}
                  onChange={(e) => onMotivoChange(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 resize-none"
                  placeholder={motivoPlaceholder ?? 'Descreva o motivo. Fica registado na auditoria.'}
                />
                {motivoObrigatorio && !(motivo ?? '').trim() && (
                  <p className="mt-1 text-[10px] text-rose-400">
                    O motivo é obrigatório para esta acção.
                  </p>
                )}
              </div>
            )}

            {/* Require exact typing guard (GitHub style) */}
            {requireTyping && (
              <div className="mt-4">
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  Por favor escreva <strong className="text-slate-200 font-mono select-all font-semibold bg-slate-900 px-1.5 py-0.5 rounded">{requireTyping}</strong> para confirmar:
                </label>
                <input
                  type="text"
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 font-mono"
                  placeholder="Escreva a palavra exata"
                  autoFocus
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                disabled={isConfirmDisabled}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${btnColor}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
