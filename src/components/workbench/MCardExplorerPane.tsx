/**
 * src/components/workbench/MCardExplorerPane.tsx - Sprint 35 Phase C
 * Thin host adapter mounting the generic MCardExplorer inside the corpus drawer.
 * Lists ALL MCards in the sovereign VFS (every MIME/type), not only diagrams.
 * Selection hands off to the docked 'card-viewer' panel via $previewCardHandle.
 * Contract D ceiling: <= 140 LOC.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { MCardExplorer, MCardExplorerEngine } from '../../packages/mcard-explorer';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';
import {
  ensureVcsInitialized,
  getExplorerQueryFacade,
  getExplorerActionRegistry,
  syncCorpusIntoVfs,
} from '../../services/clm/vcsAdapterInstance';

export interface MCardExplorerPaneProps {
  runtime: WorkbenchRuntime;
  onAnnouncement?: (message: string) => void;
}

export const MCardExplorerPane: React.FC<MCardExplorerPaneProps> = ({ runtime, onAnnouncement }) => {
  const [vfsError, setVfsError] = useState<string | null>(null);
  const [vfsReady, setVfsReady] = useState(false);

  const { engine, actionRegistry } = useMemo(() => {
    const registry = getExplorerActionRegistry();
    return {
      engine: new MCardExplorerEngine(getExplorerQueryFacade(), registry),
      actionRegistry: registry,
    };
  }, []);

  // The VFS backend throws until init() runs — gate the explorer on it.
  // After init, backfill corpus diagram handles into the sovereign VFS so the
  // MCard view shows existing diagrams alongside all other card types.
  useEffect(() => {
    let cancelled = false;
    ensureVcsInitialized()
      .then(() => syncCorpusIntoVfs(
        runtime.corpusExplorer.listCorpusEntries({ includeArchived: true }).entries,
        (handle) => {
          try {
            const hash = runtime.mcardCollection.resolveHandle(handle);
            const card = hash ? runtime.mcardCollection.get(hash) : null;
            return card?.payload.kind === 'text' ? card.payload.value : null;
          } catch { return null; }
        }
      ))
      .then(() => { if (!cancelled) setVfsReady(true); })
      .catch((err) => {
        if (!cancelled) setVfsError(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, [runtime]);

  // Live-refresh when the VFS changes (e.g., "Commit to Database" artifact cards)
  useEffect(() => {
    if (!vfsReady) return;
    return getExplorerQueryFacade().subscribe(() => {
      void engine.refresh();
    });
  }, [engine, vfsReady]);

  const handleSelect = (handle: string) => {
    runtime.stores.$previewCardHandle.set(handle);
    onAnnouncement?.(`Previewing card ${handle}`);
  };

  const handleAction = async (actionId: string, payload?: unknown) => {
    const p = (payload ?? {}) as { handle?: string };
    try {
      await actionRegistry.execute(actionId, p.handle ?? '', p);
    } catch (err) {
      console.warn(`[MCardExplorerPane] Action '${actionId}' failed:`, err);
    }
  };

  if (vfsError) {
    return (
      <div data-testid="mcard-explorer-pane-error" className="p-3 text-xs text-rose-400">
        Sovereign VFS unavailable: {vfsError}
      </div>
    );
  }
  if (!vfsReady) {
    return (
      <div data-testid="mcard-explorer-pane-loading" className="p-3 text-xs text-neutral-500">
        Loading sovereign corpus…
      </div>
    );
  }

  return (
    <div data-testid="mcard-explorer-pane" className="flex-1 min-h-0 flex flex-col overflow-hidden p-1">
      <MCardExplorer
        engine={engine}
        actionRegistry={actionRegistry}
        initialShowPreview={false}
        onCardSelect={handleSelect}
        onAction={handleAction}
      />
    </div>
  );
};
