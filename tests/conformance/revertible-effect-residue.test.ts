import { describe, it, expect } from 'vitest';
import { OperationJournal } from '../../src/packages/mcard-explorer/time/journal';
import { CoeffectHost } from '../../src/packages/mcard-explorer/poly/coeffects';

describe('Revertible Effect Zero-Residue Laws (40-DOD-01)', () => {
  it('satisfies zero residue after rollbackTo via deep-equality snapshot comparison', async () => {
    const host = new CoeffectHost();
    const journal = new OperationJournal();

    // Initial baseline state
    host.publish('drawer.view', 'diagrams');
    host.publish('selection.active', 'card:alpha');
    host.publish('editor.dirty', false);

    const initialSnapshot = host.snapshot();
    const markBaseline = journal.mark();

    // Perform three revertible mutations
    await journal.run({
      id: 'effect:switch-view',
      label: 'Switch to MCards View',
      apply: async () => {
        const prev = host.get('drawer.view');
        host.publish('drawer.view', 'mcards');
        return async () => {
          host.publish('drawer.view', prev);
        };
      }
    });

    await journal.run({
      id: 'effect:select-card',
      label: 'Select Beta Card',
      apply: async () => {
        const prev = host.get('selection.active');
        host.publish('selection.active', 'card:beta');
        return async () => {
          host.publish('selection.active', prev);
        };
      }
    });

    await journal.run({
      id: 'effect:mark-dirty',
      label: 'Mark Dirty',
      apply: async () => {
        const prev = host.get('editor.dirty');
        host.publish('editor.dirty', true);
        return async () => {
          host.publish('editor.dirty', prev);
        };
      }
    });

    expect(journal.isClean()).toBe(false);
    expect(journal.size()).toBe(3);
    expect(host.snapshot()).not.toEqual(initialSnapshot);

    // Rollback to baseline
    await journal.rollbackTo(markBaseline);

    expect(journal.isClean()).toBe(true);
    expect(journal.size()).toBe(0);

    // Assert exact zero residue: deep snapshot equality
    const postRollbackSnapshot = host.snapshot();
    expect(postRollbackSnapshot).toEqual(initialSnapshot);
  });

  it('satisfies LIFO inverse execution order: e_n^-1 ... e_1^-1', async () => {
    const journal = new OperationJournal();
    const orderOfReversals: string[] = [];

    const mark = journal.mark();

    await journal.run({
      id: 'e1',
      label: 'First Effect',
      apply: async () => async () => {
        orderOfReversals.push('e1');
      }
    });

    await journal.run({
      id: 'e2',
      label: 'Second Effect',
      apply: async () => async () => {
        orderOfReversals.push('e2');
      }
    });

    await journal.run({
      id: 'e3',
      label: 'Third Effect',
      apply: async () => async () => {
        orderOfReversals.push('e3');
      }
    });

    await journal.rollbackTo(mark);

    expect(orderOfReversals).toEqual(['e3', 'e2', 'e1']);
  });

  it('satisfies Atomicity on throw: failed forward effect leaves no journal residue', async () => {
    const journal = new OperationJournal();
    expect(journal.size()).toBe(0);

    await expect(
      journal.run({
        id: 'failing_effect',
        label: 'Will Throw',
        apply: async () => {
          throw new Error('Deterministic network/IO failure');
        }
      })
    ).rejects.toThrow('Deterministic network/IO failure');

    // Journal remains clean, no partial entry recorded
    expect(journal.isClean()).toBe(true);
    expect(journal.size()).toBe(0);
  });

  it('satisfies isClean() truthfulness across lifecycle', async () => {
    const journal = new OperationJournal();
    expect(journal.isClean()).toBe(true);

    await journal.push({
      label: 'Simple reversible op',
      apply: () => {},
      revert: () => {}
    });

    expect(journal.isClean()).toBe(false);

    const undone = await journal.undo();
    expect(undone).toBe(true);
    expect(journal.isClean()).toBe(true);

    const extraUndo = await journal.undo();
    expect(extraUndo).toBe(false);
    expect(journal.isClean()).toBe(true);
  });
});
