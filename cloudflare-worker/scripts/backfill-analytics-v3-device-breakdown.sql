-- One-time, idempotent device-category backfill for the current V3 window.
-- Site devices come from page navigation; image devices come from chapter views.
WITH ranked AS (
  SELECT date(e.ts, '-4 hours') day,e.session_id,e.ua,
    ROW_NUMBER() OVER (PARTITION BY date(e.ts, '-4 hours'),e.session_id ORDER BY e.id) rank
  FROM raw_events e INDEXED BY idx_raw_events_ts
  WHERE e.ts >= datetime('now','-30 days') AND e.source='js' AND e.event_type='page_view'
    AND e.session_id IS NOT NULL AND e.session_id<>''
), first_event AS (SELECT * FROM ranked WHERE rank=1)
UPDATE analytics_v3_daily_sessions AS s
SET site_device=CASE
  WHEN lower(COALESCE(f.ua,'')) LIKE '%android%' THEN 'Android'
  WHEN lower(COALESCE(f.ua,'')) LIKE '%iphone%' OR lower(COALESCE(f.ua,'')) LIKE '%ipad%'
    OR lower(COALESCE(f.ua,'')) LIKE '%ipod%'
    OR (lower(COALESCE(f.ua,'')) LIKE '%macintosh%' AND lower(COALESCE(f.ua,'')) LIKE '%mobile%') THEN 'Apple mobile'
  WHEN lower(COALESCE(f.ua,'')) LIKE '%windows%' THEN 'Windows'
  WHEN lower(COALESCE(f.ua,'')) LIKE '%macintosh%' OR lower(COALESCE(f.ua,'')) LIKE '%mac os x%' THEN 'Mac'
  ELSE 'Other'
END
FROM first_event f WHERE s.day=f.day AND s.session_id=f.session_id;

WITH ranked AS (
  SELECT date(e.ts, '-4 hours') day,e.session_id,e.ua,
    ROW_NUMBER() OVER (PARTITION BY date(e.ts, '-4 hours'),e.session_id ORDER BY e.id) rank
  FROM raw_events e INDEXED BY idx_raw_events_ts
  WHERE e.ts >= datetime('now','-30 days') AND e.source='js' AND e.event_type='chapter_view'
    AND e.session_id IS NOT NULL AND e.session_id<>''
), first_event AS (SELECT * FROM ranked WHERE rank=1)
UPDATE analytics_v3_daily_sessions AS s
SET image_device=CASE
  WHEN lower(COALESCE(f.ua,'')) LIKE '%android%' THEN 'Android'
  WHEN lower(COALESCE(f.ua,'')) LIKE '%iphone%' OR lower(COALESCE(f.ua,'')) LIKE '%ipad%'
    OR lower(COALESCE(f.ua,'')) LIKE '%ipod%'
    OR (lower(COALESCE(f.ua,'')) LIKE '%macintosh%' AND lower(COALESCE(f.ua,'')) LIKE '%mobile%') THEN 'Apple mobile'
  WHEN lower(COALESCE(f.ua,'')) LIKE '%windows%' THEN 'Windows'
  WHEN lower(COALESCE(f.ua,'')) LIKE '%macintosh%' OR lower(COALESCE(f.ua,'')) LIKE '%mac os x%' THEN 'Mac'
  ELSE 'Other'
END
FROM first_event f WHERE s.day=f.day AND s.session_id=f.session_id;
