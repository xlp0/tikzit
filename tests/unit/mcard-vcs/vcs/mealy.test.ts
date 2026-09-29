import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OperadicMCardVfs } from '../../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';
import { MCardVcsEngine } from '../../../../src/packages/mcard-vcs/vcs/MCardVcsEngine';

describe('Sprint 26: Mealy VCS State Machine (O = δ(s, i))', () => {
  let vfs: OperadicMCardVfs;
  let engine: MCardVcsEngine;

  beforeEach(async () => {
    const memBackend = new MemoryStorageVFS();
    await memBackend.init();
    vfs = new OperadicMCardVfs(memBackend);
    engine = new MCardVcsEngine(vfs);
    await engine.init();
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('26-DOD-01: initializes with clean state and default branch master', () => {
    const state = engine.getState();
    expect(state.currentBranch).toBe('master');
    expect(state.head).toBeNull();
    expect(Object.keys(state.stagedCards).length).toBe(0);
  });

  it('stages content and computes content-addressed card hash', async () => {
    const out = await engine.step({
      type: 'stage',
      handle: 'card:test:1',
      payload: 'hello world',
      mimeType: 'text/plain'
    });

    expect(out.status).toBe('staged');
    expect(out.cardHash).toBeDefined();
    expect(out.cardHash?.startsWith('blake3:')).toBe(true);

    const state = engine.getState();
    expect(state.stagedCards['card:test:1']).toBe(out.cardHash);
  });

  it('commits staged cards into a verifiable commit record', async () => {
    await engine.step({
      type: 'stage',
      handle: 'diagram:ghz',
      payload: JSON.stringify({ type: 'graph', nodes: [] }),
      mimeType: 'application/json'
    });

    const commitOut = await engine.step({
      type: 'commit',
      authorDid: 'did:key:z6MkuS',
      message: 'Initial GHZ diagram commit'
    });

    expect(commitOut.status).toBe('transitioned');
    expect(commitOut.commitHash).toBeDefined();
    expect(commitOut.commitHash?.startsWith('blake3:')).toBe(true);

    const state = engine.getState();
    expect(state.head).toBe(commitOut.commitHash);
    expect(Object.keys(state.stagedCards).length).toBe(0);
  });

  it('creates branch and checks out branch', async () => {
    await engine.step({
      type: 'stage',
      handle: 'file:1',
      payload: 'v1'
    });
    const c1 = await engine.step({
      type: 'commit',
      authorDid: 'did:key:author1',
      message: 'c1'
    });

    const branchOut = await engine.step({
      type: 'branch',
      name: 'feature/quantum'
    });
    expect(branchOut.status).toBe('branched');

    const checkoutOut = await engine.step({
      type: 'checkout',
      ref: 'feature/quantum'
    });
    expect(checkoutOut.status).toBe('checked_out');
    expect(checkoutOut.currentBranch).toBe('feature/quantum');

    const state = engine.getState();
    expect(state.currentBranch).toBe('feature/quantum');
    expect(state.head).toBe(c1.commitHash);
  });
});
