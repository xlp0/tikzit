import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';
import { isDiagramHandle } from '../../services/clm/corpusPersistence';
import { defaultWorkspaceManager } from '../../services/workspace/WorkspaceManager';

interface CorpusExplorerDrawerProps {
  runtime: WorkbenchRuntime;
  activeHandle: string;
  isCollapsed: boolean;
  width: number;
}

export const CorpusExplorerDrawer: React.FC<CorpusExplorerDrawerProps> = ({ runtime, activeHandle, isCollapsed, width }) => {
  const corpusQuery = useStore(runtime.stores.$corpusQuery);
  const corpusEntries = useStore(runtime.stores.$corpusEntries);
  const corpusView = useStore(runtime.stores.$corpusView);
  const sessionRecovery = useStore(runtime.stores.$sessionRecovery);
  const [openDocs, setOpenDocs] = useState(defaultWorkspaceManager.getOpenDocuments());
  const [debouncedQuery, setDebouncedQuery] = useState(corpusQuery);
  const [exportNotice, setExportNotice] = useState('');
  const [openError, setOpenError] = useState('');
  const [openMenuHandle, setOpenMenuHandle] = useState<string | null>(null);
  const [editingHandle, setEditingHandle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    return defaultWorkspaceManager.subscribe((state) => {
      setOpenDocs([...state.openDocs]);
    });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(corpusQuery), 100);
    return () => window.clearTimeout(timeout);
  }, [corpusQuery]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuHandle(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const showArchived = sessionRecovery.showArchived;
  const listing = runtime.corpusExplorer.listCorpusEntries({ includeArchived: showArchived });
  const allCorpusHandles = new Set(
    runtime.corpusExplorer.listCorpusEntries({ includeArchived: true }).entries.map((e) => e.handle)
  );

  // 1. Open drafts (uncommitted user diagrams)
  const drafts = openDocs
    .filter((doc) => !allCorpusHandles.has(doc.id) && isDiagramHandle(doc.id) && doc.id.startsWith('zx:diagrams:'))
    .map((doc) => ({
      handle: doc.id,
      title: doc.title,
      type: 'draft' as const,
      badge: 'Draft' as const,
      nodeCount: doc.ast?.nodes?.length ?? 0,
      edgeCount: doc.ast?.edges?.length ?? 0,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      archived: false,
      isImported: false,
      version: 0,
    }));

  // 2. Committed diagrams & examples
  const committedItems = listing.entries.map((entry) => {
    const isExample = entry.handle.startsWith('zx:examples:');
    let version = 1;
    try {
      const history = runtime.mcardCollection.history(entry.handle);
      if (history.length > 0) version = history.length;
    } catch {
      version = 1;
    }
    return {
      handle: entry.handle,
      title: entry.title,
      type: isExample ? ('example' as const) : ('diagram' as const),
      badge: isExample ? ('Example' as const) : ('Diagram' as const),
      nodeCount: entry.nodeCount,
      edgeCount: entry.edgeCount,
      updatedAt: entry.updatedAt,
      createdAt: entry.createdAt,
      archived: Boolean(entry.archived),
      isImported: Boolean(entry.isImported),
      version,
    };
  });

  const allItems = [...drafts, ...committedItems];
  const userDiagramsCount = committedItems.filter((i) => i.type === 'diagram').length + drafts.length;

  // Duplicate title disambiguation (D9)
  const titleCounts = new Map<string, number>();
  for (const item of allItems) {
    titleCounts.set(item.title, (titleCounts.get(item.title) ?? 0) + 1);
  }

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const filteredItems = allItems.filter((item) => {
    if (!normalizedQuery) return true;
    return item.title.toLowerCase().includes(normalizedQuery) || item.handle.toLowerCase().includes(normalizedQuery);
  });

  const handleOpenItem = (item: typeof allItems[0]) => {
    try {
      if (item.type === 'draft') {
        defaultWorkspaceManager.setActiveDocument(item.handle);
        runtime.stores.$activeDiagram.set({ name: item.title, handle: item.handle });
        runtime.stores.$documentHead.set({
          handle: item.handle,
          hash: '',
          sequence: 0,
          isValid: true,
          lastCommittedAt: 0,
        });
      } else {
        runtime.openCorpusEntry(item.handle);
        const entries = runtime.corpusExplorer.listCorpusEntries({ includeArchived: showArchived }).entries;
        runtime.stores.$corpusEntries.set(entries);
      }
      setOpenError('');
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSaveRename = async (handle: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingHandle(null);
      return;
    }
    setEditingHandle(null);
    try {
      const res = await runtime.renameDiagram(handle, trimmed);
      if (!res.success) {
        setOpenError(res.error || 'Failed to rename diagram');
      }
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDuplicate = async (handle: string) => {
    setOpenMenuHandle(null);
    try {
      const res = await runtime.duplicateDiagram(handle);
      if (res.success && res.newHandle) {
        runtime.openCorpusEntry(res.newHandle);
      } else {
        setOpenError(res.error || 'Failed to duplicate diagram');
      }
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleArchive = async (handle: string) => {
    setOpenMenuHandle(null);
    try {
      const res = await runtime.archiveDiagram(handle, true);
      if (!res.success) {
        setOpenError(res.error || 'Failed to archive diagram');
      }
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUnarchive = async (handle: string) => {
    setOpenMenuHandle(null);
    try {
      const res = await runtime.archiveDiagram(handle, false);
      if (!res.success) {
        setOpenError(res.error || 'Failed to un-archive diagram');
      }
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <aside
      id="source-drawer-island"
      className={`transition-all duration-150 flex flex-col bg-[#161922] border-r border-[#2e3446] overflow-hidden shrink-0 ${
        isCollapsed ? 'collapsed hidden w-0' : 'w-64'
      }`}
      style={{ width: isCollapsed ? 0 : width }}
    >
      <div className="min-h-8 border-b border-[#2e3446] px-2 py-1 flex items-center justify-between gap-1 text-xs font-semibold text-slate-300">
        <span>EXPLORER</span>
        <div className="flex items-center gap-1.5">
          {corpusView.status === 'ready' && (
            <span data-testid="corpus-persistence-state" className="text-[9px] text-slate-500">
              {corpusView.persistence === 'persistent' ? 'Saved locally' : corpusView.persistence === 'stale' ? 'Stale' : 'Not persisted'}
            </span>
          )}
          <button
            type="button"
            data-testid="btn-explorer-new-diagram"
            onClick={() => {
              void runtime.ctx.command.execute('tikzit.diagram.create');
            }}
            className="rounded border border-[#30363d] px-1.5 py-0.5 text-[9px] bg-[#1a1e2a] hover:bg-[#252b3b] text-slate-200 transition-colors"
            title="Create new diagram"
          >
            + New Diagram
          </button>
          <button
            type="button"
            data-testid="btn-export-collection"
            onClick={() => {
              void runtime.openExportCollectionDialog();
            }}
            className="rounded border border-[#30363d] px-1.5 py-0.5 text-[9px] bg-[#1a1e2a] hover:bg-[#252b3b] text-slate-200 transition-colors"
            title="Export collection as SQLite database"
          >
            Export Collection…
          </button>
        </div>
      </div>

      {/* Recovery Banner */}
      {sessionRecovery.recoveredCount > 0 && (
        <div
          data-testid="recovery-banner"
          role="status"
          className="p-2 mx-2 mt-2 rounded bg-amber-950/70 border border-amber-700 text-amber-200 text-xs flex flex-col gap-1.5"
        >
          <span className="font-medium">
            Recovered unsaved edits in {sessionRecovery.recoveredCount} diagram{sessionRecovery.recoveredCount > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-recovery-review"
              onClick={() => {
                const firstDirty = sessionRecovery.dirtyHandles[0];
                if (firstDirty) {
                  defaultWorkspaceManager.setActiveDocument(firstDirty);
                  const doc = defaultWorkspaceManager.getActiveDocument();
                  if (doc) {
                    runtime.stores.$activeDiagram.set({ name: doc.title, handle: doc.id });
                  }
                }
              }}
              className="px-2 py-0.5 rounded bg-amber-800 hover:bg-amber-700 text-white font-medium text-[10px]"
            >
              Review
            </button>
            <button
              type="button"
              data-testid="btn-recovery-discard"
              onClick={() => {
                runtime.discardAllRecovered();
              }}
              className="px-2 py-0.5 rounded bg-[#2e3446] hover:bg-[#3b4256] text-slate-300 font-medium text-[10px]"
            >
              Discard all
            </button>
          </div>
        </div>
      )}

      {/* Live Region for Screen Readers */}
      <div
        data-testid="live-announcer"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {sessionRecovery.announcement || ''}
      </div>

      {exportNotice && <div role="status" className="px-2 py-1 text-[10px] text-slate-400">{exportNotice}</div>}
      {openError && <div role="alert" className="px-2 py-1 text-[10px] text-amber-300">{openError}</div>}
      {corpusView.persistence === 'stale' && (
        <div data-testid="stale-reload-banner" role="alert" className="p-2 mx-2 mt-2 rounded bg-red-950/70 border border-red-700 text-red-200 text-xs flex flex-col gap-1.5">
          <span className="font-medium">Database modified by another tab.</span>
          <span className="text-[10px] text-red-300">Commits are blocked to prevent corruption.</span>
          <button
            type="button"
            data-testid="btn-reload-window"
            onClick={() => window.location.reload()}
            className="px-2 py-0.5 rounded bg-red-800 hover:bg-red-700 text-white font-medium text-[10px] w-fit"
          >
            Reload Page
          </button>
        </div>
      )}

      <div className="p-2 border-b border-[#2e3446] space-y-1.5">
        <input
          data-testid="corpus-search-input"
          type="search"
          value={corpusQuery}
          onChange={(event) => runtime.stores.$corpusQuery.set(event.target.value)}
          placeholder="Search diagrams or corpus..."
          aria-label="Search corpus diagrams"
          className="w-full px-2 py-1 text-xs bg-[#0d1117] border border-[#30363d] rounded text-slate-200 focus:outline-none focus:border-blue-500"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              data-testid="toggle-show-archived"
              checked={showArchived}
              onChange={(e) => {
                const checked = e.target.checked;
                runtime.stores.$sessionRecovery.set({ ...sessionRecovery, showArchived: checked });
                const entries = runtime.corpusExplorer.listCorpusEntries({ includeArchived: checked }).entries;
                runtime.stores.$corpusEntries.set(entries);
              }}
              className="rounded bg-[#0d1117] border-[#30363d] text-blue-600 focus:ring-0"
            />
            <span>Show archived</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 text-xs text-slate-400 space-y-1" aria-live="polite">
        {corpusView.status === 'loading' && <div role="status">Loading corpus…</div>}
        {corpusView.status === 'error' && <div role="alert">{corpusView.persistenceError ?? 'Corpus could not be loaded.'}</div>}
        {corpusView.persistence === 'non-persistent' && (
          <div role="status">Session storage is unavailable; changes may not survive reload.</div>
        )}
        {corpusView.persistenceError && corpusView.persistence !== 'non-persistent' && corpusView.persistence !== 'stale' && (
          <div role="alert">{corpusView.persistenceError}</div>
        )}
        {corpusView.seedFailures.map((failure) => (
          <div key={`${failure.handle}:${failure.reason}`} role="alert" className="text-amber-300">
            {failure.handle}: {failure.reason}
          </div>
        ))}
        {listing.issues.map((issue) => (
          <div key={`${issue.handle}:${issue.reason}`} role="alert" className="text-amber-300">
            {issue.handle || 'Corpus index'}: {issue.reason}
          </div>
        ))}
        {userDiagramsCount === 0 && !normalizedQuery && (
          <div data-testid="empty-diagrams-card" className="p-3 my-2 rounded border border-dashed border-[#30363d] bg-[#12151d] text-center space-y-2">
            <p className="text-[11px] text-slate-400">No user diagrams yet.</p>
            <button
              type="button"
              data-testid="btn-empty-state-new-diagram"
              onClick={() => {
                void runtime.ctx.command.execute('tikzit.diagram.create');
              }}
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              + New Diagram
            </button>
          </div>
        )}
        {corpusView.status === 'ready' && filteredItems.length === 0 && listing.issues.length === 0 && (
          <div role="status">{corpusQuery.trim() ? 'No matching diagrams.' : 'The corpus is empty.'}</div>
        )}
        {filteredItems.map((item) => {
          const isActive = activeHandle === item.handle;
          const timeText = item.updatedAt > 0 ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const hasDuplicateTitle = (titleCounts.get(item.title) ?? 0) > 1;
          const dateDisambiguation = hasDuplicateTitle && item.createdAt
            ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
            : '';

          if (editingHandle === item.handle) {
            return (
              <div
                key={item.handle}
                className="w-full px-2 py-1.5 rounded bg-[#1e2230] border border-blue-500/50 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  data-testid="input-rename-diagram"
                  aria-label="Rename diagram"
                  value={editTitle}
                  autoFocus
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSaveRename(item.handle);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingHandle(null);
                    }
                  }}
                  className="flex-1 px-1.5 py-0.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-white focus:outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveRename(item.handle)}
                  className="px-2 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingHandle(null)}
                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            );
          }

          return (
            <div
              key={item.handle}
              className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between gap-1 transition-colors select-none ${
                item.archived ? 'opacity-60' : ''
              } ${isActive ? 'bg-[#222634] text-white' : 'hover:bg-[#1a1d26] text-slate-300'}`}
            >
              <button
                type="button"
                data-testid={`corpus-entry-${item.handle}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleOpenItem(item)}
                className="flex items-center gap-1.5 truncate flex-1 min-w-0 text-left bg-transparent border-0 p-0 text-inherit cursor-pointer focus:outline-none"
              >
                <span
                  data-testid={`badge-${item.type}`}
                  className={`px-1 py-0.2 text-[9px] rounded font-mono shrink-0 ${
                    item.type === 'draft'
                      ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                      : item.type === 'diagram'
                      ? 'bg-blue-950/70 text-blue-300 border border-blue-800'
                      : 'bg-purple-950/70 text-purple-300 border border-purple-800'
                  }`}
                >
                  {item.badge}
                </span>

                {item.archived && (
                  <span
                    data-testid="badge-archived"
                    className="px-1 py-0.2 text-[9px] rounded font-mono shrink-0 bg-stone-800 text-stone-400 border border-stone-700"
                  >
                    Archived
                  </span>
                )}

                {item.isImported && (
                  <span
                    data-testid="badge-imported"
                    className="px-1 py-0.2 text-[9px] rounded font-mono shrink-0 bg-teal-950/70 text-teal-300 border border-teal-800"
                  >
                    Imported
                  </span>
                )}

                <span className="truncate font-medium">{item.title}</span>
                {dateDisambiguation && (
                  <span className="text-[10px] text-slate-500 font-normal shrink-0">
                    ({dateDisambiguation})
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-500 font-mono">
                {item.version > 0 && <span data-testid="entry-version">v{item.version}</span>}
                {timeText && <span>{timeText}</span>}

                {/* Row overflow menu for user diagrams and examples */}
                <div className="relative shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    data-testid={`entry-actions-${item.handle}`}
                    aria-label={`Actions for ${item.title}`}
                    aria-haspopup="true"
                    aria-expanded={openMenuHandle === item.handle}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuHandle(openMenuHandle === item.handle ? null : item.handle);
                    }}
                    className="px-1 py-0.5 rounded text-slate-400 hover:text-white hover:bg-[#282c3c] text-xs transition-colors"
                  >
                    ⋯
                  </button>
                  {openMenuHandle === item.handle && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 bg-[#202432] border border-[#3b4256] shadow-xl rounded py-1 z-50 text-xs text-slate-200 min-w-[130px]"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        data-testid="row-export-diagram"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuHandle(null);
                          runtime.openExportDialog(item.handle);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#2b3145] text-blue-300 hover:text-white transition-colors"
                      >
                        Export Diagram…
                      </button>
                      {item.type !== 'example' && (
                        <>
                          <button
                            type="button"
                            role="menuitem"
                            data-testid="action-rename"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHandle(item.handle);
                              setEditTitle(item.title);
                              setOpenMenuHandle(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#2b3145] hover:text-white transition-colors"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            data-testid="action-duplicate"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDuplicate(item.handle);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#2b3145] hover:text-white transition-colors"
                          >
                            Duplicate
                          </button>
                          {!item.archived ? (
                            <button
                              type="button"
                              role="menuitem"
                              data-testid="action-archive"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleArchive(item.handle);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#2b3145] text-amber-300 hover:text-amber-200 transition-colors"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              type="button"
                              role="menuitem"
                              data-testid="action-unarchive"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleUnarchive(item.handle);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#2b3145] text-green-300 hover:text-green-200 transition-colors"
                            >
                              Un-archive
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
