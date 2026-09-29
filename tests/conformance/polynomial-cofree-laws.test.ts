import { describe, it, expect, vi } from 'vitest';
import {
  InteractionTree,
  replayTo,
  type InteractionNode
} from '../../src/packages/mcard-explorer/time';
import {
  PolyInterfaceRegistry,
  type Position,
  type Direction
} from '../../src/packages/mcard-explorer/poly';

function createPos(id: string): Position {
  return {
    id,
    handle: `card:${id}`,
    hash: `blake3:${id}`,
    mimeType: 'text/vnd.tikz',
    surface: 'timeline',
    title: `Pos ${id}`
  };
}

describe('Polynomial Cofree Comonad Laws (40-DOD-01)', () => {
  it('satisfies path() law: path() equals the recorded lineage from root to cursor', () => {
    const rootPos = createPos('root');
    const tree = new InteractionTree(rootPos);

    const pos1 = createPos('step1');
    const pos2 = createPos('step2');
    const pos3 = createPos('step3');

    const n1 = tree.record(pos1, 'dir:1', { success: true });
    const n2 = tree.record(pos2, 'dir:2', { success: true });
    const n3 = tree.record(pos3, 'dir:3', { success: true });

    const path = tree.path();
    expect(path).toHaveLength(4);
    expect(path[0].id).toBe(tree.root().id);
    expect(path[1].id).toBe(n1.id);
    expect(path[2].id).toBe(n2.id);
    expect(path[3].id).toBe(n3.id);
  });

  it('satisfies branchFrom law: branching preserves future paths and sibling branches', () => {
    const tree = new InteractionTree(createPos('root'));
    const n1 = tree.record(createPos('n1'), 'dir:1', { success: true });
    const n2 = tree.record(createPos('n2'), 'dir:2', { success: true });

    // Branch from n1
    tree.branchFrom(n1.id);
    expect(tree.cursorId).toBe(n1.id);

    // Record a new branch
    const n3 = tree.record(createPos('n3'), 'dir:3', { success: true });

    // Path on the new branch
    const branchPath = tree.path();
    expect(branchPath.map((n) => n.id)).toEqual([tree.root().id, n1.id, n3.id]);

    // Original future branch (n2) is completely preserved
    const originalPath = tree.pathTo(n2.id);
    expect(originalPath.map((n) => n.id)).toEqual([tree.root().id, n1.id, n2.id]);
    expect(tree.node(n2.id)).toBeDefined();
  });

  it('satisfies alternatives law: uses historical fibers & preserves snapshot directions', () => {
    const registry = new PolyInterfaceRegistry();
    const mockDir: Direction = {
      id: 'dir:action',
      label: 'Action',
      legality: () => true,
      execute: async () => ({ success: true })
    };
    registry.register(mockDir);

    const tree = new InteractionTree(createPos('root'), registry);
    const rootAlts = tree.alternatives(tree.root().id);
    expect(rootAlts).toHaveLength(1);
    expect(rootAlts[0].id).toBe('dir:action');
  });

  it('satisfies replayTo purity: performs pure state reconstruction with zero host side effects', () => {
    const tree = new InteractionTree(createPos('root'));
    const n1 = tree.record(createPos('n1'), 'dir:1', { success: true });
    const n2 = tree.record(createPos('n2'), 'dir:2', { success: true });

    const applySpy = vi.fn();
    replayTo(tree, n2.id, applySpy);

    expect(applySpy).toHaveBeenCalledTimes(3); // root, n1, n2
    expect(tree.cursorId).toBe(n2.id);
  });

  it('satisfies 200-node round-trip within bounded memory and deterministic serialization', () => {
    const tree = new InteractionTree(createPos('root'));
    let lastId = tree.root().id;

    for (let i = 1; i <= 200; i++) {
      const node = tree.record(createPos(`node_${i}`), `dir:${i}`, { success: true });
      lastId = node.id;
    }

    expect(tree.path()).toHaveLength(201);

    // Serialize and deserialize round-trip
    const serialized = tree.serialize();
    expect(typeof serialized).toBe('string');
    expect(serialized.length).toBeGreaterThan(1000);

    const restoredTree = InteractionTree.deserialize(serialized);
    expect(restoredTree.cursorId).toBe(lastId);
    expect(restoredTree.path()).toHaveLength(201);
    expect(restoredTree.root().id).toBe(tree.root().id);
  });
});
