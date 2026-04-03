import { canonicalizeRawEventV2 } from './canonical.js';

const EASTERN_TIME_ZONE = 'America/New_York';

const easternDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const easternDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function getDateParts(formatter, date) {
  const partMap = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: partMap.year,
    month: partMap.month,
    day: partMap.day,
    hour: partMap.hour || 0,
    minute: partMap.minute || 0,
    second: partMap.second || 0
  };
}

function shiftDay(parts, dayOffset) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
}

function getUtcInstantForEasternLocalDateTime(localParts) {
  const targetMillis = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour || 0,
    localParts.minute || 0,
    localParts.second || 0
  );
  let utcMillis = targetMillis;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actualParts = getDateParts(easternDateTimeFormatter, new Date(utcMillis));
    const actualMillis = Date.UTC(
      actualParts.year,
      actualParts.month - 1,
      actualParts.day,
      actualParts.hour,
      actualParts.minute,
      actualParts.second
    );
    const deltaMillis = targetMillis - actualMillis;

    if (deltaMillis === 0) {
      break;
    }

    utcMillis += deltaMillis;
  }

  return new Date(utcMillis);
}

function formatSqlUtc(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function buildUtcRangeClause(column, start, end = null) {
  const normalizedColumn = `datetime(${column})`;
  const lowerBound = `${normalizedColumn} >= datetime('${formatSqlUtc(start)}')`;

  if (!end) {
    return lowerBound;
  }

  return `${lowerBound} AND ${normalizedColumn} < datetime('${formatSqlUtc(end)}')`;
}

function getEasternDayWindow(now, dayOffset = 0) {
  const easternToday = getDateParts(easternDateFormatter, now);
  const startDay = shiftDay(easternToday, dayOffset);
  const endDay = shiftDay(startDay, 1);

  return {
    start: getUtcInstantForEasternLocalDateTime(startDay),
    end: getUtcInstantForEasternLocalDateTime(endDay)
  };
}

function buildWindowConfig(key, label, start, end = null, timezone = null) {
  return {
    key,
    label,
    timezone,
    canonicalClause: buildUtcRangeClause('occurred_at', start, end),
    sessionClause: buildUtcRangeClause('last_seen_at', start, end),
    visitorClause: buildUtcRangeClause('last_seen_at', start, end),
    entryClause: buildUtcRangeClause('first_seen_at', start, end)
  };
}

function getV2WindowConfig(windowKey = 'today', now = new Date()) {
  switch (windowKey) {
    case 'yesterday': {
      const { start, end } = getEasternDayWindow(now, -1);
      return buildWindowConfig('yesterday', 'Yesterday', start, end, EASTERN_TIME_ZONE);
    }
    case '24h':
      return buildWindowConfig('24h', 'Last 24h', new Date(now.getTime() - (24 * 60 * 60 * 1000)), null, 'rolling');
    case '7d':
      return buildWindowConfig('7d', 'Last 7 days', new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)), null, 'rolling');
    case 'all':
      return {
        key: 'all',
        label: 'All time',
        timezone: null,
        canonicalClause: '1=1',
        sessionClause: '1=1',
        visitorClause: '1=1',
        entryClause: '1=1'
      };
    case 'today':
    default: {
      const { start, end } = getEasternDayWindow(now, 0);
      return buildWindowConfig('today', 'Today', start, end, EASTERN_TIME_ZONE);
    }
  }
}

function getSuspiciousInternalShallowSessionSubquery(sessionClause) {
  return `
    SELECT session_id
    FROM session_facts_v2
    WHERE ${sessionClause}
      AND is_suspicious_internal_shallow = 1
  `;
}

function getSuspiciousDatacenterSessionSubquery(sessionClause) {
  return `
    SELECT session_id
    FROM session_facts_v2
    WHERE ${sessionClause}
      AND is_suspicious_datacenter_shallow = 1
  `;
}

function getInternalTestSessionSubquery(sessionClause) {
  return `
    SELECT session_id
    FROM session_facts_v2
    WHERE ${sessionClause}
      AND lower(COALESCE(source_family, '')) = 'internal test'
  `;
}

async function tableExists(env, tableName) {
  const result = await env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ? LIMIT 1`
  ).bind(tableName).first();
  return Boolean(result?.name);
}

export async function getV2SchemaStatus(env) {
  const [canonicalEvents, sessionFacts, visitorFacts, pageLoadsView] = await Promise.all([
    tableExists(env, 'canonical_events_v2'),
    tableExists(env, 'session_facts_v2'),
    tableExists(env, 'visitor_facts_v2'),
    tableExists(env, 'canonical_page_loads_v2')
  ]);

  return {
    canonicalEvents,
    sessionFacts,
    visitorFacts,
    pageLoadsView,
    ready: canonicalEvents && sessionFacts && visitorFacts && pageLoadsView
  };
}

export async function getV2CanonicalSummary(env, { windowKey = 'today' } = {}) {
  const schema = await getV2SchemaStatus(env);
  if (!schema.ready) {
    return {
      schema,
      window: getV2WindowConfig(windowKey),
      refreshStatus: null,
      counts: null,
      recentFamilies: [],
      topEntryPages: [],
      topImages: []
    };
  }
  const window = getV2WindowConfig(windowKey);
  const windowClause = window.canonicalClause;
  const sessionWindowClause = window.sessionClause;
  const visitorWindowClause = window.visitorClause;
  const entryWindowClause = window.entryClause;
  const { getV2RefreshStatus } = await import('./refresh.js');
  const suspiciousInternalShallowSessionSubquery = getSuspiciousInternalShallowSessionSubquery(sessionWindowClause);
  const suspiciousDatacenterSessionSubquery = getSuspiciousDatacenterSessionSubquery(sessionWindowClause);
  const internalTestSessionSubquery = getInternalTestSessionSubquery(sessionWindowClause);
  const trustedSessionPredicate = `(session_id IS NULL OR (session_id NOT IN (${suspiciousInternalShallowSessionSubquery}) AND session_id NOT IN (${suspiciousDatacenterSessionSubquery}) AND session_id NOT IN (${internalTestSessionSubquery})))`;
  const geoLabelExpression = `CASE
    WHEN json_extract(metadata_json, '$.city') IS NOT NULL AND trim(json_extract(metadata_json, '$.city')) <> '' THEN
      json_extract(metadata_json, '$.city') ||
      CASE
        WHEN json_extract(metadata_json, '$.region') IS NOT NULL AND trim(json_extract(metadata_json, '$.region')) <> '' THEN ', ' || json_extract(metadata_json, '$.region')
        WHEN json_extract(metadata_json, '$.country') IS NOT NULL AND trim(json_extract(metadata_json, '$.country')) <> '' THEN ', ' || json_extract(metadata_json, '$.country')
        ELSE ''
      END
    WHEN json_extract(metadata_json, '$.region') IS NOT NULL AND trim(json_extract(metadata_json, '$.region')) <> '' THEN
      json_extract(metadata_json, '$.region') ||
      CASE
        WHEN json_extract(metadata_json, '$.country') IS NOT NULL AND trim(json_extract(metadata_json, '$.country')) <> '' THEN ', ' || json_extract(metadata_json, '$.country')
        ELSE ''
      END
    WHEN json_extract(metadata_json, '$.country') IS NOT NULL AND trim(json_extract(metadata_json, '$.country')) <> '' THEN json_extract(metadata_json, '$.country')
    ELSE 'Unknown'
  END`;
  const sourceLabelExpression = `CASE
    WHEN referrer_host IS NULL OR trim(referrer_host) = '' THEN 'Direct / Unknown'
    WHEN lower(referrer_host) LIKE 'localhost:%' OR lower(referrer_host) = 'localhost' THEN 'Internal Test'
    WHEN lower(referrer_host) LIKE '%edge.k4studios.com%' THEN 'Internal Test'
    WHEN referrer_host LIKE '%google.%' THEN 'Google'
    WHEN referrer_host LIKE '%bing.%' THEN 'Bing'
    WHEN referrer_host LIKE '%pinterest.%' THEN 'Pinterest'
    WHEN referrer_host LIKE '%t.co%' OR referrer_host LIKE '%twitter.%' OR referrer_host LIKE '%x.com%' THEN 'Twitter/X'
    WHEN referrer_host LIKE '%facebook.%' OR referrer_host LIKE '%fb.%' THEN 'Facebook'
    WHEN referrer_host LIKE '%instagram.%' THEN 'Instagram'
    WHEN referrer_host LIKE '%www.k4studios.com%' OR referrer_host = 'k4studios.com' THEN 'K4 Internal'
    ELSE referrer_host
  END`;

  const [refreshStatus, counts, families, interactionActions, topEntryPages, topSitePages, topImages, externalSources, sessionGeography, imageViewGeography, entrySourceMix, imageViewSourceMix, suspiciousSessionGeography, suspiciousDatacenterSessionGeography, internalReentryMix] = await Promise.all([
    getV2RefreshStatus(env),
    env.DB.prepare(
      `WITH suspicious_internal_shallow AS (
         ${suspiciousInternalShallowSessionSubquery}
       ),
       suspicious_datacenter_shallow AS (
         ${suspiciousDatacenterSessionSubquery}
       ),
       internal_test_sessions AS (
         ${internalTestSessionSubquery}
       )
       SELECT
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND metric_scope = 'primary'
            AND ${trustedSessionPredicate}) AS canonical_events,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND canonical_page_load = 1
            AND metric_scope = 'primary'
            AND ${trustedSessionPredicate}) AS canonical_page_loads,
         (SELECT COUNT(*)
          FROM session_facts_v2
            WHERE ${sessionWindowClause}
              AND canonical_page_loads > 0
                AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                  AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)) AS sessions_with_page_loads,
         (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
          FROM session_facts_v2
            WHERE ${sessionWindowClause}
              AND canonical_page_loads > 0
                AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                  AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)) AS visitors_with_page_loads,
           (SELECT COUNT(*)
          FROM session_facts_v2
            WHERE ${sessionWindowClause}
              AND engaged_event_count > 0
                AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                  AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)) AS engaged_sessions,
           (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND event_family = 'image_view'
            AND metric_scope = 'primary'
            AND session_id IS NOT NULL
              AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
              AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)) AS image_views,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND diagnostic_class = 'external_direct_image_fetch') AS direct_image_fetches,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND metric_scope = 'diagnostic') AS proxy_image_views,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause} AND event_family = 'buy_click'
            AND ${trustedSessionPredicate}) AS buy_clicks,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause} AND event_family = 'grid_action'
            AND ${trustedSessionPredicate}) AS grid_actions,
         (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'gallery_action'
              AND ${trustedSessionPredicate}) AS gallery_actions,
           (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'image_nav'
              AND ${trustedSessionPredicate}) AS image_nav_actions,
           (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'story_action'
              AND ${trustedSessionPredicate}) AS story_actions,
           (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'engagement_hint'
              AND ${trustedSessionPredicate}) AS engagement_hints,
           (SELECT COUNT(*)
            FROM suspicious_internal_shallow) AS suspicious_internal_shallow_sessions,
           (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
            FROM session_facts_v2
            WHERE session_id IN (SELECT session_id FROM suspicious_internal_shallow)) AS suspicious_internal_shallow_visitors,
              (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause}
              AND event_family = 'image_view'
                AND session_id IN (SELECT session_id FROM suspicious_internal_shallow)) AS suspicious_internal_shallow_image_views,
              (SELECT COUNT(*)
            FROM suspicious_datacenter_shallow) AS suspicious_datacenter_shallow_sessions,
              (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
              FROM session_facts_v2
              WHERE session_id IN (SELECT session_id FROM suspicious_datacenter_shallow)) AS suspicious_datacenter_shallow_visitors,
              (SELECT COUNT(*)
              FROM canonical_events_v2
              WHERE ${windowClause}
                AND event_family = 'image_view'
                AND session_id IN (SELECT session_id FROM suspicious_datacenter_shallow)) AS suspicious_datacenter_shallow_image_views,
              (SELECT COUNT(*) FROM internal_test_sessions) AS internal_test_sessions,
              (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
              FROM session_facts_v2
              WHERE session_id IN (SELECT session_id FROM internal_test_sessions)) AS internal_test_visitors,
              (SELECT COUNT(*)
              FROM canonical_events_v2
              WHERE ${windowClause}
                AND event_family = 'image_view'
                AND session_id IN (SELECT session_id FROM internal_test_sessions)) AS internal_test_image_views`
    ).first(),
    env.DB.prepare(
      `SELECT event_family, COUNT(*) AS count
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND metric_scope = 'primary'
         AND ${trustedSessionPredicate}
       GROUP BY event_family
       ORDER BY count DESC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `SELECT
         event_family,
         COALESCE(event_action, '(none)') AS event_action,
         COUNT(*) AS count
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND metric_scope = 'primary'
         AND ${trustedSessionPredicate}
         AND event_family IN ('buy_click', 'gallery_action', 'grid_action', 'image_nav', 'story_action', 'engagement_hint')
       GROUP BY event_family, COALESCE(event_action, '(none)')
       ORDER BY event_family ASC, count DESC, event_action ASC`
    ).all(),
    env.DB.prepare(
      `SELECT landing_page_path AS page_path, COUNT(*) AS sessions
       FROM session_facts_v2
       WHERE ${entryWindowClause}
         AND canonical_page_loads > 0
         AND landing_page_path IS NOT NULL
         AND is_suspicious_internal_shallow = 0
        AND COALESCE(is_suspicious_datacenter_shallow, 0) = 0
         AND lower(COALESCE(source_family, '')) <> 'internal test'
       GROUP BY landing_page_path
       ORDER BY sessions DESC, page_path ASC
       LIMIT 25`
    ).all(),
    env.DB.prepare(
      `SELECT page_path, COUNT(*) AS loads
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND canonical_page_load = 1
         AND metric_scope = 'primary'
         AND session_id IS NOT NULL
         AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
        AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
         AND session_id NOT IN (${internalTestSessionSubquery})
         AND page_path IS NOT NULL
         AND page_path NOT LIKE '%/i-%'
         AND page_path NOT LIKE '/__k4%'
         AND page_path NOT LIKE '/img/%'
       GROUP BY page_path
       ORDER BY loads DESC, page_path ASC
       LIMIT 25`
    ).all(),
    env.DB.prepare(
      `SELECT image_id,
              MIN(page_path) AS page_path,
              COUNT(*) AS views
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND event_family IN ('image_view', 'image_nav', 'grid_action', 'gallery_action', 'story_action')
         AND metric_scope = 'primary'
         AND session_id IS NOT NULL
         AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
        AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
         AND session_id NOT IN (${internalTestSessionSubquery})
         AND image_id IS NOT NULL
         AND (page_path IS NULL OR page_path LIKE '%/i-%' OR image_id LIKE 'i-%')
       GROUP BY image_id
       ORDER BY views DESC, image_id ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `SELECT
         CASE
           WHEN referrer_host IS NULL OR referrer_host = '' THEN 'Direct / Unknown'
           WHEN lower(referrer_host) LIKE 'localhost:%' OR lower(referrer_host) = 'localhost' THEN 'Internal Test'
           WHEN lower(referrer_host) LIKE '%edge.k4studios.com%' THEN 'Internal Test'
           WHEN referrer_host LIKE '%google.%' THEN 'Google'
           WHEN referrer_host LIKE '%bing.%' THEN 'Bing'
           WHEN referrer_host LIKE '%pinterest.%' THEN 'Pinterest'
           WHEN referrer_host LIKE '%t.co%' OR referrer_host LIKE '%twitter.%' OR referrer_host LIKE '%x.com%' THEN 'Twitter/X'
           WHEN referrer_host LIKE '%facebook.%' OR referrer_host LIKE '%fb.%' THEN 'Facebook'
           WHEN referrer_host LIKE '%www.k4studios.com%' OR referrer_host = 'k4studios.com' THEN 'K4 Internal'
           ELSE referrer_host
         END AS source_label,
         COUNT(*) AS views
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND event_family = 'image_view'
         AND metric_scope = 'diagnostic'
       GROUP BY source_label
       ORDER BY views DESC, source_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${geoLabelExpression} AS geo_label,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
          AND metric_scope = 'primary'
           AND session_id IS NOT NULL
           AND is_bot = 0
           AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
             AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
             AND session_id NOT IN (${internalTestSessionSubquery})
       )
       SELECT geo_label, COUNT(*) AS sessions
       FROM landing_rows
       WHERE rn = 1
       GROUP BY geo_label
       ORDER BY sessions DESC, geo_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `SELECT
         ${geoLabelExpression} AS geo_label,
         COUNT(*) AS views
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND event_family = 'image_view'
         AND metric_scope = 'primary'
         AND session_id IS NOT NULL
         AND is_bot = 0
         AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
        AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
         AND session_id NOT IN (${internalTestSessionSubquery})
       GROUP BY geo_label
       ORDER BY views DESC, geo_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${sourceLabelExpression} AS source_label,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND session_id IS NOT NULL
           AND is_bot = 0
           AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
             AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
             AND session_id NOT IN (${internalTestSessionSubquery})
       )
      SELECT COALESCE(sf.source_family, landing_rows.source_label) AS source_label, COUNT(*) AS sessions
      FROM landing_rows
      JOIN session_facts_v2 sf ON sf.session_id = landing_rows.session_id
      WHERE rn = 1
        AND lower(COALESCE(sf.source_family, landing_rows.source_label, '')) <> 'k4 internal'
        AND lower(COALESCE(sf.source_family, landing_rows.source_label, '')) <> 'internal test'
       GROUP BY source_label
       ORDER BY sessions DESC, source_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `SELECT
         ${sourceLabelExpression} AS source_label,
         COUNT(*) AS views
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND event_family = 'image_view'
         AND metric_scope = 'primary'
         AND session_id IS NOT NULL
         AND is_bot = 0
         AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
        AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
         AND session_id NOT IN (${internalTestSessionSubquery})
       GROUP BY source_label
       ORDER BY views DESC, source_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${geoLabelExpression} AS geo_label,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND session_id IS NOT NULL
           AND is_bot = 0
       )
       SELECT geo_label, COUNT(*) AS sessions
       FROM landing_rows
       WHERE rn = 1
         AND session_id IN (${suspiciousInternalShallowSessionSubquery})
       GROUP BY geo_label
       ORDER BY sessions DESC, geo_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${geoLabelExpression} AS geo_label,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND session_id IS NOT NULL
           AND is_bot = 0
       )
       SELECT geo_label, COUNT(*) AS sessions
       FROM landing_rows
       WHERE rn = 1
         AND session_id IN (${suspiciousDatacenterSessionSubquery})
       GROUP BY geo_label
       ORDER BY sessions DESC, geo_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${sourceLabelExpression} AS source_label,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND session_id IS NOT NULL
           AND is_bot = 0
           AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
           AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
       )
       SELECT COALESCE(sf.source_family, landing_rows.source_label) AS source_label, COUNT(*) AS sessions
       FROM landing_rows
       JOIN session_facts_v2 sf ON sf.session_id = landing_rows.session_id
       WHERE rn = 1
         AND lower(COALESCE(sf.source_family, landing_rows.source_label, '')) IN ('k4 internal', 'internal test')
       GROUP BY source_label
       ORDER BY sessions DESC, source_label ASC`
    ).all()
  ]);

  return {
    schema,
    window,
    refreshStatus,
    counts: counts || null,
    recentFamilies: families?.results || [],
    interactionActions: interactionActions?.results || [],
    topEntryPages: topEntryPages?.results || [],
    topSitePages: topSitePages?.results || [],
    topImages: topImages?.results || [],
    externalSources: externalSources?.results || [],
    sessionGeography: sessionGeography?.results || [],
    imageViewGeography: imageViewGeography?.results || [],
    entrySourceMix: entrySourceMix?.results || [],
    imageViewSourceMix: imageViewSourceMix?.results || [],
    suspiciousSessionGeography: suspiciousSessionGeography?.results || [],
    suspiciousDatacenterSessionGeography: suspiciousDatacenterSessionGeography?.results || [],
    internalReentryMix: internalReentryMix?.results || []
  };
}

export async function getV2DebugTrace(env, { sessionId = null, visitorId = null, pagePath = null, limit = 50, minutes = 120 } = {}) {
  const filters = [];
  const bind = [];

  filters.push(`ts >= datetime('now', ?)`);
  bind.push(`-${Math.max(1, Number(minutes || 120))} minutes`);

  if (sessionId) {
    filters.push(`session_id = ?`);
    bind.push(sessionId);
  }
  if (visitorId) {
    filters.push(`visitor_id = ?`);
    bind.push(visitorId);
  }
  if (pagePath) {
    filters.push(`(page = ? OR target_id = ?)`);
    bind.push(pagePath, pagePath);
  }

  const query = `
    SELECT
      id,
      ts,
      event_type,
      target_id,
      page,
      source,
      source_layer,
      session_id,
      visitor_id,
      ip,
      ip_hash,
      referer,
      country,
      region,
      city,
      ua
    FROM raw_events
    WHERE ${filters.join(' AND ')}
    ORDER BY ts DESC
    LIMIT ?
  `;
  bind.push(Math.max(1, Math.min(Number(limit || 50), 200)));

  const rawRows = (await env.DB.prepare(query).bind(...bind).all())?.results || [];
  const canonicalRows = rawRows.map((row) => ({
    raw: row,
    canonical: canonicalizeRawEventV2(row)
  }));

  let matchedCanonicalRows = [];
  if (await tableExists(env, 'canonical_events_v2')) {
    const matchedKeys = canonicalRows
      .map((row) => row.canonical?.accepted ? row.canonical.dedupeKey : null)
      .filter(Boolean);
    if (matchedKeys.length > 0) {
      const placeholders = matchedKeys.map(() => '?').join(', ');
      matchedCanonicalRows = (await env.DB.prepare(
        `SELECT dedupe_key, occurred_at, canonical_page_load, event_family, event_action, page_path, image_id, session_id, visitor_id, source_signal, source_surface, metric_scope, diagnostic_class
         FROM canonical_events_v2
         WHERE dedupe_key IN (${placeholders})`
      ).bind(...matchedKeys).all())?.results || [];
    }
  }

  return {
    rawRows: canonicalRows,
    matchedCanonicalRows
  };
}
