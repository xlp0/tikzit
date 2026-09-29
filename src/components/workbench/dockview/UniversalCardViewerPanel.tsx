/**
 * src/components/workbench/dockview/UniversalCardViewerPanel.tsx - Sprint 34
 * Dockview panel adapter mounting Universal MCardViewer.
 * Component ID: 'card-viewer', Container testid: 'dockview-card-viewer-panel'.
 * Target: <= 180 LOC. Satisfies Contract D & Contract B.
 */

import React, { useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { atom } from 'nanostores';
import type { IDockviewPanelProps } from 'dockview-react';
import {
  MCardViewer,
  type CardContentProvider,
  type CardContentDto,
  type ExplorerActionRegistry,
} from '../../../packages/mcard-explorer';
import { useWorkbenchRuntime } from '../WorkbenchRuntimeContext';
import { defaultWorkspaceManager } from '../../../services/workspace/WorkspaceManager';
import {
  getExplorerQueryFacade,
  getExplorerActionRegistry,
} from '../../../services/clm/vcsAdapterInstance';
import type { WorkbenchRuntime } from '../../../services/createWorkbenchRuntime';

const fallbackStore = atom<string>('');

export interface UniversalCardViewerPanelProps
  extends Partial<IDockviewPanelProps<{ handle?: string }>> {
  card?: CardContentDto | null;
  handle?: string;
  runtime?: WorkbenchRuntime;
  contentProvider?: CardContentProvider;
  actionRegistry?: ExplorerActionRegistry;
}

export const UniversalCardViewerPanel: React.FC<UniversalCardViewerPanelProps> = ({
  card: propCard,
  handle: propHandle,
  runtime: propRuntime,
  contentProvider: propContentProvider,
  actionRegistry: propActionRegistry,
  params,
}) => {
  let contextRuntime: WorkbenchRuntime | null = null;
  try {
    contextRuntime = useWorkbenchRuntime();
  } catch {
    // Graceful fallback outside WorkbenchRuntimeProvider
  }

  const runtime = propRuntime ?? contextRuntime;
  const previewHandle = useStore(runtime ? runtime.stores.$previewCardHandle : fallbackStore);
  const activeDiagram = useStore(
    runtime ? runtime.stores.$activeDiagram : atom({ name: '', handle: '' })
  );

  const activeHandle =
    propHandle ?? params?.handle ?? (previewHandle || activeDiagram.handle || '');

  const defaultProvider: CardContentProvider = useMemo(() => {
    return {
      getContent: async (handle: string): Promise<CardContentDto | null> => {
        if (!handle) return null;

        // 1. Check open workspace documents
        const wsDoc = defaultWorkspaceManager.getOpenDocuments().find((d) => d.id === handle);
        if (wsDoc) {
          return {
            handle,
            hash: 'draft',
            mimeType: 'text/x-tikz',
            payloadKind: 'text',
            content: new TextEncoder().encode(wsDoc.content),
            text: wsDoc.content,
            metadata: { universe: 'U0', category: 'diagram' },
          };
        }

        // 2. Check runtime mcard collection
        if (runtime) {
          try {
            const headHash = runtime.mcardCollection.resolveHandle(handle);
            if (headHash) {
              const card = runtime.mcardCollection.get(headHash);
              if (card) {
                const text = card.payload.kind === 'text' ? card.payload.value : '';
                const mimeType = card.payload.kind === 'binary' ? card.payload.mimeType : 'text/x-tikz';
                return {
                  handle,
                  hash: String(headHash),
                  mimeType,
                  payloadKind: card.payload.kind === 'binary' ? 'binary' : 'text',
                  content: card.payload.kind === 'binary' ? card.payload.data : new TextEncoder().encode(text),
                  text,
                  metadata: { universe: 'U0', category: 'diagram' },
                };
              }
            }
          } catch {
            // Ignore and fall through to facade
          }
        }

        // 3. Fallback to explorer query facade
        try {
          return await getExplorerQueryFacade().getContent(handle);
        } catch {
          return null;
        }
      },
    };
  }, [runtime]);

  const effectiveProvider = propContentProvider ?? defaultProvider;

  const handleAction = async (actionId: string, payload?: unknown) => {
    try {
      const registry = propActionRegistry ?? getExplorerActionRegistry();
      await registry.execute(actionId, activeHandle, payload as Record<string, unknown>);
    } catch (err) {
      console.warn(`[UniversalCardViewerPanel] Action '${actionId}' unhandled:`, err);
    }
  };

  return (
    <div
      data-testid="dockview-card-viewer-panel"
      className="w-full h-full flex flex-col bg-[#0f1117] text-white overflow-hidden"
    >
      <MCardViewer
        card={propCard}
        handle={activeHandle}
        contentProvider={effectiveProvider}
        onAction={handleAction}
        className="w-full h-full"
      />
    </div>
  );
};
