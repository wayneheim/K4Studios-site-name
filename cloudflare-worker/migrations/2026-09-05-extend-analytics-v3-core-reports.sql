-- Add session-level entry/geography facts and image presentation data.
-- Apply only after the 2026-09-04 V3 base migration.
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN landing_page TEXT;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN entry_source TEXT;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN visitor_id TEXT;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN visitor_geo TEXT;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN image_geo TEXT;

CREATE TABLE IF NOT EXISTS analytics_v3_daily_images (
  day TEXT NOT NULL,
  image_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, image_id, page_path)
) WITHOUT ROWID;
