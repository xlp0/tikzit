/**
 * VcsFiber: Spatiotemporal Enclave & LIFO Disposable Fiber
 *
 * Implements 5-state lifecycle and LIFO resource unwinding via clm-kernel's DisposableList.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { Context } from 'cordis';
import { DisposableList } from 'clm-kernel';

export type FiberState = 'PENDING' | 'LOADING' | 'ACTIVE' | 'UNLOADING' | 'DISPOSED';
export type DisposableClosure = () => Promise<void> | void;

export class VcsFiber {
  private _state: FiberState = 'PENDING';
  public readonly disposables: DisposableList;

  constructor(
    public readonly id: string,
    private ctx?: Context
  ) {
    this.disposables = new DisposableList();
  }

  public get state(): FiberState {
    return this._state;
  }

  public register(disposable: DisposableClosure): void {
    if (this._state === 'DISPOSED' || this._state === 'UNLOADING') {
      throw new Error(`Cannot register disposable in illegal state: ${this._state}`);
    }
    this.disposables.add(disposable);
  }

  public async executeSandwich<T>(
    setup: () => Promise<void>,
    action: () => Promise<T>,
    teardown: () => Promise<void>
  ): Promise<T> {
    if (this._state !== 'PENDING') {
      throw new Error(`VcsFiber ${this.id} cannot execute sandwich from state: ${this._state}`);
    }

    this._state = 'LOADING';
    try {
      await setup();
      this.disposables.add(teardown);
      this._state = 'ACTIVE';

      const result = await action();
      return result;
    } finally {
      this._state = 'UNLOADING';
      try {
        await this.disposables.dispose();
      } catch (unwindErr) {
        console.error(`[VcsFiber:${this.id}] Error during LIFO unwinding:`, unwindErr);
      }
      this._state = 'DISPOSED';
    }
  }

  public async dispose(): Promise<void> {
    if (this._state === 'DISPOSED') return;
    this._state = 'UNLOADING';
    try {
      await this.disposables.dispose();
    } finally {
      this._state = 'DISPOSED';
    }
  }
}
