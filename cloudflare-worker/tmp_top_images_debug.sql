WITH image_events AS (
  SELECT
    COALESCE(NULLIF(e.session_id, ''), NULLIF(e.session_id_v2, ''), NULLIF(e.visitor_id, ''), 'anon:' || COALESCE(NULLIF(e.ip_hash, ''), NULLIF(e.ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:', e.ts) || printf('%02d', (CAST(strftime('%M', e.ts) AS INTEGER) / 30) * 30)) AS session_key,
    e.target_id,
    CASE
      WHEN e.page LIKE '/%' THEN e.page
      WHEN e.page LIKE 'https://www.k4studios.com/%' THEN SUBSTR(e.page, 24)
      WHEN e.page LIKE 'https://k4studios.com/%' THEN SUBSTR(e.page, 21)
      WHEN e.page LIKE 'http://www.k4studios.com/%' THEN SUBSTR(e.page, 23)
      WHEN e.page LIKE 'http://k4studios.com/%' THEN SUBSTR(e.page, 20)
      ELSE NULL
    END AS page_path,
    CASE WHEN e.source = 'js' AND e.event_type = 'chapter_view' THEN 1 ELSE 0 END AS js_hit,
    CASE WHEN e.event_type IN ('state_pixel', 'action_pixel') AND e.source_layer IN ('sister_pixel_v1', 'zoom_pixel_v1') THEN 1 ELSE 0 END AS pixel_hit
  FROM human_population hp
  JOIN classified_events e ON e.visitor_id = hp.visitor_id
  WHERE e.ts > datetime('now', '-1 day')
    AND 1=1
    AND 1=1
    AND 1=1
    AND 1=1
    AND 1=1
    AND COALESCE(e.is_bot, 0) = 0
    AND e.target_id LIKE 'i-%'
    AND e.target_id NOT LIKE '%/%'
    AND e.target_id != 'i-j3GV785'
    AND (
      (e.source = 'js' AND e.event_type = 'chapter_view')
      OR (e.event_type IN ('state_pixel', 'action_pixel') AND e.source_layer IN ('sister_pixel_v1', 'zoom_pixel_v1'))
    )
),
js_ranked AS (
  SELECT
    e.target_id,
    e.country,
    e.region,
    e.city,
    e.referer,
    e.ua AS user_agent,
    e.ts,
    ROW_NUMBER() OVER (PARTITION BY e.target_id ORDER BY e.ts DESC) AS rn
  FROM human_population hp
  JOIN classified_events e ON e.visitor_id = hp.visitor_id
  WHERE e.ts > datetime('now', '-1 day')
    AND 1=1
    AND 1=1
    AND 1=1
    AND 1=1
    AND 1=1
    AND COALESCE(e.is_bot, 0) = 0
    AND e.source = 'js'
    AND e.event_type = 'chapter_view'
    AND e.target_id LIKE 'i-%'
    AND e.target_id NOT LIKE '%/%'
    AND e.target_id != 'i-j3GV785'
),
js_latest AS (
  SELECT target_id, country, region, city, referer, user_agent
  FROM js_ranked
  WHERE rn = 1
),
image_session_signals AS (
  SELECT
    session_key,
    target_id,
    MAX(js_hit) AS has_js,
    MAX(pixel_hit) AS has_pixel,
    SUM(js_hit) AS js_events,
    SUM(pixel_hit) AS pixel_events,
    MAX(page_path) AS chapter_path
  FROM image_events
  GROUP BY session_key, target_id
)
SELECT
  iss.target_id,
  COUNT(*) AS views,
  COUNT(DISTINCT iss.session_key) AS sessions,
  SUM(iss.js_events) AS js_views,
  SUM(iss.pixel_events) AS pixel_views,
  SUM(CASE WHEN iss.has_js = 1 THEN 1 ELSE 0 END) AS js_sessions,
  SUM(CASE WHEN iss.has_pixel = 1 THEN 1 ELSE 0 END) AS pixel_sessions,
  SUM(CASE WHEN iss.has_js = 1 AND iss.has_pixel = 1 THEN 1 ELSE 0 END) AS both_sessions,
  MAX(iss.chapter_path) AS chapter_path,
  MAX(jl.country) AS country,
  MAX(jl.region) AS region,
  MAX(jl.city) AS city,
  MAX(jl.referer) AS best_referer,
  MAX(jl.user_agent) AS user_agent
FROM image_session_signals iss
LEFT JOIN js_latest jl ON jl.target_id = iss.target_id
GROUP BY iss.target_id
ORDER BY views DESC, sessions DESC, iss.target_id ASC
LIMIT 5;