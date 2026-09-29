import { describe, it, expect, vi } from 'vitest';
import { OperationJournal } from '../../../../src/packages/mcard-explorer/time/journal';
import { DisposableList } from 'clm-kernel';

describe('OperationJournal (39-DOD-03 & 39-DOD-04)', () => {
  it('39-DOD-03: push({ apply, revert, label }) executes and adds entry; undo() invokes revert() in LIFO order', async () => {
    const journal = new OperationJournal();
    const state: string[] = [];

    expect(journal.isClean()).toBe(true);
    expect(journal.size()).toBe(0);

    // Apply step 1
    await journal.push({
      label: 'Add A',
      apply: () => { state.push('A'); },
      revert: () => { state.pop(); }
    });
    expect(state).toEqual(['A']);
    expect(journal.size()).toBe(1);
    expect(journal.isClean()).toBe(false);

    // Apply step 2
    await journal.push({
      label: 'Add B',
      apply: () => { state.push('B'); },
      revert: () => { state.pop(); }
    });
    expect(state).toEqual(['A', 'B']);
    expect(journal.size()).toBe(2);

    // Apply step 3
    await journal.push({
      label: 'Add C',
      apply: () => { state.push('C'); },
      revert: () => { state.pop(); }
    });
    expect(state).toEqual(['A', 'B', 'C']);
    expect(journal.size()).toBe(3);

    // Undo 1: pops C
    const undone1 = await journal.undo();
    expect(undone1).toBe(true);
    expect(state).toEqual(['A', 'B']);
    expect(journal.size()).toBe(2);

    // Undo 2: pops B
    const undone2 = await journal.undo();
    expect(undone2).toBe(true);
    expect(state).toEqual(['A']);
    expect(journal.size()).toBe(1);

    // Undo 3: pops A
    const undone3 = await journal.undo();
    expect(undone3).toBe(true);
    expect(state).toEqual([]);
    expect(journal.size()).toBe(0);
    expect(journal.isClean()).toBe(true);

    // Undo on empty returns false
    const undone4 = await journal.undo();
    expect(undone4).toBe(false);
  });

  it('39-DOD-04: Zero-residue undo: after N mutations and N undo() calls, state equals baseline', async () => {
    const journal = new OperationJournal();
    const baseline = { count: 0, text: 'initial', flags: [1, 2] };
    const current = JSON.parse(JSON.stringify(baseline));

    const N = 10;
    for (let i = 1; i <= N; i++) {
      const prevCount = current.count;
      const prevText = current.text;
      await journal.push({
        label: `Mutation ${i}`,
        apply: () => {
          current.count += 5;
          current.text = `val-${i}`;
          current.flags.push(i);
        },
        revert: () => {
          current.count = prevCount;
          current.text = prevText;
          current.flags.pop();
        }
      });
    }

    expect(current.count).toBe(50);
    expect(current.text).toBe('val-10');
    expect(current.flags.length).toBe(12);
    expect(journal.size()).toBe(N);

    // Unwind all N mutations
    for (let i = 0; i < N; i++) {
      await journal.undo();
    }

    expect(journal.isClean()).toBe(true);
    expect(current).toEqual(baseline);
  });

  it('39-DOD-04: SavepointGuard rollback on failed effect drops pending journal entry without leaking revert callbacks', async () => {
    const journal = new OperationJournal();
    const revertSpy = vi.fn();

    await expect(journal.run({
      id: 'failing_effect',
      label: 'Fails during apply',
      apply: async () => {
        throw new Error('Apply failed in transaction');
      }
    })).rejects.toThrow('Apply failed in transaction');

    expect(journal.isClean()).toBe(true);
    expect(journal.size()).toBe(0);
    expect(revertSpy).not.toHaveBeenCalled();
  });

  it('rollbackTo(mark) unwinds exactly to the mark', async () => {
    const journal = new OperationJournal();
    const logs: string[] = [];

    await journal.push({
      label: 'Op 1',
      apply: () => { logs.push('1'); },
      revert: () => { logs.splice(logs.indexOf('1'), 1); }
    });

    const mark = journal.mark();

    await journal.push({
      label: 'Op 2',
      apply: () => { logs.push('2'); },
      revert: () => { logs.splice(logs.indexOf('2'), 1); }
    });
    await journal.push({
      label: 'Op 3',
      apply: () => { logs.push('3'); },
      revert: () => { logs.splice(logs.indexOf('3'), 1); }
    });

    expect(logs).toEqual(['1', '2', '3']);
    await journal.rollbackTo(mark);
    expect(logs).toEqual(['1']);
    expect(journal.size()).toBe(1);
  });
});
