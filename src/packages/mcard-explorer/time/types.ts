/** @layer L4 interface/membrane */
import type { Position, DirectionResult } from '../poly/types';

/**
 * A node in the cofree interaction tree: a position, plus the directions actually taken from it.
 */
export interface InteractionNode {
  readonly id: string;
  readonly position: Position;
  /** The direction taken to arrive here (null at the root). */
  readonly arrivedBy: string | null;
  readonly result?: DirectionResult;
  readonly at: number; // monotonic sequence number
  readonly children: readonly InteractionNode[];
}

export type JournalMark = number;

export interface RevertibleEffect<T = unknown> {
  readonly id: string;
  readonly label: string;
  /** Apply the effect and return its tracked inverse (Cordis ∂Γ: track_Γ(f, f⁻¹)). */
  readonly apply: () => Promise<() => Promise<void>>;
}

export interface JournalEntry {
  readonly id: string;
  readonly label: string;
  readonly inverse: () => Promise<void>;
  readonly mark: number;
}
