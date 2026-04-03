WITH js_events AS (
  SELECT
    COALESCE(NULLIF(session_id, ''), NULLIF(session_id_v2, ''), NULLIF(visitor_id, ''), 'anon:' || COALESCE(NULLIF(ip_hash, ''), NULLIF(ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:', ts) || printf('%02d', (CAST(strftime('%M', ts) AS INTEGER) / 30) * 30)) AS session_key,
    ts,
    event_type,
    COALESCE(NULLIF(page, ''), NULLIF(target_id, '')) AS page_path,
    COALESCE(NULLIF(referer, ''), '(none)') AS referer,
    COALESCE(NULLIF(ua, ''), '(none)') AS ua
  FROM classified_events
  WHERE ts >= datetime('now', 'start of day', 'localtime')
    AND source = 'js'
    AND COALESCE(is_bot, 0) = 0
), first_page AS (
    SELECT session_key, page_path, referer, ua,
         ROW_NUMBER() OVER (PARTITION BY session_key ORDER BY ts ASC) AS rn
  FROM js_events
  WHERE event_type = 'page_view'
), interactions AS (
  SELECT DISTINCT session_key
  FROM js_events
  WHERE event_type IN ('grid_open','grid_image_click','series_info','order_clicked','nav_next','nav_prev','browse_all_click','all_list_click','xl_zoom','gallery_explore_click','gallery_preview_click','exit_to_gallery','slideshow_start','slideshow_stop','collector_notes','more_info','cowboy_jump')
)
SELECT
  CASE
    WHEN fp.page_path LIKE '%/i-%' THEN 'image'
    WHEN fp.page_path LIKE '/Galleries/%' THEN 'gallery'
    WHEN fp.page_path LIKE '/Blog/%' THEN 'blog'
    WHEN fp.page_path = '/' THEN 'home'
    ELSE 'other'
  END AS entry_kind,
  CASE
    WHEN LOWER(fp.referer) LIKE '%google.%' THEN 'google'
    WHEN LOWER(fp.referer) LIKE '%bing.%' THEN 'bing'
    WHEN LOWER(fp.referer) LIKE '%facebook.%' OR LOWER(fp.referer) LIKE '%fb.%' THEN 'facebook'
    WHEN LOWER(fp.referer) LIKE '%instagram.%' THEN 'instagram'
    WHEN LOWER(fp.referer) LIKE '%pinterest.%' THEN 'pinterest'
    WHEN LOWER(fp.referer) LIKE '%t.co%' OR LOWER(fp.referer) LIKE '%twitter.%' OR LOWER(fp.referer) LIKE '%x.com%' THEN 'twitter_x'
    WHEN fp.referer = '(none)' THEN '(none)'
    ELSE 'other'
  END AS referer_family,
  COUNT(*) AS sessions
FROM first_page fp
LEFT JOIN interactions i ON i.session_key = fp.session_key
WHERE fp.rn = 1
  AND i.session_key IS NULL
GROUP BY entry_kind, referer_family
ORDER BY sessions DESC
LIMIT 30;
