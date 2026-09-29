import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { usePortDrag, type UsePortDragResult } from '../../../../src/packages/mcard-explorer/ui/usePortDrag';
import type { CardInterface, CardPort } from '../../../../src/packages/mcard-explorer/cards/ports';

describe('usePortDrag Hook Seam (Sprint 37)', () => {
  const cardProducer: CardInterface = {
    handle: 'diagram:prod',
    hash: 'h_prod',
    judgment: { mimeType: 'text/x-tikz', universe: 'U0' } as any,
    ports: [
      { id: 'out:render', direction: 'out', type: { mime: 'image/svg+xml' }, label: 'Render SVG', required: false }
    ]
  };

  const cardConsumer: CardInterface = {
    handle: 'app:consumer',
    hash: 'h_consumer',
    judgment: { mimeType: 'application/json', universe: 'U0' } as any,
    ports: [
      { id: 'in:svg', direction: 'in', type: { mime: 'image/svg+xml' }, label: 'SVG Target', required: true },
      { id: 'in:incompatible', direction: 'in', type: { mime: 'text/markdown' }, label: 'Markdown Target', required: false }
    ]
  };

  it('37-DOD-19: starts drag, filters legal drop targets strictly, and commits wire', () => {
    let hookResult: UsePortDragResult | null = null;

    const TestComponent: React.FC = () => {
      const hook = usePortDrag();
      hookResult = hook;
      return <div data-testid="test-hook" />;
    };

    renderToString(<TestComponent />);
    expect(hookResult).not.toBeNull();

    // 1. Initial state
    expect(hookResult!.draggedPort).toBeNull();
    expect(hookResult!.dragOverPort).toBeNull();

    // 2. Start drag on producer out:render port
    const outPort = cardProducer.ports[0];
    hookResult!.startDrag(cardProducer.handle, outPort);

    // 3. Resolve legal targets for cardConsumer
    const legalTargets = hookResult!.resolveDropTargets(cardConsumer);
    expect(legalTargets).toHaveLength(1);
    expect(legalTargets[0].id).toBe('in:svg'); // in:incompatible is filtered out by guardrail!

    // Incompatible target is NOT returned
    expect(legalTargets.some(t => t.id === 'in:incompatible')).toBe(false);

    // 4. Same card returns 0 targets
    expect(hookResult!.resolveDropTargets(cardProducer)).toHaveLength(0);

    // 5. Commit drop produces Wire
    const wire = hookResult!.commitDrop(cardConsumer.handle, legalTargets[0]);
    expect(wire).toEqual({
      from: { handle: 'diagram:prod', portId: 'out:render' },
      to: { handle: 'app:consumer', portId: 'in:svg' }
    });
  });
});
