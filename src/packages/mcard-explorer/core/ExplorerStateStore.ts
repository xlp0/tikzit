/** @layer L4 interface/membrane */
import type { ExplorerCardSummaryDto, ExplorerTreeNode } from './datasource/types';

export interface ExplorerState {
  query: string;
  activeFacet: string;
  activeHandle: string | null;
  expandedFolders: string[];
  selectedHandles: string[];
  viewMode: 'tree' | 'flat' | 'cards';
  sortBy: 'name' | 'updatedAt' | 'hash';
  items: ExplorerCardSummaryDto[];
  tree: ExplorerTreeNode[];
}

export const INITIAL_EXPLORER_STATE: ExplorerState = {
  query: '',
  activeFacet: 'all',
  activeHandle: null,
  expandedFolders: [],
  selectedHandles: [],
  viewMode: 'tree',
  sortBy: 'name',
  items: [],
  tree: []
};

/**
 * ExplorerStateStore: Immutable state container with subscribe/notify.
 * Pure presentation state management; zero domain logic; zero DOM.
 */
export class ExplorerStateStore {
  private state: ExplorerState;
  private listeners = new Set<(state: ExplorerState) => void>();

  constructor(initialState: Partial<ExplorerState> = {}) {
    this.state = {
      ...INITIAL_EXPLORER_STATE,
      ...initialState
    };
  }

  public getState(): ExplorerState {
    return { ...this.state };
  }

  public setState(
    updater: Partial<ExplorerState> | ((prev: ExplorerState) => ExplorerState)
  ): void {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = {
        ...this.state,
        ...updater
      };
    }
    this.notify();
  }

  public subscribe(listener: (state: ExplorerState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
          console.error('[ExplorerStateStore] Listener error:', err);
        }
      }
    }
  }
}
