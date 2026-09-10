-- One-time, idempotent V3 image-view counts by location.
-- The retained window is currently entirely within Eastern daylight time.
DELETE FROM analytics_v3_daily_dimensions WHERE dimension='image_geo_views';

INSERT INTO analytics_v3_daily_dimensions (day,dimension,label,count)
SELECT
  date(ts,'-4 hours') AS day,
  'image_geo_views' AS dimension,
  CASE
    WHEN trim(COALESCE(city,''))<>'' THEN trim(city) ||
      CASE
        WHEN trim(COALESCE(region,''))<>'' THEN ', ' || trim(region)
        WHEN trim(COALESCE(country,''))<>'' THEN ', ' || trim(country)
        ELSE ''
      END
    WHEN trim(COALESCE(region,''))<>'' THEN trim(region) ||
      CASE WHEN trim(COALESCE(country,''))<>'' THEN ', ' || trim(country) ELSE '' END
    WHEN trim(COALESCE(country,''))<>'' THEN trim(country)
    ELSE 'Unknown location'
  END AS label,
  COUNT(*) AS count
FROM raw_events INDEXED BY idx_raw_events_event_type
WHERE event_type='chapter_view'
  AND ts>=datetime('now','-30 days')
  AND id<=(SELECT last_raw_event_id FROM analytics_v3_state WHERE singleton=1)
  AND source='js'
  AND session_id IS NOT NULL
  AND visitor_id IS NOT NULL
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
GROUP BY day,label;
