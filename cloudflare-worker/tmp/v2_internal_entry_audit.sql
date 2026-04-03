WITH first_page_loads AS (
  SELECT
    session_id,
    visitor_id,
    occurred_at,
    page_path,
    referrer_host,
    referrer_path,
    json_extract(metadata_json, '$.city') AS city,
    json_extract(metadata_json, '$.region') AS region,
    json_extract(metadata_json, '$.country') AS country,
    json_extract(metadata_json, '$.user_agent') AS user_agent,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
  FROM canonical_events_v2
  WHERE occurred_at >= datetime('now', 'start of day')
    AND canonical_page_load = 1
    AND session_id IS NOT NULL
    AND trim(session_id) <> ''
), internal_entries AS (
  SELECT *
  FROM first_page_loads
  WHERE rn = 1
    AND referrer_host IS NOT NULL
    AND lower(referrer_host) LIKE '%k4studios.com%'
), session_rollup AS (
  SELECT
    session_id,
    SUM(CASE WHEN canonical_page_load = 1 THEN 1 ELSE 0 END) AS page_loads,
    SUM(CASE WHEN event_family = 'image_view' THEN 1 ELSE 0 END) AS image_views,
    SUM(CASE WHEN event_family IN ('buy_click','grid_action','gallery_action','image_nav','engagement_hint') THEN 1 ELSE 0 END) AS interaction_events
  FROM canonical_events_v2
  WHERE occurred_at >= datetime('now', 'start of day')
  GROUP BY session_id
), joined AS (
  SELECT
    i.session_id,
    i.visitor_id,
    i.page_path,
    COALESCE(NULLIF(i.city, ''), NULLIF(i.region, ''), NULLIF(i.country, ''), 'Unknown') AS geo_label,
    CASE
      WHEN i.user_agent LIKE '%Googlebot%' THEN 'Googlebot'
      WHEN i.user_agent LIKE '%bingbot%' THEN 'Bingbot'
      WHEN i.user_agent LIKE '%Headless%' THEN 'Headless'
      WHEN i.user_agent LIKE '%Chrome/%' THEN 'Chrome-like'
      WHEN i.user_agent LIKE '%Safari/%' THEN 'Safari-like'
      WHEN i.user_agent LIKE '%Firefox/%' THEN 'Firefox-like'
      WHEN i.user_agent IS NULL OR trim(i.user_agent) = '' THEN 'Unknown'
      ELSE 'Other'
    END AS ua_family,
    COALESCE(s.page_loads, 0) AS page_loads,
    COALESCE(s.image_views, 0) AS image_views,
    COALESCE(s.interaction_events, 0) AS interaction_events
  FROM internal_entries i
  LEFT JOIN session_rollup s ON s.session_id = i.session_id
)
SELECT 'SUMMARY' AS section, 'internal_entry_sessions' AS k1, CAST(COUNT(*) AS TEXT) AS k2, '' AS k3 FROM joined
UNION ALL
SELECT 'SUMMARY', 'zero_interaction_sessions', CAST(SUM(CASE WHEN interaction_events = 0 THEN 1 ELSE 0 END) AS TEXT), '' FROM joined
UNION ALL
SELECT 'SUMMARY', 'single_page_sessions', CAST(SUM(CASE WHEN page_loads = 1 THEN 1 ELSE 0 END) AS TEXT), '' FROM joined
UNION ALL
SELECT 'GEO', geo_label, CAST(COUNT(*) AS TEXT), '' FROM joined GROUP BY geo_label
UNION ALL
SELECT 'UA', ua_family, CAST(COUNT(*) AS TEXT), '' FROM joined GROUP BY ua_family
UNION ALL
SELECT 'PAGE', page_path, CAST(COUNT(*) AS TEXT), '' FROM joined GROUP BY page_path
ORDER BY section, CAST(k2 AS INTEGER) DESC, k1;