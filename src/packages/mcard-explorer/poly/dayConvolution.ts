/** @layer L4 interface/membrane */
import type { Position, Direction } from './types';

export interface ComposedState<T extends readonly unknown[], R> {
  get(): R;
  set<K extends keyof T & number>(index: K, value: T[K]): void;
  subscribe(listener: (value: R) => void): () => void;
  getRawStates(): readonly [...T];
}

/**
 * Compose independent panel states without entanglement (Day convolution shape).
 * Each panel maintains isolated local state; project maps tuple into composed interface.
 */
export function composePanelStates<T extends readonly unknown[], R>(
  initialStates: T,
  project: (...states: T) => R
): ComposedState<T, R> {
  const current = [...initialStates] as unknown as [...T];
  const listeners = new Set<(value: R) => void>();

  return {
    get(): R {
      return project(...(current as unknown as T));
    },
    set<K extends keyof T & number>(index: K, value: T[K]): void {
      if (current[index] === value) return;
      current[index] = value as any;
      const computed = project(...(current as unknown as T));
      for (const listener of listeners) {
        listener(computed);
      }
    },
    subscribe(listener: (value: R) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getRawStates(): readonly [...T] {
      return [...current];
    }
  };
}

export interface DayCompositePosition<P extends Position = Position, Q extends Position = Position> extends Position {
  readonly first: P;
  readonly second: Q;
}

export interface DayCompositeDirection<P extends Position = Position, Q extends Position = Position>
  extends Direction<DayCompositePosition<P, Q>> {
  readonly dP: Direction<P>;
  readonly dQ: Direction<Q>;
}

/**
 * Forms the Day convolution tensor of directions (P ⊠ Q)[(p, q)]:
 * Legality of pair is true iff both individual directions are legal.
 */
export function dayProductDirections<P extends Position, Q extends Position>(
  directionsP: readonly Direction<P>[],
  directionsQ: readonly Direction<Q>[]
): readonly DayCompositeDirection<P, Q>[] {
  const result: DayCompositeDirection<P, Q>[] = [];
  for (const dP of directionsP) {
    for (const dQ of directionsQ) {
      result.push({
        id: `${dP.id}⊗${dQ.id}`,
        label: `${dP.label} ⊗ ${dQ.label}`,
        dP,
        dQ,
        legality: (pos) => dP.legality(pos.first) && dQ.legality(pos.second),
        execute: async (pos, payload) => {
          const resP = await dP.execute(pos.first, payload);
          const resQ = await dQ.execute(pos.second, payload);
          return {
            success: resP.success && resQ.success, message: `${resP.message ?? ''} ${resQ.message ?? ''}`.trim() || undefined,
            inverse: async () => { if (resQ.inverse) await resQ.inverse(); if (resP.inverse) await resP.inverse(); }
          };
        }
      });
    }
  }
  return result;
}
