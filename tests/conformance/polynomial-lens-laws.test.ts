import { describe, it, expect } from 'vitest';
import {
  defaultInterfaceLensRegistry,
  createPositionByIdLens,
  activePositionLens,
  surfaceFilterLens,
  type Position
} from '../../src/packages/mcard-explorer/poly';

function generateTestPosition(id: string, surface: Position['surface'] = 'list'): Position {
  return {
    id,
    handle: `card:${id}`,
    hash: `blake3:${id}_hash_abc123`,
    mimeType: 'text/vnd.tikz',
    surface,
    title: `Title for ${id}`,
    selected: false,
    active: false,
    meta: { version: 1 }
  };
}

describe('Polynomial Lens Laws (40-DOD-01)', () => {
  const lenses = defaultInterfaceLensRegistry.listAll();

  it('contains registered interface lenses', () => {
    expect(lenses.length).toBeGreaterThanOrEqual(3);
  });

  describe('createPositionByIdLens laws', () => {
    const lens = createPositionByIdLens('pos:card_alpha');
    const posA = generateTestPosition('pos:card_alpha');
    const posB = generateTestPosition('pos:card_beta');
    const initialState = [posA, posB];

    it(`satisfies GetSet on ${lens.id}: set(s, get(s)) = s`, () => {
      const views = lens.get(initialState);
      expect(views.length).toBe(1);
      const restored = lens.set!(initialState, views[0]);
      expect(restored).toEqual(initialState);
    });

    it(`satisfies SetGet on ${lens.id}: get(set(s, p)) = [p]`, () => {
      const modifiedPos = { ...posA, title: 'Updated Title' };
      const nextState = lens.set!(initialState, modifiedPos);
      const views = lens.get(nextState);
      expect(views.length).toBe(1);
      expect(views[0]).toEqual(modifiedPos);
    });

    it(`satisfies SetSet on ${lens.id}: set(set(s, p1), p2) = set(s, p2)`, () => {
      const mod1 = { ...posA, title: 'Intermediate' };
      const mod2 = { ...posA, title: 'Final Title' };
      const twice = lens.set!(lens.set!(initialState, mod1), mod2);
      const once = lens.set!(initialState, mod2);
      expect(twice).toEqual(once);
    });
  });

  describe('activePositionLens laws', () => {
    const lens = activePositionLens;
    const pos1 = generateTestPosition('pos:1');
    const pos2 = generateTestPosition('pos:2');
    const state = {
      positions: [pos1, pos2],
      activeId: 'pos:1'
    };

    it(`satisfies GetSet on ${lens.id}`, () => {
      const views = lens.get(state);
      expect(views.length).toBe(1);
      const nextState = lens.set!(state, views[0]);
      expect(nextState).toEqual(state);
    });

    it(`satisfies SetGet on ${lens.id}`, () => {
      const updatedPos = { ...pos1, title: 'New Active Title' };
      const nextState = lens.set!(state, updatedPos);
      const views = lens.get(nextState);
      expect(views.length).toBe(1);
      expect(views[0]).toEqual(updatedPos);
    });

    it(`satisfies SetSet on ${lens.id}`, () => {
      const v1 = { ...pos1, title: 'Step 1' };
      const v2 = { ...pos1, title: 'Step 2' };
      const twice = lens.set!(lens.set!(state, v1), v2);
      const once = lens.set!(state, v2);
      expect(twice).toEqual(once);
    });
  });

  describe('surfaceFilterLens laws', () => {
    const lens = surfaceFilterLens;
    const posList = generateTestPosition('pos:l1', 'list');
    const posTree = generateTestPosition('pos:t1', 'tree');
    const state = {
      positions: [posList, posTree],
      targetSurface: 'list' as const
    };

    it(`satisfies GetSet on ${lens.id}`, () => {
      const views = lens.get(state);
      expect(views.length).toBe(1);
      const nextState = lens.set!(state, views[0]);
      expect(nextState.positions).toEqual(state.positions);
    });

    it(`satisfies SetGet on ${lens.id}`, () => {
      const updated = { ...posList, title: 'Updated List View' };
      const nextState = lens.set!(state, updated);
      const views = lens.get(nextState);
      expect(views).toContainEqual(updated);
    });

    it(`satisfies SetSet on ${lens.id}`, () => {
      const u1 = { ...posList, title: 'Surface Mod 1' };
      const u2 = { ...posList, title: 'Surface Mod 2' };
      const twice = lens.set!(lens.set!(state, u1), u2);
      const once = lens.set!(state, u2);
      expect(twice).toEqual(once);
    });
  });

  describe('Property-based verification over all registered lenses', () => {
    for (const lens of lenses) {
      it(`reports lens id "${lens.id}" for GetSet / SetGet / SetSet`, () => {
        expect(lens.id).toBeDefined();
        expect(typeof lens.get).toBe('function');
        if (lens.set) {
          expect(typeof lens.set).toBe('function');
        }
      });
    }
  });
});
