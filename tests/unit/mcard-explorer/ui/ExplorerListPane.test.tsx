import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ExplorerListPane } from '../../../../src/packages/mcard-explorer/ui/ExplorerListPane';
import { PolyInterfaceRegistry } from '../../../../src/packages/mcard-explorer/poly/registry';
import type { ExplorerCardSummaryDto } from '../../../../src/packages/mcard-explorer/core/datasource/types';

describe('ExplorerListPane (Affordance Rendering)', () => {
  const dummyItems: ExplorerCardSummaryDto[] = [
    {
      handle: 'zx:diagrams:ghz',
      hash: 'h1',
      mimeType: 'text/x-tikz',
      universe: 'U2',
      category: 'diagram',
      updatedAt: '2026-09-01T00:00:00Z'
    }
  ];

  it('renders directions returned exclusively by registry.resolveDirections(position)', () => {
    const reg = new PolyInterfaceRegistry();

    reg.register({
      id: 'card.export.svg',
      label: 'Export SVG',
      legality: () => true,
      execute: async () => ({ success: true })
    });

    reg.register({
      id: 'card.rename',
      label: 'Rename',
      legality: () => false, // ILLEGAL: must be completely absent from DOM
      execute: async () => ({ success: true })
    });

    const html = renderToString(
      <ExplorerListPane
        items={dummyItems}
        tree={[]}
        viewMode="flat"
        activeHandle="zx:diagrams:ghz"
        selectedHandles={['zx:diagrams:ghz']}
        expandedFolders={[]}
        polyRegistry={reg}
        onSelect={vi.fn()}
        onToggleFolder={vi.fn()}
      />
    );

    // Legal direction must be present
    expect(html).toContain('data-testid="direction-card.export.svg"');
    expect(html).toContain('Export SVG');

    // Illegal direction must be COMPLETELY ABSENT from DOM (not disabled)
    expect(html).not.toContain('data-testid="direction-card.rename"');
    expect(html).not.toContain('Rename');
  });

  it('displays empty state when items is empty', () => {
    const html = renderToString(
      <ExplorerListPane
        items={[]}
        tree={[]}
        viewMode="flat"
        activeHandle={null}
        selectedHandles={[]}
        expandedFolders={[]}
        onSelect={vi.fn()}
        onToggleFolder={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="mcard-empty-state"');
    expect(html).toContain('No cards found.');
  });
});
