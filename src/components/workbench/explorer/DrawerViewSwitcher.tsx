import React from 'react';

export interface DrawerViewSwitcherProps {
  readonly view: 'diagrams' | 'mcards';
  readonly onViewChange: (view: 'diagrams' | 'mcards') => void;
}

export const DrawerViewSwitcher: React.FC<DrawerViewSwitcherProps> = ({
  view,
  onViewChange
}) => {
  return (
    <div className="flex items-center gap-1 px-2 pt-2 pb-1" data-testid="drawer-view-switcher">
      <button
        type="button"
        data-testid="drawer-view-diagrams"
        onClick={() => onViewChange('diagrams')}
        className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
          view === 'diagrams'
            ? 'bg-sky-700 text-white'
            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
        }`}
      >
        Diagrams
      </button>
      <button
        type="button"
        data-testid="drawer-view-mcards"
        onClick={() => onViewChange('mcards')}
        className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
          view === 'mcards'
            ? 'bg-sky-700 text-white'
            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
        }`}
      >
        MCards
      </button>
    </div>
  );
};
