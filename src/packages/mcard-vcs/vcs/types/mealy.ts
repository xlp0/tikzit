/**
 * Mealy Machine Transition Types for MCard VCS
 *
 * Implements input-driven transition morphisms O = δ(s, i).
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export type VcsIntentType = 'stage' | 'commit' | 'branch' | 'checkout' | 'merge';

export interface VcsStageIntent {
  type: 'stage';
  handle: string;
  payload: Uint8Array | string;
  mimeType?: string;
  mcardType?: number;
}

export interface VcsCommitIntent {
  type: 'commit';
  authorDid: string;
  message: string;
  branchRef?: string;
}

export interface VcsBranchIntent {
  type: 'branch';
  name: string;
  startRef?: string;
}

export interface VcsCheckoutIntent {
  type: 'checkout';
  ref: string;
}

export interface VcsMergeIntent {
  type: 'merge';
  baseRef: string;
  incomingRef: string;
  authorDid: string;
}

export type VcsInputIntent =
  | VcsStageIntent
  | VcsCommitIntent
  | VcsBranchIntent
  | VcsCheckoutIntent
  | VcsMergeIntent;

export interface VcsTransitionOutput {
  status: 'staged' | 'transitioned' | 'merged' | 'checked_out' | 'branched' | 'conflict' | 'rejected';
  commitHash?: string;
  cardHash?: string;
  witnessHash?: string;
  currentBranch?: string;
  conflicts?: Array<{ handle: string; reason: string }>;
  error?: string;
}

export interface VcsState {
  head: string | null;
  currentBranch: string;
  stagedCards: Record<string, string>; // handle -> hash
}

export interface MealyVcsMachine {
  getState(): VcsState;
  step(intent: VcsInputIntent): Promise<VcsTransitionOutput>;
}
