import React from 'react';
import type { Position, Direction } from '../poly';
import { projectBadges } from '../cards';
import { CardRow } from './CardRow';

const VIRTUALIZATION_THRESHOLD = 200;
const DEFAULT_WINDOW_SIZE = 50;

export interface PositionGroupListProps {
  readonly positions: readonly Position[];
  readonly resolveDirections: (pos: Position) => readonly Direction[];
  readonly onExecute?: (directionId: string, handle: string, payload?: unknown) => Promise<void>;
  readonly emptyText?: string;
  readonly startIndex?: number;
  readonly windowSize?: number;
}

export const PositionGroupList: React.FC<PositionGroupListProps> = ({
  positions,
  resolveDirections,
  onExecute,
  emptyText = 'No cards available.',
  startIndex = 0,
  windowSize = DEFAULT_WINDOW_SIZE
}) => {
  if (positions.length === 0) {
    return (
      <div
        className="p-4 text-center text-xs text-slate-400"
        data-testid="position-group-empty"
      >
        {emptyText}
      </div>
    );
  }

  const isVirtualized = positions.length > VIRTUALIZATION_THRESHOLD;
  const visiblePositions = isVirtualized
    ? positions.slice(startIndex, startIndex + windowSize)
    : positions;

  return (
    <div
      className="position-group-list space-y-1"
      data-testid="position-group-list"
      data-virtualized={isVirtualized ? 'true' : undefined}
      data-total-count={positions.length}
    >
      {visiblePositions.map((pos) => {
        const directions = resolveDirections(pos);
        const badges = projectBadges(pos);

        return (
          <CardRow
            key={pos.handle}
            position={pos}
            directions={directions}
            badges={badges}
            onExecute={async (directionId, payload) => {
              await onExecute?.(directionId, pos.handle, payload);
            }}
          />
        );
      })}
    </div>
  );
};
