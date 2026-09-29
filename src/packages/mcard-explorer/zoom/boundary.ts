/** @layer L4 interface/membrane */
import type { CardInterface, CompositionPlan, PortMatch, portsCompatible } from '../cards';

export type BoundaryVerdict =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly violations: readonly {
        readonly portId: string;
        readonly reason: PortMatch & { readonly ok: false };
      }[];
    };

export type InnerChange =
  | CompositionPlan
  | { readonly kind: 'edit'; readonly nodeId: string; readonly removedPortIds?: readonly string[] };

/**
 * Validate that a proposed inner mutation satisfies the enclosing card's interface.
 * Implements Semagrams boundary consistency: adding ports is allowed,
 * removing or retyping an exposed outer port is rejected.
 */
export async function validateBoundary(
  innerChange: InnerChange,
  outerInterface: CardInterface | null,
  matcher: typeof portsCompatible
): Promise<BoundaryVerdict> {
  if (!outerInterface || outerInterface.ports.length === 0) {
    return { ok: true };
  }

  const violations: { portId: string; reason: PortMatch & { ok: false } }[] = [];

  if ('op' in innerChange) {
    // CompositionPlan
    const plan = innerChange as CompositionPlan;
    const unboundPorts = plan.unbound;

    for (const outerPort of outerInterface.ports) {
      const matchingUnbound = unboundPorts.find(
        (p) => p.id === outerPort.id && p.direction === outerPort.direction
      );

      if (!matchingUnbound) {
        violations.push({
          portId: outerPort.id,
          reason: { ok: false, reason: 'mime-mismatch' }
        });
        continue;
      }

      if (matchingUnbound.direction !== outerPort.direction) {
        violations.push({
          portId: outerPort.id,
          reason: { ok: false, reason: 'direction-conflict' }
        });
        continue;
      }

      // Check port type compatibility (mime, universe, arity)
      const match = matcher(
        { ...matchingUnbound, direction: 'out' },
        { ...outerPort, direction: 'in' }
      );
      if (!match.ok) {
        violations.push({
          portId: outerPort.id,
          reason: match
        });
      }
    }
  } else if (innerChange.kind === 'edit') {
    // Edit with possible port deletions
    if (innerChange.removedPortIds && innerChange.removedPortIds.length > 0) {
      for (const removedId of innerChange.removedPortIds) {
        const outerHasPort = outerInterface.ports.some((p) => p.id === removedId);
        if (outerHasPort) {
          violations.push({
            portId: removedId,
            reason: { ok: false, reason: 'direction-conflict' }
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    return { ok: false, violations };
  }

  return { ok: true };
}

/**
 * Dispatches an accessible explanation to the live announcer element if present.
 */
export function announceBoundaryViolation(
  verdict: BoundaryVerdict,
  announcer?: { textContent: string | null } | null
): void {
  if (verdict.ok) return;

  const msg = `Boundary validation failed: ${verdict.violations
    .map((v) => `Port "${v.portId}" violation (${v.reason.reason})`)
    .join('; ')}`;

  if (announcer) {
    announcer.textContent = msg;
  }
}
