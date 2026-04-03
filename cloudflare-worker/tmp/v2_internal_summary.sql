WITH first_page_loads AS (
  SELECT
    session_id,
    visitor_id,
    occurred_at,
    page_path,
    referrer_host,
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
)
SELECT
  COUNT(*) AS internal_entry_sessions,
  SUM(CASE WHEN COALESCE(s.interaction_events,0) = 0 THEN 1 ELSE 0 END) AS zero_interaction_sessions,
  SUM(CASE WHEN COALESCE(s.page_loads,0) = 1 THEN 1 ELSE 0 END) AS single_page_sessions,
  SUM(CASE WHEN COALESCE(s.page_loads,0) > 1 THEN 1 ELSE 0 END) AS multi_page_sessions,
  SUM(CASE WHEN COALESCE(s.image_views,0) > 0 THEN 1 ELSE 0 END) AS sessions_with_image_view
FROM internal_entries i
LEFT JOIN session_rollup s ON s.session_id = i.session_id;