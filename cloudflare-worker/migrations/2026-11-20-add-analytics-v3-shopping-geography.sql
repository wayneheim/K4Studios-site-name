-- Reuse the existing session-summary write; no additional per-event rows.
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN shopping_activity TEXT NOT NULL DEFAULT '{}';
