/**
 * MemoryStorageVFS: In-Memory WASM SQLite Storage Engine
 *
 * Runs using sql.js WASM SQLite in pure memory without host/DOM coupling.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { StorageVFS, TriDatabasePillar, QueryResultRow } from './types';
import { getDdlForPillar } from '../schema/ddl';

export class MemoryStorageVFS implements StorageVFS {
  private static sqlPromise: Promise<SqlJsStatic> | null = null;
  private SQL: SqlJsStatic | null = null;
  private databases = new Map<TriDatabasePillar, Database>();
  private initialized = false;

  private static getSqlJs(): Promise<SqlJsStatic> {
    if (!MemoryStorageVFS.sqlPromise) {
      MemoryStorageVFS.sqlPromise = initSqlJs();
    }
    return MemoryStorageVFS.sqlPromise;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    this.SQL = await MemoryStorageVFS.getSqlJs();

    const pillars: TriDatabasePillar[] = ['mcard', 'knowledge', 'executionLog'];
    for (const pillar of pillars) {
      const db = new this.SQL.Database();
      db.run(getDdlForPillar(pillar));
      this.databases.set(pillar, db);
    }
    this.initialized = true;
  }

  private getDb(pillar: TriDatabasePillar): Database {
    if (!this.initialized) {
      throw new Error(`MemoryStorageVFS not initialized. Call init() first.`);
    }
    const db = this.databases.get(pillar);
    if (!db) {
      throw new Error(`Database for pillar '${pillar}' not found.`);
    }
    return db;
  }

  public async execute(pillar: TriDatabasePillar, sql: string, params?: unknown[]): Promise<void> {
    const db = this.getDb(pillar);
    if (params && params.length > 0) {
      db.run(sql, params as any[]);
    } else {
      db.run(sql);
    }
  }

  public async query<T = QueryResultRow>(pillar: TriDatabasePillar, sql: string, params?: unknown[]): Promise<T[]> {
    const db = this.getDb(pillar);
    const stmt = db.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params as any[]);
    }

    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return rows;
  }

  public async exportBinary(pillar: TriDatabasePillar): Promise<Uint8Array> {
    const db = this.getDb(pillar);
    return db.export();
  }

  public async importBinary(pillar: TriDatabasePillar, data: Uint8Array): Promise<void> {
    if (!this.SQL) {
      this.SQL = await MemoryStorageVFS.getSqlJs();
    }
    const current = this.databases.get(pillar);
    if (current) {
      try { current.close(); } catch { /* ignore */ }
    }
    const newDb = new this.SQL.Database(data);
    this.databases.set(pillar, newDb);
    this.initialized = true;
  }

  public async close(): Promise<void> {
    for (const db of this.databases.values()) {
      try { db.close(); } catch { /* ignore */ }
    }
    this.databases.clear();
    this.initialized = false;
  }
}
