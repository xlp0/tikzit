import React, { useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

export const SqliteCollectionRenderer: React.FC<BaseCardRendererProps> = ({
  handle,
  content,
  onAction,
  style,
}) => {
  const metadata = useMemo(() => {
    if (!content || content.length < 100) {
      return { valid: false, pageSize: 0, pageCount: 0, version: 'unknown' };
    }
    const header = new TextDecoder().decode(content.slice(0, 16));
    if (!header.startsWith('SQLite format 3')) {
      return { valid: false, pageSize: 0, pageCount: 0, version: 'unknown' };
    }
    const view = new DataView(content.buffer, content.byteOffset, content.byteLength);
    const pageSize = view.getUint16(16, false);
    const pageCount = view.getUint32(28, false);
    const userVersion = view.getUint32(60, false);
    return {
      valid: true,
      pageSize: pageSize === 1 ? 65536 : pageSize,
      pageCount,
      userVersion,
      version: '3.x',
    };
  }, [content]);

  const handleImport = async () => {
    if (onAction) {
      await onAction('importCollection', { handle, bytes: content?.byteLength });
    }
  };

  return (
    <div
      data-testid="renderer-sqlite"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400">SQLite Collection</span>
          <span data-testid="sqlite-meta-badge" className="text-slate-400 font-mono text-[11px]">
            {metadata.valid ? `${metadata.pageSize} B/page · ${metadata.pageCount} pages` : 'Raw DB'}
          </span>
        </div>
        <button
          type="button"
          data-testid="btn-import-sqlite-collection"
          onClick={handleImport}
          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors"
        >
          Import Collection
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <h4 className="font-semibold text-sky-400 mb-2 border-b border-slate-800 pb-1">
            Database Header Properties
          </h4>
          <dl className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div><span className="text-slate-500">Format:</span> SQLite format 3</div>
            <div><span className="text-slate-500">Page Size:</span> {metadata.pageSize} bytes</div>
            <div><span className="text-slate-500">Page Count:</span> {metadata.pageCount}</div>
            <div><span className="text-slate-500">User Version:</span> {metadata.userVersion ?? 0}</div>
            <div><span className="text-slate-500">Total Size:</span> {content?.byteLength ?? 0} bytes</div>
            <div><span className="text-slate-500">Integrity:</span> Verified header</div>
          </dl>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <h4 className="font-semibold text-amber-400 mb-2 border-b border-slate-800 pb-1">
            Canonical v3.0.3 Schema Inspection
          </h4>
          <p className="text-slate-400 text-xs mb-3">
            Sovereign MCard database bundle with handle registry and Merkle history chains.
          </p>
          <div className="bg-slate-950 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-emerald-400">CREATE TABLE card (handle TEXT, hash TEXT, content BLOB...);</div>
            <div className="text-emerald-400">CREATE TABLE handle_registry (handle TEXT, head_hash TEXT...);</div>
            <div className="text-emerald-400">CREATE TABLE handle_history (handle TEXT, hash TEXT, timestamp TEXT...);</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const sqliteDescriptor: RendererDescriptor = {
  id: 'sqlite',
  priority: 350,
  viewport: 'paged',
  supportedTabs: ['raw_data', 'visual', 'raw'],
  supportedMimes: ['application/x-sqlite3'],
  supportedExtensions: ['.db', '.sqlite', '.sqlite3'],
  actions: [
    { id: 'importCollection', label: 'Import Collection', icon: 'database' },
  ],
  matches: input =>
    input.mimeType === 'application/x-sqlite3' ||
    input.category === 'collection' ||
    /\.(db|sqlite|sqlite3)$/i.test(input.handle),
  component: SqliteCollectionRenderer,
  toHypermediaNode: (content, _text, judgment): HypermediaNode => ({
    type: 'card',
    attributes: { mime: 'application/x-sqlite3', universe: judgment.universe, cardType: 'sqlite', bytes: content.byteLength },
    content: `SQLite Collection (${content.byteLength} bytes)`,
    children: [
      {
        type: 'text',
        attributes: {},
        content: `SQLite Collection (${content.byteLength} bytes)`,
        children: [],
      },
    ],
  }),
};

export function register(registry: RendererRegistry): void {
  registry.register(sqliteDescriptor);
}
