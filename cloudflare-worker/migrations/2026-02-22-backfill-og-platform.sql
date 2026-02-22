-- Backfill og_platform for historical Open Graph / asset-source tagged traffic.
--
-- Strategy:
-- - Only update rows that are already tagged as Open Graph via asset_source='og'
-- - Only fill when og_platform is NULL/empty (idempotent)
-- - Only set a platform when UA has a known crawler token (avoid noisy "unknown")
--
-- Run (example):
--   npx wrangler d1 execute k4-analytics --remote --config wrangler.analytics.toml --file=cloudflare-worker/migrations/2026-02-22-backfill-og-platform.sql

UPDATE raw_events
SET og_platform = CASE
  WHEN LOWER(COALESCE(ua, '')) LIKE '%facebookexternalhit%' THEN 'facebook'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%facebot%' THEN 'facebook'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%linkedinbot%' THEN 'linkedin'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%discordbot%' THEN 'discord'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%slackbot%' THEN 'slack'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%twitterbot%' THEN 'twitter'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%xbot%' THEN 'twitter'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%whatsapp%' THEN 'whatsapp'
  WHEN LOWER(COALESCE(ua, '')) LIKE '%applebot%' THEN 'apple'
  ELSE NULL
END
WHERE asset_source = 'og'
  AND (og_platform IS NULL OR og_platform = '')
  AND ua IS NOT NULL
  AND ua != '';
