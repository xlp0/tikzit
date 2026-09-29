import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OperadicMCardVfs } from '../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';
import { MCardVcsEngine } from '../../../src/packages/mcard-vcs/vcs/MCardVcsEngine';
import { ExplorerQueryFacade } from '../../../src/packages/mcard-vcs/explorer/ExplorerQueryFacade';
import { MCardExplorerEngine } from '../../../src/packages/mcard-explorer/core/MCardExplorerEngine';
import { ExplorerActionRegistry } from '../../../src/packages/mcard-explorer/actions/ExplorerActionRegistry';

describe('Sprint 28: MCardExplorerEngine Headless & Hierarchical Tree Tests', () => {
  let vfs: OperadicMCardVfs;
  let vcsEngine: MCardVcsEngine;
  let facade: ExplorerQueryFacade;
  let actionRegistry: ExplorerActionRegistry;
  let engine: MCardExplorerEngine;

  beforeEach(async () => {
    const memBackend = new MemoryStorageVFS();
    await memBackend.init();
    vfs = new OperadicMCardVfs(memBackend);
    vcsEngine = new MCardVcsEngine(vfs);
    await vcsEngine.init();
    facade = new ExplorerQueryFacade(vfs, vcsEngine);
    actionRegistry = new ExplorerActionRegistry();
    engine = new MCardExplorerEngine(facade, actionRegistry);

    // Populate test cards
    await vfs.set('zx:diagrams:ghz', 'ghz diagram content');
    await vfs.set('zx:diagrams:w-state', 'w state diagram content');
    await vfs.set('zx:rules:spider', 'spider rule');
    await vfs.set('draft:notes', 'rough notes');
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('28-DOD-08: runs headlessly with zero DOM globals, builds hierarchical namespace tree', async () => {
    await engine.init();
    const state = engine.getState();
    expect(state.items.length).toBe(4);

    // Verify tree structure
    const tree = state.tree;
    expect(tree.length).toBe(2); // 'zx' and 'draft' root folders

    const zxFolder = tree.find(n => n.name === 'zx');
    expect(zxFolder).toBeDefined();
    expect(zxFolder?.isFolder).toBe(true);
    expect(zxFolder?.children?.length).toBe(2); // 'diagrams' and 'rules'

    const diagramsFolder = zxFolder?.children?.find(n => n.name === 'diagrams');
    expect(diagramsFolder?.children?.length).toBe(2); // 'ghz' and 'w-state'
  });

  it('filters items by query and facets', async () => {
    await engine.init();

    // Query filter
    await engine.setQuery('spider');
    expect(engine.getState().items.length).toBe(1);
    expect(engine.getState().items[0].handle).toBe('zx:rules:spider');

    // Reset query and set facet filter
    await engine.setQuery('');
    await engine.setFacet('diagrams');
    expect(engine.getState().items.length).toBe(2);
    expect(engine.getState().items.every(i => i.handle.includes('diagrams'))).toBe(true);
  });

  it('28-DOD-09: registers and executes custom domain actions as Mealy morphisms', async () => {
    let archivedHandle = '';
    actionRegistry.register({
      id: 'archive',
      label: 'Archive Card',
      execute: async (card) => {
        archivedHandle = card.handle;
        return { success: true };
      }
    });

    const res = await engine.executeAction('archive', 'draft:notes');
    expect(res.success).toBe(true);
    expect(archivedHandle).toBe('draft:notes');
  });

  it('notifies subscribers upon state changes', async () => {
    let notifiedState: any = null;
    const unsub = engine.subscribe((s) => {
      notifiedState = s;
    });

    engine.selectHandle('zx:diagrams:ghz');
    expect(notifiedState?.activeHandle).toBe('zx:diagrams:ghz');

    engine.toggleFolder('zx');
    expect(notifiedState?.expandedFolders).toContain('zx');

    unsub();
  });
});
