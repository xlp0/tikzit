/**
 * MCard VCS Plugin Manifest for PTR Microkernel
 *
 * Implements createMCardVcsPlugin producing a valid PtrPluginDefinition.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { Context } from 'cordis';
import type { PtrPluginDefinition, PtrTransitionDefinition } from './types';
import { MCardStorageService, MCardVcsService, MCardExplorerService } from '../cordis/services';
import { OperadicMCardVfs } from '../storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../storage/vfs/MemoryStorageVFS';
import { MCardVcsEngine } from '../vcs/MCardVcsEngine';
import { ExplorerQueryFacade } from '../explorer/ExplorerQueryFacade';
import { SatoriXmlCodec } from '../satori/SatoriXmlCodec';

async function ensureInitialized(rootCtx: Context): Promise<void> {
  if (!(rootCtx as any)['mcard.storage']) {
    const mem = new MemoryStorageVFS();
    await mem.init();
    const vfs = new OperadicMCardVfs(mem);
    new MCardStorageService(rootCtx, vfs);
  }

  if (!(rootCtx as any)['mcard.vcs']) {
    const storage = (rootCtx as any)['mcard.storage'] as MCardStorageService;
    const vcs = new MCardVcsEngine(storage.vfs);
    await vcs.init();
    new MCardVcsService(rootCtx, vcs);
  }

  if (!(rootCtx as any)['mcard.explorer']) {
    const storage = (rootCtx as any)['mcard.storage'] as MCardStorageService;
    const vcs = (rootCtx as any)['mcard.vcs'] as MCardVcsService;
    const facade = new ExplorerQueryFacade(storage.vfs, vcs.vcs);
    new MCardExplorerService(rootCtx, facade);
  }
}

export function createMCardVcsPlugin(rootCtx: Context): PtrPluginDefinition {
  const transitions: PtrTransitionDefinition[] = [
    {
      name: 'vcs:stageCard',
      inputSchema: 'urn:clm:schema:StageCardInput',
      outputSchema: 'urn:clm:schema:StageCardOutput',
      morphism: async (input: { handle: string; payload: string | Uint8Array; mimeType?: string }) => {
        await ensureInitialized(rootCtx);
        const vcs = (rootCtx as any)['mcard.vcs'] as MCardVcsService;
        return await vcs.vcs.step({
          type: 'stage',
          handle: input.handle,
          payload: input.payload,
          mimeType: input.mimeType
        });
      }
    },
    {
      name: 'vcs:commitDag',
      inputSchema: 'urn:clm:schema:CommitDagInput',
      outputSchema: 'urn:clm:schema:CommitDagOutput',
      morphism: async (input: { authorDid: string; message: string; branchRef?: string }) => {
        await ensureInitialized(rootCtx);
        const vcs = (rootCtx as any)['mcard.vcs'] as MCardVcsService;
        return await vcs.vcs.step({
          type: 'commit',
          authorDid: input.authorDid,
          message: input.message,
          branchRef: input.branchRef
        });
      }
    },
    {
      name: 'vcs:mergeBranch',
      inputSchema: 'urn:clm:schema:MergeBranchInput',
      outputSchema: 'urn:clm:schema:MergeBranchOutput',
      morphism: async (input: { baseRef: string; incomingRef: string; authorDid: string }) => {
        await ensureInitialized(rootCtx);
        const vcs = (rootCtx as any)['mcard.vcs'] as MCardVcsService;
        return await vcs.vcs.step({
          type: 'merge',
          baseRef: input.baseRef,
          incomingRef: input.incomingRef,
          authorDid: input.authorDid
        });
      }
    },
    {
      name: 'explorer:query',
      inputSchema: 'urn:clm:schema:ExplorerQueryInput',
      outputSchema: 'urn:clm:schema:ExplorerQueryOutput',
      morphism: async (input: { query?: string; facet?: string; limit?: number }) => {
        await ensureInitialized(rootCtx);
        const explorer = (rootCtx as any)['mcard.explorer'] as MCardExplorerService;
        return await explorer.query({
          pattern: input.query,
          limit: input.limit
        });
      }
    },
    {
      name: 'vcs:renderSatori',
      inputSchema: 'urn:clm:schema:RenderSatoriInput',
      outputSchema: 'urn:clm:schema:RenderSatoriOutput',
      morphism: async (input: { handle: string }) => {
        await ensureInitialized(rootCtx);
        const vcs = (rootCtx as any)['mcard.vcs'] as MCardVcsService;
        const history = await vcs.vcs.getMCardHashHistory(input.handle);
        const commits = history.map((h, i) => ({
          hash: h.hash,
          parentHashes: i < history.length - 1 ? [history[i + 1].hash] : [],
          message: h.message || 'Commit ' + h.hash.slice(0, 7),
          authorDid: h.authorDid || 'did:key:unknown',
          timestamp: h.changedAt
        }));
        const codec = new SatoriXmlCodec();
        return codec.serializeVersionDag({
          tag: 'version-dag',
          attrs: {
            handle: input.handle,
            headCommit: history[0]?.hash || '',
            branch: 'refs/heads/main'
          },
          children: commits.map(c => ({
            tag: 'commit',
            attrs: {
              id: c.hash,
              authorDid: c.authorDid,
              date: c.timestamp,
              message: c.message,
              parent: c.parentHashes[0]
            }
          }))
        });
      }
    }
  ];

  return {
    id: 'clm:plugin:mcard-vcs',
    name: 'Operadic MCard Virtual File System, Merkle VCS & Explorer',
    version: '1.0.0',
    description: 'Provides DOTS lens storage, Merkle DAG versioning, 3-way merge, Satori codecs, and reusable Explorer.',
    places: [
      'p_vcs_idle',
      'p_mcard_staged',
      'p_merkle_verified',
      'p_commit_sealed',
      'p_explorer_ready'
    ],
    transitions,
    coeffects: [
      'identity.did',
      'mcard.storage',
      'mcard.explorer'
    ],
    enabled: true
  };
}
