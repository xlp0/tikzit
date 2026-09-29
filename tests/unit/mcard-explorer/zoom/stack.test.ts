import { describe, it, expect } from 'vitest';
import {
  ZoomStack,
  createDefaultStructureRegistry,
  type CardContentProvider
} from '../../../../src/packages/mcard-explorer/zoom';
import type { Position } from '../../../../src/packages/mcard-explorer/poly/types';

describe('ZoomStack (Sprint 38)', () => {
  const dummyContent: Record<string, { text?: string; mimeType?: string }> = {
    'doc:notes': { text: '# Title\nContent', mimeType: 'text/markdown' },
    'sub:doc': { text: '# Sub\nDetails', mimeType: 'text/markdown' },
    'leaf:opaque': { text: 'raw binary', mimeType: 'application/octet-stream' }
  };

  const contentProvider: CardContentProvider = {
    getContent: async (handle: string) => {
      const entry = dummyContent[handle];
      if (!entry) return null;
      return { text: entry.text, mimeType: entry.mimeType };
    }
  };

  const createTestPos = (handle: string, mimeType: string): Position => ({
    id: `pos:${handle}`,
    handle,
    hash: 'h_test',
    mimeType,
    surface: 'list'
  });

  it('38-DOD-05: resolves zoom directions, enters, exits, navigates to ancestors, and builds breadcrumbs', async () => {
    const registry = createDefaultStructureRegistry();
    const stack = new ZoomStack(registry, contentProvider);

    // Initial root state
    expect(stack.currentPath.cursor).toBe(0);
    expect(stack.nodes()).toEqual([]);
    expect(stack.breadcrumb()).toEqual([{ label: 'Root', handle: '', cursor: 0 }]);

    // exit() at root level is an idempotent no-op and never throws
    const rootPath = stack.exit();
    expect(rootPath.cursor).toBe(0);

    // Resolve zoom directions
    const markdownPos = createTestPos('doc:notes', 'text/markdown');
    const directions = stack.resolveZoomDirections(markdownPos);
    expect(directions.map(d => d.id)).toContain('zoom.enter');

    // Enter level 1
    const p1 = await stack.enter(markdownPos);
    expect(p1.cursor).toBe(1);
    expect(stack.nodes().length).toBeGreaterThan(0);
    expect(stack.breadcrumb().map(b => b.label)).toEqual(['Root', 'doc:notes']);

    // Enter level 2
    const subPos = createTestPos('sub:doc', 'text/markdown');
    const p2 = await stack.enter(subPos);
    expect(p2.cursor).toBe(2);
    expect(stack.breadcrumb().map(b => b.label)).toEqual(['Root', 'doc:notes', 'sub:doc']);

    // Jump to ancestor via to(1)
    const pJump = stack.to(1);
    expect(pJump.cursor).toBe(1);
    expect(stack.breadcrumb().map(b => b.label)).toEqual(['Root', 'doc:notes']);

    // Exit level 1 back to root
    const pExit = stack.exit();
    expect(pExit.cursor).toBe(0);
    expect(stack.breadcrumb().map(b => b.label)).toEqual(['Root']);
  });

  it('enforces max depth bound (<= 8)', async () => {
    const registry = createDefaultStructureRegistry();
    const stack = new ZoomStack(registry, contentProvider, { maxDepth: 3 });

    const pos1 = createTestPos('doc1', 'text/markdown');
    dummyContent['doc1'] = { text: '# 1', mimeType: 'text/markdown' };
    const pos2 = createTestPos('doc2', 'text/markdown');
    dummyContent['doc2'] = { text: '# 2', mimeType: 'text/markdown' };
    const pos3 = createTestPos('doc3', 'text/markdown');
    dummyContent['doc3'] = { text: '# 3', mimeType: 'text/markdown' };
    const pos4 = createTestPos('doc4', 'text/markdown');
    dummyContent['doc4'] = { text: '# 4', mimeType: 'text/markdown' };

    await stack.enter(pos1);
    await stack.enter(pos2);
    await stack.enter(pos3);
    expect(stack.currentPath.cursor).toBe(3);

    // Attempt 4th level exceeds maxDepth of 3
    const p4 = await stack.enter(pos4);
    expect(p4.cursor).toBe(3);
  });

  it('enforces cycle prevention guard on recurring handles', async () => {
    const registry = createDefaultStructureRegistry();
    const stack = new ZoomStack(registry, contentProvider);

    const posA = createTestPos('doc:cycle', 'text/markdown');
    dummyContent['doc:cycle'] = { text: '# Cycle', mimeType: 'text/markdown' };

    await stack.enter(posA);
    expect(stack.currentPath.cursor).toBe(1);

    // Re-entering same handle must be rejected to prevent infinite loop
    const pCycle = await stack.enter(posA);
    expect(pCycle.cursor).toBe(1);
  });

  it('38-DOD-06: guardrail absence: a leaf card with no applicable provider resolves an empty zoom fiber', () => {
    const registry = createDefaultStructureRegistry();
    const stack = new ZoomStack(registry, contentProvider);

    const opaquePos = createTestPos('leaf_opaque.bin', 'application/octet-stream');
    const directions = stack.resolveZoomDirections(opaquePos);

    // The zoom affordance is absent - empty fiber
    expect(directions).toEqual([]);
    expect(directions.find(d => d.id === 'zoom.enter')).toBeUndefined();
  });
});
