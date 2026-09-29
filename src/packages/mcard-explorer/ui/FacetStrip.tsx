/** @layer L4 interface/membrane */
import React from 'react';
import type { FacetDefinition } from '../core';

export interface FacetStripProps {
  facets: readonly (string | FacetDefinition)[];
  activeFacet: string;
  onSelectFacet: (facetId: string) => void;
}

export const FacetStrip: React.FC<FacetStripProps> = ({
  facets,
  activeFacet,
  onSelectFacet
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1" data-testid="mcard-facet-bar">
      {facets.map(item => {
        const id = typeof item === 'string' ? item : item.id;
        const label = typeof item === 'string' ? item : item.label;
        const isActive = activeFacet === id;

        return (
          <button
            key={id}
            type="button"
            className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            onClick={() => onSelectFacet(id)}
            data-testid={`facet-chip-${id}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
