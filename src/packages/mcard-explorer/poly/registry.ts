/** @layer L4 interface/membrane */
import type { Direction, Position } from './types';

/**
 * PolyInterfaceRegistry: Fail-closed affordance resolution engine.
 * Implements deterministic direction fiber resolution p[position].
 */
export class PolyInterfaceRegistry {
  private directions = new Map<string, Direction>();
  private _version = 0;
  private cache = new Map<string, readonly Direction[]>();

  /**
   * Monotonically increasing version counter incremented on register / dispose.
   */
  public get version(): number {
    return this._version;
  }

  /**
   * Register a direction; returns a disposer function compatible with DisposableList.
   */
  public register(direction: Direction): () => void {
    this.directions.set(direction.id, direction);
    this._version++;
    this.cache.clear();
    return () => {
      this.directions.delete(direction.id);
      this._version++;
      this.cache.clear();
    };
  }

  /**
   * The direction fiber p[position]: all *legal* directions, ordered by group then id.
   * A throw inside any legality predicate fail-closes to false (direction omitted).
   * Memoized per (position.id, registry.version).
   */
  public resolveDirections(position: Position): readonly Direction[] {
    const key = `${position.id || position.handle}:${this._version}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const legal: Direction[] = [];

    for (const direction of this.directions.values()) {
      try {
        if (direction.legality(position)) {
          legal.push(direction);
        }
      } catch (err) {
        if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
          console.warn(`[PolyInterfaceRegistry] Direction '${direction.id}' legality threw; fail-closed:`, err);
        }
      }
    }

    const result = legal.sort((a, b) => {
      const groupA = a.group || '';
      const groupB = b.group || '';
      const groupCmp = groupA.localeCompare(groupB);
      if (groupCmp !== 0) return groupCmp;
      return a.id.localeCompare(b.id);
    });

    this.cache.set(key, result);
    return result;
  }

  /**
   * Enumerate all registered directions (for introspection, CLI, and conformance).
   */
  public listAll(): readonly Direction[] {
    return Array.from(this.directions.values());
  }

  /**
   * Resolve one direction by id, returning undefined when illegal at this position.
   */
  public resolve(id: string, position: Position): Direction | undefined {
    const direction = this.directions.get(id);
    if (!direction) return undefined;

    try {
      if (direction.legality(position)) {
        return direction;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }
}
