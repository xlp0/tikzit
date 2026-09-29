/** @layer L4 interface/membrane */
import type { Position } from '../poly';

export interface PositionBadge {
  readonly id: string;
  readonly label: string;
  readonly tone: 'neutral' | 'amber' | 'purple' | 'sky';
}

/**
 * projectBadges: pure projection from Position metadata to UI badges.
 * Replaces hardcoded ExplorerItem unions with dynamic, open badges.
 */
export function projectBadges(position: Position): readonly PositionBadge[] {
  const badges: PositionBadge[] = [];
  const meta = position.meta || {};

  if (meta.mutable === true) {
    badges.push({ id: 'draft', label: 'draft', tone: 'amber' });
  } else if (meta.origin === 'seed') {
    badges.push({ id: 'example', label: 'example', tone: 'neutral' });
  } else if (position.handle.startsWith('zx:artifacts:')) {
    badges.push({ id: 'artifact', label: 'artifact', tone: 'sky' });
  } else if (
    position.category === 'diagram' ||
    meta.category === 'diagram' ||
    position.handle.startsWith('zx:diagrams:')
  ) {
    badges.push({ id: 'diagram', label: 'diagram', tone: 'purple' });
  }

  if (meta.archived === true) {
    badges.push({ id: 'archived', label: 'archived', tone: 'neutral' });
  }

  if (position.universe && position.universe !== 'U0') {
    badges.push({
      id: position.universe.toLowerCase(),
      label: position.universe,
      tone: 'neutral'
    });
  }

  return badges;
}
