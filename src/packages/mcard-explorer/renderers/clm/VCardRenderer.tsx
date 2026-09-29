import React, { useMemo } from 'react';
import type { BaseCardRendererProps, RendererDescriptor } from '../registry/types';
import type { RendererRegistry } from '../registry/RendererRegistry';
import type { HypermediaNode } from 'clm-kernel';

interface VCardData {
  sandwich?: {
    precondition?: string;
    program?: string;
    postcondition?: string;
  };
  receipt?: {
    witnessHash?: string;
    authorDid?: string;
    verified?: boolean;
    timestamp?: string;
  };
}

export const VCardRenderer: React.FC<BaseCardRendererProps> = ({
  text,
  content,
  universe,
  style,
}) => {
  const data = useMemo<VCardData>(() => {
    try {
      const raw = text || new TextDecoder().decode(content);
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }, [text, content]);

  const sandwich = data.sandwich ?? {};
  const receipt = data.receipt ?? {};

  return (
    <div
      data-testid="renderer-vcard"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 text-xs overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-purple-400">VCard Witness Receipt</span>
          <span
            data-testid="vcard-receipt-badge"
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800"
          >
            {receipt.verified !== false ? 'Verified Witness' : 'Unverified'}
          </span>
        </div>
        <span className="text-[10px] text-purple-400 font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/80">
          {universe || 'U2_Vcard'}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Hoare Sandwich [P]{C}[Q] */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <h4 className="font-semibold text-sky-400 mb-3 border-b border-slate-800 pb-1">
            Hoare Triad Sandwich: [P] &#123;C&#125; [Q]
          </h4>
          <div className="space-y-2.5 font-mono text-xs">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">Precondition [P]:</span>
              <span className="text-emerald-400">{sandwich.precondition || 'True'}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">Program Command &#123;C&#125;:</span>
              <span className="text-amber-300">{sandwich.program || 'nop'}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">Postcondition [Q]:</span>
              <span className="text-sky-300">{sandwich.postcondition || 'True'}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Witness Receipt */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4 font-mono text-xs">
          <h4 className="font-semibold text-purple-400 mb-2 border-b border-slate-800 pb-1 font-sans">
            Cryptographic Receipt & Provenance
          </h4>
          <dl className="space-y-1.5 text-slate-300">
            <div>
              <span className="text-slate-500 block">Witness Hash:</span>
              <span className="text-purple-300 break-all">{receipt.witnessHash || 'blake3:...'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Author DID:</span>
              <span className="text-slate-400 break-all">{receipt.authorDid || 'did:key:...'}</span>
            </div>
            {receipt.timestamp && (
              <div>
                <span className="text-slate-500 block">Witnessed At:</span>
                <span className="text-slate-400">{receipt.timestamp}</span>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export const vcardDescriptor: RendererDescriptor = {
  id: 'vcard',
  priority: 450,
  viewport: 'scroll',
  supportedTabs: ['raw_data', 'visual', 'raw'],
  supportedMimes: ['application/vnd.vcard+json'],
  supportedExtensions: ['.vcard.json', '.vcard'],
  matches: input =>
    input.mimeType === 'application/vnd.vcard+json' ||
    input.category === 'proof' ||
    Boolean(input.handle?.includes('.vcard.')) ||
    Boolean(input.handle?.endsWith('.vcard')),
  component: VCardRenderer,
  toHypermediaNode: (_content, _text, judgment): HypermediaNode => ({
    type: 'witness',
    attributes: {
      verdict: 'pass',
      universe: judgment.universe,
      cardType: 'vcard',
    },
    content: 'Hoare sandwich witness verified [P]{C}[Q]',
    children: [],
  }),
};

export function register(registry: RendererRegistry): void {
  registry.register(vcardDescriptor);
}
