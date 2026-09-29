import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CardRow } from '../../../../src/packages/mcard-explorer/ui/CardRow';
import { projectBadges } from '../../../../src/packages/mcard-explorer/cards/projectBadges';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('CardRow & projectBadges (Sprint 37)', () => {
  it('37-DOD-06: renders markdown, PDF, diagram, and artifacts uniformly via projectBadges', () => {
    const dummyDirections: Direction[] = [
      { id: 'view', label: 'View', group: 'view', legality: () => true, execute: async () => ({ success: true }) },
      { id: 'rename', label: 'Rename', group: 'mutate', legality: () => true, execute: async () => ({ success: true }) }
    ];

    const createTestPos = (handle: string, overrides: Partial<Position> = {}): Position => ({
      id: `pos:${handle}`,
      handle,
      hash: 'h_test',
      mimeType: 'text/plain',
      surface: 'list',
      ...overrides
    });

    // 1. Diagram card
    const diagramPos = createTestPos('zx:diagrams:bell', {
      title: 'Bell State',
      category: 'diagram',
      universe: 'U0'
    });
    const diagramBadges = projectBadges(diagramPos);
    expect(diagramBadges.map(b => b.id)).toContain('diagram');

    const htmlDiagram = renderToString(
      <CardRow
        position={diagramPos}
        directions={dummyDirections}
        badges={diagramBadges}
        onExecute={vi.fn()}
      />
    );
    expect(htmlDiagram).toContain('data-testid="badge-diagram"');
    expect(htmlDiagram).toContain('Bell State');

    // 2. Draft card (mutable)
    const draftPos = createTestPos('draft:experiment', {
      title: 'Draft Experiment',
      meta: { mutable: true }
    });
    const draftBadges = projectBadges(draftPos);
    expect(draftBadges.map(b => b.id)).toContain('draft');

    const htmlDraft = renderToString(
      <CardRow
        position={draftPos}
        directions={dummyDirections}
        badges={draftBadges}
        onExecute={vi.fn()}
      />
    );
    expect(htmlDraft).toContain('data-testid="badge-draft"');

    // 3. Artifact export card
    const artifactPos = createTestPos('zx:artifacts:export/bell.pdf', {
      title: 'Exported Bell PDF'
    });
    const artifactBadges = projectBadges(artifactPos);
    expect(artifactBadges.map(b => b.id)).toContain('artifact');

    const htmlArtifact = renderToString(
      <CardRow
        position={artifactPos}
        directions={dummyDirections}
        badges={artifactBadges}
        onExecute={vi.fn()}
      />
    );
    expect(htmlArtifact).toContain('data-testid="badge-artifact"');
  });
});
