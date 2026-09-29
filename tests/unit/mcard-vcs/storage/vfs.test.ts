import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';
import { NodeFsStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/NodeFsStorageVFS';
import { IndexedDbStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/IndexedDbStorageVFS';

describe('StorageVFS Backends & TriDatabase Pillars', () => {
  describe('MemoryStorageVFS', () => {
    let mem: MemoryStorageVFS;

    beforeEach(async () => {
      mem = new MemoryStorageVFS();
      await mem.init();
    });

    afterEach(async () => {
      await mem.close();
    });

    it('initializes all three TriDatabase pillars with canonical DDL schemas', async () => {
      // mcard pillar
      await mem.execute(
        'mcard',
        'INSERT INTO cards (hash, content, mime_type, mcard_type, created_at) VALUES (?, ?, ?, ?, ?);',
        ['blake3:test', new Uint8Array([1, 2, 3]), 'text/plain', 1, new Date().toISOString()]
      );
      const cards = await mem.query('mcard', 'SELECT hash FROM cards;');
      expect(cards).toHaveLength(1);
      expect(cards[0].hash).toBe('blake3:test');

      // knowledge pillar
      await mem.execute(
        'knowledge',
        'INSERT INTO knowledge_nodes (id, type, data, updated_at) VALUES (?, ?, ?, ?);',
        ['node_1', 'concept', '{"name":"ZX"}', new Date().toISOString()]
      );
      const nodes = await mem.query('knowledge', 'SELECT id, type FROM knowledge_nodes;');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('node_1');

      // executionLog pillar
      await mem.execute(
        'executionLog',
        'INSERT INTO execution_events (timestamp, event_type, payload) VALUES (?, ?, ?);',
        [new Date().toISOString(), 'vfs:init', '{"status":"ok"}']
      );
      const events = await mem.query('executionLog', 'SELECT event_type FROM execution_events;');
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('vfs:init');
    });

    it('exports and re-imports sovereign SQLite binary buffers', async () => {
      await mem.execute(
        'mcard',
        'INSERT INTO cards (hash, content, mime_type, mcard_type, created_at) VALUES (?, ?, ?, ?, ?);',
        ['blake3:export-test', new Uint8Array([10, 20, 30]), 'application/octet-stream', 1, new Date().toISOString()]
      );

      const exportedBytes = await mem.exportBinary('mcard');
      expect(exportedBytes).toBeInstanceOf(Uint8Array);
      expect(exportedBytes.length).toBeGreaterThan(0);

      // Import into fresh memory VFS
      const freshMem = new MemoryStorageVFS();
      await freshMem.init();
      await freshMem.importBinary('mcard', exportedBytes);

      const rows = await freshMem.query('mcard', 'SELECT hash FROM cards WHERE hash = ?;', ['blake3:export-test']);
      expect(rows).toHaveLength(1);
      expect(rows[0].hash).toBe('blake3:export-test');
      await freshMem.close();
    });
  });

  describe('NodeFsStorageVFS', () => {
    const tmpDir = path.join(process.cwd(), 'tests', 'unit', 'mcard-vcs', 'storage', '__tmp_fs_test__');

    beforeEach(() => {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('persists and reloads .db files on disk', async () => {
      const nodeVfs = new NodeFsStorageVFS(tmpDir);
      await nodeVfs.init();

      await nodeVfs.execute(
        'mcard',
        'INSERT INTO cards (hash, content, mime_type, mcard_type, created_at) VALUES (?, ?, ?, ?, ?);',
        ['blake3:disk-test', new Uint8Array([99]), 'text/plain', 1, new Date().toISOString()]
      );
      await nodeVfs.close();

      expect(fs.existsSync(path.join(tmpDir, 'mcard.db'))).toBe(true);

      // Re-open from disk
      const reopened = new NodeFsStorageVFS(tmpDir);
      await reopened.init();
      const rows = await reopened.query('mcard', 'SELECT hash FROM cards WHERE hash = ?;', ['blake3:disk-test']);
      expect(rows).toHaveLength(1);
      expect(rows[0].hash).toBe('blake3:disk-test');
      await reopened.close();
    });
  });

  describe('IndexedDbStorageVFS', () => {
    it('initializes and executes with graceful memory fallback in non-browser environment', async () => {
      const idbVfs = new IndexedDbStorageVFS('test_idb_vfs');
      await idbVfs.init();

      await idbVfs.execute(
        'mcard',
        'INSERT INTO cards (hash, content, mime_type, mcard_type, created_at) VALUES (?, ?, ?, ?, ?);',
        ['blake3:idb-fallback', new Uint8Array([7]), 'text/plain', 1, new Date().toISOString()]
      );
      const rows = await idbVfs.query('mcard', 'SELECT hash FROM cards WHERE hash = ?;', ['blake3:idb-fallback']);
      expect(rows).toHaveLength(1);
      expect(rows[0].hash).toBe('blake3:idb-fallback');
      await idbVfs.close();
    });
  });
});
