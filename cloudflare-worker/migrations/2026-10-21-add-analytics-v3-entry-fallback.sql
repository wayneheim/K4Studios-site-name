-- Track whether session entry facts came from a chapter_view fallback and how
-- many real page_view signals arrived. This prevents fallback double-counting.
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN entry_is_image_fallback INTEGER NOT NULL DEFAULT 0;
ALTER TABLE analytics_v3_daily_sessions ADD COLUMN page_view_count INTEGER NOT NULL DEFAULT 0;

