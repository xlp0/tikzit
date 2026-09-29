import { describe, it, expect } from 'vitest';
import { TreeProjection } from '../../src/packages/mcard-explorer/core/TreeProjection';
import type { ExplorerCardSummaryDto, ExplorerTreeNode } from '../../src/packages/mcard-explorer/core/datasource/types';

/**
 * Reference implementation of mcard-studio's buildArtifactTree (src/utils/artifactTree.ts).
 */
interface StudioArtifact {
  path: string;
  hash: string;
  mimeType: string;
}

interface StudioTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: StudioTreeNode[];
  handle?: string;
  hash?: string;
  mimeType?: string;
}

function buildArtifactTreeReference(artifacts: StudioArtifact[]): StudioTreeNode[] {
  const root: StudioTreeNode[] = [];

  for (const art of artifacts) {
    const parts = art.path.split(/[:/]/).filter(Boolean);
    let current = root;
    let accumulated = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated = accumulated ? `${accumulated}:${part}` : part;
      const isLeaf = i === parts.length - 1;

      let existing = current.find(n => n.name.toLowerCase() === part.toLowerCase());
      if (!existing) {
        existing = {
          name: part,
          path: accumulated,
          isFolder: !isLeaf,
          ...(isLeaf ? { handle: art.path, hash: art.hash, mimeType: art.mimeType } : { children: [] })
        };
        current.push(existing);
      }

      if (!isLeaf) {
        if (!existing.children) existing.children = [];
        current = existing.children;
      }
    }
  }

  function sortNodes(nodes: StudioTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    for (const n of nodes) {
      if (n.children) sortNodes(n.children);
    }
  }

  sortNodes(root);
  return root;
}

describe('Studio Tree Parity (ADR D54)', () => {
  const dataset: ExplorerCardSummaryDto[] = [
    { handle: 'workspace/src/Zebra.ts', hash: 'h1', mimeType: 'text/typescript', updatedAt: '2026-09-01' },
    { handle: 'workspace/src/alpha.ts', hash: 'h2', mimeType: 'text/typescript', updatedAt: '2026-09-01' },
    { handle: 'workspace/README.md', hash: 'h3', mimeType: 'text/markdown', updatedAt: '2026-09-01' },
    { handle: 'workspace/src/components/Button.tsx', hash: 'h4', mimeType: 'text/typescript', updatedAt: '2026-09-01' },
    { handle: 'workspace/docs/guide.md', hash: 'h5', mimeType: 'text/markdown', updatedAt: '2026-09-01' },
    { handle: 'workspace:colon:style:item', hash: 'h6', mimeType: 'application/json', updatedAt: '2026-09-01' }
  ];

  it('TreeProjection matches buildArtifactTree directories-first and case-insensitive order', () => {
    const studioInput: StudioArtifact[] = dataset.map(d => ({
      path: d.handle,
      hash: d.hash,
      mimeType: d.mimeType
    }));

    const studioTree = buildArtifactTreeReference(studioInput);
    const projection = new TreeProjection();
    const tikzitTree = projection.projectTree(dataset);

    // Deep structural comparison
    expect(extractShape(tikzitTree)).toEqual(extractShape(studioTree));
  });
});

function extractShape(nodes: (ExplorerTreeNode | StudioTreeNode)[]): any {
  return nodes.map(n => ({
    name: n.name,
    isFolder: n.isFolder,
    children: n.children ? extractShape(n.children) : undefined
  }));
}
