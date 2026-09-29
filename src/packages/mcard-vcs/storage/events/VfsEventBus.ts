/**
 * VfsEventBus: Dispatch / Callback Loose Wiring Morphisms
 *
 * Implements loose event wiring for mutations, change listeners,
 * and explorer action dispatchers. Subscriptions return exact
 * disposal tokens for LIFO teardown.
 *
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export type VfsEventType =
  | 'card:staged'
  | 'card:committed'
  | 'card:deleted'
  | 'branch:updated'
  | 'savepoint:created'
  | 'savepoint:rolled_back'
  | 'savepoint:released'
  | 'vfs:imported'
  | 'vfs:cleared';

export interface VfsEventPayloadMap {
  'card:staged': { handle: string; hash: string; mimeType: string };
  'card:committed': { handle: string; commitHash: string; authorDid: string; message: string };
  'card:deleted': { handle: string };
  'branch:updated': { branch: string; headCommit: string };
  'savepoint:created': { name: string };
  'savepoint:rolled_back': { name: string; reason?: string };
  'savepoint:released': { name: string };
  'vfs:imported': { pillar: string; byteLength: number };
  'vfs:cleared': { pillar?: string };
}

export type VfsEventCallback<T = any> = (payload: T) => Promise<void> | void;

export class VfsEventBus {
  private listeners = new Map<string, Set<VfsEventCallback>>();

  /**
   * Dispatches a typed event asynchronously to all registered listeners.
   */
  public async dispatch<K extends VfsEventType>(type: K, payload: VfsEventPayloadMap[K]): Promise<void>;
  public async dispatch<T = any>(type: string, payload: T): Promise<void>;
  public async dispatch(type: string, payload: any): Promise<void> {
    const callbacks = this.listeners.get(type);
    if (!callbacks || callbacks.size === 0) return;

    const copy = Array.from(callbacks);
    for (const cb of copy) {
      try {
        await cb(payload);
      } catch (err) {
        console.error(`[VfsEventBus] Unhandled callback error in event '${type}':`, err);
      }
    }
  }

  /**
   * Registers an event listener, returning a clean disposal token.
   */
  public on<K extends VfsEventType>(type: K, callback: VfsEventCallback<VfsEventPayloadMap[K]>): () => void;
  public on<T = any>(type: string, callback: VfsEventCallback<T>): () => void;
  public on(type: string, callback: VfsEventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(callback);

    // Return exact disposal closure
    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  /**
   * Returns listener count for a specific event or total listeners.
   */
  public listenerCount(type?: string): number {
    if (type) {
      return this.listeners.get(type)?.size ?? 0;
    }
    let total = 0;
    for (const set of this.listeners.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Clears all listeners.
   */
  public clear(): void {
    this.listeners.clear();
  }
}
