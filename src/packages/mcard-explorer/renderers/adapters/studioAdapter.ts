/**
 * @clm/mcard-explorer: Studio CardViewletDefinition Adapter (ADR D34)
 *
 * Maps RendererDescriptor to mcard-studio's CardViewletDefinition shape.
 * Contract D ceiling: <= 60 LOC.
 */

import type { CardTabKind, RendererDescriptor } from '../registry/types';

export interface CardViewletDefinition {
  id: string;
  priority: number;
  supportedTabs?: readonly CardTabKind[];
  supportedExtensions?: readonly string[];
  supportedMimes?: readonly string[];
  predicate?: (card: unknown, tab?: unknown) => boolean;
  component: unknown;
}

export function toCardViewletDefinition(descriptor: RendererDescriptor): CardViewletDefinition {
  return {
    id: descriptor.id,
    priority: descriptor.priority,
    supportedTabs: descriptor.supportedTabs,
    supportedExtensions: descriptor.supportedExtensions,
    supportedMimes: descriptor.supportedMimes,
    predicate: (card: unknown) => {
      const c = (card ?? {}) as Record<string, unknown>;
      return descriptor.matches({
        mimeType: String(c.mimeType ?? c.mime ?? ''),
        handle: String(c.handle ?? c.id ?? ''),
        isBinary: Boolean(c.isBinary),
        universe: c.universe as string | undefined,
        category: c.category as string | undefined,
        content: c.content as Uint8Array | string | null | undefined,
      });
    },
    component: descriptor.component,
  };
}
