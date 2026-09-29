import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CardCompositionSurface } from '../../../../src/packages/mcard-explorer/ui/CardCompositionSurface';
import type { CardInterface } from '../../../../src/packages/mcard-explorer/cards/ports';

describe('CardCompositionSurface (Sprint 37)', () => {
  const cardTikz: CardInterface = {
    handle: 'zx:diagrams:ghz',
    hash: 'h_tikz',
    judgment: { mimeType: 'text/x-tikz', universe: 'U0' } as any,
    ports: [
      { id: 'in:source', direction: 'in', type: { mime: 'text/x-tikz' }, label: 'Source', required: true },
      { id: 'out:render', direction: 'out', type: { mime: 'image/svg+xml' }, label: 'Render SVG', required: false }
    ]
  };

  const cardViewer: CardInterface = {
    handle: 'app:svg-viewer',
    hash: 'h_viewer',
    judgment: { mimeType: 'application/json', universe: 'U0' } as any,
    ports: [
      { id: 'in:svg', direction: 'in', type: { mime: 'image/svg+xml' }, label: 'SVG Target', required: true }
    ]
  };

  const cardMarkdown: CardInterface = {
    handle: 'notes:doc',
    hash: 'h_doc',
    judgment: { mimeType: 'text/markdown', universe: 'U0' } as any,
    ports: [
      { id: 'out:data', direction: 'out', type: { mime: 'text/markdown' }, label: 'Markdown Data', required: false }
    ]
  };

  it('37-DOD-08: renders composition surface with tiles, ports, and commit button', () => {
    const html = renderToString(
      <CardCompositionSurface cards={[cardTikz, cardViewer]} onCommit={vi.fn()} />
    );

    // Contract B selectors
    expect(html).toContain('data-testid="composition-surface"');
    expect(html).toContain('data-testid="composition-commit"');
    expect(html).toContain('data-testid="composition-tile-zx:diagrams:ghz"');
    expect(html).toContain('data-testid="composition-tile-app:svg-viewer"');
    expect(html).toContain('data-testid="port-zx:diagrams:ghz-out:render"');
    expect(html).toContain('data-testid="port-app:svg-viewer-in:svg"');
  });

  it('37-DOD-09: guardrail negative absence: incompatible target has no port-target highlight', () => {
    const html = renderToString(
      <CardCompositionSurface cards={[cardMarkdown, cardViewer]} onCommit={vi.fn()} />
    );

    // When not dragged or incompatible, no port-target testids exist in the DOM
    expect(html).not.toContain('data-testid="port-target-');
  });
});
