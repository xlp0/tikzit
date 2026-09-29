/**
 * @clm/mcard-explorer: Base Polyglot Viewlet Suite
 *
 * Contract D ceiling: <= 250 LOC.
 */

import type { RendererRegistry } from '../registry/RendererRegistry';
import { TextCardRenderer, textDescriptor, register as registerText } from './TextCardRenderer';
import { MarkdownCardRenderer, markdownDescriptor, register as registerMarkdown } from './MarkdownCardRenderer';
import { DataCardRenderer, dataDescriptor, register as registerData } from './DataCardRenderer';
import { YamlCardRenderer, yamlDescriptor, register as registerYaml } from './YamlCardRenderer';
import { CsvCardRenderer, csvDescriptor, register as registerCsv } from './CsvCardRenderer';
import { ImageCardRenderer, imageDescriptor, register as registerImage } from './ImageCardRenderer';
import { PdfCardRenderer, pdfDescriptor, register as registerPdf } from './PdfCardRenderer';
import { BinaryHexCardRenderer, binaryHexDescriptor, register as registerBinaryHex } from './BinaryHexCardRenderer';

export {
  TextCardRenderer, textDescriptor, registerText,
  MarkdownCardRenderer, markdownDescriptor, registerMarkdown,
  DataCardRenderer, dataDescriptor, registerData,
  YamlCardRenderer, yamlDescriptor, registerYaml,
  CsvCardRenderer, csvDescriptor, registerCsv,
  ImageCardRenderer, imageDescriptor, registerImage,
  PdfCardRenderer, pdfDescriptor, registerPdf,
  BinaryHexCardRenderer, binaryHexDescriptor, registerBinaryHex,
};

export function registerBaseViewlets(registry: RendererRegistry): void {
  registerBinaryHex(registry);
  registerText(registry);
  registerData(registry);
  registerYaml(registry);
  registerCsv(registry);
  registerMarkdown(registry);
  registerImage(registry);
  registerPdf(registry);
}
