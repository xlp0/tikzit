import React from 'react';
import type { ToolMode } from '../../services/kernel';
import { DesktopToolPalette } from './DesktopToolPalette';
import { VersionPopover } from './panels/VersionPopover';

export interface MacWindowChromeProps {
  documentTitle: string;
  isDirty?: boolean;
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
  onResetLayout: () => void;
  theme: 'dark' | 'light';
  themeMenuOpen: boolean;
  onToggleThemeMenu: () => void;
  onSetTheme: (theme: 'dark' | 'light') => void;
  onNewDiagram: () => void;
}

export const MacWindowChrome: React.FC<MacWindowChromeProps> = ({
  documentTitle,
  isDirty = false,
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
  onResetLayout,
  theme,
  themeMenuOpen,
  onToggleThemeMenu,
  onSetTheme,
  onNewDiagram,
}) => {
  // Normalize title format: e.g. "untitled* - TikZiT" or "01_spider_fusion.tikz* - TikZiT"
  const baseTitle = documentTitle.replace(/\*$/, '').replace(/ - TikZiT$/, '');
  const formattedTitle = `${baseTitle}${isDirty ? '*' : ''} - TikZiT`;

  return (
    <header data-testid="mac-window-chrome" className="h-10 bg-[#2a2a2a] border-b border-[#383838] px-3 flex items-center justify-between z-20 select-none text-slate-200">
      {/* Left side: Document Lifecycle & Active Document Title */}
      <div className="flex items-center space-x-2 z-10">
        <div
          data-testid="mac-window-title"
          className="flex items-center"
        >
          <span
            data-testid="doc-tab-title"
            className="text-xs px-3 py-1 rounded bg-[#1e1e1e] text-slate-200 border border-[#383838] font-medium tracking-wide flex items-center shadow-inner"
          >
            <span>{formattedTitle}</span>
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
        className="flex items-center justify-center flex-1 mx-4"
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
              documentId={activeDocId || ''}
              onClose={onToggleVersionPopover}
            />
          )}
        </div>

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
