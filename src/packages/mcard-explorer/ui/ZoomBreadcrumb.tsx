import React from 'react';
import type { ZoomCrumb } from '../zoom/types';

export interface ZoomBreadcrumbProps {
  readonly crumbs: readonly ZoomCrumb[];
  readonly activeCursor?: number;
  readonly onNavigate: (cursor: number) => void;
}

export const ZoomBreadcrumb: React.FC<ZoomBreadcrumbProps> = ({
  crumbs,
  activeCursor,
  onNavigate
}) => {
  const currentCursor = activeCursor ?? (crumbs.length > 0 ? crumbs.length - 1 : 0);

  return (
    <nav
      className="zoom-breadcrumb flex items-center gap-1.5 text-xs py-1 px-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 select-none"
      data-testid="zoom-breadcrumb"
      aria-label="Zoom Navigation Breadcrumb"
    >
      {crumbs.map((crumb, idx) => {
        const isCurrent = idx === currentCursor || idx === crumbs.length - 1;
        return (
          <React.Fragment key={`${crumb.handle}-${crumb.cursor}`}>
            {idx > 0 && <span className="text-slate-400 select-none">/</span>}
            <button
              type="button"
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                isCurrent
                  ? 'font-semibold text-slate-900 dark:text-slate-100 cursor-default'
                  : 'hover:underline cursor-pointer'
              }`}
              onClick={() => onNavigate(crumb.cursor)}
              data-testid={`zoom-crumb-${idx}`}
              disabled={isCurrent}
            >
              {crumb.label || 'Root'}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
