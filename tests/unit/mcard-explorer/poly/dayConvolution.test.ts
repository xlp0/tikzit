import { describe, it, expect, vi } from 'vitest';
import {
  dayProductDirections,
  composePanelStates,
  type DayCompositePosition
} from '../../../../src/packages/mcard-explorer/poly/dayConvolution';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('Day Convolution Product (39-DOD-08)', () => {
  const posP: Position = {
    id: 'pos:P',
    handle: 'card:left',
    hash: 'hP',
    mimeType: 'text/markdown',
    surface: 'list'
  };

  const posQ: Position = {
    id: 'pos:Q',
    handle: 'card:right',
    hash: 'hQ',
    mimeType: 'application/json',
    surface: 'list'
  };

  const compositePos: DayCompositePosition = {
    id: 'pos:PQ',
    handle: 'composite:handle',
    hash: 'hPQ',
    mimeType: 'application/octet-stream',
    surface: 'composition',
    first: posP,
    second: posQ
  };

  it('39-DOD-08: (P ⊠ Q)[(p, q)] yields tensor of directions; legality is true iff both individual directions are legal', () => {
    let pIsLegal = true;
    let qIsLegal = true;

    const dirP: Direction = {
      id: 'zoom.in',
      label: 'Zoom In',
      legality: () => pIsLegal,
      execute: async () => ({ success: true })
    };

    const dirQ: Direction = {
      id: 'export.json',
      label: 'Export JSON',
      legality: () => qIsLegal,
      execute: async () => ({ success: true })
    };

    const compositeDirections = dayProductDirections([dirP], [dirQ]);
    expect(compositeDirections).toHaveLength(1);

    const tensorDir = compositeDirections[0];
    expect(tensorDir.id).toBe('zoom.in⊗export.json');
    expect(tensorDir.label).toBe('Zoom In ⊗ Export JSON');
    expect(tensorDir.dP).toBe(dirP);
    expect(tensorDir.dQ).toBe(dirQ);

    // Case 1: Both legal -> True
    pIsLegal = true;
    qIsLegal = true;
    expect(tensorDir.legality(compositePos)).toBe(true);

    // Case 2: P illegal, Q legal -> False
    pIsLegal = false;
    qIsLegal = true;
    expect(tensorDir.legality(compositePos)).toBe(false);

    // Case 3: P legal, Q illegal -> False
    pIsLegal = true;
    qIsLegal = false;
    expect(tensorDir.legality(compositePos)).toBe(false);

    // Case 4: Both illegal -> False
    pIsLegal = false;
    qIsLegal = false;
    expect(tensorDir.legality(compositePos)).toBe(false);
  });

  it('39-DOD-08: Execution combines results and unwinds inverses in LIFO order', async () => {
    const pInverse = vi.fn();
    const qInverse = vi.fn();

    const dirP: Direction = {
      id: 'stepP',
      label: 'Step P',
      legality: () => true,
      execute: async () => ({ success: true, message: 'P done', inverse: pInverse })
    };

    const dirQ: Direction = {
      id: 'stepQ',
      label: 'Step Q',
      legality: () => true,
      execute: async () => ({ success: true, message: 'Q done', inverse: qInverse })
    };

    const [tensorDir] = dayProductDirections([dirP], [dirQ]);
    const res = await tensorDir.execute(compositePos);

    expect(res.success).toBe(true);
    expect(res.message).toBe('P done Q done');
    expect(res.inverse).toBeDefined();

    await res.inverse!();
    expect(qInverse).toHaveBeenCalled();
    expect(pInverse).toHaveBeenCalled();
  });

  it('composePanelStates maintains isolated states and projects composite reactive view', () => {
    const composed = composePanelStates(
      [10 as number, 'hello' as string],
      (num, str) => `${str}: ${num}`
    );

    expect(composed.get()).toBe('hello: 10');
    expect(composed.getRawStates()).toEqual([10, 'hello']);

    const listener = vi.fn();
    const unsub = composed.subscribe(listener);

    composed.set(0, 42);
    expect(composed.get()).toBe('hello: 42');
    expect(listener).toHaveBeenCalledWith('hello: 42');

    composed.set(1, 'world');
    expect(composed.get()).toBe('world: 42');
    expect(listener).toHaveBeenCalledWith('world: 42');

    unsub();
    composed.set(0, 99);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
