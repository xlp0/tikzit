import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';

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
  const [debouncedQuery, setDebouncedQuery] = useState(corpusQuery);
  const [exportNotice, setExportNotice] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(corpusQuery), 100);
    return () => window.clearTimeout(timeout);
  }, [corpusQuery]);

  const listing = runtime.corpusExplorer.listCorpusEntries();
  const entries = runtime.corpusExplorer.searchCorpus(debouncedQuery)
    .filter((entry) => corpusEntries.some((indexed) => indexed.handle === entry.handle));

  return (
    <aside
      id="source-drawer-island"
      className={`transition-all duration-150 flex flex-col bg-[#161922] border-r border-[#2e3446] overflow-hidden shrink-0 ${
        isCollapsed ? 'collapsed hidden w-0' : 'w-64'
      }`}
      style={{ width: isCollapsed ? 0 : width }}
    >
      <div className="min-h-8 border-b border-[#2e3446] px-2 flex items-center justify-between gap-1 text-xs font-semibold text-slate-300">
        <span>EXPLORER</span>
        <div className="flex items-center gap-1">
          {corpusView.status === 'ready' && (
            <span data-testid="corpus-persistence-state" className="text-[9px] text-slate-500">
              {corpusView.persistence === 'persistent' ? 'Saved locally' : 'Not persisted'}
            </span>
          )}
          <button
            type="button"
            data-testid="corpus-save-btn"
            onClick={() => {
              void runtime.saveCorpusDb().then((result) => {
                setExportNotice(result.status === 'success'
                  ? result.persisted ? 'Corpus saved.' : 'Corpus saved; export receipt was not persisted.'
                  : result.status === 'cancelled' ? 'Export cancelled.' : `Export failed (${result.failureCode ?? 'error'}): ${result.failureReason ?? 'Unknown failure'}`);
              }).catch((error) => setExportNotice(error instanceof Error ? error.message : String(error)));
            }}
            className="rounded border border-[#30363d] px-1 py-0.5 text-[9px] hover:bg-[#222634]"
          >
            Save Corpus (.db)
          </button>
        </div>
      </div>
      {exportNotice && <div role="status" className="px-2 py-1 text-[10px] text-slate-400">{exportNotice}</div>}
      <div className="p-2 border-b border-[#2e3446]">
        <input
          data-testid="corpus-search-input"
          type="search"
          value={corpusQuery}
          onChange={(event) => runtime.stores.$corpusQuery.set(event.target.value)}
          placeholder="Search diagrams or corpus..."
          aria-label="Search corpus diagrams"
          className="w-full px-2 py-1 text-xs bg-[#0d1117] border border-[#30363d] rounded text-slate-200 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-xs text-slate-400 space-y-1" aria-live="polite">
        {corpusView.status === 'loading' && <div role="status">Loading corpus…</div>}
        {corpusView.status === 'error' && <div role="alert">{corpusView.persistenceError ?? 'Corpus could not be loaded.'}</div>}
        {corpusView.persistence === 'non-persistent' && (
          <div role="status">Session storage is unavailable; changes may not survive reload.</div>
        )}
        {corpusView.persistenceError && corpusView.persistence !== 'non-persistent' && (
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
        {corpusView.status === 'ready' && entries.length === 0 && listing.issues.length === 0 && (
          <div role="status">{corpusQuery.trim() ? 'No matching diagrams.' : 'The corpus is empty.'}</div>
        )}
        {entries.map((entry) => (
          <button
            key={entry.handle}
            type="button"
            data-testid={`corpus-entry-${entry.handle}`}
            aria-current={activeHandle === entry.handle ? 'page' : undefined}
            onClick={() => {
              try {
                runtime.openCorpusEntry(entry.handle);
              } catch (error) {
                const current = runtime.stores.$corpusView.get();
                runtime.stores.$corpusView.set({
                  ...current,
                  status: 'error',
                  persistenceError: error instanceof Error ? error.message : String(error),
                });
              }
            }}
            className={`w-full text-left px-2 py-1 rounded flex items-center space-x-1.5 ${
              activeHandle === entry.handle ? 'bg-[#222634] text-white' : 'hover:bg-[#1a1d26] text-slate-300'
            }`}
          >
            <span className="truncate">{entry.title}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};
