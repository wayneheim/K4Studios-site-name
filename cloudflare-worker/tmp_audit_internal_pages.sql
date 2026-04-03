WITH filtered_events AS (
  SELECT
    CASE
      WHEN SUBSTR(COALESCE(NULLIF(page, ''), NULLIF(target_id, '')), 1, 1) = '/' THEN COALESCE(NULLIF(page, ''), NULLIF(target_id, ''))
      ELSE '/' || COALESCE(NULLIF(page, ''), NULLIF(target_id, ''))
    END AS page_path,
    COALESCE(NULLIF(session_id, ''), NULLIF(session_id_v2, ''), NULLIF(visitor_id, ''), 'anon') AS session_key,
    CASE WHEN event_type IN ('page_pixel', 'edge_page') THEN 'P' ELSE 'J' END AS source_kind
  FROM classified_events
  WHERE date(ts, '-4 hours') = date('now', '-4 hours')
    AND is_bot = 0
    AND ((event_type IN ('page_pixel', 'edge_page')) OR (event_type = 'page_view' AND source = 'js'))
    AND COALESCE(NULLIF(page, ''), NULLIF(target_id, '')) IS NOT NULL
)
SELECT page_path, COUNT(*) AS views, COUNT(DISTINCT session_key) AS sessions,
       SUM(CASE WHEN source_kind = 'J' THEN 1 ELSE 0 END) AS js_events,
       SUM(CASE WHEN source_kind = 'P' THEN 1 ELSE 0 END) AS pixel_events
FROM filtered_events
GROUP BY page_path
HAVING LOWER(page_path) LIKE '/__k4serp%' OR LOWER(page_path) LIKE '/__k4stats%' OR LOWER(page_path) LIKE '/track%' OR LOWER(page_path) LIKE '/edge-event%'
ORDER BY views DESC;
