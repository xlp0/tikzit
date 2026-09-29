/**
 * @clm/mcard-explorer: Higher-Universe CLM Card Renderers
 *
 * Contract D ceiling: <= 250 LOC.
 */

import type { RendererRegistry } from '../registry/RendererRegistry';
import { TikzCardRenderer, tikzDescriptor, register as registerTikz } from './TikzCardRenderer';
import { SqliteCollectionRenderer, sqliteDescriptor, register as registerSqlite } from './SqliteCollectionRenderer';
import { PCardRenderer, pcardDescriptor, register as registerPCard } from './PCardRenderer';
import { VCardRenderer, vcardDescriptor, register as registerVCard } from './VCardRenderer';
import { SatoriCardRenderer, satoriDescriptor, register as registerSatori } from './SatoriCardRenderer';

export {
  TikzCardRenderer, tikzDescriptor, registerTikz,
  SqliteCollectionRenderer, sqliteDescriptor, registerSqlite,
  PCardRenderer, pcardDescriptor, registerPCard,
  VCardRenderer, vcardDescriptor, registerVCard,
  SatoriCardRenderer, satoriDescriptor, registerSatori,
};

export function registerClmViewlets(registry: RendererRegistry): void {
  registerTikz(registry);
  registerSqlite(registry);
  registerPCard(registry);
  registerVCard(registry);
  registerSatori(registry);
}
