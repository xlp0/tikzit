/** @layer L4 interface/membrane */
import React from 'react';
import type { ExplorerCardSummaryDto } from '../core';
import type { Position, Direction, PolyInterfaceRegistry } from '../poly';

export interface ExplorerKeyboardScopeProps {
  items: readonly ExplorerCardSummaryDto[];
  activeHandle: string | null;
  polyRegistry?: PolyInterfaceRegistry;
  onSelect: (handle: string) => void;
  onTogglePreview: () => void;
  onExecuteDirection?: (direction: Direction, position: Position) => void;
  children: React.ReactNode;
}

export const ExplorerKeyboardScope: React.FC<ExplorerKeyboardScopeProps> = ({
  items,
  activeHandle,
  polyRegistry,
  onSelect,
  onTogglePreview,
  onExecuteDirection,
  children
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (items.length === 0) return;
    const currentIndex = items.findIndex(i => i.handle === activeHandle);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      onSelect(items[nextIdx].handle);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      onSelect(items[prevIdx].handle);
    } else if (e.key === ' ') {
      e.preventDefault();
      onTogglePreview();
    } else if (e.key === 'Enter' && activeHandle) {
      e.preventDefault();
      const activeCard = items.find(i => i.handle === activeHandle);
      if (activeCard && polyRegistry) {
        const position: Position = {
          id: `item:${activeCard.handle}`,
          handle: activeCard.handle,
          hash: activeCard.hash,
          mimeType: activeCard.mimeType,
          universe: activeCard.universe,
          category: activeCard.category,
          clmCategory: activeCard.clmCategory,
          surface: 'list',
          active: true
        };
        const directions = polyRegistry.resolveDirections(position);
        // Default direction is the first resolved legal direction
        const defaultDir = directions.find(d => d.default) || directions[0];
        if (defaultDir) {
          onExecuteDirection?.(defaultDir, position);
        }
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="mcard-explorer-panel flex h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden focus:outline-none"
      data-testid="mcard-explorer"
    >
      {children}
    </div>
  );
};
