-- Piggyback browser measurements on existing lifecycle writes and existing
-- V3 session upserts. No new event stream, table, or index is needed.
ALTER TABLE raw_events ADD COLUMN engagement_meta TEXT;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN entry_evidence TEXT;
