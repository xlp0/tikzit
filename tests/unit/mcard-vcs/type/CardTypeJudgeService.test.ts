import { describe, it, expect } from 'vitest';
import { TypeInterpreter, UniverseLevel } from 'clm-kernel';
import {
  CardTypeJudgeService,
  registerTypeJudgeService,
  universeLevelOf,
  universeNameOf
} from '../../../../src/packages/mcard-vcs';

describe('CardTypeJudgeService (Universal 5-Phase Type Judgment & Stratified Type Lattice)', () => {
  const service = new CardTypeJudgeService();

  describe('30-DOD-01 & 30-DOD-03: Diverse Fixtures (12+ types across U0-U3)', () => {
    // 1. TikZ Diagram
    it('1. judges TikZ diagram source as text/x-tikz in U0 with clmCategory diagram', () => {
      const tikz = '\\begin{tikzpicture}\n\\node (a) {Alice};\n\\node (b) [right of=a] {Bob};\n\\draw[->] (a) -- (b);\n\\end{tikzpicture}';
      const result = service.judge({ data: tikz, filename: 'diagram.tikz' });
      expect(result.mime).toBe('text/x-tikz');
      expect(result.universe).toBe('U0');
      expect(result.universeLevel).toBe(UniverseLevel.U0_Mcard);
      expect(result.universeName).toBe('U0_Mcard');
      expect(result.clmCategory).toBe('diagram');
      expect(result.isBinary).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    // 2. ZX-Calculus Graph JSON (Delta Registration)
    it('2. judges ZX-Calculus graph as application/vnd.zx-graph+json in U0 with clmCategory diagram', () => {
      const zx = JSON.stringify({
        spiders: { '0': { spider_type: 'Z', phase: '0' } },
        wires: []
      });
      const result = service.judge({ data: zx, filename: 'circuit.zx.json' });
      expect(result.mime).toBe('application/vnd.zx-graph+json');
      expect(result.universe).toBe('U0');
      expect(result.universeLevel).toBe(UniverseLevel.U0_Mcard);
      expect(result.clmCategory).toBe('diagram');
    });

    // 3. Markdown Document
    it('3. judges Markdown notes as text/markdown in U0 with clmCategory text', () => {
      const md = '# Quantum Foundations\n\nNotes on categorical quantum mechanics.';
      const result = service.judge({ data: md, filename: 'notes.md' });
      expect(result.mime).toBe('text/markdown');
      expect(result.universe).toBe('U0');
      expect(result.clmCategory).toBe('text');
      expect(result.isBinary).toBe(false);
    });

    // 4. JSON Data
    it('4. judges JSON payload as application/json in U0 with clmCategory data', () => {
      const json = JSON.stringify({ experiments: [1, 2, 3], status: 'ok' });
      const result = service.judge({ data: json, filename: 'results.json' });
      expect(result.mime).toBe('application/json');
      expect(result.universe).toBe('U0');
      expect(result.clmCategory).toBe('data');
    });

    // 5. YAML Configuration
    it('5. judges YAML file as application/x-yaml in U0 with clmCategory data', () => {
      const yaml = 'workbench:\n  theme: dark\n  autosave: true\n';
      const result = service.judge({ data: yaml, filename: 'config.yaml' });
      expect(['application/x-yaml', 'application/yaml']).toContain(result.mime);
      expect(result.universe).toBe('U0');
      expect(result.clmCategory).toBe('data');
    });

    // 6. CSV Tabular Dataset
    it('6. judges CSV file as text/csv in U0 with clmCategory data', () => {
      const csv = 'id,label,value\n1,node-a,42\n2,node-b,84\n';
      const result = service.judge({ data: csv, filename: 'dataset.csv' });
      expect(result.mime).toBe('text/csv');
      expect(result.universe).toBe('U0');
      expect(result.clmCategory).toBe('data');
    });

    // 7. Image PNG
    it('7. judges PNG magic bytes as image/png in U0 with clmCategory blob', () => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const result = service.judge({ data: pngHeader, filename: 'image.png' });
      expect(result.mime).toBe('image/png');
      expect(result.universe).toBe('U0');
      expect(result.isBinary).toBe(true);
      expect(result.clmCategory).toBe('blob');
    });

    // 8. PDF Document
    it('8. judges PDF magic bytes as application/pdf in U0 with clmCategory blob', () => {
      const pdfHeader = new TextEncoder().encode('%PDF-1.4\n%...\n');
      const result = service.judge({ data: pdfHeader, filename: 'paper.pdf' });
      expect(result.mime).toBe('application/pdf');
      expect(result.universe).toBe('U0');
      expect(result.isBinary).toBe(true);
      expect(result.clmCategory).toBe('blob');
    });

    // 9. PCard Dynamic Process (U1)
    it('9. judges PCard workflow as application/vnd.pcard+json in U1 with clmCategory process', () => {
      const pcard = JSON.stringify({
        pcard_version: '1.0.0',
        places: [{ id: 'p1', initial_marking: 1 }],
        transitions: [{ id: 't1' }]
      });
      const result = service.judge({ data: pcard, filename: 'process.pcard.json' });
      expect(result.mime).toBe('application/vnd.pcard+json');
      expect(result.universe).toBe('U1');
      expect(result.universeLevel).toBe(UniverseLevel.U1_Pcard);
      expect(result.universeName).toBe('U1_Pcard');
      expect(result.clmCategory).toBe('process');
    });

    // 10. VCard Proof Witness (U2 via ADR D43 lattice override)
    it('10. judges VCard witness as application/vnd.vcard+json in U2 with clmCategory proof', () => {
      const vcard = JSON.stringify({
        vcard_version: '1.0.0',
        sandwich: { precondition: 'P', program: 'C', postcondition: 'Q' }
      });
      const result = service.judge({ data: vcard, filename: 'proof.vcard.json' });
      expect(result.mime).toBe('application/vnd.vcard+json');
      // ADR D43: kernel dict has U1, lattice override lifts to U2
      expect(result.universe).toBe('U2');
      expect(result.universeLevel).toBe(UniverseLevel.U2_Vcard);
      expect(result.universeName).toBe('U2_Vcard');
      expect(result.clmCategory).toBe('proof');
    });

    // 11. Satori Dialogue Turn (U3 Delta Registration)
    it('11. judges Satori dialogue turn as application/vnd.satori.turn+xml in U3 with clmCategory conversation', () => {
      const turn = '<satori><turn speaker="agent"><message>Analyzing diagram</message></turn></satori>';
      const result = service.judge({ data: turn, filename: 'dialogue.satori.xml' });
      expect(result.mime).toBe('application/vnd.satori.turn+xml');
      expect(result.universe).toBe('U3');
      expect(result.universeLevel).toBe(UniverseLevel.U3_Satori);
      expect(result.universeName).toBe('U3_Satori');
      expect(result.clmCategory).toBe('conversation');
    });

    // 12. SQLite Sovereign Database Collection
    it('12. judges SQLite database as application/x-sqlite3 in U0 with clmCategory collection', () => {
      const sqliteHeader = new Uint8Array([
        0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
        0x10, 0x00, 0x01, 0x01
      ]);
      const result = service.judge({ data: sqliteHeader, filename: 'archive.db' });
      expect(result.mime).toBe('application/x-sqlite3');
      expect(result.universe).toBe('U0');
      expect(result.clmCategory).toBe('collection');
      expect(result.isBinary).toBe(true);
    });

    // 13. Binary Fallback
    it('13. judges arbitrary non-text binary payload as application/octet-stream fallback', () => {
      const bin = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0x00, 0x00]);
      const result = service.judge({ data: bin });
      expect(result.mime).toBe('application/octet-stream');
      expect(result.isBinary).toBe(true);
      expect(result.clmCategory).toBe('blob');
    });
  });

  describe('30-DOD-08: FND Classification, Dialect Detection & Studio Parity', () => {
    it('populates fndClassification as Function and detects dialect for execution descriptors', () => {
      const executablePayload = JSON.stringify({
        clm: {
          abstract_spec: { context: 'quantum-annealing' },
          concrete_impl: { runtime: 'wasm', operation: 'optimize' }
        }
      });
      const result = service.judge({ data: executablePayload, filename: 'op.json' });
      expect(result.fndClassification).toBe('Function');
      expect(result.dialect).toBe('B:wasm:optimize');
    });

    it('populates fndClassification as Number for static card payloads', () => {
      const staticPayload = JSON.stringify({
        title: 'Static Schema',
        nodes: [1, 2, 3]
      });
      const result = service.judge({ data: staticPayload, filename: 'data.json' });
      expect(result.fndClassification).toBe('Number');
    });

    it('asserts studio parity: identical mime and universe for identical bytes against kernel TypeInterpreter', () => {
      const kernelTi = TypeInterpreter.createDefault();
      const testCases = [
        { data: '\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}', filename: 'test.tikz' },
        { data: '# Header\nContent', filename: 'test.md' },
        { data: '{"pcard_version": "1.0.0"}', filename: 'test.pcard' }
      ];

      for (const tc of testCases) {
        const kernelJudgment = kernelTi.judge(tc);
        const serviceJudgment = service.judge(tc);
        expect(serviceJudgment.mime).toBe(kernelJudgment.mime);
        expect(serviceJudgment.universe).toBe(kernelJudgment.universe);
        expect(serviceJudgment.isBinary).toBe(kernelJudgment.isBinary);
      }
    });
  });

  describe('Handle-Prefix Hints & Declared MIME Overrides', () => {
    it('uses zx:diagrams:* handle prefix to infer text/x-tikz when declaredMime is absent', () => {
      const rawText = '% Diagram without extension';
      const result = service.judge({ data: rawText, handle: 'zx:diagrams:teleportation' });
      expect(result.mime).toBe('text/x-tikz');
      expect(result.clmCategory).toBe('diagram');
    });

    it('respects explicitly declared MIME type with confidence 1.0', () => {
      const data = 'some text';
      const result = service.judge({ data, declaredMime: 'text/x-tikz' });
      expect(result.mime).toBe('text/x-tikz');
      expect(result.confidence).toBe(1.0);
      expect(result.clmCategory).toBe('diagram');
    });
  });

  describe('30-DOD-11: Cordis Service Registration', () => {
    it('registers CardTypeJudgeService on ctx["mcard.typeJudge"]', () => {
      const ctx: Record<string, any> = {};
      registerTypeJudgeService(ctx, service);
      expect(ctx['mcard.typeJudge']).toBe(service);
    });

    it('supports ctx.provide() pattern from Cordis', () => {
      const provided: Record<string, any> = {};
      const ctx = {
        provide: (key: string, val: any) => {
          provided[key] = val;
        }
      };
      registerTypeJudgeService(ctx, service);
      expect(provided['mcard.typeJudge']).toBe(service);
    });
  });

  describe('Universe Level and Name Helpers', () => {
    it('maps all universe levels correctly', () => {
      expect(universeLevelOf('U0')).toBe(UniverseLevel.U0_Mcard);
      expect(universeLevelOf('U1')).toBe(UniverseLevel.U1_Pcard);
      expect(universeLevelOf('U2')).toBe(UniverseLevel.U2_Vcard);
      expect(universeLevelOf('U3')).toBe(UniverseLevel.U3_Satori);
      expect(universeLevelOf('U4')).toBe(UniverseLevel.U4_Membrane);
      expect(universeLevelOf('U5')).toBe(UniverseLevel.U5_MetaGamma);

      expect(universeNameOf('U0')).toBe('U0_Mcard');
      expect(universeNameOf('U1')).toBe('U1_Pcard');
      expect(universeNameOf('U2')).toBe('U2_Vcard');
      expect(universeNameOf('U3')).toBe('U3_Satori');
      expect(universeNameOf('U4')).toBe('U4_Membrane');
      expect(universeNameOf('U5')).toBe('U5_MetaGamma');
    });
  });
});
