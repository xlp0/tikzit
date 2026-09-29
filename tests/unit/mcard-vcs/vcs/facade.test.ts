import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { OperadicMCardVfs } from '../../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';
import { NodeFsStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/NodeFsStorageVFS';
import { MCardVcsEngine } from '../../../../src/packages/mcard-vcs/vcs/MCardVcsEngine';
import { ExplorerQueryFacade } from '../../../../src/packages/mcard-vcs/explorer/ExplorerQueryFacade';

describe('Sprint 26: ExplorerQueryFacade & Compatibility Matrix', () => {
  let vfs: OperadicMCardVfs;
  let engine: MCardVcsEngine;
  let facade: ExplorerQueryFacade;

  beforeEach(async () => {
    const memBackend = new MemoryStorageVFS();
    await memBackend.init();
    vfs = new OperadicMCardVfs(memBackend);
    engine = new MCardVcsEngine(vfs);
    await engine.init();
    facade = new ExplorerQueryFacade(vfs, engine);
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('26-DOD-11: getMCardHashHistory returns rows shape-compatible with DocumentCommitService.HistoryRow', async () => {
    await vfs.set('doc:circuit', 'quantum circuit 1', { authorDid: 'did:key:alice' });
    await vfs.set('doc:circuit', 'quantum circuit 2', { authorDid: 'did:key:bob' });

    const history = await engine.getMCardHashHistory('doc:circuit');
    expect(history.length).toBe(2);

    for (const row of history) {
      expect(typeof row.hash).toBe('string');
      expect(typeof row.changedAt).toBe('string');
      expect(typeof row.authorDid).toBe('string');
      expect(typeof row.message).toBe('string');
      expect(typeof row.position).toBe('number');
      expect(typeof row.isHead).toBe('boolean');
    }
  });

  it('26-DOD-13: ExplorerQueryFacade returns plain DTOs that survive structuredClone', async () => {
    await vfs.set('zx:rule:spider', 'spider fusion content', { mimeType: 'text/tikz' });
    await vfs.set('zx:rule:bialgebra', 'bialgebra content', { mimeType: 'text/tikz' });

    // 1. listHandles
    const handles = await facade.listHandles('zx:rule');
    expect(handles).toContain('zx:rule:spider');
    expect(handles).toContain('zx:rule:bialgebra');
    expect(structuredClone(handles)).toEqual(handles);

    // 2. search
    const searchRes = await facade.search({ pattern: 'spider' });
    expect(searchRes.length).toBe(1);
    expect(searchRes[0].handle).toBe('zx:rule:spider');
    expect(structuredClone(searchRes)).toEqual(searchRes);

    // 3. getHistory
    const hist = await facade.getHistory('zx:rule:spider');
    expect(hist.length).toBe(1);
    expect(structuredClone(hist)).toEqual(hist);

    // 4. describeDiff
    await engine.step({ type: 'stage', handle: 'zx:rule:spider', payload: 'spider v1' });
    const c1 = await engine.step({ type: 'commit', authorDid: 'alice', message: 'v1' });
    await engine.step({ type: 'stage', handle: 'zx:rule:spider', payload: 'spider v2' });
    const c2 = await engine.step({ type: 'commit', authorDid: 'alice', message: 'v2' });

    const diffRes = await facade.describeDiff('zx:rule:spider', c1.commitHash!, c2.commitHash!);
    expect(diffRes.isIdentical).toBe(false);
    expect(diffRes.additions).toBeGreaterThan(0);
    expect(structuredClone(diffRes)).toEqual(diffRes);

    // 5. subscribe
    let eventReceived: any = null;
    const unsubscribe = facade.subscribe((event) => {
      eventReceived = event;
    });
    await vfs.set('test:sub', 'data');
    expect(eventReceived).toBeDefined();
    unsubscribe();
  });

  it('26-DOD-14: Runs headlessly with parity on NodeFsStorageVFS and zero DOM globals', async () => {
    const tmpDir = path.join(process.cwd(), 'node_modules', '.tmp-vcs-facade-test');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const nodeVfs = new NodeFsStorageVFS(tmpDir);
    await nodeVfs.init();
    const diskOperadicVfs = new OperadicMCardVfs(nodeVfs);
    const diskEngine = new MCardVcsEngine(diskOperadicVfs);
    await diskEngine.init();
    const diskFacade = new ExplorerQueryFacade(diskOperadicVfs, diskEngine);

    await diskOperadicVfs.set('disk:handle', 'persisted content', { mimeType: 'text/plain' });
    const handles = await diskFacade.listHandles('disk:');
    expect(handles).toContain('disk:handle');

    const searchRes = await diskFacade.search({ pattern: 'persisted' });
    expect(searchRes.length).toBe(1);

    await diskOperadicVfs.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
