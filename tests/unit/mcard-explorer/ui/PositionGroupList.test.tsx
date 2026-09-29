import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PositionGroupList } from '../../../../src/packages/mcard-explorer/ui/PositionGroupList';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('PositionGroupList (Sprint 37)', () => {
  it('37-DOD-07: renders positions using resolved directions with zero callback forwarding', () => {
    const positions: Position[] = [
      {
        id: 'pos:1',
        handle: 'zx:diagrams:teleportation',
        hash: 'h1',
        mimeType: 'text/x-tikz',
        surface: 'list',
        title: 'Teleportation',
        category: 'diagram'
      },
      {
        id: 'pos:2',
        handle: 'docs:notes',
        hash: 'h2',
        mimeType: 'text/markdown',
        surface: 'list',
        title: 'Notes',
        meta: { mutable: true }
      }
    ];

    const resolveDirections = (pos: Position): Direction[] => [
      {
        id: 'view',
        label: `View ${pos.handle}`,
        group: 'view',
        legality: () => true,
        execute: async () => ({ success: true })
      }
    ];

    const html = renderToString(
      <PositionGroupList
        positions={positions}
        resolveDirections={resolveDirections}
        onExecute={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="position-group-list"');
    expect(html).toContain('data-testid="card-row-zx:diagrams:teleportation"');
    expect(html).toContain('data-testid="card-row-docs:notes"');
    expect(html).toContain('data-testid="badge-diagram"');
    expect(html).toContain('data-testid="badge-draft"');
  });

  it('renders empty text when positions array is empty', () => {
    const html = renderToString(
      <PositionGroupList
        positions={[]}
        resolveDirections={() => []}
        emptyText="No positions found."
      />
    );

    expect(html).toContain('data-testid="position-group-empty"');
    expect(html).toContain('No positions found.');
  });
});
