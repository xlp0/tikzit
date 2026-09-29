import React from 'react';

export interface JournalIndicatorProps {
  readonly entryCount: number;
  readonly onUndo: () => void | Promise<void>;
  readonly latestLabel?: string;
}

export const JournalIndicator: React.FC<JournalIndicatorProps> = ({
  entryCount,
  onUndo,
  latestLabel
}) => {
  if (entryCount === 0) {
    return null;
  }

  return (
    <div
      className="journal-indicator flex items-center gap-1.5 px-2 py-0.5 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-xs"
      data-testid="journal-indicator"
    >
      <button
        type="button"
        className="hover:underline font-medium flex items-center gap-1 cursor-pointer"
        onClick={() => onUndo()}
        data-testid="btn-journal-undo"
        title="Undo last action (Ctrl/Cmd+Z)"
      >
        <span>↩ Undo</span>
        {latestLabel && <span className="text-[10px] text-amber-400 font-mono">({latestLabel})</span>}
      </button>
      <span className="text-[10px] text-amber-500 font-mono">[{entryCount}]</span>
    </div>
  );
};
