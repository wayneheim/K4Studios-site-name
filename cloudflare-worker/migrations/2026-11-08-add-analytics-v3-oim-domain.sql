-- Preserve the originating One-Image Movie vanity domain in the compact
-- session rollup so its on-site and chapter progression can be compared.
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN oim_domain TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_v3_sessions_oim_domain_day
  ON analytics_v3_daily_sessions (oim_domain, day);
