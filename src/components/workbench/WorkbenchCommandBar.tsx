import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { MacWindowChrome } from './MacWindowChrome';
import { defaultTransactionManager } from '../../core/history/TransactionManager';
import { defaultWorkspaceManager } from '../../services/workspace/WorkspaceManager';
import type { ToolMode } from '../../services/kernel';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';

interface WorkbenchCommandBarProps {
  runtime: WorkbenchRuntime;
  onResetLayout(): void;
  onCloseOthers(): void;
  onCloseAll(): void;
}

export const WorkbenchCommandBar: React.FC<WorkbenchCommandBarProps> = ({ runtime, onResetLayout, onCloseOthers, onCloseAll }) => {
  const [historyState, setHistoryState] = useState<{ canUndo: boolean; canRedo: boolean; isDirty: boolean; lastCommand?: string }>(defaultTransactionManager.getState());
  const [workspaceState, setWorkspaceState] = useState(defaultWorkspaceManager.getState());
  const [showVersionPopover, setShowVersionPopover] = useState(false);
  const activeTool = useStore(runtime.stores.$toolMode);
  const theme = useStore(runtime.stores.$theme);
  const layout = useStore(runtime.stores.$workbenchLayout);

  useEffect(() => {
    const unsubHistory = defaultTransactionManager.subscribe(setHistoryState);
    const unsubWorkspace = defaultWorkspaceManager.subscribe(setWorkspaceState);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) defaultTransactionManager.redo();
        else defaultTransactionManager.undo();
      } else if (key === 'y') {
        event.preventDefault();
        defaultTransactionManager.redo();
      } else if (key === 's') {
        event.preventDefault();
        const active = defaultWorkspaceManager.getActiveDocument();
        if (active?.id.startsWith('zx:examples:')) void runtime.saveActiveCorpusEntry();
        else void defaultWorkspaceManager.saveActive();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsubHistory();
      unsubWorkspace();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [runtime]);

  const setTheme = useCallback((nextTheme: 'dark' | 'light') => {
    runtime.stores.$theme.set(nextTheme);
    if (typeof document !== 'undefined') {
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('tikzit:theme', nextTheme);
      } catch {}
    }
  }, [runtime]);
  const setTool = (tool: ToolMode) => {
    runtime.ctx.tool.setTool(tool);
    runtime.stores.$toolMode.set(tool);
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem('tikzit:theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
  }, [setTheme]);

  return (
    <MacWindowChrome
      documentTitle={workspaceState.openDocs.find((document) => document.id === workspaceState.activeDocId)?.title || '01_spider_fusion.tikz'}
      isDirty={historyState.isDirty || !!workspaceState.openDocs.find((document) => document.id === workspaceState.activeDocId)?.isDirty}
      activeTool={activeTool}
      onSelectTool={setTool}
      canUndo={historyState.canUndo}
      canRedo={historyState.canRedo}
      onUndo={() => defaultTransactionManager.undo()}
      onRedo={() => defaultTransactionManager.redo()}
      showVersionPopover={showVersionPopover}
      onToggleVersionPopover={() => setShowVersionPopover((shown) => !shown)}
      activeDocId={workspaceState.activeDocId}
      tabsMenuOpen={layout.tabsMenuOpen}
      onToggleTabsMenu={() => runtime.stores.$workbenchLayout.setKey('tabsMenuOpen', !layout.tabsMenuOpen)}
      onCloseOthers={() => {
        onCloseOthers();
        runtime.stores.$workbenchLayout.setKey('tabsMenuOpen', false);
      }}
      onCloseAll={() => {
        onCloseAll();
        runtime.stores.$workbenchLayout.setKey('tabsMenuOpen', false);
      }}
      onResetLayout={onResetLayout}
      theme={theme}
      themeMenuOpen={layout.themeMenuOpen}
      onToggleThemeMenu={() => {
        runtime.stores.$workbenchLayout.setKey('themeMenuOpen', !layout.themeMenuOpen);
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }}
      onSetTheme={(nextTheme) => {
        setTheme(nextTheme);
        runtime.stores.$workbenchLayout.setKey('themeMenuOpen', false);
      }}
      onNewDiagram={() => defaultWorkspaceManager.createNewDocument('New Diagram.tikz')}
    />
  );
};
