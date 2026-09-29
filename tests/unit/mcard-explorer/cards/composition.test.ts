import { describe, it, expect } from 'vitest';
import type { CardInterface } from '../../../../src/packages/mcard-explorer/cards/ports';
import { tensor, substitute, coproduct } from '../../../../src/packages/mcard-explorer/cards/composition';

describe('Card Composition Operators (Sprint 37)', () => {
  const cardTikz: CardInterface = {
    handle: 'zx:diagrams:ghz',
    hash: 'h_tikz',
    judgment: { mimeType: 'text/x-tikz', universe: 'U0' } as any,
    ports: [
      { id: 'in:source', direction: 'in', type: { mime: 'text/x-tikz' }, label: 'Source', required: true },
      { id: 'out:render', direction: 'out', type: { mime: 'image/svg+xml' }, label: 'SVG', required: false }
    ]
  };

  const cardSvgViewer: CardInterface = {
    handle: 'app:svg-viewer',
    hash: 'h_svg_viewer',
    judgment: { mimeType: 'application/json', universe: 'U0' } as any,
    ports: [
      { id: 'in:svg', direction: 'in', type: { mime: 'image/svg+xml' }, label: 'SVG Input', required: true }
    ]
  };

  const cardMarkdown: CardInterface = {
    handle: 'notes:doc',
    hash: 'h_md',
    judgment: { mimeType: 'text/markdown', universe: 'U0' } as any,
    ports: [
      { id: 'out:data', direction: 'out', type: { mime: 'text/markdown' }, label: 'Text', required: false }
    ]
  };

  it('37-DOD-04: executes tensor composition without wires and preserves all ports', () => {
    const plan = tensor(cardTikz, cardMarkdown);
    expect(plan.op).toBe('tensor');
    expect(plan.operands).toHaveLength(2);
    expect(plan.wires).toHaveLength(0);
    expect(plan.unbound).toHaveLength(3);
    expect(plan.legality.ok).toBe(true);
  });

  it('executes substitute composition and creates legal wire', () => {
    // Nest cardTikz inside cardSvgViewer's in:svg port
    const plan = substitute(cardSvgViewer, cardTikz, 'in:svg');
    expect(plan.op).toBe('substitute');
    expect(plan.legality.ok).toBe(true);
    expect(plan.wires).toHaveLength(1);
    expect(plan.wires[0]).toEqual({
      from: { handle: 'zx:diagrams:ghz', portId: 'out:render' },
      to: { handle: 'app:svg-viewer', portId: 'in:svg' }
    });
    // Unbound should include in:source from cardTikz
    expect(plan.unbound.some(p => p.id === 'in:source')).toBe(true);
  });

  it('handles rejected substitute composition cleanly without throwing', () => {
    // Try to substitute cardMarkdown into cardSvgViewer's in:svg port (MIME mismatch)
    const plan = substitute(cardSvgViewer, cardMarkdown, 'in:svg');
    expect(plan.op).toBe('substitute');
    expect(plan.legality.ok).toBe(false);
    expect(plan.legality.reasons.length).toBeGreaterThan(0);
    expect(plan.legality.reasons[0].ok).toBe(false);
    expect(plan.wires).toHaveLength(0);
  });

  it('executes coproduct composition with unique port union', () => {
    const plan = coproduct(cardTikz, cardMarkdown);
    expect(plan.op).toBe('coproduct');
    expect(plan.operands).toHaveLength(2);
    expect(plan.wires).toHaveLength(0);
    expect(plan.unbound).toHaveLength(3);
    expect(plan.legality.ok).toBe(true);
  });
});
