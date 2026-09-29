/**
 * Conversational Lenses (S ⊣ G) for Operadic MCard Virtual File System
 *
 * Satisfies the three classical categorical Lens Laws:
 * 1. Get-Put (Identity): S(s, G(s)) = s
 * 2. Put-Get (Observation): G(S(s, b)) = b
 * 3. Put-Put (Overwriting): S(S(s, b1), b2) = S(s, b2)
 *
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type { ExtendedTypeJudgment, CardCategory } from '../../type/types';

export interface ConversationalLens<S, A, B = A> {
  /**
   * Getter G: S -> A (Observation / Projection)
   */
  get: (state: S) => Promise<A | null> | A | null;

  /**
   * Setter S: S x B -> S' (Actuation / State Mutation)
   */
  set: (state: S, value: B) => Promise<S> | S;
}

export interface CardView {
  handle: string;
  hash: string;
  content: Uint8Array;
  text: string;
  mimeType: string;
  mcardType: number;
  companionMetadata?: Record<string, unknown>;
  updatedAt: string;
  typeJudgment?: ExtendedTypeJudgment;
  universe?: string;
  category?: string;
  clmCategory?: CardCategory;
  payloadKind?: string;
}

export interface SetCardOptions {
  mimeType?: string;
  mcardType?: number;
  companionMetadata?: Record<string, unknown>;
  authorDid?: string;
  typeJudgment?: ExtendedTypeJudgment;
  universe?: string;
  category?: string;
  clmCategory?: CardCategory;
  payloadKind?: string;
}

export interface CardStateRecord {
  handle: string;
  hash: string;
  content: Uint8Array;
  mimeType: string;
  mcardType: number;
  companionMetadata?: Record<string, unknown>;
  updatedAt: string;
  typeJudgment?: ExtendedTypeJudgment;
  universe?: string;
  category?: string;
  clmCategory?: CardCategory;
  payloadKind?: string;
}

export interface LensLawVerificationResult {
  getPutPassed: boolean;
  putGetPassed: boolean;
  putPutPassed: boolean;
  violations: string[];
}
