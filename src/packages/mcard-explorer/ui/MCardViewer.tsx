import React, { useState, useEffect, useMemo } from 'react';
import type { CardContentDto, CardContentProvider } from '../core/datasource/types';
import type { RendererRegistry } from '../renderers/registry/RendererRegistry';
import { RendererRegistry as DefaultRegistry } from '../renderers/registry/RendererRegistry';
import { registerBaseViewlets } from '../renderers/base';
import { registerClmViewlets } from '../renderers/clm';
import type { TypeJudgment, HypermediaNode } from 'clm-kernel';
import { MCardViewerToolbar } from './MCardViewerToolbar';

export interface MCardViewerProps {
  card?: CardContentDto | null;
  handle?: string;
  contentProvider?: CardContentProvider;
  registry?: RendererRegistry;
  typeJudgment?: TypeJudgment;
  onAction?: (actionId: string, payload?: unknown) => Promise<void>;
  className?: string;
  style?: React.CSSProperties;
}

let sharedRegistry: RendererRegistry | null = null;
function getSharedRegistry(): RendererRegistry {
  if (!sharedRegistry) {
    sharedRegistry = new DefaultRegistry();
    registerBaseViewlets(sharedRegistry);
    registerClmViewlets(sharedRegistry);
  }
  return sharedRegistry;
}

export function renderCardToHypermedia(
  card: CardContentDto,
  registry: RendererRegistry = getSharedRegistry()
): HypermediaNode {
  const universe = card.typeJudgment?.universe ?? (card.metadata?.universe as string | undefined);
  const category = card.typeJudgment?.category ?? (card.metadata?.category as string | undefined);
  const descriptor = registry.resolve({
    mimeType: card.mimeType,
    handle: card.handle,
    isBinary: card.content?.byteLength ? card.mimeType.startsWith('image/') || card.mimeType === 'application/pdf' || card.mimeType === 'application/x-sqlite3' : false,
    universe,
    category,
    payloadKind: card.payloadKind,
    content: card.content,
  });

  if (descriptor.toHypermediaNode) {
    return descriptor.toHypermediaNode(card.content, card.text, {
      mime: card.mimeType,
      universe: universe ?? 'U0',
      category: category ?? 'data',
    });
  }

  return {
    type: 'card',
    attributes: { mime: card.mimeType, cardType: descriptor.id },
    content: card.text || `[Card: ${card.handle}]`,
    children: [],
  };
}

export const MCardViewer: React.FC<MCardViewerProps> = ({
  card: cardProp,
  handle,
  contentProvider,
  registry: registryProp,
  typeJudgment,
  onAction,
  className = '',
  style,
}) => {
  const registry = registryProp ?? getSharedRegistry();
  const [fetchedCard, setFetchedCard] = useState<CardContentDto | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cardProp && handle && contentProvider) {
      setLoading(true);
      contentProvider
        .getContent(handle)
        .then(c => { setFetchedCard(c); setLoading(false); })
        .catch(() => { setFetchedCard(null); setLoading(false); });
    }
  }, [cardProp, handle, contentProvider]);

  const activeCard = cardProp ?? fetchedCard;

  const resolution = useMemo(() => {
    if (!activeCard) return null;
    const isBinary = Boolean(
      activeCard.content?.byteLength &&
      (activeCard.mimeType.startsWith('image/') ||
        activeCard.mimeType === 'application/pdf' ||
        activeCard.mimeType === 'application/x-sqlite3' ||
        activeCard.mimeType === 'application/octet-stream')
    );
    // Sprint 35 Phase C: precedence — explicit prop → fetched card's own
    // typeJudgment → metadata hints → defaults. Previously ignored
    // activeCard.typeJudgment, so U1/U2/U3 cards badged as U0/data.
    const universe =
      typeJudgment?.universe ??
      activeCard.typeJudgment?.universe ??
      (activeCard.metadata?.universe as string | undefined) ??
      'U0';
    const category =
      typeJudgment?.category ??
      activeCard.typeJudgment?.category ??
      (activeCard.metadata?.category as string | undefined) ??
      'data';
    const descriptor = registry.resolve({
      mimeType: activeCard.mimeType,
      handle: activeCard.handle,
      isBinary,
      universe,
      category,
      payloadKind: activeCard.payloadKind,
      content: activeCard.content,
    });
    return { descriptor, isBinary, universe, category };
  }, [activeCard, registry, typeJudgment]);

  if (loading) {
    return (
      <div data-testid="mcard-viewer" className="flex items-center justify-center h-full text-slate-400 bg-slate-900 text-xs">
        <span data-testid="mcard-viewer-loading">Loading card payload...</span>
      </div>
    );
  }

  if (!activeCard || !resolution) {
    return (
      <div data-testid="mcard-viewer" className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-900 text-xs p-6 text-center">
        <span data-testid="mcard-viewer-empty">Select an MCard to inspect its multimodal rendering.</span>
      </div>
    );
  }

  const { descriptor, universe } = resolution;
  const viewportMode = descriptor.viewport ?? 'scroll';
  const Component = descriptor.component;
  return (
    <div
      data-testid="mcard-viewer"
      data-viewport-mode={viewportMode}
      className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden ${className}`}
      style={style}
    >
      {/* Sprint 35: Extracted toolbar with Export ▾ dropdown */}
      <MCardViewerToolbar
        card={activeCard}
        descriptor={descriptor}
        viewportMode={viewportMode}
        universe={universe}
        onAction={onAction}
      />
      <div className="flex-1 overflow-hidden relative">
        <Component
          handle={activeCard.handle}
          hash={activeCard.hash}
          content={activeCard.content}
          text={activeCard.text}
          mimeType={activeCard.mimeType}
          universe={universe}
          category={resolution.category}
          metadata={activeCard.metadata}
          onAction={onAction}
        />
      </div>
    </div>
  );
};
