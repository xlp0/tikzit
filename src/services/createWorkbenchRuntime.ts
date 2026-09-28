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

export interface WorkbenchRuntimeOptions {
  id?: string;
  authorDid?: string;
  bindKeybindings?: boolean;
}

export interface WorkbenchRuntime {
  readonly id: string;
  readonly ctx: Context;
  readonly stores: WorkbenchStores;
  readonly triDb: TriDatabaseManager;
  readonly mcardFs: MCardFileSystem;
  readonly mcardCollection: MCardCollection;
  readonly authorDid: AgentDid;
  readonly isDisposed: boolean;
  dispose(): void;
}

/**
 * Instantiates a fully hermetic, isolated Workbench Runtime instance.
 * Houses its own Cordis Service Mesh, Nanostores projections, CLM TriDatabase,
 * and command dispatchers with zero module-level cross-contamination.
 */
export function createWorkbenchRuntime(options: WorkbenchRuntimeOptions = {}): WorkbenchRuntime {
  const id = options.id ?? `runtime_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const authorDidStr = options.authorDid ?? DEFAULT_AUTHOR_DID;

  // 1. Create isolated Nanostores projection stores
  const stores = createWorkbenchStores();

  // 2. Create isolated Cordis micro-kernel context
  const ctx = createKernelContext();

  // 3. Initialize in-memory CLM TriDatabase and register Layer 2 & Layer 0 in Cordis
  const clmBridge = initTriDatabase(ctx, authorDidStr);
  const { triDb, mcardFs, mcardCollection, authorDid } = clmBridge;

  // 4. Register Triad definition into knowledge pillar
  registerTikzTriad(triDb, authorDid);

  // 5. Register DocumentCommitService into Cordis
  new DocumentCommitService(ctx, triDb, mcardCollection, authorDid);

  const disposers: Array<() => void> = [];

  // 6. Bind Cordis events to Nanostores read-only projections
  const unbindBridge = bindCordisToNanostores(ctx, stores);
  disposers.push(unbindBridge);

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

  const runtime: WorkbenchRuntime = {
    id,
    ctx,
    stores,
    triDb,
    mcardFs,
    mcardCollection,
    authorDid,
    get isDisposed() {
      return isDisposed;
    },
    dispose() {
      if (isDisposed) return;
      isDisposed = true;
      disposers.forEach((d) => {
        try {
          d();
        } catch (err) {
          console.warn('Error during runtime disposal:', err);
        }
      });
      disposers.length = 0;
    },
  };

  return runtime;
}
