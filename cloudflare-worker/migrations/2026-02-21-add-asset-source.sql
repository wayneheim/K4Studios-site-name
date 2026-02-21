-- Adds asset_source for source-encoded image URLs.
-- Values (set by proxy): og | tw | pn | sd
--
-- Run (example):
--   wrangler d1 execute <DB_NAME> --remote --file=cloudflare-worker/migrations/2026-02-21-add-asset-source.sql

ALTER TABLE raw_events ADD COLUMN asset_source TEXT;
