import { Context } from 'cordis';
import {
  TriDatabaseManager,
  MCardFileSystem,
  MCardCollection,
  AgentDid,
} from 'clm-kernel';
import { createWorkbenchStores, type WorkbenchStores } from '../stores/createWorkbenchStores';
import { createKernelContext } from './kernel';
import { initTriDatabase, DEFAULT_AUTHOR_DID } from './clm/triDbAdapter';
import { registerTikzTriad } from './clm/triadDefinition';
import { DocumentCommitService } from './clm/documentCommitService';
import { bindCordisToNanostores } from './nanostores-bridge';
import { createKeybindingDispatcher } from './keybindings';
import {
  CorpusExplorerService,
  type CorpusCommitResult,
  type CorpusManifestEntry,
  type OpenCorpusEntry,
} from './clm/corpusExplorerService';
import { CorpusPersistence, type CorpusSnapshot } from './clm/corpusPersistence';
import { CorpusExportService, type CorpusSaveEnvironment, type CorpusSaveResult } from './clm/corpusExportService';
import { defaultWorkspaceManager } from './workspace/WorkspaceManager';
import type { SqlJsTriDatabaseRuntime } from './clm/sqliteRuntime';

interface RuntimeBootstrap {
  storage: SqlJsTriDatabaseRuntime;
  persistence: CorpusPersistence;
  snapshot: CorpusSnapshot | null;
  manifest: CorpusManifestEntry[];
  fetcher: typeof fetch;
  getHistoryRows(): Array<{ handle: string; previous_hash: string; changed_at: string }>;
  flush(): Promise<void>;
}

export interface WorkbenchRuntimeOptions {
  id?: string;
  authorDid?: string;
  bindKeybindings?: boolean;
}

export interface WorkbenchRuntimeStartupOptions extends WorkbenchRuntimeOptions {
  temporarySession?: boolean;
}

export interface WorkbenchRuntime {
  readonly id: string;
  readonly ctx: Context;
  readonly stores: WorkbenchStores;
  readonly triDb: TriDatabaseManager;
  readonly mcardFs: MCardFileSystem;
  readonly mcardCollection: MCardCollection;
  readonly corpusExplorer: CorpusExplorerService;
  readonly authorDid: AgentDid;
  readonly isDisposed: boolean;
  openCorpusEntry(handle: string): OpenCorpusEntry;
  saveActiveCorpusEntry(sourceText?: string): Promise<CorpusCommitResult | null>;
  saveCorpusDb(environment?: CorpusSaveEnvironment): Promise<CorpusSaveResult>;
  dispose(): void;
  disposeAsync(): Promise<void>;
}

/**
 * Instantiates a fully hermetic, isolated Workbench Runtime instance.
 * Houses its own Cordis Service Mesh, Nanostores projections, CLM TriDatabase,
 * and command dispatchers with zero module-level cross-contamination.
 */
export function createWorkbenchRuntime(options: WorkbenchRuntimeOptions = {}): WorkbenchRuntime {
  return buildWorkbenchRuntime(options);
}

export async function createWorkbenchRuntimeAsync(options: WorkbenchRuntimeStartupOptions = {}): Promise<WorkbenchRuntime> {
  if (typeof window === 'undefined') throw new Error('Workbench runtime can only start in a browser');
  const temporarySession = options.temporarySession === true;
  const persistence = new CorpusPersistence({ indexedDB: temporarySession ? null : window.indexedDB });
  let snapshot: CorpusSnapshot | null = null;
  try {
    await persistence.open();
    if (!temporarySession) snapshot = await persistence.readSnapshot();
  } catch (error) {
    await persistence.close();
    throw error;
  }
  const { createSqlJsTriDatabase } = await import('./clm/sqliteRuntime');
  let storage: SqlJsTriDatabaseRuntime;
  try {
    storage = await createSqlJsTriDatabase(snapshot);
  } catch (error) {
    await persistence.close();
    throw error;
  }
  let runtime: WorkbenchRuntime | undefined;
  try {
    const baseUrl = (import.meta.env?.BASE_URL as string | undefined) ?? '/';
    const response = await fetch(`${baseUrl}docs/examples/manifest.json`);
    if (!response.ok) throw new Error(`Corpus manifest request failed: HTTP ${response.status}`);
    const manifest = await response.json() as CorpusManifestEntry[];
    if (!Array.isArray(manifest) || manifest.length !== 12) throw new Error('Corpus manifest must contain exactly 12 examples');
    for (const entry of manifest) {
      if (
        !entry ||
        typeof entry.id !== 'string' ||
        typeof entry.tikz_file !== 'string' ||
        typeof entry.tikz_bytes !== 'number' ||
        !/^[0-9a-f]{64}$/i.test(entry.tikz_sha256)
      ) throw new Error('Corpus manifest entry is malformed');
    }
    const flush = async () => {
      if (persistence.state !== 'persistent') throw new Error(persistence.error ?? 'Persistent storage is unavailable');
      const [knowledge, executionLog, mcard] = storage.backends as [
        { exportBinary(): Uint8Array | undefined },
        { exportBinary(): Uint8Array | undefined },
        { exportBinary(): Uint8Array | undefined },
      ];
      const pillars = {
        knowledge: knowledge.exportBinary(),
        executionLog: executionLog.exportBinary(),
        mcard: mcard.exportBinary(),
      };
      if (!pillars.knowledge || !pillars.executionLog || !pillars.mcard) throw new Error('Could not serialize all CLM pillars');
      await persistence.writeSnapshot({
        generation: snapshot?.generation ?? 0,
        pillars: {
          knowledge: new Uint8Array(pillars.knowledge),
          executionLog: new Uint8Array(pillars.executionLog),
          mcard: new Uint8Array(pillars.mcard),
        },
        corpusIndex: runtime?.corpusExplorer.getCorpusIndex() ?? snapshot?.corpusIndex ?? [],
      });
      if (runtime) {
        const view = runtime.stores.$corpusView.get();
        runtime.stores.$corpusView.set({ ...view, persistence: 'persistent', persistenceError: undefined });
      }
    };
    const getHistoryRows = () => storage.databases[2].exec(
      'SELECT handle, previous_hash, changed_at FROM handle_history ORDER BY id ASC',
    )[0]?.values.map(([handle, previousHash, changedAt]) => ({
      handle: String(handle),
      previous_hash: String(previousHash),
      changed_at: String(changedAt),
    })) ?? [];
    runtime = buildWorkbenchRuntime(options, {
      storage,
      persistence,
      snapshot,
      manifest,
      fetcher: (url) => fetch(url),
      getHistoryRows,
      flush,
    });
    const seeded = await runtime.corpusExplorer.seedZxCorpus();
    runtime.stores.$corpusEntries.set(runtime.corpusExplorer.listCorpusEntries().entries);
    let persistenceError = persistence.error;
    try {
      await runtime.corpusExplorer.flush();
    } catch (error) {
      persistenceError = error instanceof Error ? error.message : String(error);
    }
    runtime.stores.$corpusView.set({
      status: 'ready',
      persistence: persistence.state === 'persistent' && !persistenceError ? 'persistent' : 'non-persistent',
      persistenceError,
      seedFailures: seeded.failures,
    });
    return runtime;
  } catch (error) {
    if (runtime) {
      try {
        await runtime.disposeAsync();
      } catch {
        await persistence.close();
      }
    } else {
      storage.close();
      await persistence.close();
    }
    throw error;
  }
}

function buildWorkbenchRuntime(options: WorkbenchRuntimeOptions = {}, bootstrap?: RuntimeBootstrap): WorkbenchRuntime {
  const id = options.id ?? `runtime_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const authorDidStr = options.authorDid ?? DEFAULT_AUTHOR_DID;

  // 1. Create isolated Nanostores projection stores
  const stores = createWorkbenchStores();

  // 2. Create isolated Cordis micro-kernel context
  const ctx = createKernelContext();

  // 3. Initialize in-memory CLM TriDatabase and register Layer 2 & Layer 0 in Cordis
  const clmBridge = initTriDatabase(ctx, authorDidStr, bootstrap?.storage.triDb);
  const { triDb, mcardFs, mcardCollection, authorDid } = clmBridge;

  // 4. Register Triad definition into knowledge pillar
  registerTikzTriad(triDb, authorDid);

  // 5. Register DocumentCommitService into Cordis
  new DocumentCommitService(ctx, triDb, mcardCollection, authorDid);
  const flush = bootstrap?.flush ?? (async () => undefined);
  const corpusExplorer = new CorpusExplorerService(ctx, {
    collection: mcardCollection,
    commitService: ctx.documentCommit,
    persistence: { flush },
    authorDid,
    manifest: bootstrap?.manifest,
    initialIndex: bootstrap?.snapshot?.corpusIndex,
    fetcher: bootstrap?.fetcher,
  });
  const corpusExport = new CorpusExportService({
    triDb,
    collection: mcardCollection,
    authorDid,
    getIndex: () => corpusExplorer.getCorpusIndex(),
    getHistoryRows: bootstrap?.getHistoryRows,
    flush,
  });
  if (!bootstrap) {
    stores.$corpusView.set({ status: 'ready', persistence: 'non-persistent', seedFailures: [] });
  }

  const disposers: Array<() => void> = [];
  if (bootstrap && typeof window !== 'undefined') {
    const onPageHide = () => void corpusExplorer.flush().catch(() => undefined);
    window.addEventListener('pagehide', onPageHide);
    disposers.push(() => window.removeEventListener('pagehide', onPageHide));
  }

  // 6. Bind Cordis events to Nanostores read-only projections
  const unbindBridge = bindCordisToNanostores(ctx, stores);
  disposers.push(unbindBridge);

  // Clear corpus-specific projections when a non-corpus document becomes active,
  // so a stale handle/CID never lingers after switching documents.
  disposers.push(defaultWorkspaceManager.subscribe(() => {
    const active = defaultWorkspaceManager.getActiveDocument();
    if (!active || active.id.startsWith('zx:examples:')) return;
    const head = stores.$documentHead.get();
    if (head.hash || head.handle) {
      stores.$documentHead.set({ handle: '', hash: '', sequence: 0, isValid: true });
    }
    const diagram = stores.$activeDiagram.get();
    if (diagram.handle !== active.id || diagram.name !== active.title) {
      stores.$activeDiagram.set({ name: active.title, handle: active.id });
    }
  }));

  // 7. Register core workbench command handlers
  disposers.push(
    ctx.command.register('cmd:view:sidebar', () => {
      const current = stores.$workbenchLayout.get().isDrawerCollapsed;
      stores.$workbenchLayout.setKey('isDrawerCollapsed', !current);
    })
  );

  disposers.push(
    ctx.command.register('cmd:dock:depress', () => {
      stores.$workbenchLayout.setKey('isWorkbenchDepressed', true);
    })
  );

  disposers.push(
    ctx.command.register('cmd:dock:restore', () => {
      stores.$workbenchLayout.setKey('isWorkbenchDepressed', false);
    })
  );

  disposers.push(
    ctx.command.register('cmd:edit:delete', () => {
      const sel = stores.$selectedElements.get();
      if (sel.nodes.length > 0 || sel.edges.length > 0) {
        const graph = stores.$graphAST.get();
        const nodeSet = new Set(sel.nodes);
        const edgeSet = new Set(sel.edges);
        const newNodes = graph.nodes.filter((n) => !nodeSet.has(n.id));
        const newEdges = graph.edges.filter(
          (ed) => !edgeSet.has(ed.id) && !nodeSet.has(ed.sourceId) && !nodeSet.has(ed.targetId)
        );
        ctx.selection.clearSelection();
        ctx.graph.setAST({ ...graph, nodes: newNodes, edges: newEdges });
      }
    })
  );

  disposers.push(
    ctx.command.register('cmd:view:toggle-theme', () => {
      const current = stores.$theme.get();
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      stores.$theme.set(nextTheme);
      if (typeof document !== 'undefined') {
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
        try {
          localStorage.setItem('tikzit:theme', nextTheme);
        } catch (e) {
          // Ignore
        }
      }
    })
  );

  // 8. Conditionally attach window keybindings dispatcher
  if (options.bindKeybindings !== false && typeof window !== 'undefined') {
    const cleanupKeybindings = createKeybindingDispatcher(ctx, window);
    disposers.push(cleanupKeybindings);
  }

  let isDisposed = false;
  let disposePromise: Promise<void> | undefined;
  const disposeBindings = () => {
    if (isDisposed) return;
    isDisposed = true;
    disposers.forEach((dispose) => {
      try {
        dispose();
      } catch (err) {
        console.warn('Error during runtime disposal:', err);
      }
    });
    disposers.length = 0;
  };
  const runtime: WorkbenchRuntime = {
    id,
    ctx,
    stores,
    triDb,
    mcardFs,
    mcardCollection,
    corpusExplorer,
    authorDid,
    get isDisposed() {
      return isDisposed;
    },
    openCorpusEntry(handle) {
      const opened = corpusExplorer.openEntry(handle);
      const existing = defaultWorkspaceManager.getOpenDocuments().find((document) => document.id === handle);
      if (existing?.isDirty) {
        defaultWorkspaceManager.setActiveDocument(handle);
        ctx.graph.setAST(existing.ast ?? opened.ast);
      } else {
        defaultWorkspaceManager.openDocument({
          id: handle,
          title: opened.entry.title,
          content: opened.source,
          ast: opened.ast,
          hash: opened.entry.hash,
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: opened.entry.updatedAt,
          version: opened.sequence + 1,
          isDirty: false,
        });
        ctx.graph.setAST(opened.ast);
      }
      stores.$activeDiagram.set({ name: opened.entry.title, handle });
      stores.$documentHead.set({
        handle,
        hash: opened.entry.hash,
        sequence: opened.sequence,
        isValid: true,
        lastCommittedAt: opened.entry.updatedAt,
      });
      stores.$corpusEntries.set(corpusExplorer.listCorpusEntries().entries);
      return opened;
    },
    async saveActiveCorpusEntry(sourceText) {
      const active = defaultWorkspaceManager.getActiveDocument();
      if (!active || !active.id.startsWith('zx:examples:')) return null;
      const result = await corpusExplorer.commitCorpusDocument({ handle: active.id, sourceText: sourceText ?? active.content });
      if (result.success && result.unchanged) {
        // A dirty buffer that matches the committed head still saves cleanly.
        defaultWorkspaceManager.markClean(active.id);
      } else if (result.success && result.hash) {
        defaultWorkspaceManager.markCommitted(active.id, result.hash, result.sequence ?? active.version, result.ast);
      }
      if (!result.persisted) {
        const view = stores.$corpusView.get();
        stores.$corpusView.set({
          ...view,
          persistence: 'non-persistent',
          persistenceError: result.persistenceError ?? 'Committed, not persisted',
        });
      }
      stores.$corpusEntries.set(corpusExplorer.listCorpusEntries().entries);
      return result;
    },
    async saveCorpusDb(environment) {
      const result = await corpusExport.saveCorpusDb(environment);
      if (!result.persisted) {
        const view = stores.$corpusView.get();
        stores.$corpusView.set({
          ...view,
          persistence: 'non-persistent',
          persistenceError: result.persistenceError ?? 'Export receipt was not persisted',
        });
      }
      return result;
    },
    dispose() {
      if (bootstrap) {
        void runtime.disposeAsync().catch(() => undefined);
        return;
      }
      disposeBindings();
    },
    disposeAsync() {
      if (!disposePromise) {
        disposePromise = (async () => {
          try {
            await corpusExplorer.flush();
          } finally {
            disposeBindings();
            bootstrap?.storage.close();
            await bootstrap?.persistence.close();
          }
        })();
      }
      return disposePromise;
    },
  };

  return runtime;
}
