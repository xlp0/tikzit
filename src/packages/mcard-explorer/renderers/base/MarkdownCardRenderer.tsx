import React, { useState, useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

function renderMarkdownLines(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeFence = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeFence) {
        elements.push(
          <pre key={`code-${i}`} className="p-2 my-2 bg-slate-950 text-emerald-400 rounded overflow-x-auto text-xs font-mono">
            {codeBuffer.join('\n')}
          </pre>
        );
        codeBuffer = [];
        inCodeFence = false;
      } else {
        inCodeFence = true;
      }
      continue;
    }

    if (inCodeFence) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold my-2 text-white border-b border-slate-700 pb-1">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-semibold my-2 text-slate-100">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold my-1.5 text-slate-200">{line.slice(4)}</h3>);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="border-l-4 border-indigo-500 pl-3 my-1 text-slate-400 italic">{line.slice(2)}</blockquote>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i} className="ml-4 list-disc text-slate-300">{line.slice(2)}</li>);
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-1 text-slate-300 leading-normal">{line}</p>);
    }
  }

  if (inCodeFence && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-end" className="p-2 my-2 bg-slate-950 text-emerald-400 rounded overflow-x-auto text-xs font-mono">
        {codeBuffer.join('\n')}
      </pre>
    );
  }

  return elements;
}

export const MarkdownCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  style,
}) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw' | 'split'>('split');

  const rawText = useMemo(() => {
    if (text) return text;
    try {
      return new TextDecoder().decode(content);
    } catch {
      return '';
    }
  }, [text, content]);

  return (
    <div
      data-testid="renderer-markdown"
      className="flex flex-col h-full w-full bg-slate-900 text-slate-200 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 select-none">
        <span className="font-semibold text-slate-400">Markdown Preview</span>
        <div className="flex items-center gap-1">
          {(['rendered', 'split', 'raw'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              data-testid={`toggle-markdown-${mode}`}
              onClick={() => setViewMode(mode)}
              className={`px-2 py-0.5 rounded capitalize text-[11px] transition-colors ${
                viewMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'raw' || viewMode === 'split') && (
          <div className={`overflow-auto p-3 font-mono text-xs ${viewMode === 'split' ? 'w-1/2 border-r border-slate-700' : 'w-full'}`}>
            <pre className="whitespace-pre-wrap break-words text-slate-400">{rawText}</pre>
          </div>
        )}
        {(viewMode === 'rendered' || viewMode === 'split') && (
          <div className={`overflow-auto p-4 prose-invert max-w-none ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            {renderMarkdownLines(rawText)}
          </div>
        )}
      </div>
    </div>
  );
};

export const markdownDescriptor: RendererDescriptor = {
  id: 'markdown',
  priority: 150,
  viewport: 'split',
  supportedTabs: ['visual', 'text', 'raw'],
  supportedMimes: ['text/markdown', 'text/x-markdown'],
  supportedExtensions: ['.md', '.markdown'],
  matches: input =>
    input.mimeType === 'text/markdown' ||
    input.mimeType === 'text/x-markdown' ||
    Boolean(input.handle?.endsWith('.md')) ||
    Boolean(input.handle?.endsWith('.markdown')),
  component: MarkdownCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => {
    const body = text || new TextDecoder().decode(content);
    return {
      type: 'card',
      attributes: { mime: 'text/markdown', universe: judgment.universe, cardType: 'markdown' },
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
  registry.register(markdownDescriptor);
}
