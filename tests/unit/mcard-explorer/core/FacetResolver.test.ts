import { describe, it, expect } from 'vitest';
import { FacetResolver, CORE_FACETS } from '../../../../src/packages/mcard-explorer/core/FacetResolver';

describe('FacetResolver (ADR D49)', () => {
  it('resolves core facets and returns full list', () => {
    const resolver = new FacetResolver();
    const facets = resolver.listFacets();
    expect(facets).toHaveLength(CORE_FACETS.length);
    expect(resolver.getFacet('process')?.filter.universe).toBe('U1');
    expect(resolver.getFacet('proof')?.filter.universe).toBe('U2');
    expect(resolver.getFacet('conversation')?.filter.universe).toBe('U3');
    expect(resolver.getFacet('diagram')?.filter.category).toBe('diagram');
  });

  it('maps process facet to universe U1 filter', () => {
    const resolver = new FacetResolver();
    const filter = resolver.resolveFilter('process');
    expect(filter.universe).toBe('U1');
    expect(filter.limit).toBe(100);
  });

  it('preserves user search query pattern while applying facet filters', () => {
    const resolver = new FacetResolver();
    const filter = resolver.resolveFilter('diagram', 'ghz');
    expect(filter.pattern).toBe('ghz');
    expect(filter.category).toBe('diagram');
  });

  it('falls back to facet pattern if no query is provided (e.g. artifacts)', () => {
    const resolver = new FacetResolver();
    const filter = resolver.resolveFilter('artifacts');
    expect(filter.pattern).toBe('zx:artifacts:');
  });
});
