/**
 * MCardExplorerEngine: Pure Zero-DOM Headless Explorer State Machine
 *
 * Implements querying, facet filtering, namespace tree grouping, and action routing.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import {
  ExplorerQueryFacade,
  type ExplorerCardSummaryDto
} from '../../mcard-vcs/explorer/ExplorerQueryFacade';
import { ExplorerActionRegistry, type ActionResult } from '../actions/ExplorerActionRegistry';

export interface ExplorerTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  handle?: string;
  hash?: string;
  mimeType?: string;
  children?: ExplorerTreeNode[];
}

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

export class MCardExplorerEngine {
  private state: ExplorerState;
  private listeners = new Set<(state: ExplorerState) => void>();

  constructor(
    private queryFacade: ExplorerQueryFacade,
    private actionRegistry: ExplorerActionRegistry = new ExplorerActionRegistry()
  ) {
    this.state = {
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
  }

  public getState(): ExplorerState {
    return { ...this.state };
  }

  public async init(): Promise<void> {
    await this.refresh();
  }

  public async setQuery(query: string): Promise<void> {
    this.state.query = query;
    await this.refresh();
  }

  public async setFacet(facet: string): Promise<void> {
    this.state.activeFacet = facet;
    await this.refresh();
  }

  public selectHandle(handle: string | null): void {
    this.state.activeHandle = handle;
    if (handle && !this.state.selectedHandles.includes(handle)) {
      this.state.selectedHandles = [...this.state.selectedHandles, handle];
    }
    this.notify();
  }

  public toggleFolder(folderPath: string): void {
    const idx = this.state.expandedFolders.indexOf(folderPath);
    if (idx !== -1) {
      this.state.expandedFolders = this.state.expandedFolders.filter(f => f !== folderPath);
    } else {
      this.state.expandedFolders = [...this.state.expandedFolders, folderPath];
    }
    this.notify();
  }

  public setViewMode(mode: 'tree' | 'flat' | 'cards'): void {
    this.state.viewMode = mode;
    this.notify();
  }

  public setSortBy(sortBy: 'name' | 'updatedAt' | 'hash'): void {
    this.state.sortBy = sortBy;
    this.sortItems();
    this.state.tree = this.buildTree(this.state.items);
    this.notify();
  }

  public async refresh(): Promise<void> {
    const filter = {
      pattern: this.state.query || undefined,
      limit: 100
    };

    let items = await this.queryFacade.search(filter);

    // Apply facet filtering
    if (this.state.activeFacet !== 'all') {
      items = items.filter(item => item.handle.toLowerCase().includes(this.state.activeFacet.toLowerCase()));
    }

    this.state.items = items;
    this.sortItems();
    this.state.tree = this.buildTree(this.state.items);
    this.notify();
  }

  private sortItems(): void {
    this.state.items.sort((a, b) => {
      if (this.state.sortBy === 'name') return a.handle.localeCompare(b.handle);
      if (this.state.sortBy === 'hash') return a.hash.localeCompare(b.hash);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  public buildTree(items: ExplorerCardSummaryDto[]): ExplorerTreeNode[] {
    const rootNodes: ExplorerTreeNode[] = [];

    for (const item of items) {
      const parts = item.handle.split(':');
      let currentLevel = rootNodes;
      let accumulatedPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        accumulatedPath = accumulatedPath ? `${accumulatedPath}:${part}` : part;
        const isLeaf = i === parts.length - 1;

        let node = currentLevel.find(n => n.name === part);
        if (!node) {
          node = {
            name: part,
            path: accumulatedPath,
            isFolder: !isLeaf,
            ...(isLeaf ? { handle: item.handle, hash: item.hash, mimeType: item.mimeType } : { children: [] })
          };
          currentLevel.push(node);
        }

        if (!isLeaf) {
          if (!node.children) node.children = [];
          currentLevel = node.children;
        }
      }
    }

    return rootNodes;
  }

  public async executeAction(actionId: string, handle: string, payload?: any): Promise<ActionResult> {
    const res = await this.actionRegistry.execute(actionId, handle, payload);
    await this.refresh();
    return res;
  }

  public subscribe(cb: (state: ExplorerState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try { listener(snapshot); } catch (e) { console.error('[MCardExplorerEngine] Listener error:', e); }
    }
  }
}
