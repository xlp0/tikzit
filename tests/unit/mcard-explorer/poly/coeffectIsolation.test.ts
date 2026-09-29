import { describe, it, expect, vi } from 'vitest';
import {
  CoeffectHost,
  CoeffectEnvironment
} from '../../../../src/packages/mcard-explorer/poly/coeffects';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('Coeffect Isolation (39-DOD-09)', () => {
  const dummyPos: Position = {
    id: 'pos:target',
    handle: 'card:test',
    hash: 'h',
    mimeType: 'text/plain',
    surface: 'list'
  };

  it('39-DOD-09: Mutating coeffect in instance A does not trigger direction legality re-evaluation in instance B', () => {
    // Instance A
    const envA = new CoeffectEnvironment({ permissions: { canDelete: false } });
    const legalitySpyA = vi.fn(() => Boolean(envA.get().permissions?.canDelete));
    const dirA: Direction = {
      id: 'delete.card',
      label: 'Delete',
      legality: legalitySpyA,
      execute: async () => ({ success: true })
    };

    // Instance B
    const envB = new CoeffectEnvironment({ permissions: { canDelete: false } });
    const legalitySpyB = vi.fn(() => Boolean(envB.get().permissions?.canDelete));
    const dirB: Direction = {
      id: 'delete.card',
      label: 'Delete',
      legality: legalitySpyB,
      execute: async () => ({ success: true })
    };

    // Initial check
    expect(dirA.legality(dummyPos)).toBe(false);
    expect(dirB.legality(dummyPos)).toBe(false);
    expect(legalitySpyA).toHaveBeenCalledTimes(1);
    expect(legalitySpyB).toHaveBeenCalledTimes(1);

    // Subscribe to trigger re-evaluations
    envA.subscribe(() => {
      dirA.legality(dummyPos);
    });
    envB.subscribe(() => {
      dirB.legality(dummyPos);
    });

    // Mutate Instance A coeffect
    envA.update({ permissions: { canDelete: true } });

    // Instance A should have re-evaluated
    expect(legalitySpyA).toHaveBeenCalledTimes(2);
    expect(dirA.legality(dummyPos)).toBe(true);

    // Instance B must NOT have been called or affected
    expect(legalitySpyB).toHaveBeenCalledTimes(1);
    expect(dirB.legality(dummyPos)).toBe(false);
  });

  it('39-DOD-09: CoeffectHost slice values are strictly isolated across instances', () => {
    const hostA = new CoeffectHost();
    const hostB = new CoeffectHost();

    const changeA = vi.fn();
    const changeB = vi.fn();

    hostA.bind({
      panelId: 'panel-1',
      slices: ['filter'],
      onChange: changeA
    });

    hostB.bind({
      panelId: 'panel-1',
      slices: ['filter'],
      onChange: changeB
    });

    hostA.publish('filter', 'active-only');

    expect(hostA.get('filter')).toBe('active-only');
    expect(hostB.get('filter')).toBeUndefined();
    expect(changeA).toHaveBeenCalledWith('active-only', undefined);
    expect(changeB).not.toHaveBeenCalled();
  });
});
