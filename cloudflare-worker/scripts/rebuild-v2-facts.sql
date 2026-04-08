DELETE FROM session_facts_v2;

-- Geo trust scoring is intentionally simple and only affects thin K4-internal sessions.
-- 4 = core market, 3 = established market, 2 = neutral, 1 = low-confidence hub, 0 = unknown.

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
    metadata_json,
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
    WHEN aggregated.engaged_event_count = 0
      AND landing.referrer_host IS NOT NULL
      AND lower(landing.referrer_host) LIKE '%k4studios.com%'
      AND COALESCE(landing.referrer_path, '') = '/'
      AND (
        (
          aggregated.canonical_page_loads = 1
          AND (
            COALESCE(
              NULLIF(trim(COALESCE(json_extract(landing.metadata_json, '$.country'), '')), ''),
              NULLIF(trim(COALESCE(json_extract(landing.metadata_json, '$.region'), '')), ''),
              NULLIF(trim(COALESCE(json_extract(landing.metadata_json, '$.city'), '')), '')
            ) IS NULL
            OR (
              aggregated.event_count <= 2
              AND landing.page_path LIKE '%/i-%'
            )
            OR (
              aggregated.event_count = 1
              AND COALESCE(landing.page_path, '') <> '/'
            )
            OR (
              aggregated.event_count = 1
              AND COALESCE(landing.page_path, '') = '/'
              AND CASE
                WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('US', 'CA', 'AU', 'NZ') THEN 4
                WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'SM', 'VA') THEN 3
                WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('HK', 'ID', 'IN', 'SG', 'VN') THEN 1
                WHEN trim(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) = '' THEN 0
                ELSE 2
              END <= 1
            )
          )
        )
        OR (
          aggregated.canonical_page_loads = 0
          AND aggregated.event_count <= 2
          AND landing.page_path LIKE '%/i-%'
        )
      )
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
    'country', json_extract(landing.metadata_json, '$.country'),
    'region', json_extract(landing.metadata_json, '$.region'),
    'city', json_extract(landing.metadata_json, '$.city'),
    'geo_trust_tier', CASE
      WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('US', 'CA', 'AU', 'NZ') THEN 'core'
      WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'SM', 'VA') THEN 'established'
      WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('HK', 'ID', 'IN', 'SG', 'VN') THEN 'low'
      WHEN trim(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) = '' THEN 'unknown'
      ELSE 'neutral'
    END,
    'geo_trust_score', CASE
      WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('US', 'CA', 'AU', 'NZ') THEN 4
      WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'SM', 'VA') THEN 3
      WHEN UPPER(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) IN ('HK', 'ID', 'IN', 'SG', 'VN') THEN 1
      WHEN trim(COALESCE(json_extract(landing.metadata_json, '$.country'), '')) = '' THEN 0
      ELSE 2
    END,
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

UPDATE session_facts_v2
SET is_suspicious_internal_shallow = CASE
  WHEN engaged_event_count = 0
   AND lower(COALESCE(source_family, '')) = 'k4 internal'
   AND COALESCE(json_extract(metadata_json, '$.referrer_path'), '') = '/'
   AND (
     (
       canonical_page_loads = 1
       AND (
         COALESCE(
           NULLIF(trim(COALESCE(json_extract(metadata_json, '$.country'), '')), ''),
           NULLIF(trim(COALESCE(json_extract(metadata_json, '$.region'), '')), ''),
           NULLIF(trim(COALESCE(json_extract(metadata_json, '$.city'), '')), '')
         ) IS NULL
         OR (
           event_count <= 2
           AND COALESCE(landing_page_path, '') LIKE '%/i-%'
         )
         OR (
           event_count = 1
           AND COALESCE(landing_page_path, '') <> '/'
         )
         OR (
           event_count = 1
           AND COALESCE(landing_page_path, '') = '/'
           AND CASE
             WHEN UPPER(COALESCE(json_extract(metadata_json, '$.country'), '')) IN ('US', 'CA', 'AU', 'NZ') THEN 4
             WHEN UPPER(COALESCE(json_extract(metadata_json, '$.country'), '')) IN ('AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'SM', 'VA') THEN 3
             WHEN UPPER(COALESCE(json_extract(metadata_json, '$.country'), '')) IN ('HK', 'ID', 'IN', 'SG', 'VN') THEN 1
             WHEN trim(COALESCE(json_extract(metadata_json, '$.country'), '')) = '' THEN 0
             ELSE 2
           END <= 1
         )
       )
     )
     OR (
       canonical_page_loads = 0
       AND event_count <= 2
       AND COALESCE(landing_page_path, '') LIKE '%/i-%'
     )
   )
  THEN 1 ELSE 0 END;

DELETE FROM visitor_facts_v2;

WITH visitor_base AS (
  SELECT
    COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id) AS effective_visitor_id,
    session_id,
    occurred_at,
    canonical_page_load,
    identity_confidence
  FROM canonical_events_v2
  WHERE is_bot = 0
    AND ((visitor_id IS NOT NULL AND trim(visitor_id) <> '') OR (session_id IS NOT NULL AND trim(session_id) <> ''))
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