import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  PolyInterfaceRegistry,
  hasExporter,
  type Position,
  type Direction
} from '../../src/packages/mcard-explorer/poly';
import { CardRow } from '../../src/packages/mcard-explorer/ui/CardRow';
import { projectBadges } from '../../src/packages/mcard-explorer/cards/projectBadges';
import { CardPortRegistry } from '../../src/packages/mcard-explorer/cards/ports';
import { portsCompatible } from '../../src/packages/mcard-explorer/cards/legality';
import { ZoomStack } from '../../src/packages/mcard-explorer/zoom/stack';
import { StructureRegistry } from '../../src/packages/mcard-explorer/zoom/providers';
import { validateBoundary, announceBoundaryViolation } from '../../src/packages/mcard-explorer/zoom/boundary';
import { OperationJournal } from '../../src/packages/mcard-explorer/time/journal';
import { CardCompositionSurface } from '../../src/packages/mcard-explorer/ui/CardCompositionSurface';
import type { TypeJudgment } from 'clm-kernel';

function makeJudgment(mime?: string): TypeJudgment {
  return {
    mime: mime ?? 'text/plain',
    universe: 'U0',
    isBinary: false,
    confidence: 1.0,
    category: 'data',
    matchedRule: 'default'
  };
}

describe('Guardrail Absence Proofs (40-DOD-02: 14 Cases)', () => {
  const registry = new PolyInterfaceRegistry();

  const dirRename: Direction = {
    id: 'rename',
    label: 'Rename',
    legality: (p) =>
      p.meta?.origin !== 'seed' &&
      !p.handle.startsWith('zx:examples:') &&
      !p.handle.startsWith('zx:artifacts:') &&
      p.meta?.mutable !== false,
    execute: async () => ({ success: true })
  };

  const dirArchive: Direction = {
    id: 'archive',
    label: 'Archive',
    legality: (p) =>
      p.meta?.origin !== 'seed' &&
      !p.handle.startsWith('zx:examples:') &&
      p.meta?.isImported !== true,
    execute: async () => ({ success: true })
  };

  const dirExport: Direction = {
    id: 'export',
    label: 'Export…',
    legality: (p) => hasExporter(p),
    execute: async () => ({ success: true })
  };

  const dirCompose: Direction = {
    id: 'compose',
    label: 'Compose',
    legality: (p) => {
      const portReg = new CardPortRegistry();
      return portReg.derivePorts({
        handle: p.handle,
        hash: p.hash,
        judgment: makeJudgment(p.mimeType)
      }).length > 0;
    },
    execute: async () => ({ success: true })
  };

  registry.register(dirRename);
  registry.register(dirArchive);
  registry.register(dirExport);
  registry.register(dirCompose);

  function renderCard(position: Position, directions: readonly Direction[]): string {
    const badges = projectBadges(position);
    return renderToString(
      React.createElement(CardRow, {
        position,
        directions,
        badges,
        onExecute: async () => {}
      })
    );
  }

  // Case 1: Seeded example (meta.origin: 'seed') -> Rename absent
  it('Case 1: Seeded example (meta.origin: "seed") -> Rename absent from DOM & zero disabled', () => {
    const pos: Position = {
      id: 'pos:seed1',
      handle: 'zx:examples:cnot',
      hash: 'h_seed',
      mimeType: 'text/vnd.tikz',
      surface: 'list',
      meta: { origin: 'seed' }
    };
    const dirs = registry.resolveDirections(pos);
    expect(dirs.some((d) => d.id === 'rename')).toBe(false);

    const html = renderCard(pos, dirs);
    expect(html).not.toContain('data-testid="direction-rename"');
    expect(html).not.toContain('disabled');
  });

  // Case 2: Seeded example -> Archive absent
  it('Case 2: Seeded example -> Archive absent from DOM & zero disabled', () => {
    const pos: Position = {
      id: 'pos:seed2',
      handle: 'zx:examples:bell',
      hash: 'h_seed2',
      mimeType: 'text/vnd.tikz',
      surface: 'list',
      meta: { origin: 'seed' }
    };
    const dirs = registry.resolveDirections(pos);
    expect(dirs.some((d) => d.id === 'archive')).toBe(false);

    const html = renderCard(pos, dirs);
    expect(html).not.toContain('data-testid="direction-archive"');
    expect(html).not.toContain('disabled');
  });

  // Case 3: zx:artifacts:* derived artifact -> Rename absent
  it('Case 3: zx:artifacts:* derived artifact -> Rename absent from DOM & zero disabled', () => {
    const pos: Position = {
      id: 'pos:art1',
      handle: 'zx:artifacts:plot.png',
      hash: 'h_art',
      mimeType: 'image/png',
      surface: 'list',
      category: 'artifact'
    };
    const dirs = registry.resolveDirections(pos);
    expect(dirs.some((d) => d.id === 'rename')).toBe(false);

    const html = renderCard(pos, dirs);
    expect(html).not.toContain('data-testid="direction-rename"');
    expect(html).not.toContain('disabled');
  });

  // Case 4: Legacy-imported card -> Archive absent
  it('Case 4: Legacy-imported card -> Archive absent from DOM & zero disabled', () => {
    const pos: Position = {
      id: 'pos:imp1',
      handle: 'zx:diagrams:legacy-circuit',
      hash: 'h_imp',
      mimeType: 'text/vnd.tikz',
      surface: 'list',
      meta: { isImported: true }
    };
    const dirs = registry.resolveDirections(pos);
    expect(dirs.some((d) => d.id === 'archive')).toBe(false);

    const html = renderCard(pos, dirs);
    expect(html).not.toContain('data-testid="direction-archive"');
    expect(html).not.toContain('disabled');
  });

  // Case 5: Card with no exporter -> Export... absent
  it('Case 5: Card with no exporter -> Export… absent from DOM & zero disabled', () => {
    const pos: Position = {
      id: 'pos:noexp',
      handle: 'data:raw',
      hash: 'h_noexp',
      mimeType: 'application/octet-stream',
      surface: 'list',
      meta: { exportFormats: [] }
    };
    const dirs = registry.resolveDirections(pos);
    expect(dirs.some((d) => d.id === 'export')).toBe(false);

    const html = renderCard(pos, dirs);
    expect(html).not.toContain('data-testid="direction-export"');
    expect(html).not.toContain('disabled');
  });

  // Case 6: Card with no registered structure provider -> Zoom enter absent
  it('Case 6: Card with no registered structure provider -> Zoom enter absent', () => {
    const structureReg = new StructureRegistry();
    const zoomStack = new ZoomStack(structureReg, { getContent: async () => null });
    const pos: Position = {
      id: 'pos:unstructured',
      handle: 'raw:binary',
      hash: 'h_bin',
      mimeType: 'application/x-unknown-custom-blob',
      surface: 'tree'
    };

    const zoomDirs = zoomStack.resolveZoomDirections(pos);
    expect(zoomDirs.some((d) => d.id === 'zoom.enter')).toBe(false);
  });

  // Case 7: Markdown position in composition surface -> Drop on TikZ in:source absent
  it('Case 7: Markdown position dropped on TikZ in:source -> absent drop target', () => {
    const mdPort = {
      id: 'out:md',
      direction: 'out' as const,
      type: { mime: 'text/markdown' },
      label: 'MD Out',
      required: true
    };
    const tikzInPort = {
      id: 'in:source',
      direction: 'in' as const,
      type: { mime: 'text/vnd.tikz' },
      label: 'TikZ In',
      required: true
    };

    const match = portsCompatible(mdPort, tikzInPort);
    expect(match.ok).toBe(false);
    if (!match.ok) {
      expect(match.reason).toBe('mime-mismatch');
    }
  });

  // Case 8: PNG position -> Drop on PCard in:token absent
  it('Case 8: PNG position dropped on PCard in:token -> absent drop target', () => {
    const pngPort = {
      id: 'out:png',
      direction: 'out' as const,
      type: { mime: 'image/png' },
      label: 'PNG Image',
      required: true
    };
    const pcardTokenPort = {
      id: 'in:token',
      direction: 'in' as const,
      type: { mime: 'application/x-pcard-token' },
      label: 'Token Input',
      required: true
    };

    const match = portsCompatible(pngPort, pcardTokenPort);
    expect(match.ok).toBe(false);
    if (!match.ok) {
      expect(match.reason).toBe('mime-mismatch');
    }
  });

  // Case 9: one-arity consumer fed by many producers -> Wire commit absent
  it('Case 9: one-arity consumer fed by many producers -> Wire commit absent', () => {
    const producer = {
      id: 'out:stream',
      direction: 'out' as const,
      type: { mime: 'text/plain', arity: 'many' as const },
      label: 'Many Out',
      required: true
    };
    const singleConsumer = {
      id: 'in:single',
      direction: 'in' as const,
      type: { mime: 'text/plain', arity: 'one' as const },
      label: 'One In',
      required: true
    };

    const match = portsCompatible(producer, singleConsumer);
    expect(match.ok).toBe(false);
    if (!match.ok) {
      expect(match.reason).toBe('arity-conflict');
    }
  });

  // Case 10: Inner composition that retypes an outer-exposed port -> Commit absent + announced
  it('Case 10: Inner composition retyping outer port -> Commit absent + reason announced', async () => {
    const outer = {
      handle: 'outer:card',
      hash: 'h_out',
      judgment: makeJudgment('text/vnd.tikz'),
      ports: [
        {
          id: 'port:main',
          direction: 'in' as const,
          type: { mime: 'text/vnd.tikz' },
          label: 'TikZ Port',
          required: true
        }
      ]
    };

    // Inner plan retypes port:main to image/png
    const innerPlan = {
      op: 'substitute' as const,
      operands: [],
      wires: [],
      unbound: [
        {
          id: 'port:main',
          direction: 'in' as const,
          type: { mime: 'image/png' },
          label: 'Retyped to PNG',
          required: true
        }
      ],
      legality: { ok: true, reasons: [] }
    };

    const verdict = await validateBoundary(innerPlan, outer, portsCompatible);
    expect(verdict.ok).toBe(false);

    const announcer = { textContent: '' };
    announceBoundaryViolation(verdict, announcer);
    expect(announcer.textContent).toContain('Boundary validation failed');
    expect(announcer.textContent).toContain('port:main');
  });

  // Case 11: Empty journal -> Undo absent
  it('Case 11: Empty journal -> Undo direction absent', () => {
    const journal = new OperationJournal();
    expect(journal.isClean()).toBe(true);

    const undoLegality = () => !journal.isClean();
    expect(undoLegality()).toBe(false);
  });

  // Case 12: Empty fiber position -> Enter default direction is no-op with 0 resolved
  it('Case 12: Empty fiber position -> Enter default direction is no-op with 0 resolved', () => {
    const emptyRegistry = new PolyInterfaceRegistry();
    const pos: Position = {
      id: 'pos:inert',
      handle: 'inert:item',
      hash: 'h_inert',
      mimeType: 'application/x-inert',
      surface: 'list'
    };

    const legalDirs = emptyRegistry.resolveDirections(pos);
    expect(legalDirs).toHaveLength(0);

    const defaultDir = legalDirs.find((d) => d.default);
    expect(defaultDir).toBeUndefined();
  });

  // Case 13: Card type with no provider (binary blob) -> Compose absent
  it('Case 13: Card type with no provider (binary blob) -> Compose absent', () => {
    const pos: Position = {
      id: 'pos:rawblob',
      handle: 'blob:unknown',
      hash: 'h_blob',
      mimeType: 'application/x-opaque-binary',
      surface: 'list'
    };

    const dirs = registry.resolveDirections(pos);
    expect(dirs.some((d) => d.id === 'compose')).toBe(false);

    const html = renderCard(pos, dirs);
    expect(html).not.toContain('data-testid="direction-compose"');
    expect(html).not.toContain('disabled');
  });

  // Case 14: Zoom at maximum depth -> Zoom enter absent
  it('Case 14: Zoom at maximum depth -> Zoom enter absent', async () => {
    const structureReg = new StructureRegistry();
    structureReg.register({
      id: 'dummy.provider',
      appliesTo: () => true,
      deriveStructure: async () => []
    });

    const zoomStack = new ZoomStack(structureReg, { getContent: async () => null }, { maxDepth: 2 });
    const pos: Position = {
      id: 'pos:deep',
      handle: 'card:deep',
      hash: 'h_deep',
      mimeType: 'text/vnd.tikz',
      surface: 'tree'
    };

    // Zoom down to max depth 2
    await zoomStack.enter(pos, 'card:level1');
    await zoomStack.enter(pos, 'card:level2');

    const dirs = zoomStack.resolveZoomDirections(pos);
    expect(dirs.some((d) => d.id === 'zoom.enter')).toBe(false);
  });
});
