import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OperadicMCardVfs } from '../../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';
import { CommitManager } from '../../../../src/packages/mcard-vcs/vcs/kernel/CommitManager';
import { AncestryGraph } from '../../../../src/packages/mcard-vcs/vcs/lineage/AncestryGraph';
import { SemanticDiffEngine } from '../../../../src/packages/mcard-vcs/vcs/diff/SemanticDiffEngine';
import { ThreeWayMergeEngine } from '../../../../src/packages/mcard-vcs/vcs/merge/ThreeWayMergeEngine';
import { ConflictResolver } from '../../../../src/packages/mcard-vcs/vcs/merge/ConflictResolver';

describe('Sprint 26: 3-Way Merkle Merge Engine & Conflict Resolution', () => {
  let vfs: OperadicMCardVfs;
  let commitMgr: CommitManager;
  let ancestry: AncestryGraph;
  let diffEngine: SemanticDiffEngine;
  let merger: ThreeWayMergeEngine;
  let resolver: ConflictResolver;

  beforeEach(async () => {
    const memBackend = new MemoryStorageVFS();
    await memBackend.init();
    vfs = new OperadicMCardVfs(memBackend);
    commitMgr = new CommitManager(vfs);
    ancestry = new AncestryGraph(vfs);
    diffEngine = new SemanticDiffEngine();
    merger = new ThreeWayMergeEngine(ancestry, diffEngine, vfs);
    resolver = new ConflictResolver(vfs);
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('26-DOD-08: fast-forwards clean branch updates without creating duplicate merge commits', async () => {
    const h1 = await vfs.putCard('content 1');
    const { treeHash: t1 } = await commitMgr.createTree([{ handle: 'f1', hash: h1 }]);
    const c1 = await commitMgr.createCommit({ parents: [], treeHash: t1, authorDid: 'alice', message: 'c1' });

    const h2 = await vfs.putCard('content 2');
    const { treeHash: t2 } = await commitMgr.createTree([{ handle: 'f1', hash: h2 }]);
    const c2 = await commitMgr.createCommit({ parents: [c1.hash], treeHash: t2, authorDid: 'alice', message: 'c2' });

    // c1 merged with c2 should fast-forward to c2
    const res = await merger.merge(c1.hash, c2.hash, 'bob');
    expect(res.status).toBe('fast-forward');
    expect(res.commitHash).toBe(c2.hash);
  });

  it('26-DOD-09: auto-merges non-overlapping node and edge changes in diagram graphs', async () => {
    const baseGraph = JSON.stringify({
      nodes: [{ id: 'n1', x: 0, y: 0, style: 'dot' }],
      edges: []
    });
    const oursGraph = JSON.stringify({
      nodes: [
        { id: 'n1', x: 0, y: 0, style: 'dot' },
        { id: 'n2', x: 10, y: 10, style: 'box' } // added by ours
      ],
      edges: []
    });
    const theirsGraph = JSON.stringify({
      nodes: [
        { id: 'n1', x: 0, y: 0, style: 'dot' },
        { id: 'n3', x: 20, y: 20, style: 'circle' } // added by theirs
      ],
      edges: []
    });

    const bHash = await vfs.putCard(baseGraph);
    const oHash = await vfs.putCard(oursGraph);
    const tHash = await vfs.putCard(theirsGraph);

    const { treeHash: tb } = await commitMgr.createTree([{ handle: 'diag', hash: bHash }]);
    const cb = await commitMgr.createCommit({ parents: [], treeHash: tb, authorDid: 'root', message: 'base' });

    const { treeHash: to } = await commitMgr.createTree([{ handle: 'diag', hash: oHash }]);
    const co = await commitMgr.createCommit({ parents: [cb.hash], treeHash: to, authorDid: 'ours', message: 'ours' });

    const { treeHash: tt } = await commitMgr.createTree([{ handle: 'diag', hash: tHash }]);
    const ct = await commitMgr.createCommit({ parents: [cb.hash], treeHash: tt, authorDid: 'theirs', message: 'theirs' });

    const mergeRes = await merger.merge(co.hash, ct.hash, 'merger');
    expect(mergeRes.status).toBe('merged');
    expect(mergeRes.commitHash).toBeDefined();

    const mergedCommit = await commitMgr.getCommit(mergeRes.commitHash!);
    expect(mergedCommit?.parents.length).toBe(2);

    const mergedTree = await commitMgr.getTree(mergedCommit!.treeHash);
    const mergedDiagHash = mergedTree?.entries.find(e => e.handle === 'diag')?.hash;
    expect(mergedDiagHash).toBeDefined();

    const mergedCard = await vfs.getByHash(mergedDiagHash!);
    const parsed = JSON.parse(mergedCard!.text);
    // Should contain n1, n2, and n3
    expect(parsed.nodes.length).toBe(3);
    const ids = parsed.nodes.map((n: any) => n.id);
    expect(ids).toContain('n1');
    expect(ids).toContain('n2');
    expect(ids).toContain('n3');
  });

  it('26-DOD-10: conflicting changes produce structured MergeConflict records without corrupting HEAD', async () => {
    const baseText = 'line base';
    const oursText = 'line ours';
    const theirsText = 'line theirs';

    const bHash = await vfs.putCard(baseText);
    const oHash = await vfs.putCard(oursText);
    const tHash = await vfs.putCard(theirsText);

    const { treeHash: tb } = await commitMgr.createTree([{ handle: 'conflict:doc', hash: bHash }]);
    const cb = await commitMgr.createCommit({ parents: [], treeHash: tb, authorDid: 'root', message: 'base' });

    const { treeHash: to } = await commitMgr.createTree([{ handle: 'conflict:doc', hash: oHash }]);
    const co = await commitMgr.createCommit({ parents: [cb.hash], treeHash: to, authorDid: 'ours', message: 'ours' });

    const { treeHash: tt } = await commitMgr.createTree([{ handle: 'conflict:doc', hash: tHash }]);
    const ct = await commitMgr.createCommit({ parents: [cb.hash], treeHash: tt, authorDid: 'theirs', message: 'theirs' });

    const mergeRes = await merger.merge(co.hash, ct.hash, 'merger');
    expect(mergeRes.status).toBe('conflict');
    expect(mergeRes.conflicts).toBeDefined();
    expect(mergeRes.conflicts!.length).toBe(1);
    expect(mergeRes.conflicts![0].handle).toBe('conflict:doc');
    expect(mergeRes.conflicts![0].oursHash).toBe(oHash);
    expect(mergeRes.conflicts![0].theirsHash).toBe(tHash);

    // Conflict resolution with 'theirs' strategy
    const resolution = await resolver.resolve(mergeRes.conflicts!, 'theirs');
    expect(resolution.resolvedEntries.length).toBe(1);
    expect(resolution.resolvedEntries[0].hash).toBe(tHash);
    expect(resolution.witnessHash.startsWith('blake3:')).toBe(true);
  });
});
