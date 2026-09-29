/** @layer L4 interface/membrane */
import type { CardPort } from './ports';

export type PortMatch =
  | { readonly ok: true; readonly exact: boolean }
  | {
      readonly ok: false;
      readonly reason:
        | 'mime-mismatch'
        | 'universe-incompatible'
        | 'arity-conflict'
        | 'direction-conflict';
    };

function parseUniverseLevel(universe?: string): number {
  if (!universe) return 0;
  const match = universe.match(/U([0-5])/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * portsCompatible: evaluates whether an output port can feed an input port.
 * Evaluates direction, arity, universe subsumption, and MIME compatibility.
 */
export function portsCompatible(outPort: CardPort, inPort: CardPort): PortMatch {
  // 1. Direction check
  if (outPort.direction !== 'out' || inPort.direction !== 'in') {
    return { ok: false, reason: 'direction-conflict' };
  }

  // 2. Arity check (many into one without gather node is an arity conflict)
  if (outPort.type.arity === 'many' && inPort.type.arity === 'one') {
    return { ok: false, reason: 'arity-conflict' };
  }

  // 3. Universe subsumption check (consumer level must be >= producer level)
  const uOut = parseUniverseLevel(outPort.type.universe);
  const uIn = parseUniverseLevel(inPort.type.universe);
  if (uOut > uIn) {
    return { ok: false, reason: 'universe-incompatible' };
  }

  // 4. MIME compatibility check
  if (outPort.type.mime === inPort.type.mime) {
    return { ok: true, exact: true };
  }

  // Universal binary consumer (e.g. SQLite collection or raw CAS storage)
  if (inPort.type.mime === 'application/octet-stream' && uOut <= uIn) {
    return { ok: true, exact: false };
  }

  return { ok: false, reason: 'mime-mismatch' };
}
