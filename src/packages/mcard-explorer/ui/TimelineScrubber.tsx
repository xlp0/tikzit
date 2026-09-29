import React, { useState } from 'react';
import type { InteractionNode } from '../time';
import type { Direction } from '../poly';

export interface TimelineScrubberProps {
  readonly path: readonly InteractionNode[];
  readonly activeNodeId: string;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onBranch?: (nodeId: string) => void;
  readonly alternatives?: readonly Direction[];
  readonly onSelectAlternative?: (direction: Direction) => void;
  readonly onUndo?: () => void | Promise<void>;
}

export function handleTimelineKeyboardNavigation(
  e: { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; preventDefault?: () => void },
  opts: { path: readonly InteractionNode[]; activeNodeId: string; onSelectNode: (id: string) => void; onUndo?: () => void; onBranch?: (id: string) => void }
): boolean {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault?.(); opts.onUndo?.(); return true;
  }
  if (e.altKey && e.key.toLowerCase() === 'b') {
    e.preventDefault?.(); opts.onBranch?.(opts.activeNodeId); return true;
  }
  const idx = opts.path.findIndex(n => n.id === opts.activeNodeId);
  if (e.key === 'ArrowLeft' && idx > 0) {
    e.preventDefault?.(); opts.onSelectNode(opts.path[idx - 1].id); return true;
  }
  if (e.key === 'ArrowRight' && idx >= 0 && idx < opts.path.length - 1) {
    e.preventDefault?.(); opts.onSelectNode(opts.path[idx + 1].id); return true;
  }
  return false;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  path,
  activeNodeId,
  onSelectNode,
  onBranch,
  alternatives = [],
  onSelectAlternative,
  onUndo
}) => {
  const [showAlternatives, setShowAlternatives] = useState(false);

  return (
    <div
      className="timeline-scrubber flex items-center gap-1.5 px-2 py-1 bg-slate-900 border-t border-slate-800 text-slate-300 text-xs select-none focus:outline-none"
      data-testid="timeline-scrubber"
      role="listbox"
      aria-label="Interaction Timeline"
      tabIndex={0}
      onKeyDown={(e) => handleTimelineKeyboardNavigation(e, { path, activeNodeId, onSelectNode, onUndo, onBranch })}
    >
      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Timeline:</span>
      <div className="flex items-center gap-1 overflow-x-auto flex-1 py-0.5">
        {path.map((node, idx) => {
          const isActive = node.id === activeNodeId;
          const label = node.arrivedBy ?? 'Root';
          return (
            <React.Fragment key={node.id}>
              {idx > 0 && <span className="text-slate-600 text-[10px]">→</span>}
              <button
                type="button"
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                onClick={() => onSelectNode(node.id)}
                data-testid={`timeline-node-${node.id}`}
                aria-selected={isActive}
              >
                {label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {onBranch && (
        <button
          type="button"
          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          onClick={() => onBranch(activeNodeId)}
          data-testid="timeline-branch"
          title="Branch from here"
        >
          Branch
        </button>
      )}

      {alternatives.length > 0 && (
        <div className="relative">
          <button
            type="button"
            className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800"
            onClick={() => setShowAlternatives((prev) => !prev)}
            data-testid="timeline-alternatives-toggle"
          >
            Alternatives ({alternatives.length})
          </button>
          {showAlternatives && (
            <div
              className="absolute right-0 bottom-full mb-1 w-48 bg-slate-900 border border-slate-700 rounded shadow-xl p-1 z-50 text-xs"
              data-testid="timeline-alternatives"
            >
              <div className="text-[10px] font-semibold text-slate-400 px-1 py-0.5 border-b border-slate-800">
                What else was legal here:
              </div>
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="px-1.5 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-200 flex items-center justify-between"
                  onClick={() => {
                    onSelectAlternative?.(alt);
                    setShowAlternatives(false);
                  }}
                  data-testid={`timeline-alt-${alt.id}`}
                >
                  <span>{alt.label}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{alt.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
