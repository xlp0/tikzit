/**
 * src/components/workbench/panels/preview/PreviewToolbar.tsx - Sprint 22
 * Preview control toolbar with zoom actions, export menu, and Contract B selectors.
 */
import React from 'react';

export interface PreviewToolbarProps {
  autoCompile: boolean;
  onToggleAutoCompile: () => void;
  compiling: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
  onCopyTikz: () => void;
  showExportMenu: boolean;
  onToggleExportMenu: () => void;
  onExport: (format: 'svg' | 'png' | 'pdf' | 'tex') => void;
  /** Sprint 35 Phase B: commit the selected format artifact to the sovereign VFS. */
  onSaveToDatabase?: (format: 'tikz' | 'tex' | 'svg' | 'png' | 'pdf') => void;
  onToggleLogs: () => void;
  onTogglePreamble: () => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  autoCompile,
  onToggleAutoCompile,
  compiling,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  onCopyTikz,
  showExportMenu,
  onToggleExportMenu,
  onExport,
  onSaveToDatabase,
  onToggleLogs,
  onTogglePreamble,
}) => {
  return (
    <div className="h-9 px-2 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-300 select-none">
      <div className="flex items-center gap-1.5">
        <button
          data-testid="toggle-auto-compile"
          onClick={onToggleAutoCompile}
          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
            autoCompile
              ? 'bg-sky-950/60 border-sky-600/50 text-sky-300'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400'
          }`}
        >
          {autoCompile ? 'Auto' : 'Manual'}
        </button>

        <span
          data-testid="preview-status-badge"
          className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            compiling ? 'bg-amber-950/60 text-amber-300' : 'bg-emerald-950/60 text-emerald-300'
          }`}
        >
          {compiling ? 'Compiling...' : 'Ready'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button data-testid="btn-preview-zoom-in" onClick={onZoomIn} className="p-1 hover:bg-neutral-800 rounded" title="Zoom in">
          +
        </button>
        <span data-testid="preview-zoom-text" className="font-mono text-[10px] px-1 text-neutral-400">{Math.round(zoom * 100)}%</span>
        <button data-testid="btn-preview-zoom-out" onClick={onZoomOut} className="p-1 hover:bg-neutral-800 rounded" title="Zoom out">
          -
        </button>
        <button data-testid="btn-preview-zoom-reset" onClick={onZoomReset} className="px-1.5 py-0.5 hover:bg-neutral-800 rounded text-[10px]" title="Reset zoom">
          1:1
        </button>
        <button data-testid="btn-preview-zoom-fit" onClick={onZoomFit} className="px-1.5 py-0.5 hover:bg-neutral-800 rounded text-[10px]" title="Fit to page">
          Fit
        </button>

        <div className="h-3 w-px bg-neutral-800 mx-1" />

        <button data-testid="btn-copy-tikz" onClick={onCopyTikz} className="px-2 py-0.5 hover:bg-neutral-800 rounded text-[11px]">
          Copy TikZ
        </button>

        <div className="relative">
          <button
            data-testid="btn-export-dropdown"
            onClick={onToggleExportMenu}
            className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[11px] font-medium"
          >
            Export ▾
          </button>

          {showExportMenu && (
            <div data-testid="preview-export-menu" className="absolute right-0 top-full mt-1 w-44 bg-neutral-900 border border-neutral-700 rounded shadow-xl py-1 z-30 flex flex-col">
              <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Save to Disk</div>
              <button data-testid="btn-export-svg" onClick={() => onExport('svg')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Export SVG</button>
              <button data-testid="btn-export-png" onClick={() => onExport('png')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Export PNG</button>
              <button data-testid="btn-export-pdf" onClick={() => onExport('pdf')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Export PDF</button>
              <button data-testid="btn-export-tikz" onClick={() => onExport('tex')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Export TikZ</button>
              <button data-testid="btn-export-tex" onClick={() => onExport('tex')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Export TeX</button>
              {onSaveToDatabase && (
                <>
                  <div className="border-t border-neutral-700 my-0.5" />
                  <div data-testid="export-group-database-preview" className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Save to Database</div>
                  <button data-testid="btn-save-to-database" onClick={() => onSaveToDatabase('tikz')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Commit TikZ Source</button>
                  <button data-testid="btn-db-tex" onClick={() => onSaveToDatabase('tex')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Commit TeX Document</button>
                  <button data-testid="btn-db-svg" onClick={() => onSaveToDatabase('svg')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Commit Rendered SVG</button>
                  <button data-testid="btn-db-png" onClick={() => onSaveToDatabase('png')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Commit PNG Image</button>
                  <button data-testid="btn-db-pdf" onClick={() => onSaveToDatabase('pdf')} className="px-3 py-1 text-left text-xs hover:bg-neutral-800">Commit PDF Document</button>
                </>
              )}
            </div>
          )}
        </div>

        <button data-testid="btn-preview-logs" onClick={onToggleLogs} className="p-1 hover:bg-neutral-800 rounded text-[11px]" title="Compiler Logs">
          📋
        </button>
        <button data-testid="btn-preview-preamble" onClick={onTogglePreamble} className="p-1 hover:bg-neutral-800 rounded text-[11px]" title="Preamble Configuration">
          ⚙️
        </button>
      </div>
    </div>
  );
};
