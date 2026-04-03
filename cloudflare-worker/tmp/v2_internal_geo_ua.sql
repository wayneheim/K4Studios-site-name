WITH first_page_loads AS (
  SELECT
    session_id,
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
)
SELECT
  COALESCE(NULLIF(city, ''), NULLIF(region, ''), NULLIF(country, ''), 'Unknown') AS geo_label,
  CASE
    WHEN user_agent LIKE '%Googlebot%' THEN 'Googlebot'
    WHEN user_agent LIKE '%bingbot%' THEN 'bingbot'
    WHEN user_agent LIKE '%Headless%' THEN 'Headless'
    WHEN user_agent LIKE '%Chrome/%' THEN 'Chrome-like'
    WHEN user_agent LIKE '%Safari/%' THEN 'Safari-like'
    WHEN user_agent LIKE '%Firefox/%' THEN 'Firefox-like'
    WHEN user_agent IS NULL OR trim(user_agent) = '' THEN 'Unknown'
    ELSE 'Other'
  END AS ua_family,
  COUNT(*) AS sessions
FROM internal_entries
GROUP BY geo_label, ua_family
ORDER BY sessions DESC, geo_label ASC, ua_family ASC
LIMIT 25;