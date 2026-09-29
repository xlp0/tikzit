import { describe, it, expect } from 'vitest';
import { InteractionTree } from '../../../../src/packages/mcard-explorer/time/InteractionTree';
import {
  encodeTimelineHash,
  decodeTimelineHash,
  TimelineNavigationProvider,
  restoreTimelineFromAddress,
  type TimelinePosition
} from '../../../../src/packages/mcard-explorer/time/timeline';
import type { Position } from '../../../../src/packages/mcard-explorer/poly/types';

describe('Timeline Navigation & Deep-Link Hash Round-Trip (39-DOD-22)', () => {
  const rootPos: Position = {
    id: 'pos:root',
    handle: 'card:hash-test',
    hash: 'hash-0',
    mimeType: 'text/markdown',
    surface: 'list'
  };

  it('39-DOD-22: encodeTimelineHash and decodeTimelineHash round-trip #t=<nodeId>', () => {
    const nodeId = 'node_42_branch_a';
    const hash = encodeTimelineHash(nodeId);
    expect(hash).toBe('#t=node_42_branch_a');

    const decoded = decodeTimelineHash(hash);
    expect(decoded).toBe(nodeId);
  });

  it('39-DOD-22: TimelineNavigationProvider encodes and decodes TimelinePosition', () => {
    const pos: TimelinePosition = {
      ...rootPos,
      id: 'pos:timeline:node_step_3',
      surface: 'timeline',
      timelineNodeId: 'node_step_3'
    };

    const address = TimelineNavigationProvider.encodeAddress?.(pos);
    expect(address).toBe('#t=node_step_3');

    const decoded = TimelineNavigationProvider.decodeAddress?.(address!) as TimelinePosition;
    expect(decoded).toBeDefined();
    expect(decoded.timelineNodeId).toBe('node_step_3');
  });

  it('39-DOD-22: restoreTimelineFromAddress rewinds tree active cursor accurately without desync', async () => {
    const tree = new InteractionTree(rootPos);

    const step1 = await tree.step({
      id: 'dir:1',
      label: 'Step 1',
      legality: () => true,
      execute: async () => ({ success: true })
    }, { ...rootPos, hash: 'h1' });

    const step2 = await tree.step({
      id: 'dir:2',
      label: 'Step 2',
      legality: () => true,
      execute: async () => ({ success: true })
    }, { ...rootPos, hash: 'h2' });

    expect(tree.activeId()).toBe(step2.id);

    // Deep-link address pointing to step1
    const deepLinkAddress = encodeTimelineHash(step1.id);
    const restoredTarget = restoreTimelineFromAddress(tree, deepLinkAddress);

    expect(restoredTarget).toBe(step1.id);
    expect(tree.activeId()).toBe(step1.id);

    // The active path now stops at step1
    const activePath = tree.path();
    expect(activePath.map(n => n.id)).toEqual([tree.root().id, step1.id]);
  });
});
