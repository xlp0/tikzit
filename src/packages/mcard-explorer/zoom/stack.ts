/** @layer L4 interface/membrane */
import type { Position, Direction } from '../poly/types';
import type { CardInterface } from '../cards';
import type { StructureRegistry } from './providers';
import type { StructureNode, ZoomLevel, ZoomPath, ZoomCrumb } from './types';

export interface CardContentProvider {
  getContent(handle: string): Promise<{ content?: Uint8Array; text?: string; mimeType?: string } | null>;
  getInterface?: (handle: string) => Promise<CardInterface | null>;
}

export interface ZoomStackOptions {
  readonly maxDepth?: number;
}

export class ZoomStack {
  private levels: ZoomLevel[] = [];
  private activeCursor = 0;
  private readonly maxDepth: number;

  constructor(
    private readonly providers: StructureRegistry,
    private readonly content: CardContentProvider,
    options: ZoomStackOptions = {}
  ) {
    this.maxDepth = options.maxDepth ?? 8;
  }

  public get currentPath(): ZoomPath {
    return {
      levels: [...this.levels],
      cursor: this.activeCursor
    };
  }

  public resolveZoomDirections(position: Position): readonly Direction[] {
    const provider = this.providers.resolveProvider(position.handle, position.mimeType);
    if (!provider) return [];

    const directions: Direction[] = [
      {
        id: 'zoom.enter',
        label: `Zoom into ${position.title || position.handle}`,
        group: 'navigate',
        default: true,
        legality: (pos) => Boolean(this.providers.resolveProvider(pos.handle, pos.mimeType)),
        execute: async (pos) => {
          await this.enter(pos);
          return { success: true, producedHandle: pos.handle };
        }
      }
    ];

    if (this.levels.length > 0) {
      directions.push({
        id: 'zoom.exit',
        label: 'Zoom Out',
        group: 'navigate',
        legality: () => this.levels.length > 0,
        execute: async () => {
          this.exit();
          return { success: true };
        }
      });
    }

    return directions;
  }

  public async enter(position: Position, nodeHandle?: string): Promise<ZoomPath> {
    const targetHandle = nodeHandle || position.handle;

    // 1. Max depth bound
    if (this.levels.length >= this.maxDepth) {
      return this.currentPath;
    }

    // 2. Cycle prevention guard
    if (this.levels.some(l => l.handle === targetHandle)) {
      return this.currentPath;
    }

    const loaded = await this.content.getContent(targetHandle);
    const mimeType = loaded?.mimeType || position.mimeType;
    const provider = this.providers.resolveProvider(targetHandle, mimeType);

    if (!provider) {
      return this.currentPath;
    }

    const nodes = await provider.deriveStructure({
      handle: targetHandle,
      hash: position.hash || '',
      mimeType,
      content: loaded?.content,
      text: loaded?.text
    });

    const outerInterface = this.content.getInterface
      ? await this.content.getInterface(targetHandle)
      : null;

    const newLevel: ZoomLevel = {
      handle: targetHandle,
      hash: position.hash || '',
      providerId: provider.id,
      nodes,
      outerInterface
    };

    this.levels.push(newLevel);
    this.activeCursor = this.levels.length;
    return this.currentPath;
  }

  public exit(): ZoomPath {
    if (this.levels.length === 0) {
      return this.currentPath; // Idempotent no-op at root
    }

    this.levels.pop();
    this.activeCursor = this.levels.length;
    return this.currentPath;
  }

  public to(cursor: number): ZoomPath {
    if (cursor < 0) {
      this.levels = [];
      this.activeCursor = 0;
      return this.currentPath;
    }

    if (cursor < this.levels.length) {
      this.levels = this.levels.slice(0, cursor);
      this.activeCursor = this.levels.length;
    }

    return this.currentPath;
  }

  public nodes(): readonly StructureNode[] {
    if (this.levels.length === 0) return [];
    return this.levels[this.levels.length - 1].nodes;
  }

  public breadcrumb(): readonly ZoomCrumb[] {
    const crumbs: ZoomCrumb[] = [{ label: 'Root', handle: '', cursor: 0 }];
    for (let i = 0; i < this.levels.length; i++) {
      crumbs.push({
        label: this.levels[i].handle,
        handle: this.levels[i].handle,
        cursor: i + 1
      });
    }
    return crumbs;
  }
}
