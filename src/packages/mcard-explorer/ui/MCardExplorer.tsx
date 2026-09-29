/**
 * MCardExplorer: Universal Reusable Explorer Composite Viewlet
 *
 * Coordinates MCardExplorerEngine, SearchBar, FacetBar, and Tree/Flat view.
 * Zero DOM globals. Contract D ceiling: <= 250 LOC.
 */

import React, { useEffect, useState } from 'react';
import { MCardExplorerEngine, type ExplorerState } from '../core/MCardExplorerEngine';
import { ExplorerActionRegistry } from '../actions/ExplorerActionRegistry';
import { MCardSearchBar } from './MCardSearchBar';
import { MCardTree } from './MCardTree';
import { MCardEntryRow } from './MCardEntryRow';

export interface MCardExplorerProps {
  engine: MCardExplorerEngine;
  actionRegistry?: ExplorerActionRegistry;
  facets?: string[];
  onCardSelect?: (handle: string) => void;
}

export const MCardExplorer: React.FC<MCardExplorerProps> = ({
  engine,
  actionRegistry = new ExplorerActionRegistry(),
  facets = ['all', 'diagram', 'draft', 'marking'],
  onCardSelect
}) => {
  const [state, setState] = useState<ExplorerState>(engine.getState());

  useEffect(() => {
    const unsubscribe = engine.subscribe((newState) => {
      setState(newState);
    });
    engine.init();
    return () => unsubscribe();
  }, [engine]);

  const handleSelect = (handle: string) => {
    engine.selectHandle(handle);
    onCardSelect?.(handle);
  };

  return (
    <div className="mcard-explorer-panel flex flex-col h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden" data-testid="mcard-explorer">
      {/* Header with Search and Mode Toggle */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <MCardSearchBar
            value={state.query}
            onChange={(q) => engine.setQuery(q)}
          />
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

      {/* Main Body: Tree or Flat List */}
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
  );
};
