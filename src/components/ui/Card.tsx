import React from 'react';
import { useBackoffice } from '../../context/BackofficeContext';

interface CardProps {
  variant?: 'default' | 'highlighted' | 'muted';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article';
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  as: Component = 'div',
  className = '',
  onClick,
  children,
}: CardProps) {
  const { theme } = useBackoffice();
  
  const baseStyle = 'rounded-xl transition-all duration-200';
  
  const isDark = theme === 'dark';
  
  const variants = {
    default: isDark 
      ? 'bg-[#1E2329] border border-[#2B3139] text-[#EAECEF]' 
      : 'bg-white border border-slate-200 text-[#1E2329] shadow-sm',
    highlighted: isDark 
      ? 'bg-[#1E2329] border border-amber-500/40 text-[#EAECEF] ring-1 ring-amber-500/10' 
      : 'bg-white border border-amber-500 text-[#1E2329] shadow-md ring-1 ring-amber-500/20',
    muted: isDark 
      ? 'bg-[#181A20] border border-[#2B3139]/60 text-[#848E9C]' 
      : 'bg-[#F0F2F5] border border-slate-200/60 text-[#707a8a]',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6 lg:p-7',
  };

  return (
    <Component
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${paddings[padding]} ${onClick ? 'cursor-pointer hover:scale-[1.005] duration-150' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
