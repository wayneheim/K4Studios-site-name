-- Compact device categories for site navigation and confirmed image viewing.
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN site_device TEXT;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN image_device TEXT;
