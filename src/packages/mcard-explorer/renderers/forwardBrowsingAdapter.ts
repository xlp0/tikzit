/** @layer L4 interface/membrane */
import type { Direction, Position } from '../poly';

export type ForwardReason = 'consumes' | 'same-runtime' | 'transition';

export interface ForwardTarget {
  readonly handle: string;
  readonly reason: ForwardReason;
  readonly label?: string;
}

/**
 * Maps mcard-studio ForwardTarget items to Direction items with corresponding groups (ADR D54).
 */
export function forwardTargetsToDirections(
  targets: readonly ForwardTarget[],
  onNavigate?: (targetHandle: string) => Promise<void>
): Direction[] {
  return targets.map(target => ({
    id: `forward.${target.reason}.${target.handle}`,
    label: target.label || `Navigate to ${target.handle}`,
    group: `forward.${target.reason}`,
    legality: () => true,
    execute: async (_pos: Position) => {
      if (onNavigate) {
        await onNavigate(target.handle);
      }
      return { success: true, producedHandle: target.handle };
    }
  }));
}
