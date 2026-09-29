/** @layer L4 interface/membrane */
import type { InteractionNode } from './types';
import type { InteractionTree } from './InteractionTree';

/**
 * Replay a serialised tree forward to a cursor (session restore).
 * Reconstructs interface state only; never re-executes host side effects.
 */
export function replayTo(
  tree: InteractionTree,
  cursorId: string,
  apply: (node: InteractionNode) => void
): void {
  tree.rewind(cursorId);
  const path = tree.path();
  for (const node of path) {
    // Only invoke apply with the node to restore state
    apply(node);
  }
}

/**
 * Report which recorded effects are not invertible (diagnostics for the zero-residue gate).
 */
export function auditInvertibility(
  entries: readonly { id: string; label: string }[]
): readonly string[] {
  return entries
    .filter((e) => e.id.startsWith('sink.') || e.id.includes('download') || e.id.includes('export.disk'))
    .map((e) => e.id);
}
