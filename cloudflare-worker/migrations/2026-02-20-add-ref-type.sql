-- Adds ref_type for proxy-derived referer classification.
-- Values (set by proxy): internal | external | direct
--
-- Run (example):
--   wrangler d1 execute <DB_NAME> --remote --file=cloudflare-worker/migrations/2026-02-20-add-ref-type.sql

ALTER TABLE raw_events ADD COLUMN ref_type TEXT;
