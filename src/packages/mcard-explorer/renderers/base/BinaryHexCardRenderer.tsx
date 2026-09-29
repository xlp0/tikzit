import React, { useState, useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

const CHUNK_SIZE = 256;

function formatHexLines(bytes: Uint8Array, offsetBase: number): { offset: string; hex: string; ascii: string }[] {
  const lines: { offset: string; hex: string; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const slice = bytes.slice(i, i + 16);
    const offset = (offsetBase + i).toString(16).padStart(8, '0');
    let hexGroup1 = '';
    let hexGroup2 = '';
    let ascii = '';

    for (let j = 0; j < 16; j++) {
      if (j < slice.length) {
        const b = slice[j];
        const hexByte = b.toString(16).padStart(2, '0');
        if (j < 8) {
          hexGroup1 += (hexGroup1 ? ' ' : '') + hexByte;
        } else {
          hexGroup2 += (hexGroup2 ? ' ' : '') + hexByte;
        }
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
      } else {
        if (j < 8) hexGroup1 += '   ';
        else hexGroup2 += '   ';
        ascii += ' ';
      }
    }
    lines.push({ offset, hex: `${hexGroup1.padEnd(23, ' ')}  ${hexGroup2.padEnd(23, ' ')}`, ascii });
  }
  return lines;
}

export const BinaryHexCardRenderer: React.FC<BaseCardRendererProps> = ({
  content,
  style,
}) => {
  const [page, setPage] = useState(0);

  const bytes = useMemo(() => content ?? new Uint8Array(0), [content]);
  const totalChunks = Math.max(1, Math.ceil(bytes.length / CHUNK_SIZE));
  const currentPage = Math.min(page, totalChunks - 1);
  const currentSlice = useMemo(() => {
    const start = currentPage * CHUNK_SIZE;
    return bytes.slice(start, start + CHUNK_SIZE);
  }, [bytes, currentPage]);

  const lines = useMemo(
    () => formatHexLines(currentSlice, currentPage * CHUNK_SIZE),
    [currentSlice, currentPage]
  );

  return (
    <div
      data-testid="renderer-binary-hex"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-mono text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-400">Hex Dump</span>
          <span data-testid="hex-byte-count" className="text-slate-400 text-[11px]">
            {`${bytes.length} bytes total`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="btn-hex-prev"
            disabled={currentPage === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[11px]"
          >
            Prev
          </button>
          <span data-testid="hex-offset-badge" className="text-slate-400 text-[11px] px-1">
            0x{(currentPage * CHUNK_SIZE).toString(16).padStart(6, '0')} · {currentPage + 1}/{totalChunks}
          </span>
          <button
            type="button"
            data-testid="btn-hex-next"
            disabled={currentPage >= totalChunks - 1}
            onClick={() => setPage(p => Math.min(totalChunks - 1, p + 1))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[11px]"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 select-text leading-relaxed">
        {lines.map((row, idx) => (
          <div key={idx} className="flex gap-4 hover:bg-slate-900/60 py-0.5">
            <span className="text-slate-500 w-20 shrink-0">{row.offset}</span>
            <span className="text-emerald-400 shrink-0 whitespace-pre">{row.hex}</span>
            <span className="text-sky-300 shrink-0 whitespace-pre pl-2 border-l border-slate-800">
              |{row.ascii}|
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const binaryHexDescriptor: RendererDescriptor = {
  id: 'binary-hex',
  priority: 10,
  viewport: 'scroll',
  supportedTabs: ['raw', 'raw_data'],
  supportedMimes: ['application/octet-stream'],
  matches: input => input.isBinary || input.mimeType === 'application/octet-stream',
  component: BinaryHexCardRenderer,
  toHypermediaNode: (content, _text, judgment): HypermediaNode => {
    const lines = formatHexLines(content.slice(0, 128), 0);
    const dump = lines.map(l => `${l.offset}  ${l.hex}  |${l.ascii}|`).join('\n');
    return {
      type: 'text',
      attributes: { mime: 'application/octet-stream', universe: judgment.universe, bytes: content.length },
      content: dump,
      children: [],
    };
  },
};

export function register(registry: RendererRegistry): void {
  registry.register(binaryHexDescriptor);
  registry.registerFallback('binary', binaryHexDescriptor);
}
