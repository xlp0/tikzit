/**
 * StudioIntegration: Sample Executable Integration for mcard-studio
 *
 * Demonstrates embedding @clm/mcard-explorer and registering custom actions.
 * Zero DOM globals. Contract D ceiling: <= 250 LOC.
 */

import React from 'react';
import { ExplorerActionRegistry } from '../../../mcard-explorer/actions/ExplorerActionRegistry';
import { ExplorerEngine } from '../../../mcard-explorer/core/ExplorerEngine';
import { MCardExplorer } from '../../../mcard-explorer/ui/MCardExplorer';

export function createStudioActionRegistry(
  onMarkingInspect?: (handle: string) => void
): ExplorerActionRegistry {
  const registry = new ExplorerActionRegistry();

  registry.register({
    id: 'inspectMarking',
    label: 'Inspect Petri Net Marking',
    icon: 'circle-dot',
    execute: async (card) => {
      onMarkingInspect?.(card.handle);
      return { success: true };
    }
  });

  registry.register({
    id: 'duplicateCard',
    label: 'Duplicate MCard',
    icon: 'copy',
    execute: async (card) => {
      return { success: true, duplicatedHandle: `${card.handle}-copy` };
    }
  });

  return registry;
}

export interface StudioExplorerPanelProps {
  engine: ExplorerEngine;
  actionRegistry?: ExplorerActionRegistry;
  onCardSelect?: (handle: string) => void;
}

export const StudioExplorerPanel: React.FC<StudioExplorerPanelProps> = ({
  engine,
  actionRegistry = createStudioActionRegistry(),
  onCardSelect
}) => {
  return (
    <div className="studio-explorer-container h-full w-full bg-white dark:bg-slate-900" data-testid="studio-explorer-panel">
      <MCardExplorer
        engine={engine}
        actionRegistry={actionRegistry}
        facets={['all', 'diagram', 'draft', 'marking']}
        onCardSelect={onCardSelect}
      />
    </div>
  );
};
