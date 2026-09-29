/** @layer L4 interface/membrane */
import { CardPortRegistry } from '../ports';
import { TikzDiagramPortProvider } from './tikz';
import { TexPortProvider } from './tex';
import { ImagePortProvider } from './image';
import { PdfPortProvider } from './pdf';
import { MarkdownPortProvider } from './markdown';
import { SqliteCollectionPortProvider } from './sqlite';
import { PcardProcessPortProvider } from './pcard';

export {
  TikzDiagramPortProvider,
  TexPortProvider,
  ImagePortProvider,
  PdfPortProvider,
  MarkdownPortProvider,
  SqliteCollectionPortProvider,
  PcardProcessPortProvider
};

export function createDefaultPortRegistry(): CardPortRegistry {
  const registry = new CardPortRegistry();
  registry.register(new TikzDiagramPortProvider());
  registry.register(new TexPortProvider());
  registry.register(new ImagePortProvider());
  registry.register(new PdfPortProvider());
  registry.register(new MarkdownPortProvider());
  registry.register(new SqliteCollectionPortProvider());
  registry.register(new PcardProcessPortProvider());
  return registry;
}
