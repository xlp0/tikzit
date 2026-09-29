import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PositionGroupList } from '../../../../src/packages/mcard-explorer/ui/PositionGroupList';
import { PositionTree, type PositionTreeNode } from '../../../../src/packages/mcard-explorer/ui/PositionTree';
import { PolyInterfaceRegistry } from '../../../../src/packages/mcard-explorer/poly/registry';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('1,000-Card Synthetic Corpus Virtualization & Performance (40-DOD-10)', () => {
  // Generate 1,000-card synthetic corpus
  const syntheticCorpus: Position[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `pos:${i}`,
    handle: `diagram:quantum:teleportation:${i}`,
    hash: `hash_${i}_abcdef1234567890`,
    mimeType: i % 2 === 0 ? 'text/x-tikz' : 'text/markdown',
    surface: 'list',
    title: `Quantum Diagram #${i}`,
    category: i % 2 === 0 ? 'diagram' : 'doc'
  }));

  it('renders 1,000-card corpus with DOM node count bounded by viewport (<= 50 DOM rows)', () => {
    const registry = new PolyInterfaceRegistry();
    registry.register({
      id: 'view',
      label: 'View',
      group: 'view',
      legality: () => true,
      execute: async () => ({ success: true })
    });

    const html = renderToString(
      <PositionGroupList
        positions={syntheticCorpus}
        resolveDirections={(pos) => registry.resolveDirections(pos)}
      />
    );

    // Assert virtualized marker and total count
    expect(html).toContain('data-virtualized="true"');
    expect(html).toContain('data-total-count="1000"');

    // Count rendered DOM rows
    const renderedRows = html.match(/data-testid="card-row-/g) || [];
    expect(renderedRows.length).toBeLessThanOrEqual(50);
    expect(renderedRows.length).toBe(50);
  });

  it('virtualises PositionTree beyond 200 nodes (<= 50 DOM nodes rendered)', () => {
    const syntheticTreeNodes: PositionTreeNode[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `node:${i}`,
      path: `diagrams/quantum/${i}`,
      name: `diagram_${i}.tikz`,
      isFolder: false,
      kind: 'card',
      handle: `diagram:quantum:${i}`,
      hash: `h_tree_${i}`
    }));

    const treeHtml = renderToString(
      <PositionTree
        nodes={syntheticTreeNodes}
        expandedFolders={[]}
      />
    );

    expect(treeHtml).toContain('data-virtualized="true"');
    expect(treeHtml).toContain('data-total-count="1000"');

    const renderedNodes = treeHtml.match(/data-testid="tree-item-/g) || [];
    expect(renderedNodes.length).toBeLessThanOrEqual(50);
    expect(renderedNodes.length).toBe(50);
  });

  it('memoizes direction resolution per (position.id, registry.version)', () => {
    const registry = new PolyInterfaceRegistry();
    expect(registry.version).toBe(0);

    const legalitySpy = vi.fn((_pos: Position) => true);

    const dispose = registry.register({
      id: 'inspect',
      label: 'Inspect',
      group: 'inspect',
      legality: legalitySpy,
      execute: async () => ({ success: true })
    });

    // Version incremented on register
    expect(registry.version).toBe(1);

    const testPos = syntheticCorpus[0];

    // First resolution: cache miss, evaluates legality
    const res1 = registry.resolveDirections(testPos);
    expect(legalitySpy).toHaveBeenCalledTimes(1);
    expect(res1).toHaveLength(1);

    // Second resolution: cache hit, returns memoized array
    const res2 = registry.resolveDirections(testPos);
    expect(legalitySpy).toHaveBeenCalledTimes(1);
    expect(res1).toBe(res2);

    // Third resolution for different position: evaluates legality
    const testPos2 = syntheticCorpus[1];
    const res3 = registry.resolveDirections(testPos2);
    expect(legalitySpy).toHaveBeenCalledTimes(2);

    // Register new direction: version increments and invalidates cache
    const dispose2 = registry.register({
      id: 'edit',
      label: 'Edit',
      group: 'edit',
      legality: () => true,
      execute: async () => ({ success: true })
    });
    expect(registry.version).toBe(2);

    const res4 = registry.resolveDirections(testPos);
    expect(legalitySpy).toHaveBeenCalledTimes(3);
    expect(res4).toHaveLength(2);

    // Dispose direction: version increments and invalidates cache
    dispose2();
    expect(registry.version).toBe(3);

    const res5 = registry.resolveDirections(testPos);
    expect(legalitySpy).toHaveBeenCalledTimes(4);
    expect(res5).toHaveLength(1);

    dispose();
    expect(registry.version).toBe(4);
  });

  it('executes 100-frame synthetic scroll through 1,000 cards with frame rate > 55 FPS', () => {
    const registry = new PolyInterfaceRegistry();
    registry.register({
      id: 'render',
      label: 'Render',
      group: 'view',
      legality: () => true,
      execute: async () => ({ success: true })
    });

    const frameCount = 100;
    const stepSize = 8;
    const start = performance.now();

    for (let frame = 0; frame < frameCount; frame++) {
      const startIndex = (frame * stepSize) % (syntheticCorpus.length - 50);
      const html = renderToString(
        <PositionGroupList
          positions={syntheticCorpus}
          startIndex={startIndex}
          windowSize={50}
          resolveDirections={(pos) => registry.resolveDirections(pos)}
        />
      );
      // Validate each frame renders exactly windowSize items
      const matches = html.match(/data-testid="card-row-/g) || [];
      expect(matches.length).toBe(50);
    }

    const elapsed = performance.now() - start;
    const avgFrameDurationMs = elapsed / frameCount;
    const syntheticFps = 1000 / avgFrameDurationMs;

    expect(syntheticFps).toBeGreaterThan(55);
    expect(avgFrameDurationMs).toBeLessThan(18.18); // 1000ms / 55fps = 18.18ms
  });
});
