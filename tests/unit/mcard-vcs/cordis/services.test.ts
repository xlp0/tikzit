import { describe, it, expect, beforeEach } from 'vitest';
import { Context } from 'cordis';
import { OperadicMCardVfs } from '../../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';
import { MCardVcsEngine } from '../../../../src/packages/mcard-vcs/vcs/MCardVcsEngine';
import { ExplorerQueryFacade } from '../../../../src/packages/mcard-vcs/explorer/ExplorerQueryFacade';
import {
  MCardStorageService,
  MCardVcsService,
  MCardExplorerService
} from '../../../../src/packages/mcard-vcs/cordis/services';
import { validateCoeffects, assertCoeffects } from '../../../../src/packages/mcard-vcs/cordis/coeffects';

describe('Sprint 27: Cordis Service Inversion & Coeffects', () => {
  let ctx: Context;
  let vfs: OperadicMCardVfs;
  let vcsEngine: MCardVcsEngine;
  let facade: ExplorerQueryFacade;

  beforeEach(async () => {
    ctx = new Context();
    const memBackend = new MemoryStorageVFS();
    await memBackend.init();
    vfs = new OperadicMCardVfs(memBackend);
    vcsEngine = new MCardVcsEngine(vfs);
    await vcsEngine.init();
    facade = new ExplorerQueryFacade(vfs, vcsEngine);
  });

  afterEach(async () => {
    try { await vfs.close(); } catch {}
  });

  it('27-DOD-01 & 27-DOD-13: Bare-Context mount test with zero host prerequisites', async () => {
    // Mount all three services on a fresh bare new Context()
    new MCardStorageService(ctx, vfs);
    new MCardVcsService(ctx, vcsEngine);
    new MCardExplorerService(ctx, facade);

    expect(ctx['mcard.storage']).toBeInstanceOf(MCardStorageService);
    expect(ctx['mcard.vcs']).toBeInstanceOf(MCardVcsService);
    expect(ctx['mcard.explorer']).toBeInstanceOf(MCardExplorerService);

    // Complete smoke cycle: set -> get -> query -> history
    await ctx['mcard.storage'].vfs.set('bare:test', 'hello bare context', { mimeType: 'text/plain' });
    const card = await ctx['mcard.storage'].vfs.get('bare:test');
    expect(card?.text).toBe('hello bare context');

    const handles = await ctx['mcard.explorer'].listHandles('bare:');
    expect(handles).toContain('bare:test');

    const searchRes = await ctx['mcard.explorer'].query({ pattern: 'bare' });
    expect(searchRes.length).toBe(1);

    await ctx['mcard.storage'].close();
  });

  it('27-DOD-06: validates coeffects and required service presence', () => {
    const check1 = validateCoeffects(ctx, ['mcard.storage', 'mcard.vcs']);
    expect(check1.valid).toBe(false);
    expect(check1.missing).toContain('mcard.storage');
    expect(check1.missing).toContain('mcard.vcs');

    new MCardStorageService(ctx, vfs);
    const check2 = validateCoeffects(ctx, ['mcard.storage']);
    expect(check2.valid).toBe(true);
    expect(check2.missing.length).toBe(0);

    expect(() => assertCoeffects(ctx, ['mcard.storage'])).not.toThrow();
    expect(() => assertCoeffects(ctx, ['mcard.vcs'])).toThrow(/missing required services/);
  });
});
