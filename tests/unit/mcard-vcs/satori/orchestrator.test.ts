import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
import { VcsTurnOrchestrator } from '../../../../src/packages/mcard-vcs/satori/VcsTurnOrchestrator';
import { HypermediaRenderer } from '../../../../src/packages/mcard-vcs/satori/HypermediaRenderer';
import { PromptContinuation } from '../../../../src/packages/mcard-vcs/satori/PromptContinuation';

describe('Sprint 27: Conversational Turn Orchestration & Hypermedia', () => {
  let ctx: Context;
  let vfs: OperadicMCardVfs;
  let vcsEngine: MCardVcsEngine;
  let facade: ExplorerQueryFacade;
  let orchestrator: VcsTurnOrchestrator;
  let renderer: HypermediaRenderer;
  let continuation: PromptContinuation;

  beforeEach(async () => {
    ctx = new Context();
    const memBackend = new MemoryStorageVFS();
    await memBackend.init();
    vfs = new OperadicMCardVfs(memBackend);
    vcsEngine = new MCardVcsEngine(vfs);
    await vcsEngine.init();
    facade = new ExplorerQueryFacade(vfs, vcsEngine);

    const storageSvc = new MCardStorageService(ctx, vfs);
    const vcsSvc = new MCardVcsService(ctx, vcsEngine);
    const explorerSvc = new MCardExplorerService(ctx, facade);

    orchestrator = new VcsTurnOrchestrator(vcsSvc, explorerSvc);
    renderer = new HypermediaRenderer();
    continuation = new PromptContinuation();
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('27-DOD-09: processes full turn lifecycle for exploration and commit commands', async () => {
    // 1. Commit turn
    const commitTurn = await orchestrator.processTurn({
      command: 'commit',
      handle: 'diag:bell',
      payload: 'bell state tikz code',
      authorDid: 'did:key:alice',
      message: 'Add Bell state'
    });

    expect(commitTurn.status).toBe('committed');
    expect(commitTurn.satoriXml).toContain('<commit');
    expect(commitTurn.witnessHash?.startsWith('blake3:')).toBe(true);

    // 2. Explore turn
    const exploreTurn = await orchestrator.processTurn({
      command: 'explore',
      query: 'bell',
      authorDid: 'did:key:alice'
    });

    expect(exploreTurn.status).toBe('queried');
    expect(exploreTurn.satoriXml).toContain('<mcard-explorer');
    expect(exploreTurn.satoriXml).toContain('diag:bell');
  });

  it('27-DOD-10: produces explicit bail records on invalid turns without mutating state', async () => {
    const invalidTurn = await orchestrator.processTurn({
      command: 'commit',
      authorDid: 'did:key:alice'
      // missing message
    });

    expect(invalidTurn.status).toBe('rejected');
    expect(invalidTurn.satoriXml).toContain('<bail reason="Missing commit message" />');
    expect(invalidTurn.errorMessage).toBe('Missing commit message');
  });

  it('27-DOD-11: HypermediaRenderer formats diff HTML, DAG ASCII, and explorer viewlets', () => {
    // Diff HTML
    const diffHtml = renderer.renderDiffHtml({
      tag: 'diff-view',
      attrs: { handle: 'h1', base: 'b1', target: 't1', additions: 1, deletions: 1 },
      content: '+added line\n-deleted line'
    });
    expect(diffHtml).toContain('class="satori-diff-card"');
    expect(diffHtml).toContain('diff-add');
    expect(diffHtml).toContain('diff-del');

    // DAG ASCII
    const dagAscii = renderer.renderDagAscii({
      tag: 'version-dag',
      attrs: { handle: 'h1', headCommit: 'commit12345' },
      children: [
        {
          tag: 'commit',
          attrs: { id: 'c12345678', authorDid: 'alice', date: '', message: 'Initial' }
        }
      ]
    });
    expect(dagAscii).toContain('DAG for h1');
    expect(dagAscii).toContain('Initial');

    // Explorer HTML
    const explorerHtml = renderer.renderExplorerHtml({
      tag: 'mcard-explorer',
      attrs: { query: 'test' },
      children: [
        { tag: 'mcard-item', attrs: { handle: 'h1', hash: 'blake3:123' } }
      ]
    });
    expect(explorerHtml).toContain('class="satori-explorer-viewlet"');
    expect(explorerHtml).toContain('h1');
  });

  it('PromptContinuation resolves conversational continuations', () => {
    const conflictResult = {
      status: 'conflict' as const,
      satoriXml: '<merge-conflict count="1" />'
    };

    const resolved = continuation.resolveContinuation(conflictResult, 'use ours', 'did:key:alice');
    expect(resolved).toBeDefined();
    expect(resolved?.command).toBe('commit');
    expect(resolved?.message).toContain('ours strategy');
  });
});
