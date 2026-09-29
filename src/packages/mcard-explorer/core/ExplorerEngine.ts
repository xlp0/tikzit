/** @layer L4 interface/membrane */
import type { ExplorerDataSource, ExplorerCardSummaryDto, ExplorerTreeNode } from './datasource/types';
import { ExplorerActionRegistry, type ActionResult } from '../actions/ExplorerActionRegistry';
import { ExplorerStateStore, type ExplorerState } from './ExplorerStateStore';
import { FacetResolver } from './FacetResolver';
import { TreeProjection } from './TreeProjection';
import { SelectionModel } from './SelectionModel';

export type { ExplorerState };

export class ExplorerEngine {
  private store: ExplorerStateStore;
  private facetResolver: FacetResolver;
  private treeProjection: TreeProjection;

  constructor(
    private queryFacade: ExplorerDataSource,
    private actionRegistry: ExplorerActionRegistry = new ExplorerActionRegistry(),
    facetResolver: FacetResolver = new FacetResolver(),
    treeProjection: TreeProjection = new TreeProjection()
  ) {
    this.store = new ExplorerStateStore();
    this.facetResolver = facetResolver;
    this.treeProjection = treeProjection;
  }

  public getState(): ExplorerState { return this.store.getState(); }
  public getDataSource(): ExplorerDataSource { return this.queryFacade; }
  public subscribe(cb: (state: ExplorerState) => void): () => void { return this.store.subscribe(cb); }
  public async init(): Promise<void> { await this.refresh(); }
  public async getContent(handle: string) { return this.queryFacade.getContent(handle); }

  public async setQuery(query: string): Promise<void> {
    this.store.setState({ query });
    await this.refresh();
  }

  public async setFacet(activeFacet: string): Promise<void> {
    this.store.setState({ activeFacet });
    await this.refresh();
  }

  public selectHandle(handle: string | null): void {
    this.store.setState(s => SelectionModel.select(s, handle));
  }

  public toggleFolder(folderPath: string): void {
    this.store.setState(s => {
      const exists = s.expandedFolders.includes(folderPath);
      return {
        ...s,
        expandedFolders: exists ? s.expandedFolders.filter(f => f !== folderPath) : [...s.expandedFolders, folderPath]
      };
    });
  }

  public setViewMode(viewMode: 'tree' | 'flat' | 'cards'): void {
    this.store.setState({ viewMode });
  }

  public setSortBy(sortBy: 'name' | 'updatedAt' | 'hash'): void {
    this.store.setState(s => {
      const sorted = this.sort(s.items, sortBy);
      return { ...s, sortBy, items: sorted, tree: this.treeProjection.projectTree(sorted) };
    });
  }

  public async refresh(): Promise<void> {
    const s = this.store.getState();
    const filter = this.facetResolver.resolveFilter(s.activeFacet, s.query);
    const items = await this.queryFacade.search(filter);
    const sorted = this.sort(items, s.sortBy);
    const tree = this.treeProjection.projectTree(sorted);
    this.store.setState({ items: sorted, tree });
  }

  public buildTree(items: ExplorerCardSummaryDto[]): ExplorerTreeNode[] {
    return this.treeProjection.projectTree(items);
  }

  public async executeAction(actionId: string, handle: string, payload?: unknown): Promise<ActionResult> {
    const res = await this.actionRegistry.execute(actionId, handle, payload as any);
    await this.refresh();
    return res;
  }

  private sort(items: ExplorerCardSummaryDto[], sortBy: ExplorerState['sortBy']): ExplorerCardSummaryDto[] {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') return a.handle.localeCompare(b.handle);
      if (sortBy === 'hash') return a.hash.localeCompare(b.hash);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
}
