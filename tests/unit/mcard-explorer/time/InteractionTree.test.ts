import { describe, it, expect } from 'vitest';
import { InteractionTree } from '../../../../src/packages/mcard-explorer/time/InteractionTree';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('InteractionTree (39-DOD-01 & 39-DOD-02)', () => {
  const rootPos: Position = {
    id: 'pos:root',
    handle: 'card:1',
    hash: 'hash-0',
    mimeType: 'text/markdown',
    surface: 'list'
  };

  it('39-DOD-01: Every tree node is labeled with position, arrivedBy, result, at, and children; pathTo yields exact sequence', async () => {
    const tree = new InteractionTree(rootPos);
    const rootNode = tree.root();

    expect(rootNode.id).toBeDefined();
    expect(rootNode.position).toEqual(rootPos);
    expect(rootNode.arrivedBy).toBeNull();
    expect(rootNode.result).toBeUndefined();
    expect(rootNode.at).toBe(0);
    expect(rootNode.children).toEqual([]);

    const dir1: Direction = {
      id: 'edit.text',
      label: 'Edit Text',
      legality: () => true,
      execute: async () => ({ success: true, producedHash: 'hash-1' })
    };

    const nextPos1: Position = { ...rootPos, hash: 'hash-1' };
    const step1 = await tree.step(dir1, nextPos1);

    expect(step1.arrivedBy).toBe('edit.text');
    expect(step1.result?.success).toBe(true);
    expect(step1.result?.producedHash).toBe('hash-1');
    expect(step1.at).toBe(1);
    expect(step1.position).toEqual(nextPos1);

    const dir2: Direction = {
      id: 'export.json',
      label: 'Export JSON',
      legality: () => true,
      execute: async () => ({ success: true, producedHash: 'hash-2' })
    };

    const nextPos2: Position = { ...nextPos1, hash: 'hash-2' };
    const step2 = await tree.step(dir2, nextPos2);

    expect(step2.at).toBe(2);

    const path = tree.pathTo(step2.id);
    expect(path).toHaveLength(3);
    expect(path[0].id).toBe(rootNode.id);
    expect(path[1].id).toBe(step1.id);
    expect(path[2].id).toBe(step2.id);
    expect(path.map(n => n.position.hash)).toEqual(['hash-0', 'hash-1', 'hash-2']);
  });

  it('39-DOD-02: Branching retains prior branches without mutation; history.traverse folds lineage into siblings', async () => {
    const tree = new InteractionTree(rootPos);
    const step1 = await tree.step({
      id: 'step1',
      label: 'Step 1',
      legality: () => true,
      execute: async () => ({ success: true })
    }, { ...rootPos, hash: 'hash-1' });

    const step2 = await tree.step({
      id: 'step2A',
      label: 'Step 2A',
      legality: () => true,
      execute: async () => ({ success: true })
    }, { ...rootPos, hash: 'hash-2A' });

    // Path A has 3 nodes: root -> step1 -> step2
    const pathA = tree.pathTo(step2.id);
    expect(pathA.map(n => n.id)).toEqual([tree.root().id, step1.id, step2.id]);

    // Branch from step1 to create Branch B
    const branchBNode = tree.branch(step1.id);
    expect(branchBNode.id).toBe(step1.id);
    expect(tree.activeId()).toBe(step1.id);

    const step2B = await tree.step({
      id: 'step2B',
      label: 'Step 2B',
      legality: () => true,
      execute: async () => ({ success: true })
    }, { ...rootPos, hash: 'hash-2B' });

    // Path B has root -> step1 -> step2B
    const pathB = tree.pathTo(step2B.id);
    expect(pathB.map(n => n.id)).toEqual([tree.root().id, step1.id, step2B.id]);

    // Verify Branch A nodes and path remain intact and unmutated
    const pathAAfter = tree.pathTo(step2.id);
    expect(pathAAfter.map(n => n.id)).toEqual([tree.root().id, step1.id, step2.id]);

    // Verify step1 has both step2 and step2B in its children
    const step1Node = tree.node(step1.id);
    expect(step1Node?.children.map(c => c.id)).toContain(step2.id);
    expect(step1Node?.children.map(c => c.id)).toContain(step2B.id);

    // Test foldHistoryLineage: history.traverse folds lineage entries into siblings without losing path continuity
    tree.foldHistoryLineage('card:1', [
      { hash: 'lineage-hash-1', changedAt: '2026-09-01T10:00:00Z', message: 'commit 1' },
      { hash: 'lineage-hash-2', changedAt: '2026-09-01T11:00:00Z', message: 'commit 2' }
    ], step1.id);

    const updatedStep1Node = tree.node(step1.id);
    const lineageChildren = updatedStep1Node?.children.filter(c => c.arrivedBy === 'history.traverse');
    expect(lineageChildren?.length).toBe(2);
    expect(lineageChildren?.[0].position.hash).toBe('lineage-hash-1');
    expect(lineageChildren?.[1].position.hash).toBe('lineage-hash-2');
  });

  it('39-DOD-02: historical alternatives: alternatives(nodeId) re-resolves the affordance fiber at historical position', async () => {
    // Registry where legality of edit depends on an external mutable flag
    let canEditNow = false;

    const mockRegistry = {
      resolveDirections: (pos: Position) => [
        {
          id: 'edit.text',
          label: 'Edit Text',
          legality: () => canEditNow || pos.hash === 'hash-0',
          execute: async () => ({ success: true })
        },
        {
          id: 'export.pdf',
          label: 'Export PDF',
          legality: () => true,
          execute: async () => ({ success: true })
        }
      ]
    };

    const tree = new InteractionTree(rootPos, mockRegistry as any);

    // At rootPos, edit.text was legal and snapshot
    const rootAlts = tree.alternatives(tree.root().id);
    expect(rootAlts.map(d => d.id)).toContain('edit.text');

    // Step forward with canEditNow = false
    const step1 = await tree.step({
      id: 'step1',
      label: 'Step 1',
      legality: () => true,
      execute: async () => ({ success: true })
    }, { ...rootPos, hash: 'hash-1' });

    // Alternatives for root node still report edit.text (historical alternatives intact)
    const historicalRootAlts = tree.alternatives(tree.root().id);
    expect(historicalRootAlts.map(d => d.id)).toContain('edit.text');
  });
});
