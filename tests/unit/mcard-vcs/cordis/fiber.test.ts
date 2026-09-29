import { describe, it, expect } from 'vitest';
import { VcsFiber } from '../../../../src/packages/mcard-vcs/cordis/VcsFiber';

describe('Sprint 27: VcsFiber Lifecycle & LIFO DisposableList Unwinding', () => {
  it('27-DOD-03: executes teardown closures in strict LIFO order', async () => {
    const fiber = new VcsFiber('fiber_lifo_test');
    const unwindOrder: number[] = [];

    const result = await fiber.executeSandwich(
      async () => {
        fiber.register(() => { unwindOrder.push(1); });
        fiber.register(() => { unwindOrder.push(2); });
      },
      async () => {
        fiber.register(() => { unwindOrder.push(3); });
        return 'success';
      },
      async () => {
        unwindOrder.push(4);
      }
    );

    expect(result).toBe('success');
    expect(fiber.state).toBe('DISPOSED');
    // Notice teardown is added before action (order of registration: 1, 2, 4, 3)
    // LIFO unwind must be reverse: [3, 4, 2, 1]
    expect(unwindOrder).toEqual([3, 4, 2, 1]);
  });

  it('27-DOD-04: models 5-state lifecycle and prevents illegal operations', async () => {
    const fiber = new VcsFiber('fiber_lifecycle_test');
    expect(fiber.state).toBe('PENDING');

    let observedActiveState = '';
    await fiber.executeSandwich(
      async () => {},
      async () => {
        observedActiveState = fiber.state;
      },
      async () => {}
    );

    expect(observedActiveState).toBe('ACTIVE');
    expect(fiber.state).toBe('DISPOSED');

    // Executing again from DISPOSED must throw
    await expect(
      fiber.executeSandwich(async () => {}, async () => {}, async () => {})
    ).rejects.toThrow(/cannot execute sandwich from state: DISPOSED/);

    // Registering in DISPOSED state must throw
    expect(() => fiber.register(() => {})).toThrow(/Cannot register disposable in illegal state/);
  });

  it('27-DOD-05: guarantees unwinding even if action throws an unhandled error', async () => {
    const fiber = new VcsFiber('fiber_error_test');
    let cleanedUp = false;

    await expect(
      fiber.executeSandwich(
        async () => {},
        async () => {
          fiber.register(() => { cleanedUp = true; });
          throw new Error('Crash during transaction');
        },
        async () => {}
      )
    ).rejects.toThrow('Crash during transaction');

    expect(cleanedUp).toBe(true);
    expect(fiber.state).toBe('DISPOSED');
  });
});
