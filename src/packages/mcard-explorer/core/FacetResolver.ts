/** @layer L4 interface/membrane */
import type { ExplorerSearchFilter } from './datasource/types';
import type { Position } from '../poly';

export interface FacetDefinition {
  readonly id: string;
  readonly label: string;
  readonly filter: Partial<ExplorerSearchFilter>;
  readonly positionPredicate?: (p: Position) => boolean;
}

export const CORE_FACETS: readonly FacetDefinition[] = [
  { id: 'all',          label: 'All',           filter: {} },
  { id: 'diagram',      label: 'Diagrams',      filter: { category: 'diagram' } },
  { id: 'markdown',     label: 'Notes',         filter: { mimeType: 'text/markdown' } },
  { id: 'data',         label: 'Data',          filter: { category: 'data' } },
  { id: 'process',      label: 'Processes',     filter: { universe: 'U1' } },
  { id: 'proof',        label: 'Proofs',        filter: { universe: 'U2' } },
  { id: 'conversation', label: 'Conversations', filter: { universe: 'U3' } },
  { id: 'artifacts',    label: 'Artifacts',     filter: { pattern: 'zx:artifacts:' } },
];

/**
 * FacetResolver: Maps typed facet IDs to SQL-level search filters (ADR D49).
 * Eliminates client-side substring matching in favor of storage-layer filtering.
 */
export class FacetResolver {
  private facets: readonly FacetDefinition[];

  constructor(facets: readonly FacetDefinition[] = CORE_FACETS) {
    this.facets = facets;
  }

  public getFacet(id: string): FacetDefinition | undefined {
    return this.facets.find(f => f.id === id);
  }

  public listFacets(): readonly FacetDefinition[] {
    return this.facets;
  }

  public resolveFilter(facetId: string, baseQuery?: string): ExplorerSearchFilter {
    const facet = this.getFacet(facetId);
    const filter: ExplorerSearchFilter = {
      limit: 100
    };

    if (baseQuery && baseQuery.trim()) {
      filter.pattern = baseQuery.trim();
    }

    if (facet) {
      if (facet.filter.universe) filter.universe = facet.filter.universe;
      if (facet.filter.category) filter.category = facet.filter.category;
      if (facet.filter.mimeType) filter.mimeType = facet.filter.mimeType;
      if (facet.filter.payloadKind) filter.payloadKind = facet.filter.payloadKind;
      if (facet.filter.pattern && !filter.pattern) {
        filter.pattern = facet.filter.pattern;
      }
    } else if (facetId && facetId !== 'all' && !filter.pattern) {
      filter.pattern = facetId;
    }

    return filter;
  }
}
