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
    SUM(CASE WHEN event_family IN ('buy_click','grid_action','gallery_action','image_nav','engagement_hint') THEN 1 ELSE 0 END) AS interaction_events
  FROM canonical_events_v2
  WHERE occurred_at >= datetime('now', 'start of day')
  GROUP BY session_id
)
SELECT
  i.session_id,
  i.visitor_id,
  i.page_path,
  COALESCE(i.city, i.region, i.country, 'Unknown') AS geo_label,
  COALESCE(i.referrer_path, '(none)') AS referrer_path,
  COALESCE(s.page_loads, 0) AS page_loads,
  COALESCE(s.interaction_events, 0) AS interaction_events,
  substr(COALESCE(i.user_agent, ''), 1, 120) AS user_agent
FROM internal_entries i
LEFT JOIN session_rollup s ON s.session_id = i.session_id
ORDER BY interaction_events ASC, page_loads ASC, i.occurred_at DESC
LIMIT 15;