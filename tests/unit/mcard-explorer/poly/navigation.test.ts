import { describe, it, expect } from 'vitest';
import { NavigationProviderRegistry } from '../../../../src/packages/mcard-explorer/poly/navigation';
import type { NavigationProvider, Position } from '../../../../src/packages/mcard-explorer/poly/types';

describe('NavigationProvider & NavigationProviderRegistry', () => {
  const dummyRootPos: Position = {
    id: 'root:zx',
    handle: 'zx',
    hash: 'h0',
    mimeType: 'application/x-directory',
    surface: 'tree'
  };

  const dummyChildPos: Position = {
    id: 'child:zx:ghz',
    handle: 'zx:ghz',
    hash: 'h1',
    mimeType: 'text/x-tikz',
    surface: 'tree'
  };

  const sampleProvider: NavigationProvider = {
    id: 'core.namespace',
    label: 'Core Namespace',
    appliesTo: (pos) => pos === null || pos.handle.startsWith('zx'),
    resolveRoot: async () => [dummyRootPos],
    resolveChildren: async (pos) => (pos.handle === 'zx' ? [dummyChildPos] : []),
    encodeAddress: (pos) => `mcard://${pos.handle}`,
    decodeAddress: (addr) => {
      if (!addr.startsWith('mcard://')) return null;
      const handle = addr.replace('mcard://', '');
      return {
        id: `addr:${handle}`,
        handle,
        hash: 'resolved',
        mimeType: 'text/x-tikz',
        surface: 'tree'
      };
    }
  };

  it('registers and unregisters providers', () => {
    const reg = new NavigationProviderRegistry();
    const dispose = reg.register(sampleProvider);
    expect(reg.list()).toHaveLength(1);
    expect(reg.list()[0].id).toBe('core.namespace');

    dispose();
    expect(reg.list()).toHaveLength(0);
  });

  it('resolves root positions and children across applicable providers', async () => {
    const reg = new NavigationProviderRegistry();
    reg.register(sampleProvider);

    const roots = await reg.resolveRoot();
    expect(roots).toHaveLength(1);
    expect(roots[0].handle).toBe('zx');

    const children = await reg.children(dummyRootPos);
    expect(children).toHaveLength(1);
    expect(children[0].handle).toBe('zx:ghz');
  });

  it('encodeAddress and decodeAddress round-trip identity for card handle addresses (36-DOD-20)', () => {
    const reg = new NavigationProviderRegistry();
    reg.register(sampleProvider);

    const addr = sampleProvider.encodeAddress!(dummyChildPos);
    expect(addr).toBe('mcard://zx:ghz');

    const decoded = reg.fromAddress(addr);
    expect(decoded).not.toBeNull();
    expect(decoded?.handle).toBe(dummyChildPos.handle);
  });
});
