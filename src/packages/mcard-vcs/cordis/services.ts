/**
 * Cordis Service Declarations for MCard VCS and Storage
 *
 * Implements dependency inversion (Context passed IN, never imported).
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { Context, Service } from 'cordis';
import { OperadicMCardVfs } from '../storage/OperadicMCardVfs';
import { MCardVcsEngine } from '../vcs/MCardVcsEngine';
import {
  ExplorerQueryFacade,
  type ExplorerSearchFilter,
  type ExplorerCardSummaryDto,
  type ExplorerHistoryEntryDto
} from '../explorer/ExplorerQueryFacade';
import type { SemanticDiffResult } from '../vcs/types/commit';

declare module 'cordis' {
  interface Context {
    'mcard.storage': MCardStorageService;
    'mcard.vcs': MCardVcsService;
    'mcard.explorer': MCardExplorerService;
  }
}

export class MCardStorageService extends Service {
  constructor(ctx: Context, public vfs: OperadicMCardVfs) {
    super(ctx, 'mcard.storage');

    if (typeof (ctx as any).effect === 'function') {
      (ctx as any).effect(() => {
        return async () => {
          await this.vfs.close();
        };
      });
    }
  }

  public async close(): Promise<void> {
    await this.vfs.close();
  }
}

export class MCardVcsService extends Service {
  constructor(ctx: Context, public vcs: MCardVcsEngine) {
    super(ctx, 'mcard.vcs');
  }
}

export class MCardExplorerService extends Service {
  constructor(ctx: Context, public facade: ExplorerQueryFacade) {
    super(ctx, 'mcard.explorer');
  }

  public async query(filter: ExplorerSearchFilter = {}): Promise<ExplorerCardSummaryDto[]> {
    return await this.facade.search(filter);
  }

  public async listHandles(prefix?: string): Promise<string[]> {
    return await this.facade.listHandles(prefix);
  }

  public async getHistory(handle: string): Promise<ExplorerHistoryEntryDto[]> {
    return await this.facade.getHistory(handle);
  }

  public async describeDiff(
    handle: string,
    baseRef: string,
    targetRef: string
  ): Promise<SemanticDiffResult> {
    return await this.facade.describeDiff(handle, baseRef, targetRef);
  }

  public subscribe(cb: (event: any) => void): () => void {
    return this.facade.subscribe(cb);
  }
}
