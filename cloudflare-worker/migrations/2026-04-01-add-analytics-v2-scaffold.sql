-- Analytics V2 scaffold
-- Phase 1 only: schema and views. Backfill/population happens separately.

CREATE TABLE IF NOT EXISTS canonical_events_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_event_id INTEGER,
  raw_ts TEXT,
  occurred_at TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  canonical_page_load INTEGER NOT NULL DEFAULT 0,
  event_family TEXT NOT NULL,
  event_action TEXT,
  page_path TEXT,
  image_id TEXT,
  gallery_id TEXT,
  source_surface TEXT,
  source_signal TEXT,
  referrer_host TEXT,
  referrer_path TEXT,
  session_id TEXT,
  visitor_id TEXT,
  identity_confidence TEXT NOT NULL DEFAULT 'unknown',
  is_bot INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_occurred_at ON canonical_events_v2 (occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_family ON canonical_events_v2 (event_family, occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_page ON canonical_events_v2 (page_path, occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_session ON canonical_events_v2 (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_visitor ON canonical_events_v2 (visitor_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_page_load ON canonical_events_v2 (canonical_page_load, occurred_at);

CREATE TABLE IF NOT EXISTS session_facts_v2 (
  session_id TEXT PRIMARY KEY,
  visitor_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  landing_page_path TEXT,
  exit_page_path TEXT,
  canonical_page_loads INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  engaged_event_count INTEGER NOT NULL DEFAULT 0,
  identity_confidence TEXT NOT NULL DEFAULT 'unknown',
  metadata_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_session_facts_v2_visitor ON session_facts_v2 (visitor_id, first_seen_at);

CREATE TABLE IF NOT EXISTS visitor_facts_v2 (
  visitor_id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 0,
  canonical_page_loads INTEGER NOT NULL DEFAULT 0,
  identity_confidence TEXT NOT NULL DEFAULT 'unknown',
  metadata_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIEW IF NOT EXISTS canonical_page_loads_v2 AS
SELECT *
FROM canonical_events_v2
WHERE canonical_page_load = 1;
