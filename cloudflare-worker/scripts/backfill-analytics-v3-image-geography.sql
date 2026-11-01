-- One-time, idempotent backfill for the current 30-day V3 retention window.
-- This populates only the compact image-geography summary table.
INSERT INTO analytics_v3_daily_image_geography
  (day, image_id, country, region, city, count)
SELECT
  date(ts, '-4 hours') AS day,
  COALESCE(NULLIF(target_id, ''), 'Unknown image') AS image_id,
  upper(COALESCE(country, '')) AS country,
  COALESCE(region, '') AS region,
  COALESCE(city, '') AS city,
  COUNT(*) AS count
FROM raw_events INDEXED BY idx_raw_events_ts
WHERE ts >= datetime('now', '-30 days')
  AND source = 'js'
  AND event_type = 'chapter_view'
  AND session_id IS NOT NULL AND session_id <> ''
  AND visitor_id IS NOT NULL AND visitor_id <> ''
  AND COALESCE(ip, ip_hash, '') <> '184.56.48.57'
  AND COALESCE(cf_asn, 0) NOT IN (
    6939,13335,209242,14618,16509,15169,396982,8075,395973,54113,63949,
    32934,20940,16625,24940,14061,12876,202306,132203,136907,45102
  )
  AND upper(COALESCE(country, '')) <> 'T1'
  AND lower(COALESCE(ua, '')) NOT LIKE '%bot%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%spider%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%crawler%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%headless%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%python%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%curl%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%wget%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%scrapy%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%httpclient%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%axios%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%node-fetch%'
  AND lower(COALESCE(ua, '')) NOT LIKE '%okhttp%'
GROUP BY day, image_id, country, region, city
ON CONFLICT(day, image_id, country, region, city)
DO UPDATE SET count = excluded.count;
