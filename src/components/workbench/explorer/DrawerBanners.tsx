import React from 'react';

export interface DrawerBannersProps {
  readonly recoveredCount: number;
  readonly persistence: string;
  readonly onReviewRecovery: () => void;
  readonly onDiscardRecovery: () => void;
}

export const DrawerBanners: React.FC<DrawerBannersProps> = ({
  recoveredCount,
  persistence,
  onReviewRecovery,
  onDiscardRecovery
}) => {
  return (
    <>
      {recoveredCount > 0 && (
        <div
          data-testid="recovery-banner"
          className="bg-amber-950/80 border-b border-amber-700/60 p-2 text-xs text-amber-200 flex flex-col gap-1"
        >
          <span>Unsaved edits recovered from previous session.</span>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              data-testid="btn-recovery-review"
              onClick={onReviewRecovery}
              className="text-[11px] underline"
            >
              Review
            </button>
            <button
              type="button"
              data-testid="btn-recovery-discard"
              onClick={onDiscardRecovery}
              className="text-[11px] underline text-rose-300"
            >
              Discard all
            </button>
          </div>
        </div>
      )}

      {persistence === 'stale' && (
        <div
          data-testid="stale-reload-banner"
          className="bg-rose-950/80 border-b border-rose-700/60 p-2 text-xs text-rose-200 flex items-center justify-between"
        >
          <span>Storage updated in another window.</span>
          <button
            type="button"
            data-testid="btn-reload-window"
            onClick={() => window.location.reload()}
            className="px-2 py-0.5 bg-rose-800 rounded text-[10px]"
          >
            Reload
          </button>
        </div>
      )}
    </>
  );
};
