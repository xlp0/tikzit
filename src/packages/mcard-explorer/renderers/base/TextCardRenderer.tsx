import React, { useState, useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

export const TextCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  onAction,
  style,
}) => {
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [copied, setCopied] = useState(false);

  const displayText = useMemo(() => {
    if (text) return text;
    try {
      return new TextDecoder().decode(content);
    } catch {
      return '';
    }
  }, [text, content]);

  const lines = useMemo(() => displayText.split('\n'), [displayText]);

  const handleCopy = async () => {
    if (onAction) {
      await onAction('copy', { text: displayText });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(displayText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="renderer-text"
      className="flex flex-col h-full w-full bg-slate-900 text-slate-100 font-mono text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 select-none">
        <span data-testid="text-metadata-badge" className="text-slate-400">
          {lines.length} lines · {content?.byteLength ?? displayText.length} bytes
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="btn-toggle-line-numbers"
            onClick={() => setShowLineNumbers(v => !v)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              showLineNumbers ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            #
          </button>
          <button
            type="button"
            data-testid="btn-toggle-word-wrap"
            onClick={() => setWordWrap(v => !v)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              wordWrap ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Wrap
          </button>
          <button
            type="button"
            data-testid="btn-copy-text"
            onClick={handleCopy}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 leading-relaxed">
        <pre className={`m-0 p-0 ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'}`}>
          {lines.map((line, idx) => (
            <div key={idx} className="flex hover:bg-slate-800/60">
              {showLineNumbers && (
                <span className="w-10 pr-3 select-none text-right text-slate-500 shrink-0">
                  {idx + 1}
                </span>
              )}
              <span className="flex-1">{line || '\u00A0'}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

export const textDescriptor: RendererDescriptor = {
  id: 'text',
  priority: 50,
  viewport: 'scroll',
  supportedTabs: ['text', 'raw'],
  supportedMimes: ['text/plain', 'text/*'],
  supportedExtensions: ['.txt', '.text', '.log'],
  actions: [
    { id: 'copy', label: 'Copy Text', icon: 'clipboard' },
  ],
  matches: input =>
    input.mimeType.startsWith('text/') ||
    input.mimeType === 'text/plain' ||
    (!input.isBinary && input.mimeType === ''),
  component: TextCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => ({
    type: 'text',
    attributes: { mime: judgment.mime, universe: judgment.universe },
    content: text || new TextDecoder().decode(content),
    children: [],
  }),
};

export function register(registry: RendererRegistry): void {
  registry.register(textDescriptor);
  registry.registerFallback('text', textDescriptor);
}
