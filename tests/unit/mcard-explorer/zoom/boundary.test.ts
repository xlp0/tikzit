import { describe, it, expect } from 'vitest';
import {
  validateBoundary,
  announceBoundaryViolation,
  type BoundaryVerdict
} from '../../../../src/packages/mcard-explorer/zoom/boundary';
import { portsCompatible, type CardInterface, type CompositionPlan } from '../../../../src/packages/mcard-explorer/cards';
import type { TypeJudgment } from 'clm-kernel';

describe('Boundary Consistency Validation (Sprint 38)', () => {
  const dummyJudgment: TypeJudgment = {
    mime: 'application/json',
    universe: 'U0',
    category: 'diagram',
    confidence: 1,
    isBinary: false,
    matchedRule: 'test'
  };

  const outerInterface: CardInterface = {
    handle: 'outer:diagram',
    hash: 'h_outer',
    judgment: dummyJudgment,
    ports: [
      {
        id: 'in:source',
        direction: 'in',
        type: { mime: 'text/x-tikz', universe: 'U0', arity: 'one' },
        label: 'Source',
        required: true
      },
      {
        id: 'out:render',
        direction: 'out',
        type: { mime: 'image/svg+xml', universe: 'U0', arity: 'one' },
        label: 'Render',
        required: false
      }
    ]
  };

  it('38-DOD-07: accepts inner compositions that preserve outer-exposed ports (adding ports allowed)', async () => {
    // Inner composition plan that retains in:source and out:render and adds out:meta
    const validPlan: CompositionPlan = {
      op: 'tensor',
      operands: [],
      wires: [],
      unbound: [
        {
          id: 'in:source',
          direction: 'in',
          type: { mime: 'text/x-tikz', universe: 'U0', arity: 'one' },
          label: 'Source',
          required: true
        },
        {
          id: 'out:render',
          direction: 'out',
          type: { mime: 'image/svg+xml', universe: 'U0', arity: 'one' },
          label: 'Render',
          required: false
        },
        {
          id: 'out:meta',
          direction: 'out',
          type: { mime: 'application/json', universe: 'U0', arity: 'one' },
          label: 'Extra Meta',
          required: false
        }
      ],
      legality: { ok: true, reasons: [] }
    };

    const verdict = await validateBoundary(validPlan, outerInterface, portsCompatible);
    expect(verdict.ok).toBe(true);
  });

  it('38-DOD-07: rejects inner compositions that remove or retype an outer-exposed port', async () => {
    // Inner plan missing 'out:render' and retyping 'in:source' to text/plain
    const invalidPlan: CompositionPlan = {
      op: 'tensor',
      operands: [],
      wires: [],
      unbound: [
        {
          id: 'in:source',
          direction: 'in',
          type: { mime: 'text/plain', universe: 'U0', arity: 'one' }, // Mismatched mime
          label: 'Plain Source',
          required: true
        }
      ],
      legality: { ok: true, reasons: [] }
    };

    const verdict = await validateBoundary(invalidPlan, outerInterface, portsCompatible);
    expect(verdict.ok).toBe(false);

    if (!verdict.ok) {
      expect(verdict.violations.length).toBe(2);
      expect(verdict.violations.some(v => v.portId === 'out:render')).toBe(true);
      expect(verdict.violations.some(v => v.portId === 'in:source' && v.reason.reason === 'mime-mismatch')).toBe(true);
    }
  });

  it('38-DOD-07: dispatches accessible explanation to live-announcer on boundary violation', async () => {
    const invalidVerdict: BoundaryVerdict = {
      ok: false,
      violations: [
        {
          portId: 'out:render',
          reason: { ok: false, reason: 'mime-mismatch' }
        }
      ]
    };

    const mockAnnouncer = { textContent: '' };
    announceBoundaryViolation(invalidVerdict, mockAnnouncer);

    expect(mockAnnouncer.textContent).toContain('Boundary validation failed');
    expect(mockAnnouncer.textContent).toContain('out:render');
    expect(mockAnnouncer.textContent).toContain('mime-mismatch');
  });
});
