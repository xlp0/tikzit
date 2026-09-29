/**
 * tests/conformance/explorer-cross-system.test.ts - Sprint 29
 * Cross-System MCard Explorer Conformance Suite
 * Validates headless explorer parity across TikZiT, mcard-studio, and CLI.
 * Target: <= 220 LOC. Satisfies Contract D.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  OperadicMCardVfs,
  MemoryStorageVFS,
  NodeFsStorageVFS,
  ExplorerQueryFacade
} from '../../src/packages/mcard-vcs';
import {
  MCardExplorerEngine,
  ExplorerActionRegistry,
  type CardSummaryItem
} from '../../src/packages/mcard-explorer';

const TMP_DIR = path.resolve(__dirname, '../../.tmp-explorer-conformance');

describe('Cross-System MCard Explorer Conformance (Sprint 29)', () => {
  beforeEach(() => {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TMP_DIR)) {
      try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
    }
  });

  it('instantiates MCardExplorerEngine and executes queries/actions identically across hosts (Memory)', async () => {
    const mem = new MemoryStorageVFS();
    await mem.init();
    const vfs = new OperadicMCardVfs(mem);

    await vfs.set('zx:diagrams:ghz', '% TikZ GHZ', {
      mimeType: 'text/vnd.tikz',
      companionMetadata: { author: 'Alice', type: 'diagram' }
    });
    await vfs.set('zx:drafts:w-state', '% TikZ W State', {
      mimeType: 'text/vnd.tikz',
      companionMetadata: { author: 'Bob', type: 'draft' }
    });
    await vfs.set('zx:examples:bell', '% TikZ Bell', {
      mimeType: 'text/vnd.tikz',
      companionMetadata: { author: 'Carol', type: 'example' }
    });

    const facade = new ExplorerQueryFacade(vfs);
    const registry = new ExplorerActionRegistry();
    let actionExecutedCard: CardSummaryItem | null = null;

    registry.register({
      id: 'customAction',
      label: 'Custom Action',
      execute: async (card) => {
        actionExecutedCard = card;
        return { success: true };
      }
    });

    const engine = new MCardExplorerEngine(facade, registry);
    await engine.refresh();

    // Verify initial listing
    const initialState = engine.getState();
    expect(initialState.items.length).toBe(3);

    // Verify search query filtering
    await engine.setQuery('ghz');
    const filteredState = engine.getState();
    expect(filteredState.items.length).toBe(1);
    expect(filteredState.items[0].handle).toBe('zx:diagrams:ghz');

    // Verify facet filtering
    await engine.setQuery('');
    await engine.setFacet('draft');
    const draftState = engine.getState();
    expect(draftState.items.length).toBe(1);
    expect(draftState.items[0].handle).toBe('zx:drafts:w-state');

    // Verify action execution
    await engine.setFacet('all');
    engine.selectHandle('zx:diagrams:ghz');
    expect(engine.getState().activeHandle).toBe('zx:diagrams:ghz');

    await engine.executeAction('customAction', 'zx:diagrams:ghz');
    expect(actionExecutedCard).not.toBeNull();
    expect((actionExecutedCard as CardSummaryItem | null)?.handle).toBe('zx:diagrams:ghz');
  });

  it('behaves identically with persistent NodeFs backend (CLI / Headless parity)', async () => {
    const dbPath = path.join(TMP_DIR, 'explorer-conformance.db');
    const nodeFs = new NodeFsStorageVFS(dbPath);
    await nodeFs.init();
    const vfs = new OperadicMCardVfs(nodeFs);

    await vfs.set('zx:diagrams:cnot', '% TikZ CNOT', {
      mimeType: 'text/vnd.tikz',
      companionMetadata: { tags: ['gate', '2-qubit'] }
    });
    await vfs.set('zx:diagrams:teleportation', '% TikZ Teleportation', {
      mimeType: 'text/vnd.tikz',
      companionMetadata: { tags: ['protocol'] }
    });

    const facade = new ExplorerQueryFacade(vfs);
    const registry = new ExplorerActionRegistry();
    let duplicateSuccess = false;

    registry.register({
      id: 'duplicate',
      label: 'Duplicate',
      execute: async (ctx) => {
        await vfs.set(`${ctx.handle}:copy`, `% Copy of ${ctx.handle}`);
        duplicateSuccess = true;
        return { success: true };
      }
    });

    const engine = new MCardExplorerEngine(facade, registry);
    await engine.refresh();
    expect(engine.getState().items.length).toBe(2);

    await engine.executeAction('duplicate', 'zx:diagrams:cnot');
    expect(duplicateSuccess).toBe(true);

    await engine.refresh();
    expect(engine.getState().items.length).toBe(3);

    // Tree hierarchy verification
    const tree = engine.getState().tree;
    expect(tree).toBeDefined();
    expect(tree.length).toBeGreaterThan(0);
  });
});
