/**
 * SavepointGuard: ACID Transaction & Nested Savepoint Manager
 *
 * Provides transactional rollback guarantees using SQLite SAVEPOINT semantics.
 * Guarantees zero dangling locks or uncommitted mutations upon unhandled exceptions.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type { StorageVFS, TriDatabasePillar } from '../vfs/types';
import { VfsEventBus } from '../events/VfsEventBus';

export class SavepointGuard {
  private savepointStack: string[] = [];
  private counter = 0;

  constructor(
    private vfs: StorageVFS,
    private bus?: VfsEventBus
  ) {}

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Executes an asynchronous action wrapped inside a named SQLite SAVEPOINT.
   * Automatically executes ROLLBACK TO and rethrows if an error occurs.
   */
  public async withSavepoint<T>(
    pillar: TriDatabasePillar,
    baseName: string,
    action: () => Promise<T>
  ): Promise<T> {
    const spId = `sp_${this.sanitizeName(baseName)}_${++this.counter}`;
    this.savepointStack.push(spId);

    await this.vfs.execute(pillar, `SAVEPOINT ${spId};`);
    await this.bus?.dispatch('savepoint:created', { name: spId });

    try {
      const result = await action();
      await this.vfs.execute(pillar, `RELEASE SAVEPOINT ${spId};`);
      await this.bus?.dispatch('savepoint:released', { name: spId });
      return result;
    } catch (err: any) {
      try {
        await this.vfs.execute(pillar, `ROLLBACK TO SAVEPOINT ${spId};`);
        await this.vfs.execute(pillar, `RELEASE SAVEPOINT ${spId};`);
      } catch (rollbackErr) {
        console.error(`[SavepointGuard] Rollback failed for ${spId}:`, rollbackErr);
      }
      await this.bus?.dispatch('savepoint:rolled_back', {
        name: spId,
        reason: err?.message ?? String(err)
      });
      throw err;
    } finally {
      const idx = this.savepointStack.lastIndexOf(spId);
      if (idx !== -1) {
        this.savepointStack.splice(idx, 1);
      }
    }
  }

  /**
   * Returns current active savepoint depth.
   */
  public get depth(): number {
    return this.savepointStack.length;
  }
}
