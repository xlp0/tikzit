import { describe, it, expect } from 'vitest';
import {
  CoreNamespaceNavigationProvider,
  CoreContainmentNavigationProvider,
  registerDefaultNavigationProviders
} from '../../../../src/packages/mcard-explorer/zoom/navigation';
import { NavigationProviderRegistry } from '../../../../src/packages/mcard-explorer/poly/navigation';
import type { Position } from '../../../../src/packages/mcard-explorer/poly/types';

describe('Default Navigation Providers & Deep Links (38-DOD-18)', () => {
  it('registers core.namespace and core.containment in NavigationProviderRegistry', () => {
    const registry = new NavigationProviderRegistry();
    const unregister = registerDefaultNavigationProviders(registry);

    const rootPos: Position = {
      id: 'pos:workspace:card1',
      handle: 'workspace:card1',
      hash: 'h1',
      mimeType: 'text/markdown',
      surface: 'tree'
    };

    const containedPos: Position = {
      id: 'pos:workspace:card1:table:users',
      handle: 'workspace:card1',
      hash: 'h1',
      mimeType: 'application/x-sqlite3',
      surface: 'zoom',
      zoomPath: ['table:users']
    };

    const providers = registry.list();
    expect(providers.some((p) => p.id === 'core.namespace')).toBe(true);
    expect(providers.some((p) => p.id === 'core.containment')).toBe(true);

    const rootProvider = providers.find((p) => p.appliesTo(rootPos));
    expect(rootProvider?.id).toBe('core.namespace');

    const zoomProvider = providers.find((p) => p.appliesTo(containedPos));
    expect(zoomProvider?.id).toBe('core.containment');

    const decoded = registry.fromAddress('#/card/doc%3Areadme');
    expect(decoded?.handle).toBe('doc:readme');

    unregister();
  });

  it('performs URL hash round-trip for #/card/<handle> (card position)', () => {
    const position: Position = {
      id: 'pos:doc:readme',
      handle: 'doc:readme',
      hash: 'h_readme',
      mimeType: 'text/plain',
      surface: 'tree'
    };

    const encoded = CoreNamespaceNavigationProvider.encodeAddress!(position);
    expect(encoded).toBe('#/card/doc%3Areadme');

    const decoded = CoreNamespaceNavigationProvider.decodeAddress!(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.handle).toBe('doc:readme');
    expect(decoded?.surface).toBe('tree');
  });

  it('performs URL hash round-trip for #/card/<handle>/<nodeId> (contained node position)', () => {
    const position: Position = {
      id: 'pos:collection:db:table:users',
      handle: 'collection:db',
      hash: 'h_db',
      mimeType: 'application/x-sqlite3',
      surface: 'zoom',
      zoomPath: ['table:users']
    };

    const encoded = CoreContainmentNavigationProvider.encodeAddress!(position);
    expect(encoded).toBe('#/card/collection%3Adb/table%3Ausers');

    const decoded = CoreContainmentNavigationProvider.decodeAddress!(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.handle).toBe('collection:db');
    expect(decoded?.surface).toBe('zoom');
    expect(decoded?.zoomPath).toEqual(['table:users']);
  });
});
