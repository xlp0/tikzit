import React, { useState, useEffect, useRef } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { useStore } from '@nanostores/react';
import { useWorkbenchRuntime } from '../WorkbenchRuntimeContext';
import { $graphAST as defaultGraphAST, $stylesCatalog as defaultStylesCatalog } from '../../../stores/workbench';
import { generateSvg } from '../../../services/preview/SvgGenerator';
import { ImageExporter } from '../../../services/export/ImageExporter';
import { PdfExporter } from '../../../services/export/PdfExporter';
import { defaultPreambleManager } from '../../../services/preview/PreambleManager';
import type { PreambleConfig } from '../../../services/preview/PreambleManager';

export const PreviewPanel: React.FC<IDockviewPanelProps> = () => {
  let runtime: ReturnType<typeof useWorkbenchRuntime> | null = null;
  try {
    runtime = useWorkbenchRuntime();
  } catch {
    // outside provider
  }

  const graphStore = runtime ? runtime.stores.$graphAST : defaultGraphAST;
  const stylesStore = runtime ? runtime.stores.$stylesCatalog : defaultStylesCatalog;

  const graph = useStore(graphStore);
  const stylesCatalog = useStore(stylesStore);

  // Preview state
  const [svgContent, setSvgContent] = useState<string>('');
  const [autoCompile, setAutoCompile] = useState<boolean>(true);
  const [compiling, setCompiling] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Zoom and Pan
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawers
  const [showPreambleModal, setShowPreambleModal] = useState<boolean>(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(false);
  const [compilerLogs, setCompilerLogs] = useState<string[]>([
    'TikZiT Preview Engine initialized.',
    'Preamble: standard TikZiT definitions loaded.',
  ]);

  // Resolution selector for PNG
  const [pngScale, setPngScale] = useState<1 | 2 | 4>(2);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Debounced SVG compilation
  useEffect(() => {
    if (!autoCompile) return;
    if (!graph) return;

    setCompiling(true);
    const timer = setTimeout(() => {
      try {
        const svg = generateSvg(graph, stylesCatalog, {
          scale: 55,
          padding: 35,
          theme: 'dark',
          transparentBg: true,
        });
        setSvgContent(svg);
        setCompiling(false);
        setCompilerLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] Compiled: ${graph.nodes.length} nodes, ${graph.edges.length} edges.`,
          ...prev.slice(0, 50),
        ]);
      } catch (err: any) {
        setCompiling(false);
        setCompilerLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] Error: ${err.message || 'SVG generation failed'}`,
          ...prev.slice(0, 50),
        ]);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [graph, stylesCatalog, autoCompile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(4.0, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.25, z / 1.25));
  const handleZoomReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };
  const handleZoomFit = () => {
    setZoom(1.1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(5.0, Math.max(0.2, z * factor)));
  };

  // Pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Exporters
  const handleCopyTikz = async () => {
    if (!graph) return;
    const ok = await ImageExporter.copyTikzToClipboard(graph);
    showToast(ok ? 'TikZ code copied to clipboard!' : 'Failed to copy TikZ code');
  };

  const handleExportSvg = () => {
    if (!graph) return;
    ImageExporter.exportSvg(graph, stylesCatalog, { scale: 60, padding: 40 });
    showToast('Exported diagram.svg');
    setShowExportMenu(false);
  };

  const handleExportPng = async () => {
    if (!graph) return;
    showToast(`Generating ${pngScale}x PNG...`);
    try {
      await ImageExporter.exportPng(graph, stylesCatalog, { scaleFactor: pngScale });
      showToast(`Exported diagram.png (${pngScale}x)`);
    } catch (err: any) {
      showToast(`PNG export error: ${err.message}`);
    }
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    if (!graph) return;
    PdfExporter.exportPdf(graph, stylesCatalog);
    showToast('Exported diagram.pdf');
    setShowExportMenu(false);
  };

  const handleExportTikz = () => {
    if (!graph) return;
    ImageExporter.exportTikz(graph);
    showToast('Exported diagram.tikz');
    setShowExportMenu(false);
  };

  const handleExportTex = () => {
    if (!graph) return;
    ImageExporter.exportTex(graph, stylesCatalog);
    showToast('Exported standalone diagram.tex');
    setShowExportMenu(false);
  };

  return (
    <div
      className="w-full h-full bg-[#12141a] flex flex-col font-sans select-none relative overflow-hidden"
      data-testid="panel-preview"
      data-panel="preview"
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          data-testid="preview-toast"
          className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium backdrop-blur-sm transition-all"
        >
          {toastMessage}
        </div>
      )}

      {/* Panel Header & Universal Toolbar */}
      <div className="h-8 bg-[#1a1d26] border-b border-[#2e3446] px-2.5 flex items-center justify-between text-[#94a3b8] text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-200">Live TeX Preview</span>
          {/* Status Badge */}
          <div className="flex items-center space-x-1 pl-1" data-testid="preview-status-badge">
            {compiling ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-[10px] text-amber-400 font-medium">Compiling</span>
              </>
            ) : autoCompile ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-emerald-400 font-medium">Synced</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span className="text-[10px] text-slate-400 font-medium">Paused</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* Auto-Compile Switch */}
          <button
            onClick={() => setAutoCompile(!autoCompile)}
            data-testid="toggle-auto-compile"
            title={autoCompile ? 'Auto-compile active: compiles on graph changes' : 'Auto-compile paused'}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
              autoCompile
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            Auto: {autoCompile ? 'ON' : 'OFF'}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-[#12141a] rounded border border-[#2e3446] px-0.5">
            <button
              onClick={handleZoomOut}
              data-testid="btn-preview-zoom-out"
              className="px-1.5 py-0.5 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs"
              title="Zoom Out"
            >
              -
            </button>
            <span data-testid="preview-zoom-text" className="px-1 text-[10px] text-slate-400 font-mono w-9 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              data-testid="btn-preview-zoom-in"
              className="px-1.5 py-0.5 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={handleZoomReset}
              data-testid="btn-preview-zoom-reset"
              className="px-1 py-0.5 hover:text-white hover:bg-slate-800 rounded text-[10px] text-slate-400 transition-colors ml-0.5"
              title="Reset Zoom (100%)"
            >
              100%
            </button>
            <button
              onClick={handleZoomFit}
              data-testid="btn-preview-zoom-fit"
              className="px-1 py-0.5 hover:text-white hover:bg-slate-800 rounded text-[10px] text-slate-400 transition-colors"
              title="Fit to Window"
            >
              Fit
            </button>
          </div>

          {/* Copy TikZ snippet */}
          <button
            onClick={handleCopyTikz}
            data-testid="btn-copy-tikz"
            className="px-2 py-1 bg-[#222634] hover:bg-[#2b3142] text-slate-200 rounded border border-[#2e3446] text-[11px] font-medium transition-colors"
            title="Copy TikZ code to clipboard"
          >
            Copy TikZ
          </button>

          {/* Export Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              data-testid="btn-export-dropdown"
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-[11px] transition-colors flex items-center space-x-1"
            >
              <span>Export</span>
              <span className="text-[9px]">▼</span>
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-44 bg-[#1a1d26] border border-[#2e3446] rounded-md shadow-xl py-1 z-50 text-xs"
                data-testid="preview-export-menu"
              >
                <button
                  onClick={handleExportSvg}
                  data-testid="btn-export-svg"
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/50 text-slate-200 transition-colors"
                >
                  Export SVG Vector
                </button>

                <div className="px-3 py-1 border-t border-[#2e3446]/60">
                  <div className="text-[10px] text-slate-400 mb-1">PNG Resolution:</div>
                  <div className="flex space-x-1 mb-1">
                    {([1, 2, 4] as const).map((factor) => (
                      <button
                        key={factor}
                        onClick={() => setPngScale(factor)}
                        className={`px-1.5 py-0.5 text-[10px] rounded ${
                          pngScale === factor
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {factor}x
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleExportPng}
                    data-testid="btn-export-png"
                    className="w-full text-left py-1 text-slate-200 hover:text-white transition-colors"
                  >
                    Export PNG Image
                  </button>
                </div>

                <div className="border-t border-[#2e3446]/60">
                  <button
                    onClick={handleExportPdf}
                    data-testid="btn-export-pdf"
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-700/50 text-slate-200 transition-colors"
                  >
                    Export Standalone PDF
                  </button>
                  <button
                    onClick={handleExportTikz}
                    data-testid="btn-export-tikz"
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-700/50 text-slate-200 transition-colors"
                  >
                    Export .tikz File
                  </button>
                  <button
                    onClick={handleExportTex}
                    data-testid="btn-export-tex"
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-700/50 text-slate-200 transition-colors"
                  >
                    Export .tex Document
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* More options: Preamble & Logs */}
          <button
            onClick={() => setShowPreambleModal(!showPreambleModal)}
            data-testid="btn-preview-preamble"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Configure LaTeX Preamble"
          >
            ⚙
          </button>
          <button
            onClick={() => setShowLogsDrawer(!showLogsDrawer)}
            data-testid="btn-preview-logs"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="View Compiler Logs"
          >
            📋
          </button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center bg-[#0d0f14]"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-testid="preview-viewport"
      >
        <div
          className="transition-transform duration-75 origin-center pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
          data-testid="preview-svg-container"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />

        {(!graph || graph.nodes.length === 0) && (
          <div className="absolute text-slate-500 text-xs italic pointer-events-none">
            Canvas is empty. Add nodes or edges to see live TeX preview.
          </div>
        )}
      </div>

      {/* Compiler Logs Drawer */}
      {showLogsDrawer && (
        <div
          className="h-32 bg-[#141720] border-t border-[#2e3446] p-2 flex flex-col font-mono text-[11px] text-slate-300 overflow-hidden"
          data-testid="preview-logs-drawer"
        >
          <div className="flex justify-between items-center pb-1 mb-1 border-b border-slate-800">
            <span className="font-semibold text-slate-400">TeX Compiler Logs</span>
            <button
              onClick={() => setShowLogsDrawer(false)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 text-slate-400 select-text">
            {compilerLogs.map((log, i) => (
              <div key={i} className="leading-tight">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preamble Configuration Modal */}
      {showPreambleModal && (
        <PreambleModal onClose={() => setShowPreambleModal(false)} />
      )}
    </div>
  );
};

interface PreambleModalProps {
  onClose: () => void;
}

const PreambleModal: React.FC<PreambleModalProps> = ({ onClose }) => {
  const [config, setConfig] = useState<PreambleConfig>(defaultPreambleManager.getConfig());
  const [customLine, setCustomLine] = useState('');

  const handleAddCustom = () => {
    if (!customLine.trim()) return;
    const updated = {
      ...config,
      customPreambleLines: [...config.customPreambleLines, customLine.trim()],
    };
    setConfig(updated);
    defaultPreambleManager.setConfig(updated);
    setCustomLine('');
  };

  const handleToggleTikzitSty = () => {
    const updated = { ...config, includeTikzitSty: !config.includeTikzitSty };
    setConfig(updated);
    defaultPreambleManager.setConfig(updated);
  };

  const handleToggleLayers = () => {
    const updated = { ...config, declareLayers: !config.declareLayers };
    setConfig(updated);
    defaultPreambleManager.setConfig(updated);
  };

  const handleReset = () => {
    const def = defaultPreambleManager.resetToDefault();
    setConfig(def);
  };

  return (
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      data-testid="preamble-modal"
    >
      <div className="bg-[#1a1d26] border border-[#2e3446] rounded-lg max-w-lg w-full p-4 shadow-2xl text-xs text-slate-300 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center pb-2 border-b border-[#2e3446]">
          <h3 className="font-semibold text-sm text-slate-100">LaTeX Preamble Configuration</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          <div>
            <label className="font-medium text-slate-200 block mb-1">Standard Declarations</label>
            <div className="space-y-1">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.includeTikzitSty}
                  onChange={handleToggleTikzitSty}
                  className="rounded bg-slate-800 border-slate-700"
                />
                <span>Include standard `tikzit.sty` macros and dummy properties</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.declareLayers}
                  onChange={handleToggleLayers}
                  className="rounded bg-slate-800 border-slate-700"
                />
                <span>Declare PGF layers (`edgelayer`, `nodelayer`, `main`)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-200 block mb-1">Active Packages</label>
            <div className="bg-[#12141a] p-2 rounded border border-[#2e3446] font-mono text-[11px] text-emerald-400">
              {config.packages.map((pkg) => `\\usepackage{${pkg}}`).join('\n')}
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-200 block mb-1">TikZ Libraries</label>
            <div className="bg-[#12141a] p-2 rounded border border-[#2e3446] font-mono text-[11px] text-sky-400">
              {`\\usetikzlibrary{${config.tikzLibraries.join(', ')}}`}
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-200 block mb-1">Custom Preamble Additions</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={customLine}
                onChange={(e) => setCustomLine(e.target.value)}
                placeholder="\\newcommand{\\mycmd}{...}"
                className="flex-1 bg-[#12141a] border border-[#2e3446] rounded px-2 py-1 text-slate-200 focus:outline-none"
              />
              <button
                onClick={handleAddCustom}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
              >
                Add
              </button>
            </div>
            {config.customPreambleLines.length > 0 && (
              <div className="bg-[#12141a] p-2 rounded border border-[#2e3446] font-mono text-[11px] text-slate-300">
                {config.customPreambleLines.join('\n')}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[#2e3446]">
          <button
            onClick={handleReset}
            className="px-2.5 py-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
