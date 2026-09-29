/**
 * Merkle DAG & Commit Schema Types for MCard VCS
 *
 * Grounded in BLAKE3 content-addressing and git-caliber DAG lineage.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export interface TreeEntry {
  handle: string;
  hash: string;
  mimeType?: string;
  metadataHash?: string;
}

export interface TreeMCard {
  entries: TreeEntry[];
}

export interface CommitMCard {
  parents: string[];
  treeHash: string;
  authorDid: string;
  timestamp: string;
  message: string;
  signature?: string;
}

export interface CommitRecord extends CommitMCard {
  hash: string;
}

export interface BranchRef {
  name: string;
  commitHash: string;
}

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface GraphNodeDiff {
  id: string;
  change: DiffChangeType;
  before?: { x: number; y: number; style: string; label?: string };
  after?: { x: number; y: number; style: string; label?: string };
}

export interface GraphEdgeDiff {
  id: string;
  source: string;
  target: string;
  change: DiffChangeType;
  before?: { style: string; bend?: number; in?: number; out?: number };
  after?: { style: string; bend?: number; in?: number; out?: number };
}

export interface SemanticDiffResult {
  handle: string;
  baseHash: string | null;
  targetHash: string | null;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  isIdentical: boolean;
  graphDiff?: {
    nodes: GraphNodeDiff[];
    edges: GraphEdgeDiff[];
  };
}

export interface MergeConflict {
  handle: string;
  baseHash: string | null;
  oursHash: string | null;
  theirsHash: string | null;
  reason: string;
}

export interface MergeResult {
  status: 'merged' | 'fast-forward' | 'conflict';
  commitHash?: string;
  conflicts?: MergeConflict[];
  witnessHash?: string;
}
