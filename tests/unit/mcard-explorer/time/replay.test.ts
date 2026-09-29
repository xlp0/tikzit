import { describe, it, expect } from 'vitest';
import { InteractionTree } from '../../../../src/packages/mcard-explorer/time/InteractionTree';
import { replayTo, auditInvertibility } from '../../../../src/packages/mcard-explorer/time/replay';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('replayTo & auditInvertibility (39-DOD-05)', () => {
  const rootPos: Position = {
    id: 'pos:root',
    handle: 'card:init',
    hash: 'hash-0',
    mimeType: 'text/plain',
    surface: 'list'
  };

  it('39-DOD-05: Replay purity: replaying interaction path on isolated state produces identical state to interactive stepping', async () => {
    const tree = new InteractionTree(rootPos);

    interface AppState {
      currentHash: string;
      tags: string[];
      log: string[];
    }

    const interactiveState: AppState = {
      currentHash: rootPos.hash,
      tags: ['init'],
      log: ['root']
    };

    const step1Pos: Position = { ...rootPos, hash: 'hash-1', id: 'pos:1' };
    const step1Dir: Direction = {
      id: 'tag.add',
      label: 'Add Tag',
      legality: () => true,
      execute: async () => ({ success: true, producedHash: 'hash-1' })
    };
    const node1 = await tree.step(step1Dir, step1Pos);
    interactiveState.currentHash = node1.position.hash;
    interactiveState.tags.push('reviewed');
    interactiveState.log.push(node1.arrivedBy!);

    const step2Pos: Position = { ...step1Pos, hash: 'hash-2', id: 'pos:2' };
    const step2Dir: Direction = {
      id: 'content.update',
      label: 'Update Content',
      legality: () => true,
      execute: async () => ({ success: true, producedHash: 'hash-2' })
    };
    const node2 = await tree.step(step2Dir, step2Pos);
    interactiveState.currentHash = node2.position.hash;
    interactiveState.tags.push('final');
    interactiveState.log.push(node2.arrivedBy!);

    // Replay on fresh isolated state
    const replayedState: AppState = {
      currentHash: '',
      tags: [],
      log: []
    };

    replayTo(tree, node2.id, (node) => {
      replayedState.currentHash = node.position.hash;
      if (node.arrivedBy === 'tag.add') {
        replayedState.tags.push('reviewed');
        replayedState.log.push(node.arrivedBy);
      } else if (node.arrivedBy === 'content.update') {
        replayedState.tags.push('final');
        replayedState.log.push(node.arrivedBy);
      } else {
        replayedState.tags.push('init');
        replayedState.log.push('root');
      }
    });

    expect(replayedState).toEqual(interactiveState);
    expect(replayedState.currentHash).toBe('hash-2');
    expect(replayedState.tags).toEqual(['init', 'reviewed', 'final']);
  });

  it('auditInvertibility detects non-invertible side-effect IDs', () => {
    const entries = [
      { id: 'edit.text', label: 'Edit Text' },
      { id: 'sink.diskWrite', label: 'Write to Disk' },
      { id: 'download.archive', label: 'Download Zip' },
      { id: 'mcard.export.disk', label: 'Export Disk' },
      { id: 'zoom.in', label: 'Zoom In' }
    ];

    const nonInvertible = auditInvertibility(entries);
    expect(nonInvertible).toEqual([
      'sink.diskWrite',
      'download.archive',
      'mcard.export.disk'
    ]);
  });
});
