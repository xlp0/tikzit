/** @layer L4 interface/membrane */
import { DisposableList, SavepointGuard } from 'clm-kernel';
import type { RevertibleEffect, JournalMark, JournalEntry } from './types';

export class OperationJournal {
  private stack: JournalEntry[] = [];
  private markCounter = 0;

  constructor(private disposables?: DisposableList) {}

  public mark(): JournalMark {
    this.markCounter += 1;
    return this.markCounter;
  }

  public async run<T = void>(effect: RevertibleEffect<T>): Promise<T> {
    const guard = new SavepointGuard();
    guard.begin({ id: effect.id });
    try {
      const inverse = await effect.apply();
      const entry: JournalEntry = {
        id: effect.id,
        label: effect.label,
        inverse,
        mark: this.markCounter
      };
      this.stack.push(entry);
      if (this.disposables) {
        this.disposables.add(() => inverse());
      }
      guard.commit();
      return undefined as unknown as T;
    } catch (err) {
      await guard.rollback();
      throw err;
    }
  }

  public async undo(): Promise<boolean> {
    const entry = this.stack.pop();
    if (!entry) return false;
    await entry.inverse();
    return true;
  }

  public async rollbackTo(mark: JournalMark): Promise<void> {
    while (this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1];
      if (top.mark < mark) break;
      this.stack.pop();
      await top.inverse();
    }
  }

  public isClean(): boolean {
    return this.stack.length === 0;
  }

  public size(): number {
    return this.stack.length;
  }

  public async push(entry: {
    id?: string;
    label: string;
    apply: () => Promise<void> | void;
    revert: () => Promise<void> | void;
  }): Promise<void> {
    await this.run({
      id: entry.id ?? `effect_${this.stack.length + 1}`,
      label: entry.label,
      apply: async () => {
        await entry.apply();
        return async () => { await entry.revert(); };
      }
    });
  }

  public entries(): readonly { id: string; label: string }[] {
    return this.stack.map((e) => ({ id: e.id, label: e.label }));
  }
}
