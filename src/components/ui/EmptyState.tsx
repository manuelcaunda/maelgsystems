import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'error';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const isError = variant === 'error';
  
  return (
    <div className="py-14 px-4 flex flex-col items-center text-center rounded-xl bg-slate-900/40 border border-slate-900/60">
      {/* Icon frame */}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
        isError ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-500'
      }`}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Texts */}
      <h3 className="text-sm font-semibold text-slate-200 mt-4">{title}</h3>
      <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>

      {/* Optional action */}
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors border ${
            isError
              ? 'bg-rose-600 border-rose-500 hover:bg-rose-500 text-white'
              : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
