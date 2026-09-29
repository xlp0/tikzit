import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OperadicMCardVfs } from '../../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';
import { CommitManager } from '../../../../src/packages/mcard-vcs/vcs/kernel/CommitManager';
import { AncestryGraph } from '../../../../src/packages/mcard-vcs/vcs/lineage/AncestryGraph';

describe('Sprint 26: Merkle DAG & Ancestry Lineage', () => {
  let vfs: OperadicMCardVfs;
  let commitMgr: CommitManager;
  let ancestry: AncestryGraph;

  beforeEach(async () => {
    const memBackend = new MemoryStorageVFS();
    await memBackend.init();
    vfs = new OperadicMCardVfs(memBackend);
    commitMgr = new CommitManager(vfs);
    ancestry = new AncestryGraph(vfs);
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('26-DOD-02 & 26-DOD-03: creates content-addressed tree and commit cards with integrity validation', async () => {
    const cardHash1 = await vfs.putCard('content 1');
    const cardHash2 = await vfs.putCard('content 2');

    const { treeHash, treeCard } = await commitMgr.createTree([
      { handle: 'h2', hash: cardHash2 },
      { handle: 'h1', hash: cardHash1 }
    ]);

    expect(treeHash.startsWith('blake3:')).toBe(true);
    // Deterministic sorting
    expect(treeCard.entries[0].handle).toBe('h1');
    expect(treeCard.entries[1].handle).toBe('h2');

    const retrievedTree = await commitMgr.getTree(treeHash);
    expect(retrievedTree).toBeDefined();
    expect(retrievedTree?.entries.length).toBe(2);

    const commit = await commitMgr.createCommit({
      parents: [],
      treeHash,
      authorDid: 'did:key:alice',
      message: 'Initial tree commit'
    });

    expect(commit.hash.startsWith('blake3:')).toBe(true);
    expect(commit.parents.length).toBe(0);

    const retrievedCommit = await commitMgr.getCommit(commit.hash);
    expect(retrievedCommit?.treeHash).toBe(treeHash);
    expect(retrievedCommit?.authorDid).toBe('did:key:alice');

    const isValid = await commitMgr.verifyCommit(commit.hash);
    expect(isValid).toBe(true);
  });

  it('26-DOD-05: calculates Lowest Common Ancestor (LCA) in multi-parent DAG', async () => {
    // Topology:
    // C0 (root)
    //   -> C1 (branch A) -> C3
    //   -> C2 (branch B) -> C4
    // LCA of C3 and C4 should be C0
    const { treeHash } = await commitMgr.createTree([]);

    const c0 = await commitMgr.createCommit({ parents: [], treeHash, authorDid: 'alice', message: 'c0' });
    const c1 = await commitMgr.createCommit({ parents: [c0.hash], treeHash, authorDid: 'alice', message: 'c1' });
    const c2 = await commitMgr.createCommit({ parents: [c0.hash], treeHash, authorDid: 'bob', message: 'c2' });
    const c3 = await commitMgr.createCommit({ parents: [c1.hash], treeHash, authorDid: 'alice', message: 'c3' });
    const c4 = await commitMgr.createCommit({ parents: [c2.hash], treeHash, authorDid: 'bob', message: 'c4' });

    const lca = await ancestry.findLCA(c3.hash, c4.hash);
    expect(lca).toBe(c0.hash);

    const lcaSame = await ancestry.findLCA(c3.hash, c1.hash);
    expect(lcaSame).toBe(c1.hash);

    const isAnc = await ancestry.isAncestor(c0.hash, c3.hash);
    expect(isAnc).toBe(true);

    const notAnc = await ancestry.isAncestor(c3.hash, c2.hash);
    expect(notAnc).toBe(false);
  });

  it('topologically sorts commit DAG', async () => {
    const { treeHash } = await commitMgr.createTree([]);
    const c0 = await commitMgr.createCommit({ parents: [], treeHash, authorDid: 'alice', message: 'c0' });
    const c1 = await commitMgr.createCommit({ parents: [c0.hash], treeHash, authorDid: 'alice', message: 'c1' });
    const c2 = await commitMgr.createCommit({ parents: [c1.hash], treeHash, authorDid: 'alice', message: 'c2' });

    const sorted = await ancestry.topologicalSort([c2.hash]);
    expect(sorted.length).toBe(3);
    expect(sorted[0].hash).toBe(c0.hash);
    expect(sorted[2].hash).toBe(c2.hash);
  });
});
