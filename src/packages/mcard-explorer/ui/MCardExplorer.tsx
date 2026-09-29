/**
 * MCardExplorer: Universal Reusable Explorer Composite Viewlet
 *
 * Coordinates MCardExplorerEngine, SearchBar, FacetBar, Tree/Flat view,
 * and Universal MCardViewer in dual-pane responsive layout.
 * Zero DOM globals. Contract D ceiling: <= 250 LOC.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MCardExplorerEngine, type ExplorerState } from '../core/MCardExplorerEngine';
import { ExplorerActionRegistry } from '../actions/ExplorerActionRegistry';
import type { CardContentProvider, CardContentDto } from '../core/datasource/types';
import { MCardSearchBar } from './MCardSearchBar';
import { MCardTree } from './MCardTree';
import { MCardEntryRow } from './MCardEntryRow';
import { MCardViewer } from './MCardViewer';

export interface MCardExplorerProps {
  engine: MCardExplorerEngine;
  actionRegistry?: ExplorerActionRegistry;
  contentProvider?: CardContentProvider;
  activeCard?: CardContentDto | null;
  facets?: string[];
  initialShowPreview?: boolean;
  onCardSelect?: (handle: string) => void;
  onAction?: (actionId: string, payload?: unknown) => Promise<void>;
}

const DEFAULT_FACETS = ['all', 'diagram', 'markdown', 'data', 'process', 'proof', 'conversation'];

export const MCardExplorer: React.FC<MCardExplorerProps> = ({
  engine,
  actionRegistry = new ExplorerActionRegistry(),
  contentProvider,
  activeCard,
  facets = DEFAULT_FACETS,
  initialShowPreview = true,
  onCardSelect,
  onAction,
}) => {
  const [state, setState] = useState<ExplorerState>(engine.getState());
  const [showPreview, setShowPreview] = useState(initialShowPreview);

  useEffect(() => {
    const unsubscribe = engine.subscribe((newState) => {
      setState(newState);
    });
    void engine.init().catch(() => undefined);
    return () => unsubscribe();
  }, [engine]);

  const handleSelect = useCallback((handle: string) => {
    engine.selectHandle(handle);
    onCardSelect?.(handle);
  }, [engine, onCardSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (state.items.length === 0) return;
    const currentIndex = state.items.findIndex(i => i.handle === state.activeHandle);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = currentIndex < state.items.length - 1 ? currentIndex + 1 : 0;
      handleSelect(state.items[nextIdx].handle);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = currentIndex > 0 ? currentIndex - 1 : state.items.length - 1;
      handleSelect(state.items[prevIdx].handle);
    } else if (e.key === ' ') {
      e.preventDefault();
      setShowPreview(true);
    } else if (e.key === 'Enter' && state.activeHandle) {
      e.preventDefault();
      onCardSelect?.(state.activeHandle);
      onAction?.('openCard', { handle: state.activeHandle });
    }
  };

  const provider = contentProvider ?? engine;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="mcard-explorer-panel flex h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden focus:outline-none"
      data-testid="mcard-explorer"
    >
      {/* Left Navigation Pane */}
      <div className={`flex flex-col h-full ${showPreview ? 'w-2/5 min-w-[280px] border-r border-slate-200 dark:border-slate-800' : 'w-full'}`}>
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <MCardSearchBar
              value={state.query}
              onChange={(q) => engine.setQuery(q)}
            />
            <button
              type="button"
              data-testid="toggle-preview-pane"
              onClick={() => setShowPreview(p => !p)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                showPreview ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Toggle Preview Drawer"
            >
              Preview
            </button>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded transition-colors ${state.viewMode === 'tree' ? 'bg-white dark:bg-slate-700 shadow-sm font-semibold' : 'text-slate-500'}`}
                onClick={() => engine.setViewMode('tree')}
                title="Tree View"
                data-testid="view-mode-tree"
              >
                Tree
              </button>
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded transition-colors ${state.viewMode === 'flat' ? 'bg-white dark:bg-slate-700 shadow-sm font-semibold' : 'text-slate-500'}`}
                onClick={() => engine.setViewMode('flat')}
                title="Flat List"
                data-testid="view-mode-flat"
              >
                Flat
              </button>
            </div>
          </div>

          {/* Facet Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1" data-testid="mcard-facet-bar">
            {facets.map(facet => (
              <button
                key={facet}
                type="button"
                className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors whitespace-nowrap ${
                  state.activeFacet === facet
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                onClick={() => engine.setFacet(facet)}
                data-testid={`facet-chip-${facet}`}
              >
                {facet}
              </button>
            ))}
          </div>
        </div>

        {/* Tree or Flat List */}
        <div className="flex-1 overflow-y-auto p-2">
          {state.items.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400" data-testid="mcard-empty-state">
              No cards found.
            </div>
          ) : state.viewMode === 'tree' ? (
            <MCardTree
              nodes={state.tree}
              expandedFolders={state.expandedFolders}
              activeHandle={state.activeHandle}
              onToggleFolder={(p) => engine.toggleFolder(p)}
              onSelectCard={handleSelect}
            />
          ) : (
            <div className="space-y-1">
              {state.items.map(card => (
                <MCardEntryRow
                  key={card.handle}
                  card={card}
                  isSelected={state.activeHandle === card.handle}
                  onSelect={handleSelect}
                  actions={actionRegistry.getAvailableActions(card)}
                  onActionExecute={(actionId, handle) => engine.executeAction(actionId, handle)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Preview Pane (MCardViewer) */}
      {showPreview && (
        <div className="flex-1 h-full overflow-hidden bg-slate-950">
          <MCardViewer
            card={activeCard}
            handle={state.activeHandle ?? undefined}
            contentProvider={provider}
            onAction={onAction}
          />
        </div>
      )}
    </div>
  );
};
