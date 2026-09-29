/** @layer L4 interface/membrane */
import type { Position, InterfaceLens } from './types';

export interface NamedInterfaceLens<S = any, P extends Position = Position> extends InterfaceLens<S, P> {
  readonly id: string;
  readonly label: string;
}

/**
 * Focuses on a single position by ID within a collection of positions.
 */
export function createPositionByIdLens(targetId: string): NamedInterfaceLens<readonly Position[], Position> {
  return {
    id: `lens:position:${targetId}`,
    label: `Position by ID (${targetId})`,
    get: (state: readonly Position[]) => {
      const match = state.find((p) => p.id === targetId);
      return match ? [match] : [];
    },
    set: (state: readonly Position[], position: Position) => {
      const idx = state.findIndex((p) => p.id === position.id);
      if (idx === -1) {
        return [...state, position];
      }
      const next = [...state];
      next[idx] = position;
      return next;
    }
  };
}

export interface ExplorerStateWithActive {
  readonly positions: readonly Position[];
  readonly activeId: string | null;
}

/**
 * Focuses on the active position in ExplorerStateWithActive.
 */
export const activePositionLens: NamedInterfaceLens<ExplorerStateWithActive, Position> = {
  id: 'lens:explorer:active',
  label: 'Active Position Lens',
  get: (state: ExplorerStateWithActive) => {
    if (!state.activeId) return [];
    const match = state.positions.find((p) => p.id === state.activeId);
    return match ? [match] : [];
  },
  set: (state: ExplorerStateWithActive, position: Position) => {
    const idx = state.positions.findIndex((p) => p.id === position.id);
    const nextPositions = idx === -1
      ? [...state.positions, position]
      : state.positions.map((p, i) => (i === idx ? position : p));
    return {
      positions: nextPositions,
      activeId: position.id
    };
  }
};

export interface ExplorerStateWithSurface {
  readonly positions: readonly Position[];
  readonly targetSurface: Position['surface'];
}

/**
 * Focuses on positions matching targetSurface.
 */
export const surfaceFilterLens: NamedInterfaceLens<ExplorerStateWithSurface, Position> = {
  id: 'lens:explorer:surface',
  label: 'Surface Filter Lens',
  get: (state: ExplorerStateWithSurface) => {
    return state.positions.filter((p) => p.surface === state.targetSurface);
  },
  set: (state: ExplorerStateWithSurface, position: Position) => {
    const updated = position.surface === state.targetSurface
      ? position
      : { ...position, surface: state.targetSurface };
    const idx = state.positions.findIndex((p) => p.id === updated.id);
    const nextPositions = idx === -1
      ? [...state.positions, updated]
      : state.positions.map((p, i) => (i === idx ? updated : p));
    return {
      ...state,
      positions: nextPositions
    };
  }
};

/**
 * Registry of registered InterfaceLens instances.
 */
export class InterfaceLensRegistry {
  private lenses = new Map<string, NamedInterfaceLens>();

  constructor() {
    this.register(activePositionLens);
    this.register(surfaceFilterLens);
    this.register(createPositionByIdLens('pos:default'));
  }

  public register(lens: NamedInterfaceLens): () => void {
    this.lenses.set(lens.id, lens);
    return () => {
      this.lenses.delete(lens.id);
    };
  }

  public get(id: string): NamedInterfaceLens | undefined {
    return this.lenses.get(id);
  }

  public listAll(): readonly NamedInterfaceLens[] {
    return Array.from(this.lenses.values());
  }
}

export const defaultInterfaceLensRegistry = new InterfaceLensRegistry();
