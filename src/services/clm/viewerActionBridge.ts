/**
 * src/services/clm/viewerActionBridge.ts - Sprint 34 + Sprint 35 Phase A+B
 * Host Action Bridge for MCardViewer actions integrated with ExplorerActionRegistry.
 * Single seam mapping descriptor action IDs to host services (export, canvas, collection, persist).
 * Contract D: <= 180 LOC ceiling.
 */

import type {
  ExplorerActionRegistry,
  CardContentProvider,
  CardSummaryItem,
  ActionResult,
} from '../../packages/mcard-explorer';
import type { DiagramExportCoordinator } from '../export/diagramExportCoordinator';
import { saveCardArtifactToDisk } from '../export/saveCardArtifact';
import { commitCardToDatabase, commitExportedArtifact } from './cardPersistenceService';

export interface ViewerActionBridgeHostCallbacks {
  openInCanvas?: (handle: string) => void | Promise<void>;
  importCollection?: () => void | Promise<void>;
  onExportComplete?: (handle: string, format: string, result: unknown) => void;
}

const EXPORT_FORMATS = ['tikz', 'tex', 'svg', 'png', 'pdf'] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function registerViewerActions(
  actionRegistry: ExplorerActionRegistry,
  exportCoordinator: DiagramExportCoordinator,
  contentProvider?: CardContentProvider,
  callbacks?: ViewerActionBridgeHostCallbacks
): () => void {
  const disposers: Array<() => void> = [];

  // Register individual export format actions (export.tikz, export.tex, etc.)
  for (const fmt of EXPORT_FORMATS) {
    const actionId = `export.${fmt}`;
    const unregister = actionRegistry.register({
      id: actionId,
      label: `Export ${fmt.toUpperCase()}`,
      execute: async (card: CardSummaryItem): Promise<ActionResult> => {
        try {
          let sourceText: string | undefined;
          if (contentProvider) {
            const dto = await contentProvider.getContent(card.handle);
            sourceText = dto?.text;
          }

          const pngScale = (card as CardSummaryItem & { pngScale?: 1 | 2 | 4 }).pngScale;
          const result = await exportCoordinator.exportDiagramArtifact({
            handle: card.handle,
            format: fmt,
            sourceKind: 'saved',
            pngScale: pngScale ?? 2,
            sourceText,
          });

          callbacks?.onExportComplete?.(card.handle, fmt, result);
          const isSuccess = result.status === 'success';
          return {
            success: isSuccess,
            message: isSuccess
              ? `Exported ${card.handle} as ${fmt}`
              : result.status === 'failure' ? result.error : 'Export cancelled',
            result,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, message };
        }
      },
    });
    disposers.push(unregister);
  }

  // Register openInCanvas action
  disposers.push(
    actionRegistry.register({
      id: 'openInCanvas',
      label: 'Open in Canvas',
      execute: async (card: CardSummaryItem): Promise<ActionResult> => {
        if (callbacks?.openInCanvas) {
          await callbacks.openInCanvas(card.handle);
          return { success: true, message: `Opened ${card.handle} in canvas` };
        }
        return { success: true, message: `Open in canvas requested for ${card.handle}` };
      },
    })
  );

  // Register importCollection action
  disposers.push(
    actionRegistry.register({
      id: 'importCollection',
      label: 'Import Collection',
      execute: async (): Promise<ActionResult> => {
        if (callbacks?.importCollection) {
          await callbacks.importCollection();
          return { success: true, message: 'Collection imported' };
        }
        return { success: true, message: 'Import collection requested' };
      },
    })
  );

  // Sprint 35 Phase A: Universal raw-payload disk download for any card type
  disposers.push(
    actionRegistry.register({
      id: 'export.disk',
      label: 'Download File',
      execute: async (card: CardSummaryItem): Promise<ActionResult> => {
        if (!contentProvider) {
          return { success: false, message: 'Content provider unavailable' };
        }
        try {
          const dto = await contentProvider.getContent(card.handle);
          if (!dto) {
            return { success: false, message: `Card content not found: ${card.handle}` };
          }
          const result = await saveCardArtifactToDisk({
            handle: card.handle,
            mimeType: dto.mimeType,
            content: dto.content,
            text: dto.text,
          });
          callbacks?.onExportComplete?.(card.handle, 'disk', result);
          const isSuccess = result.status === 'success';
          return {
            success: isSuccess,
            message: isSuccess
              ? `Downloaded ${card.handle}`
              : result.status === 'failure' ? result.error : 'Download cancelled',
            result,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, message };
        }
      },
    })
  );

  // Sprint 35 Phase B: Commit card to sovereign database (OperadicMCardVfs)
  disposers.push(
    actionRegistry.register({
      id: 'export.database.commit',
      label: 'Save to Database',
      execute: async (card: CardSummaryItem): Promise<ActionResult> => {
        if (!contentProvider) {
          return { success: false, message: 'Content provider unavailable' };
        }
        try {
          const dto = await contentProvider.getContent(card.handle);
          if (!dto) {
            return { success: false, message: `Card content not found: ${card.handle}` };
          }
          const result = await commitCardToDatabase({
            handle: card.handle,
            mimeType: dto.mimeType,
            content: dto.content,
            text: dto.text,
          });
          callbacks?.onExportComplete?.(card.handle, 'database', result);
          return {
            success: result.success,
            message: result.message,
            result,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, message };
        }
      },
    })
  );

  // Sprint 35 Phase B: per-format rendered-artifact database commits.
  // Destination is orthogonal to format — export.database.<fmt> generates the
  // artifact bytes and vfs.set()s them; it never touches saveArtifact/pickers.
  for (const fmt of EXPORT_FORMATS) {
    const unregister = actionRegistry.register({
      id: `export.database.${fmt}`,
      label: `Commit ${fmt.toUpperCase()} to Database`,
      execute: async (card: CardSummaryItem): Promise<ActionResult> => {
        try {
          let sourceText: string | undefined;
          if (contentProvider) {
            const dto = await contentProvider.getContent(card.handle);
            sourceText = dto?.text;
          }
          const pngScale = (card as CardSummaryItem & { pngScale?: 1 | 2 | 4 }).pngScale;
          const result = await commitExportedArtifact(exportCoordinator, {
            sourceHandle: card.handle,
            format: fmt,
            sourceKind: 'saved',
            pngScale,
            sourceText,
          });
          callbacks?.onExportComplete?.(card.handle, `database.${fmt}`, result);
          return { success: result.success, message: result.message, result };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, message };
        }
      },
    });
    disposers.push(unregister);
  }

  return () => {
    for (const dispose of disposers) {
      dispose();
    }
  };
}
