import React from 'react';
import type { CardContentDto } from '../core';

export interface ViewerHeaderProps {
  readonly card: CardContentDto;
  readonly universe?: string;
  readonly zoomDepth?: number;
  readonly children?: React.ReactNode;
}

export const ViewerHeader: React.FC<ViewerHeaderProps> = ({
  card,
  universe = 'U0',
  zoomDepth = 0,
  children
}) => {
  return (
    <div
      className="viewer-header flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-200"
      data-testid="viewer-header"
      data-zoom-depth={zoomDepth}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-slate-100 truncate" title={card.handle}>
          {card.handle}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800"
          data-testid="viewer-universe-badge"
        >
          {universe}
        </span>
        {card.hash && (
          <span className="font-mono text-[10px] text-slate-400" title={card.hash}>
            {card.hash.slice(0, 8)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
};
