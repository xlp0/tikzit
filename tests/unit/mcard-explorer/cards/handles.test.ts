import { describe, it, expect, vi } from 'vitest';
import {
  cardCreate,
  cardGet,
  cardGetByHash,
  cardDerive,
  cardInvoke,
  cardFork,
  cardHistory,
  type CardStorePort,
  type CardVcsPort,
  type CardRuntimePort,
  type CardContentProvider
} from '../../../../src/packages/mcard-explorer/cards/handles';

describe('MCard Monad & Kleisli Handle Operations (Sprint 37)', () => {
  it('37-DOD-05: implements card operations against ports with Kleisli invariant', async () => {
    const memoryStore = new Map<string, { content: Uint8Array; meta?: any }>();
    const hashIndex = new Map<string, Uint8Array>();

    const mockStore: CardStorePort = {
      set: vi.fn(async (handle, content, meta) => {
        const hash = `hash:${handle}`;
        memoryStore.set(handle, { content, meta });
        hashIndex.set(hash, content);
        return { hash };
      }),
      getByHash: vi.fn(async (hash) => {
        const content = hashIndex.get(hash);
        if (!content) return null;
        return { content, mimeType: 'text/plain' };
      })
    };

    const mockProvider: CardContentProvider = {
      getContent: vi.fn(async (handle) => {
        const item = memoryStore.get(handle);
        if (!item) return null;
        return {
          handle,
          hash: `hash:${handle}`,
          content: item.content,
          text: new TextDecoder().decode(item.content)
        };
      })
    };

    const mockVcs: CardVcsPort = {
      getHistory: vi.fn(async (handle) => [
        { hash: `hash:${handle}`, changedAt: new Date().toISOString(), message: 'Initial commit' }
      ])
    };

    const mockRuntime: CardRuntimePort = {
      invoke: vi.fn(async (pcardHandle, input) => {
        const resultHandle = `${pcardHandle}:res:${input.length}`;
        const hash = `hash:${resultHandle}`;
        memoryStore.set(resultHandle, { content: input, meta: { origin: 'invoke' } });
        hashIndex.set(hash, input);
        return { handle: resultHandle, hash };
      })
    };

    // 1. cardCreate (eta)
    const content = new TextEncoder().encode('hello world');
    const created = await cardCreate(mockStore, 'doc:test', content);
    expect(created.handle).toBe('doc:test');
    expect(created.hash).toBe('hash:doc:test');
    expect(mockStore.set).toHaveBeenCalledTimes(1);

    // 2. cardGet
    const fetched = await cardGet(mockProvider, 'doc:test');
    expect(fetched?.text).toBe('hello world');

    // 3. cardGetByHash (mu dedupe)
    const byHash = await cardGetByHash(mockStore, 'hash:doc:test');
    expect(byHash?.content).toEqual(content);

    // 4. cardDerive
    const derived = await cardDerive(
      mockStore,
      'doc:test',
      'doc:test:derived',
      (bytes) => new Uint8Array([...bytes, 33]), // appends '!'
      content
    );
    expect(derived.handle).toBe('doc:test:derived');
    const fetchedDerived = await cardGet(mockProvider, 'doc:test:derived');
    expect(fetchedDerived?.text).toBe('hello world!');

    // 5. cardFork
    const forked = await cardFork(mockStore, 'doc:test', 'doc:test:fork', content);
    expect(forked.handle).toBe('doc:test:fork');

    // 6. cardHistory
    const history = await cardHistory(mockVcs, 'doc:test');
    expect(history).toHaveLength(1);
    expect(history[0].message).toBe('Initial commit');

    // 7. cardInvoke (Kleisli arrow: A -> MCard(B))
    // Invariant (ADR D48): returns a valid, dereferenceable MCard handle
    const invoked = await cardInvoke(mockRuntime, 'clm:pcard:eval', new TextEncoder().encode('input data'));
    expect(invoked.handle).toBe('clm:pcard:eval:res:10');
    expect(invoked.hash).toBe('hash:clm:pcard:eval:res:10');

    // Verify dereferenceable in provider
    const dereferenced = await cardGet(mockProvider, invoked.handle);
    expect(dereferenced).not.toBeNull();
    expect(dereferenced?.text).toBe('input data');
  });
});
