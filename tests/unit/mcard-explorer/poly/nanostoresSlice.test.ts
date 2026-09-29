import { describe, it, expect, vi } from 'vitest';
import { map, atom, listenKeys } from 'nanostores';

describe('Nanostores Coeffect Slice Conformance (39-DOD-19)', () => {
  it('39-DOD-19: Coeffects via nanostores map: subscribers receive minimal notifications', () => {
    interface CoeffectState {
      viewportWidth: number;
      viewportHeight: number;
      theme: 'dark' | 'light';
      canExport: boolean;
      activeFacet: string;
    }

    const coeffects = map<CoeffectState>({
      viewportWidth: 1280,
      viewportHeight: 720,
      theme: 'dark',
      canExport: true,
      activeFacet: 'all'
    });

    const themeSubscriber = vi.fn();
    const exportSubscriber = vi.fn();
    const viewportSubscriber = vi.fn();

    // Listen only to specified slice keys
    listenKeys(coeffects, ['theme'], themeSubscriber);
    listenKeys(coeffects, ['canExport'], exportSubscriber);
    listenKeys(coeffects, ['viewportWidth', 'viewportHeight'], viewportSubscriber);

    // Initial state: 0 calls
    expect(themeSubscriber).toHaveBeenCalledTimes(0);
    expect(exportSubscriber).toHaveBeenCalledTimes(0);
    expect(viewportSubscriber).toHaveBeenCalledTimes(0);

    // 1. Mutate activeFacet (unsubscribed key)
    coeffects.setKey('activeFacet', 'diagrams');
    expect(themeSubscriber).toHaveBeenCalledTimes(0);
    expect(exportSubscriber).toHaveBeenCalledTimes(0);
    expect(viewportSubscriber).toHaveBeenCalledTimes(0);

    // 2. Mutate theme
    coeffects.setKey('theme', 'light');
    expect(themeSubscriber).toHaveBeenCalledTimes(1);
    expect(exportSubscriber).toHaveBeenCalledTimes(0);
    expect(viewportSubscriber).toHaveBeenCalledTimes(0);

    // 3. Mutate canExport
    coeffects.setKey('canExport', false);
    expect(themeSubscriber).toHaveBeenCalledTimes(1);
    expect(exportSubscriber).toHaveBeenCalledTimes(1);
    expect(viewportSubscriber).toHaveBeenCalledTimes(0);

    // 4. Mutate viewport
    coeffects.setKey('viewportWidth', 1920);
    expect(themeSubscriber).toHaveBeenCalledTimes(1);
    expect(exportSubscriber).toHaveBeenCalledTimes(1);
    expect(viewportSubscriber).toHaveBeenCalledTimes(1);
  });

  it('39-DOD-19: Atom slice subscriptions guarantee zero unnecessary notifications', () => {
    const themeAtom = atom<'dark' | 'light'>('dark');
    const quotaAtom = atom<{ used: number; total: number }>({ used: 10, total: 100 });

    const themeSpy = vi.fn();
    const quotaSpy = vi.fn();

    themeAtom.listen(themeSpy);
    quotaAtom.listen(quotaSpy);

    // Update quota -> only quotaSpy called
    quotaAtom.set({ used: 20, total: 100 });
    expect(quotaSpy).toHaveBeenCalledTimes(1);
    expect(themeSpy).toHaveBeenCalledTimes(0);

    // Update theme -> only themeSpy called
    themeAtom.set('light');
    expect(quotaSpy).toHaveBeenCalledTimes(1);
    expect(themeSpy).toHaveBeenCalledTimes(1);
  });
});
