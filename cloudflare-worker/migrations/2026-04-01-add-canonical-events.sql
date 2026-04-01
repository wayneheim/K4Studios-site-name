-- Canonical deduped interaction events.
--
-- Purpose:
-- - Keep raw_events append-only for audit/debugging.
-- - Provide a stable interaction layer that dedupes JS + pixel twins.
-- - Let dashboard queries count one action whether it arrived via JS, pixel, or both.

CREATE TABLE IF NOT EXISTS canonical_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT NOT NULL UNIQUE,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,
  target_id TEXT,
  page TEXT,
  session_id TEXT,
  session_key TEXT NOT NULL,
  ip TEXT,
  ip_hash TEXT,
  ua TEXT,
  referer TEXT,
  source TEXT NOT NULL DEFAULT 'js',
  country TEXT,
  region TEXT,
  city TEXT,
  cf_asn INTEGER,
  visitor_id TEXT,
  has_js INTEGER NOT NULL DEFAULT 0,
  has_pixel INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_canonical_events_ts
  ON canonical_events (ts);

CREATE INDEX IF NOT EXISTS idx_canonical_events_event_ts
  ON canonical_events (event_type, ts);

CREATE INDEX IF NOT EXISTS idx_canonical_events_page
  ON canonical_events (page);

CREATE INDEX IF NOT EXISTS idx_canonical_events_target
  ON canonical_events (target_id);

CREATE INDEX IF NOT EXISTS idx_canonical_events_session
  ON canonical_events (session_key, ts);

DROP VIEW IF EXISTS canonical_classified_events;

CREATE VIEW canonical_classified_events AS
SELECT
  canonical_events.*,
  CASE
    WHEN ua LIKE '%bot%' OR ua LIKE '%crawl%' OR ua LIKE '%spider%' THEN 1
    WHEN COALESCE(has_js, 0) = 0 AND cf_asn IN (
      13335,209242,14618,16509,15169,396982,8075,395973,54113,63949,
      32934,20940,16625,24940,14061,12876,202306,132203,45102
    ) THEN 1
    ELSE 0
  END AS is_bot
FROM canonical_events;

WITH normalized_events AS (
  SELECT
    CASE
      WHEN source = 'js' AND event_type IN (
        'xl_zoom','browse_all_click','order_clicked','collector_notes_open','cowboy_jump',
        'exit_to_gallery','gallery_explore_click','gallery_preview_click','guide_open',
        'guide_close','guide_done','guide_click_outside','gallery_hero_click',
        'more_info_open','nav_next','nav_prev','order_submitted','series_info',
        'sister_image_click','slideshow_start','story_slider_click','theme_click',
        'all_list_click','grid_open','grid_image_click','grid_show_more',
        'slideshow_nav_prev','slideshow_nav_next','story_audio_toggle',
        'grid_show_previous','scroll_25','scroll_50','scroll_75','scroll_100',
        'page_view','session_exit'
      ) THEN event_type
      WHEN source = 'pixel' AND event_type = 'page_pixel' THEN 'page_view'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'cowboy_jump_pixel_v1' THEN 'cowboy_jump'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'more_info_open_pixel_v1' THEN 'more_info_open'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'order_clicked_pixel_v1' THEN 'order_clicked'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'order_submitted_pixel_v1' THEN 'order_submitted'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'series_info_pixel_v1' THEN 'series_info'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'sister_image_click_pixel_v1' THEN 'sister_image_click'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'slideshow_start_pixel_v1' THEN 'slideshow_start'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'grid_open_pixel_v1' THEN 'grid_open'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'grid_image_click_pixel_v1' THEN 'grid_image_click'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'grid_show_more_pixel_v1' THEN 'grid_show_more'
      WHEN source = 'pixel' AND event_type = 'action_pixel' AND source_layer = 'grid_show_previous_pixel_v1' THEN 'grid_show_previous'
      ELSE NULL
    END AS canonical_event_type,
    ts,
    target_id,
    COALESCE(
      NULLIF(page, ''),
      CASE WHEN SUBSTR(COALESCE(target_id, ''), 1, 1) = '/' THEN NULLIF(target_id, '') ELSE NULL END,
      ''
    ) AS page_key,
    session_id,
    COALESCE(
      NULLIF(session_id, ''),
      NULLIF(session_id_v2, ''),
      NULLIF(visitor_id, ''),
      'anon:' || COALESCE(NULLIF(ip_hash, ''), NULLIF(ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:%M', ts)
    ) AS session_key,
    ip,
    ip_hash,
    ua,
    referer,
    country,
    region,
    city,
    cf_asn,
    visitor_id,
    CASE WHEN source = 'js' THEN 1 ELSE 0 END AS has_js,
    CASE WHEN source = 'pixel' THEN 1 ELSE 0 END AS has_pixel,
    CAST(strftime('%s', ts) AS INTEGER) / 5 AS time_bucket,
    COALESCE(NULLIF(target_id, ''), '') AS target_key
  FROM raw_events
  WHERE
    (source = 'js' AND event_type IN (
      'xl_zoom','browse_all_click','order_clicked','collector_notes_open','cowboy_jump',
      'exit_to_gallery','gallery_explore_click','gallery_preview_click','guide_open',
      'guide_close','guide_done','guide_click_outside','gallery_hero_click',
      'more_info_open','nav_next','nav_prev','order_submitted','series_info',
      'sister_image_click','slideshow_start','story_slider_click','theme_click',
      'all_list_click','grid_open','grid_image_click','grid_show_more',
      'slideshow_nav_prev','slideshow_nav_next','story_audio_toggle',
      'grid_show_previous','scroll_25','scroll_50','scroll_75','scroll_100',
      'page_view','session_exit'
    ))
    OR (
      source = 'pixel'
      AND (
        event_type = 'page_pixel'
        OR (event_type = 'action_pixel' AND source_layer IN (
          'cowboy_jump_pixel_v1','more_info_open_pixel_v1','order_clicked_pixel_v1',
          'order_submitted_pixel_v1','series_info_pixel_v1','sister_image_click_pixel_v1',
          'slideshow_start_pixel_v1','grid_open_pixel_v1','grid_image_click_pixel_v1',
          'grid_show_more_pixel_v1','grid_show_previous_pixel_v1'
        ))
      )
    )
), grouped AS (
  SELECT
    canonical_event_type AS event_type,
    MIN(ts) AS ts,
    MAX(ts) AS last_seen,
    MAX(CASE WHEN target_key != '' THEN target_key ELSE NULL END) AS target_id,
    MAX(CASE WHEN page_key != '' THEN page_key ELSE NULL END) AS page,
    MAX(NULLIF(session_id, '')) AS session_id,
    session_key,
    MAX(ip) AS ip,
    MAX(ip_hash) AS ip_hash,
    MAX(ua) AS ua,
    MAX(referer) AS referer,
    MAX(country) AS country,
    MAX(region) AS region,
    MAX(city) AS city,
    MAX(cf_asn) AS cf_asn,
    MAX(NULLIF(visitor_id, '')) AS visitor_id,
    MAX(has_js) AS has_js,
    MAX(has_pixel) AS has_pixel,
    canonical_event_type || '::' || session_key || '::' || page_key || '::' || target_key || '::' || time_bucket AS dedupe_key
  FROM normalized_events
  WHERE canonical_event_type IS NOT NULL
  GROUP BY canonical_event_type, session_key, page_key, target_key, time_bucket
)
INSERT OR REPLACE INTO canonical_events (
  dedupe_key,
  ts,
  last_seen,
  event_type,
  target_id,
  page,
  session_id,
  session_key,
  ip,
  ip_hash,
  ua,
  referer,
  source,
  country,
  region,
  city,
  cf_asn,
  visitor_id,
  has_js,
  has_pixel
)
SELECT
  dedupe_key,
  ts,
  last_seen,
  event_type,
  target_id,
  page,
  session_id,
  session_key,
  ip,
  ip_hash,
  ua,
  referer,
  CASE
    WHEN has_js = 1 AND has_pixel = 1 THEN 'mixed'
    WHEN has_js = 1 THEN 'js'
    ELSE 'pixel'
  END AS source,
  country,
  region,
  city,
  cf_asn,
  visitor_id,
  has_js,
  has_pixel
FROM grouped;