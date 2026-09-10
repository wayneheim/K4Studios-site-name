-- Preserve the V2 visual cue showing which viewed images opened pricing.
ALTER TABLE analytics_v3_daily_images
  ADD COLUMN pricing_opens INTEGER NOT NULL DEFAULT 0;
