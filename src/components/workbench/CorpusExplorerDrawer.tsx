/**
 * src/components/workbench/CorpusExplorerDrawer.tsx - Sprint 40 Decomposition
 * Pure composition root mounting decomposed drawer viewlets.
 * Satisfies Contract D (≤ 120 LOC ceiling) & Contract B.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';
import { isDiagramHandle } from '../../services/clm/corpusPersistence';
import { defaultWorkspaceManager } from '../../services/workspace/WorkspaceManager';
import { ExplorerSearchBar } from './explorer/ExplorerSearchBar';
import { DrawerViewSwitcher } from './explorer/DrawerViewSwitcher';
import { DrawerBanners } from './explorer/DrawerBanners';
import { DrawerPersistenceFooter } from './explorer/DrawerPersistenceFooter';
import { DiagramListView } from './explorer/DiagramListView';
import { MCardExplorerPane } from './MCardExplorerPane';
import type { ExplorerItem } from './explorer/ExplorerEntryRow';

export interface CorpusExplorerDrawerProps {
  runtime: WorkbenchRuntime;
  activeHandle: string;
  isCollapsed?: boolean;
  width?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const CorpusExplorerDrawer: React.FC<CorpusExplorerDrawerProps> = ({
  runtime, activeHandle, isCollapsed = false, width, isOpen
}) => {
  if (isOpen !== undefined && !isOpen) return null;
  if (isCollapsed) return null;

  const corpusQuery = useStore(runtime.stores.$corpusQuery);
  const corpusView = useStore(runtime.stores.$corpusView);
  const sessionRecovery = useStore(runtime.stores.$sessionRecovery);

  const [openDocs, setOpenDocs] = useState(defaultWorkspaceManager.getOpenDocuments());
  const [debouncedQuery, setDebouncedQuery] = useState(corpusQuery);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [drawerView, setDrawerView] = useState<'diagrams' | 'mcards'>('diagrams');

  useEffect(() => defaultWorkspaceManager.subscribe((s) => setOpenDocs([...s.openDocs])), []);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(corpusQuery), 100);
    return () => window.clearTimeout(t);
  }, [corpusQuery]);

  const showArchived = sessionRecovery.showArchived;
  const listing = runtime.corpusExplorer.listCorpusEntries({ includeArchived: showArchived });
  const allCorpusHandles = new Set(
    runtime.corpusExplorer.listCorpusEntries({ includeArchived: true }).entries.map((e) => e.handle)
  );

  const drafts: ExplorerItem[] = useMemo(() => openDocs
    .filter((doc) => !allCorpusHandles.has(doc.id) && isDiagramHandle(doc.id) && doc.id.startsWith('zx:diagrams:'))
    .map((doc) => ({
      handle: doc.id, title: doc.title, type: 'draft' as const, badge: 'Draft' as const,
      nodeCount: doc.ast?.nodes?.length ?? 0, edgeCount: doc.ast?.edges?.length ?? 0,
      updatedAt: doc.updatedAt, createdAt: doc.createdAt, archived: false, isImported: false, version: 0,
    })), [openDocs, allCorpusHandles]);

  const committedItems: ExplorerItem[] = useMemo(() => listing.entries.map((entry) => {
    const isExample = entry.handle.startsWith('zx:examples:');
    let version = 1;
    try { const h = runtime.mcardCollection.history(entry.handle); if (h.length > 0) version = h.length; } catch { version = 1; }
    return {
      handle: entry.handle, title: entry.title, type: isExample ? ('example' as const) : ('diagram' as const),
      badge: isExample ? ('Example' as const) : ('Diagram' as const), nodeCount: entry.nodeCount,
      edgeCount: entry.edgeCount, updatedAt: entry.updatedAt, createdAt: entry.createdAt ?? entry.updatedAt,
      archived: Boolean(entry.archived), isImported: Boolean(entry.isImported), version,
    };
  }), [listing, runtime]);

  const allItems = useMemo(() => [...drafts, ...committedItems], [drafts, committedItems]);

  return (
    <aside
      style={{ width }}
      className="corpus-explorer-drawer h-full bg-neutral-900 border-r border-neutral-800 flex flex-col select-none relative"
      data-testid="drawer-corpus-explorer"
    >
      <div data-testid="live-announcer" aria-live="polite" className="sr-only">{liveAnnouncement}</div>
      <DrawerBanners
        recoveredCount={sessionRecovery.recoveredCount} persistence={corpusView.persistence}
        onReviewRecovery={() => setLiveAnnouncement('Reviewing recovered drafts')}
        onDiscardRecovery={() => runtime.discardAllRecovered()}
      />
      <DrawerViewSwitcher view={drawerView} onViewChange={setDrawerView} />
      {drawerView === 'mcards' ? (
        <MCardExplorerPane runtime={runtime} onAnnouncement={setLiveAnnouncement} />
      ) : (
        <>
          <ExplorerSearchBar
            query={corpusQuery} onQueryChange={(q) => runtime.stores.$corpusQuery.set(q)}
            showArchived={showArchived} onToggleShowArchived={() => runtime.stores.$sessionRecovery.set({ ...sessionRecovery, showArchived: !showArchived })}
            onNewDiagram={() => runtime.createDiagram()} onExportCollection={() => runtime.openExportCollectionDialog()}
          />
          <DiagramListView
            items={allItems} query={debouncedQuery} activeHandle={activeHandle}
            onSelect={(h) => runtime.openCorpusEntry(h)}
            onRenameCommit={async (h, t) => { await runtime.renameDiagram(h, t); setLiveAnnouncement(`Renamed diagram to ${t}`); }}
            onDuplicate={(h) => runtime.duplicateDiagram(h)} onToggleArchive={(h, arch) => runtime.archiveDiagram(h, arch)}
            onExport={(h) => runtime.openExportDialog(h)}
            onPreview={(h) => { runtime.stores.$previewCardHandle.set(h); setLiveAnnouncement(`Previewing card ${h}`); }}
            onCreateFirstDiagram={() => runtime.createDiagram()}
          />
        </>
      )}
      <DrawerPersistenceFooter persistence={corpusView.persistence} persistenceError={corpusView.persistenceError} />
    </aside>
  );
};
