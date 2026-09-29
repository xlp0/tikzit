/**
 * Extended Type Judgment & Universe Stratification Contract
 *
 * Grounded in clm-kernel's TypeInterpreter and Stratified Type Lattice.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { UniverseLevel, type TypeJudgment, type Universe } from 'clm-kernel';

export type CardCategory =
  | 'diagram'
  | 'process'
  | 'proof'
  | 'conversation'
  | 'data'
  | 'text'
  | 'blob'
  | 'collection';

/** Kernel TypeJudgment enriched with display fields derivable via UniverseLevel. */
export interface ExtendedTypeJudgment extends TypeJudgment {
  /** 'U0_Mcard' | 'U1_Pcard' | 'U2_Vcard' | 'U3_Satori' | 'U4_Membrane' | 'U5_MetaGamma' */
  universeName: string;
  /** Numeric UniverseLevel enum for isStratified() checks (from 'U0'..'U5' string). */
  universeLevel: UniverseLevel;
  /** Narrowed category for CLM domain types (falls back to dictionary category). */
  clmCategory?: CardCategory;
  /** FND classification via kernel classifyClm(): 'Function' (operator/PCard) or 'Number' (static/MCard). */
  fndClassification?: 'Function' | 'Number';
  /** Execution dialect via kernel detectDialect(): 'M' (process) | 'A' (dispatcher) | 'B' (runtime) | 'C' (concrete). */
  dialect?: string;
}

export interface TypeJudgeOptions {
  data: Uint8Array | string;
  handle?: string;
  filename?: string;
  extHint?: string;
  declaredMime?: string;
}

/**
 * universe: 'U0' -> UniverseLevel.U0_Mcard (single mapping site)
 */
export function universeLevelOf(universe: Universe | string): UniverseLevel {
  switch (universe) {
    case 'U0':
    case 'U0_Mcard':
      return UniverseLevel.U0_Mcard;
    case 'U1':
    case 'U1_Pcard':
      return UniverseLevel.U1_Pcard;
    case 'U2':
    case 'U2_Vcard':
      return UniverseLevel.U2_Vcard;
    case 'U3':
    case 'U3_Satori':
      return UniverseLevel.U3_Satori;
    case 'U4':
    case 'U4_Membrane':
      return UniverseLevel.U4_Membrane;
    case 'U5':
    case 'U5_MetaGamma':
      return UniverseLevel.U5_MetaGamma;
    default:
      return UniverseLevel.U0_Mcard;
  }
}

/**
 * Returns formatted universe name ('U0_Mcard'..'U5_MetaGamma')
 */
export function universeNameOf(universe: Universe | string): string {
  const level = universeLevelOf(universe);
  return (UniverseLevel[level] as string) || 'U0_Mcard';
}
