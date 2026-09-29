import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OperadicMCardVfs } from '../../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';

describe('OperadicMCardVfs (Unified Storage Kernel)', () => {
  let vfs: OperadicMCardVfs;

  beforeEach(async () => {
    vfs = await OperadicMCardVfs.createOptimal({ backend: 'memory' });
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('stores content and generates canonical BLAKE3 content-addressed hashes (blake3:...)', async () => {
    const handle = 'zx:diagrams:teleportation';
    const tikz = '% Quantum Teleportation Protocol';

    const stagedHash = await vfs.set(handle, tikz, {
      mimeType: 'text/vnd.tikz',
      mcardType: 0x01,
      companionMetadata: { author: 'Bob', tags: ['quantum', 'zx'] },
      authorDid: 'did:key:alice'
    });

    expect(stagedHash).toMatch(/^blake3:[0-9a-f]{64}$/);

    const card = await vfs.get(handle);
    expect(card).not.toBeNull();
    expect(card!.handle).toBe(handle);
    expect(card!.hash).toBe(stagedHash);
    expect(card!.text).toBe(tikz);
    expect(card!.mimeType).toBe('text/vnd.tikz');
    expect(card!.companionMetadata).toEqual({ author: 'Bob', tags: ['quantum', 'zx'] });
  });

  it('maintains an append-only handle modification history', async () => {
    const handle = 'zx:drafts:cnot';
    await vfs.set(handle, 'v1', { authorDid: 'did:key:alice' });
    await vfs.set(handle, 'v2', { authorDid: 'did:key:bob' });

    const history = await vfs.getHandleHistory(handle);
    expect(history).toHaveLength(2);
    expect(history[0].authorDid).toBe('did:key:bob');
    expect(history[1].authorDid).toBe('did:key:alice');
  });

  it('lists handles and filters by prefix', async () => {
    await vfs.set('zx:diagrams:alpha', 'a');
    await vfs.set('zx:diagrams:beta', 'b');
    await vfs.set('zx:drafts:gamma', 'c');

    const all = await vfs.listHandles();
    expect(all).toHaveLength(3);

    const diagramsOnly = await vfs.listHandles('zx:diagrams:');
    expect(diagramsOnly).toEqual(['zx:diagrams:alpha', 'zx:diagrams:beta']);
  });

  it('supports deleting handles and verifies has()', async () => {
    const handle = 'zx:temp:scratch';
    await vfs.set(handle, 'temp');
    expect(await vfs.has(handle)).toBe(true);

    const deleted = await vfs.delete(handle);
    expect(deleted).toBe(true);
    expect(await vfs.has(handle)).toBe(false);
    expect(await vfs.get(handle)).toBeNull();
  });

  it('rolls back atomic mutations upon savepoint exception', async () => {
    const handle = 'zx:atomic:safe-handle';
    await vfs.set(handle, 'initial state');

    await expect(
      vfs.withSavepoint('failing_tx', async () => {
        await vfs.set(handle, 'mutated state in transaction');
        throw new Error('Simulation of unexpected failure');
      })
    ).rejects.toThrow('Simulation of unexpected failure');

    // The handle must have rolled back to initial state
    const after = await vfs.get(handle);
    expect(after?.text).toBe('initial state');
  });

  it('fires dispatch events for card lifecycle subscriptions', async () => {
    const stagedCallback = vi.fn();
    const deletedCallback = vi.fn();

    const unsubStaged = vfs.on('card:staged', stagedCallback);
    const unsubDeleted = vfs.on('card:deleted', deletedCallback);

    await vfs.set('zx:event:test', 'hello');
    expect(stagedCallback).toHaveBeenCalledTimes(1);
    expect(stagedCallback).toHaveBeenCalledWith(
      expect.objectContaining({ handle: 'zx:event:test' })
    );

    await vfs.delete('zx:event:test');
    expect(deletedCallback).toHaveBeenCalledTimes(1);

    unsubStaged();
    unsubDeleted();
  });
});
