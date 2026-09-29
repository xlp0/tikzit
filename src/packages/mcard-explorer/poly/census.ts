/** @layer L4 interface/membrane */
import { PolynomialFunctor, type Monomial } from 'clm-kernel';
import type { Direction } from './types';

/**
 * Census a resolved fiber as a numeric polynomial: one monomial per direction group.
 * Grounded in kernel PolynomialFunctor arithmetic (ADR D46).
 */
export function censusFiber(directions: readonly Direction[]): PolynomialFunctor<string> {
  if (!directions || directions.length === 0) {
    return PolynomialFunctor.zero<string>();
  }

  const groupCounts = new Map<string, number>();
  for (const d of directions) {
    const group = d.group || 'default';
    groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
  }

  const sorted = Array.from(groupCounts.entries()).sort((a, b) => b[1] - a[1]);
  const distinctGroups = groupCounts.size;

  const terms: Monomial<string>[] = sorted.map(([group, count], idx) => ({
    coefficient: count,
    exponent: distinctGroups - idx,
    tag: group,
  }));

  return PolynomialFunctor.fromTerms(terms);
}

/**
 * Degree = number of distinct direction groups; leading coefficient = largest group size.
 * Invariant: a position with no legal directions has degree 0.
 */
export function fiberDegree(directions: readonly Direction[]): number {
  if (!directions || directions.length === 0) {
    return 0;
  }
  return censusFiber(directions).degree;
}
