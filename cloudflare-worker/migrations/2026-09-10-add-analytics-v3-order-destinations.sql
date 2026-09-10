-- Split order intent by destination so pricing-to-order friction is measurable.
ALTER TABLE analytics_v3_daily_metrics
  ADD COLUMN smugmug_clicks INTEGER NOT NULL DEFAULT 0;

ALTER TABLE analytics_v3_daily_metrics
  ADD COLUMN email_clicks INTEGER NOT NULL DEFAULT 0;

ALTER TABLE analytics_v3_daily_images
  ADD COLUMN smugmug_clicks INTEGER NOT NULL DEFAULT 0;

ALTER TABLE analytics_v3_daily_images
  ADD COLUMN email_clicks INTEGER NOT NULL DEFAULT 0;
