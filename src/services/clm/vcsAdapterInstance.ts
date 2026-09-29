/**
 * src/services/clm/vcsAdapterInstance.ts - Sprint 29
 * Subsystem singleton factory & VFS wiring.
 * Target: <= 140 LOC. Satisfies Contract D.
 */
import {
  OperadicMCardVfs,
  IndexedDbStorageVFS,
  MemoryStorageVFS,
  MCardVcsEngine,
  ExplorerQueryFacade,
  type StorageVFS
} from '../../packages/mcard-vcs';
import { ExplorerActionRegistry } from '../../packages/mcard-explorer';

let vfsInstance: OperadicMCardVfs | null = null;
let vcsInstance: MCardVcsEngine | null = null;
let facadeInstance: ExplorerQueryFacade | null = null;
let registryInstance: ExplorerActionRegistry | null = null;
let initPromise: Promise<void> | null = null;

export function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

export function createVfsBackend(): StorageVFS {
  if (isBrowserStorageAvailable()) {
    return new IndexedDbStorageVFS('tikzit-mcard-vfs');
  }
  return new MemoryStorageVFS();
}

export function getOperadicVfs(): OperadicMCardVfs {
  if (!vfsInstance) {
    vfsInstance = new OperadicMCardVfs(createVfsBackend());
  }
  return vfsInstance;
}

export function getVcsEngine(): MCardVcsEngine {
  if (!vcsInstance) {
    const vfs = getOperadicVfs();
    vcsInstance = new MCardVcsEngine(vfs);
  }
  return vcsInstance;
}

export function getExplorerQueryFacade(): ExplorerQueryFacade {
  if (!facadeInstance) {
    const vfs = getOperadicVfs();
    facadeInstance = new ExplorerQueryFacade(vfs);
  }
  return facadeInstance;
}

export function getExplorerActionRegistry(): ExplorerActionRegistry {
  if (!registryInstance) {
    registryInstance = new ExplorerActionRegistry();
  }
  return registryInstance;
}

export async function ensureVcsInitialized(): Promise<{
  vfs: OperadicMCardVfs;
  vcs: MCardVcsEngine;
  facade: ExplorerQueryFacade;
  registry: ExplorerActionRegistry;
}> {
  const vfs = getOperadicVfs();
  const vcs = getVcsEngine();
  const facade = getExplorerQueryFacade();
  const registry = getExplorerActionRegistry();

  if (!initPromise) {
    initPromise = (async () => {
      const backend = vfs.getVfs();
      if ('init' in backend && typeof (backend as any).init === 'function') {
        await (backend as any).init();
      }
      await vcs.init();
    })();
    // A rejected init would otherwise poison every future call — clear so retry works.
    initPromise.catch(() => { initPromise = null; });
  }
  await initPromise;
  return { vfs, vcs, facade, registry };
}

/**
 * Sprint 35 Phase C: one-way backfill of corpus diagram cards into the
 * sovereign VFS. Historical diagram commits were written only to the
 * mcardCollection pillar (DocumentCommitService's VFS writes were swallowed
 * pre-init), so the generic MCard view needs this sync to surface them.
 * Idempotent: handles already present in the VFS are skipped.
 */
export async function syncCorpusIntoVfs(
  entries: Array<{ handle: string }>,
  readText: (handle: string) => string | null,
  authorDid?: string
): Promise<number> {
  const { vfs } = await ensureVcsInitialized();
  let synced = 0;
  for (const entry of entries) {
    try {
      if (await vfs.has(entry.handle)) continue;
      const text = readText(entry.handle);
      if (text == null) continue;
      await vfs.set(entry.handle, text, {
        mimeType: 'text/x-tikz',
        authorDid: authorDid ?? 'did:key:interactive-user',
        universe: 'U0',
        category: 'diagram',
        companionMetadata: { syncedFrom: 'corpus' },
      });
      synced++;
    } catch { /* skip unreadable entries */ }
  }
  return synced;
}

export function resetVcsAdapterForTesting(): void {
  vfsInstance = null;
  vcsInstance = null;
  facadeInstance = null;
  registryInstance = null;
  initPromise = null;
}
