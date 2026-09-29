import { describe, it, expect } from 'vitest';
import type { TypeJudgment } from 'clm-kernel';
import { CardPortRegistry, type CardPortProvider, type CardPortInput, type CardPort } from '../../../../src/packages/mcard-explorer/cards/ports';
import { createDefaultPortRegistry } from '../../../../src/packages/mcard-explorer/cards/providers';

describe('Card Ports & Providers (Sprint 37)', () => {
  const dummyJudgment = (mimeType: string, universe = 'U0'): TypeJudgment => ({
    mime: mimeType,
    universe,
    category: 'diagram',
    confidence: 1,
    isBinary: false,
    matchedRule: 'unit-test'
  });

  it('37-DOD-02: derives ports across all 7 registered specialized providers', () => {
    const registry = createDefaultPortRegistry();

    // 1. TikZ provider
    const tikzPorts = registry.derivePorts({
      handle: 'zx:diagrams:ghz',
      hash: 'h1',
      judgment: dummyJudgment('text/x-tikz')
    });
    expect(tikzPorts.map(p => p.id)).toEqual(['in:source', 'out:render', 'out:tex']);

    // 2. TeX provider
    const texPorts = registry.derivePorts({
      handle: 'paper.tex',
      hash: 'h2',
      judgment: dummyJudgment('application/x-latex')
    });
    expect(texPorts.map(p => p.id)).toEqual(['in:source', 'out:pdf']);

    // 3. Image provider
    const imagePorts = registry.derivePorts({
      handle: 'diagram.png',
      hash: 'h3',
      judgment: dummyJudgment('image/png')
    });
    expect(imagePorts.map(p => p.id)).toEqual(['out:artifact']);

    // 4. PDF provider
    const pdfPorts = registry.derivePorts({
      handle: 'doc.pdf',
      hash: 'h4',
      judgment: dummyJudgment('application/pdf')
    });
    expect(pdfPorts.map(p => p.id)).toEqual(['out:artifact']);

    // 5. Markdown provider
    const mdPorts = registry.derivePorts({
      handle: 'notes.md',
      hash: 'h5',
      judgment: dummyJudgment('text/markdown')
    });
    expect(mdPorts.map(p => p.id)).toEqual(['out:data']);

    // 6. SQLite provider
    const sqlitePorts = registry.derivePorts({
      handle: 'archive.db',
      hash: 'h6',
      judgment: dummyJudgment('application/x-sqlite3', 'U2')
    });
    expect(sqlitePorts.map(p => p.id)).toEqual(['in:card', 'out:card']);

    // 7. PCard provider
    const pcardPorts = registry.derivePorts({
      handle: 'clm:pcard:process',
      hash: 'h7',
      judgment: dummyJudgment('application/vnd.pcard+json', 'U1')
    });
    expect(pcardPorts.map(p => p.id)).toEqual(['in:token', 'out:token']);
  });

  it('yields an empty port array for an unmodelled card type without throwing', () => {
    const registry = createDefaultPortRegistry();
    const ports = registry.derivePorts({
      handle: 'unknown.xyz',
      hash: 'h8',
      judgment: dummyJudgment('application/x-unmodelled')
    });
    expect(ports).toEqual([]);
  });

  it('37-DOD-16: extensibility test: registering an 8th card type provider requires adding and registering a provider without modifying existing files', () => {
    const registry = createDefaultPortRegistry();

    class CustomAudioPortProvider implements CardPortProvider {
      public readonly id = 'audio';
      public appliesTo(j: TypeJudgment): boolean {
        return j.mime === 'audio/wav';
      }
      public derivePorts(_input: CardPortInput): readonly CardPort[] {
        return [
          {
            id: 'out:audio',
            direction: 'out',
            type: { mime: 'audio/wav', universe: 'U0', arity: 'one' },
            label: 'Wave Audio',
            required: false
          }
        ];
      }
    }

    const unregister = registry.register(new CustomAudioPortProvider());
    const audioPorts = registry.derivePorts({
      handle: 'speech.wav',
      hash: 'h9',
      judgment: dummyJudgment('audio/wav')
    });
    expect(audioPorts).toHaveLength(1);
    expect(audioPorts[0].id).toBe('out:audio');

    unregister();
    expect(registry.derivePorts({
      handle: 'speech.wav',
      hash: 'h9',
      judgment: dummyJudgment('audio/wav')
    })).toEqual([]);
  });
});
