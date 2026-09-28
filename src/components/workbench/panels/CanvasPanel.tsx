import { defaultTransactionManager, ASTSnapshotCommand } from '../../../core/history/TransactionManager';
import React, { useRef, useEffect, useState } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { useStore } from '@nanostores/react';
import { useWorkbenchRuntime } from '../WorkbenchRuntimeContext';
import {
  $theme as defaultTheme,
  $graphAST as defaultGraphAST,
  $selectedElements as defaultSelected,
  $toolMode as defaultToolMode,
  $stylesCatalog as defaultStylesCatalog,
  $activeStyle as defaultActiveStyle,
  toolActions,
  selectionActions,
  styleActions,
} from '../../../stores/workbench';
import { Stage } from '../../../canvas/Stage';
import { ToolManager } from '../../../canvas/tools/ToolManager';
import type { CameraState } from '../../../canvas/CameraController';
import type { ToolMode } from '../../../services/kernel';
import type { GraphAST } from '../../../core/domain/types';
import { parseTikz, emitTikz } from '../../../core/parser';

declare global {
  interface Window {
    TikzitApp?: any;
  }
}

export const CanvasPanel: React.FC<IDockviewPanelProps> = () => {
  let runtime: ReturnType<typeof useWorkbenchRuntime> | null = null;
  try {
    runtime = useWorkbenchRuntime();
  } catch {
    // outside provider fallback
  }

  const theme = useStore(runtime ? runtime.stores.$theme : defaultTheme);
  const graphAST = useStore(runtime ? runtime.stores.$graphAST : defaultGraphAST);
  const selectedElements = useStore(runtime ? runtime.stores.$selectedElements : defaultSelected);
  const toolMode = useStore(runtime ? runtime.stores.$toolMode : defaultToolMode);
  const stylesCatalog = useStore(runtime ? runtime.stores.$stylesCatalog : defaultStylesCatalog);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const [cameraHUD, setCameraHUD] = useState<CameraState>({
    position: { x: 0, y: 0 },
    zoom: 1.0,
    pixelsPerUnit: 50,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Stage({
      container: containerRef.current,
      theme: theme === 'light' ? 'light' : 'dark',
      onCameraChange: (state) => {
        setCameraHUD(state);
      },
    });
    stageRef.current = stage;

    const toolManager = new ToolManager({
      stage,
      raycaster: stage.raycaster,
      gizmos: stage.gizmoRenderer,
      getGraph: () => (runtime ? runtime.stores.$graphAST.get() : defaultGraphAST.get()),
      setGraph: (ast) => {
        if (runtime) {
          runtime.stores.$graphAST.set(ast);
        } else {
          defaultGraphAST.set(ast);
        }
      },
      commitGraphChange: (ast) => {
        const prev = runtime ? runtime.stores.$graphAST.get() : defaultGraphAST.get();
        defaultTransactionManager.execute(
          new ASTSnapshotCommand('Canvas edit', prev, ast, (targetAST) => {
            if (runtime) {
              runtime.ctx.graph.setAST(targetAST);
            } else {
              defaultGraphAST.set(targetAST);
            }
          })
        );
        if (runtime) {
          runtime.ctx.graph.setAST(ast);
        } else {
          defaultGraphAST.set(ast);
        }
      },
      getSelectedIds: () => {
        const sel = runtime ? runtime.stores.$selectedElements.get() : defaultSelected.get();
        return {
          nodes: sel?.nodes ? [...sel.nodes] : [],
          edges: sel?.edges ? [...sel.edges] : [],
        };
      },
      setSelectedIds: (sel) => {
        if (runtime) {
          runtime.ctx.selection.selectedNodes = new Set(sel.nodes);
          runtime.ctx.selection.selectedEdges = new Set(sel.edges);
          runtime.ctx.emit('tikzit/selection:change', sel);
          runtime.ctx.emit('selection:change', sel);
        } else {
          defaultSelected.set(sel);
        }
      },
      onToolChange: (tool: ToolMode) => {
        if (runtime) {
          runtime.ctx.tool.setTool(tool);
          runtime.stores.$toolMode.set(tool);
        } else {
          toolActions.setTool(tool);
        }
      },
      getActiveStyle: () => (runtime ? runtime.stores.$activeStyle.get() : defaultActiveStyle.get()),
    });
    toolManagerRef.current = toolManager;

    // Render initial diagram if available
    const initialAST = runtime ? runtime.stores.$graphAST.get() : defaultGraphAST.get();
    if (initialAST && initialAST.nodes.length > 0) {
      const sel = runtime ? runtime.stores.$selectedElements.get() : defaultSelected.get();
      const selectedIds = [...(sel?.nodes || []), ...(sel?.edges || [])];
      stage.renderGraph(initialAST, undefined, selectedIds);
      stage.fitToGraph();
    }

    // Expose window.TikzitApp for E2E testing and automation
    if (typeof window !== 'undefined') {
      window.TikzitApp = {
        stage,
        toolManager,
        getGraph: () => {
          const ast = runtime ? runtime.stores.$graphAST.get() : defaultGraphAST.get();
          const nodes = (ast?.nodes || []).map((n) => {
            const style = (n as any).style || n.data?.find((p) => p.key === 'style')?.value || 'none';
            return {
              ...n,
              style,
            };
          });
          const edges = (ast?.edges || []).map((ed) => {
            const props: Record<string, string | true> = {};
            for (const p of ed.data || []) {
              props[p.key] = p.value !== undefined ? p.value : true;
            }
            return {
              ...ed,
              properties: props,
            };
          });
          return {
            ...ast,
            nodes,
            edges,
          };
        },
        getStyles: () => (runtime ? runtime.stores.$stylesCatalog.get() : defaultStylesCatalog.get()),
        applyStyle: (elementId: string, styleName: string) => {
          if (runtime) {
            const ast = runtime.stores.$graphAST.get();
            const isNode = ast.nodes.some((n) => n.id === elementId);
            if (isNode) {
              runtime.ctx.styles.applyStyleToNodes([elementId], styleName);
            } else {
              runtime.ctx.styles.applyStyleToEdges([elementId], styleName);
            }
          } else {
            styleActions.applyStyleToSelected(styleName);
          }
        },
        setSourceCode: (code: string) => window.TikzitApp.loadTikz(code),
        loadTikz: (tikzCode: string) => {
          try {
            const ast = parseTikz(tikzCode);
            if (ast) {
              if (runtime) {
                runtime.ctx.graph.setAST(ast);
              } else {
                defaultGraphAST.set(ast);
              }
              stage.renderGraph(ast);
              stage.fitToGraph();
            }
          } catch (err) {
            console.error('loadTikz parse error:', err);
          }
        },
        getNodeScreenPos: (nodeId: string) => stage.getNodeScreenPos(nodeId),
        getEdgeHandleScreenPos: (edgeIndexOrId: number | string) => stage.getEdgeHandleScreenPos(edgeIndexOrId),
        getSelectedNodeIds: () => {
          const sel = runtime ? runtime.stores.$selectedElements.get() : defaultSelected.get();
          return [...(sel?.nodes || [])];
        },
        setTool: (mode: ToolMode) => {
          toolManager.setTool(mode);
          if (runtime) {
            runtime.ctx.tool.setTool(mode);
          } else {
            toolActions.setTool(mode);
          }
        },
        selectNode: (id: string, additive: boolean = false) => {
          if (runtime) {
            runtime.ctx.selection.selectNode(id, additive);
          } else {
            selectionActions.selectNode(id, additive);
          }
        },
        selectEdge: (id: string | number, additive: boolean = false) => {
          const edgeIdStr = String(id);
          if (runtime) {
            runtime.ctx.selection.selectEdge(edgeIdStr, additive);
          } else {
            selectionActions.selectEdge(edgeIdStr, additive);
          }
        },
        getEditorValue: () => {
          const ast = runtime ? runtime.stores.$graphAST.get() : defaultGraphAST.get();
          return emitTikz(ast);
        },
      };
    }

    return () => {
      toolManager.dispose();
      stage.dispose();
      stageRef.current = null;
      toolManagerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.setTheme(theme === 'light' ? 'light' : 'dark');
    }
  }, [theme]);

  // Synchronize external toolMode changes (e.g. from toolbar buttons) to toolManager
  useEffect(() => {
    if (toolManagerRef.current && toolMode) {
      toolManagerRef.current.setTool(toolMode);
    }
  }, [toolMode]);

  useEffect(() => {
    if (stageRef.current && graphAST) {
      const selectedIds = [...(selectedElements?.nodes || []), ...(selectedElements?.edges || [])];
      const stylesRecord: Record<string, any> = {};
      for (const s of stylesCatalog?.styles || []) {
        stylesRecord[s.name] = s;
      }
      stageRef.current.renderGraph(graphAST, stylesRecord, selectedIds);
    }
  }, [graphAST, selectedElements, stylesCatalog]);

  const nodeCount = graphAST?.nodes?.length ?? 0;
  const edgeCount = graphAST?.edges?.length ?? 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0d0f14] overflow-hidden select-none"
      data-testid="panel-canvas"
      data-panel="canvas"
    >
      {/* Floating Canvas HUD */}
      <div className="absolute bottom-3 left-3 bg-[#1a1d26]/80 backdrop-blur-md px-2.5 py-1.5 rounded border border-[#2e3446] text-xs text-[#94a3b8] flex items-center space-x-3 pointer-events-none z-30">
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
          WebGL 2D Ready
        </span>
        <span>Grid: {cameraHUD.pixelsPerUnit.toFixed(0)}px ({(cameraHUD.zoom * 100).toFixed(0)}%)</span>
        <span>Nodes: {nodeCount} | Edges: {edgeCount}</span>
      </div>
    </div>
  );
};
