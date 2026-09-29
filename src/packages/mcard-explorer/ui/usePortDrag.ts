import { useState, useCallback, useRef } from 'react';
import { type CardPort, type CardInterface, type Wire, portsCompatible } from '../cards';

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

  const resolveDropTargets = useCallback((targetCard: CardInterface): readonly CardPort[] => {
    const current = draggedRef.current;
    if (!current || current.cardHandle === targetCard.handle) return [];
    return targetCard.ports.filter((p) => {
      if (current.port.direction === 'out' && p.direction === 'in') return portsCompatible(current.port, p).ok;
      if (current.port.direction === 'in' && p.direction === 'out') return portsCompatible(p, current.port).ok;
      return false;
    });
  }, []);

  const commitDrop = useCallback((targetHandle: string, targetPort: CardPort): Wire | null => {
    const current = draggedRef.current;
    if (!current || current.cardHandle === targetHandle) return null;
    const isReverse = current.port.direction === 'in' && targetPort.direction === 'out';
    const from = isReverse ? { handle: targetHandle, portId: targetPort.id } : { handle: current.cardHandle, portId: current.port.id };
    const to = isReverse ? { handle: current.cardHandle, portId: current.port.id } : { handle: targetHandle, portId: targetPort.id };
    endDrag();
    return { from, to };
  }, [endDrag]);

  return { draggedPort, dragOverPort, startDrag, setDragOver, endDrag, resolveDropTargets, commitDrop };
}

