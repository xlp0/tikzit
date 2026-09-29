/** Concern 1: Satori XML/SVG AST decoding · Concern 2: Interactive canvas presentation */
import React, { useMemo, useState } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

interface SpeechAct {
  speaker?: string;
  timestamp?: string;
  message?: string;
  cards: string[];
  commands: string[];
}

function parseSatoriTurnXml(xml: string): SpeechAct {
  const speakerMatch = xml.match(/speaker=["']([^"']+)["']/);
  const timeMatch = xml.match(/timestamp=["']([^"']+)["']/);
  const msgMatch = xml.match(/<message>([\s\S]*?)<\/message>/);

  const cardMatches = Array.from(xml.matchAll(/<card\s+[^>]*handle=["']([^"']+)["'][^>]*\/>/g)).map(m => m[1]);
  const execMatches = Array.from(xml.matchAll(/<execute\s+[^>]*command=["']([^"']+)["'][^>]*\/>/g)).map(m => m[1]);

  return {
    speaker: speakerMatch ? speakerMatch[1] : 'agent',
    timestamp: timeMatch ? timeMatch[1] : undefined,
    message: msgMatch ? msgMatch[1].trim() : '',
    cards: cardMatches,
    commands: execMatches,
  };
}

export const SatoriCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  onAction,
  style,
}) => {
  const [continuation, setContinuation] = useState('');

  const xmlSource = useMemo(() => {
    if (text) return text;
    try {
      return new TextDecoder().decode(content);
    } catch {
      return '';
    }
  }, [text, content]);

  const act = useMemo(() => parseSatoriTurnXml(xmlSource), [xmlSource]);

  const handleCardClick = async (cardHandle: string) => {
    if (onAction) {
      await onAction('openCard', { handle: cardHandle });
    }
  };

  const handleSendContinuation = async () => {
    if (!continuation.trim()) return;
    if (onAction) {
      await onAction('continueTurn', { text: continuation });
    }
    setContinuation('');
  };

  return (
    <div
      data-testid="renderer-satori"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-rose-400">Satori Dialogue Turn</span>
          <span data-testid="satori-meta-badge" className="text-slate-400 text-[11px] font-mono">
            speaker: {act.speaker} {act.timestamp ? `· ${act.timestamp}` : ''}
          </span>
        </div>
        <span className="text-[10px] text-rose-400 font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/80">
          U3_Satori
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Dialogue Bubble */}
        <div
          data-testid="satori-turn-bubble"
          className="bg-slate-900 border border-slate-800 rounded-lg p-3 max-w-xl space-y-2 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-sky-400 capitalize">{act.speaker}</span>
            {act.timestamp && <span className="text-slate-500 text-[10px]">{act.timestamp}</span>}
          </div>

          {act.message && (
            <p className="text-slate-200 text-xs leading-relaxed">{act.message}</p>
          )}

          {act.cards.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-slate-500 text-[10px] font-semibold uppercase block">Embedded Cards:</span>
              <div className="flex flex-wrap gap-1.5">
                {act.cards.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCardClick(c)}
                    className="px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[11px] font-mono flex items-center gap-1 transition-colors"
                  >
                    <span>🗂</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {act.commands.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-slate-500 text-[10px] font-semibold uppercase block">Speech Act Commands:</span>
              <div className="flex flex-wrap gap-1">
                {act.commands.map((cmd, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800 font-mono text-[10px]">
                    ⚡ {cmd}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continuation Affordance */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          placeholder="Append dialogue continuation turn..."
          value={continuation}
          onChange={e => setContinuation(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSendContinuation(); }}
          className="flex-1 px-3 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs focus:outline-none focus:border-rose-500"
        />
        <button
          type="button"
          onClick={handleSendContinuation}
          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export const satoriDescriptor: RendererDescriptor = {
  id: 'satori',
  priority: 500,
  viewport: 'scroll',
  supportedTabs: ['visual', 'text', 'raw'],
  supportedMimes: ['application/vnd.satori.turn+xml'],
  supportedExtensions: ['.satori.xml', '.turn.xml'],
  actions: [
    { id: 'continueTurn', label: 'Reply', icon: 'message-square' },
  ],
  matches: input =>
    input.mimeType === 'application/vnd.satori.turn+xml' ||
    input.category === 'conversation' ||
    Boolean(input.handle?.includes('.satori.')) ||
    Boolean(input.handle?.endsWith('.satori.xml')),
  component: SatoriCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => {
    const body = text || new TextDecoder().decode(content);
    return {
      type: 'card',
      attributes: { mime: 'application/vnd.satori.turn+xml', universe: 'U3', cardType: 'satori' },
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
  registry.register(satoriDescriptor);
}
