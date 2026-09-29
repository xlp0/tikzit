import React, { useState, useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

export const ImageCardRenderer: React.FC<BaseCardRendererProps> = ({
  content,
  text,
  mimeType,
  style,
}) => {
  const [zoom, setZoom] = useState(1);

  const imageSrc = useMemo(() => {
    if (mimeType === 'image/svg+xml' && (text || content?.byteLength)) {
      const svgText = text || new TextDecoder().decode(content);
      return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
    }
    if (content?.byteLength) {
      if (typeof window !== 'undefined' && typeof btoa === 'function') {
        let binary = '';
        const bytes = new Uint8Array(content);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return `data:${mimeType || 'image/png'};base64,${btoa(binary)}`;
      }
    }
    return '';
  }, [content, text, mimeType]);

  return (
    <div
      data-testid="renderer-image"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-200 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 select-none">
        <span data-testid="image-meta-badge" className="text-slate-400 font-mono text-[11px]">
          {mimeType} · {content?.byteLength ?? 0} bytes
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="btn-zoom-out"
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px]"
          >
            -
          </button>
          <span data-testid="image-zoom-level" className="text-slate-300 text-[11px] font-mono px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            data-testid="btn-zoom-in"
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px]"
          >
            +
          </button>
          <button
            type="button"
            data-testid="btn-zoom-reset"
            onClick={() => setZoom(1)}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px]"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4 relative"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="MCard Preview"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="max-h-full max-w-full object-contain transition-transform duration-100 shadow-lg"
          />
        ) : (
          <div className="text-slate-500 font-mono">No renderable image payload</div>
        )}
      </div>
    </div>
  );
};

export const imageDescriptor: RendererDescriptor = {
  id: 'image',
  priority: 200,
  viewport: 'zoom',
  supportedTabs: ['visual', 'raw'],
  supportedMimes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'],
  supportedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'],
  matches: input =>
    input.mimeType.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(input.handle),
  component: ImageCardRenderer,
  toHypermediaNode: (content, _text, judgment): HypermediaNode => ({
    type: 'card',
    attributes: { mime: judgment.mime, universe: judgment.universe, bytes: content.byteLength, cardType: 'image' },
    content: `[Image: ${judgment.mime} (${content.byteLength} bytes)]`,
    children: [
      {
        type: 'text',
        attributes: {},
        content: `Image: ${judgment.mime} (${content.byteLength} bytes)`,
        children: [],
      },
    ],
  }),
};

export function register(registry: RendererRegistry): void {
  registry.register(imageDescriptor);
}
