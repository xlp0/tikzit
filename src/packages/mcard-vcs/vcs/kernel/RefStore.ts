/**
 * RefStore: Branch, Tag, and HEAD Reference Manager
 *
 * Implements atomic reference storage, CAS updates, and HEAD resolution.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../../storage/OperadicMCardVfs';
import type { BranchRef } from '../types/commit';

export class RefStore {
  constructor(private storage: OperadicMCardVfs) {}

  public async getRef(refName: string): Promise<string | null> {
    const vfs = this.storage.getVfs();
    const rows = await vfs.query<{ target: string }>(
      'mcard',
      'SELECT target FROM refs WHERE ref_name = ? LIMIT 1;',
      [refName]
    );
    if (!rows || rows.length === 0) return null;
    return rows[0].target;
  }

  public async setRef(refName: string, target: string): Promise<void> {
    const vfs = this.storage.getVfs();
    const now = new Date().toISOString();
    await vfs.execute(
      'mcard',
      'INSERT OR REPLACE INTO refs (ref_name, target, updated_at) VALUES (?, ?, ?);',
      [refName, target, now]
    );
  }

  public async compareAndSwapRef(
    refName: string,
    expectedOldTarget: string | null,
    newTarget: string
  ): Promise<boolean> {
    const vfs = this.storage.getVfs();
    const current = await this.getRef(refName);

    if (current !== expectedOldTarget) {
      return false;
    }

    const now = new Date().toISOString();
    if (expectedOldTarget === null) {
      await vfs.execute(
        'mcard',
        'INSERT INTO refs (ref_name, target, updated_at) VALUES (?, ?, ?);',
        [refName, newTarget, now]
      );
    } else {
      await vfs.execute(
        'mcard',
        'UPDATE refs SET target = ?, updated_at = ? WHERE ref_name = ? AND target = ?;',
        [newTarget, now, refName, expectedOldTarget]
      );
    }
    return true;
  }

  public async deleteRef(refName: string): Promise<boolean> {
    const vfs = this.storage.getVfs();
    const current = await this.getRef(refName);
    if (current === null) return false;
    await vfs.execute('mcard', 'DELETE FROM refs WHERE ref_name = ?;', [refName]);
    return true;
  }

  public async createBranch(name: string, commitHash: string): Promise<void> {
    const refName = name.startsWith('refs/heads/') ? name : `refs/heads/${name}`;
    const exists = await this.getRef(refName);
    if (exists !== null) {
      throw new Error(`Branch ${name} already exists`);
    }
    await this.setRef(refName, commitHash);
  }

  public async deleteBranch(name: string): Promise<boolean> {
    const refName = name.startsWith('refs/heads/') ? name : `refs/heads/${name}`;
    return await this.deleteRef(refName);
  }

  public async listBranches(): Promise<BranchRef[]> {
    const vfs = this.storage.getVfs();
    const rows = await vfs.query<{ ref_name: string; target: string }>(
      'mcard',
      "SELECT ref_name, target FROM refs WHERE ref_name LIKE 'refs/heads/%' ORDER BY ref_name ASC;"
    );
    return rows.map(r => ({
      name: r.ref_name.replace('refs/heads/', ''),
      commitHash: r.target
    }));
  }

  public async getHead(): Promise<{ target: string; isDetached: boolean; commitHash: string | null; branchName?: string }> {
    const target = await this.getRef('HEAD');
    if (!target) {
      return { target: 'refs/heads/master', isDetached: false, commitHash: null, branchName: 'master' };
    }

    if (target.startsWith('ref: ')) {
      const refPath = target.slice(5).trim();
      const commitHash = await this.getRef(refPath);
      const branchName = refPath.replace('refs/heads/', '');
      return { target: refPath, isDetached: false, commitHash, branchName };
    }

    return { target, isDetached: true, commitHash: target };
  }

  public async setHead(refOrCommit: string): Promise<void> {
    if (refOrCommit.startsWith('refs/heads/')) {
      await this.setRef('HEAD', `ref: ${refOrCommit}`);
    } else if (refOrCommit.startsWith('ref: ')) {
      await this.setRef('HEAD', refOrCommit);
    } else {
      const isBranch = await this.getRef(`refs/heads/${refOrCommit}`);
      if (isBranch !== null) {
        await this.setRef('HEAD', `ref: refs/heads/${refOrCommit}`);
      } else {
        await this.setRef('HEAD', refOrCommit);
      }
    }
  }

  public async resolveRef(refOrCommit: string): Promise<string | null> {
    if (refOrCommit === 'HEAD') {
      const head = await this.getHead();
      return head.commitHash;
    }
    const direct = await this.getRef(refOrCommit);
    if (direct !== null) return direct;

    const branch = await this.getRef(`refs/heads/${refOrCommit}`);
    if (branch !== null) return branch;

    const tag = await this.getRef(`refs/tags/${refOrCommit}`);
    if (tag !== null) return tag;

    // Check if it's already a valid card/commit hash
    const card = await this.storage.getByHash(refOrCommit);
    if (card !== null) return refOrCommit;

    return null;
  }
}
