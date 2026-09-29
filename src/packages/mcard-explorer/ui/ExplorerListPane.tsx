/** @layer L4 interface/membrane */
import React from 'react';
import type { ExplorerCardSummaryDto, ExplorerTreeNode } from '../core';
import type { Position, Direction, PolyInterfaceRegistry } from '../poly';
import { PositionTree, type PositionTreeNode } from './PositionTree';

export interface ExplorerListPaneProps {
  items: readonly ExplorerCardSummaryDto[];
  tree: readonly ExplorerTreeNode[];
  viewMode: 'tree' | 'flat' | 'cards';
  activeHandle: string | null;
  selectedHandles: readonly string[];
  expandedFolders: readonly string[];
  polyRegistry?: PolyInterfaceRegistry;
  onSelect: (handle: string) => void;
  onToggleFolder: (folderPath: string) => void;
  onExecuteDirection?: (direction: Direction, position: Position) => void;
}

export const ExplorerListPane: React.FC<ExplorerListPaneProps> = ({
  items,
  tree,
  viewMode,
  activeHandle,
  selectedHandles,
  expandedFolders,
  polyRegistry,
  onSelect,
  onToggleFolder,
  onExecuteDirection
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-400" data-testid="mcard-empty-state">
        No cards found.
      </div>
    );
  }

  if (viewMode === 'tree') {
    return (
      <PositionTree
        nodes={tree as unknown as readonly PositionTreeNode[]}
        expandedFolders={expandedFolders as string[]}
        activeHandle={activeHandle}
        onToggleFolder={onToggleFolder}
        onSelectCard={onSelect}
      />
    );
  }

  return (
    <div className="space-y-1">
      {items.map(card => {
        const isSelected = activeHandle === card.handle;
        const position: Position = {
          id: `item:${card.handle}`,
          handle: card.handle,
          hash: card.hash,
          mimeType: card.mimeType,
          universe: card.universe,
          category: card.category,
          clmCategory: card.clmCategory,
          surface: 'list',
          selected: selectedHandles.includes(card.handle),
          active: isSelected
        };

        const directions = polyRegistry ? polyRegistry.resolveDirections(position) : [];

        return (
          <div
            key={card.handle}
            className={`mcard-entry-row group flex items-center justify-between px-3 py-2 text-xs rounded transition-colors cursor-pointer ${
              isSelected
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            }`}
            onClick={() => onSelect(card.handle)}
            data-testid={`mcard-entry-${card.handle}`}
          >
            <div className="flex flex-col min-w-0 pr-2">
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {card.handle}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                  {card.hash.slice(0, 10)}
                </span>
                {card.mimeType && (
                  <span className="text-[10px] text-slate-400 truncate">
                    {card.mimeType}
                  </span>
                )}
              </div>
            </div>

            {directions.length > 0 && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {directions.map(dir => (
                  <button
                    key={dir.id}
                    type="button"
                    className="px-2 py-1 text-[11px] bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteDirection?.(dir, position);
                    }}
                    title={dir.label}
                    data-testid={`direction-${dir.id}`}
                  >
                    {dir.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
