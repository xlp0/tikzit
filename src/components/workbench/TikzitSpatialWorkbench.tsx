import { FileDropZone } from '../workspace/FileDropZone';
import { VersionPopover } from './panels/VersionPopover';
import { defaultTransactionManager } from '../../core/history/TransactionManager';
import { defaultWorkspaceManager } from '../../services/workspace/WorkspaceManager';
import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewApi,
  DockviewDefaultTab,
  type IDockviewPanelHeaderProps,
} from 'dockview-react';
import 'dockview-react/dist/styles/dockview.css';

import { CanvasPanel } from './panels/CanvasPanel';
import { SourcePanel } from './panels/SourcePanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { ConsolePanel } from './panels/ConsolePanel';

import type { ToolMode } from '../../services/kernel';
import { createWorkbenchRuntime, type WorkbenchRuntime } from '../../services/createWorkbenchRuntime';
import { WorkbenchRuntimeProvider } from './WorkbenchRuntimeContext';
import { parseTikz } from '../../core/parser';

const components = {
  canvas: CanvasPanel,
  source: SourcePanel,
  inspector: InspectorPanel,
  preview: PreviewPanel,
  console: ConsolePanel,
};

// Custom tab component adding .editor-tab class for tab querying and semantic styling
const CustomTabComponent: React.FC<IDockviewPanelHeaderProps> = (props) => {
  return (
    <div className="editor-tab flex items-center h-full">
      <DockviewDefaultTab {...props} />
    </div>
  );
};

export interface TikzitSpatialWorkbenchProps {
  runtime?: WorkbenchRuntime;
}

export const TikzitSpatialWorkbench: React.FC<TikzitSpatialWorkbenchProps> = ({ runtime: propRuntime }) => {
  const localRuntimeRef = useRef<WorkbenchRuntime | null>(null);
  if (!propRuntime && !localRuntimeRef.current) {
    localRuntimeRef.current = createWorkbenchRuntime();
  }
  const runtime = propRuntime ?? localRuntimeRef.current!;

  const [historyState, setHistoryState] = useState<{ canUndo: boolean; canRedo: boolean; isDirty: boolean; lastCommand?: string }>(defaultTransactionManager.getState());
  const [workspaceState, setWorkspaceState] = useState(defaultWorkspaceManager.getState());
  const [showVersionPopover, setShowVersionPopover] = useState(false);

  useEffect(() => {
    const unsubH = defaultTransactionManager.subscribe((s) => setHistoryState(s));
    const unsubW = defaultWorkspaceManager.subscribe(setWorkspaceState);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          defaultTransactionManager.redo();
        } else {
          defaultTransactionManager.undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        defaultTransactionManager.redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        defaultWorkspaceManager.saveActive();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubH();
      unsubW();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Nanostores Reactive Flux Subscriptions
  const activeTool = useStore(runtime.stores.$toolMode);
  const theme = useStore(runtime.stores.$theme);
  const layout = useStore(runtime.stores.$workbenchLayout);
  const activeDiagram = useStore(runtime.stores.$activeDiagram);

  const {
    isDrawerCollapsed,
    drawerWidth,
    isWorkbenchDepressed,
    panelCount,
    tabsMenuOpen,
    themeMenuOpen,
  } = layout;

  const dockviewApiRef = useRef<DockviewApi | null>(null);
  const setPanelCount = (count: number) => {
    runtime.stores.$workbenchLayout.setKey('panelCount', count);
  };
  const toggleDrawer = () => {
    runtime.stores.$workbenchLayout.setKey('isDrawerCollapsed', !layout.isDrawerCollapsed);
  };
  const setDrawerWidth = (w: number) => {
    const clamped = Math.max(160, Math.min(600, w));
    runtime.stores.$workbenchLayout.setKey('drawerWidth', clamped);
  };
  const depressWorkbench = () => {
    runtime.stores.$workbenchLayout.setKey('isWorkbenchDepressed', true);
  };
  const restoreWorkbench = () => {
    runtime.stores.$workbenchLayout.setKey('isWorkbenchDepressed', false);
  };
  const toggleTabsMenu = () => {
    runtime.stores.$workbenchLayout.setKey('tabsMenuOpen', !layout.tabsMenuOpen);
  };
  const toggleThemeMenu = () => {
    runtime.stores.$workbenchLayout.setKey('themeMenuOpen', !layout.themeMenuOpen);
  };
  const setTabsMenuOpen = (open: boolean) => {
    runtime.stores.$workbenchLayout.setKey('tabsMenuOpen', open);
  };
  const setThemeMenuOpen = (open: boolean) => {
    runtime.stores.$workbenchLayout.setKey('themeMenuOpen', open);
  };
  const setTheme = (t: 'dark' | 'light') => {
    runtime.stores.$theme.set(t);
    if (typeof document !== 'undefined') {
      if (t === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('tikzit:theme', t);
      } catch (e) {}
    }
  };
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  const setTool = (tool: ToolMode) => {
    runtime.ctx.tool.setTool(tool);
    runtime.stores.$toolMode.set(tool);
  };


  // Setup default 4-panel spatial layout
  const loadDefaultLayout = (api: DockviewApi) => {
    api.clear();

    const canvas = api.addPanel({
      id: 'canvas',
      component: 'canvas',
      title: 'Vector Canvas (Three.js)',
    });

    const preview = api.addPanel({
      id: 'preview',
      component: 'preview',
      title: 'TeX Preview',
      position: { referencePanel: canvas, direction: 'right' },
    });

    const source = api.addPanel({
      id: 'source',
      component: 'source',
      title: 'TikZ Source',
      position: { referencePanel: canvas, direction: 'below' },
    });

    const inspector = api.addPanel({
      id: 'inspector',
      component: 'inspector',
      title: 'Inspector & Styles',
      position: { referencePanel: preview, direction: 'right' },
    });

    api.addPanel({
      id: 'console',
      component: 'console',
      title: 'Diagnostics Console',
      position: { referencePanel: source, direction: 'right' },
    });
  };

  const onReady = (event: DockviewReadyEvent) => {
    const api = event.api;
    dockviewApiRef.current = api;

    // Resilient Layout Restoration (with 0-panel guard from Knowledge Item)
    let restored = false;
    try {
      const saved = localStorage.getItem('tikzit:workbench:layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.grid && parsed.panels && Object.keys(parsed.panels).length > 0) {
          api.fromJSON(parsed);
          restored = true;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved layout, using default', e);
    }

    if (!restored) {
      loadDefaultLayout(api);
    }

    setPanelCount(api.panels.length);

    // Layout Change Listener with 0-Panel Guard
    api.onDidLayoutChange(() => {
      setPanelCount(api.panels.length);
      if (api.panels.length === 0) {
        // Guard against persisting 0-panel layouts
        return;
      }
      try {
        const serialized = api.toJSON();
        localStorage.setItem('tikzit:workbench:layout', JSON.stringify(serialized));
      } catch (err) {
        console.error('Failed to save layout', err);
      }
    });
  };

  // Initialize Theme from localStorage and dispose local runtime on unmount
  useEffect(() => {
    const savedTheme = (localStorage.getItem('tikzit:theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);

    // Initialize default diagram if empty
// Clean empty initial state

    return () => {
      if (localRuntimeRef.current) {
        localRuntimeRef.current.dispose();
      }
    };
  }, []);

  const handleResetLayout = () => {
    if (dockviewApiRef.current) {
      localStorage.removeItem('tikzit:workbench:layout');
      loadDefaultLayout(dockviewApiRef.current);
      setPanelCount(dockviewApiRef.current.panels.length);
    }
  };

  const handleCloseOthers = () => {
    const api = dockviewApiRef.current;
    if (api && api.panels.length > 1) {
      const active = api.activePanel || api.panels[0];
      const others = api.panels.filter((p) => p.id !== active.id);
      others.forEach((p) => p.api.close());
      setPanelCount(api.panels.length);
    }
  };

  const handleCloseAll = () => {
    const api = dockviewApiRef.current;
    if (api) {
      api.clear();
      setPanelCount(0);
    }
  };

  return (
    <WorkbenchRuntimeProvider runtime={runtime}>
      <FileDropZone>
      <div
        id="tikzit-workbench"
      className={`workbench-root h-screen flex flex-col ${theme === 'dark' ? 'dockview-theme-dark' : 'dockview-theme-light'}`}
      data-testid="workbench-root"
    >
      {/* Top Header / Command Bar */}
      <header className="h-10 bg-[#161922] border-b border-[#2e3446] px-3 flex items-center justify-between z-10 select-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold tracking-tight text-white text-sm">
            <span className="w-4 h-4 rounded bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-[10px]">T</span>
            <span>TikZiT <span className="text-blue-400 font-normal">Web</span></span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              data-testid="doc-tab-title"
              className="text-xs px-2 py-0.5 rounded bg-[#222634] text-slate-200 border border-[#2e3446] font-medium flex items-center space-x-1"
            >
              <span>{workspaceState.openDocs.find((d: any) => d.id === workspaceState.activeDocId)?.title || activeDiagram.name}</span>
              {(historyState.isDirty || workspaceState.openDocs.find((d: any) => d.id === workspaceState.activeDocId)?.isDirty) && (
                <span className="text-amber-400 font-bold ml-1">*</span>
              )}
            </span>
            <button
              onClick={() => defaultWorkspaceManager.createNewDocument('New Diagram.tikz')}
              data-testid="btn-new-diagram"
              className="text-xs px-1.5 py-0.5 rounded bg-[#222634] hover:bg-[#2e3446] text-slate-300 hover:text-white border border-[#2e3446] transition-colors"
              title="Create new diagram tab"
            >
              +
            </button>
          </div>
        </div>

        {/* Desktop Tool Palette */}
        <div className="flex items-center bg-[#1f2330] rounded p-0.5 border border-[#2e3446] space-x-0.5" role="toolbar" aria-label="Tool Palette">
          <button
            onClick={() => setTool('select')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#282d3e]'
            }`}
            title="Select Tool (S)"
            data-tool="select"
            data-active={activeTool === 'select' ? 'true' : 'false'}
            data-testid="tool-select"
          >
            Select <span className="opacity-60 text-[10px] ml-0.5">(S)</span>
          </button>
          <button
            onClick={() => setTool('vertex')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeTool === 'vertex'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#282d3e]'
            }`}
            title="Vertex Tool (V / N)"
            data-tool="vertex"
            data-active={activeTool === 'vertex' ? 'true' : 'false'}
            data-testid="tool-vertex"
          >
            Vertex <span className="opacity-60 text-[10px] ml-0.5">(V)</span>
          </button>
          <button
            onClick={() => setTool('edge')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeTool === 'edge'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#282d3e]'
            }`}
            title="Edge Tool (E)"
            data-tool="edge"
            data-active={activeTool === 'edge' ? 'true' : 'false'}
            data-testid="tool-edge"
          >
            Edge <span className="opacity-60 text-[10px] ml-0.5">(E)</span>
          </button>
          <button
            onClick={() => setTool('bbox')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeTool === 'bbox'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#282d3e]'
            }`}
            title="Bounding Box Tool (B)"
            data-tool="bbox"
            data-active={activeTool === 'bbox' ? 'true' : 'false'}
            data-testid="tool-bbox"
          >
            BBox <span className="opacity-60 text-[10px] ml-0.5">(B)</span>
          </button>
        </div>

        {/* Global Actions */}
        <div className="flex items-center space-x-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-[#1f2330] rounded p-0.5 border border-[#2e3446] space-x-0.5">
            <button
              onClick={() => defaultTransactionManager.undo()}
              disabled={!historyState.canUndo}
              data-testid="btn-toolbar-undo"
              title="Undo (Cmd+Z)"
              className={`px-2 py-1 rounded text-xs transition-colors ${
                historyState.canUndo
                  ? 'text-slate-200 hover:bg-[#282d3e]'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              ↶ Undo
            </button>
            <button
              onClick={() => defaultTransactionManager.redo()}
              disabled={!historyState.canRedo}
              data-testid="btn-toolbar-redo"
              title="Redo (Cmd+Shift+Z)"
              className={`px-2 py-1 rounded text-xs transition-colors ${
                historyState.canRedo
                  ? 'text-slate-200 hover:bg-[#282d3e]'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              ↷ Redo
            </button>
          </div>

          {/* Version History Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowVersionPopover(!showVersionPopover)}
              data-testid="btn-version-history"
              className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#222634] hover:bg-[#2e3446] border border-[#2e3446] transition-colors flex items-center space-x-1"
              title="Version History & MCard Lineage"
            >
              <span>🕒 History</span>
            </button>
            {showVersionPopover && (
              <VersionPopover
                documentId={workspaceState.activeDocId}
                onClose={() => setShowVersionPopover(false)}
              />
            )}
          </div>
          {/* Tab Actions Menu */}
          <div className="relative">
            <button
              onClick={() => toggleTabsMenu()}
              className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#222634] hover:bg-[#2e3446] border border-[#2e3446] transition-colors"
              title="More Editor Tab Actions"
              data-testid="editor-tabs-more-actions-btn"
            >
              ⋯
            </button>
            {tabsMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-[#2e3446] shadow-xl rounded py-1 z-50 text-xs text-slate-200 min-w-[120px]"
                data-testid="tabs-more-actions-dropdown"
              >
                <button
                  onClick={() => {
                    handleCloseOthers();
                    setTabsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282d3e] hover:text-white transition-colors"
                  data-testid="tabs-close-others-btn"
                >
                  Close Others
                </button>
                <button
                  onClick={() => {
                    handleCloseAll();
                    setTabsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282d3e] hover:text-white transition-colors"
                  data-testid="tabs-close-all-btn"
                >
                  Close All
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleResetLayout}
            className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#222634] hover:bg-[#2e3446] border border-[#2e3446] transition-colors"
            title="Reset to default 4-panel layout"
            data-testid="btn-reset-layout"
          >
            Reset Layout
          </button>

          {/* Theme Selector Button & Menu */}
          <div className="relative">
            <button
              id="theme-selector-btn"
              data-testid="btn-theme-toggle"
              onClick={() => {
                toggleThemeMenu();
                toggleTheme();
              }}
              className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-[#222634] hover:bg-[#2e3446] border border-[#2e3446] transition-colors"
              title="Toggle or Select Dark/Light Theme"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            {themeMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-[#2e3446] shadow-xl rounded py-1 z-50 text-xs text-slate-200 min-w-[110px]">
                <button
                  data-theme="dark"
                  onClick={() => {
                    setTheme('dark');
                    setThemeMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282d3e] hover:text-white transition-colors"
                >
                  🌙 Dark
                </button>
                <button
                  data-theme="light"
                  onClick={() => {
                    setTheme('light');
                    setThemeMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282d3e] hover:text-white transition-colors"
                >
                  ☀️ Light
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace with Left Activity Bar, Collapsible Drawer, & Center Dockview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar Rail */}
        <nav
          id="activity-bar"
          className="w-12 bg-[#12141a] border-r border-[#2e3446] flex flex-col items-center py-2 space-y-3 z-10 select-none flex-shrink-0"
          aria-label="Activity Bar"
        >
          <button
            id="toggle-source-drawer"
            onClick={() => toggleDrawer()}
            className="w-8 h-8 rounded flex items-center justify-center text-blue-400 bg-blue-950/40 border border-blue-500/30 hover:bg-blue-900/50 transition-colors"
            title="Toggle Source Drawer (Cmd+B)"
          >
            📐
          </button>
          <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1a1d26]" title="Styles & Palettes">
            🎨
          </button>
          <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1a1d26]" title="Corpus Gallery">
            📚
          </button>
          <div className="flex-1" />
          <a
            href="https://github.com/xlp0/tikzit"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1a1d26]"
            title="GitHub Repository (xlp0/tikzit)"
          >
            🐙
          </a>
        </nav>

        {/* Collapsible Source Drawer Island */}
        <aside
          id="source-drawer-island"
          className={`transition-all duration-150 flex flex-col bg-[#161922] border-r border-[#2e3446] overflow-hidden flex-shrink-0 ${
            isDrawerCollapsed ? 'collapsed hidden w-0' : 'w-64'
          }`}
          style={{ width: isDrawerCollapsed ? 0 : drawerWidth }}
        >
          <div className="h-8 border-b border-[#2e3446] px-3 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>EXPLORER</span>
            <span className="text-[10px] text-slate-500 font-mono">ZX-CORPUS</span>
          </div>
          <div className="p-2 border-b border-[#2e3446]">
            <input
              type="text"
              placeholder="Search diagrams or corpus..."
              className="w-full px-2 py-1 text-xs bg-[#0d1117] border border-[#30363d] rounded text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 text-xs text-slate-400 space-y-1">
            <div className="px-2 py-1 rounded bg-[#222634] text-white flex items-center space-x-1.5 cursor-pointer">
              <span>📄</span>
              <span className="truncate">01_spider_fusion.tikz</span>
            </div>
            <div className="px-2 py-1 rounded hover:bg-[#1a1d26] text-slate-300 flex items-center space-x-1.5 cursor-pointer">
              <span>📄</span>
              <span className="truncate">02_bialgebra_law.tikz</span>
            </div>
            <div className="px-2 py-1 rounded hover:bg-[#1a1d26] text-slate-300 flex items-center space-x-1.5 cursor-pointer">
              <span>📄</span>
              <span className="truncate">03_cnot_zx_equivalence.tikz</span>
            </div>
          </div>
        </aside>

        {/* Resizable Sash between Drawer and Dockview */}
        {!isDrawerCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            className="w-1 bg-[#2e3446] hover:bg-blue-500 cursor-col-resize select-none transition-colors z-10"
            title="Resize Drawer (Double-click to reset)"
            onDoubleClick={() => setDrawerWidth(260)}
          />
        )}

        {/* Depressed State / Welcome View */}
        {isWorkbenchDepressed && (
          <div
            className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] p-8 text-center"
            data-testid="welcome-depressed-view"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
              T
            </div>
            <h2 className="text-lg font-bold text-white mb-2">TikZiT Spatial Workbench Depressed</h2>
            <p className="text-xs text-slate-400 mb-6 max-w-sm">
              The workbench viewport is currently focal-minimized. All {panelCount} panels and open editor tabs are safely preserved in Nanostores and Dockview state.
            </p>
            <button
              data-action="restore-dockview"
              onClick={() => restoreWorkbench()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-md transition-colors"
            >
              Restore Workbench View
            </button>
          </div>
        )}

        {/* Dockview Container Host */}
        <main
          id="dockview-host"
          className="flex-1 h-full relative"
          data-testid="dockview-host"
          style={{ display: isWorkbenchDepressed ? 'none' : 'block' }}
        >
          <DockviewReact
            components={components}
            defaultTabComponent={CustomTabComponent}
            onReady={onReady}
            className={`${theme === 'dark' ? 'dockview-theme-dark' : 'dockview-theme-light'} h-full w-full`}
          />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer
        id="status-bar"
        className="h-6 bg-[#0f1117] border-t border-[#2e3446] px-3 flex items-center justify-between text-[11px] text-slate-400 select-none z-10"
        data-testid="status-bar"
      >
        <div className="flex items-center space-x-3">
          <span className="flex items-center font-medium text-slate-200">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
            Tool: <span className="ml-1 uppercase text-blue-400 font-bold">{activeTool.toUpperCase()}</span>
          </span>
          <span className="text-slate-500">|</span>
          <span>Cursor: X: 0.00, Y: 0.00</span>
          <span className="text-slate-500">|</span>
          <span>Nodes: 2 · Edges: 2</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            data-testid="status-dockview-focal"
            onClick={() => {
              if (isWorkbenchDepressed) {
                restoreWorkbench();
              } else {
                depressWorkbench();
              }
            }}
            className="hover:text-white transition-colors flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#1a1d26]"
            title="Toggle Focal View (Depress/Restore Workbench)"
          >
            <span>⤢ Focal</span>
          </button>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-emerald-400">CID: blake3:7a4f32...</span>
          <span className="text-slate-500">|</span>
          <span data-testid="panel-count-indicator">Dockview: {panelCount} panels</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">GPL-3.0</span>
        </div>
      </footer>
      </div>
      </FileDropZone>
    </WorkbenchRuntimeProvider>
  );
};

export default TikzitSpatialWorkbench;
