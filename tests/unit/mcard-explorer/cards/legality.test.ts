import { describe, it, expect } from 'vitest';
import type { CardPort } from '../../../../src/packages/mcard-explorer/cards/ports';
import { portsCompatible } from '../../../../src/packages/mcard-explorer/cards/legality';

describe('Port Legality & Discrimination Engine (Sprint 37)', () => {
  it('37-DOD-03: discriminates all 4 port incompatibility reasons', () => {
    // 1. direction-conflict: out to out or in to in
    const pOut1: CardPort = {
      id: 'out:1',
      direction: 'out',
      type: { mime: 'image/svg+xml' },
      label: 'Out 1',
      required: false
    };
    const pOut2: CardPort = {
      id: 'out:2',
      direction: 'out',
      type: { mime: 'image/svg+xml' },
      label: 'Out 2',
      required: false
    };
    expect(portsCompatible(pOut1, pOut2)).toEqual({
      ok: false,
      reason: 'direction-conflict'
    });

    // 2. arity-conflict: many into one
    const pMany: CardPort = {
      id: 'out:many',
      direction: 'out',
      type: { mime: 'application/json', arity: 'many' },
      label: 'Many Tokens',
      required: false
    };
    const pOne: CardPort = {
      id: 'in:one',
      direction: 'in',
      type: { mime: 'application/json', arity: 'one' },
      label: 'Single Token',
      required: true
    };
    expect(portsCompatible(pMany, pOne)).toEqual({
      ok: false,
      reason: 'arity-conflict'
    });

    // 3. universe-incompatible: higher universe into lower universe (U2 -> U0)
    const pU2: CardPort = {
      id: 'out:u2',
      direction: 'out',
      type: { mime: 'text/plain', universe: 'U2' },
      label: 'U2 Out',
      required: false
    };
    const pU0: CardPort = {
      id: 'in:u0',
      direction: 'in',
      type: { mime: 'text/plain', universe: 'U0' },
      label: 'U0 In',
      required: true
    };
    expect(portsCompatible(pU2, pU0)).toEqual({
      ok: false,
      reason: 'universe-incompatible'
    });

    // 4. mime-mismatch: incompatible MIME types
    const pMarkdown: CardPort = {
      id: 'out:md',
      direction: 'out',
      type: { mime: 'text/markdown', universe: 'U0' },
      label: 'Markdown Text',
      required: false
    };
    const pTikzSource: CardPort = {
      id: 'in:tikz',
      direction: 'in',
      type: { mime: 'text/x-tikz', universe: 'U0' },
      label: 'TikZ Source',
      required: true
    };
    expect(portsCompatible(pMarkdown, pTikzSource)).toEqual({
      ok: false,
      reason: 'mime-mismatch'
    });
  });

  it('matches exact MIME types when universe and arity allow', () => {
    const pSource: CardPort = {
      id: 'out:src',
      direction: 'out',
      type: { mime: 'text/x-tikz', universe: 'U0', arity: 'one' },
      label: 'Source',
      required: false
    };
    const pTarget: CardPort = {
      id: 'in:src',
      direction: 'in',
      type: { mime: 'text/x-tikz', universe: 'U0', arity: 'one' },
      label: 'Target',
      required: true
    };
    expect(portsCompatible(pSource, pTarget)).toEqual({
      ok: true,
      exact: true
    });
  });

  describe('37-DOD-09: guardrail absence suite (>= 8 negative cases)', () => {
    // Case 1: Markdown text into TikZ AST
    it('Case 1: rejects text/markdown into text/x-tikz', () => {
      const outP: CardPort = { id: 'out:md', direction: 'out', type: { mime: 'text/markdown' }, label: 'MD', required: false };
      const inP: CardPort = { id: 'in:tikz', direction: 'in', type: { mime: 'text/x-tikz' }, label: 'TikZ', required: true };
      expect(portsCompatible(outP, inP).ok).toBe(false);
    });

    // Case 2: PNG image into PCard JSON token
    it('Case 2: rejects image/png into application/vnd.pcard+json', () => {
      const outP: CardPort = { id: 'out:png', direction: 'out', type: { mime: 'image/png' }, label: 'PNG', required: false };
      const inP: CardPort = { id: 'in:token', direction: 'in', type: { mime: 'application/vnd.pcard+json' }, label: 'Token', required: true };
      expect(portsCompatible(outP, inP).ok).toBe(false);
    });

    // Case 3: Many-producer into one-consumer
    it('Case 3: rejects arity:many into arity:one', () => {
      const outP: CardPort = { id: 'out:many', direction: 'out', type: { mime: 'text/plain', arity: 'many' }, label: 'Many', required: false };
      const inP: CardPort = { id: 'in:one', direction: 'in', type: { mime: 'text/plain', arity: 'one' }, label: 'One', required: true };
      expect(portsCompatible(outP, inP).ok).toBe(false);
    });

    // Case 4: Higher-universe into lower-universe
    it('Case 4: rejects U3 into U1', () => {
      const outP: CardPort = { id: 'out:u3', direction: 'out', type: { mime: 'text/plain', universe: 'U3' }, label: 'U3', required: false };
      const inP: CardPort = { id: 'in:u1', direction: 'in', type: { mime: 'text/plain', universe: 'U1' }, label: 'U1', required: true };
      expect(portsCompatible(outP, inP).ok).toBe(false);
    });

    // Case 5: Reverse direction in -> out
    it('Case 5: rejects direction in -> out', () => {
      const inP1: CardPort = { id: 'in:1', direction: 'in', type: { mime: 'text/plain' }, label: 'In 1', required: true };
      const outP1: CardPort = { id: 'out:1', direction: 'out', type: { mime: 'text/plain' }, label: 'Out 1', required: false };
      expect(portsCompatible(inP1, outP1).ok).toBe(false);
    });

    // Case 6: Same direction in -> in
    it('Case 6: rejects direction in -> in', () => {
      const inP1: CardPort = { id: 'in:1', direction: 'in', type: { mime: 'text/plain' }, label: 'In 1', required: true };
      const inP2: CardPort = { id: 'in:2', direction: 'in', type: { mime: 'text/plain' }, label: 'In 2', required: true };
      expect(portsCompatible(inP1, inP2).ok).toBe(false);
    });

    // Case 7: Same direction out -> out
    it('Case 7: rejects direction out -> out', () => {
      const outP1: CardPort = { id: 'out:1', direction: 'out', type: { mime: 'text/plain' }, label: 'Out 1', required: false };
      const outP2: CardPort = { id: 'out:2', direction: 'out', type: { mime: 'text/plain' }, label: 'Out 2', required: false };
      expect(portsCompatible(outP1, outP2).ok).toBe(false);
    });

    // Case 8: PDF binary into LaTeX source text
    it('Case 8: rejects application/pdf into application/x-latex', () => {
      const outP: CardPort = { id: 'out:pdf', direction: 'out', type: { mime: 'application/pdf' }, label: 'PDF', required: false };
      const inP: CardPort = { id: 'in:tex', direction: 'in', type: { mime: 'application/x-latex' }, label: 'TeX', required: true };
      expect(portsCompatible(outP, inP).ok).toBe(false);
    });
  });
});
