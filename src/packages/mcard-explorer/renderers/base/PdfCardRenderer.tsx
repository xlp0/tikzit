import React, { useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

export const PdfCardRenderer: React.FC<BaseCardRendererProps> = ({
  handle,
  content,
  onAction,
  style,
}) => {
  const blobUrl = useMemo(() => {
    if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && content?.byteLength) {
      try {
        const blob = new Blob([new Uint8Array(content)], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    }
    return null;
  }, [content]);

  const pdfVersion = useMemo(() => {
    if (!content || content.length < 8) return 'PDF';
    const header = new TextDecoder().decode(content.slice(0, 8));
    const match = header.match(/%PDF-([0-9.]+)/);
    return match ? `PDF ${match[1]}` : 'PDF';
  }, [content]);

  const handleDownload = async () => {
    if (onAction) {
      await onAction('export.pdf', { handle, format: 'pdf', bytes: content?.byteLength });
    }
  };

  return (
    <div
      data-testid="renderer-pdf"
      className="flex flex-col h-full w-full bg-slate-900 text-slate-200 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-rose-400">{pdfVersion}</span>
          <span data-testid="pdf-meta-badge" className="text-slate-400 font-mono text-[11px]">
            {content?.byteLength ?? 0} bytes
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="btn-pdf-new-tab"
              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] no-underline"
            >
              Open in New Tab
            </a>
          )}
          <button
            type="button"
            data-testid="btn-pdf-download"
            onClick={handleDownload}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px]"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {blobUrl ? (
          <iframe
            src={blobUrl}
            title={`PDF Preview: ${handle}`}
            data-testid="pdf-iframe-preview"
            className="w-full h-full border-none"
          />
        ) : (
          <div
            data-testid="pdf-headless-fallback"
            className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400"
          >
            <div className="text-3xl mb-2 text-rose-500">📄</div>
            <div className="text-sm font-semibold text-slate-200 mb-1">{handle}</div>
            <div className="text-xs text-slate-400 mb-3">{pdfVersion} Document · {content?.byteLength ?? 0} bytes</div>
            <p className="text-slate-500 max-w-sm text-xs leading-normal">
              PDF preview requires a browser runtime with blob support. Click Export PDF to download.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const pdfDescriptor: RendererDescriptor = {
  id: 'pdf',
  priority: 200,
  viewport: 'paged',
  supportedTabs: ['visual', 'raw'],
  supportedMimes: ['application/pdf'],
  supportedExtensions: ['.pdf'],
  actions: [
    { id: 'export.pdf', label: 'Export PDF', icon: 'file-pdf', payload: { format: 'pdf' } },
  ],
  matches: input => input.mimeType === 'application/pdf' || Boolean(input.handle?.endsWith('.pdf')),
  component: PdfCardRenderer,
  toHypermediaNode: (content, _text, judgment): HypermediaNode => ({
    type: 'card',
    attributes: { mime: 'application/pdf', universe: judgment.universe, bytes: content.byteLength, cardType: 'pdf' },
    content: `[PDF Document: ${content.byteLength} bytes]`,
    children: [
      {
        type: 'text',
        attributes: {},
        content: `PDF Document: ${content.byteLength} bytes`,
        children: [],
      },
    ],
  }),
};

export function register(registry: RendererRegistry): void {
  registry.register(pdfDescriptor);
}
