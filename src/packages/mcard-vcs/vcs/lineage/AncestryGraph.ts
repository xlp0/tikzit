/**
 * AncestryGraph: Lowest Common Ancestor (LCA) & Topological DAG Traversal
 *
 * Implements git-caliber graph traversal and LCA search for multi-parent commits.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../../storage/OperadicMCardVfs';
import { CommitManager } from '../kernel/CommitManager';
import type { CommitRecord } from '../types/commit';

export class AncestryGraph {
  private commitMgr: CommitManager;

  constructor(private storage: OperadicMCardVfs) {
    this.commitMgr = new CommitManager(storage);
  }

  public async getAncestors(commitHash: string): Promise<Set<string>> {
    const ancestors = new Set<string>();
    const queue: string[] = [commitHash];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (ancestors.has(current)) continue;
      ancestors.add(current);

      const commit = await this.commitMgr.getCommit(current);
      if (commit && commit.parents) {
        for (const parent of commit.parents) {
          if (!ancestors.has(parent)) {
            queue.push(parent);
          }
        }
      }
    }
    return ancestors;
  }

  public async isAncestor(possibleAncestor: string, descendant: string): Promise<boolean> {
    if (possibleAncestor === descendant) return true;
    const ancestors = await this.getAncestors(descendant);
    return ancestors.has(possibleAncestor);
  }

  public async findLCA(commitA: string, commitB: string): Promise<string | null> {
    if (commitA === commitB) return commitA;

    // Fast-path: check if A is ancestor of B or B is ancestor of A
    const ancestorsA = await this.getAncestors(commitA);
    if (ancestorsA.has(commitB)) return commitB;

    const ancestorsB = await this.getAncestors(commitB);
    if (ancestorsB.has(commitA)) return commitA;

    // Common ancestors
    const commonAncestors = new Set<string>();
    for (const h of ancestorsA) {
      if (ancestorsB.has(h)) {
        commonAncestors.add(h);
      }
    }

    if (commonAncestors.size === 0) return null;

    // Find candidate in commonAncestors that is NOT an ancestor of any other common ancestor
    // (i.e. the lowest / most recent)
    let bestLCA: string | null = null;
    for (const candidate of commonAncestors) {
      let isAncestorOfAnother = false;
      for (const other of commonAncestors) {
        if (candidate !== other) {
          const otherAncestors = await this.getAncestors(other);
          if (otherAncestors.has(candidate)) {
            isAncestorOfAnother = true;
            break;
          }
        }
      }
      if (!isAncestorOfAnother) {
        bestLCA = candidate;
        break;
      }
    }

    return bestLCA;
  }

  public async getCommitHistory(startCommitHash: string, limit = 100): Promise<CommitRecord[]> {
    const visited = new Set<string>();
    const queue: string[] = [startCommitHash];
    const commits: CommitRecord[] = [];

    while (queue.length > 0 && commits.length < limit) {
      const hash = queue.shift()!;
      if (visited.has(hash)) continue;
      visited.add(hash);

      const commit = await this.commitMgr.getCommit(hash);
      if (!commit) continue;

      commits.push(commit);
      for (const parent of commit.parents) {
        if (!visited.has(parent)) {
          queue.push(parent);
        }
      }
    }

    // Sort by timestamp descending
    commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return commits;
  }

  public async topologicalSort(startCommits: string[]): Promise<CommitRecord[]> {
    const inDegree = new Map<string, number>();
    const childrenMap = new Map<string, string[]>();
    const allCommits = new Map<string, CommitRecord>();

    // Discover all reachable commits
    const queue = [...startCommits];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const hash = queue.shift()!;
      if (visited.has(hash)) continue;
      visited.add(hash);

      const commit = await this.commitMgr.getCommit(hash);
      if (!commit) continue;
      allCommits.set(hash, commit);

      for (const p of commit.parents) {
        if (!childrenMap.has(p)) childrenMap.set(p, []);
        childrenMap.get(p)!.push(hash);
        inDegree.set(hash, (inDegree.get(hash) ?? 0) + 1);
        if (!visited.has(p)) queue.push(p);
      }
    }

    // Kahn's algorithm
    const ready: string[] = [];
    for (const [hash] of allCommits) {
      if ((inDegree.get(hash) ?? 0) === 0) {
        ready.push(hash);
      }
    }

    const result: CommitRecord[] = [];
    while (ready.length > 0) {
      const hash = ready.shift()!;
      const record = allCommits.get(hash);
      if (record) result.push(record);

      const children = childrenMap.get(hash) ?? [];
      for (const child of children) {
        const deg = (inDegree.get(child) ?? 1) - 1;
        inDegree.set(child, deg);
        if (deg === 0) ready.push(child);
      }
    }

    return result;
  }
}
