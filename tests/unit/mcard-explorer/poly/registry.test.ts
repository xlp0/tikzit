import { describe, it, expect, vi } from 'vitest';
import { PolyInterfaceRegistry } from '../../../../src/packages/mcard-explorer/poly/registry';
import type { Direction, Position } from '../../../../src/packages/mcard-explorer/poly/types';

describe('PolyInterfaceRegistry', () => {
  const dummyPos: Position = {
    id: 'pos:1',
    handle: 'zx:diagrams:ghz',
    hash: '12345678',
    mimeType: 'text/x-tikz',
    surface: 'list'
  };

  it('registers directions and returns working disposer function', () => {
    const reg = new PolyInterfaceRegistry();
    const d1: Direction = {
      id: 'card.view',
      label: 'View',
      legality: () => true,
      execute: async () => ({ success: true })
    };

    const dispose = reg.register(d1);
    expect(reg.listAll()).toHaveLength(1);
    expect(reg.resolve('card.view', dummyPos)).toBe(d1);

    dispose();
    expect(reg.listAll()).toHaveLength(0);
    expect(reg.resolve('card.view', dummyPos)).toBeUndefined();
  });

  it('resolves legal directions and orders by group then id', () => {
    const reg = new PolyInterfaceRegistry();

    const d1: Direction = {
      id: 'b_mutate',
      label: 'B Mutate',
      group: 'mutate',
      legality: () => true,
      execute: async () => ({ success: true })
    };

    const d2: Direction = {
      id: 'a_mutate',
      label: 'A Mutate',
      group: 'mutate',
      legality: () => true,
      execute: async () => ({ success: true })
    };

    const d3: Direction = {
      id: 'export_all',
      label: 'Export',
      group: 'export',
      legality: () => true,
      execute: async () => ({ success: true })
    };

    const dIllegal: Direction = {
      id: 'illegal_action',
      label: 'Illegal',
      group: 'admin',
      legality: () => false,
      execute: async () => ({ success: true })
    };

    reg.register(d1);
    reg.register(d2);
    reg.register(d3);
    reg.register(dIllegal);

    const resolved = reg.resolveDirections(dummyPos);
    expect(resolved.map(d => d.id)).toEqual(['export_all', 'a_mutate', 'b_mutate']);
  });

  it('fail-closes to false when a legality predicate throws an error', () => {
    const reg = new PolyInterfaceRegistry();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const dThrow: Direction = {
      id: 'exploding.action',
      label: 'Exploding',
      legality: () => {
        throw new Error('Kernel panic inside predicate');
      },
      execute: async () => ({ success: true })
    };

    const dNormal: Direction = {
      id: 'normal.action',
      label: 'Normal',
      legality: () => true,
      execute: async () => ({ success: true })
    };

    reg.register(dThrow);
    reg.register(dNormal);

    // resolveDirections must not throw, and must omit dThrow
    let resolved: readonly Direction[] = [];
    expect(() => {
      resolved = reg.resolveDirections(dummyPos);
    }).not.toThrow();

    expect(resolved.map(d => d.id)).toEqual(['normal.action']);
    expect(reg.resolve('exploding.action', dummyPos)).toBeUndefined();
    expect(reg.resolve('normal.action', dummyPos)).toBe(dNormal);

    consoleWarnSpy.mockRestore();
  });
});
