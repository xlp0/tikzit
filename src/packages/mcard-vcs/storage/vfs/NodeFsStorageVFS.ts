/**
 * NodeFsStorageVFS: Node.js File System Persistence Bridge
 *
 * Saves and reloads sovereign SQLite .db binary files to/from a local directory.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { StorageVFS, TriDatabasePillar, QueryResultRow } from './types';
import { MemoryStorageVFS } from './MemoryStorageVFS';

export class NodeFsStorageVFS implements StorageVFS {
  private memVfs = new MemoryStorageVFS();
  private initialized = false;

  constructor(private storageDir: string) {}

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    await this.memVfs.init();

    const pillars: TriDatabasePillar[] = ['mcard', 'knowledge', 'executionLog'];
    for (const pillar of pillars) {
      const filePath = path.join(this.storageDir, `${pillar}.db`);
      if (fs.existsSync(filePath)) {
        const bytes = fs.readFileSync(filePath);
        await this.memVfs.importBinary(pillar, new Uint8Array(bytes));
      }
    }

    this.initialized = true;
  }

  private async flushPillar(pillar: TriDatabasePillar): Promise<void> {
    const bytes = await this.memVfs.exportBinary(pillar);
    const filePath = path.join(this.storageDir, `${pillar}.db`);
    fs.writeFileSync(filePath, Buffer.from(bytes));
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
      try {
        await this.flushPillar(pillar);
      } catch { /* ignore */ }
    }
    await this.memVfs.close();
    this.initialized = false;
  }
}
