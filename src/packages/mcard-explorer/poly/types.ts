/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';

/**
 * A position is a *card-shaped* state: what the interface currently shows.
 * Grounded in Spencer Breiner's polynomial-interface theory.
 */
export interface Position {
  /** Stable identity of this position within the interface (e.g. `list:zx:diagrams:ghz`). */
  readonly id: string;
  /** The card this position presents — MCard is the unit of manipulation (ADR D48). */
  readonly handle: string;
  readonly hash: string;
  readonly mimeType: string;
  /** Kernel judgment fields, passed through verbatim (never re-derived here). */
  readonly universe?: string; // 'U0'..'U5'
  readonly universeName?: string;
  readonly category?: string;
  readonly clmCategory?: string;
  readonly payloadKind?: string;
  /** View context: which surface is showing this position. */
  readonly surface: 'tree' | 'list' | 'grid' | 'composition' | 'zoom' | 'timeline';
  /** Nesting context (Sprint 38 zoom path; empty at root). */
  readonly zoomPath?: readonly string[];
  /** Display title if available (fallback to handle). */
  readonly title?: string;
  /** Selection context. */
  readonly selected?: boolean;
  readonly active?: boolean;
  /** Arbitrary projection metadata supplied by the surface. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * A direction is one *legal input* at a position.
 */
export interface Direction<P extends Position = Position> {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly shortcut?: string;
  readonly default?: boolean;
  /** Grouping hint for menus (`'mutate' | 'compose' | 'export' | 'navigate' | …`). */
  readonly group?: string;
  /** Legality is a pure predicate on the position (ADR D47). */
  readonly legality: (position: P) => boolean;
  /** Effects run only after legality has been resolved; the host supplies the implementation. */
  readonly execute: (position: P, payload?: unknown) => Promise<DirectionResult>;
  /** Directions may declare their own dependent sub-directions. */
  readonly sub?: (position: P) => readonly Direction<P>[];
}

export interface DirectionResult {
  readonly success: boolean;
  readonly message?: string;
  readonly producedHandle?: string;
  readonly producedHash?: string;
  readonly inverse?: () => Promise<void>;
}

/**
 * A polynomial interface: positions + the direction fiber over each position.
 */
export interface PolyInterface<P extends Position = Position> {
  readonly id: string;
  readonly positions: (state: unknown) => readonly P[];
  readonly directions: (position: P) => readonly Direction<P>[];
}

/**
 * InterfaceLens: Bidirectional lens between state and positions.
 */
export interface InterfaceLens<S, P extends Position = Position> {
  readonly get: (state: S) => readonly P[];
  readonly set?: (state: S, position: P) => S;
}

/**
 * NavigationProvider: A source of navigable structure (ADR D56).
 */
export interface NavigationProvider {
  readonly id: string;
  readonly label: string;
  readonly appliesTo: (position: Position | null) => boolean;
  readonly resolveRoot: () => Promise<readonly Position[]>;
  readonly resolveChildren?: (position: Position) => Promise<readonly Position[]>;
  readonly encodeAddress?: (position: Position) => string;
  readonly decodeAddress?: (address: string) => Position | null;
}
