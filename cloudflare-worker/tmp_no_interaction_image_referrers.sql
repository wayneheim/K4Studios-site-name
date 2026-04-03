WITH js_sessions AS (
  SELECT
    COALESCE(NULLIF(session_id, ''), NULLIF(session_id_v2, ''), visitor_id || ':' || date(ts, '-4 hours')) AS session_key,
    MIN(ts) AS first_ts,
    SUM(CASE WHEN event_type IN (
      'xl_zoom','browse_all_click','order_clicked','collector_notes_open','cowboy_jump',
      'exit_to_gallery','gallery_explore_click','gallery_preview_click','guide_open',
      'guide_close','guide_done','guide_click_outside','gallery_hero_click',
      'more_info_open','nav_next','nav_prev','order_submitted','series_info',
      'sister_image_click','slideshow_start','story_slider_click','theme_click',
      'all_list_click','grid_open','grid_image_click','grid_show_more',
      'slideshow_nav_prev','slideshow_nav_next','story_audio_toggle','grid_show_previous'
    ) THEN 1 ELSE 0 END) AS interaction_events
  FROM classified_events
  WHERE COALESCE(is_bot,0)=0
    AND source='js'
    AND date(ts, '-4 hours') = date('now', '-4 hours')
  GROUP BY session_key
), first_pages AS (
  SELECT
    s.session_key,
    CASE
      WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')),1,1)='/' THEN COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
      ELSE '/' || COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
    END AS entry_page,
    LOWER(COALESCE(e.referer,'')) AS referer,
    LOWER(COALESCE(e.ua,'')) AS ua,
    s.interaction_events
  FROM js_sessions s
  JOIN classified_events e
    ON COALESCE(NULLIF(e.session_id, ''), NULLIF(e.session_id_v2, ''), e.visitor_id || ':' || date(e.ts, '-4 hours')) = s.session_key
   AND e.ts = s.first_ts
  WHERE COALESCE(e.is_bot,0)=0
    AND e.source='js'
    AND e.event_type='page_view'
), image_entries AS (
  SELECT
    session_key,
    entry_page,
    CASE
      WHEN referer LIKE '%images.google.%' OR referer LIKE '%google.%/imgres%' THEN 'google_images'
      WHEN referer LIKE '%google.%' THEN 'google_search'
      WHEN referer LIKE '%bing.%/images%' THEN 'bing_images'
      WHEN referer LIKE '%bing.%' THEN 'bing_search'
      WHEN referer LIKE '%pinterest.%' THEN 'pinterest'
      WHEN referer LIKE '%k4studios.com%' THEN 'internal'
      WHEN referer = '' OR referer = 'direct' OR referer = 'unknown' THEN 'direct'
      ELSE 'other'
    END AS ref_source,
    CASE
      WHEN ua LIKE '%chrome/%' AND ua NOT LIKE '%edg/%' THEN 'chrome'
      WHEN ua LIKE '%firefox/%' THEN 'firefox'
      WHEN ua LIKE '%safari/%' AND ua NOT LIKE '%chrome/%' THEN 'safari'
      WHEN ua LIKE '%edg/%' THEN 'edge'
      WHEN ua LIKE '%googlebot%' THEN 'googlebot'
      WHEN ua LIKE '%bingbot%' THEN 'bingbot'
      WHEN ua LIKE '%facebookexternalhit%' THEN 'facebookexternalhit'
      WHEN ua = '' THEN 'blank'
      ELSE 'other'
    END AS ua_family
  FROM first_pages
  WHERE entry_page LIKE '%/i-%'
    AND interaction_events = 0
)
SELECT
  ref_source,
  ua_family,
  COUNT(*) AS sessions
FROM image_entries
GROUP BY ref_source, ua_family
ORDER BY sessions DESC, ref_source, ua_family;
