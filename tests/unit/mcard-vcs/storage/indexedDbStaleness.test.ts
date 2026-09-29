/**
 * Sprint 35 runtime regression: browser commits failed and the MCard view was
 * empty because a stale `tikzit-mcard-vfs` IndexedDB (v1, missing the
 * `sovereign_pillars` object store) made every flushPillar() throw
 * NotFoundError inside execute(), while init() swallowed the same error and
 * presented an empty DB.
 *
 * Fixes under test:
 *  - IDB_VERSION bumped to 2 so onupgradeneeded recreates the missing store
 *  - flushPillar degrades to memory-only instead of failing the write
 *  - schema DDL re-run after importBinary heals stale persisted binaries
 *  - syncCorpusIntoVfs backfills pre-existing corpus diagrams into the VFS
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  IndexedDbStorageVFS,
  OperadicMCardVfs,
  ExplorerQueryFacade,
} from '../../../../src/packages/mcard-vcs/index';
import {
  syncCorpusIntoVfs,
  ensureVcsInitialized,
  resetVcsAdapterForTesting,
} from '../../../../src/services/clm/vcsAdapterInstance';

const DB_NAME = 'tikzit-mcard-vfs';

function installFakeIdb(): IDBFactory {
  const factory = new IDBFactory();
  (globalThis as any).indexedDB = factory;
  return factory;
}

/** Simulate a v1 database that predates the sovereign_pillars store. */
async function seedStaleV1Database(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      // v1 era schema — a different store, no 'sovereign_pillars'
      req.result.createObjectStore('legacy_store');
    };
    req.onsuccess = () => { req.result.close(); resolve(); };
    req.onerror = () => reject(req.error);
  });
}

describe('IndexedDbStorageVFS stale-database resilience (Sprint 35)', () => {
  let realIdb: unknown;

  beforeEach(() => {
    realIdb = (globalThis as any).indexedDB;
    installFakeIdb();
  });
  afterEach(() => {
    (globalThis as any).indexedDB = realIdb;
    resetVcsAdapterForTesting();
  });

  it('open at v2 upgrades a v1 DB missing the object store', async () => {
    await seedStaleV1Database();
    const backend = new IndexedDbStorageVFS(DB_NAME);
    await backend.init();
    // A write must not throw NotFoundError during flush.
    const vfs = new OperadicMCardVfs(backend);
    const hash = await vfs.set('zx:artifacts:t/hello.png', new Uint8Array([1, 2, 3]), {
      mimeType: 'image/png',
    });
    expect(hash).toBeTruthy();
    const facade = new ExplorerQueryFacade(vfs);
    const rows = await facade.search({});
    expect(rows.map((r) => r.handle)).toContain('zx:artifacts:t/hello.png');
  });

  it('commits on a fresh DB persist and are queryable', async () => {
    const backend = new IndexedDbStorageVFS(DB_NAME);
    await backend.init();
    const vfs = new OperadicMCardVfs(backend);
    await vfs.set('zx:diagrams:t/diagram.tikz', '\\draw (0,0) -- (1,0);', {
      mimeType: 'text/x-tikz',
    });
    const facade = new ExplorerQueryFacade(vfs);
    expect((await facade.search({})).length).toBe(1);
  });
});

describe('syncCorpusIntoVfs backfill (Sprint 35)', () => {
  beforeEach(() => resetVcsAdapterForTesting());
  afterEach(() => resetVcsAdapterForTesting());

  it('existing corpus handles become searchable in the VFS', async () => {
    const { facade } = await ensureVcsInitialized();
    expect(await facade.search({})).toEqual([]);

    const synced = await syncCorpusIntoVfs(
      [{ handle: 'zx:diagrams:demo/one' }, { handle: 'zx:diagrams:demo/two' }],
      () => '\\node {x};'
    );
    expect(synced).toBe(2);

    const rows = await facade.search({});
    expect(rows.map((r) => r.handle).sort()).toEqual([
      'zx:diagrams:demo/one',
      'zx:diagrams:demo/two',
    ]);
  });

  it('is idempotent and skips handles already in the VFS', async () => {
    const { vfs } = await ensureVcsInitialized();
    await vfs.set('zx:diagrams:demo/one', 'original content', { mimeType: 'text/x-tikz' });

    const synced = await syncCorpusIntoVfs(
      [{ handle: 'zx:diagrams:demo/one' }],
      () => 'different content'
    );
    expect(synced).toBe(0);
    const dto = await vfs.getContent('zx:diagrams:demo/one');
    const asText = typeof dto?.content === 'string'
      ? dto.content
      : new TextDecoder().decode(dto?.content as Uint8Array);
    expect(asText).toBe('original content');
  });
});
