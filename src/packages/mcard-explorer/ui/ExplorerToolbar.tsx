/** @layer L4 interface/membrane */
import React from 'react';
import { MCardSearchBar } from './MCardSearchBar';

export interface ExplorerToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  viewMode: 'tree' | 'flat' | 'cards';
  onViewModeChange: (mode: 'tree' | 'flat' | 'cards') => void;
}

export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = ({
  query,
  onQueryChange,
  showPreview,
  onTogglePreview,
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="flex items-center gap-2">
      <MCardSearchBar
        value={query}
        onChange={onQueryChange}
      />
      <button
        type="button"
        data-testid="toggle-preview-pane"
        onClick={onTogglePreview}
        className={`px-2 py-1 text-xs rounded border transition-colors ${
          showPreview
            ? 'bg-indigo-600 text-white border-indigo-700'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
        }`}
        title="Toggle Preview Drawer"
      >
        Preview
      </button>
      <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          className={`px-2 py-1 text-xs rounded transition-colors ${
            viewMode === 'tree' ? 'bg-white dark:bg-slate-700 shadow-sm font-semibold' : 'text-slate-500'
          }`}
          onClick={() => onViewModeChange('tree')}
          title="Tree View"
          data-testid="view-mode-tree"
        >
          Tree
        </button>
        <button
          type="button"
          className={`px-2 py-1 text-xs rounded transition-colors ${
            viewMode === 'flat' ? 'bg-white dark:bg-slate-700 shadow-sm font-semibold' : 'text-slate-500'
          }`}
          onClick={() => onViewModeChange('flat')}
          title="Flat List"
          data-testid="view-mode-flat"
        >
          Flat
        </button>
      </div>
    </div>
  );
};
