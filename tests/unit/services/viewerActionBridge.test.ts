/**
 * tests/unit/services/viewerActionBridge.test.ts - Sprint 34
 * Tests for registerViewerActions host bridge and ExplorerActionRegistry integration.
 * Contract D: <= 200 LOC ceiling.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  registerViewerActions,
  type ViewerActionBridgeHostCallbacks,
} from '../../../src/services/clm/viewerActionBridge';
import {
  ExplorerActionRegistry,
  type CardContentProvider,
  type CardContentDto,
} from '../../../src/packages/mcard-explorer';
import type { DiagramExportCoordinator } from '../../../src/services/export/diagramExportCoordinator';

describe('viewerActionBridge (Sprint 34)', () => {
  it('registers all 5 export formats, openInCanvas, and importCollection in action registry', () => {
    const registry = new ExplorerActionRegistry();
    const exportCoordinator = {
      exportDiagramArtifact: vi.fn(),
    } as unknown as DiagramExportCoordinator;

    const unregister = registerViewerActions(registry, exportCoordinator);

    const exportFormats = ['tikz', 'tex', 'svg', 'png', 'pdf'];
    for (const fmt of exportFormats) {
      const action = registry.getAction(`export.${fmt}`);
      expect(action).toBeDefined();
      expect(action?.label).toBe(`Export ${fmt.toUpperCase()}`);
    }

    expect(registry.getAction('openInCanvas')).toBeDefined();
    expect(registry.getAction('importCollection')).toBeDefined();

    // Call disposer and verify clean deregistration
    unregister();
    for (const fmt of exportFormats) {
      expect(registry.getAction(`export.${fmt}`)).toBeUndefined();
    }
    expect(registry.getAction('openInCanvas')).toBeUndefined();
    expect(registry.getAction('importCollection')).toBeUndefined();
  });

  it('dispatches export actions through ExplorerActionRegistry to DiagramExportCoordinator', async () => {
    const registry = new ExplorerActionRegistry();
    const mockExportArtifact = vi.fn().mockResolvedValue({ status: 'success', filename: 'test.png' });
    const exportCoordinator = {
      exportDiagramArtifact: mockExportArtifact,
    } as unknown as DiagramExportCoordinator;

    const contentProvider: CardContentProvider = {
      getContent: async (handle: string): Promise<CardContentDto | null> => ({
        handle,
        hash: 'blake3:test1234',
        mimeType: 'text/x-tikz',
        payloadKind: 'text',
        content: new TextEncoder().encode('\\begin{tikzpicture}\\end{tikzpicture}'),
        text: '\\begin{tikzpicture}\\end{tikzpicture}',
      }),
    };

    const callbacks: ViewerActionBridgeHostCallbacks = {
      onExportComplete: vi.fn(),
    };

    registerViewerActions(registry, exportCoordinator, contentProvider, callbacks);

    // Execute export.png with custom scale
    const result = await registry.execute('export.png', 'zx:diagrams:teleportation', {
      pngScale: 4,
    } as any);

    expect(result.success).toBe(true);
    expect(mockExportArtifact).toHaveBeenCalledTimes(1);
    expect(mockExportArtifact).toHaveBeenCalledWith({
      handle: 'zx:diagrams:teleportation',
      format: 'png',
      sourceKind: 'saved',
      pngScale: 4,
      sourceText: '\\begin{tikzpicture}\\end{tikzpicture}',
    });
    expect(callbacks.onExportComplete).toHaveBeenCalledWith(
      'zx:diagrams:teleportation',
      'png',
      expect.objectContaining({ status: 'success' })
    );

    // Execute export.svg with default scale
    const svgResult = await registry.execute('export.svg', 'zx:diagrams:teleportation');
    expect(svgResult.success).toBe(true);
    expect(mockExportArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: 'zx:diagrams:teleportation',
        format: 'svg',
        pngScale: 2,
      })
    );
  });

  it('dispatches openInCanvas and importCollection host callbacks', async () => {
    const registry = new ExplorerActionRegistry();
    const exportCoordinator = {
      exportDiagramArtifact: vi.fn(),
    } as unknown as DiagramExportCoordinator;

    const openInCanvas = vi.fn().mockResolvedValue(undefined);
    const importCollection = vi.fn().mockResolvedValue(undefined);

    registerViewerActions(registry, exportCoordinator, undefined, {
      openInCanvas,
      importCollection,
    });

    const canvasResult = await registry.execute('openInCanvas', 'zx:diagrams:bell-state');
    expect(canvasResult.success).toBe(true);
    expect(openInCanvas).toHaveBeenCalledWith('zx:diagrams:bell-state');

    const collectionResult = await registry.execute('importCollection', '');
    expect(collectionResult.success).toBe(true);
    expect(importCollection).toHaveBeenCalledTimes(1);
  });

  it('gracefully handles export failures without throwing', async () => {
    const registry = new ExplorerActionRegistry();
    const exportCoordinator = {
      exportDiagramArtifact: vi.fn().mockRejectedValue(new Error('Export pipeline error')),
    } as unknown as DiagramExportCoordinator;

    registerViewerActions(registry, exportCoordinator);

    const result = await registry.execute('export.pdf', 'zx:diagrams:broken');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Export pipeline error');
  });
});
