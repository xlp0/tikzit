/**
 * src/services/clm/documentCommitTypes.ts - Sprint 29
 * Types and interfaces for DocumentCommitService.
 * Ceiling: <= 120 LOC. Satisfies Contract D.
 */
import type { AgentDid } from 'clm-kernel';
import type { GraphAST, ParseDiagnostic } from '../../core/domain/types';

export interface CommitDocumentOptions {
  handle: string;
  sourceText: string;
  uri?: string;
  authorDid?: AgentDid;
  sequence?: number;
  activate?: boolean;
  message?: string;
}

export interface CommitDocumentResult {
  success: boolean;
  hash?: string;
  sequence?: number;
  reason?: string;
  receiptHash: string;
  ast?: GraphAST;
  diagnostics?: ParseDiagnostic[];
}

export interface HistoryRow {
  position: number;
  hash: string;
  changedAt: string;
  authorDid?: string;
  label?: string;
  unavailable?: boolean;
  isHead?: boolean;
}

export interface DocumentHistoryResult {
  handle: string;
  head?: string;
  rows: HistoryRow[];
  error?: string;
}

export interface RestoreVersionOptions {
  handle: string;
  targetHash: string;
  expectedHeadHash?: string;
}

export type RestoreVersionResult =
  | { status: 'success'; hash: string; content: string; ast: GraphAST }
  | { status: 'already-current' }
  | { status: 'conflict'; currentHead: string; expectedHead: string }
  | { status: 'missing-card'; hash: string }
  | { status: 'invalid-card'; reason: string }
  | { status: 'failure'; error: string };

export interface SqlDatabaseQueryable {
  exec(sql: string, params?: any): Array<{ columns?: string[]; values: any[][] }>;
}
