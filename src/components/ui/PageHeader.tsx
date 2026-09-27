import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  backHref?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  backHref,
}: PageHeaderProps) {
  return (
    <div className="border-b border-slate-900 pb-4 mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mb-2" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {crumb.href && !isLast ? (
                  <Link to={crumb.href} className="hover:text-indigo-400 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-slate-400 font-medium' : ''}>{crumb.label}</span>
                )}
                {!isLast && <span className="text-slate-600 font-normal">/</span>}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title and Back Link */}
        <div className="flex items-start gap-3">
          {backHref && (
            <Link
              to={backHref}
              className="mt-1 p-1 bg-slate-900 border border-slate-800 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">{title}</h1>
            {description && <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>}
          </div>
        </div>

        {/* Actions Zone */}
        {actions && <div className="flex items-center gap-2 self-start sm:self-center shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
