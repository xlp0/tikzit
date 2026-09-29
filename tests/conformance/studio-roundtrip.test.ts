/**
 * tests/conformance/studio-roundtrip.test.ts - Sprint 29
 * Cross-Application Roundtrip Conformance Suite
 * Verifies TikZiT <-> mcard-studio <-> clm-kernel data interchange.
 * Target: <= 250 LOC. Satisfies Contract D.
 */
import { describe, it, expect } from 'vitest';
import { Context } from 'cordis';
import {
  OperadicMCardVfs,
  MemoryStorageVFS,
  MCardVcsEngine,
  createMCardVcsPlugin,
  StudioMCardPluginBridge,
  registerPluginBridge,
  getPluginBridge,
  MCardStorageService,
  MCardVcsService,
} from '../../src/packages/mcard-vcs';

const CANONICAL_BELL_STATE_TIKZ = `\\begin{tikzpicture}
\\begin{pgfonlayer}{nodelayer}
\\node [style=Z dot] (0) at (-1, 0) {};
\\node [style=X dot] (1) at (1, 0) {};
\\end{pgfonlayer}
\\begin{pgfonlayer}{edgelayer}
\\draw (0) to (1);
\\end{pgfonlayer}
\\end{tikzpicture}`;

const CANONICAL_GHZ_TIKZ = `\\begin{tikzpicture}
\\begin{pgfonlayer}{nodelayer}
\\node [style=Z dot] (0) at (-1, 1) {};
\\node [style=X dot] (1) at (0, 0) {};
\\node [style=Z dot] (2) at (1, -1) {};
\\end{pgfonlayer}
\\begin{pgfonlayer}{edgelayer}
\\draw (0) to (1);
\\draw (1) to (2);
\\end{pgfonlayer}
\\end{tikzpicture}`;

describe('TikZiT <-> mcard-studio <-> clm-kernel Conformance (Sprint 29)', () => {
  it('performs full roundtrip export, mutation via Satori, and re-import', async () => {
    // 1. TikZiT creates and commits a canonical Bell State diagram via Setter Lens
    const tikzitMem = new MemoryStorageVFS();
    await tikzitMem.init();
    const tikzitVfs = new OperadicMCardVfs(tikzitMem);
    const tikzitVcs = new MCardVcsEngine(tikzitVfs);
    await tikzitVcs.init();

    const bellStateHash = await tikzitVfs.set('zx:diagrams:bell-state', CANONICAL_BELL_STATE_TIKZ, {
      mimeType: 'text/vnd.tikz',
      mcardType: 0x01,
      authorDid: 'did:key:tikzit-user'
    });
    expect(bellStateHash).toBeDefined();

    await tikzitVcs.step({
      type: 'stage',
      handle: 'zx:diagrams:bell-state',
      payload: CANONICAL_BELL_STATE_TIKZ
    });

    const commit1 = await tikzitVcs.step({
      type: 'commit',
      authorDid: 'did:key:tikzit-user',
      message: 'Initial Bell State',
      branchRef: 'refs/heads/main'
    });
    expect(commit1.status).toBe('transitioned');

    // 2. Export sovereign SQLite .db file
    const exportedDbBytes = await tikzitVfs.exportBinary('mcard');
    expect(exportedDbBytes).toBeInstanceOf(Uint8Array);
    expect(exportedDbBytes.length).toBeGreaterThan(0);

    // 3. Host side imports the database through the plugin's bridge services
    const studioCtx = new Context();
    const studioPlugin = createMCardVcsPlugin(studioCtx);
    const studioMem = new MemoryStorageVFS();
    await studioMem.init();
    const studioVfs = new OperadicMCardVfs(studioMem);
    const studioVcs = new MCardVcsEngine(studioVfs);
    await studioVcs.init();

    new MCardStorageService(studioCtx, studioVfs);
    new MCardVcsService(studioCtx, studioVcs);

    const studioBridge = new StudioMCardPluginBridge(studioVfs, studioVcs);
    registerPluginBridge(studioPlugin.id, studioBridge);

    const retrievedBridge = getPluginBridge(studioPlugin.id);
    expect(retrievedBridge).toBeDefined();

    await retrievedBridge!.vfs.importBinary('mcard', exportedDbBytes);
    await studioVcs.init();

    // Verify imported card in studio
    const importedCard = await retrievedBridge!.get('zx:diagrams:bell-state');
    expect(importedCard).not.toBeNull();
    expect(importedCard?.hash).toBe(bellStateHash);

    // 4. Host side queries version history via Satori XML codec
    const renderTransition = studioPlugin.transitions?.find(t => t.name === 'vcs:renderSatori');
    expect(renderTransition).toBeDefined();
    const satoriXml = await renderTransition!.morphism({ handle: 'zx:diagrams:bell-state' });
    expect(satoriXml).toContain('<version-dag handle="zx:diagrams:bell-state"');
    expect(satoriXml).toContain(bellStateHash);

    // 5. Host side commits an optimization (GHZ state) via Satori turn
    await retrievedBridge!.step({
      type: 'stage',
      handle: 'zx:diagrams:bell-state',
      payload: CANONICAL_GHZ_TIKZ,
      mimeType: 'text/vnd.tikz'
    });

    const commitTransition = studioPlugin.transitions?.find(t => t.name === 'vcs:commitDag');
    expect(commitTransition).toBeDefined();
    const commitResult = await commitTransition!.morphism({
      authorDid: 'did:key:z6MkStudioAgent',
      message: 'Optimize to GHZ state'
    });
    expect(commitResult.status).toBe('transitioned');
    expect(commitResult.commitHash).toBeDefined();

    // 6. Re-export and reload back into TikZiT
    const reExportedBytes = await retrievedBridge!.vfs.exportBinary('mcard');
    expect(reExportedBytes.length).toBeGreaterThan(0);
    await tikzitVfs.importBinary('mcard', reExportedBytes);
    await tikzitVcs.init();

    // 7. Verify TikZiT sees the studio commit with full Merkle ancestry
    const history = await tikzitVfs.getHandleHistory('zx:diagrams:bell-state');
    expect(history.length).toBe(2);
    expect(history[0].authorDid).toBe('did:key:z6MkStudioAgent');
    expect(history[0].message).toBe('Optimize to GHZ state');
    expect(history[1].authorDid).toBe('did:key:tikzit-user');
    expect(history[1].message).toBe('Initial Bell State');
  });
});
