import React, { createContext, useState, useContext, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Area */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900 border-slate-800 text-slate-100';
          let borderLeft = 'border-l-4 border-indigo-500';
          
          if (toast.type === 'success') {
            bgClass = 'bg-slate-900 border-emerald-950/60 text-emerald-100';
            borderLeft = 'border-l-4 border-emerald-500';
          } else if (toast.type === 'error') {
            bgClass = 'bg-slate-900 border-rose-950/60 text-rose-100';
            borderLeft = 'border-l-4 border-rose-500';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-slate-900 border-amber-950/60 text-amber-100';
            borderLeft = 'border-l-4 border-amber-500';
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center justify-between p-3 rounded-lg border shadow-xl animate-slide-in ${bgClass} ${borderLeft}`}
              role="alert"
            >
              <div className="text-xs font-medium">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-4 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
}
