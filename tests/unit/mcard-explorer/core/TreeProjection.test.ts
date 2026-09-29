import { describe, it, expect } from 'vitest';
import { TreeProjection } from '../../../../src/packages/mcard-explorer/core/TreeProjection';
import type { ExplorerCardSummaryDto } from '../../../../src/packages/mcard-explorer/core/datasource/types';

describe('TreeProjection (ADR D54)', () => {
  const sampleItems: ExplorerCardSummaryDto[] = [
    {
      handle: 'zx:diagrams:teleportation',
      hash: 'h1',
      mimeType: 'text/x-tikz',
      category: 'diagram',
      updatedAt: '2026-09-01T00:00:00Z'
    },
    {
      handle: 'zx:diagrams:GHZ',
      hash: 'h2',
      mimeType: 'text/x-tikz',
      category: 'diagram',
      updatedAt: '2026-09-01T00:00:00Z'
    },
    {
      handle: 'zx:root_note',
      hash: 'h3',
      mimeType: 'text/markdown',
      category: 'text',
      updatedAt: '2026-09-01T00:00:00Z'
    },
    {
      handle: 'zx:diagrams:bell',
      hash: 'h4',
      mimeType: 'text/x-tikz',
      category: 'diagram',
      updatedAt: '2026-09-01T00:00:00Z'
    }
  ];

  it('projects items into hierarchical namespace nodes', () => {
    const projection = new TreeProjection();
    const tree = projection.projectTree(sampleItems);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('zx');
    expect(tree[0].isFolder).toBe(true);
    expect(tree[0].children).toBeDefined();

    const zxChildren = tree[0].children!;
    // Directories come first: 'diagrams' (folder) must precede 'root_note' (leaf)
    expect(zxChildren[0].name).toBe('diagrams');
    expect(zxChildren[0].isFolder).toBe(true);
    expect(zxChildren[1].name).toBe('root_note');
    expect(zxChildren[1].isFolder).toBe(false);

    // Within diagrams, leaves are sorted case-insensitively: 'bell' < 'GHZ' < 'teleportation'
    const diagramLeaves = zxChildren[0].children!;
    expect(diagramLeaves.map(n => n.name)).toEqual(['bell', 'GHZ', 'teleportation']);
  });

  it('supports slash delimiter for mcard-studio compatibility', () => {
    const projection = new TreeProjection();
    const studioItems: ExplorerCardSummaryDto[] = [
      {
        handle: 'models/llm/gpt4',
        hash: 'h10',
        mimeType: 'application/json',
        updatedAt: '2026-09-01T00:00:00Z'
      }
    ];

    const tree = projection.projectTree(studioItems);
    expect(tree[0].name).toBe('models');
    expect(tree[0].isFolder).toBe(true);
    expect(tree[0].children![0].name).toBe('llm');
    expect(tree[0].children![0].children![0].name).toBe('gpt4');
    expect(tree[0].children![0].children![0].isFolder).toBe(false);
  });
});
