import { describe, it, expect, vi } from 'vitest';
import {
  CoeffectHost,
  CoeffectEnvironment,
  type CoeffectDeclaration
} from '../../../../src/packages/mcard-explorer/poly/coeffects';
import type { Position, Direction } from '../../../../src/packages/mcard-explorer/poly/types';

describe('CoeffectHost & CoeffectEnvironment (39-DOD-07)', () => {
  const dummyPos: Position = {
    id: 'pos:1',
    handle: 'card:coeffect',
    hash: 'h1',
    mimeType: 'text/plain',
    surface: 'list'
  };

  it('39-DOD-07: CoeffectEnvironment reads capabilities and notifies subscribers on update', () => {
    const env = new CoeffectEnvironment({
      viewport: { width: 1024, height: 768 },
      permissions: { canWrite: true, canExport: false },
      storageQuota: { used: 50, total: 100 },
      activeDevice: 'desktop'
    });

    const caps = env.get();
    expect(caps.viewport).toEqual({ width: 1024, height: 768 });
    expect(caps.permissions?.canExport).toBe(false);
    expect(caps.storageQuota).toEqual({ used: 50, total: 100 });
    expect(caps.activeDevice).toBe('desktop');

    const listener = vi.fn();
    const unsub = env.subscribe(listener);

    env.update({ permissions: { canWrite: true, canExport: true } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      permissions: { canWrite: true, canExport: true }
    }));

    unsub();
    env.update({ activeDevice: 'mobile' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('39-DOD-07: Coeffect changes re-evaluate direction legality without full page reload', () => {
    const env = new CoeffectEnvironment({
      permissions: { canExport: false }
    });

    // Direction whose legality is parameterized by the coeffect environment
    const exportDirection: Direction = {
      id: 'export.disk',
      label: 'Export to Disk',
      legality: () => Boolean(env.get().permissions?.canExport),
      execute: async () => ({ success: true })
    };

    // Initially illegal
    expect(exportDirection.legality(dummyPos)).toBe(false);

    // Update permission coeffect dynamically
    env.update({ permissions: { canExport: true } });

    // Now legal without page reload
    expect(exportDirection.legality(dummyPos)).toBe(true);
  });

  it('CoeffectHost: publishes slice values and only notifies panels subscribed to that slice', () => {
    const host = new CoeffectHost();

    const panelAChange = vi.fn();
    const declA: CoeffectDeclaration<string> = {
      panelId: 'panel-a',
      slices: ['theme', 'locale'],
      onChange: panelAChange
    };

    const panelBChange = vi.fn();
    const declB: CoeffectDeclaration<number> = {
      panelId: 'panel-b',
      slices: ['zoomLevel'],
      onChange: panelBChange
    };

    const unsubA = host.bind(declA);
    host.bind(declB);

    // Publish to 'theme' -> only panel A notified
    host.publish('theme', 'dark');
    expect(panelAChange).toHaveBeenCalledWith('dark', undefined);
    expect(panelBChange).not.toHaveBeenCalled();

    // Publish to 'zoomLevel' -> only panel B notified
    host.publish('zoomLevel', 1.5);
    expect(panelBChange).toHaveBeenCalledWith(1.5, undefined);
    expect(panelAChange).toHaveBeenCalledTimes(1);

    // Unsub panel A
    unsubA();
    host.publish('locale', 'en-US');
    expect(panelAChange).toHaveBeenCalledTimes(1); // not called again
  });
});
