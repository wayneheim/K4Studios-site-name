-- One-time, idempotent repair of the current V3 retention window.
-- First record real page_view counts for every compact session.
WITH page_counts AS (
  SELECT date(e.ts, '-4 hours') day,e.session_id,COUNT(*) page_view_count
  FROM raw_events e INDEXED BY idx_raw_events_ts
  WHERE e.ts >= datetime('now','-30 days')
    AND e.source='js' AND e.event_type='page_view'
    AND e.session_id IS NOT NULL AND e.session_id<>''
  GROUP BY day,e.session_id
)
UPDATE analytics_v3_daily_sessions AS s
SET page_view_count=COALESCE((
  SELECT p.page_view_count FROM page_counts p
  WHERE p.day=s.day AND p.session_id=s.session_id
),0)
WHERE s.day >= date('now','-30 days');

-- For sessions with no real page_view, use the first confirmed chapter_view
-- as a provisional landing page and acquisition source.
WITH ranked_chapters AS (
  SELECT date(e.ts, '-4 hours') day,e.session_id,e.page,e.entry_referrer,e.referer,
    ROW_NUMBER() OVER (PARTITION BY date(e.ts, '-4 hours'),e.session_id ORDER BY e.id) rank
  FROM raw_events e INDEXED BY idx_raw_events_ts
  WHERE e.ts >= datetime('now','-30 days')
    AND e.source='js' AND e.event_type='chapter_view'
    AND e.session_id IS NOT NULL AND e.session_id<>''
), first_chapter AS (
  SELECT * FROM ranked_chapters WHERE rank=1
)
UPDATE analytics_v3_daily_sessions AS s
SET landing_page=COALESCE(NULLIF(
      replace(replace(f.page,'https://www.k4studios.com',''),'http://www.k4studios.com',''),''
    ),'Unknown page'),
    entry_source=CASE
      WHEN COALESCE(f.entry_referrer,f.referer,'')='' OR lower(COALESCE(f.entry_referrer,f.referer,'')) LIKE '%k4studios.com%' THEN 'Direct / internal'
      WHEN lower(COALESCE(f.entry_referrer,f.referer,'')) LIKE '%google.%' THEN 'Google'
      WHEN lower(COALESCE(f.entry_referrer,f.referer,'')) LIKE '%bing.%' THEN 'Bing'
      WHEN lower(COALESCE(f.entry_referrer,f.referer,'')) LIKE '%facebook.%' OR lower(COALESCE(f.entry_referrer,f.referer,'')) LIKE '%instagram.%' THEN 'Facebook / Instagram'
      WHEN lower(COALESCE(f.entry_referrer,f.referer,'')) LIKE '%pinterest.%' THEN 'Pinterest'
      ELSE 'Other external'
    END,
    visitor_geo=COALESCE(s.visitor_geo,s.image_geo),
    entry_is_image_fallback=1
FROM first_chapter f
WHERE s.day=f.day AND s.session_id=f.session_id
  AND s.page_view_count=0 AND s.landing_page IS NULL;

