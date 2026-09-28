import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { MacWindowChrome } from './MacWindowChrome';
import { CloseTabDialog } from './CloseTabDialog';
import { ExportDiagramDialog } from './ExportDiagramDialog';
import { ExportCollectionDialog } from './ExportCollectionDialog';
import { defaultTransactionManager } from '../../core/history/TransactionManager';
import { defaultWorkspaceManager, type DocumentRecord } from '../../services/workspace/WorkspaceManager';
import { defaultDocumentStore } from '../../services/storage/DocumentStore';
import { isDiagramHandle } from '../../services/clm/corpusPersistence';
import { safeParse } from '../../core/parser/parser';
import { selectDiagramSaveState } from '../../services/clm/saveAffordanceState';
import type { ToolMode } from '../../services/kernel';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';

interface WorkbenchCommandBarProps {
  runtime: WorkbenchRuntime;
  onResetLayout(): void;
  onCloseOthers(): void;
  onCloseAll(): void;
}

interface PendingCloseState {
  docsToClose: DocumentRecord[];
  currentIndex: number;
  mode: 'single' | 'others' | 'all';
}

export const WorkbenchCommandBar: React.FC<WorkbenchCommandBarProps> = ({ runtime, onResetLayout, onCloseOthers, onCloseAll }) => {
  const [historyState, setHistoryState] = useState<{ canUndo: boolean; canRedo: boolean; isDirty: boolean; lastCommand?: string }>(defaultTransactionManager.getState());
  const [workspaceState, setWorkspaceState] = useState(defaultWorkspaceManager.getState());
  const [showVersionPopover, setShowVersionPopover] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [successPillHandle, setSuccessPillHandle] = useState<string | null>(null);
  const successPillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasDraftMapRef = useRef<Map<string, boolean>>(new Map());
  const draftPendingPersistenceRef = useRef<Set<string>>(new Set());

  const activeTool = useStore(runtime.stores.$toolMode);
  const theme = useStore(runtime.stores.$theme);
  const layout = useStore(runtime.stores.$workbenchLayout);
  const corpusView = useStore(runtime.stores.$corpusView);
  const documentHead = useStore(runtime.stores.$documentHead);
  const saveStates = useStore(runtime.stores.$diagramSaveState);
  const exportDialogState = useStore(runtime.stores.$exportDialogState);
  const exportCollectionDialogState = useStore(runtime.stores.$exportCollectionDialogState);

  const activeDoc = workspaceState.openDocs.find((document) => document.id === workspaceState.activeDocId);

  // Track which diagrams are drafts so we know when first persisted commit happens
  useEffect(() => {
    for (const doc of workspaceState.openDocs) {
      if (isDiagramHandle(doc.id) && !doc.hash && !wasDraftMapRef.current.has(doc.id)) {
        wasDraftMapRef.current.set(doc.id, true);
      }
    }
  }, [workspaceState.openDocs]);

  const triggerSuccessPill = useCallback((handle: string) => {
    if (successPillTimerRef.current) clearTimeout(successPillTimerRef.current);
    setSuccessPillHandle(handle);
    successPillTimerRef.current = setTimeout(() => {
      setSuccessPillHandle(null);
      successPillTimerRef.current = null;
    }, 1800);
  }, []);

  // Listen to document persistence events
  useEffect(() => {
    const unsub = runtime.ctx.on('tikzit/document:persisted', (ev: { handle: string; hash: string }) => {
      const active = defaultWorkspaceManager.getActiveDocument();
      if (
        active?.id === ev.handle &&
        (draftPendingPersistenceRef.current.has(ev.handle) || wasDraftMapRef.current.get(ev.handle))
      ) {
        draftPendingPersistenceRef.current.delete(ev.handle);
        wasDraftMapRef.current.delete(ev.handle);
        triggerSuccessPill(ev.handle);
        setLiveAnnouncement(`${active.title} saved to MCard.`);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [runtime, triggerSuccessPill]);

  const affordance = activeDoc
    ? selectDiagramSaveState({
        handle: activeDoc.id,
        workspaceDoc: activeDoc,
        documentHead,
        corpusView,
        saveState: activeDoc.id ? saveStates[activeDoc.id] : undefined,
        historyStateIsDirty: historyState.isDirty,
      })
    : null;

  const isDirty = affordance?.isDirty ?? (historyState.isDirty || !!activeDoc?.isDirty);
  const isSessionOnly = affordance?.isSessionOnly ?? false;
  const saveStatusText = affordance?.statusText ?? '';

  let docBadge: 'Draft' | 'Diagram' | 'Example' | undefined;
  if (activeDoc?.id.startsWith('zx:examples:')) {
    docBadge = 'Example';
  } else if (activeDoc?.id.startsWith('zx:diagrams:')) {
    docBadge = activeDoc.hash ? 'Diagram' : 'Draft';
  }

  // Clear success pill if document switches or becomes dirty
  useEffect(() => {
    if (successPillHandle && (!activeDoc || activeDoc.id !== successPillHandle || isDirty)) {
      if (successPillTimerRef.current) {
        clearTimeout(successPillTimerRef.current);
        successPillTimerRef.current = null;
      }
      setSuccessPillHandle(null);
    }
  }, [activeDoc, isDirty, successPillHandle]);

  useEffect(() => {
    return () => {
      if (successPillTimerRef.current) clearTimeout(successPillTimerRef.current);
    };
  }, []);

  const handleSave = useCallback(async () => {
    const active = defaultWorkspaceManager.getActiveDocument();
    if (!active) return;
    if (isDiagramHandle(active.id)) {
      const wasDraft = !active.hash;
      if (wasDraft) {
        draftPendingPersistenceRef.current.add(active.id);
      }
      const result = await runtime.saveDiagram(active.id);
      if (result.success) {
        if (result.persisted && wasDraft) {
          draftPendingPersistenceRef.current.delete(active.id);
          wasDraftMapRef.current.delete(active.id);
          triggerSuccessPill(active.id);
        }
        setLiveAnnouncement(`${active.title} saved${result.sequence ? ` as version ${result.sequence}` : ''}.`);
      } else {
        draftPendingPersistenceRef.current.delete(active.id);
        setLiveAnnouncement(`Save failed for ${active.title}: ${result.reason || 'Error'}`);
      }
    } else {
      await defaultWorkspaceManager.saveActive();
    }
  }, [runtime, triggerSuccessPill]);

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
        void handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsubHistory();
      unsubWorkspace();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

  const handleRetryFlush = useCallback(() => {
    void runtime.retryFlush().then((ok) => {
      const active = defaultWorkspaceManager.getActiveDocument();
      if (ok && active && (draftPendingPersistenceRef.current.has(active.id) || wasDraftMapRef.current.get(active.id)) && !active.isDirty) {
        draftPendingPersistenceRef.current.delete(active.id);
        wasDraftMapRef.current.delete(active.id);
        triggerSuccessPill(active.id);
      }
    });
  }, [runtime, triggerSuccessPill]);

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

  const [pendingClose, setPendingClose] = useState<PendingCloseState | null>(null);

  const executeCloseMode = useCallback((mode: 'single' | 'others' | 'all') => {
    if (mode === 'single') {
      const active = defaultWorkspaceManager.getActiveDocument();
      if (active) {
        defaultWorkspaceManager.closeDocument(active.id, () => runtime.createDiagram().document);
      }
    } else if (mode === 'others') {
      const active = defaultWorkspaceManager.getActiveDocument();
      const others = defaultWorkspaceManager.getOpenDocuments().filter((d) => d.id !== active?.id);
      for (const d of others) {
        defaultWorkspaceManager.closeDocument(d.id, () => runtime.createDiagram().document);
      }
      onCloseOthers();
    } else if (mode === 'all') {
      const all = defaultWorkspaceManager.getOpenDocuments();
      for (const d of all) {
        defaultWorkspaceManager.closeDocument(d.id, () => runtime.createDiagram().document);
      }
      onCloseAll();
    }
    const next = defaultWorkspaceManager.getActiveDocument();
    if (next) {
      runtime.stores.$activeDiagram.set({ name: next.title, handle: next.id });
      const parsed = safeParse(next.content);
      if (parsed.success && parsed.ast) runtime.ctx.graph.setAST(parsed.ast);
    }
    setPendingClose(null);
  }, [onCloseOthers, onCloseAll, runtime]);

  const handleCloseActiveTab = useCallback(() => {
    const active = defaultWorkspaceManager.getActiveDocument();
    if (!active) return;
    const isDocSessionOnly = isDiagramHandle(active.id) && (corpusView.persistence === 'non-persistent' || !!corpusView.persistenceError);
    if (active.isDirty || isDocSessionOnly) {
      setPendingClose({
        docsToClose: [active],
        currentIndex: 0,
        mode: 'single',
      });
    } else {
      defaultWorkspaceManager.closeDocument(active.id, () => runtime.createDiagram().document);
      const next = defaultWorkspaceManager.getActiveDocument();
      if (next) {
        runtime.stores.$activeDiagram.set({ name: next.title, handle: next.id });
        const parsed = safeParse(next.content);
        if (parsed.success && parsed.ast) runtime.ctx.graph.setAST(parsed.ast);
      }
    }
  }, [runtime, corpusView]);

  const handleCloseOthersWithPrompt = useCallback(() => {
    const active = defaultWorkspaceManager.getActiveDocument();
    const all = defaultWorkspaceManager.getOpenDocuments();
    const others = all.filter((d) => d.id !== active?.id);
    const isGlobalSessionOnly = corpusView.persistence === 'non-persistent' || !!corpusView.persistenceError;
    const promptOthers = others.filter((d) => d.isDirty || (isDiagramHandle(d.id) && isGlobalSessionOnly));
    if (promptOthers.length > 0) {
      setPendingClose({
        docsToClose: promptOthers,
        currentIndex: 0,
        mode: 'others',
      });
    } else {
      for (const d of others) {
        defaultWorkspaceManager.closeDocument(d.id, () => runtime.createDiagram().document);
      }
      onCloseOthers();
    }
  }, [onCloseOthers, runtime, corpusView]);

  const handleCloseAllWithPrompt = useCallback(() => {
    const all = defaultWorkspaceManager.getOpenDocuments();
    const isGlobalSessionOnly = corpusView.persistence === 'non-persistent' || !!corpusView.persistenceError;
    const promptAll = all.filter((d) => d.isDirty || (isDiagramHandle(d.id) && isGlobalSessionOnly));
    if (promptAll.length > 0) {
      setPendingClose({
        docsToClose: promptAll,
        currentIndex: 0,
        mode: 'all',
      });
    } else {
      for (const d of all) {
        defaultWorkspaceManager.closeDocument(d.id, () => runtime.createDiagram().document);
      }
      onCloseAll();
      const next = defaultWorkspaceManager.getActiveDocument();
      if (next) {
        runtime.stores.$activeDiagram.set({ name: next.title, handle: next.id });
        const parsed = safeParse(next.content);
        if (parsed.success && parsed.ast) runtime.ctx.graph.setAST(parsed.ast);
      }
    }
  }, [onCloseAll, runtime, corpusView]);

  const handleDialogSave = useCallback(async (applyToAll: boolean) => {
    if (!pendingClose) return;
    const currentDoc = pendingClose.docsToClose[pendingClose.currentIndex];
    if (currentDoc) {
      if (isDiagramHandle(currentDoc.id)) {
        const res = await runtime.saveDiagram(currentDoc.id);
        if (!res.success) {
          return;
        }
      } else {
        await defaultDocumentStore.saveDocument({
          id: currentDoc.id,
          title: currentDoc.title,
          content: currentDoc.content,
        });
        defaultWorkspaceManager.markClean(currentDoc.id);
      }
    }

    if (applyToAll) {
      for (let i = pendingClose.currentIndex + 1; i < pendingClose.docsToClose.length; i++) {
        const doc = pendingClose.docsToClose[i];
        if (isDiagramHandle(doc.id)) {
          const res = await runtime.saveDiagram(doc.id);
          if (!res.success) {
            setPendingClose({
              ...pendingClose,
              currentIndex: i,
            });
            return;
          }
        } else {
          await defaultDocumentStore.saveDocument({
            id: doc.id,
            title: doc.title,
            content: doc.content,
          });
          defaultWorkspaceManager.markClean(doc.id);
        }
      }
      executeCloseMode(pendingClose.mode);
    } else if (pendingClose.currentIndex + 1 < pendingClose.docsToClose.length) {
      setPendingClose({
        ...pendingClose,
        currentIndex: pendingClose.currentIndex + 1,
      });
    } else {
      executeCloseMode(pendingClose.mode);
    }
  }, [pendingClose, runtime, executeCloseMode]);

  const handleDialogDiscard = useCallback((applyToAll: boolean) => {
    if (!pendingClose) return;
    const currentDoc = pendingClose.docsToClose[pendingClose.currentIndex];
    if (currentDoc) {
      defaultWorkspaceManager.markClean(currentDoc.id);
    }

    if (applyToAll) {
      for (let i = pendingClose.currentIndex + 1; i < pendingClose.docsToClose.length; i++) {
        defaultWorkspaceManager.markClean(pendingClose.docsToClose[i].id);
      }
      executeCloseMode(pendingClose.mode);
    } else if (pendingClose.currentIndex + 1 < pendingClose.docsToClose.length) {
      setPendingClose({
        ...pendingClose,
        currentIndex: pendingClose.currentIndex + 1,
      });
    } else {
      executeCloseMode(pendingClose.mode);
    }
  }, [pendingClose, executeCloseMode]);

  const handleDialogCancel = useCallback(() => {
    setPendingClose(null);
  }, []);

  return (
    <>
      <MacWindowChrome
        runtime={runtime}
        documentTitle={activeDoc?.title || '01_spider_fusion.tikz'}
        isDirty={isDirty}
        docBadge={docBadge}
        saveStatusText={saveStatusText}
        saveError={affordance?.error}
        isSessionOnly={isSessionOnly}
        onRetryFlush={handleRetryFlush}
        onSave={handleSave}
        isSaving={affordance?.isSaving ?? false}
        buttonKind={affordance?.buttonKind ?? 'none'}
        buttonLabel={affordance?.buttonLabel}
        buttonTooltip={affordance?.buttonTooltip}
        showSuccessPill={successPillHandle === activeDoc?.id && !isDirty}
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
        onCloseActiveTab={handleCloseActiveTab}
        onCloseOthers={() => {
          handleCloseOthersWithPrompt();
          runtime.stores.$workbenchLayout.setKey('tabsMenuOpen', false);
        }}
        onCloseAll={() => {
          handleCloseAllWithPrompt();
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
        onNewDiagram={() => runtime.createDiagram()}
        onExport={() => runtime.openExportDialog()}
      />
      <div data-testid="save-live-announcer" role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>
      {pendingClose && pendingClose.docsToClose[pendingClose.currentIndex] && (
        <CloseTabDialog
          documentTitle={pendingClose.docsToClose[pendingClose.currentIndex].title || 'Untitled'}
          isBulk={pendingClose.docsToClose.length > 1}
          onSave={handleDialogSave}
          onDiscard={handleDialogDiscard}
          onCancel={handleDialogCancel}
        />
      )}
      {exportDialogState.isOpen && (
        <ExportDiagramDialog
          runtime={runtime}
          onClose={() => runtime.closeExportDialog()}
        />
      )}
      {exportCollectionDialogState.isOpen && (
        <ExportCollectionDialog
          runtime={runtime}
          onClose={() => runtime.closeExportCollectionDialog()}
        />
      )}
      <div
        role="status"
        aria-live="polite"
        data-testid="export-live-announcer"
        className="sr-only"
      >
        {exportDialogState.lastAnnouncement || ''}
      </div>
    </>
  );
};
