import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { MCardExplorer } from '../../../../src/packages/mcard-explorer/ui/MCardExplorer';
import { ExplorerEngine } from '../../../../src/packages/mcard-explorer/core';
import type {
  ExplorerDataSource,
  ExplorerCardSummaryDto,
  CardContentDto,
  ExplorerSearchFilter,
  ExplorerHistoryEntryDto,
} from '../../../../src/packages/mcard-explorer/core/datasource/types';

class MockExplorerDataSource implements ExplorerDataSource {
  private cards: Map<string, CardContentDto> = new Map();

  public addCard(card: CardContentDto) {
    this.cards.set(card.handle, card);
  }

  async search(filter: ExplorerSearchFilter): Promise<ExplorerCardSummaryDto[]> {
    const list: ExplorerCardSummaryDto[] = [];
    for (const card of this.cards.values()) {
      if (filter.pattern && !card.handle.includes(filter.pattern)) continue;
      list.push({
        handle: card.handle,
        hash: card.hash,
        mimeType: card.mimeType,
        universe: (card as any).universe ?? 'U0',
        category: (card as any).category ?? 'diagram',
        payloadKind: card.payloadKind,
        updatedAt: new Date().toISOString(),
      });
    }
    return list;
  }

  async getContent(handle: string): Promise<CardContentDto | null> {
    return this.cards.get(handle) ?? null;
  }

  async getHistory(_handle: string): Promise<ExplorerHistoryEntryDto[]> {
    return [];
  }

  subscribe(_cb: (event: unknown) => void): () => void {
    return () => {};
  }
}

describe('Sprint 33: MCardExplorer Master Integration & Dual-Pane Layout', () => {
  let dataSource: MockExplorerDataSource;
  let engine: ExplorerEngine;

  beforeEach(async () => {
    dataSource = new MockExplorerDataSource();
    dataSource.addCard({
      handle: 'zx:diagrams:teleportation',
      hash: 'blake3:teleport123',
      content: new TextEncoder().encode('\\begin{tikzpicture}\\end{tikzpicture}'),
      text: '\\begin{tikzpicture}\\end{tikzpicture}',
      mimeType: 'text/x-tikz',
      payloadKind: 'text',
      metadata: { universe: 'U0' },
    });
    dataSource.addCard({
      handle: 'docs:notes:bell',
      hash: 'blake3:bell456',
      content: new TextEncoder().encode('# Bell Notes'),
      text: '# Bell Notes',
      mimeType: 'text/markdown',
      payloadKind: 'text',
      metadata: { universe: 'U0' },
    });

    engine = new ExplorerEngine(dataSource);
    await engine.init();
  });

  it('renders dual-pane composite explorer with tree/flat modes, facet bar, and preview viewer', async () => {
    engine.selectHandle('zx:diagrams:teleportation');
    const card = await dataSource.getContent('zx:diagrams:teleportation');

    const html = renderToString(
      <MCardExplorer engine={engine} activeCard={card} initialShowPreview={true} />
    );

    // Contract B selector checks
    expect(html).toContain('data-testid="mcard-explorer"');
    expect(html).toContain('data-testid="mcard-facet-bar"');
    expect(html).toContain('data-testid="toggle-preview-pane"');
    expect(html).toContain('data-testid="view-mode-tree"');
    expect(html).toContain('data-testid="view-mode-flat"');

    // Universe facet chips
    expect(html).toContain('data-testid="facet-chip-all"');
    expect(html).toContain('data-testid="facet-chip-diagram"');
    expect(html).toContain('data-testid="facet-chip-markdown"');
    expect(html).toContain('data-testid="facet-chip-data"');
    expect(html).toContain('data-testid="facet-chip-process"');
    expect(html).toContain('data-testid="facet-chip-proof"');
    expect(html).toContain('data-testid="facet-chip-conversation"');

    // Right Preview Pane: MCardViewer
    expect(html).toContain('data-testid="mcard-viewer"');
    expect(html).toContain('data-viewport-mode="zoom"');
    expect(html).toContain('zx:diagrams:teleportation');
    expect(html).toContain('text/x-tikz');
  });

  it('supports single pane mode when initialShowPreview is false', () => {
    const html = renderToString(
      <MCardExplorer engine={engine} initialShowPreview={false} />
    );

    expect(html).toContain('data-testid="mcard-explorer"');
    expect(html).toContain('data-testid="toggle-preview-pane"');
    // MCardViewer should not be mounted when preview is disabled
    expect(html).not.toContain('data-testid="mcard-viewer"');
  });

  it('allows facet switching and filtering through the engine', async () => {
    await engine.setFacet('notes');
    const state = engine.getState();
    expect(state.activeFacet).toBe('notes');
    expect(state.items.length).toBe(1);
    expect(state.items[0].handle).toBe('docs:notes:bell');
  });
});
