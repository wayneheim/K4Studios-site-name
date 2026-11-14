-- Anonymous browser status is captured client-side once per 30-minute session.
-- These columns reuse existing event/session rows and do not add hot-path writes.
ALTER TABLE raw_events ADD COLUMN visitor_status TEXT;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN visitor_status TEXT;
