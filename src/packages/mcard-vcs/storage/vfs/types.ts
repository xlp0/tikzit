/**
 * StorageVFS Types: Pluggable Storage Abstraction
 *
 * Grounded in CLM TriDatabase separation (knowledge, executionLog, mcard).
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export type TriDatabasePillar = 'mcard' | 'knowledge' | 'executionLog';

export interface QueryResultRow {
  [key: string]: any;
}

export interface StorageVFS {
  /**
   * Executes a statement without returning rows (DDL/DML).
   */
  execute(pillar: TriDatabasePillar, sql: string, params?: unknown[]): Promise<void>;

  /**
   * Queries rows from the specified pillar database.
   */
  query<T = QueryResultRow>(pillar: TriDatabasePillar, sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Exports the sovereign SQLite database binary as a raw byte array.
   */
  exportBinary(pillar: TriDatabasePillar): Promise<Uint8Array>;

  /**
   * Imports raw SQLite database bytes into the pillar.
   */
  importBinary(pillar: TriDatabasePillar, data: Uint8Array): Promise<void>;

  /**
   * Closes all database connections and releases resources.
   */
  close(): Promise<void>;
}

export type VfsBackendKind = 'memory' | 'indexeddb' | 'node-fs';

export interface VfsOptions {
  backend?: VfsBackendKind;
  dbPath?: string;
  namespace?: string;
}
