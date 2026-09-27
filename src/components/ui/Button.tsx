import React, { ButtonHTMLAttributes } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { useBackoffice } from '../../context/BackofficeContext';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const { theme } = useBackoffice();
  const isDark = theme === 'dark';

  const baseStyle = 'inline-flex items-center justify-center font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0 cursor-pointer';

  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-black font-semibold border border-amber-500/10 shadow-sm',
    secondary: isDark
      ? 'bg-[#2B3139] hover:bg-[#353c45] text-[#EAECEF] border border-[#2B3139]'
      : 'bg-[#DFE2E6] hover:bg-[#D2D6DC] text-[#1E2329] border border-slate-300',
    ghost: isDark
      ? 'hover:bg-[#2B3139]/50 text-[#848E9C] hover:text-[#EAECEF]'
      : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/20 shadow-sm',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5" />
      ) : null}
      {children}
    </button>
  );
}
export default Button;
