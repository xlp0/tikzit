import React from 'react';
import type { ToolMode } from '../../services/kernel';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';
import { DesktopToolPalette } from './DesktopToolPalette';
import { VersionPopover } from './panels/VersionPopover';

export interface MacWindowChromeProps {
  runtime?: WorkbenchRuntime;
  documentTitle: string;
  isDirty?: boolean;
  docBadge?: 'Draft' | 'Diagram' | 'Example';
  saveStatusText?: string;
  saveError?: string;
  isSessionOnly?: boolean;
  onRetryFlush?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  buttonKind?: 'save-draft' | 'save-diagram' | 'none';
  buttonLabel?: string;
  buttonTooltip?: string;
  showSuccessPill?: boolean;
  activeTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showVersionPopover: boolean;
  onToggleVersionPopover: () => void;
  activeDocId?: string;
  tabsMenuOpen: boolean;
  onToggleTabsMenu: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onCloseActiveTab?: () => void;
  onResetLayout: () => void;
  theme: 'dark' | 'light';
  themeMenuOpen: boolean;
  onToggleThemeMenu: () => void;
  onSetTheme: (theme: 'dark' | 'light') => void;
  onNewDiagram: () => void;
  onExport?: () => void;
}

export const MacWindowChrome: React.FC<MacWindowChromeProps> = ({
  runtime,
  documentTitle,
  isDirty = false,
  docBadge,
  saveStatusText,
  saveError,
  isSessionOnly = false,
  onRetryFlush,
  onSave,
  isSaving = false,
  buttonKind = 'none',
  buttonLabel,
  buttonTooltip,
  showSuccessPill = false,
  activeTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showVersionPopover,
  onToggleVersionPopover,
  activeDocId,
  tabsMenuOpen,
  onToggleTabsMenu,
  onCloseOthers,
  onCloseAll,
  onCloseActiveTab,
  onResetLayout,
  theme,
  themeMenuOpen,
  onToggleThemeMenu,
  onSetTheme,
  onNewDiagram,
  onExport,
}) => {
  // Normalize title format: e.g. "untitled* - TikZiT" or "01_spider_fusion.tikz* - TikZiT"
  const baseTitle = documentTitle.replace(/\*$/, '').replace(/ - TikZiT$/, '');
  const formattedTitle = `${baseTitle}${isDirty ? '*' : ''} - TikZiT`;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutText = isMac ? '⌘S' : 'Ctrl+S';

  return (
    <header data-testid="mac-window-chrome" className="relative h-10 bg-[#2a2a2a] border-b border-[#383838] px-3 flex items-center justify-between z-[100] select-none text-slate-200">
      {/* Left side: Document Lifecycle & Active Document Title */}
      <div className="flex items-center space-x-2 z-10 min-w-0">
        <div
          data-testid="mac-window-title"
          className="flex items-center min-w-0"
        >
          <span
            data-testid="doc-tab-title"
            className="text-xs px-3 py-1 rounded bg-[#1e1e1e] text-slate-200 border border-[#383838] font-medium tracking-wide flex items-center shadow-inner gap-2 max-w-full"
          >
            <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-[280px]" title={formattedTitle}>
              {formattedTitle}
            </span>
            {docBadge && (
              <span
                data-testid="doc-type-badge"
                className={`px-1 text-[9px] rounded font-mono shrink-0 ${
                  docBadge === 'Draft'
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                    : docBadge === 'Diagram'
                    ? 'bg-blue-950/70 text-blue-300 border border-blue-800'
                    : 'bg-purple-950/70 text-purple-300 border border-purple-800'
                }`}
              >
                {docBadge}
              </span>
            )}
            {saveStatusText && (
              <span data-testid="doc-save-status" className="text-[10px] text-slate-400 font-normal flex items-center gap-1 shrink-0">
                <span>{saveStatusText}</span>
                {isSessionOnly && onRetryFlush && (
                  <button
                    type="button"
                    data-testid="doc-retry-flush-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryFlush();
                    }}
                    className="text-amber-400 underline hover:text-amber-300 ml-1 text-[9px]"
                  >
                    Retry
                  </button>
                )}
              </span>
            )}
            {saveError && (
              <span
                data-testid="diagram-save-error"
                className="text-[10px] text-red-400 font-normal truncate max-w-[140px] shrink-0"
                title={saveError}
              >
                {saveError}
              </span>
            )}
            {showSuccessPill && (
              <span
                data-testid="draft-save-success-pill"
                className="px-2 py-0.5 text-xs rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700 font-medium flex items-center gap-1 shadow-sm shrink-0"
              >
                ✓ Saved to MCard
              </span>
            )}
            {!showSuccessPill && buttonKind === 'save-draft' && (
              <button
                type="button"
                data-testid="btn-save-draft"
                disabled={isSaving}
                aria-busy={isSaving}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
                title={buttonTooltip || 'Save this diagram to MCard history in this browser'}
                className="px-2.5 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isSaving ? 'Saving…' : (buttonLabel || 'Save to MCard')}</span>
                {!isSaving && (
                  <kbd className="hidden sm:inline-block text-[10px] bg-blue-700/60 px-1 py-0.5 rounded border border-blue-400/30 font-mono">
                    {shortcutText}
                  </kbd>
                )}
              </button>
            )}
            {!showSuccessPill && buttonKind === 'save-diagram' && (
              <button
                type="button"
                data-testid="btn-save-diagram"
                disabled={isSaving}
                aria-busy={isSaving}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
                title={buttonTooltip || 'Save changes to MCard history'}
                className="px-2 py-0.5 text-xs rounded bg-blue-700/80 hover:bg-blue-600 text-white font-medium transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isSaving ? 'Saving…' : (buttonLabel || 'Save')}</span>
                {!isSaving && (
                  <kbd className="hidden sm:inline-block text-[10px] bg-blue-800/60 px-1 py-0.5 rounded border border-blue-500/30 font-mono">
                    {shortcutText}
                  </kbd>
                )}
              </button>
            )}
            {onCloseActiveTab && (
              <button
                type="button"
                data-testid="btn-close-tab"
                aria-label={`Close ${baseTitle}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseActiveTab();
                }}
                className="ml-1 text-slate-400 hover:text-red-400 px-1 rounded hover:bg-white/10 transition-colors text-xs font-semibold shrink-0"
                title="Close tab"
              >
                ✕
              </button>
            )}
          </span>
        </div>

        {/* New Diagram Tab Button */}
        <button
          type="button"
          onClick={onNewDiagram}
          data-testid="btn-new-diagram"
          className="text-xs px-2 py-1 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 hover:text-white border border-[#444444] transition-colors"
          title="Create new diagram (Cmd+N)"
        >
          +
        </button>
      </div>

      {/* Center: Canvas Drawing Tools (Select, Vertex, Edge, BBox) centered directly above the Vector Canvas */}
      <div
        data-testid="center-toolbar-zone"
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto"
      >
        <DesktopToolPalette activeTool={activeTool} onSelectTool={onSelectTool} />
      </div>

      {/* Right side: Absorbed Actions (Undo/Redo, History, Tabs, Layout, Theme) */}
      <div className="flex items-center space-x-2 z-10">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#1e1e1e] rounded p-0.5 border border-[#383838] space-x-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            data-testid="btn-toolbar-undo"
            title="Undo (Cmd+Z)"
            className={`px-2 py-1 rounded text-xs transition-colors ${
              canUndo
                ? 'text-slate-200 hover:bg-[#333333]'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            data-testid="btn-toolbar-redo"
            title="Redo (Cmd+Shift+Z)"
            className={`px-2 py-1 rounded text-xs transition-colors ${
              canRedo
                ? 'text-slate-200 hover:bg-[#333333]'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            ↷ Redo
          </button>
        </div>

        {/* Version History Popover Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={onToggleVersionPopover}
            data-testid="btn-version-history"
            className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#333333] hover:bg-[#444444] border border-[#444444] transition-colors flex items-center space-x-1"
            title="Version History & MCard Lineage"
          >
            <span>🕒 History</span>
          </button>
          {showVersionPopover && (
            <VersionPopover
              runtime={runtime}
              documentId={activeDocId || ''}
              onClose={onToggleVersionPopover}
            />
          )}
        </div>

        {/* Export Diagram Action */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            data-testid="btn-export-diagram"
            className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#333333] hover:bg-[#444444] border border-[#444444] transition-colors flex items-center space-x-1"
            title="Export Diagram (TikZ, TeX, SVG, PNG, PDF)"
          >
            <span>⤓ Export</span>
          </button>
        )}

        {/* Tab Actions Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={onToggleTabsMenu}
            className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#333333] hover:bg-[#444444] border border-[#444444] transition-colors"
            title="More Editor Tab Actions"
            data-testid="editor-tabs-more-actions-btn"
          >
            ⋯
          </button>
          {tabsMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 bg-[#222222] border border-[#383838] shadow-xl rounded py-1 z-50 text-xs text-slate-200 min-w-[120px]"
              data-testid="tabs-more-actions-dropdown"
            >
              <button
                type="button"
                onClick={onCloseOthers}
                className="w-full text-left px-3 py-1.5 hover:bg-[#333333] hover:text-white transition-colors"
                data-testid="tabs-close-others-btn"
              >
                Close Others
              </button>
              <button
                type="button"
                onClick={onCloseAll}
                className="w-full text-left px-3 py-1.5 hover:bg-[#333333] hover:text-white transition-colors"
                data-testid="tabs-close-all-btn"
              >
                Close All
              </button>
            </div>
          )}
        </div>

        {/* Reset Layout */}
        <button
          type="button"
          onClick={onResetLayout}
          className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#333333] hover:bg-[#444444] border border-[#444444] transition-colors"
          title="Reset to default 4-panel layout"
          data-testid="btn-reset-layout"
        >
          Reset Layout
        </button>

        {/* Theme Selector Button & Menu */}
        <div className="relative">
          <button
            type="button"
            id="theme-selector-btn"
            data-testid="btn-theme-toggle"
            onClick={onToggleThemeMenu}
            className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#333333] hover:bg-[#444444] border border-[#444444] transition-colors"
            title="Toggle or Select Dark/Light Theme"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          {themeMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[#222222] border border-[#383838] shadow-xl rounded py-1 z-50 text-xs text-slate-200 min-w-[110px]">
              <button
                type="button"
                data-theme="dark"
                onClick={() => onSetTheme('dark')}
                className="w-full text-left px-3 py-1.5 hover:bg-[#333333] hover:text-white transition-colors"
              >
                🌙 Dark
              </button>
              <button
                type="button"
                data-theme="light"
                onClick={() => onSetTheme('light')}
                className="w-full text-left px-3 py-1.5 hover:bg-[#333333] hover:text-white transition-colors"
              >
                ☀️ Light
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
