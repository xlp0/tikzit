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

describe('toStudioPortDescriptor (ADR D34 / ADR D54)', () => {
  it('toStudioPortDescriptor maps CardPort to studio descriptor with exact field parity (37-DOD-18)', async () => {
    const { toStudioPortDescriptor } = await import('../../src/packages/mcard-explorer/cards/adapters/studioPortDescriptor');
    const port = {
      id: 'out:render',
      direction: 'out' as const,
      type: { mime: 'image/svg+xml', universe: 'U0' },
      label: 'Render SVG',
      required: false
    };

    const studioDesc = toStudioPortDescriptor(port);
    expect(studioDesc).toEqual({
      id: 'out:render',
      kind: 'out',
      mime: 'image/svg+xml',
      universe: 'U0',
      label: 'Render SVG',
      required: false
    });
  });
});

describe('studioMCardFs Port Conformance (ADR D54 / 37-DOD-17)', () => {
  it('studioMCardFs test double implements CardStorePort and CardVcsPort with studio signatures', async () => {
    const { cardCreate, cardGetByHash, cardHistory } = await import('../../src/packages/mcard-explorer/cards/handles');

    // Studio VFS facade test double matching mcard-studio vfsHandles, vfsVersions, vfsMutations
    class StudioMCardFsDouble {
      public handles = new Map<string, { content: Uint8Array; meta?: any }>();
      public hashes = new Map<string, Uint8Array>();
      public history = new Map<string, { hash: string; changedAt: string; message?: string }[]>();

      // CardStorePort
      public async set(handle: string, content: Uint8Array, meta?: Record<string, unknown>) {
        const hash = `blake3:${handle}`;
        this.handles.set(handle, { content, meta });
        this.hashes.set(hash, content);
        const hist = this.history.get(handle) || [];
        hist.unshift({ hash, changedAt: new Date().toISOString(), message: 'Studio commit' });
        this.history.set(handle, hist);
        return { hash };
      }

      public async getByHash(hash: string) {
        const content = this.hashes.get(hash);
        if (!content) return null;
        return { content, mimeType: 'application/octet-stream' };
      }

      // CardVcsPort
      public async getHistory(handle: string) {
        return this.history.get(handle) || [];
      }
    }

    const fs = new StudioMCardFsDouble();
    const content = new TextEncoder().encode('sovereign card content');

    const created = await cardCreate(fs, 'studio:card:1', content, { author: 'did:key:123' });
    expect(created.hash).toBe('blake3:studio:card:1');

    const readBack = await cardGetByHash(fs, created.hash);
    expect(readBack?.content).toEqual(content);

    const history = await cardHistory(fs, 'studio:card:1');
    expect(history).toHaveLength(1);
    expect(history[0].message).toBe('Studio commit');
  });
});
