import { useState, useCallback, useRef } from 'react';
import type { CardPort, CardInterface } from '../cards/ports';
import type { Wire } from '../cards/composition';
import { portsCompatible } from '../cards/legality';

export interface UsePortDragResult {
  draggedPort: { cardHandle: string; port: CardPort } | null;
  dragOverPort: { cardHandle: string; port: CardPort } | null;
  startDrag: (cardHandle: string, port: CardPort) => void;
  setDragOver: (target: { cardHandle: string; port: CardPort } | null) => void;
  endDrag: () => void;
  resolveDropTargets: (targetCard: CardInterface) => readonly CardPort[];
  commitDrop: (targetHandle: string, targetPort: CardPort) => Wire | null;
}

export function usePortDrag(): UsePortDragResult {
  const [draggedPort, setDraggedPort] = useState<{ cardHandle: string; port: CardPort } | null>(null);
  const [dragOverPort, setDragOverPort] = useState<{ cardHandle: string; port: CardPort } | null>(null);
  const draggedRef = useRef<{ cardHandle: string; port: CardPort } | null>(null);

  const startDrag = useCallback((cardHandle: string, port: CardPort) => {
    const item = { cardHandle, port };
    draggedRef.current = item;
    setDraggedPort(item);
  }, []);

  const setDragOver = useCallback((target: { cardHandle: string; port: CardPort } | null) => {
    setDragOverPort(target);
  }, []);

  const endDrag = useCallback(() => {
    draggedRef.current = null;
    setDraggedPort(null);
    setDragOverPort(null);
  }, []);

  const resolveDropTargets = useCallback(
    (targetCard: CardInterface): readonly CardPort[] => {
      const current = draggedRef.current;
      if (!current) return [];
      if (current.cardHandle === targetCard.handle) return [];

      return targetCard.ports.filter((p) => {
        if (current.port.direction === 'out' && p.direction === 'in') {
          return portsCompatible(current.port, p).ok;
        }
        if (current.port.direction === 'in' && p.direction === 'out') {
          return portsCompatible(p, current.port).ok;
        }
        return false;
      });
    },
    []
  );

  const commitDrop = useCallback(
    (targetHandle: string, targetPort: CardPort): Wire | null => {
      const current = draggedRef.current;
      if (!current) return null;
      if (current.cardHandle === targetHandle) return null;

      let fromHandle = current.cardHandle;
      let fromPortId = current.port.id;
      let toHandle = targetHandle;
      let toPortId = targetPort.id;

      if (current.port.direction === 'in' && targetPort.direction === 'out') {
        fromHandle = targetHandle;
        fromPortId = targetPort.id;
        toHandle = current.cardHandle;
        toPortId = current.port.id;
      }

      endDrag();
      return {
        from: { handle: fromHandle, portId: fromPortId },
        to: { handle: toHandle, portId: toPortId }
      };
    },
    [endDrag]
  );

  return {
    draggedPort,
    dragOverPort,
    startDrag,
    setDragOver,
    endDrag,
    resolveDropTargets,
    commitDrop
  };
}
