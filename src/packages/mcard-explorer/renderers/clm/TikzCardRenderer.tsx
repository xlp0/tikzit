import React, { useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

export const TikzCardRenderer: React.FC<BaseCardRendererProps> = ({
  handle,
  text,
  content,
  onAction,
  style,
}) => {
  const tikzSource = useMemo(() => {
    if (text) return text;
    try {
      return new TextDecoder().decode(content);
    } catch {
      return '';
    }
  }, [text, content]);

  const stats = useMemo(() => {
    const nodeMatches = tikzSource.match(/\\node/g) ?? [];
    const edgeMatches = tikzSource.match(/\\draw/g) ?? [];
    return {
      nodes: nodeMatches.length,
      edges: edgeMatches.length,
      bytes: content?.byteLength ?? tikzSource.length,
    };
  }, [tikzSource, content]);

  const handleOpenInCanvas = async () => {
    if (onAction) {
      await onAction('openInCanvas', { handle });
    }
  };

  const handleExport = async (format: string) => {
    if (onAction) {
      await onAction(`export.${format}`, { handle, format, pngScale: 2 });
    }
  };

  return (
    <div
      data-testid="renderer-tikz"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 select-none gap-2">
        <div className="flex items-center gap-2">
          <span data-testid="tikz-meta-badge" className="text-slate-400 font-mono text-[11px]">
            {stats.nodes} nodes · {stats.edges} edges · {stats.bytes} B
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['png', 'pdf', 'svg', 'tikz', 'tex'] as const).map(fmt => (
            <button
              key={fmt}
              type="button"
              data-testid={`btn-viewer-action-export-${fmt}`}
              onClick={() => handleExport(fmt)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] uppercase transition-colors"
            >
              {fmt}
            </button>
          ))}
          <button
            type="button"
            data-testid="btn-open-in-canvas"
            onClick={handleOpenInCanvas}
            className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors"
          >
            Open in Canvas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-slate-900/50">
        <div className="max-w-xl w-full p-4 bg-slate-900 border border-slate-800 rounded shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="font-semibold text-indigo-400">PGF/TikZ String Diagram</span>
            <span className="text-[10px] text-slate-500 uppercase font-mono">U0_Mcard (spatial)</span>
          </div>
          <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all max-h-96 overflow-auto bg-slate-950 p-3 rounded border border-slate-800/80">
            {tikzSource}
          </pre>
        </div>
      </div>
    </div>
  );
};

export const tikzDescriptor: RendererDescriptor = {
  id: 'tikz',
  priority: 300,
  viewport: 'zoom',
  supportedTabs: ['visual', 'text', 'raw'],
  supportedMimes: ['text/x-tikz', 'application/vnd.zx-graph+json'],
  supportedExtensions: ['.tikz', '.zx.json', '.zx'],
  actions: [
    { id: 'openInCanvas', label: 'Open in Canvas', icon: 'canvas' },
    { id: 'export.png', label: 'Export PNG', icon: 'image', payload: { format: 'png', pngScale: 2 } },
    { id: 'export.pdf', label: 'Export PDF', icon: 'file-pdf', payload: { format: 'pdf' } },
    { id: 'export.svg', label: 'Export SVG', icon: 'code', payload: { format: 'svg' } },
    { id: 'export.tikz', label: 'Export TikZ', icon: 'file-text', payload: { format: 'tikz' } },
    { id: 'export.tex', label: 'Export TeX', icon: 'file-text', payload: { format: 'tex' } },
  ],
  matches: input =>
    input.mimeType === 'text/x-tikz' ||
    input.mimeType === 'application/vnd.zx-graph+json' ||
    input.category === 'diagram' ||
    Boolean(input.handle?.endsWith('.tikz')) ||
    Boolean(input.handle?.endsWith('.zx.json')),
  component: TikzCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => {
    const body = text || new TextDecoder().decode(content);
    return {
      type: 'card',
      attributes: { mime: judgment.mime, universe: judgment.universe, cardType: 'tikz' },
      content: body,
      children: [
        {
          type: 'text',
          attributes: {},
          content: body,
          children: [],
        },
      ],
    };
  },
};

export function register(registry: RendererRegistry): void {
  registry.register(tikzDescriptor);
}
