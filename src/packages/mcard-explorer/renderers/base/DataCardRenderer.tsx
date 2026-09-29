import React, { useState, useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

interface TreeNodeProps {
  label: string;
  value: unknown;
  searchTerm: string;
  defaultExpanded?: boolean;
}

const JsonTreeNode: React.FC<TreeNodeProps> = ({ label, value, searchTerm, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (value === null) {
    return <div className="pl-4 py-0.5"><span className="text-purple-400 font-semibold">{label}:</span> <span className="text-slate-500 italic">null</span></div>;
  }

  if (typeof value === 'object') {
    const isArray = Array.isArray(value);
    const keys = Object.keys(value as Record<string, unknown>);
    const filteredKeys = searchTerm
      ? keys.filter(k => k.toLowerCase().includes(searchTerm.toLowerCase()) || JSON.stringify((value as Record<string, unknown>)[k]).toLowerCase().includes(searchTerm.toLowerCase()))
      : keys;

    return (
      <div data-testid="data-tree-node" className="pl-3 py-0.5">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white font-mono text-xs focus:outline-none"
        >
          <span className="text-slate-500 text-[10px] w-3">{expanded ? '▼' : '▶'}</span>
          <span className="text-sky-300 font-semibold">{label}</span>
          <span className="text-slate-500 text-[11px]">{isArray ? `[${keys.length}]` : `{${keys.length}}`}</span>
        </button>
        {expanded && (
          <div className="border-l border-slate-700/70 ml-1.5 mt-0.5 pl-2">
            {filteredKeys.map(k => (
              <JsonTreeNode key={k} label={k} value={(value as Record<string, unknown>)[k]} searchTerm={searchTerm} defaultExpanded={defaultExpanded} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const valStr = typeof value === 'string' ? `"${value}"` : String(value);
  const color = typeof value === 'string' ? 'text-emerald-400' : typeof value === 'number' ? 'text-amber-400' : 'text-indigo-400';

  return (
    <div className="pl-4 py-0.5 font-mono text-xs flex gap-2">
      <span className="text-purple-300 font-semibold">{label}:</span>
      <span className={`${color} break-all`}>{valStr}</span>
    </div>
  );
};

export const DataCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  onAction,
  style,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [defaultExpanded, setDefaultExpanded] = useState(true);

  const rawText = useMemo(() => {
    if (text) return text;
    try {
      return new TextDecoder().decode(content);
    } catch {
      return '';
    }
  }, [text, content]);

  const parsed = useMemo(() => {
    try {
      return { ok: true, data: JSON.parse(rawText) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, [rawText]);

  const handleCopy = async () => {
    if (onAction) {
      await onAction('copy', { text: rawText });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(rawText);
    }
  };

  return (
    <div
      data-testid="renderer-data"
      className="flex flex-col h-full w-full bg-slate-900 text-slate-200 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 select-none gap-2">
        <input
          type="text"
          data-testid="input-data-search"
          placeholder="Filter JSON keys/values..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-48"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="btn-expand-all"
            onClick={() => setDefaultExpanded(true)}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px]"
          >
            Expand
          </button>
          <button
            type="button"
            data-testid="btn-collapse-all"
            onClick={() => setDefaultExpanded(false)}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px]"
          >
            Collapse
          </button>
          <button
            type="button"
            data-testid="btn-copy-json"
            onClick={handleCopy}
            className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px]"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {parsed.ok ? (
          <JsonTreeNode label="root" value={parsed.data} searchTerm={searchTerm} defaultExpanded={defaultExpanded} />
        ) : (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded text-red-300">
            <div className="font-bold mb-1">Malformed Data Payload:</div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{rawText}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export const dataDescriptor: RendererDescriptor = {
  id: 'data',
  priority: 100,
  viewport: 'scroll',
  supportedTabs: ['raw_data', 'visual', 'raw'],
  supportedMimes: ['application/json', 'application/xml', 'text/json'],
  supportedExtensions: ['.json', '.xml'],
  matches: input =>
    input.mimeType === 'application/json' ||
    input.mimeType === 'application/xml' ||
    input.mimeType === 'text/json' ||
    Boolean(input.handle?.endsWith('.json')) ||
    Boolean(input.handle?.endsWith('.xml')),
  component: DataCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => {
    const body = text || new TextDecoder().decode(content);
    return {
      type: 'card',
      attributes: { mime: 'application/json', universe: judgment.universe, cardType: 'data' },
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
  registry.register(dataDescriptor);
}
