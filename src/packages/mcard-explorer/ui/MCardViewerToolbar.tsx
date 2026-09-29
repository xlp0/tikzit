/**
 * MCardViewerToolbar: Sprint 35 Phase A — extracted toolbar with Export ▾ dropdown.
 * Contract D: ≤ 100 LOC. Contract E: zero DOM globals.
 */
import React, { useState } from 'react';
import type { CardContentDto } from '../core/datasource/types';
import type { RendererDescriptor, ViewportMode } from '../renderers/registry/types';
import { MCardExportDropdown } from './MCardExportDropdown';

export interface MCardViewerToolbarProps {
  card: CardContentDto;
  descriptor: RendererDescriptor;
  viewportMode: ViewportMode;
  universe: string;
  onAction?: (actionId: string, payload?: unknown) => Promise<void>;
}

export const MCardViewerToolbar: React.FC<MCardViewerToolbarProps> = ({
  card, descriptor, viewportMode, universe, onAction,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(card.hash);
    }
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Separate export actions (for dropdown) from non-export actions (for pill buttons)
  const allActions = descriptor.actions ?? [];
  const exportActions = allActions.filter(a => a.id.startsWith('export.'));
  const nonExportActions = allActions.filter(a => !a.id.startsWith('export.'));

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 select-none gap-2 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <span data-testid="mcard-viewer-handle" className="font-semibold text-slate-200 truncate font-mono text-xs">
          {card.handle}
        </span>
        <span
          data-testid="mcard-viewer-universe"
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0"
        >
          {universe}
        </span>
        <span
          data-testid="mcard-viewer-mime"
          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono shrink-0 hidden sm:inline"
        >
          {card.mimeType}
        </span>
        <button
          type="button"
          data-testid="btn-copy-hash"
          onClick={handleCopyHash}
          title={card.hash}
          className="text-[10px] text-slate-500 hover:text-slate-300 font-mono truncate max-w-[120px]"
        >
          {copiedHash ? 'Copied CID' : card.hash.slice(0, 16) + '...'}
        </button>
      </div>

      {/* Viewport controls, non-export actions, and Export dropdown */}
      <div className="flex items-center gap-1.5">
        {viewportMode === 'zoom' && (
          <div data-testid="viewer-zoom-controls" className="flex items-center gap-1 text-[11px] text-slate-400">
            <span className="text-[10px] uppercase font-mono px-1">Zoom Mode</span>
          </div>
        )}
        {viewportMode === 'paged' && (
          <div data-testid="viewer-pager" className="flex items-center gap-1 text-[11px] text-slate-400">
            <span className="text-[10px] uppercase font-mono px-1">Paged</span>
          </div>
        )}
        {nonExportActions.map(action => (
          <button
            key={action.id}
            type="button"
            data-testid={`btn-viewer-action-${action.id.replace(/[^a-z0-9]+/gi, '-')}`}
            onClick={() => onAction?.(action.id, { handle: card.handle, ...action.payload })}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
          >
            {action.label}
          </button>
        ))}
        {onAction && (
          <MCardExportDropdown
            card={card}
            descriptorExportActions={exportActions}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  );
};
