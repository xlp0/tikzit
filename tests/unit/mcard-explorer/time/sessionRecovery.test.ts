import { describe, it, expect } from 'vitest';
import { InteractionTree } from '../../../../src/packages/mcard-explorer/time/InteractionTree';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('InteractionTree Session Recovery & Memory Bound (39-DOD-06)', () => {
  const rootPos: Position = {
    id: 'pos:root',
    handle: 'card:session',
    hash: 'hash-0',
    mimeType: 'text/markdown',
    surface: 'list'
  };

  it('39-DOD-06: Serialization round-trip preserves active node, branch structure, and positions', async () => {
    const tree = new InteractionTree(rootPos);

    const step1 = await tree.step({
      id: 'dir:first',
      label: 'First Direction',
      legality: () => true,
      execute: async () => ({ success: true, producedHash: 'hash-1' })
    }, { ...rootPos, hash: 'hash-1' });

    const step2A = await tree.step({
      id: 'dir:branchA',
      label: 'Branch A',
      legality: () => true,
      execute: async () => ({ success: true, producedHash: 'hash-2A' })
    }, { ...rootPos, hash: 'hash-2A' });

    // Branch from step1 to step2B
    tree.branch(step1.id);
    const step2B = await tree.step({
      id: 'dir:branchB',
      label: 'Branch B',
      legality: () => true,
      execute: async () => ({ success: true, producedHash: 'hash-2B' })
    }, { ...rootPos, hash: 'hash-2B' });

    expect(tree.activeId()).toBe(step2B.id);

    // Serialize
    const serialized = tree.serialize();
    expect(typeof serialized).toBe('string');
    expect(serialized).toContain('node_root');
    expect(serialized).toContain('hash-2A');
    expect(serialized).toContain('hash-2B');

    // Deserialize
    const restored = InteractionTree.deserialize(serialized);
    expect(restored.activeId()).toBe(step2B.id);
    expect(restored.root().position).toEqual(rootPos);

    // Path on restored tree matches original path
    const originalPath = tree.path();
    const restoredPath = restored.path();
    expect(restoredPath.map(n => n.id)).toEqual(originalPath.map(n => n.id));
    expect(restoredPath.map(n => n.position.hash)).toEqual(['hash-0', 'hash-1', 'hash-2B']);

    // Check branch A is also preserved on restored tree
    const restoredBranchAPath = restored.pathTo(step2A.id);
    expect(restoredBranchAPath.map(n => n.position.hash)).toEqual(['hash-0', 'hash-1', 'hash-2A']);
  });

  it('39-DOD-06: Pruning drops dead branches beyond capacity without corrupting active branch', async () => {
    const tree = new InteractionTree(rootPos);

    // Build active spine: root -> s1 -> s2 -> s3
    const s1 = await tree.step({ id: 's1', label: 'S1', legality: () => true, execute: async () => ({ success: true }) }, { ...rootPos, hash: 'h1' });
    const s2 = await tree.step({ id: 's2', label: 'S2', legality: () => true, execute: async () => ({ success: true }) }, { ...rootPos, hash: 'h2' });
    const s3 = await tree.step({ id: 's3', label: 'S3', legality: () => true, execute: async () => ({ success: true }) }, { ...rootPos, hash: 'h3' });

    // Now branch off s1 and add 10 dead nodes
    tree.branch(s1.id);
    const deadNodes = [];
    for (let i = 0; i < 10; i++) {
      const dead = await tree.step({
        id: `dead_${i}`,
        label: `Dead ${i}`,
        legality: () => true,
        execute: async () => ({ success: true })
      }, { ...rootPos, hash: `dead-h-${i}` });
      deadNodes.push(dead);
      // Rewind to s1 each time so they are separate leaf branches or a linear dead chain
      tree.rewind(s1.id);
    }

    // Switch back to active spine s3
    tree.rewind(s3.id);
    expect(tree.activeId()).toBe(s3.id);
    const activePathBefore = tree.path();
    expect(activePathBefore.map(n => n.id)).toEqual([tree.root().id, s1.id, s2.id, s3.id]);

    // Prune to capacity of 5 nodes
    const dropped = tree.prune(5);
    expect(dropped).toBeGreaterThan(0);

    // Verify active path is completely uncorrupted
    const activePathAfter = tree.path();
    expect(activePathAfter.map(n => n.id)).toEqual([tree.root().id, s1.id, s2.id, s3.id]);
    expect(tree.activeId()).toBe(s3.id);
  });
});
