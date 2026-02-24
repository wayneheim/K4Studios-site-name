-- Tune bot classification to avoid false-positives for real humans behind "datacenter" ASNs.
--
-- Key change:
-- - UA bot/crawl/spider still marks is_bot=1
-- - ASN list only marks is_bot=1 when source != 'js'
--   (so JS interaction events from Cloudflare WARP / corporate networks can still be counted as human)
--
-- Apply:
--   npx wrangler d1 execute k4-analytics --remote --file=cloudflare-worker/migrations/2026-02-23-tune-bot-classification-source-js.sql

DROP VIEW IF EXISTS human_population;
DROP VIEW IF EXISTS classified_events;

CREATE VIEW classified_events AS
SELECT
  raw_events.*,
  CASE
    WHEN ua LIKE '%bot%' OR ua LIKE '%crawl%' OR ua LIKE '%spider%' THEN 1
    WHEN (source IS NULL OR source != 'js') AND cf_asn IN (
      13335,209242,14618,16509,15169,396982,8075,395973,54113,63949,
      32934,20940,16625,24940,14061,12876,202306,132203,45102
    ) THEN 1
    ELSE 0
  END AS is_bot
FROM raw_events;

CREATE VIEW human_population AS
WITH last_ua AS (
  SELECT visitor_id, ua
  FROM (
    SELECT
      visitor_id,
      ua,
      ts,
      ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY ts DESC) AS rn
    FROM classified_events
    WHERE is_bot = 0
      AND visitor_id IS NOT NULL
      AND visitor_id != ''
  )
  WHERE rn = 1
)
SELECT
  visitor_id,
  LOWER(
    CASE
      WHEN ua LIKE '%iPhone%' OR ua LIKE '%iPad%' OR ua LIKE '%iOS%' THEN 'ios'
      WHEN ua LIKE '%Android%' THEN 'android'
      WHEN ua LIKE '%Windows%' THEN 'windows'
      WHEN ua LIKE '%Macintosh%' OR ua LIKE '%Mac OS X%' THEN 'mac'
      WHEN ua LIKE '%Linux%' THEN 'linux'
      WHEN ua LIKE '%Mobile%' THEN 'mobile'
      ELSE 'desktop'
    END
  ) AS device_type
FROM last_ua;
