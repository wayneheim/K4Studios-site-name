-- One-time V3-only rebuild after the core-report extension is installed.
-- This does not touch raw_events, V1, or V2 tables.
DELETE FROM analytics_v3_daily_metrics;
DELETE FROM analytics_v3_daily_sessions;
DELETE FROM analytics_v3_daily_visitors;
DELETE FROM analytics_v3_daily_dimensions;
DELETE FROM analytics_v3_daily_images;
UPDATE analytics_v3_state
SET last_raw_event_id=0, last_event_ts=NULL, update_token=NULL,
    update_started_at=NULL, updated_at=CURRENT_TIMESTAMP
WHERE singleton=1;
