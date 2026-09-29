/** Concern 1: Petri net transition inspection · Concern 2: Execution trace playback */
import React, { useMemo, useState } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

interface Place {
  id: string;
  label?: string;
  tokens?: number;
}

interface Transition {
  id: string;
  label?: string;
}

interface Arc {
  source: string;
  target: string;
}

interface PetriNet {
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
}

export const PCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  onAction,
  style,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const net = useMemo<PetriNet>(() => {
    try {
      const raw = text || new TextDecoder().decode(content);
      const parsed = JSON.parse(raw);
      return {
        places: parsed.places ?? [],
        transitions: parsed.transitions ?? [],
        arcs: parsed.arcs ?? [],
      };
    } catch {
      return { places: [], transitions: [], arcs: [] };
    }
  }, [text, content]);

  const handleFireTransition = async (tId: string) => {
    setActiveStep(s => s + 1);
    if (onAction) {
      await onAction('fireTransition', { transitionId: tId, step: activeStep + 1 });
    }
  };

  return (
    <div
      data-testid="renderer-pcard"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-400">PCard Process (Petri Net)</span>
          <span data-testid="pcard-meta-badge" className="text-slate-400 font-mono text-[11px]">
            {net.places.length} places · {net.transitions.length} transitions · {net.arcs.length} arcs
          </span>
        </div>
        <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
          U1_Pcard
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Topology summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-3">
            <h4 className="font-semibold text-sky-400 mb-2 border-b border-slate-800 pb-1">Places (P)</h4>
            <div className="space-y-1.5 font-mono text-xs">
              {net.places.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-950 px-2.5 py-1 rounded">
                  <span className="text-slate-300">{p.label || p.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    (p.tokens ?? 0) > 0 ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {p.tokens ?? 0} tokens
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded p-3">
            <h4 className="font-semibold text-emerald-400 mb-2 border-b border-slate-800 pb-1">Transitions (T)</h4>
            <div className="space-y-1.5 font-mono text-xs">
              {net.transitions.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-slate-950 px-2.5 py-1 rounded">
                  <span className="text-slate-300">{t.label || t.id}</span>
                  <button
                    type="button"
                    data-testid="btn-fire-transition"
                    onClick={() => handleFireTransition(t.id)}
                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold"
                  >
                    Fire
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Directed Flow Arcs */}
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <h4 className="font-semibold text-slate-300 mb-2 border-b border-slate-800 pb-1">Flow Relations (F)</h4>
          <div className="flex flex-wrap gap-2 font-mono text-[11px]">
            {net.arcs.map((a, idx) => (
              <span key={idx} className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-400">
                {a.source} → {a.target}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const pcardDescriptor: RendererDescriptor = {
  id: 'pcard',
  priority: 400,
  viewport: 'fit',
  supportedTabs: ['visual', 'raw_data', 'raw'],
  supportedMimes: ['application/vnd.pcard+json'],
  supportedExtensions: ['.pcard.json', '.pcard'],
  actions: [
    { id: 'fireTransition', label: 'Fire Transition', icon: 'play' },
  ],
  matches: input =>
    input.mimeType === 'application/vnd.pcard+json' ||
    input.category === 'process' ||
    Boolean(input.handle?.includes('.pcard.')) ||
    Boolean(input.handle?.endsWith('.pcard')),
  component: PCardRenderer,
  toHypermediaNode: (content, text, judgment): HypermediaNode => {
    const body = text || new TextDecoder().decode(content);
    return {
      type: 'card',
      attributes: { mime: 'application/vnd.pcard+json', universe: 'U1', cardType: 'pcard' },
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
  registry.register(pcardDescriptor);
}
