/** @layer L4 interface/membrane */
import type { Position, NavigationProvider } from '../poly/types';
import { NavigationProviderRegistry } from '../poly/navigation';

export const CoreNamespaceNavigationProvider: NavigationProvider = {
  id: 'core.namespace',
  label: 'Namespace Navigation',
  appliesTo: (position) => !position || !position.zoomPath || position.zoomPath.length === 0,
  resolveRoot: async () => [],
  encodeAddress: (position) => `#/card/${encodeURIComponent(position.handle)}`,
  decodeAddress: (address) => {
    const match = address.match(/^#\/card\/([^/]+)$/);
    if (!match) return null;
    const handle = decodeURIComponent(match[1]);
    return {
      id: `pos:${handle}`,
      handle,
      hash: '',
      mimeType: 'text/plain',
      surface: 'tree'
    };
  }
};

export const CoreContainmentNavigationProvider: NavigationProvider = {
  id: 'core.containment',
  label: 'Containment Navigation',
  appliesTo: (position) => Boolean(position && position.zoomPath && position.zoomPath.length > 0),
  resolveRoot: async () => [],
  encodeAddress: (position) => {
    const node = position.zoomPath?.[0];
    if (node) {
      return `#/card/${encodeURIComponent(position.handle)}/${encodeURIComponent(node)}`;
    }
    return `#/card/${encodeURIComponent(position.handle)}`;
  },
  decodeAddress: (address) => {
    const match = address.match(/^#\/card\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const handle = decodeURIComponent(match[1]);
    const nodeId = decodeURIComponent(match[2]);
    return {
      id: `pos:${handle}:${nodeId}`,
      handle,
      hash: '',
      mimeType: 'text/plain',
      surface: 'zoom',
      zoomPath: [nodeId]
    };
  }
};

export function registerDefaultNavigationProviders(
  registry: NavigationProviderRegistry
): () => void {
  const unreg1 = registry.register(CoreNamespaceNavigationProvider);
  const unreg2 = registry.register(CoreContainmentNavigationProvider);
  return () => {
    unreg1();
    unreg2();
  };
}
