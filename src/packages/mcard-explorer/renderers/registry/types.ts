/**
 * @clm/mcard-explorer: Universal Polyglot Renderer Registry Types
 *
 * Headless: zero DOM globals, React imported type-only.
 * Contract D ceiling: <= 120 LOC.
 */

import type { ComponentType, CSSProperties, LazyExoticComponent } from 'react';
import type { HypermediaNode } from 'clm-kernel';

export interface BaseCardRendererProps {
  handle: string;
  hash: string;
  content: Uint8Array;
  text: string;
  mimeType: string;
  universe: string; // 'U0'..'U5'
  category: string;
  metadata?: Record<string, unknown>;
  style?: CSSProperties;
  onAction?: (actionId: string, payload?: unknown) => Promise<void>;
}

export interface RendererResolutionInput {
  mimeType: string;
  handle: string;
  isBinary: boolean;
  universe?: string;
  category?: string;
  payloadKind?: 'scalar' | 'text' | 'satori' | 'binary' | 'structured' | 'executable';
  content?: Uint8Array | string | null;
}

export type ViewportMode =
  | 'fit'    // scale-to-pane (images, SVG diagrams)
  | 'scroll' // vertical scroll (text, code, hex, markdown — default)
  | 'zoom'   // pan/zoom chrome (images, TikZ previews, large PDFs)
  | 'paged'  // pager controls (PDFs, multi-record data sets)
  | 'split'; // dual raw+rendered panes (markdown, YAML, data)

export interface RendererAction {
  id: string;
  label: string;
  icon?: string;
  payload?: Record<string, unknown>;
}

export type CardTabKind = 'visual' | 'text' | 'raw_data' | 'raw' | 'merkle';

export interface RendererDescriptor {
  id: string;
  priority: number;
  matches: (input: RendererResolutionInput) => boolean;
  supportedTabs?: readonly CardTabKind[];
  supportedMimes?: readonly string[];
  supportedExtensions?: readonly string[];
  viewport?: ViewportMode;
  actions?: RendererAction[];
  component: ComponentType<BaseCardRendererProps> | LazyExoticComponent<ComponentType<BaseCardRendererProps>>;
  toHypermediaNode?: (
    content: Uint8Array,
    text: string,
    judgment: { mime: string; universe: string; category: string }
  ) => HypermediaNode;
}
