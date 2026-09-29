/**
 * IndexedDbStorageVFS: Browser IndexedDB Persistence Bridge
 *
 * Persists WASM SQLite .db binary snapshots in IndexedDB using globalThis.
 * Gracefully falls back to pure memory if IndexedDB is unavailable (e.g. Node tests).
 * Zero DOM (window/document/HTMLElement) references. Contract D ceiling: <= 250 LOC.
 */

import type { StorageVFS, TriDatabasePillar, QueryResultRow } from './types';
import { MemoryStorageVFS } from './MemoryStorageVFS';

const IDB_DATABASE_NAME = 'clm_operadic_vfs';
const IDB_STORE_NAME = 'sovereign_pillars';

export class IndexedDbStorageVFS implements StorageVFS {
  private memVfs = new MemoryStorageVFS();
  private dbName: string;
  private initialized = false;

  constructor(dbName = IDB_DATABASE_NAME) {
    this.dbName = dbName;
  }

  private hasIndexedDb(): boolean {
    return typeof globalThis !== 'undefined' && 'indexedDB' in globalThis && globalThis.indexedDB !== null;
  }

  private openIdb(): Promise<IDBDatabase | null> {
    if (!this.hasIndexedDb()) return Promise.resolve(null);

    return new Promise((resolve) => {
      const request = globalThis.indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[IndexedDbStorageVFS] Failed to open IndexedDB, falling back to memory.');
        resolve(null);
      };
    });
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await this.memVfs.init();

    const idb = await this.openIdb();
    if (idb) {
      const pillars: TriDatabasePillar[] = ['mcard', 'knowledge', 'executionLog'];
      for (const pillar of pillars) {
        try {
          const bytes = await this.loadFromIdb(idb, pillar);
          if (bytes && bytes.length > 0) {
            await this.memVfs.importBinary(pillar, bytes);
          }
        } catch { /* ignore */ }
      }
      idb.close();
    }
    this.initialized = true;
  }

  private loadFromIdb(db: IDBDatabase, key: string): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : null);
      req.onerror = () => resolve(null);
    });
  }

  private async flushPillar(pillar: TriDatabasePillar): Promise<void> {
    const idb = await this.openIdb();
    if (!idb) return;

    const bytes = await this.memVfs.exportBinary(pillar);
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(bytes, pillar);
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => {
        idb.close();
        resolve();
      };
    });
  }

  private savepointDepth = 0;

  public async execute(pillar: TriDatabasePillar, sql: string, params?: unknown[]): Promise<void> {
    const trimmed = sql.trim().toUpperCase();
    const isSavepointStart = trimmed.startsWith('SAVEPOINT') || trimmed.startsWith('BEGIN');
    const isSavepointEnd = trimmed.startsWith('RELEASE') || trimmed.startsWith('COMMIT') || trimmed.startsWith('ROLLBACK');

    if (isSavepointStart) {
      this.savepointDepth++;
    }

    await this.memVfs.execute(pillar, sql, params);

    if (isSavepointEnd && this.savepointDepth > 0) {
      this.savepointDepth--;
    }

    if (this.savepointDepth === 0) {
      await this.flushPillar(pillar);
    }
  }

  public async query<T = QueryResultRow>(pillar: TriDatabasePillar, sql: string, params?: unknown[]): Promise<T[]> {
    return await this.memVfs.query<T>(pillar, sql, params);
  }

  public async exportBinary(pillar: TriDatabasePillar): Promise<Uint8Array> {
    return await this.memVfs.exportBinary(pillar);
  }

  public async importBinary(pillar: TriDatabasePillar, data: Uint8Array): Promise<void> {
    await this.memVfs.importBinary(pillar, data);
    await this.flushPillar(pillar);
  }

  public async close(): Promise<void> {
    const pillars: TriDatabasePillar[] = ['mcard', 'knowledge', 'executionLog'];
    for (const pillar of pillars) {
      await this.flushPillar(pillar);
    }
    await this.memVfs.close();
    this.initialized = false;
  }
}
