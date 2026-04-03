DELETE FROM canonical_events_v2;
DELETE FROM session_facts_v2;
DELETE FROM visitor_facts_v2;

WITH normalized AS (
  SELECT
    id AS raw_event_id,
    ts AS raw_ts,
    ts AS occurred_at,
    event_type,
    source,
    source_layer,
    target_id,
    page,
    session_id,
    visitor_id,
    ip,
    ip_hash,
    referer,
    country,
    region,
    city,
    ua,
    CASE
      WHEN event_type = 'page_view' THEN 'page_view'
      WHEN event_type IN ('chapter_view', 'chapter_exposure', 'image_page', 'external_image_page', 'direct_image') THEN 'image_view'
      WHEN event_type IN ('nav_next', 'nav_prev', 'sister_image_click', 'cowboy_jump') THEN 'image_nav'
      WHEN event_type IN ('grid_open', 'grid_image_click', 'grid_show_more', 'grid_show_previous') THEN 'grid_action'
      WHEN event_type IN ('gallery_preview_click', 'gallery_hero_click', 'browse_all_click', 'gallery_explore_click', 'exit_to_gallery', 'theme_click', 'all_list_click') THEN 'gallery_action'
      WHEN event_type IN ('story_audio_toggle', 'story_slider_click') THEN 'story_action'
      WHEN event_type IN ('guide_open', 'guide_close', 'guide_done', 'guide_click_outside') THEN 'guide_action'
      WHEN event_type = 'order_clicked' THEN 'buy_click'
      WHEN event_type = 'order_submitted' THEN 'order_submit'
      WHEN event_type IN ('xl_zoom', 'series_info', 'more_info_open', 'collector_notes_open', 'slideshow_start') THEN 'engagement_hint'
      ELSE NULL
    END AS event_family,
    CASE
      WHEN event_type = 'page_view' THEN 'load'
      WHEN event_type IN ('chapter_view', 'chapter_exposure', 'image_page', 'external_image_page', 'direct_image') THEN event_type
      WHEN event_type = 'nav_next' THEN 'next'
      WHEN event_type = 'nav_prev' THEN 'prev'
      WHEN event_type = 'sister_image_click' THEN 'sister'
      WHEN event_type = 'cowboy_jump' THEN 'jump'
      WHEN event_type = 'grid_open' THEN 'open'
      WHEN event_type = 'grid_image_click' THEN 'image_click'
      WHEN event_type = 'grid_show_more' THEN 'show_more'
      WHEN event_type = 'grid_show_previous' THEN 'show_previous'
      WHEN event_type = 'gallery_preview_click' THEN 'preview_click'
      WHEN event_type = 'gallery_hero_click' THEN 'hero_click'
      WHEN event_type = 'browse_all_click' THEN 'browse_all'
      WHEN event_type = 'gallery_explore_click' THEN 'explore'
      WHEN event_type = 'exit_to_gallery' THEN 'exit'
      WHEN event_type = 'theme_click' THEN 'theme_click'
      WHEN event_type = 'all_list_click' THEN 'all_list_click'
      WHEN event_type = 'story_audio_toggle' THEN 'audio_toggle'
      WHEN event_type = 'story_slider_click' THEN 'slider_click'
      WHEN event_type = 'guide_open' THEN 'open'
      WHEN event_type = 'guide_close' THEN 'close'
      WHEN event_type = 'guide_done' THEN 'done'
      WHEN event_type = 'guide_click_outside' THEN 'click_outside'
      WHEN event_type = 'order_clicked' THEN 'order_clicked'
      WHEN event_type = 'order_submitted' THEN 'order_submitted'
      WHEN event_type = 'xl_zoom' THEN 'xl_zoom'
      WHEN event_type = 'series_info' THEN 'series_info'
      WHEN event_type = 'more_info_open' THEN 'more_info_open'
      WHEN event_type = 'collector_notes_open' THEN 'collector_notes_open'
      WHEN event_type = 'slideshow_start' THEN 'slideshow_start'
      ELSE NULL
    END AS event_action,
    CASE
      WHEN page IS NOT NULL AND trim(page) <> '' THEN CASE WHEN substr(trim(page), 1, 1) = '/' THEN trim(page) ELSE '/' || trim(page) END
      WHEN target_id IS NOT NULL AND trim(target_id) <> '' THEN CASE WHEN substr(trim(target_id), 1, 1) = '/' THEN trim(target_id) ELSE '/' || trim(target_id) END
      ELSE NULL
    END AS page_path,
    CASE
      WHEN target_id LIKE 'i-%' THEN target_id
      WHEN page LIKE '%/i-%' THEN substr(page, instr(page, '/i-') + 1)
      WHEN target_id LIKE '%/i-%' THEN substr(target_id, instr(target_id, '/i-') + 1)
      ELSE NULL
    END AS image_id,
    CASE WHEN event_type = 'page_view' AND source = 'js' THEN 1 ELSE 0 END AS canonical_page_load,
    CASE
      WHEN event_type = 'direct_image' AND source = 'proxy' THEN 'diagnostic'
      ELSE 'primary'
    END AS metric_scope,
    CASE
      WHEN event_type = 'direct_image' AND source = 'proxy' THEN 'external_direct_image_fetch'
      ELSE NULL
    END AS diagnostic_class,
    CASE
      WHEN visitor_id IS NOT NULL AND trim(visitor_id) <> '' THEN 'persistent'
      WHEN session_id IS NOT NULL AND trim(session_id) <> '' THEN 'session_only'
      ELSE 'fallback'
    END AS identity_confidence
  FROM raw_events
  WHERE event_type IN (
    'page_view',
    'chapter_view', 'chapter_exposure', 'image_page', 'external_image_page', 'direct_image',
    'nav_next', 'nav_prev', 'sister_image_click', 'cowboy_jump',
    'grid_open', 'grid_image_click', 'grid_show_more', 'grid_show_previous',
    'gallery_preview_click', 'gallery_hero_click', 'browse_all_click', 'gallery_explore_click', 'exit_to_gallery', 'theme_click', 'all_list_click',
    'story_audio_toggle', 'story_slider_click',
    'guide_open', 'guide_close', 'guide_done', 'guide_click_outside',
    'order_clicked', 'order_submitted',
    'xl_zoom', 'series_info', 'more_info_open', 'collector_notes_open', 'slideshow_start'
  )
),
annotated AS (
  SELECT
    *,
    CASE
      WHEN page_path = '/' THEN 'homepage'
      WHEN page_path LIKE '/Blog/%' THEN 'blog'
      WHEN page_path LIKE '%/i-%' OR image_id IS NOT NULL THEN 'image_detail'
      WHEN page_path LIKE '/Galleries/%' THEN 'gallery'
      WHEN page_path LIKE '/__k4%' THEN 'internal_tool'
      ELSE 'site_page'
    END AS source_surface,
    CASE
      WHEN referer LIKE 'http://%' OR referer LIKE 'https://%' THEN
        substr(
          substr(referer, instr(referer, '://') + 3),
          1,
          CASE
            WHEN instr(substr(referer, instr(referer, '://') + 3), '/') > 0 THEN instr(substr(referer, instr(referer, '://') + 3), '/') - 1
            ELSE length(substr(referer, instr(referer, '://') + 3))
          END
        )
      ELSE NULL
    END AS referrer_host,
    CASE
      WHEN referer LIKE 'http://%' OR referer LIKE 'https://%' THEN
        CASE
          WHEN instr(substr(referer, instr(referer, '://') + 3), '/') > 0 THEN substr(substr(referer, instr(referer, '://') + 3), instr(substr(referer, instr(referer, '://') + 3), '/'))
          ELSE NULL
        END
      ELSE NULL
    END AS referrer_path,
    CASE WHEN canonical_page_load = 1 THEN 10 ELSE 5 END AS dedupe_window_seconds
  FROM normalized
  WHERE event_family IS NOT NULL
)
INSERT OR IGNORE INTO canonical_events_v2 (
  raw_event_id,
  raw_ts,
  occurred_at,
  dedupe_key,
  canonical_page_load,
  event_family,
  event_action,
  page_path,
  image_id,
  gallery_id,
  source_surface,
  metric_scope,
  diagnostic_class,
  source_signal,
  referrer_host,
  referrer_path,
  session_id,
  visitor_id,
  identity_confidence,
  is_bot,
  metadata_json
)
SELECT
  raw_event_id,
  raw_ts,
  occurred_at,
  event_family || '::' || COALESCE(NULLIF(session_id, ''), NULLIF(visitor_id, ''), NULLIF(ip_hash, ''), NULLIF(ip, ''), 'anonymous') || '::' ||
    COALESCE(
      CASE
        WHEN canonical_page_load = 1 THEN page_path
        ELSE COALESCE(image_id, page_path, target_id, event_action, 'unknown-target')
      END,
      'unknown-target'
    ) || '::' || CAST(CAST(strftime('%s', occurred_at) AS INTEGER) / dedupe_window_seconds AS INTEGER),
  canonical_page_load,
  event_family,
  event_action,
  page_path,
  image_id,
  NULL,
  source_surface,
  metric_scope,
  diagnostic_class,
  source,
  referrer_host,
  referrer_path,
  session_id,
  visitor_id,
  identity_confidence,
  0,
  json_object(
    'raw_event_type', event_type,
    'raw_source_layer', source_layer,
    'country', country,
    'region', region,
    'city', city,
    'ua', ua
  )
FROM annotated;

WITH ordered AS (
  SELECT
    id,
    raw_event_id,
    session_id,
    visitor_id,
    occurred_at,
    page_path,
    referrer_host,
    referrer_path,
    canonical_page_load,
    event_family,
    identity_confidence,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn_asc,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at DESC, id DESC) AS rn_desc
  FROM canonical_events_v2
  WHERE session_id IS NOT NULL AND is_bot = 0
),
aggregated AS (
  SELECT
    session_id,
    MAX(visitor_id) AS visitor_id,
    MIN(occurred_at) AS first_seen_at,
    MAX(occurred_at) AS last_seen_at,
    SUM(CASE WHEN canonical_page_load = 1 THEN 1 ELSE 0 END) AS canonical_page_loads,
    COUNT(*) AS event_count,
    SUM(CASE WHEN event_family IN ('image_nav', 'grid_action', 'gallery_action', 'story_action', 'guide_action', 'engagement_hint', 'buy_click', 'order_submit') THEN 1 ELSE 0 END) AS engaged_event_count,
    MAX(CASE identity_confidence WHEN 'persistent' THEN 3 WHEN 'session_only' THEN 2 ELSE 1 END) AS confidence_rank
  FROM canonical_events_v2
  WHERE session_id IS NOT NULL AND is_bot = 0
  GROUP BY session_id
),
bot_context AS (
  SELECT
    canonical.session_id,
    MAX(CASE WHEN lower(COALESCE(json_extract(canonical.metadata_json, '$.city'), '')) = 'ashburn' THEN 1 ELSE 0 END) AS has_ashburn_signal,
    MAX(CASE WHEN COALESCE(suspected.is_datacenter, 0) = 1 THEN 1 ELSE 0 END) AS has_datacenter_ip_signal,
    MAX(CASE WHEN COALESCE(suspected.risk_level, 0) >= 4 THEN 1 ELSE 0 END) AS has_high_risk_bot_signal,
    MAX(CASE
      WHEN lower(COALESCE(json_extract(canonical.metadata_json, '$.ua'), '')) LIKE '%headless%'
        OR lower(COALESCE(json_extract(canonical.metadata_json, '$.ua'), '')) LIKE '%googlebot%'
        OR lower(COALESCE(json_extract(canonical.metadata_json, '$.ua'), '')) LIKE '%bingbot%'
        OR lower(COALESCE(json_extract(canonical.metadata_json, '$.ua'), '')) LIKE '%crawler%'
        OR lower(COALESCE(json_extract(canonical.metadata_json, '$.ua'), '')) LIKE '%lighthouse%'
      THEN 1 ELSE 0 END) AS has_automation_ua_signal
  FROM canonical_events_v2 AS canonical
  LEFT JOIN raw_events AS raw
    ON raw.id = canonical.raw_event_id
  LEFT JOIN suspected_bots AS suspected
    ON suspected.ip_hash = raw.ip_hash
  WHERE canonical.session_id IS NOT NULL AND canonical.is_bot = 0
  GROUP BY canonical.session_id
)
INSERT INTO session_facts_v2 (
  session_id,
  visitor_id,
  first_seen_at,
  last_seen_at,
  landing_page_path,
  exit_page_path,
  canonical_page_loads,
  event_count,
  engaged_event_count,
  identity_confidence,
  is_suspicious_internal_shallow,
  is_suspicious_datacenter_shallow,
  source_family,
  metadata_json,
  updated_at
)
SELECT
  aggregated.session_id,
  aggregated.visitor_id,
  aggregated.first_seen_at,
  aggregated.last_seen_at,
  landing.page_path,
  exiting.page_path,
  aggregated.canonical_page_loads,
  aggregated.event_count,
  aggregated.engaged_event_count,
  CASE aggregated.confidence_rank WHEN 3 THEN 'persistent' WHEN 2 THEN 'session_only' ELSE 'fallback' END,
  CASE
    WHEN aggregated.canonical_page_loads = 1
     AND aggregated.engaged_event_count = 0
     AND landing.referrer_host IS NOT NULL
     AND lower(landing.referrer_host) LIKE '%k4studios.com%'
     AND COALESCE(landing.referrer_path, '') = '/'
    THEN 1 ELSE 0 END,
  CASE
    WHEN aggregated.engaged_event_count = 0
     AND (
       aggregated.canonical_page_loads = 1
       OR (aggregated.canonical_page_loads = 0 AND aggregated.event_count <= 3)
     )
     AND (
       COALESCE(bot_context.has_datacenter_ip_signal, 0) = 1
       OR COALESCE(bot_context.has_ashburn_signal, 0) = 1
       OR (
         COALESCE(bot_context.has_high_risk_bot_signal, 0) = 1
         AND COALESCE(bot_context.has_automation_ua_signal, 0) = 1
       )
     )
    THEN 1 ELSE 0 END,
  CASE
    WHEN landing.referrer_host IS NULL OR trim(landing.referrer_host) = '' THEN 'Direct / Unknown'
    WHEN lower(landing.referrer_host) LIKE '%google.%' THEN 'Google'
    WHEN lower(landing.referrer_host) LIKE '%bing.%' THEN 'Bing'
    WHEN lower(landing.referrer_host) LIKE '%pinterest.%' THEN 'Pinterest'
    WHEN lower(landing.referrer_host) LIKE '%t.co%' OR lower(landing.referrer_host) LIKE '%twitter.%' OR lower(landing.referrer_host) LIKE '%x.com%' THEN 'Twitter/X'
    WHEN lower(landing.referrer_host) LIKE '%facebook.%' OR lower(landing.referrer_host) LIKE '%fb.%' THEN 'Facebook'
    WHEN lower(landing.referrer_host) LIKE '%instagram.%' THEN 'Instagram'
    WHEN lower(landing.referrer_host) LIKE '%k4studios.com%' THEN 'K4 Internal'
    ELSE landing.referrer_host
  END,
  json_object(
    'has_page_load', CASE WHEN aggregated.canonical_page_loads > 0 THEN 1 ELSE 0 END,
    'has_engagement', CASE WHEN aggregated.engaged_event_count > 0 THEN 1 ELSE 0 END,
    'referrer_host', landing.referrer_host,
    'referrer_path', landing.referrer_path,
    'ashburn_signal', COALESCE(bot_context.has_ashburn_signal, 0),
    'datacenter_ip_signal', COALESCE(bot_context.has_datacenter_ip_signal, 0),
    'high_risk_bot_signal', COALESCE(bot_context.has_high_risk_bot_signal, 0),
    'automation_ua_signal', COALESCE(bot_context.has_automation_ua_signal, 0)
  ),
  datetime('now')
FROM aggregated
LEFT JOIN ordered AS landing
  ON landing.session_id = aggregated.session_id
 AND landing.rn_asc = 1
LEFT JOIN ordered AS exiting
  ON exiting.session_id = aggregated.session_id
 AND exiting.rn_desc = 1
LEFT JOIN bot_context
  ON bot_context.session_id = aggregated.session_id;

UPDATE session_facts_v2
SET is_suspicious_datacenter_shallow = CASE
  WHEN engaged_event_count = 0
   AND (
     canonical_page_loads = 1
     OR (canonical_page_loads = 0 AND event_count <= 3)
   )
   AND (
     COALESCE(CAST(json_extract(metadata_json, '$.ashburn_signal') AS INTEGER), 0) = 1
     OR COALESCE(CAST(json_extract(metadata_json, '$.datacenter_ip_signal') AS INTEGER), 0) = 1
     OR (
       COALESCE(CAST(json_extract(metadata_json, '$.high_risk_bot_signal') AS INTEGER), 0) = 1
       AND COALESCE(CAST(json_extract(metadata_json, '$.automation_ua_signal') AS INTEGER), 0) = 1
     )
   )
  THEN 1 ELSE 0 END;

WITH visitor_base AS (
  SELECT
    COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id) AS effective_visitor_id,
    session_id,
    occurred_at,
    canonical_page_load,
    identity_confidence
  FROM canonical_events_v2
  WHERE is_bot = 0
    AND (
      (visitor_id IS NOT NULL AND trim(visitor_id) <> '')
      OR (session_id IS NOT NULL AND trim(session_id) <> '')
    )
),
visitor_agg AS (
  SELECT
    effective_visitor_id AS visitor_id,
    MIN(occurred_at) AS first_seen_at,
    MAX(occurred_at) AS last_seen_at,
    COUNT(DISTINCT session_id) AS session_count,
    SUM(CASE WHEN canonical_page_load = 1 THEN 1 ELSE 0 END) AS canonical_page_loads,
    MAX(CASE identity_confidence WHEN 'persistent' THEN 3 WHEN 'session_only' THEN 2 ELSE 1 END) AS confidence_rank
  FROM visitor_base
  GROUP BY effective_visitor_id
)
INSERT INTO visitor_facts_v2 (
  visitor_id,
  first_seen_at,
  last_seen_at,
  session_count,
  canonical_page_loads,
  identity_confidence,
  metadata_json,
  updated_at
)
SELECT
  visitor_id,
  first_seen_at,
  last_seen_at,
  session_count,
  canonical_page_loads,
  CASE confidence_rank WHEN 3 THEN 'persistent' WHEN 2 THEN 'session_only' ELSE 'fallback' END,
  json_object('generated_from', 'canonical_events_v2'),
  datetime('now')
FROM visitor_agg;