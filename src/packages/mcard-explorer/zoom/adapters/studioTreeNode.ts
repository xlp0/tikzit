/** @layer L4 interface/membrane */
import type { StructureNode } from '../types';

export interface StudioTreeNode {
  readonly name: string;
  readonly fullPath: string;
  readonly isDir: boolean;
  readonly file?: {
    readonly handle?: string;
    readonly kind?: string;
    readonly meta?: Record<string, unknown>;
  };
  readonly children: readonly StudioTreeNode[];
}

/**
 * Adapter mapping StructureNode hierarchy into mcard-studio TreeNode format.
 * Satisfies ADR D54 and maintains exact field parity with FileTreeNode.
 */
export function toStudioTreeNode(
  nodes: readonly StructureNode[],
  parentPath = ''
): readonly StudioTreeNode[] {
  return nodes.map((node) => {
    const fullPath = parentPath ? `${parentPath}/${node.id}` : node.id;
    const isDir = Boolean(node.children && node.children.length > 0) || node.kind === 'table';

    return {
      name: node.label,
      fullPath,
      isDir,
      file: {
        handle: node.handle,
        kind: node.kind,
        meta: node.meta ? { ...node.meta } : undefined
      },
      children: node.children ? toStudioTreeNode(node.children, fullPath) : []
    };
  });
}
