/**
 * MCardExportDropdown: Unified Export Dropdown Viewlet
 * Sprint 35 Phase A+B - Provides "Save to Disk" and "Save to Database" exports.
 * Contract D ceiling: ≤ 160 LOC. Contract E: zero DOM globals.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { RendererAction } from '../renderers/registry/types';

export interface MCardExportDropdownProps {
  card: { handle: string; hash: string; mimeType: string };
  /** Descriptor-declared export.* actions for the current card type (e.g., TikZ SVG/PNG/PDF) */
  descriptorExportActions?: RendererAction[];
  onAction: (actionId: string, payload?: unknown) => Promise<void>;
  /** When true, shows the "Save to Database" group. Defaults to true (Phase B shipped). */
  enableDatabaseExport?: boolean;
  className?: string;
}

/** Derive a human-friendly format label from MIME type. */
function formatLabel(mime: string): string {
  const MAP: Record<string, string> = {
    'text/x-tikz': 'TikZ Source', 'text/markdown': 'Markdown', 'application/json': 'JSON',
    'text/yaml': 'YAML', 'text/csv': 'CSV', 'text/plain': 'Text', 'text/html': 'HTML',
    'image/png': 'PNG Image', 'image/svg+xml': 'SVG Image', 'image/jpeg': 'JPEG Image',
    'image/webp': 'WebP Image', 'application/pdf': 'PDF', 'application/x-latex': 'LaTeX',
    'application/vnd.pcard+json': 'PCard', 'application/vnd.vcard+json': 'VCard',
    'application/vnd.satori.turn+xml': 'Satori Turn', 'application/x-sqlite3': 'SQLite Database',
    'application/vnd.zx-graph+json': 'ZX-Graph', 'application/octet-stream': 'Binary',
  };
  return MAP[mime] ?? mime.split('/').pop()?.toUpperCase() ?? 'File';
}

export const MCardExportDropdown: React.FC<MCardExportDropdownProps> = ({
  card, descriptorExportActions, onAction, enableDatabaseExport = true, className = '',
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  const handleAction = async (actionId: string, payload?: unknown) => {
    close();
    await onAction(actionId, payload);
  };

  // Filter descriptor actions to export.* only (exclude openInCanvas, fireTransition, etc.)
  const exportActions = descriptorExportActions?.filter(a => a.id.startsWith('export.')) ?? [];

  const label = formatLabel(card.mimeType);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        data-testid="btn-viewer-export-dropdown"
        onClick={() => setOpen(o => !o)}
        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1"
      >
        Export <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div
          data-testid="mcard-export-menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 text-xs"
        >
          {/* Group: Save to Disk */}
          <div data-testid="export-group-disk" className="px-2 py-1 text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
            Save to Disk
          </div>

          {/* Primary download: raw payload */}
          <button
            type="button"
            data-testid="export-disk-download"
            onClick={() => handleAction('export.disk', { handle: card.handle })}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 transition-colors"
          >
            Download {label} File
          </button>

          {/* Descriptor-specific export formats (e.g., TikZ → SVG/PNG/PDF/TikZ/TeX) */}
          {exportActions.length > 0 && (
            <div className="border-t border-slate-800 mt-0.5 pt-0.5">
              {exportActions.map(action => (
                <button
                  key={action.id}
                  type="button"
                  data-testid={`export-disk-${action.id.replace('export.', '')}`}
                  onClick={() => handleAction(action.id, { handle: card.handle, ...action.payload })}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Group: Save to Database (Phase B) — mirrors the disk format set;
              destination is orthogonal to format. export.database.<fmt>
              generates rendered artifact bytes and commits via vfs.set(),
              never touching the file picker. */}
          {enableDatabaseExport && (
            <>
              <div className="border-t border-slate-800 mt-1" />
              <div data-testid="export-group-database" className="px-2 py-1 text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                Save to Database
              </div>
              <button
                type="button"
                data-testid="export-db-commit"
                onClick={() => handleAction('export.database.commit', { handle: card.handle })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                Commit {label}
              </button>
              {exportActions.map(action => {
                const fmt = action.id.replace('export.', '');
                return (
                  <button
                    key={`db-${action.id}`}
                    type="button"
                    data-testid={`export-db-${fmt}`}
                    onClick={() => handleAction(`export.database.${fmt}`, { handle: card.handle, ...action.payload })}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    Commit {action.label.replace(/^Export\s+/i, '')} as Card
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
