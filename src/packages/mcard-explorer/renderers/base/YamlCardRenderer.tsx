import React, { useMemo, useState } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

export const YamlCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  onAction,
  style,
}) => {
  const [copied, setCopied] = useState(false);

  const rawText = useMemo(() => {
    if (text) return text;
    try {
      return new TextDecoder().decode(content);
    } catch {
      return '';
    }
  }, [text, content]);

  const lines = useMemo(() => rawText.split('\n'), [rawText]);

  const handleCopy = async () => {
    if (onAction) {
      await onAction('copy', { text: rawText });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(rawText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAsJson = async () => {
    // Basic key: value line parse to JSON
    const obj: Record<string, unknown> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf(':');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        obj[key] = val;
      }
    }
    const jsonStr = JSON.stringify(obj, null, 2);
    if (onAction) {
      await onAction('copyAsJson', { text: jsonStr });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(jsonStr);
    }
  };

  return (
    <div
      data-testid="renderer-yaml"
      className="flex flex-col h-full w-full bg-slate-900 text-slate-100 font-mono text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 select-none">
        <span data-testid="yaml-metadata-badge" className="text-slate-400">
          YAML · {lines.length} lines · {content?.byteLength ?? rawText.length} bytes
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="btn-copy-as-json"
            onClick={handleCopyAsJson}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] transition-colors"
          >
            Copy as JSON
          </button>
          <button
            type="button"
            data-testid="btn-copy-yaml"
            onClick={handleCopy}
            className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] transition-colors"
          >
            {copied ? 'Copied!' : 'Copy YAML'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 leading-relaxed">
        <pre className="m-0 p-0 whitespace-pre-wrap break-words">
          {lines.map((line, idx) => {
            const isComment = line.trim().startsWith('#');
            const isKey = line.includes(':') && !isComment;
            return (
              <div key={idx} className="flex hover:bg-slate-800/60">
                <span className="w-8 pr-2 select-none text-right text-slate-500 shrink-0">
                  {idx + 1}
                </span>
                <span className={isComment ? 'text-slate-500 italic' : isKey ? 'text-amber-300' : 'text-slate-200'}>
                  {line || '\u00A0'}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};

export const yamlDescriptor: RendererDescriptor = {
  id: 'yaml',
  priority: 120,
  viewport: 'split',
  supportedTabs: ['visual', 'text', 'raw'],
  supportedMimes: ['application/x-yaml', 'application/yaml', 'text/yaml'],
  supportedExtensions: ['.yaml', '.yml'],
  matches: input =>
    input.mimeType === 'application/x-yaml' ||
    input.mimeType === 'application/yaml' ||
    input.mimeType === 'text/yaml' ||
    Boolean(input.handle?.endsWith('.yaml')) ||
    Boolean(input.handle?.endsWith('.yml')),
  component: YamlCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => ({
    type: 'text',
    attributes: { mime: 'application/x-yaml', universe: judgment.universe },
    content: text || new TextDecoder().decode(content),
    children: [],
  }),
};

export function register(registry: RendererRegistry): void {
  registry.register(yamlDescriptor);
}
