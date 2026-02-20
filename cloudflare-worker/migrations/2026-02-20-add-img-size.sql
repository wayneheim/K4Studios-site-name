-- Add image size from proxy requests (L/S/M/XL/src)
-- Used to derive meaning at query time (e.g., L=chapter exposure).
--
-- Run in D1:
--   wrangler d1 execute k4-analytics --file ./cloudflare-worker/migrations/2026-02-20-add-img-size.sql --remote

ALTER TABLE raw_events ADD COLUMN img_size TEXT;
