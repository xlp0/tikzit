import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RendererRegistry } from '../../../../src/packages/mcard-explorer/renderers/registry/RendererRegistry';
import type { RendererDescriptor } from '../../../../src/packages/mcard-explorer/renderers/registry/types';
import { toCardViewletDefinition } from '../../../../src/packages/mcard-explorer/renderers/adapters/studioAdapter';

const DummyComponent = () => null;

describe('RendererRegistry & Studio Adapter', () => {
  let registry: RendererRegistry;

  const lowPriorityDescriptor: RendererDescriptor = {
    id: 'text',
    priority: 50,
    viewport: 'scroll',
    supportedTabs: ['text'],
    supportedMimes: ['text/plain'],
    matches: input => input.mimeType === 'text/plain',
    component: DummyComponent,
  };

  const highPriorityDescriptor: RendererDescriptor = {
    id: 'markdown',
    priority: 150,
    viewport: 'split',
    supportedTabs: ['visual', 'text'],
    supportedMimes: ['text/markdown'],
    supportedExtensions: ['.md'],
    matches: input => input.mimeType === 'text/markdown' || input.handle.endsWith('.md'),
    component: DummyComponent,
  };

  const binaryFallbackDescriptor: RendererDescriptor = {
    id: 'binary-hex',
    priority: 10,
    viewport: 'scroll',
    supportedTabs: ['raw'],
    matches: input => input.isBinary,
    component: DummyComponent,
  };

  beforeEach(() => {
    registry = new RendererRegistry();
    registry.register(lowPriorityDescriptor);
    registry.register(highPriorityDescriptor);
    registry.register(binaryFallbackDescriptor);
    registry.registerFallback('text', lowPriorityDescriptor);
    registry.registerFallback('binary', binaryFallbackDescriptor);
  });

  it('sorts descriptors strictly descending by priority', () => {
    const list = registry.listAll();
    expect(list.map(d => d.id)).toEqual(['markdown', 'text', 'binary-hex']);
  });

  it('resolves the highest priority matching descriptor', () => {
    const res = registry.resolve({
      mimeType: 'text/markdown',
      handle: 'doc.md',
      isBinary: false,
    });
    expect(res.id).toBe('markdown');
    expect(res.priority).toBe(150);
  });

  it('cascades to text fallback when no specific text descriptor matches', () => {
    const res = registry.resolve({
      mimeType: 'application/unknown-text',
      handle: 'unknown.txt',
      isBinary: false,
    });
    expect(res.id).toBe('text');
  });

  it('cascades to binary fallback when no descriptor matches binary input', () => {
    const res = registry.resolve({
      mimeType: 'application/custom-binary',
      handle: 'data.bin',
      isBinary: true,
    });
    expect(res.id).toBe('binary-hex');
  });

  it('resolveAll returns matches in priority order followed by fallback', () => {
    // Both markdown and text could match if we made text match everything, but here only markdown matches
    const all = registry.resolveAll({
      mimeType: 'text/markdown',
      handle: 'test.md',
      isBinary: false,
    });
    expect(all[0].id).toBe('markdown');
    // Fallback is appended last if not already present
    expect(all[all.length - 1].id).toBe('text');
  });

  it('tolerates matcher exceptions gracefully without crashing resolution', () => {
    const brokenDescriptor: RendererDescriptor = {
      id: 'broken',
      priority: 999,
      matches: () => {
        throw new Error('Explosion in matcher');
      },
      component: DummyComponent,
    };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    registry.register(brokenDescriptor);
    const res = registry.resolve({
      mimeType: 'text/markdown',
      handle: 'test.md',
      isBinary: false,
    });
    expect(res.id).toBe('markdown');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('unregisters descriptors correctly', () => {
    registry.unregister('markdown');
    expect(registry.listAll().map(d => d.id)).toEqual(['text', 'binary-hex']);
  });

  describe('toCardViewletDefinition (Studio Adapter Parity)', () => {
    it('maps RendererDescriptor to CardViewletDefinition shape correctly', () => {
      const viewletDef = toCardViewletDefinition(highPriorityDescriptor);
      expect(viewletDef.id).toBe('markdown');
      expect(viewletDef.priority).toBe(150);
      expect(viewletDef.supportedTabs).toEqual(['visual', 'text']);
      expect(viewletDef.supportedExtensions).toEqual(['.md']);
      expect(viewletDef.supportedMimes).toEqual(['text/markdown']);
      expect(typeof viewletDef.predicate).toBe('function');

      // Test adapted predicate
      const matchesCard = viewletDef.predicate?.({
        mimeType: 'text/markdown',
        handle: 'notes.md',
        isBinary: false,
      });
      expect(matchesCard).toBe(true);

      const nonMatchingCard = viewletDef.predicate?.({
        mimeType: 'image/png',
        handle: 'icon.png',
        isBinary: true,
      });
      expect(nonMatchingCard).toBe(false);
    });
  });
});
