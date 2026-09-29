/**
 * tests/conformance/multimodal-card-conformance.test.ts - Sprint 34
 * Master Cross-System Conformance Suite across 10 verification checks.
 * Validates type judgment, renderer resolution, port parity, viewport matrix,
 * export bridge, and headless hypermedia rendering.
 * Target: <= 250 LOC (Contract D).
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { hypermediaToAnsi } from 'clm-kernel';

import {
  RendererRegistry,
  registerBaseViewlets,
  registerClmViewlets,
  toCardViewletDefinition,
  MCardExplorerEngine,
  ExplorerActionRegistry,
  MCardViewer,
  type ExplorerDataSource,
  type CardContentProvider,
  type CardContentDto,
} from '../../src/packages/mcard-explorer';
import { CardTypeJudgeService } from '../../src/packages/mcard-vcs';
import { registerViewerActions } from '../../src/services/clm/viewerActionBridge';
import type { DiagramExportCoordinator } from '../../src/services/export/diagramExportCoordinator';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/fixtures/multimodal-media');

function loadMedia(name: string): { bytes: Uint8Array; text: string } {
  const buf = fs.readFileSync(path.join(FIXTURES_DIR, name));
  return { bytes: new Uint8Array(buf), text: buf.toString('utf8') };
}

describe('Master Multimodal Card Conformance Matrix (Sprint 34)', () => {
  let registry: RendererRegistry;
  let judgeService: CardTypeJudgeService;

  beforeAll(() => {
    registry = new RendererRegistry();
    registerBaseViewlets(registry);
    registerClmViewlets(registry);
    judgeService = new CardTypeJudgeService();
  });

  // 1. TikZ Diagram
  it('Check 1: TikZ Diagram -> text/x-tikz in U0 resolves to TikzCardRenderer', () => {
    const { bytes, text } = loadMedia('sample.tikz');
    const j = judgeService.judge({ data: bytes, filename: 'diagram.tikz' });
    expect(j.mime).toBe('text/x-tikz');
    expect(j.universe).toBe('U0');
    expect(j.clmCategory).toBe('diagram');
    const r = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
    expect(r.id).toBe('tikz');
  });

  // 2. Markdown Note
  it('Check 2: Markdown Research Note -> text/markdown in U0 resolves to MarkdownCardRenderer', () => {
    const { bytes } = loadMedia('notes.md');
    const j = judgeService.judge({ data: bytes, filename: 'notes.md' });
    expect(j.mime).toBe('text/markdown');
    expect(j.universe).toBe('U0');
    const r = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
    expect(r.id).toBe('markdown');
  });

  // 3. PCard Petri Net
  it('Check 3: PCard Petri Net -> application/vnd.pcard+json in U1 resolves to PCardRenderer', () => {
    const { bytes } = loadMedia('workflow.pcard.json');
    const j = judgeService.judge({ data: bytes, filename: 'workflow.pcard.json' });
    expect(j.mime).toBe('application/vnd.pcard+json');
    expect(j.universe).toBe('U1');
    expect(j.clmCategory).toBe('process');
    const r = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
    expect(r.id).toBe('pcard');
  });

  // 4. VCard Proof Witness
  it('Check 4: VCard Proof Witness -> application/vnd.vcard+json in U2 resolves to VCardRenderer', () => {
    const { bytes } = loadMedia('receipt.vcard.json');
    const j = judgeService.judge({ data: bytes, filename: 'receipt.vcard.json' });
    expect(j.mime).toBe('application/vnd.vcard+json');
    expect(j.universe).toBe('U2');
    expect(j.clmCategory).toBe('proof');
    const r = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
    expect(r.id).toBe('vcard');
  });

  // 5. SQLite Sovereign Database
  it('Check 5: SQLite Database -> application/x-sqlite3 in U0 resolves to SqliteCollectionRenderer', () => {
    const { bytes } = loadMedia('collection.db');
    const j = judgeService.judge({ data: bytes, filename: 'collection.db' });
    expect(j.mime).toBe('application/x-sqlite3');
    expect(j.universe).toBe('U0');
    expect(j.clmCategory).toBe('collection');
    const r = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
    expect(r.id).toBe('sqlite');
  });

  // 6. Satori Turn
  it('Check 6: Satori Turn -> application/vnd.satori.turn+xml in U3 resolves to SatoriCardRenderer', () => {
    const { bytes } = loadMedia('turn.satori.xml');
    const j = judgeService.judge({ data: bytes, filename: 'turn.satori.xml' });
    expect(j.mime).toBe('application/vnd.satori.turn+xml');
    expect(j.universe).toBe('U3');
    expect(j.clmCategory).toBe('conversation');
    const r = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
    expect(r.id).toBe('satori');
  });

  // 7. Explorer Port Parity (D42)
  it('Check 7: D42 Port Parity: stub dataSource runs MCardExplorerEngine and toCardViewletDefinition matches studio contract', async () => {
    const mockDb: Record<string, CardContentDto> = {
      'zx:test:sample': {
        handle: 'zx:test:sample',
        hash: 'blake3:abc',
        mimeType: 'text/x-tikz',
        payloadKind: 'text',
        content: new TextEncoder().encode('\\node {OK};'),
        text: '\\node {OK};',
      },
    };

    const stubSource: ExplorerDataSource & CardContentProvider = {
      listHandles: async () => Object.keys(mockDb),
      search: async () => [
        { handle: 'zx:test:sample', hash: 'blake3:abc', mimeType: 'text/x-tikz', updatedAt: '2026-01-01' },
      ],
      getContent: async (h) => mockDb[h] ?? null,
      getHistory: async () => [],
      subscribe: () => () => {},
    };

    const engine = new MCardExplorerEngine(stubSource, new ExplorerActionRegistry());
    const handles = await engine.getDataSource().listHandles!();
    expect(handles).toEqual(['zx:test:sample']);

    const descriptor = registry.getDescriptor('tikz');
    expect(descriptor).toBeDefined();
    const studioDef = toCardViewletDefinition(descriptor!);
    expect(studioDef.id).toBe('tikz');
    expect(studioDef.priority).toBe(descriptor!.priority);
    expect(studioDef.supportedMimes).toEqual(descriptor!.supportedMimes);
  });

  // 8. Media Viewport Matrix (D44)
  it('Check 8: D44 Viewport Matrix: verifies adaptive viewport mode and SSR container attribute', () => {
    const modes: Array<{ file: string; expectedMode: string }> = [
      { file: 'sample.tikz', expectedMode: 'zoom' },
      { file: 'icon.png', expectedMode: 'zoom' },
      { file: 'logo.svg', expectedMode: 'zoom' },
      { file: 'workflow.pcard.json', expectedMode: 'fit' },
      { file: 'paper.pdf', expectedMode: 'paged' },
      { file: 'dataset.csv', expectedMode: 'paged' },
      { file: 'collection.db', expectedMode: 'paged' },
      { file: 'notes.md', expectedMode: 'split' },
      { file: 'config.yaml', expectedMode: 'split' },
      { file: 'graph.json', expectedMode: 'scroll' },
      { file: 'receipt.vcard.json', expectedMode: 'scroll' },
      { file: 'turn.satori.xml', expectedMode: 'scroll' },
      { file: 'blob.bin', expectedMode: 'scroll' },
    ];

    for (const { file, expectedMode } of modes) {
      const { bytes, text } = loadMedia(file);
      const j = judgeService.judge({ data: bytes, filename: file });
      const desc = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
      expect(desc.viewport).toBe(expectedMode);

      const card: CardContentDto = {
        handle: `test:${file}`,
        hash: 'blake3:test',
        mimeType: j.mime,
        payloadKind: j.isBinary ? 'binary' : 'text',
        text,
        content: bytes,
        metadata: { universe: j.universe, category: j.clmCategory },
      };

      const html = renderToString(React.createElement(MCardViewer, { card, registry }));
      expect(html).toContain(`data-viewport-mode="${expectedMode}"`);
    }
  });

  // 9. In-Viewer Export Bridge (D45)
  it('Check 9: D45 Export Bridge: dispatches onAction via ExplorerActionRegistry to export coordinator', async () => {
    const actionRegistry = new ExplorerActionRegistry();
    const exportCoordinator = {
      exportDiagramArtifact: vi.fn().mockResolvedValue({ status: 'success', filename: 'ghz.png' }),
    } as unknown as DiagramExportCoordinator;

    const { bytes, text } = loadMedia('sample.tikz');
    const contentProvider: CardContentProvider = {
      getContent: async () => ({
        handle: 'zx:diagrams:ghz',
        hash: 'blake3:test',
        mimeType: 'text/x-tikz',
        content: bytes,
        text,
      }),
    };

    const unregister = registerViewerActions(actionRegistry, exportCoordinator, contentProvider);

    for (const fmt of ['tikz', 'tex', 'svg', 'png', 'pdf'] as const) {
      const res = await actionRegistry.execute(`export.${fmt}`, 'zx:diagrams:ghz', { pngScale: 2 } as any);
      expect(res.success).toBe(true);
      expect(exportCoordinator.exportDiagramArtifact).toHaveBeenCalledWith(
        expect.objectContaining({ handle: 'zx:diagrams:ghz', format: fmt, pngScale: 2 })
      );
    }

    unregister();
  });

  // 10. Headless Hypermedia Rendering (Gap 13)
  it('Check 10: Gap 13 Headless Conformance: toHypermediaNode() produces non-empty ANSI for all viewlets', () => {
    const files = ['sample.tikz', 'notes.md', 'workflow.pcard.json', 'receipt.vcard.json', 'collection.db', 'turn.satori.xml'];
    for (const file of files) {
      const { bytes, text } = loadMedia(file);
      const j = judgeService.judge({ data: bytes, filename: file });
      const desc = registry.resolve({ mimeType: j.mime, handle: 'test:card', isBinary: j.isBinary, universe: j.universe, category: j.clmCategory });
      expect(desc.toHypermediaNode).toBeDefined();

      const node = desc.toHypermediaNode!(bytes, text, {
        mime: j.mime,
        universe: j.universe,
        category: j.clmCategory ?? 'data',
      });
      const ansi = hypermediaToAnsi(node);
      expect(ansi.trim().length).toBeGreaterThan(0);
    }
  });
});
