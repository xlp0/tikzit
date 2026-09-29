/** @layer L4 interface/membrane */
import type { ExplorerCardSummaryDto, ExplorerTreeNode } from './datasource/types';

export interface TreeProjectionOptions {
  /** Optional structure hook for nested containment (Sprint 38). */
  structureChildren?: (handle: string) => Promise<ExplorerTreeNode[] | undefined>;
}

/**
 * TreeProjection: Projects flat MCard collections into hierarchical namespace trees.
 * Implements mcard-studio compatible directory-first, case-insensitive sorting (ADR D54).
 */
export class TreeProjection {
  constructor(private options: TreeProjectionOptions = {}) {}

  public projectTree(items: readonly ExplorerCardSummaryDto[]): ExplorerTreeNode[] {
    const rootNodes: ExplorerTreeNode[] = [];

    for (const item of items) {
      // Split on either colon or slash delimiters for studio/tikzit parity
      const separatorRegex = /[:/]/;
      const parts = item.handle.split(separatorRegex).filter(Boolean);
      let currentLevel = rootNodes;
      let accumulatedPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        accumulatedPath = accumulatedPath ? `${accumulatedPath}:${part}` : part;
        const isLeaf = i === parts.length - 1;

        let node = currentLevel.find(n => n.name.toLowerCase() === part.toLowerCase());
        if (!node) {
          node = {
            name: part,
            path: accumulatedPath,
            isFolder: !isLeaf,
            ...(isLeaf
              ? {
                  handle: item.handle,
                  hash: item.hash,
                  mimeType: item.mimeType,
                  universe: item.universe,
                  category: item.clmCategory || item.category
                }
              : { children: [] })
          };
          currentLevel.push(node);
        }

        if (!isLeaf) {
          if (!node.children) node.children = [];
          currentLevel = node.children;
        }
      }
    }

    this.sortLevel(rootNodes);
    return rootNodes;
  }

  /**
   * Sorts tree levels directory-first, then case-insensitive alphabetically.
   */
  private sortLevel(nodes: ExplorerTreeNode[]): void {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        this.sortLevel(node.children);
      }
    }
  }
}
