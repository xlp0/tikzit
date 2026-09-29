import React, { useState } from 'react';
import type { Position, Direction } from '../poly';
import type { PositionBadge } from '../cards';

export interface CardRowProps {
  readonly position: Position;
  readonly directions: readonly Direction[];
  readonly badges: readonly PositionBadge[];
  readonly onExecute: (directionId: string, payload?: unknown) => Promise<void>;
}

export const CardRow: React.FC<CardRowProps> = ({
  position,
  directions,
  badges,
  onExecute
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(position.title || position.handle);

  const handleRenameCommit = async () => {
    setIsEditing(false);
    await onExecute('rename', { title: editTitle });
  };

  return (
    <div
      className="card-row flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      data-testid={`card-row-${position.handle}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isEditing ? (
          <input
            type="text"
            className="text-xs px-1.5 py-0.5 border rounded bg-white dark:bg-slate-900 border-indigo-500"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameCommit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            data-testid={`input-rename-${position.handle}`}
          />
        ) : (
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
            {position.title || position.handle}
          </span>
        )}

        <div className="flex items-center gap-1">
          {badges.map((b) => (
            <span
              key={b.id}
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                b.tone === 'amber'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  : b.tone === 'purple'
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : b.tone === 'sky'
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              data-testid={`badge-${b.id}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {directions.map((d) => (
          <button
            key={d.id}
            type="button"
            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            onClick={() => {
              if (d.id === 'rename') {
                setIsEditing(true);
              } else {
                onExecute(d.id);
              }
            }}
            data-testid={`direction-${d.id}`}
            title={d.label}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
};
