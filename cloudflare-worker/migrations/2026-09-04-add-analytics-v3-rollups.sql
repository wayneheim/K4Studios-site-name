-- Analytics V3: compact, cursor-driven summaries. No raw or canonical copies.
CREATE TABLE IF NOT EXISTS analytics_v3_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  last_raw_event_id INTEGER NOT NULL DEFAULT 0,
  last_event_ts TEXT,
  update_token TEXT,
  update_started_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO analytics_v3_state (singleton, last_raw_event_id) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS analytics_v3_daily_metrics (
  day TEXT PRIMARY KEY,
  page_views INTEGER NOT NULL DEFAULT 0,
  image_views INTEGER NOT NULL DEFAULT 0,
  pricing_opens INTEGER NOT NULL DEFAULT 0,
  order_submits INTEGER NOT NULL DEFAULT 0,
  core_events INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS analytics_v3_daily_sessions (
  day TEXT NOT NULL,
  session_id TEXT NOT NULL,
  engaged INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, session_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS analytics_v3_daily_visitors (
  day TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  PRIMARY KEY (day, visitor_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS analytics_v3_daily_dimensions (
  day TEXT NOT NULL,
  dimension TEXT NOT NULL,
  label TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, dimension, label)
) WITHOUT ROWID;
