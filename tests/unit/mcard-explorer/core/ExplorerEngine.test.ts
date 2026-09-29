import { describe, it, expect, vi } from 'vitest';
import { ExplorerEngine } from '../../../../src/packages/mcard-explorer/core/ExplorerEngine';
import { ExplorerActionRegistry } from '../../../../src/packages/mcard-explorer/actions/ExplorerActionRegistry';
import type {
  ExplorerDataSource,
  ExplorerCardSummaryDto,
  ExplorerSearchFilter
} from '../../../../src/packages/mcard-explorer/core/datasource/types';

describe('ExplorerEngine (Facade)', () => {
  const dummyItems: ExplorerCardSummaryDto[] = [
    {
      handle: 'zx:diagrams:ghz',
      hash: 'h1',
      mimeType: 'text/x-tikz',
      universe: 'U2',
      category: 'diagram',
      updatedAt: '2026-09-01T00:00:00Z'
    },
    {
      handle: 'proc:step1',
      hash: 'h2',
      mimeType: 'application/json',
      universe: 'U1',
      category: 'process',
      updatedAt: '2026-09-02T00:00:00Z'
    }
  ];

  const createMockDataSource = (items = dummyItems): ExplorerDataSource => {
    return {
      search: vi.fn(async (filter?: ExplorerSearchFilter) => {
        if (filter?.universe) {
          return items.filter(i => i.universe === filter.universe);
        }
        if (filter?.pattern) {
          return items.filter(i => i.handle.includes(filter.pattern!));
        }
        return items;
      }),
      getContent: vi.fn(async () => null),
      getHistory: vi.fn(async () => []),
      subscribe: vi.fn(() => () => {})
    };
  };

  it('initializes and executes SQL-level facet filtering', async () => {
    const ds = createMockDataSource();
    const engine = new ExplorerEngine(ds);

    await engine.init();
    expect(ds.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    expect(engine.getState().items).toHaveLength(2);

    // Switching to process facet queries universe U1
    await engine.setFacet('process');
    expect(ds.search).toHaveBeenCalledWith(expect.objectContaining({ universe: 'U1' }));
    expect(engine.getState().items).toHaveLength(1);
    expect(engine.getState().items[0].handle).toBe('proc:step1');
  });

  it('manages selection, sorting, and folder expansion state', async () => {
    const ds = createMockDataSource();
    const engine = new ExplorerEngine(ds);
    await engine.init();

    engine.selectHandle('zx:diagrams:ghz');
    expect(engine.getState().activeHandle).toBe('zx:diagrams:ghz');

    engine.toggleFolder('zx:diagrams');
    expect(engine.getState().expandedFolders).toContain('zx:diagrams');

    engine.toggleFolder('zx:diagrams');
    expect(engine.getState().expandedFolders).not.toContain('zx:diagrams');

    engine.setViewMode('flat');
    expect(engine.getState().viewMode).toBe('flat');

    engine.setSortBy('updatedAt');
    expect(engine.getState().sortBy).toBe('updatedAt');
  });

  it('executes actions through actionRegistry and refreshes', async () => {
    const ds = createMockDataSource();
    const registry = new ExplorerActionRegistry();
    let actionExecuted = false;

    registry.register({
      id: 'test.action',
      label: 'Test Action',
      execute: async () => {
        actionExecuted = true;
        return { success: true };
      }
    });

    const engine = new ExplorerEngine(ds, registry);
    await engine.init();

    const res = await engine.executeAction('test.action', 'zx:diagrams:ghz');
    expect(actionExecuted).toBe(true);
    expect(res.success).toBe(true);
  });
});
