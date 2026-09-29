/**
 * Satori Protocol AST Element Definitions for MCard VCS & Explorer
 *
 * Grounded in clm-kernel layer3 Satori element model and Koishi.js XML conventions.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export interface SatoriCardElement {
  tag: 'card';
  attrs: {
    hash: string;
    handle: string;
    type?: string;
    readonly?: boolean;
  };
}

export interface SatoriCommitElement {
  tag: 'commit';
  attrs: {
    id: string;
    parent?: string;
    authorDid: string;
    date: string;
    message: string;
  };
}

export interface SatoriVersionDagElement {
  tag: 'version-dag';
  attrs: {
    handle: string;
    headCommit: string;
    branch?: string;
  };
  children: SatoriCommitElement[];
}

export interface SatoriDiffViewElement {
  tag: 'diff-view';
  attrs: {
    handle: string;
    base: string;
    target: string;
    additions: number;
    deletions: number;
  };
  content: string; // Unified diff representation
}

export interface SatoriExplorerItemElement {
  tag: 'mcard-item';
  attrs: {
    handle: string;
    hash: string;
    mimeType?: string;
    mcardType?: number;
    facet?: string;
    selected?: boolean;
  };
}

export interface SatoriExplorerElement {
  tag: 'mcard-explorer';
  attrs: {
    query?: string;
    facet?: string;
    activeHandle?: string;
    limit?: number;
    view?: 'tree' | 'flat' | 'cards';
  };
  children?: SatoriExplorerItemElement[];
}

export interface TurnProposal {
  command: 'commit' | 'branch' | 'merge' | 'diff' | 'checkout' | 'explore';
  handle?: string;
  query?: string;
  facet?: string;
  payload?: any;
  authorDid: string;
  message?: string;
  baseRef?: string;
  targetRef?: string;
  incomingRef?: string;
}

export interface TurnExecutionResult {
  status: 'committed' | 'merged' | 'checked_out' | 'queried' | 'diffed' | 'branched' | 'conflict' | 'rejected';
  satoriXml: string;
  witnessHash?: string;
  errorMessage?: string;
}
