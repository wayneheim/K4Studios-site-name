CREATE TABLE IF NOT EXISTS analytics_v2_state (
  key TEXT PRIMARY KEY,
  value_text TEXT,
  value_int INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);