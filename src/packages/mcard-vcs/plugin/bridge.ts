/**
 * StudioMCardPluginBridge: Four DOTS Programming Idioms Communication Bridge
 *
 * Implements Getter/Setter, Dispatch/Callback, Mealy Transitions, and Explorer Engine.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../storage/OperadicMCardVfs';
import { MCardVcsEngine } from '../vcs/MCardVcsEngine';
import type { VfsEventType } from '../storage/events/VfsEventBus';
import type { SetCardOptions, CardView } from '../storage/lens/types';
import type { VcsInputIntent, VcsTransitionOutput } from '../vcs/types/mealy';

const registeredBridges = new Map<string, StudioMCardPluginBridge>();

export class StudioMCardPluginBridge {
  constructor(
    private vfsInstance: OperadicMCardVfs,
    private vcsInstance: MCardVcsEngine
  ) {}

  public get vfs(): OperadicMCardVfs {
    return this.vfsInstance;
  }

  public get vcs(): MCardVcsEngine {
    return this.vcsInstance;
  }

  // 1. Getter / Setter Lens Idiom (S ⊣ G)
  public async get(handle: string): Promise<CardView | null> {
    return await this.vfsInstance.get(handle);
  }

  public async set(
    handle: string,
    content: string | Uint8Array,
    options?: SetCardOptions
  ): Promise<string> {
    return await this.vfsInstance.set(handle, content, options);
  }

  // 2. Dispatch / Callback Event Idiom (Loose Wiring)
  public on<T = any>(type: VfsEventType | string, callback: (event: T) => void): () => void {
    return this.vfsInstance.on(type, callback);
  }

  // 3. Mealy Machine Transition Step (O = δ(s, i))
  public async step(intent: VcsInputIntent): Promise<VcsTransitionOutput> {
    return await this.vcsInstance.step(intent);
  }

  // 4. Raw VFS and VCS accessors
  public getVfs(): OperadicMCardVfs {
    return this.vfsInstance;
  }

  public getVcs(): MCardVcsEngine {
    return this.vcsInstance;
  }
}

export function registerPluginBridge(id: string, bridge: StudioMCardPluginBridge): void {
  registeredBridges.set(id, bridge);
}

export function getPluginBridge(id: string = 'clm:plugin:mcard-vcs'): StudioMCardPluginBridge | undefined {
  return registeredBridges.get(id);
}
