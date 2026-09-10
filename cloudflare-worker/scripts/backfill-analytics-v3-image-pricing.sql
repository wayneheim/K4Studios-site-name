-- One-time, idempotent enrichment of V3 image rows from indexed pricing clicks.
-- The retained window is currently entirely within Eastern daylight time.
INSERT INTO analytics_v3_daily_images
  (day,image_id,page_path,count,pricing_opens)
SELECT
  date(ts,'-4 hours') AS day,
  target_id AS image_id,
  COALESCE(page,'') AS page_path,
  0 AS count,
  COUNT(*) AS pricing_opens
FROM raw_events INDEXED BY idx_raw_events_event_type
WHERE event_type='order_clicked'
  AND ts>=datetime('now','-30 days')
  AND id<=(SELECT last_raw_event_id FROM analytics_v3_state WHERE singleton=1)
  AND source='js'
  AND session_id IS NOT NULL
  AND visitor_id IS NOT NULL
  AND target_id IS NOT NULL
  AND target_id<>''
  AND COALESCE(ip,ip_hash,'')<>'184.56.48.57'
  AND COALESCE(cf_asn,0) NOT IN (
    6939,13335,209242,14618,16509,15169,396982,8075,395973,54113,
    63949,32934,20940,16625,24940,14061,12876,202306,132203,136907,45102
  )
  AND upper(COALESCE(country,''))<>'T1'
  AND lower(COALESCE(ua,'')) NOT LIKE '%bot%'
  AND lower(COALESCE(ua,'')) NOT LIKE '%spider%'
  AND lower(COALESCE(ua,'')) NOT LIKE '%crawler%'
  AND lower(COALESCE(ua,'')) NOT LIKE '%headless%'
  AND lower(COALESCE(ua,'')) NOT LIKE '%python%'
  AND lower(COALESCE(ua,'')) NOT LIKE '%curl%'
  AND lower(COALESCE(ua,'')) NOT LIKE '%wget%'
GROUP BY date(ts,'-4 hours'),target_id,COALESCE(page,'')
ON CONFLICT(day,image_id,page_path) DO UPDATE SET
  pricing_opens=excluded.pricing_opens;
