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
import {
  DocumentCommitService,
  type DocumentHistoryResult,
  type RestoreVersionOptions,
  type RestoreVersionResult,
} from './clm/documentCommitService';
import { bindCordisToNanostores } from './nanostores-bridge';
import { createKeybindingDispatcher } from './keybindings';
import {
  CorpusExplorerService,
  type CorpusCommitResult,
  type CorpusManifestEntry,
  type OpenCorpusEntry,
} from './clm/corpusExplorerService';
import { CorpusPersistence, isDiagramHandle, type CorpusSnapshot } from './clm/corpusPersistence';
import { CorpusExportService, type CorpusSaveEnvironment, type CorpusSaveResult } from './clm/corpusExportService';
import { defaultWorkspaceManager, type DocumentRecord } from './workspace/WorkspaceManager';
import { defaultTransactionManager } from '../core/history/TransactionManager';
import { safeParse } from '../core/parser/parser';
import { emitTikz } from '../core/parser/emitter';
import type { SqlJsTriDatabaseRuntime } from './clm/sqliteRuntime';
import { ImageExporter } from './export/ImageExporter';
import { PdfExporter } from './export/PdfExporter';
import { saveArtifact, type SaveArtifactResult, type SaveArtifactEnvironment } from './export/saveArtifact';
import { sanitizeFilename, defaultFilenameCollisionTracker } from './export/exportNaming';

export interface ExportDiagramOptions {
  handle: string;
  format: 'tikz' | 'tex' | 'svg' | 'png' | 'pdf';
  sourceKind: 'current' | 'saved';
  pngScale?: 1 | 2 | 4;
  environment?: SaveArtifactEnvironment;
}

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

import { runLegacyImport } from './clm/legacyImportService';

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
  createDiagram(title?: string): { handle: string; document: DocumentRecord };
  openCorpusEntry(handle: string): OpenCorpusEntry;
  saveActiveCorpusEntry(sourceText?: string, message?: string): Promise<CorpusCommitResult | null>;
  saveDiagram(handle: string, options?: { message?: string; sourceText?: string }): Promise<CorpusCommitResult>;
  dismissDraftCallout(handle: string): void;
  isDraftCalloutDismissed(handle: string): boolean;
  retryFlush(): Promise<boolean>;
  saveCorpusDb(environment?: CorpusSaveEnvironment): Promise<CorpusSaveResult>;
  renameDiagram(handle: string, newTitle: string): Promise<{ success: boolean; error?: string }>;
  archiveDiagram(handle: string, archived?: boolean): Promise<{ success: boolean; error?: string }>;
  duplicateDiagram(handle: string, newTitle?: string): Promise<{ success: boolean; newHandle?: string; error?: string }>;
  documentHistory(handle: string): DocumentHistoryResult;
  restoreVersion(options: RestoreVersionOptions): Promise<RestoreVersionResult>;
  discardAllRecovered(): void;
  openExportDialog(handle?: string): void;
  closeExportDialog(): void;
  exportDiagramArtifact(options: ExportDiagramOptions): Promise<SaveArtifactResult>;
  openExportCollectionDialog(): Promise<void>;
  closeExportCollectionDialog(): void;
  exportCollectionArtifact(environment?: CorpusSaveEnvironment): Promise<CorpusSaveResult>;
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
    const getHistoryRows = () => {
      const mcardDb = storage.pillarDatabases?.mcard ?? storage.databases[2];
      if (!mcardDb) throw new Error('MCard database schema invalid: missing mcard pillar');
      const tableCheck = mcardDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='handle_history'");
      if (!tableCheck.length || !tableCheck[0].values.length) {
        throw new Error('MCard database schema invalid: missing handle_history table');
      }
      return (mcardDb.exec(
        'SELECT handle, previous_hash, changed_at FROM handle_history ORDER BY id ASC',
      )[0]?.values as Array<[unknown, unknown, unknown]> | undefined)?.map(([handle, previousHash, changedAt]) => ({
        handle: String(handle),
        previous_hash: String(previousHash),
        changed_at: String(changedAt),
      })) ?? [];
    };
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

    // 1. Run legacy import idempotently
    const legacyResult = await runLegacyImport({
      corpusExplorer: runtime.corpusExplorer,
      authorDid: runtime.authorDid,
      workspaceManager: defaultWorkspaceManager,
    });

    // 2. Restore workspace session state & dirty buffers
    const sessionRecovery = defaultWorkspaceManager.restoreSessionState({
      resolveHeadContent: (handle) => {
        try {
          const hash = runtime!.mcardCollection.resolveHandle(handle);
          if (!hash) return null;
          const card = runtime!.mcardCollection.get(hash);
          return card && card.payload.kind === 'text' ? card.payload.value : null;
        } catch {
          return null;
        }
      },
    });

    let announcement = '';
    if (sessionRecovery.recoveredCount > 0) {
      announcement += `Recovered unsaved edits in ${sessionRecovery.recoveredCount} diagram${sessionRecovery.recoveredCount > 1 ? 's' : ''}.`;
    }
    if (legacyResult.importedCount > 0) {
      announcement += (announcement ? ' ' : '') + `Imported ${legacyResult.importedCount} legacy diagram${legacyResult.importedCount > 1 ? 's' : ''}.`;
    }
    runtime.stores.$sessionRecovery.set({
      recoveredCount: sessionRecovery.recoveredCount,
      dirtyHandles: sessionRecovery.dirtyHandles,
      announcement,
      showArchived: false,
    });

    runtime.stores.$corpusEntries.set(runtime.corpusExplorer.listCorpusEntries().entries);

    const activeDoc = defaultWorkspaceManager.getActiveDocument();
    if (activeDoc) {
      runtime.stores.$activeDiagram.set({ name: activeDoc.title, handle: activeDoc.id });
      const parsed = safeParse(activeDoc.content);
      if (parsed.success && parsed.ast) {
        runtime.ctx.graph.setAST(parsed.ast);
      }
    }

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
  const historyDb = bootstrap?.storage && 'pillarDatabases' in bootstrap.storage
    ? bootstrap.storage.pillarDatabases?.mcard
    : (bootstrap?.storage?.databases ? bootstrap.storage.databases[2] : undefined);
  new DocumentCommitService(ctx, triDb, mcardCollection, authorDid, { historyDb });
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
    if (!active || isDiagramHandle(active.id)) return;
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
        const nextAst = { ...graph, nodes: newNodes, edges: newEdges };
        const active = defaultWorkspaceManager.getActiveDocument();
        if (active) {
          defaultWorkspaceManager.updateContent(active.id, emitTikz(nextAst), nextAst);
        }
        ctx.graph.setAST(nextAst);
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

  let untitledCount = 0;

  // 8. Conditionally attach window keybindings dispatcher
  if (options.bindKeybindings !== false && typeof window !== 'undefined') {
    const cleanupKeybindings = createKeybindingDispatcher(ctx, window);
    disposers.push(cleanupKeybindings);
  }

  let isDisposed = false;
  let disposePromise: Promise<void> | undefined;
  const inFlightSaves = new Map<string, { promise: Promise<CorpusCommitResult>; options?: { message?: string; sourceText?: string }; source: string }>();
  const dismissedDraftCallouts = new Set<string>();

  const disposeBindings = () => {
    if (isDisposed) return;
    isDisposed = true;
    inFlightSaves.clear();
    dismissedDraftCallouts.clear();
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
    createDiagram(title?: string) {
      untitledCount++;
      const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const handle = `zx:diagrams:${uuid}`;
      const diagramTitle = title ?? `Untitled diagram ${untitledCount}`;
      const initialSource = '\\begin{tikzpicture}\n\\end{tikzpicture}\n';
      const parsed = safeParse(initialSource);
      const emptyAst = parsed.ast ?? { nodes: [], edges: [], paths: [], data: [] };
      const document: DocumentRecord = {
        id: handle,
        title: diagramTitle,
        content: initialSource,
        ast: emptyAst,
        hash: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 0,
        isDirty: true,
        isDraft: true,
      };
      defaultWorkspaceManager.openDocument(document);
      defaultWorkspaceManager.setActiveDocument(handle);
      ctx.graph.setAST(emptyAst);
      stores.$activeDiagram.set({ name: diagramTitle, handle });
      stores.$documentHead.set({
        handle,
        hash: '',
        sequence: 0,
        isValid: true,
        lastCommittedAt: 0,
      });
      return { handle, document };
    },
    openCorpusEntry(handle) {
      const opened = corpusExplorer.openEntry(handle);
      const existing = defaultWorkspaceManager.getOpenDocuments().find((document) => document.id === handle);
      if (existing?.isDirty) {
        defaultWorkspaceManager.setActiveDocument(handle);
        const parsed = safeParse(existing.content);
        if (parsed.success && parsed.ast) {
          existing.ast = parsed.ast;
          ctx.graph.setAST(parsed.ast);
        } else if (existing.ast) {
          ctx.graph.setAST(existing.ast);
          if (parsed.errors) {
            ctx.emit('tikzit/diagnostics:emit', parsed.errors);
          }
        }
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
    async saveDiagram(handle, options) {
      if (!isDiagramHandle(handle)) {
        return { success: false, reason: `Not a corpus handle: ${handle}`, persisted: false, receiptHash: '' };
      }
      const view = stores.$corpusView.get();
      if (view.persistence === 'stale' || view.persistence === 'recovery-required') {
        return {
          success: false,
          reason: `Persistence is ${view.persistence}`,
          persisted: false,
          receiptHash: '',
        };
      }
      const targetDoc = defaultWorkspaceManager.getOpenDocuments().find((d) => d.id === handle) ??
        (defaultWorkspaceManager.getActiveDocument()?.id === handle ? defaultWorkspaceManager.getActiveDocument() : undefined);
      if (!targetDoc) {
        return { success: false, reason: `Document not open: ${handle}`, persisted: false, receiptHash: '' };
      }

      const targetText = options?.sourceText ?? targetDoc.content;

      // Single-flight deduplication / mutual exclusion guard
      const existingInFlight = inFlightSaves.get(handle);
      if (existingInFlight) {
        if (existingInFlight.source === targetText && existingInFlight.options?.message === options?.message) {
          return existingInFlight.promise;
        }
        return {
          success: false,
          reason: 'Save operation already in progress for this document',
          persisted: false,
          receiptHash: '',
        };
      }

      const opId = `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      stores.$diagramSaveState.setKey(handle, {
        isSaving: true,
        operationId: opId,
      });

      const promise = (async (): Promise<CorpusCommitResult> => {
        try {
          const result = await corpusExplorer.commitCorpusDocument({
            handle,
            sourceText: targetText,
            title: targetDoc.title,
            message: options?.message?.trim() || undefined,
          });

          // Check if workspace buffer still matches the committed snapshot
          const currentDoc = defaultWorkspaceManager.getOpenDocuments().find((d) => d.id === handle);
          const stillMatches = currentDoc?.content === targetText;

          if (result.success && result.unchanged) {
            if (stillMatches) {
              defaultWorkspaceManager.markClean(handle);
              if (defaultWorkspaceManager.getActiveDocument()?.id === handle) {
                defaultTransactionManager.markClean();
              }
            }
          } else if (result.success && result.hash) {
            if (stillMatches) {
              defaultWorkspaceManager.markCommitted(handle, result.hash, result.sequence ?? targetDoc.version, result.ast);
              if (defaultWorkspaceManager.getActiveDocument()?.id === handle) {
                defaultTransactionManager.markClean();
              }
            } else if (currentDoc) {
              // Mark committed with new head hash/version, but keep dirty flag because newer edits arrived
              defaultWorkspaceManager.markCommitted(handle, result.hash, result.sequence ?? targetDoc.version, undefined, true);
            }
          }

          if (result.success && result.persisted) {
            ctx.emit('tikzit/document:persisted', {
              handle,
              hash: result.hash ?? targetDoc.hash,
            });
          }

          if (!result.persisted) {
            const currentView = stores.$corpusView.get();
            if (currentView.persistence !== 'stale' && currentView.persistence !== 'recovery-required') {
              stores.$corpusView.set({
                ...currentView,
                persistence: 'non-persistent',
                persistenceError: result.persistenceError ?? 'Committed, not persisted',
              });
            }
          } else if (result.success) {
            const currentView = stores.$corpusView.get();
            if (currentView.persistenceError) {
              stores.$corpusView.set({
                ...currentView,
                persistence: 'persistent',
                persistenceError: undefined,
              });
            }
          }

          const activeNow = defaultWorkspaceManager.getActiveDocument();
          if (activeNow?.id === handle && result.success && result.hash) {
            stores.$documentHead.set({
              handle,
              hash: result.hash,
              sequence: result.sequence ?? targetDoc.version,
              isValid: true,
              lastCommittedAt: Date.now(),
              lastPersistedAt: result.persisted ? Date.now() : undefined,
            });
            stores.$activeDiagram.set({ name: targetDoc.title, handle });
          }

          stores.$corpusEntries.set(corpusExplorer.listCorpusEntries().entries);

          stores.$diagramSaveState.setKey(handle, {
            isSaving: false,
            lastResult: result,
            error: result.success ? undefined : result.reason,
            operationId: opId,
          });

          return result;
        } catch (err: any) {
          const errResult: CorpusCommitResult = {
            success: false,
            reason: err?.message || String(err),
            persisted: false,
            receiptHash: '',
          };
          stores.$diagramSaveState.setKey(handle, {
            isSaving: false,
            lastResult: errResult,
            error: errResult.reason,
            operationId: opId,
          });
          return errResult;
        } finally {
          inFlightSaves.delete(handle);
        }
      })();

      inFlightSaves.set(handle, { promise, options, source: targetText });
      return promise;
    },
    async saveActiveCorpusEntry(sourceText, message) {
      const active = defaultWorkspaceManager.getActiveDocument();
      if (!active || !isDiagramHandle(active.id)) return null;
      return this.saveDiagram(active.id, { sourceText, message });
    },
    dismissDraftCallout(handle: string) {
      dismissedDraftCallouts.add(handle);
      const current = stores.$dismissedDraftCallouts.get();
      if (!current.includes(handle)) {
        stores.$dismissedDraftCallouts.set([...current, handle]);
      }
    },
    isDraftCalloutDismissed(handle: string) {
      return dismissedDraftCallouts.has(handle) || stores.$dismissedDraftCallouts.get().includes(handle);
    },
    async retryFlush() {
      try {
        await corpusExplorer.flush();
        const view = stores.$corpusView.get();
        stores.$corpusView.set({
          ...view,
          persistence: 'persistent',
          persistenceError: undefined,
        });
        return true;
      } catch (err: any) {
        const view = stores.$corpusView.get();
        stores.$corpusView.set({
          ...view,
          persistenceError: err instanceof Error ? err.message : String(err),
        });
        return false;
      }
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
    async renameDiagram(handle: string, newTitle: string) {
      const res = await corpusExplorer.renameDiagram(handle, newTitle);
      if (res.success) {
        defaultWorkspaceManager.renameDocument(handle, newTitle);
        const active = stores.$activeDiagram.get();
        if (active.handle === handle) {
          stores.$activeDiagram.set({ ...active, name: newTitle });
        }
        const entries = corpusExplorer.listCorpusEntries({
          includeArchived: stores.$sessionRecovery.get().showArchived,
        }).entries;
        stores.$corpusEntries.set(entries);
      }
      return res;
    },
    async archiveDiagram(handle: string, archived = true) {
      const res = await corpusExplorer.archiveDiagram(handle, archived);
      if (res.success) {
        const entries = corpusExplorer.listCorpusEntries({
          includeArchived: stores.$sessionRecovery.get().showArchived,
        }).entries;
        stores.$corpusEntries.set(entries);
      }
      return res;
    },
    async duplicateDiagram(handle: string, newTitle?: string) {
      const res = await corpusExplorer.duplicateDiagram(handle, newTitle);
      if (res.success && res.newHandle) {
        const entries = corpusExplorer.listCorpusEntries({
          includeArchived: stores.$sessionRecovery.get().showArchived,
        }).entries;
        stores.$corpusEntries.set(entries);
      }
      return res;
    },
    documentHistory(handle: string) {
      return corpusExplorer.documentHistory(handle);
    },
    async restoreVersion(options: RestoreVersionOptions) {
      const res = await corpusExplorer.restoreVersion(options);
      if (res.status === 'success') {
        const active = defaultWorkspaceManager.getActiveDocument();
        if (active && active.id === options.handle) {
          ctx.graph.setAST(res.ast);
          stores.$activeDiagram.set({ name: active.title, handle: active.id });
          stores.$documentHead.set({
            handle: active.id,
            hash: res.hash,
            sequence: 0,
            isValid: true,
            lastCommittedAt: Date.now(),
          });
        }
        const entries = corpusExplorer.listCorpusEntries({
          includeArchived: stores.$sessionRecovery.get().showArchived,
        }).entries;
        stores.$corpusEntries.set(entries);
      }
      return res;
    },
    discardAllRecovered() {
      defaultWorkspaceManager.discardAllRecovered({
        resolveHeadContent: (handle) => {
          try {
            const hash = mcardCollection.resolveHandle(handle);
            if (!hash) return null;
            const card = mcardCollection.get(hash);
            return card && card.payload.kind === 'text' ? card.payload.value : null;
          } catch {
            return null;
          }
        },
      });
      const activeDoc = defaultWorkspaceManager.getActiveDocument();
      if (activeDoc) {
        stores.$activeDiagram.set({ name: activeDoc.title, handle: activeDoc.id });
        const parsed = safeParse(activeDoc.content);
        if (parsed.success && parsed.ast) {
          ctx.graph.setAST(parsed.ast);
        }
      }
      stores.$sessionRecovery.set({
        ...stores.$sessionRecovery.get(),
        recoveredCount: 0,
        dirtyHandles: [],
      });
    },
    openExportDialog(handle?: string) {
      const targetHandle = handle || defaultWorkspaceManager.getActiveDocument()?.id || '';
      if (!targetHandle) return;
      const wsDoc = defaultWorkspaceManager.getOpenDocuments().find((d) => d.id === targetHandle);
      const entry = corpusExplorer.listCorpusEntries({ includeArchived: true }).entries.find((e) => e.handle === targetHandle);
      const targetTitle = wsDoc?.title || entry?.title || targetHandle;
      const currentSource = wsDoc?.content ?? '';
      const isDirty = wsDoc?.isDirty ?? false;
      const history = runtime.documentHistory(targetHandle);
      const version = wsDoc?.version || history.rows.length || 0;
      const isDraft = version === 0 || !history.head;
      let savedSource: string | undefined;
      try {
        const headHash = mcardCollection.resolveHandle(targetHandle);
        if (headHash) {
          const card = mcardCollection.get(headHash);
          if (card && card.payload.kind === 'text') {
            savedSource = card.payload.value;
          }
        }
      } catch {
        // Ignore
      }
      stores.$exportDialogState.set({
        isOpen: true,
        targetHandle,
        targetTitle,
        currentSource: wsDoc ? currentSource : (savedSource ?? ''),
        savedSource,
        isDirty,
        version,
        isDraft,
      });
    },
    closeExportDialog() {
      const current = stores.$exportDialogState.get();
      stores.$exportDialogState.set({ ...current, isOpen: false });
    },
    async exportDiagramArtifact(options: ExportDiagramOptions): Promise<SaveArtifactResult> {
      const wsDoc = defaultWorkspaceManager.getOpenDocuments().find((d) => d.id === options.handle);
      const entry = corpusExplorer.listCorpusEntries({ includeArchived: true }).entries.find((e) => e.handle === options.handle);
      const title = wsDoc?.title || entry?.title || 'diagram';

      let sourceText = '';
      if (options.sourceKind === 'current' && wsDoc) {
        sourceText = wsDoc.content;
      } else {
        try {
          const headHash = mcardCollection.resolveHandle(options.handle);
          if (headHash) {
            const card = mcardCollection.get(headHash);
            if (card && card.payload.kind === 'text') {
              sourceText = card.payload.value;
            }
          }
        } catch {
          // Ignore
        }
        if (!sourceText && wsDoc) {
          sourceText = wsDoc.content;
        }
      }

      const styles = stores.$stylesCatalog.get();

      switch (options.format) {
        case 'tikz': {
          const rawName = sanitizeFilename(title, 'tikz');
          const filename = defaultFilenameCollisionTracker.getUniqueFilename(rawName);
          return saveArtifact(sourceText, filename, { mimeType: 'text/plain' }, options.environment);
        }
        case 'tex': {
          const texDoc = ImageExporter.generateStandaloneTex(sourceText, styles);
          const rawName = sanitizeFilename(title, 'tex');
          const filename = defaultFilenameCollisionTracker.getUniqueFilename(rawName);
          return saveArtifact(texDoc, filename, { mimeType: 'application/x-latex' }, options.environment);
        }
        case 'svg': {
          const parsed = safeParse(sourceText);
          if (!parsed.success || !parsed.ast) {
            return {
              status: 'failure',
              error: 'Diagram source contains syntax errors',
              code: 'ParseError',
            };
          }
          const svgBlob = ImageExporter.generateSvgBlob(parsed.ast, styles, { scale: 60, padding: 40 });
          const rawName = sanitizeFilename(title, 'svg');
          const filename = defaultFilenameCollisionTracker.getUniqueFilename(rawName);
          return saveArtifact(svgBlob, filename, { mimeType: 'image/svg+xml' }, options.environment);
        }
        case 'png': {
          const parsed = safeParse(sourceText);
          if (!parsed.success || !parsed.ast) {
            return {
              status: 'failure',
              error: 'Diagram source contains syntax errors',
              code: 'ParseError',
            };
          }
          try {
            const pngBlob = await ImageExporter.generatePngBlob(parsed.ast, styles, {
              scaleFactor: options.pngScale ?? 2,
            });
            const rawName = sanitizeFilename(title, 'png');
            const filename = defaultFilenameCollisionTracker.getUniqueFilename(rawName);
            return saveArtifact(pngBlob, filename, { mimeType: 'image/png' }, options.environment);
          } catch (pngErr) {
            return {
              status: 'failure',
              error: pngErr instanceof Error ? pngErr.message : String(pngErr),
              code: 'PngGenerationError',
            };
          }
        }
        case 'pdf': {
          const parsed = safeParse(sourceText);
          if (!parsed.success || !parsed.ast) {
            return {
              status: 'failure',
              error: 'Diagram source contains syntax errors',
              code: 'ParseError',
            };
          }
          const pdfBlob = PdfExporter.generatePdfBlob(parsed.ast, styles);
          const rawName = sanitizeFilename(title, 'pdf');
          const filename = defaultFilenameCollisionTracker.getUniqueFilename(rawName);
          return saveArtifact(pdfBlob, filename, { mimeType: 'application/pdf' }, options.environment);
        }
      }
    },
    async openExportCollectionDialog() {
      const summary = await corpusExport.getCollectionExportSummary();
      stores.$exportCollectionDialogState.set({
        isOpen: true,
        summary,
        progress: 'idle',
        outcome: 'idle',
        filename: summary.defaultFilename,
      });
    },
    closeExportCollectionDialog() {
      const current = stores.$exportCollectionDialogState.get();
      stores.$exportCollectionDialogState.set({
        ...current,
        isOpen: false,
        progress: 'idle',
      });
    },
    async exportCollectionArtifact(environment?: CorpusSaveEnvironment) {
      const current = stores.$exportCollectionDialogState.get();
      const filename = current.filename || current.summary?.defaultFilename;
      stores.$exportCollectionDialogState.set({
        ...current,
        progress: 'verifying',
        outcome: 'idle',
        errorMessage: undefined,
        failingHandle: undefined,
      });

      const result = await corpusExport.saveCorpusDb(environment, {
        filename,
        onProgress: (step) => {
          const state = stores.$exportCollectionDialogState.get();
          stores.$exportCollectionDialogState.set({ ...state, progress: step });
        },
      });

      const updated = stores.$exportCollectionDialogState.get();
      if (result.status === 'success') {
        const outcome = result.method === 'picker' ? 'saved' : 'fallback';
        const announcement = result.method === 'picker'
          ? `Collection saved to ${result.filename}.`
          : `Collection downloaded as ${result.filename} via browser fallback.`;
        stores.$exportCollectionDialogState.set({
          ...updated,
          progress: 'done',
          outcome,
          receiptPersisted: result.persisted,
          lastAnnouncement: announcement,
        });
      } else if (result.status === 'cancelled') {
        stores.$exportCollectionDialogState.set({
          ...updated,
          progress: 'done',
          outcome: 'cancelled',
          lastAnnouncement: 'Export cancelled.',
        });
      } else {
        const isVerif = result.failureCode === 'VerificationError';
        const outcome = isVerif ? 'verification-failed' : 'write-failed';
        const announcement = `Export failed: ${result.failureReason || 'Unknown error'}`;
        stores.$exportCollectionDialogState.set({
          ...updated,
          progress: 'done',
          outcome,
          errorMessage: result.failureReason,
          failingHandle: result.failingHandle,
          lastAnnouncement: announcement,
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

  disposers.push(
    ctx.command.register('tikzit.diagram.create', () => {
      return runtime.createDiagram();
    })
  );
  disposers.push(
    ctx.command.register('cmd:diagram:create', () => {
      return runtime.createDiagram();
    })
  );
  disposers.push(
    ctx.command.register('tikzit.diagram.rename', (handle: string, newTitle: string) => {
      return runtime.renameDiagram(handle, newTitle);
    })
  );
  disposers.push(
    ctx.command.register('cmd:diagram:rename', (handle: string, newTitle: string) => {
      return runtime.renameDiagram(handle, newTitle);
    })
  );
  disposers.push(
    ctx.command.register('tikzit.diagram.archive', (handle: string) => {
      return runtime.archiveDiagram(handle, true);
    })
  );
  disposers.push(
    ctx.command.register('cmd:diagram:archive', (handle: string) => {
      return runtime.archiveDiagram(handle, true);
    })
  );
  disposers.push(
    ctx.command.register('tikzit.diagram.unarchive', (handle: string) => {
      return runtime.archiveDiagram(handle, false);
    })
  );
  disposers.push(
    ctx.command.register('cmd:diagram:unarchive', (handle: string) => {
      return runtime.archiveDiagram(handle, false);
    })
  );
  disposers.push(
    ctx.command.register('tikzit.diagram.duplicate', (handle: string, newTitle?: string) => {
      return runtime.duplicateDiagram(handle, newTitle);
    })
  );
  disposers.push(
    ctx.command.register('cmd:diagram:duplicate', (handle: string, newTitle?: string) => {
      return runtime.duplicateDiagram(handle, newTitle);
    })
  );
  disposers.push(
    ctx.command.register('tikzit.diagram.export', (handle?: string) => {
      return runtime.openExportDialog(handle);
    })
  );
  disposers.push(
    ctx.command.register('cmd:diagram:export', (handle?: string) => {
      return runtime.openExportDialog(handle);
    })
  );
  disposers.push(
    ctx.command.register('tikzit.collection.export', () => {
      return runtime.openExportCollectionDialog();
    })
  );
  disposers.push(
    ctx.command.register('cmd:collection:export', () => {
      return runtime.openExportCollectionDialog();
    })
  );

  return runtime;
}
