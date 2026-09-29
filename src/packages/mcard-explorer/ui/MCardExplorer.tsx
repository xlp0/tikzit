/** @layer L4 interface/membrane */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { ExplorerEngine, ExplorerState, CardContentProvider, CardContentDto } from '../core';
import { ExplorerActionRegistry } from '../actions/ExplorerActionRegistry';
import { PolyInterfaceRegistry, type Direction, type Position } from '../poly';
import { ExplorerToolbar } from './ExplorerToolbar';
import { FacetStrip } from './FacetStrip';
import { ExplorerListPane } from './ExplorerListPane';
import { ExplorerPreviewPane } from './ExplorerPreviewPane';
import { ExplorerKeyboardScope } from './ExplorerKeyboardScope';

export interface MCardExplorerProps {
  engine: ExplorerEngine;
  actionRegistry?: ExplorerActionRegistry;
  polyRegistry?: PolyInterfaceRegistry;
  contentProvider?: CardContentProvider;
  activeCard?: CardContentDto | null;
  facets?: string[];
  initialShowPreview?: boolean;
  onCardSelect?: (handle: string) => void;
  onAction?: (actionId: string, payload?: unknown) => Promise<void>;
}

const DEFAULT_FACETS = ['all', 'diagram', 'markdown', 'data', 'process', 'proof', 'conversation', 'artifacts'];

export const MCardExplorer: React.FC<MCardExplorerProps> = ({
  engine, actionRegistry = new ExplorerActionRegistry(), polyRegistry, contentProvider,
  activeCard, facets = DEFAULT_FACETS, initialShowPreview = true, onCardSelect, onAction
}) => {
  const [state, setState] = useState<ExplorerState>(engine.getState());
  const [showPreview, setShowPreview] = useState(initialShowPreview);

  useEffect(() => {
    const unsubscribe = engine.subscribe(setState);
    void engine.init().catch(() => undefined);
    return () => unsubscribe();
  }, [engine]);

  const handleSelect = useCallback((handle: string) => {
    engine.selectHandle(handle);
    onCardSelect?.(handle);
  }, [engine, onCardSelect]);

  const activePolyRegistry = useMemo(() => {
    if (polyRegistry) return polyRegistry;
    const reg = new PolyInterfaceRegistry();
    for (const act of actionRegistry.getAvailableActions({ handle: '', hash: '' })) {
      reg.register({
        id: act.id,
        label: act.label,
        icon: act.icon,
        shortcut: act.shortcut,
        legality: (pos) => !act.isAvailable || act.isAvailable({ handle: pos.handle, hash: pos.hash, mimeType: pos.mimeType }),
        execute: async (pos, payload) => {
          const res = await engine.executeAction(act.id, pos.handle, payload);
          return { success: res.success, message: res.message };
        }
      });
    }
    return reg;
  }, [polyRegistry, actionRegistry, engine]);

  const handleExecuteDirection = useCallback(async (dir: Direction, pos: Position) => {
    await dir.execute(pos);
    onAction?.(dir.id, { handle: pos.handle });
  }, [onAction]);

  return (
    <ExplorerKeyboardScope
      items={state.items}
      activeHandle={state.activeHandle}
      polyRegistry={activePolyRegistry}
      onSelect={handleSelect}
      onTogglePreview={() => setShowPreview(p => !p)}
      onExecuteDirection={handleExecuteDirection}
    >
      <div className={`flex flex-col h-full ${showPreview ? 'w-2/5 min-w-[280px] border-r border-slate-200 dark:border-slate-800' : 'w-full'}`}>
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <ExplorerToolbar
            query={state.query}
            onQueryChange={(q) => engine.setQuery(q)}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(p => !p)}
            viewMode={state.viewMode}
            onViewModeChange={(m) => engine.setViewMode(m)}
          />
          <FacetStrip facets={facets} activeFacet={state.activeFacet} onSelectFacet={(f) => engine.setFacet(f)} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <ExplorerListPane
            items={state.items}
            tree={state.tree}
            viewMode={state.viewMode}
            activeHandle={state.activeHandle}
            selectedHandles={state.selectedHandles}
            expandedFolders={state.expandedFolders}
            polyRegistry={activePolyRegistry}
            onSelect={handleSelect}
            onToggleFolder={(p) => engine.toggleFolder(p)}
            onExecuteDirection={handleExecuteDirection}
          />
        </div>
      </div>
      {showPreview && (
        <ExplorerPreviewPane
          card={activeCard}
          handle={state.activeHandle}
          contentProvider={contentProvider ?? engine}
          onAction={onAction}
        />
      )}
    </ExplorerKeyboardScope>
  );
};
