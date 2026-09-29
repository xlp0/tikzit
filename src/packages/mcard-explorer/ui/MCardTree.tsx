/**
 * MCardTree: Collapsible Hierarchical Namespace Tree Viewlet
 *
 * Renders nested namespace nodes (e.g. zx:rules:spider) with expand/collapse.
 * Zero DOM globals. Contract D ceiling: <= 250 LOC.
 */

import React from 'react';
import type { ExplorerTreeNode } from '../core/MCardExplorerEngine';

export interface MCardTreeProps {
  nodes: ExplorerTreeNode[];
  expandedFolders: string[];
  activeHandle: string | null;
  onToggleFolder: (path: string) => void;
  onSelectCard: (handle: string) => void;
  depth?: number;
}

export const MCardTree: React.FC<MCardTreeProps> = ({
  nodes,
  expandedFolders,
  activeHandle,
  onToggleFolder,
  onSelectCard,
  depth = 0
}) => {
  return (
    <div className="mcard-tree select-none text-xs" data-testid="mcard-tree-view">
      {nodes.map(node => {
        if (node.isFolder) {
          const isExpanded = expandedFolders.includes(node.path);
          return (
            <div key={node.path} className="mcard-tree-folder">
              <div
                className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer text-slate-700 dark:text-slate-300 font-medium"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onToggleFolder(node.path)}
                data-testid={`folder-${node.path}`}
              >
                <span className="text-[10px] text-slate-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span>{node.name}</span>
              </div>
              {isExpanded && node.children && (
                <MCardTree
                  nodes={node.children}
                  expandedFolders={expandedFolders}
                  activeHandle={activeHandle}
                  onToggleFolder={onToggleFolder}
                  onSelectCard={onSelectCard}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        }

        const isSelected = activeHandle === node.handle;
        return (
          <div
            key={node.handle || node.path}
            className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
              isSelected
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
            }`}
            style={{ paddingLeft: `${depth * 12 + 16}px` }}
            onClick={() => node.handle && onSelectCard(node.handle)}
            data-testid={`tree-item-${node.handle}`}
          >
            <span className="truncate">{node.name}</span>
            {node.hash && (
              <span className="font-mono text-[9px] text-slate-400 ml-2">
                {node.hash.slice(0, 8)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
