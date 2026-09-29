import { describe, it, expect } from 'vitest';
import { censusFiber, fiberDegree } from '../../../../src/packages/mcard-explorer/poly/census';
import type { Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('Numeric Fiber Census Adapter', () => {
  it('degree of empty directions array is 0', () => {
    expect(fiberDegree([])).toBe(0);
    const poly = censusFiber([]);
    expect(poly.degree).toBe(0);
    expect(poly.isZero).toBe(true);
  });

  it('censuses directions into monomial terms by group', () => {
    const directions: Direction[] = [
      { id: 'm1', label: 'M1', group: 'mutate', legality: () => true, execute: async () => ({ success: true }) },
      { id: 'm2', label: 'M2', group: 'mutate', legality: () => true, execute: async () => ({ success: true }) },
      { id: 'm3', label: 'M3', group: 'mutate', legality: () => true, execute: async () => ({ success: true }) },
      { id: 'e1', label: 'E1', group: 'export', legality: () => true, execute: async () => ({ success: true }) },
      { id: 'n1', label: 'N1', group: 'navigate', legality: () => true, execute: async () => ({ success: true }) }
    ];

    const poly = censusFiber(directions);
    // 3 distinct groups: mutate (3), export (1), navigate (1)
    expect(poly.degree).toBe(3);
    expect(fiberDegree(directions)).toBe(3);

    // Leading coefficient is the largest group size (3)
    const leadingTerm = poly.terms[0];
    expect(leadingTerm.coefficient).toBe(3);
    expect(leadingTerm.tag).toBe('mutate');
  });
});
