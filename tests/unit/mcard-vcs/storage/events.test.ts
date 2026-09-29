import { describe, it, expect, vi } from 'vitest';
import { VfsEventBus } from '../../../../src/packages/mcard-vcs/storage/events/VfsEventBus';

describe('VfsEventBus (Dispatch / Callback Loose Wiring)', () => {
  it('dispatches typed events to registered listeners', async () => {
    const bus = new VfsEventBus();
    const handler = vi.fn();

    const dispose = bus.on('card:staged', handler);
    expect(bus.listenerCount('card:staged')).toBe(1);

    await bus.dispatch('card:staged', {
      handle: 'zx:diagrams:test',
      hash: 'blake3:abc123',
      mimeType: 'text/vnd.tikz'
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      handle: 'zx:diagrams:test',
      hash: 'blake3:abc123',
      mimeType: 'text/vnd.tikz'
    });

    // Verify clean disposal token
    dispose();
    expect(bus.listenerCount('card:staged')).toBe(0);

    await bus.dispatch('card:staged', {
      handle: 'zx:diagrams:test2',
      hash: 'blake3:def456',
      mimeType: 'text/vnd.tikz'
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports multiple listeners for the same event and clears them', async () => {
    const bus = new VfsEventBus();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    bus.on('card:deleted', fn1);
    bus.on('card:deleted', fn2);
    expect(bus.listenerCount('card:deleted')).toBe(2);

    await bus.dispatch('card:deleted', { handle: 'zx:diagrams:deleted' });

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    bus.clear();
    expect(bus.listenerCount()).toBe(0);
  });

  it('safely handles throwing callbacks without halting dispatch pipeline', async () => {
    const bus = new VfsEventBus();
    const badHandler = vi.fn().mockImplementation(() => {
      throw new Error('Explosion');
    });
    const goodHandler = vi.fn();

    bus.on('savepoint:created', badHandler);
    bus.on('savepoint:created', goodHandler);

    await bus.dispatch('savepoint:created', { name: 'sp_1' });

    expect(badHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);
  });
});
