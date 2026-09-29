import { describe, it, expect } from 'vitest';
import {
  cardCreate,
  cardGet,
  cardGetByHash,
  cardDerive,
  type CardStorePort,
  type CardContentProvider
} from '../../src/packages/mcard-explorer/cards/handles';
import { ContentHasher } from '../../src/packages/mcard-vcs/storage/hash/ContentHasher';

class InMemoryContentAddressedStore implements CardStorePort, CardContentProvider {
  private handleMap = new Map<string, { hash: string; meta?: any }>();
  private blobMap = new Map<string, Uint8Array>();
  private hasher = new ContentHasher();

  async set(handle: string, content: Uint8Array, meta?: Record<string, unknown>): Promise<{ hash: string }> {
    const hash = this.hasher.hash(content);
    this.blobMap.set(hash, content);
    this.handleMap.set(handle, { hash, meta });
    return { hash };
  }

  async getByHash(hash: string): Promise<{ content: Uint8Array; mimeType: string } | null> {
    const content = this.blobMap.get(hash);
    if (!content) return null;
    return { content, mimeType: 'text/vnd.tikz' };
  }

  async getContent(handle: string) {
    const entry = this.handleMap.get(handle);
    if (!entry) return null;
    const content = this.blobMap.get(entry.hash);
    if (!content) return null;
    return {
      handle,
      hash: entry.hash,
      content,
      text: new TextDecoder().decode(content),
      mimeType: 'text/vnd.tikz'
    };
  }

  blobCount(): number {
    return this.blobMap.size;
  }
}

describe('Polynomial Monad Laws (40-DOD-01)', () => {
  it('satisfies Left Unit law: cardGet(cardCreate(c)) ≅ c', async () => {
    const store = new InMemoryContentAddressedStore();
    const rawText = '\\node (A) at (0,0) {Test};';
    const rawBytes = new TextEncoder().encode(rawText);

    const { handle, hash } = await cardCreate(store, 'zx:card:unit-left', rawBytes);
    const fetched = await cardGet(store, handle);

    expect(fetched).not.toBeNull();
    expect(fetched!.hash).toBe(hash);
    expect(fetched!.text).toBe(rawText);
    expect(fetched!.content).toEqual(rawBytes);
  });

  it('satisfies Right Unit law: cardGetByHash after cardCreate resolves identity', async () => {
    const store = new InMemoryContentAddressedStore();
    const rawBytes = new TextEncoder().encode('Identity element');
    const { hash } = await cardCreate(store, 'zx:card:unit-right', rawBytes);

    const dereferenced = await cardGetByHash(store, hash);
    expect(dereferenced).not.toBeNull();
    expect(dereferenced!.content).toEqual(rawBytes);
  });

  it('satisfies Associativity of cardDerive composition: (f >=> g) >=> h ≅ f >=> (g >=> h)', async () => {
    const store = new InMemoryContentAddressedStore();
    const initialText = 'Base';
    const initialBytes = new TextEncoder().encode(initialText);

    await cardCreate(store, 'card:root', initialBytes);

    const f = (bytes: Uint8Array) => new TextEncoder().encode(new TextDecoder().decode(bytes) + ' -> F');
    const g = (bytes: Uint8Array) => new TextEncoder().encode(new TextDecoder().decode(bytes) + ' -> G');
    const h = (bytes: Uint8Array) => new TextEncoder().encode(new TextDecoder().decode(bytes) + ' -> H');

    // (f >=> g) >=> h
    const fg = (b: Uint8Array) => g(f(b));
    const leftComposed = await cardDerive(store, 'card:root', 'card:left', (b) => h(fg(b)), initialBytes);

    // f >=> (g >=> h)
    const gh = (b: Uint8Array) => h(g(b));
    const rightComposed = await cardDerive(store, 'card:root', 'card:right', (b) => gh(f(b)), initialBytes);

    const leftCard = await cardGet(store, leftComposed.handle);
    const rightCard = await cardGet(store, rightComposed.handle);

    expect(leftCard?.text).toBe('Base -> F -> G -> H');
    expect(rightCard?.text).toBe('Base -> F -> G -> H');
    expect(leftCard?.hash).toBe(rightCard?.hash);
  });

  it('satisfies μ dedupe: cardCreate(x) twice produces identical blake3: hash & single CAS blob', async () => {
    const store = new InMemoryContentAddressedStore();
    const rawBytes = new TextEncoder().encode('Deduplicated content string');

    const card1 = await cardCreate(store, 'handle:alpha', rawBytes);
    const card2 = await cardCreate(store, 'handle:beta', rawBytes);

    expect(card1.hash).toBe(card2.hash);
    expect(card1.hash.startsWith('blake3:')).toBe(true);

    // Only one blob stored in underlying CAS storage
    expect(store.blobCount()).toBe(1);

    const byHash = await cardGetByHash(store, card1.hash);
    expect(byHash?.content).toEqual(rawBytes);
  });
});
