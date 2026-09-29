import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDefaultStructureRegistry,
  SqliteStructureProvider,
  SatoriStructureProvider,
  PcardStructureProvider,
  ZxGraphStructureProvider,
  TikzStructureProvider,
  MarkdownStructureProvider,
  JsonYamlStructureProvider,
  HandleNamespaceProvider,
  type CardStructureProvider,
  type CardStructureInput,
  type StructureNode
} from '../../../../src/packages/mcard-explorer/zoom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../../../fixtures/multimodal-media');

describe('Card Structure Providers (Sprint 38)', () => {
  it('38-DOD-02: SqliteStructureProvider extracts contained cards and tables from fixture .db via parsePortableSqlite', async () => {
    const provider = new SqliteStructureProvider();
    expect(provider.appliesTo('archive.db', 'application/x-sqlite3')).toBe(true);

    const dbPath = path.join(fixturesDir, 'collection.db');
    const content = fs.readFileSync(dbPath);

    const nodes = await provider.deriveStructure({
      handle: 'archive.db',
      hash: 'h_db',
      mimeType: 'application/x-sqlite3',
      content: new Uint8Array(content)
    });

    // Contains table node
    const tableNodes = nodes.filter(n => n.kind === 'table');
    expect(tableNodes.length).toBeGreaterThan(0);
    expect(tableNodes.some(n => n.id === 'table:card')).toBe(true);

    // Contains contained card node with real handle
    const cardNodes = nodes.filter(n => n.kind === 'card');
    expect(cardNodes.length).toBeGreaterThan(0);
    expect(cardNodes[0].handle).toBe('zx:diagrams:test');
  });

  it('38-DOD-03: SatoriStructureProvider surfaces nested <card> elements from turn.satori.xml as zoomable positions via parseSatoriXml', async () => {
    const provider = new SatoriStructureProvider();
    expect(provider.appliesTo('turn.satori.xml', 'application/vnd.satori.turn+xml')).toBe(true);

    const xmlPath = path.join(fixturesDir, 'turn.satori.xml');
    const text = fs.readFileSync(xmlPath, 'utf8');

    const nodes = await provider.deriveStructure({
      handle: 'turn.satori.xml',
      hash: 'h_satori',
      mimeType: 'application/vnd.satori.turn+xml',
      text
    });

    const cardNodes = nodes.filter(n => n.kind === 'card');
    expect(cardNodes.length).toBe(1);
    expect(cardNodes[0].handle).toBe('zx:diagrams:teleportation');

    const msgNodes = nodes.filter(n => n.kind === 'section');
    expect(msgNodes.length).toBe(1);
  });

  it('38-DOD-04: PcardStructureProvider projects places, transitions, and arcs directly from PetriNetTopology', async () => {
    const provider = new PcardStructureProvider();
    expect(provider.appliesTo('workflow.pcard.json', 'application/vnd.pcard+json')).toBe(true);

    const pcardPath = path.join(fixturesDir, 'workflow.pcard.json');
    const text = fs.readFileSync(pcardPath, 'utf8');

    const nodes = await provider.deriveStructure({
      handle: 'workflow.pcard.json',
      hash: 'h_pcard',
      mimeType: 'application/vnd.pcard+json',
      text
    });

    const places = nodes.filter(n => n.kind === 'place');
    const transitions = nodes.filter(n => n.kind === 'transition');
    const arcs = nodes.filter(n => n.kind === 'edge');

    expect(places.map(p => p.id)).toEqual(['place:p_init', 'place:p_exec', 'place:p_done']);
    expect(transitions.map(t => t.id)).toEqual(['transition:t_start', 'transition:t_finish']);
    expect(arcs.length).toBe(4);
  });

  it('derives ZX graph spiders and edges', async () => {
    const provider = new ZxGraphStructureProvider();
    const zxPath = path.join(fixturesDir, 'sample.zx.json');
    const text = fs.readFileSync(zxPath, 'utf8');

    const nodes = await provider.deriveStructure({
      handle: 'circuit.zx.json',
      hash: 'h_zx',
      mimeType: 'application/vnd.zx-graph+json',
      text
    });

    const spiderNodes = nodes.filter(n => n.kind === 'node');
    const edgeNodes = nodes.filter(n => n.kind === 'edge');
    expect(spiderNodes.length).toBe(2);
    expect(edgeNodes.length).toBe(1);
  });

  it('derives TikZ AST diagram nodes and edges', async () => {
    const provider = new TikzStructureProvider();
    const tikzPath = path.join(fixturesDir, 'sample.tikz');
    const text = fs.readFileSync(tikzPath, 'utf8');

    const nodes = await provider.deriveStructure({
      handle: 'graph.tikz',
      hash: 'h_tikz',
      mimeType: 'text/x-tikz',
      text
    });

    const diagramNodes = nodes.filter(n => n.kind === 'node');
    const edgeNodes = nodes.filter(n => n.kind === 'edge');
    expect(diagramNodes.map(n => n.id)).toEqual(['node:A', 'node:B']);
    expect(edgeNodes.length).toBe(1);
  });

  it('derives Markdown sections and code blocks', async () => {
    const provider = new MarkdownStructureProvider();
    const mdPath = path.join(fixturesDir, 'notes.md');
    const text = fs.readFileSync(mdPath, 'utf8');

    const nodes = await provider.deriveStructure({
      handle: 'notes.md',
      hash: 'h_md',
      mimeType: 'text/markdown',
      text
    });

    const sections = nodes.filter(n => n.kind === 'section');
    const elements = nodes.filter(n => n.kind === 'element');
    expect(sections[0].label).toBe('Quantum Process Foundations');
    expect(elements[0].id).toBe('code:1');
  });

  it('derives JSON top-level fields', async () => {
    const provider = new JsonYamlStructureProvider();
    const nodes = await provider.deriveStructure({
      handle: 'config.json',
      hash: 'h_json',
      mimeType: 'application/json',
      text: JSON.stringify({ version: '1.0', timeout: 5000, active: true })
    });

    expect(nodes.map(n => n.id)).toEqual(['key:version', 'key:timeout', 'key:active']);
  });

  it('derives virtual namespace structure', async () => {
    const provider = new HandleNamespaceProvider();
    expect(provider.appliesTo('zx:diagrams:ghz')).toBe(true);

    const nodes = await provider.deriveStructure({
      handle: 'zx:diagrams:ghz',
      hash: 'h_ns'
    });

    expect(nodes.map(n => n.label)).toEqual(['zx', 'diagrams']);
  });

  it('38-DOD-16: extensibility test: registering a 9th provider requires adding and registering a provider without modifying existing files', async () => {
    const registry = createDefaultStructureRegistry();

    class CustomCsvStructureProvider implements CardStructureProvider {
      public readonly id = 'csv';
      public appliesTo(handle: string, mimeType?: string): boolean {
        return mimeType === 'text/csv' || handle.endsWith('.csv');
      }
      public deriveStructure(input: CardStructureInput): readonly StructureNode[] {
        const text = input.text || '';
        const lines = text.trim().split('\n');
        if (lines.length === 0) return [];
        const headers = lines[0].split(',');
        return headers.map((h, i) => ({
          id: `col:${i}`,
          label: `Column: ${h.trim()}`,
          kind: 'field'
        }));
      }
    }

    const unregister = registry.register(new CustomCsvStructureProvider());
    const nodes = await registry.deriveStructure({
      handle: 'data.csv',
      hash: 'h_csv',
      mimeType: 'text/csv',
      text: 'id,name,role\n1,Alice,Admin'
    });

    expect(nodes.map(n => n.label)).toEqual(['Column: id', 'Column: name', 'Column: role']);

    unregister();
    expect(await registry.deriveStructure({
      handle: 'data.csv',
      hash: 'h_csv',
      mimeType: 'text/csv',
      text: 'id,name,role\n1,Alice,Admin'
    })).toEqual([]);
  });
});
