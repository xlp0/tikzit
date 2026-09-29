/**
 * ThreeWayMergeEngine: Content-Addressed 3-Way Merge Engine
 *
 * Implements LCA-based branching merges, fast-forwarding, and graph AST auto-merging.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../../storage/OperadicMCardVfs';
import { AncestryGraph } from '../lineage/AncestryGraph';
import { SemanticDiffEngine } from '../diff/SemanticDiffEngine';
import { CommitManager } from '../kernel/CommitManager';
import { GraphAstDiffer } from '../diff/GraphAstDiffer';
import type { MergeConflict, MergeResult, TreeEntry } from '../types/commit';

export class ThreeWayMergeEngine {
  private commitMgr: CommitManager;
  private graphDiffer = new GraphAstDiffer();

  constructor(
    private ancestry: AncestryGraph,
    private diffEngine: SemanticDiffEngine,
    private storage: OperadicMCardVfs
  ) {
    this.commitMgr = new CommitManager(storage);
  }

  public async merge(
    oursCommitHash: string,
    theirsCommitHash: string,
    authorDid: string,
    commitMessage?: string
  ): Promise<MergeResult> {
    if (oursCommitHash === theirsCommitHash) {
      return { status: 'fast-forward', commitHash: oursCommitHash };
    }

    const baseCommitHash = await this.ancestry.findLCA(oursCommitHash, theirsCommitHash);

    // Fast-forward cases
    if (baseCommitHash === theirsCommitHash) {
      return { status: 'fast-forward', commitHash: oursCommitHash };
    }
    if (baseCommitHash === oursCommitHash) {
      return { status: 'fast-forward', commitHash: theirsCommitHash };
    }

    const oursCommit = await this.commitMgr.getCommit(oursCommitHash);
    const theirsCommit = await this.commitMgr.getCommit(theirsCommitHash);
    if (!oursCommit || !theirsCommit) {
      throw new Error(`Invalid merge commits: ours=${oursCommitHash}, theirs=${theirsCommitHash}`);
    }

    const baseCommit = baseCommitHash ? await this.commitMgr.getCommit(baseCommitHash) : null;
    const baseTree = baseCommit ? await this.commitMgr.getTree(baseCommit.treeHash) : { entries: [] };
    const oursTree = await this.commitMgr.getTree(oursCommit.treeHash);
    const theirsTree = await this.commitMgr.getTree(theirsCommit.treeHash);

    const baseMap = new Map((baseTree?.entries ?? []).map(e => [e.handle, e.hash]));
    const oursMap = new Map((oursTree?.entries ?? []).map(e => [e.handle, e.hash]));
    const theirsMap = new Map((theirsTree?.entries ?? []).map(e => [e.handle, e.hash]));

    const allHandles = new Set([...baseMap.keys(), ...oursMap.keys(), ...theirsMap.keys()]);
    const mergedEntries: TreeEntry[] = [];
    const conflicts: MergeConflict[] = [];

    for (const handle of allHandles) {
      const bHash = baseMap.get(handle) ?? null;
      const oHash = oursMap.get(handle) ?? null;
      const tHash = theirsMap.get(handle) ?? null;

      if (oHash === tHash) {
        if (oHash !== null) mergedEntries.push({ handle, hash: oHash });
        continue;
      }

      if (oHash === bHash) {
        // Ours unchanged, theirs changed or deleted
        if (tHash !== null) mergedEntries.push({ handle, hash: tHash });
        continue;
      }

      if (tHash === bHash) {
        // Theirs unchanged, ours changed or deleted
        if (oHash !== null) mergedEntries.push({ handle, hash: oHash });
        continue;
      }

      // Both changed differently
      const resolvedHash = await this.tryAutoMergeCard(bHash, oHash, tHash);
      if (resolvedHash) {
        mergedEntries.push({ handle, hash: resolvedHash });
      } else {
        conflicts.push({
          handle,
          baseHash: bHash,
          oursHash: oHash,
          theirsHash: tHash,
          reason: `Content divergence on handle ${handle}`
        });
      }
    }

    if (conflicts.length > 0) {
      return { status: 'conflict', conflicts };
    }

    const { treeHash } = await this.commitMgr.createTree(mergedEntries);
    const msg = commitMessage ?? `Merge branch '${theirsCommitHash.slice(0, 8)}' into '${oursCommitHash.slice(0, 8)}'`;
    const mergeCommit = await this.commitMgr.createCommit({
      parents: [oursCommitHash, theirsCommitHash],
      treeHash,
      authorDid,
      message: msg
    });

    return {
      status: 'merged',
      commitHash: mergeCommit.hash
    };
  }

  private async tryAutoMergeCard(
    baseHash: string | null,
    oursHash: string | null,
    theirsHash: string | null
  ): Promise<string | null> {
    if (!oursHash || !theirsHash) return null;

    const oursCard = await this.storage.getByHash(oursHash);
    const theirsCard = await this.storage.getByHash(theirsHash);
    if (!oursCard || !theirsCard) return null;

    try {
      const oursJson = JSON.parse(oursCard.text);
      const theirsJson = JSON.parse(theirsCard.text);

      if (oursJson && theirsJson && (oursJson.nodes || oursJson.edges)) {
        let baseJson = {};
        if (baseHash) {
          const baseCard = await this.storage.getByHash(baseHash);
          if (baseCard) try { baseJson = JSON.parse(baseCard.text); } catch {}
        }
        const res = this.graphDiffer.merge(baseJson, oursJson, theirsJson);
        if (res.conflicts.length === 0) {
          const mergedText = JSON.stringify(res.merged);
          return await this.storage.putCard(mergedText, 'application/json', 2);
        }
      }
    } catch {
      // Not JSON or cannot be merged cleanly
    }

    return null;
  }
}
