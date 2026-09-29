import React from 'react';
import type { Position, Direction } from '../poly/types';
import { projectBadges } from '../cards/projectBadges';
import { CardRow } from './CardRow';

export interface PositionGroupListProps {
  readonly positions: readonly Position[];
  readonly resolveDirections: (pos: Position) => readonly Direction[];
  readonly onExecute?: (directionId: string, handle: string, payload?: unknown) => Promise<void>;
  readonly emptyText?: string;
}

export const PositionGroupList: React.FC<PositionGroupListProps> = ({
  positions,
  resolveDirections,
  onExecute,
  emptyText = 'No cards available.'
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

  return (
    <div className="position-group-list space-y-1" data-testid="position-group-list">
      {positions.map((pos) => {
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
