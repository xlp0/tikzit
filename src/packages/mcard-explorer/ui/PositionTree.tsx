import React from 'react';

export interface PositionTreeNode {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly isFolder: boolean;
  readonly kind?: string;
  readonly handle?: string;
  readonly hash?: string;
  readonly children?: readonly PositionTreeNode[];
}

export interface PositionTreeProps {
  readonly nodes: readonly PositionTreeNode[];
  readonly expandedFolders?: readonly string[];
  readonly activeHandle?: string | null;
  readonly onToggleFolder?: (path: string) => void;
  readonly onSelectCard?: (handle: string) => void;
  readonly onExecuteDirection?: (directionId: string, payload?: unknown) => Promise<void> | void;
  readonly depth?: number;
}

export const PositionTree: React.FC<PositionTreeProps> = ({
  nodes,
  expandedFolders = [],
  activeHandle = null,
  onToggleFolder,
  onSelectCard,
  onExecuteDirection,
  depth = 0
}) => {
  return (
    <div className="position-tree select-none text-xs" data-testid="mcard-tree-view">
      {nodes.map((node) => {
        const nodeKind = node.kind || (node.isFolder ? 'namespace' : 'card');

        if (node.isFolder) {
          const isExpanded = expandedFolders.includes(node.path);
          return (
            <div
              key={node.path}
              className="position-tree-folder"
              data-node-kind={nodeKind}
            >
              <div
                className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer text-slate-700 dark:text-slate-300 font-medium"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => {
                  if (onExecuteDirection) {
                    onExecuteDirection('zoom.enter', { path: node.path });
                  }
                  if (onToggleFolder) {
                    onToggleFolder(node.path);
                  }
                }}
                data-testid={`folder-${node.path}`}
              >
                <span className="text-[10px] text-slate-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span>{node.name}</span>
              </div>
              {isExpanded && node.children && (
                <PositionTree
                  nodes={node.children}
                  expandedFolders={expandedFolders}
                  activeHandle={activeHandle}
                  onToggleFolder={onToggleFolder}
                  onSelectCard={onSelectCard}
                  onExecuteDirection={onExecuteDirection}
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
            onClick={() => node.handle && onSelectCard && onSelectCard(node.handle)}
            data-testid={`tree-item-${node.handle}`}
            data-node-kind={nodeKind}
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
