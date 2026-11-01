-- Compact per-image geography counts used to color image rows by their
-- dominant viewing location. Dashboard reads stay entirely on V3 summaries.
CREATE TABLE IF NOT EXISTS analytics_v3_daily_image_geography (
  day TEXT NOT NULL,
  image_id TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, image_id, country, region, city)
) WITHOUT ROWID;

