/**
 * tests/unit/workbench/UniversalCardViewerPanel.test.tsx - Sprint 34
 * Tests for UniversalCardViewerPanel Dockview component using SSR renderToString.
 * Contract D: <= 200 LOC ceiling.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { UniversalCardViewerPanel } from '../../../src/components/workbench/dockview/UniversalCardViewerPanel';
import { createWorkbenchStores } from '../../../src/stores/createWorkbenchStores';
import {
  ExplorerActionRegistry,
  type CardContentDto,
} from '../../../src/packages/mcard-explorer';

describe('UniversalCardViewerPanel (Sprint 34)', () => {
  it('renders dockview-card-viewer-panel container and handles empty state', () => {
    const html = renderToString(<UniversalCardViewerPanel />);
    expect(html).toContain('data-testid="dockview-card-viewer-panel"');
    expect(html).toContain('Select an MCard');
  });

  it('renders card when handle or card is passed via props', () => {
    const mockCard: CardContentDto = {
      handle: 'zx:diagrams:ghz',
      hash: 'blake3:7a4f91c84b2e6501',
      mimeType: 'text/x-tikz',
      payloadKind: 'text',
      content: new TextEncoder().encode('\\begin{tikzpicture}\n\\node {GHZ};\n\\end{tikzpicture}'),
      text: '\\begin{tikzpicture}\n\\node {GHZ};\n\\end{tikzpicture}',
      metadata: { universe: 'U0', category: 'diagram' },
    };

    const html = renderToString(
      <UniversalCardViewerPanel
        handle="zx:diagrams:ghz"
        card={mockCard}
      />
    );

    expect(html).toContain('data-testid="dockview-card-viewer-panel"');
    expect(html).toContain('data-testid="mcard-viewer"');
    expect(html).toContain('zx:diagrams:ghz');
    expect(html).toContain('data-testid="mcard-viewer-universe"');
    expect(html).toContain('U0');
    expect(html).toContain('btn-viewer-action-export-tikz');
    expect(html).toContain('btn-viewer-action-export-png');
  });

  it('reads $previewCardHandle from runtime stores', () => {
    const stores = createWorkbenchStores();
    stores.$previewCardHandle.set('docs:notes:quantum');

    const mockRuntime = {
      stores,
      mcardCollection: {
        resolveHandle: vi.fn().mockReturnValue(null),
        get: vi.fn().mockReturnValue(null),
      },
    } as any;

    const mockCard: CardContentDto = {
      handle: 'docs:notes:quantum',
      hash: 'blake3:hash123',
      mimeType: 'text/markdown',
      payloadKind: 'text',
      content: new TextEncoder().encode('# Notes on Quantum'),
      text: '# Notes on Quantum',
      metadata: { universe: 'U0', category: 'text' },
    };

    const html = renderToString(
      <UniversalCardViewerPanel
        runtime={mockRuntime}
        card={mockCard}
      />
    );

    expect(html).toContain('data-testid="dockview-card-viewer-panel"');
    expect(html).toContain('docs:notes:quantum');
  });

  it('mounts with custom actionRegistry without errors', () => {
    const registry = new ExplorerActionRegistry();
    const actionSpy = vi.fn().mockResolvedValue({ success: true });
    registry.register({
      id: 'export.tikz',
      label: 'Export TikZ',
      execute: actionSpy,
    });

    const mockCard: CardContentDto = {
      handle: 'zx:diagrams:test',
      hash: 'blake3:test',
      mimeType: 'text/x-tikz',
      payloadKind: 'text',
      content: new TextEncoder().encode('\\node {Test};'),
      text: '\\node {Test};',
      metadata: { universe: 'U0', category: 'diagram' },
    };

    const html = renderToString(
      <UniversalCardViewerPanel
        handle="zx:diagrams:test"
        card={mockCard}
        actionRegistry={registry}
      />
    );

    expect(html).toContain('data-testid="dockview-card-viewer-panel"');
    expect(html).toContain('btn-viewer-action-export-tikz');
  });
});
