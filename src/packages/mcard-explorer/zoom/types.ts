/** @layer L4 interface/membrane */
import type { CardInterface } from '../cards';

export type StructureNodeKind =
  | 'card'
  | 'record'
  | 'place'
  | 'transition'
  | 'node'
  | 'edge'
  | 'section'
  | 'element'
  | 'table'
  | 'field';

/** A node in a card's internal structure. Children are positions when card-shaped. */
export interface StructureNode {
  readonly id: string;
  readonly label: string;
  readonly kind: StructureNodeKind;
  readonly handle?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly children?: readonly StructureNode[];
}

/** One level of descent: which card we are inside, via which provider. */
export interface ZoomLevel {
  readonly handle: string;
  readonly hash: string;
  readonly providerId: string;
  readonly nodes: readonly StructureNode[];
  readonly outerInterface: CardInterface | null;
}

export interface ZoomPath {
  readonly levels: readonly ZoomLevel[];
  readonly cursor: number;
}

export interface ZoomCrumb {
  readonly label: string;
  readonly handle: string;
  readonly cursor: number;
}

export interface CardStructureInput {
  readonly handle: string;
  readonly hash: string;
  readonly mimeType?: string;
  readonly content?: Uint8Array;
  readonly text?: string;
  readonly listHandles?: (prefix: string) => Promise<readonly string[]> | readonly string[];
}

export interface CardStructureProvider {
  readonly id: string;
  readonly appliesTo: (handle: string, mimeType?: string) => boolean;
  readonly deriveStructure: (
    input: CardStructureInput
  ) => Promise<readonly StructureNode[]> | readonly StructureNode[];
}
