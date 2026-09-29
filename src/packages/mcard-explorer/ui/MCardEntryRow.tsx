/**
 * MCardEntryRow: Accessible Row Viewlet for Individual MCard Records
 *
 * Renders handle, BLAKE3 CID pill, and contextual action buttons.
 * Zero DOM globals. Contract D ceiling: <= 250 LOC.
 */

import React from 'react';
import type { CardSummaryItem, ExplorerAction } from '../actions/ExplorerActionRegistry';

export interface MCardEntryRowProps {
  card: CardSummaryItem;
  isSelected?: boolean;
  onSelect?: (handle: string) => void;
  actions?: ExplorerAction[];
  onActionExecute?: (actionId: string, handle: string) => void;
}

export const MCardEntryRow: React.FC<MCardEntryRowProps> = ({
  card,
  isSelected,
  onSelect,
  actions = [],
  onActionExecute
}) => {
  return (
    <div
      className={`mcard-entry-row group flex items-center justify-between px-3 py-2 text-xs rounded transition-colors cursor-pointer ${
        isSelected
          ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
      }`}
      onClick={() => onSelect?.(card.handle)}
      data-testid={`mcard-entry-${card.handle}`}
    >
      <div className="flex flex-col min-w-0 pr-2">
        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
          {card.handle}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
            {card.hash.slice(0, 10)}
          </span>
          {card.mimeType && (
            <span className="text-[10px] text-slate-400 truncate">
              {card.mimeType}
            </span>
          )}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions.map(act => (
            <button
              key={act.id}
              type="button"
              className="px-2 py-1 text-[11px] bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                onActionExecute?.(act.id, card.handle);
              }}
              title={act.label}
              data-testid={`action-${act.id}-${card.handle}`}
            >
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
