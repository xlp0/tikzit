/**
 * Explorer Data Source & Content Provider Port Interfaces (ADR D42)
 *
 * Defines the host-agnostic ports owned by @clm/mcard-explorer.
 * Zero DOM dependencies. Zero mcard-vcs dependencies. Contract D ceiling: <= 250 LOC.
 */

import type { TypeJudgment } from 'clm-kernel';

export type CardCategory =
  | 'diagram'
  | 'process'
  | 'proof'
  | 'conversation'
  | 'data'
  | 'text'
  | 'blob'
  | 'collection';

export type MCardPayloadKind =
  | 'scalar'
  | 'text'
  | 'satori'
  | 'binary'
  | 'structured'
  | 'executable';

/** Serializable card summary - aligns with TypedValueDict shape. */
export interface ExplorerCardSummaryDto {
  handle: string;
  hash: string;
  mimeType: string;
  universe?: string;      // 'U0'..'U5'
  universeName?: string;  // 'U0_Mcard'..'U5_MetaGamma'
  category?: string;      // dictionary category
  clmCategory?: CardCategory;
  payloadKind?: MCardPayloadKind;
  isBinary?: boolean;
  confidence?: number;
  fndClassification?: 'Function' | 'Number';
  updatedAt: string;
}

/** Full card content for rendering - aligns with TypedValueDict shape. */
export interface CardContentDto {
  handle: string;
  hash: string;
  content: Uint8Array;
  text: string;           // UTF-8 decoded (empty for binary)
  mimeType: string;
  payloadKind?: MCardPayloadKind;
  typeJudgment?: TypeJudgment;
  metadata?: Record<string, unknown>;
}

/** Search filter - universe and category filtering are SQL-level. */
export interface ExplorerSearchFilter {
  pattern?: string;
  mimeType?: string;
  universe?: string;      // SQL WHERE clause on universe column
  category?: string;      // SQL WHERE clause on category column
  payloadKind?: string;   // SQL WHERE on payload_kind column
  limit?: number;
}

/** History entry for a handle's version chain. */
export interface ExplorerHistoryEntryDto {
  hash: string;
  changedAt: string;
  authorDid: string;
  message: string;
  position?: number;
  isHead?: boolean;
}

/** Hierarchical tree node for namespace navigation. */
export interface ExplorerTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  handle?: string;
  hash?: string;
  mimeType?: string;
  universe?: string;
  category?: string;
  children?: ExplorerTreeNode[];
}

/**
 * Content provider port for MCardViewer - subset of ExplorerDataSource.
 * Allows the viewer to fetch card content independently of the explorer engine.
 */
export interface CardContentProvider {
  getContent(handle: string): Promise<CardContentDto | null>;
}

/**
 * Abstract data source port - the ONLY interface MCardExplorerEngine depends on.
 * Implementations: ExplorerQueryFacade (TikZiT), studioMCardFs adapter (mcard-studio).
 */
export interface ExplorerDataSource extends CardContentProvider {
  search(filter?: ExplorerSearchFilter): Promise<ExplorerCardSummaryDto[]>;
  getContent(handle: string): Promise<CardContentDto | null>;
  getHistory(handle: string): Promise<ExplorerHistoryEntryDto[]>;
  listHandles?(prefix?: string): Promise<string[]>;
  describeDiff?(handle: string, baseRef: string, targetRef: string): Promise<unknown>;
  subscribe(cb: (event: unknown) => void): () => void;
}
