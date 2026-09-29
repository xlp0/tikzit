/**
 * CommitManager: Content-Addressed Merkle Commit & Tree Operations
 *
 * Grounded in BLAKE3 content-addressing and canonical serialization.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../../storage/OperadicMCardVfs';
import { ContentHasher } from '../../storage/hash/ContentHasher';
import type { CommitMCard, CommitRecord, TreeEntry, TreeMCard } from '../types/commit';

export class CommitManager {
  private hasher = new ContentHasher();

  constructor(private storage: OperadicMCardVfs) {}

  public canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.canonicalStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => `${JSON.stringify(k)}:${this.canonicalStringify(obj[k])}`);
    return '{' + pairs.join(',') + '}';
  }

  public async createTree(entries: TreeEntry[]): Promise<{ treeHash: string; treeCard: TreeMCard }> {
    const sortedEntries = [...entries].sort((a, b) => a.handle.localeCompare(b.handle));
    const treeCard: TreeMCard = { entries: sortedEntries };
    const json = this.canonicalStringify(treeCard);
    const treeHash = this.hasher.hash(json);

    await this.storage.putCard(
      json,
      'application/vnd.clm.tree+json',
      2,
      { type: 'tree', entryCount: sortedEntries.length }
    );

    return { treeHash, treeCard };
  }

  public async getTree(treeHash: string): Promise<TreeMCard | null> {
    const card = await this.storage.getByHash(treeHash);
    if (!card) return null;

    const actualHash = this.hasher.hash(card.content);
    if (actualHash !== treeHash) {
      throw new Error(`Tree integrity violation: expected ${treeHash}, got ${actualHash}`);
    }

    try {
      const parsed = JSON.parse(card.text);
      if (!parsed || !Array.isArray(parsed.entries)) return null;
      return parsed as TreeMCard;
    } catch {
      return null;
    }
  }

  public async createCommit(params: {
    parents: string[];
    treeHash: string;
    authorDid: string;
    message: string;
    timestamp?: string;
    signature?: string;
  }): Promise<CommitRecord> {
    const commitData: CommitMCard = {
      parents: [...params.parents].sort(),
      treeHash: params.treeHash,
      authorDid: params.authorDid,
      timestamp: params.timestamp ?? new Date().toISOString(),
      message: params.message,
      ...(params.signature ? { signature: params.signature } : {})
    };

    const json = this.canonicalStringify(commitData);
    const commitHash = this.hasher.hash(json);

    await this.storage.putCard(
      json,
      'application/vnd.clm.commit+json',
      2,
      { type: 'commit', author: params.authorDid }
    );

    return {
      ...commitData,
      hash: commitHash
    };
  }

  public async getCommit(commitHash: string): Promise<CommitRecord | null> {
    const card = await this.storage.getByHash(commitHash);
    if (!card) return null;

    const actualHash = this.hasher.hash(card.content);
    if (actualHash !== commitHash) {
      throw new Error(`Commit integrity violation: expected ${commitHash}, got ${actualHash}`);
    }

    try {
      const parsed = JSON.parse(card.text);
      if (!parsed || !parsed.treeHash || !Array.isArray(parsed.parents)) return null;
      return {
        ...parsed,
        hash: commitHash
      } as CommitRecord;
    } catch {
      return null;
    }
  }

  public async verifyCommit(commitHash: string): Promise<boolean> {
    try {
      const commit = await this.getCommit(commitHash);
      if (!commit) return false;
      const tree = await this.getTree(commit.treeHash);
      return tree !== null;
    } catch {
      return false;
    }
  }
}
