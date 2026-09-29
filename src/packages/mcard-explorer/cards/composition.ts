/** @layer L4 interface/membrane */
import type { CardInterface, CardPort } from './ports';
import { portsCompatible, type PortMatch } from './legality';

export interface Wire {
  readonly from: { readonly handle: string; readonly portId: string };
  readonly to: { readonly handle: string; readonly portId: string };
}

export interface CompositionLegality {
  readonly ok: boolean;
  readonly reasons: readonly PortMatch[];
}

export interface CompositionPlan {
  readonly op: 'tensor' | 'substitute' | 'coproduct';
  readonly operands: readonly CardInterface[];
  readonly wires: readonly Wire[];
  readonly unbound: readonly CardPort[];
  readonly legality: CompositionLegality;
}

/**
 * ⊗ Dirichlet tensor: parallel synchronous composition.
 * Operands execute in parallel, exposing the union of their interfaces.
 */
export function tensor(a: CardInterface, b: CardInterface): CompositionPlan {
  return {
    op: 'tensor',
    operands: [a, b],
    wires: [],
    unbound: [...a.ports, ...b.ports],
    legality: { ok: true, reasons: [] }
  };
}

/**
 * ◁ substitution: nests inner card inside outer card's specified input port.
 * Wires inner's compatible output port to outer's specified input port.
 */
export function substitute(
  outer: CardInterface,
  inner: CardInterface,
  portId: string
): CompositionPlan {
  const targetPort = outer.ports.find(p => p.id === portId && p.direction === 'in');

  if (!targetPort) {
    return {
      op: 'substitute',
      operands: [outer, inner],
      wires: [],
      unbound: [...outer.ports, ...inner.ports],
      legality: {
        ok: false,
        reasons: [{ ok: false, reason: 'direction-conflict' }]
      }
    };
  }

  const reasons: PortMatch[] = [];
  let matchingOutPort: CardPort | undefined;

  for (const p of inner.ports) {
    if (p.direction === 'out') {
      const match = portsCompatible(p, targetPort);
      if (match.ok) {
        matchingOutPort = p;
        break;
      } else {
        reasons.push(match);
      }
    }
  }

  if (matchingOutPort) {
    const wire: Wire = {
      from: { handle: inner.handle, portId: matchingOutPort.id },
      to: { handle: outer.handle, portId: targetPort.id }
    };
    const unbound = [
      ...outer.ports.filter(p => p.id !== targetPort.id),
      ...inner.ports.filter(p => p.id !== matchingOutPort!.id)
    ];

    return {
      op: 'substitute',
      operands: [outer, inner],
      wires: [wire],
      unbound,
      legality: { ok: true, reasons: [] }
    };
  }

  return {
    op: 'substitute',
    operands: [outer, inner],
    wires: [],
    unbound: [...outer.ports, ...inner.ports],
    legality: {
      ok: false,
      reasons: reasons.length > 0 ? reasons : [{ ok: false, reason: 'mime-mismatch' }]
    }
  };
}

/**
 * + coproduct: alternatives — one of the operands is selected at use time.
 */
export function coproduct(...operands: CardInterface[]): CompositionPlan {
  const seenPortIds = new Set<string>();
  const unbound: CardPort[] = [];

  for (const op of operands) {
    for (const p of op.ports) {
      if (!seenPortIds.has(p.id)) {
        seenPortIds.add(p.id);
        unbound.push(p);
      }
    }
  }

  return {
    op: 'coproduct',
    operands,
    wires: [],
    unbound,
    legality: { ok: true, reasons: [] }
  };
}
