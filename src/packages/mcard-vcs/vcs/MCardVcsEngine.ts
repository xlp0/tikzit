/**
 * MCardVcsEngine: Unified Mealy Machine Version Control Facade
 *
 * Implements input-driven transition morphisms O = δ(s, i) grounded in DOTS.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../storage/OperadicMCardVfs';
import type { MealyVcsMachine, VcsInputIntent, VcsTransitionOutput, VcsState } from './types/mealy';
import type { SemanticDiffResult, TreeEntry } from './types/commit';
import { CommitManager } from './kernel/CommitManager';
import { RefStore } from './kernel/RefStore';
import { AncestryGraph } from './lineage/AncestryGraph';
import { SemanticDiffEngine } from './diff/SemanticDiffEngine';
import { ThreeWayMergeEngine } from './merge/ThreeWayMergeEngine';

export class MCardVcsEngine implements MealyVcsMachine {
  private commitMgr: CommitManager;
  private refStore: RefStore;
  private ancestry: AncestryGraph;
  private diffEngine: SemanticDiffEngine;
  private merger: ThreeWayMergeEngine;
  private staged: Record<string, string> = {};
  private headCommit: string | null = null;
  private activeBranch = 'master';

  constructor(private storage: OperadicMCardVfs) {
    this.commitMgr = new CommitManager(storage);
    this.refStore = new RefStore(storage);
    this.ancestry = new AncestryGraph(storage);
    this.diffEngine = new SemanticDiffEngine();
    this.merger = new ThreeWayMergeEngine(this.ancestry, this.diffEngine, storage);
  }

  public async init(): Promise<void> {
    const head = await this.refStore.getHead();
    this.headCommit = head.commitHash;
    this.activeBranch = head.branchName ?? 'master';
  }

  public getState(): VcsState {
    return {
      head: this.headCommit,
      currentBranch: this.activeBranch,
      stagedCards: { ...this.staged }
    };
  }

  public async step(intent: VcsInputIntent): Promise<VcsTransitionOutput> {
    switch (intent.type) {
      case 'stage': {
        const hash = await this.storage.putCard(
          intent.payload,
          intent.mimeType ?? 'text/plain',
          intent.mcardType ?? 1
        );
        this.staged[intent.handle] = hash;
        return { status: 'staged', cardHash: hash };
      }
      case 'commit':
        return await this.executeCommit(intent.authorDid, intent.message, intent.branchRef);
      case 'branch': {
        const target = intent.startRef
          ? await this.refStore.resolveRef(intent.startRef)
          : this.headCommit;
        if (!target) return { status: 'rejected', error: 'No valid target commit for branch' };
        await this.refStore.createBranch(intent.name, target);
        return { status: 'branched', currentBranch: intent.name };
      }
      case 'checkout':
        return await this.executeCheckout(intent.ref);
      case 'merge':
        return await this.executeMerge(intent.baseRef, intent.incomingRef, intent.authorDid);
      default:
        return { status: 'rejected', error: 'Unknown intent' };
    }
  }

  private async executeCommit(authorDid: string, message: string, branchRef?: string): Promise<VcsTransitionOutput> {
    const branch = branchRef ?? this.activeBranch;
    const parent = this.headCommit ? [this.headCommit] : [];

    let entries: TreeEntry[] = [];
    if (this.headCommit) {
      const parentCommit = await this.commitMgr.getCommit(this.headCommit);
      if (parentCommit) {
        const parentTree = await this.commitMgr.getTree(parentCommit.treeHash);
        entries = parentTree ? [...parentTree.entries] : [];
      }
    }

    const entryMap = new Map(entries.map(e => [e.handle, e.hash]));
    for (const [h, cardHash] of Object.entries(this.staged)) {
      entryMap.set(h, cardHash);
    }
    const mergedEntries: TreeEntry[] = Array.from(entryMap.entries()).map(([handle, hash]) => ({ handle, hash }));

    const { treeHash } = await this.commitMgr.createTree(mergedEntries);
    const commit = await this.commitMgr.createCommit({ parents: parent, treeHash, authorDid, message });

    const now = new Date().toISOString();
    for (const entry of mergedEntries) {
      await this.storage.getVfs().execute(
        'mcard',
        'INSERT OR REPLACE INTO handles (handle, hash, updated_at) VALUES (?, ?, ?);',
        [entry.handle, entry.hash, now]
      );
      const latest = await this.storage.getVfs().query<{ id: number; hash: string }>(
        'mcard',
        'SELECT id, hash FROM handle_history WHERE handle = ? ORDER BY id DESC LIMIT 1;',
        [entry.handle]
      );
      if (latest.length > 0 && latest[0].hash === entry.hash) {
        await this.storage.getVfs().execute(
          'mcard',
          'UPDATE handle_history SET author_did = ?, message = ? WHERE id = ?;',
          [authorDid, message, latest[0].id]
        );
      } else {
        await this.storage.getVfs().execute(
          'mcard',
          'INSERT INTO handle_history (handle, hash, changed_at, author_did, message) VALUES (?, ?, ?, ?, ?);',
          [entry.handle, entry.hash, now, authorDid, message]
        );
      }
    }

    await this.refStore.setRef(`refs/heads/${branch}`, commit.hash);
    await this.refStore.setHead(`refs/heads/${branch}`);
    this.headCommit = commit.hash;
    this.staged = {};

    return { status: 'transitioned', commitHash: commit.hash };
  }

  private async executeCheckout(ref: string): Promise<VcsTransitionOutput> {
    const resolved = await this.refStore.resolveRef(ref);
    if (!resolved) return { status: 'rejected', error: `Ref not found: ${ref}` };

    await this.refStore.setHead(ref);
    const head = await this.refStore.getHead();
    this.headCommit = resolved;
    this.activeBranch = head.branchName ?? 'detached';
    this.staged = {};
    return { status: 'checked_out', currentBranch: this.activeBranch, commitHash: resolved };
  }

  private async executeMerge(baseRef: string, incomingRef: string, authorDid: string): Promise<VcsTransitionOutput> {
    const baseCommit = await this.refStore.resolveRef(baseRef);
    const incomingCommit = await this.refStore.resolveRef(incomingRef);
    if (!baseCommit || !incomingCommit) {
      return { status: 'rejected', error: `Cannot resolve merge refs: ${baseRef}, ${incomingRef}` };
    }

    const mergeRes = await this.merger.merge(baseCommit, incomingCommit, authorDid);
    if (mergeRes.status === 'conflict') {
      return { status: 'conflict', conflicts: mergeRes.conflicts?.map(c => ({ handle: c.handle, reason: c.reason })) };
    }

    if (mergeRes.commitHash) {
      await this.refStore.setRef(`refs/heads/${this.activeBranch}`, mergeRes.commitHash);
      this.headCommit = mergeRes.commitHash;
    }
    return { status: 'merged', commitHash: mergeRes.commitHash };
  }

  public async getMCardHashHistory(handle: string): Promise<Array<{
    hash: string; changedAt: string; authorDid: string; message: string; position?: number; isHead?: boolean;
  }>> {
    const vfsHistory = await this.storage.getHandleHistory(handle);
    if (vfsHistory.length > 0) {
      return vfsHistory.map((h, idx) => ({ ...h, position: idx, isHead: idx === 0 }));
    }

    if (!this.headCommit) return [];
    const commits = await this.ancestry.getCommitHistory(this.headCommit);
    const result: Array<{ hash: string; changedAt: string; authorDid: string; message: string; position?: number; isHead?: boolean }> = [];

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      const tree = await this.commitMgr.getTree(commit.treeHash);
      const entry = tree?.entries.find(e => e.handle === handle);
      if (entry) {
        result.push({
          hash: entry.hash,
          changedAt: commit.timestamp,
          authorDid: commit.authorDid,
          message: commit.message,
          position: i,
          isHead: i === 0
        });
      }
    }
    return result;
  }

  public async diff(handle: string, baseRef: string, targetRef: string): Promise<SemanticDiffResult> {
    const baseCommitHash = await this.refStore.resolveRef(baseRef);
    const targetCommitHash = await this.refStore.resolveRef(targetRef);

    const baseTree = baseCommitHash ? await this.getTreeForCommit(baseCommitHash) : null;
    const targetTree = targetCommitHash ? await this.getTreeForCommit(targetCommitHash) : null;

    const baseEntry = baseTree?.entries.find(e => e.handle === handle);
    const targetEntry = targetTree?.entries.find(e => e.handle === handle);

    const baseCard = baseEntry ? await this.storage.getByHash(baseEntry.hash) : null;
    const targetCard = targetEntry ? await this.storage.getByHash(targetEntry.hash) : null;

    return this.diffEngine.diff(
      handle,
      baseCard ? baseCard.text : null,
      targetCard ? targetCard.text : null,
      baseEntry?.hash ?? null,
      targetEntry?.hash ?? null
    );
  }

  private async getTreeForCommit(commitHash: string) {
    const commit = await this.commitMgr.getCommit(commitHash);
    return commit ? await this.commitMgr.getTree(commit.treeHash) : null;
  }
}
