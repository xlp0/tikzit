/** Concern 1: CSV tabular parsing · Concern 2: Paginated grid viewport */
import React, { useState, useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

const PAGE_SIZE = 50;

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const row: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    return row;
  });
}

export const CsvCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  style,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);

  const rawText = useMemo(() => {
    if (text) return text;
    try {
      return new TextDecoder().decode(content);
    } catch {
      return '';
    }
  }, [text, content]);

  const rows = useMemo(() => parseCsv(rawText), [rawText]);
  const header = rows[0] ?? [];
  const dataRows = useMemo(() => rows.slice(1), [rows]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return dataRows;
    const term = searchTerm.toLowerCase();
    return dataRows.filter(r => r.some(cell => cell.toLowerCase().includes(term)));
  }, [dataRows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div
      data-testid="renderer-csv"
      className="flex flex-col h-full w-full bg-slate-900 text-slate-200 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 select-none gap-2">
        <div className="flex items-center gap-2">
          <span data-testid="csv-metadata-badge" className="text-slate-400 font-mono text-[11px]">
            {dataRows.length} rows · {header.length} cols
          </span>
          <input
            type="text"
            data-testid="input-csv-search"
            placeholder="Search rows..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-36"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="btn-csv-prev"
            disabled={currentPage === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 text-[11px]"
          >
            Prev
          </button>
          <span data-testid="csv-page-indicator" className="text-slate-400 text-[11px] px-1 font-mono">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            data-testid="btn-csv-next"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 text-[11px]"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead className="bg-slate-800/90 sticky top-0 border-b border-slate-700 text-slate-300">
            <tr>
              <th className="px-2 py-1.5 text-slate-500 w-12 text-right border-r border-slate-700/60">#</th>
              {header.map((col, idx) => (
                <th key={idx} className="px-3 py-1.5 font-semibold text-sky-300 border-r border-slate-700/40 truncate">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {pagedRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-800/40">
                <td className="px-2 py-1 text-slate-500 text-right border-r border-slate-700/60">
                  {currentPage * PAGE_SIZE + rIdx + 1}
                </td>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-1 text-slate-300 border-r border-slate-700/30 truncate max-w-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const csvDescriptor: RendererDescriptor = {
  id: 'csv',
  priority: 130,
  viewport: 'paged',
  supportedTabs: ['raw_data', 'visual', 'raw'],
  supportedMimes: ['text/csv'],
  supportedExtensions: ['.csv'],
  matches: input => input.mimeType === 'text/csv' || Boolean(input.handle?.endsWith('.csv')),
  component: CsvCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => {
    const body = text || new TextDecoder().decode(content);
    return {
      type: 'card',
      attributes: { mime: 'text/csv', universe: judgment.universe, cardType: 'csv' },
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
  registry.register(csvDescriptor);
}
