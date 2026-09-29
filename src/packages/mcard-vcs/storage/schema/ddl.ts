/**
 * Canonical TriDatabase DDL Schemas
 *
 * Defines the canonical relational tables for mcard.db, knowledge.db,
 * and executionLog.db.
 *
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export const MCARD_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS cards (
  hash TEXT PRIMARY KEY,
  content BLOB NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/plain',
  mcard_type INTEGER NOT NULL DEFAULT 1,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS handles (
  handle TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (hash) REFERENCES cards(hash)
);

CREATE TABLE IF NOT EXISTS handle_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT NOT NULL,
  hash TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  author_did TEXT,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_handles_hash ON handles(hash);
CREATE INDEX IF NOT EXISTS idx_history_handle ON handle_history(handle);
CREATE INDEX IF NOT EXISTS idx_history_changed ON handle_history(changed_at);

CREATE TABLE IF NOT EXISTS refs (
  ref_name TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const KNOWLEDGE_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_edges (
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  label TEXT NOT NULL,
  data TEXT,
  PRIMARY KEY (source, target, label)
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON knowledge_edges(source);
CREATE INDEX IF NOT EXISTS idx_edges_target ON knowledge_edges(target);
`;

export const EXECUTION_LOG_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS execution_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  author_did TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON execution_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON execution_events(event_type);
`;

export function getDdlForPillar(pillar: 'mcard' | 'knowledge' | 'executionLog'): string {
  switch (pillar) {
    case 'mcard':
      return MCARD_SCHEMA_DDL;
    case 'knowledge':
      return KNOWLEDGE_SCHEMA_DDL;
    case 'executionLog':
      return EXECUTION_LOG_SCHEMA_DDL;
    default:
      throw new Error(`Unknown pillar: ${pillar}`);
  }
}
