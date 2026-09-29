/**
 * MCardSearchBar: Debounced Search Input with Shortcut Triggers
 *
 * Implements accessible querying for MCardExplorer.
 * Zero DOM globals. Contract D ceiling: <= 250 LOC.
 */

import React, { useState, useEffect } from 'react';

export interface MCardSearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const MCardSearchBar: React.FC<MCardSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search cards (e.g. zx:rule, diagram)...',
  debounceMs = 150
}) => {
  const [internalVal, setInternalVal] = useState(value);

  useEffect(() => {
    setInternalVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalVal !== value) {
        onChange(internalVal);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalVal, value, onChange, debounceMs]);

  return (
    <div className="mcard-search-bar relative flex items-center w-full" data-testid="mcard-search-bar">
      <input
        type="text"
        className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
        placeholder={placeholder}
        value={internalVal}
        onChange={(e) => setInternalVal(e.target.value)}
        data-testid="mcard-search-input"
      />
      {internalVal && (
        <button
          type="button"
          className="absolute right-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          onClick={() => {
            setInternalVal('');
            onChange('');
          }}
          aria-label="Clear search"
          data-testid="mcard-search-clear"
        >
          ✕
        </button>
      )}
    </div>
  );
};
