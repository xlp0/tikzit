import React, { useState } from 'react';
import type { CardInterface, CardPort } from '../cards/ports';
import { usePortDrag } from './usePortDrag';
import type { Wire, CompositionPlan } from '../cards/composition';

export interface CardCompositionSurfaceProps {
  readonly cards: readonly CardInterface[];
  readonly onCommit?: (plan: CompositionPlan) => Promise<void>;
}

export const CardCompositionSurface: React.FC<CardCompositionSurfaceProps> = ({
  cards,
  onCommit
}) => {
  const {
    draggedPort,
    startDrag,
    endDrag,
    resolveDropTargets,
    commitDrop
  } = usePortDrag();

  const [wires, setWires] = useState<Wire[]>([]);

  const handlePortClick = (card: CardInterface, port: CardPort) => {
    if (!draggedPort) {
      startDrag(card.handle, port);
    } else {
      const legalTargets = resolveDropTargets(card);
      const isLegal = legalTargets.some(p => p.id === port.id);
      if (isLegal) {
        const wire = commitDrop(card.handle, port);
        if (wire) {
          setWires(prev => [...prev, wire]);
        }
      } else {
        endDrag();
      }
    }
  };

  const handleCommit = async () => {
    const plan: CompositionPlan = {
      op: 'tensor',
      operands: cards,
      wires,
      unbound: cards.flatMap(c => c.ports),
      legality: { ok: true, reasons: [] }
    };
    await onCommit?.(plan);
  };

  return (
    <div
      className="card-composition-surface p-4 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-4"
      data-testid="composition-surface"
    >
      <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Card Composition Surface
        </h3>
        <button
          type="button"
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors"
          onClick={handleCommit}
          data-testid="composition-commit"
        >
          Commit Composition
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(card => {
          const legalDropTargets = resolveDropTargets(card);

          return (
            <div
              key={card.handle}
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm space-y-2"
              data-testid={`composition-tile-${card.handle}`}
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {card.handle}
              </div>

              <div className="space-y-1">
                {card.ports.map(port => {
                  const isSelected =
                    draggedPort?.cardHandle === card.handle &&
                    draggedPort.port.id === port.id;
                  const isLegalTarget = legalDropTargets.some(p => p.id === port.id);

                  return (
                    <div
                      key={port.id}
                      className="flex items-center justify-between text-[11px] p-1 rounded bg-slate-50 dark:bg-slate-900/50"
                    >
                      <span className="text-slate-600 dark:text-slate-400 font-mono">
                        {port.label} ({port.direction})
                      </span>

                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-white font-bold'
                            : isLegalTarget
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                        onClick={() => handlePortClick(card, port)}
                        data-testid={`port-${card.handle}-${port.id}`}
                      >
                        {port.direction === 'out' ? 'Out' : 'In'}
                      </button>

                      {isLegalTarget && (
                        <span
                          className="hidden"
                          data-testid={`port-target-${card.handle}-${port.id}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {wires.length > 0 && (
        <div className="border-t pt-2 border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-500">Active Wires:</div>
          {wires.map((w, i) => (
            <div
              key={i}
              className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400"
              data-testid={`wire-${w.from.handle}-${w.to.handle}`}
            >
              {w.from.handle}:{w.from.portId} ➔ {w.to.handle}:{w.to.portId}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
