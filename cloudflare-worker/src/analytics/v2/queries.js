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

function escapeSqlString(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function qualifyColumn(alias, columnName) {
  return alias ? `${alias}.${columnName}` : columnName;
}

function normalizeV2FilterState({ excludeIp = null, viewerIp = null, hideChardon = false } = {}) {
  return {
    excludeIp: excludeIp || null,
    viewerIp: viewerIp || null,
    hideChardon: Boolean(hideChardon)
  };
}

function buildRawFilterMatchClause(filterState, alias = '') {
  const parts = [];
  const normalized = normalizeV2FilterState(filterState);

  if (normalized.excludeIp) {
    parts.push(`${qualifyColumn(alias, 'ip')} = '${escapeSqlString(normalized.excludeIp)}'`);
  }

  if (normalized.hideChardon) {
    if (normalized.viewerIp) {
      parts.push(`${qualifyColumn(alias, 'ip')} = '${escapeSqlString(normalized.viewerIp)}'`);
    }
    parts.push(`lower(COALESCE(${qualifyColumn(alias, 'city')}, '')) = 'chardon'`);
    parts.push(`lower(COALESCE(${qualifyColumn(alias, 'referer')}, '')) LIKE '%localhost%'`);
  }

  return parts.join(' OR ');
}

function buildRawFilterExclusionClause(filterState, alias = '') {
  const matchClause = buildRawFilterMatchClause(filterState, alias);
  return matchClause ? ` AND NOT (${matchClause})` : '';
}

function buildCanonicalRawFilterPredicate(filterState, canonicalAlias = 'canonical_events_v2') {
  const rawMatchClause = buildRawFilterMatchClause(filterState, 'raw');
  if (!rawMatchClause) {
    return '1=1';
  }

  return `NOT EXISTS (
    SELECT 1
    FROM raw_events raw
    WHERE raw.id = ${canonicalAlias}.raw_event_id
      AND (${rawMatchClause})
  )`;
}

function getViewerExcludedSessionSubquery(sessionClause, filterState) {
  const normalized = normalizeV2FilterState(filterState);
  const rawMatchClause = buildRawFilterMatchClause(normalized, 'raw');
  const sessionParts = [];

  if (rawMatchClause) {
    sessionParts.push(rawMatchClause);
  }

  if (normalized.hideChardon) {
    sessionParts.push(`lower(COALESCE(json_extract(sf.metadata_json, '$.city'), '')) = 'chardon'`);
    sessionParts.push(`lower(COALESCE(sf.source_family, '')) = 'internal test'`);
  }

  if (!sessionParts.length) {
    return null;
  }

  return `
    SELECT DISTINCT sf.session_id
    FROM session_facts_v2 sf
    LEFT JOIN canonical_events_v2 canonical ON canonical.session_id = sf.session_id
    LEFT JOIN raw_events raw ON raw.id = canonical.raw_event_id
    WHERE ${sessionClause}
      AND sf.session_id IS NOT NULL
      AND (${sessionParts.join(' OR ')})
  `;
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

export async function getV2CanonicalSummary(env, { windowKey = 'today', excludeIp = null, viewerIp = null, hideChardon = false } = {}) {
  const schema = await getV2SchemaStatus(env);
  const filterState = normalizeV2FilterState({ excludeIp, viewerIp, hideChardon });
  if (!schema.ready) {
    return {
      schema,
      window: getV2WindowConfig(windowKey),
      filters: filterState,
      refreshStatus: null,
      counts: null,
      recentFamilies: [],
      topEntryPages: [],
      topImages: []
    };
  }
  const window = getV2WindowConfig(windowKey);
  const windowClause = window.canonicalClause;
  const rawWindowClause = windowClause.replace(/datetime\(occurred_at\)/g, 'datetime(ts)');
  const sessionWindowClause = window.sessionClause;
  const visitorWindowClause = window.visitorClause;
  const entryWindowClause = window.entryClause;
  const { getV2RefreshStatus } = await import('./refresh.js');
  const suspiciousInternalShallowSessionSubquery = getSuspiciousInternalShallowSessionSubquery(sessionWindowClause);
  const suspiciousDatacenterSessionSubquery = getSuspiciousDatacenterSessionSubquery(sessionWindowClause);
  const internalTestSessionSubquery = getInternalTestSessionSubquery(sessionWindowClause);
  const viewerExcludedSessionSubquery = getViewerExcludedSessionSubquery(sessionWindowClause, filterState);
  const trustedSessionExclusionParts = [
    `session_id NOT IN (${suspiciousInternalShallowSessionSubquery})`,
    `session_id NOT IN (${suspiciousDatacenterSessionSubquery})`,
    `session_id NOT IN (${internalTestSessionSubquery})`
  ];
  if (viewerExcludedSessionSubquery) {
    trustedSessionExclusionParts.push(`session_id NOT IN (${viewerExcludedSessionSubquery})`);
  }
  const trustedSessionPredicate = `(session_id IS NULL OR (${trustedSessionExclusionParts.join(' AND ')}))`;
  const trustedSessionFactExclusionClause = viewerExcludedSessionSubquery ? `
                AND session_id NOT IN (SELECT session_id FROM viewer_excluded_sessions)` : '';
  const rawViewerExclusionClause = buildRawFilterExclusionClause(filterState);
  const canonicalViewerPredicate = buildCanonicalRawFilterPredicate(filterState);
  const facebookHostCaseCondition = `(lower(referrer_host) = 'facebook.com' OR lower(referrer_host) LIKE '%.facebook.com' OR lower(referrer_host) = 'fb.com' OR lower(referrer_host) LIKE '%.fb.com')`;
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
    WHEN ${facebookHostCaseCondition} THEN 'Facebook'
    WHEN referrer_host LIKE '%instagram.%' THEN 'Instagram'
    WHEN referrer_host LIKE '%www.k4studios.com%' OR referrer_host = 'k4studios.com' THEN 'K4 Internal'
    ELSE referrer_host
  END`;
  const rawReferrerHostExpression = `CASE
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
  END`;
  const rawSourceLabelExpression = `CASE
    WHEN ${rawReferrerHostExpression} IS NULL OR ${rawReferrerHostExpression} = '' THEN 'Direct / Unknown'
    WHEN lower(${rawReferrerHostExpression}) LIKE 'localhost:%' OR lower(${rawReferrerHostExpression}) = 'localhost' THEN 'Internal Test'
    WHEN lower(${rawReferrerHostExpression}) LIKE '%edge.k4studios.com%' THEN 'Internal Test'
    WHEN ${rawReferrerHostExpression} LIKE '%google.%' THEN 'Google'
    WHEN ${rawReferrerHostExpression} LIKE '%bing.%' THEN 'Bing'
    WHEN ${rawReferrerHostExpression} LIKE '%pinterest.%' THEN 'Pinterest'
    WHEN ${rawReferrerHostExpression} LIKE '%t.co%' OR ${rawReferrerHostExpression} LIKE '%twitter.%' OR ${rawReferrerHostExpression} LIKE '%x.com%' THEN 'Twitter/X'
    WHEN lower(${rawReferrerHostExpression}) = 'facebook.com' OR lower(${rawReferrerHostExpression}) LIKE '%.facebook.com' OR lower(${rawReferrerHostExpression}) = 'fb.com' OR lower(${rawReferrerHostExpression}) LIKE '%.fb.com' THEN 'Facebook'
    WHEN ${rawReferrerHostExpression} LIKE '%www.k4studios.com%' OR ${rawReferrerHostExpression} = 'k4studios.com' THEN 'K4 Internal'
    ELSE ${rawReferrerHostExpression}
  END`;
  const qualifiedExternalSessionPredicate = `(
    COALESCE(sf.engaged_event_count, 0) > 0
    OR COALESCE(sf.event_count, 0) >= 2
    OR COALESCE(sf.canonical_page_loads, 0) >= 2
    OR CAST((julianday(sf.last_seen_at) - julianday(sf.first_seen_at)) * 86400 AS INTEGER) >= 8
  )`;
  const facebookQualifiedPredicate = `(
    lower(COALESCE(landing_rows.source_label, '')) <> 'facebook'
    OR COALESCE(lower(landing_rows.referrer_path), '') LIKE '%fbclid=%'
    OR COALESCE(sf.engaged_event_count, 0) > 0
    OR COALESCE(sf.event_count, 0) >= 2
    OR CAST((julianday(sf.last_seen_at) - julianday(sf.first_seen_at)) * 86400 AS INTEGER) >= 5
  )`;
  const topImageLimitClause = (window.key === 'today' || window.key === 'yesterday') ? '' : 'LIMIT 10';

  const [refreshStatus, counts, families, interactionActions, topEntryPages, topSitePages, topImages, externalSources, sessionGeography, imageViewGeography, entrySourceRawMix, entrySourceTrustedMix, entrySourceQualifiedMix, pageKeyCoverageMix, pageKeyTransitionMix, pageKeyActorStats, firstImageHopMix, firstImagePathMix, suspiciousSessionGeography, suspiciousDatacenterSessionGeography, internalReentryMix] = await Promise.all([
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
       )${viewerExcludedSessionSubquery ? `,
       viewer_excluded_sessions AS (
         ${viewerExcludedSessionSubquery}
       )
       ` : ''}
       SELECT
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND metric_scope = 'primary'
            AND ${trustedSessionPredicate}
            AND ${canonicalViewerPredicate}) AS canonical_events,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND canonical_page_load = 1
            AND metric_scope = 'primary'
            AND ${trustedSessionPredicate}
            AND ${canonicalViewerPredicate}) AS canonical_page_loads,
         (SELECT COUNT(*)
          FROM session_facts_v2
            WHERE ${sessionWindowClause}
              AND canonical_page_loads > 0
                AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                  AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)${trustedSessionFactExclusionClause}) AS sessions_with_page_loads,
         (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
          FROM session_facts_v2
            WHERE ${sessionWindowClause}
              AND canonical_page_loads > 0
                AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                  AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)${trustedSessionFactExclusionClause}) AS visitors_with_page_loads,
           (SELECT COUNT(*)
          FROM session_facts_v2
            WHERE ${sessionWindowClause}
              AND engaged_event_count > 0
                AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                  AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)${trustedSessionFactExclusionClause}) AS engaged_sessions,
           (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause}
            AND event_family = 'image_view'
            AND metric_scope = 'primary'
            AND session_id IS NOT NULL
              AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
              AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)${trustedSessionFactExclusionClause}
              AND ${canonicalViewerPredicate}) AS image_views,
         (SELECT COUNT(*)
          FROM raw_events
          WHERE ${rawWindowClause}
            AND lower(COALESCE(event_type, '')) = 'direct_image'
            AND lower(COALESCE(source, '')) = 'proxy'${rawViewerExclusionClause}) AS direct_image_fetches,
         (SELECT COUNT(*)
          FROM raw_events
          WHERE ${rawWindowClause}
            AND lower(COALESCE(event_type, '')) = 'direct_image'
            AND lower(COALESCE(source, '')) = 'proxy'${rawViewerExclusionClause}) AS proxy_image_views,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause} AND event_family = 'buy_click'
            AND ${trustedSessionPredicate}
            AND ${canonicalViewerPredicate}) AS buy_clicks,
         (SELECT COUNT(*)
          FROM canonical_events_v2
          WHERE ${windowClause} AND event_family = 'grid_action'
            AND ${trustedSessionPredicate}
            AND ${canonicalViewerPredicate}) AS grid_actions,
         (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'gallery_action'
              AND ${trustedSessionPredicate}
              AND ${canonicalViewerPredicate}) AS gallery_actions,
           (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'image_nav'
              AND ${trustedSessionPredicate}
              AND ${canonicalViewerPredicate}) AS image_nav_actions,
           (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'story_action'
              AND ${trustedSessionPredicate}
              AND ${canonicalViewerPredicate}) AS story_actions,
           (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause} AND event_family = 'engagement_hint'
              AND ${trustedSessionPredicate}
              AND ${canonicalViewerPredicate}) AS engagement_hints,
           (SELECT COUNT(*)
            FROM suspicious_internal_shallow) AS suspicious_internal_shallow_sessions,
           (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
            FROM session_facts_v2
            WHERE session_id IN (SELECT session_id FROM suspicious_internal_shallow)) AS suspicious_internal_shallow_visitors,
              (SELECT COUNT(*)
            FROM canonical_events_v2
            WHERE ${windowClause}
              AND event_family = 'image_view'
                AND session_id IN (SELECT session_id FROM suspicious_internal_shallow)
                AND ${canonicalViewerPredicate}) AS suspicious_internal_shallow_image_views,
              (SELECT COUNT(*)
            FROM suspicious_datacenter_shallow) AS suspicious_datacenter_shallow_sessions,
              (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
              FROM session_facts_v2
              WHERE session_id IN (SELECT session_id FROM suspicious_datacenter_shallow)) AS suspicious_datacenter_shallow_visitors,
              (SELECT COUNT(*)
              FROM canonical_events_v2
              WHERE ${windowClause}
                AND event_family = 'image_view'
                AND session_id IN (SELECT session_id FROM suspicious_datacenter_shallow)
                AND ${canonicalViewerPredicate}) AS suspicious_datacenter_shallow_image_views,
              (SELECT COUNT(*) FROM internal_test_sessions) AS internal_test_sessions,
              (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'session:' || session_id))
              FROM session_facts_v2
              WHERE session_id IN (SELECT session_id FROM internal_test_sessions)) AS internal_test_visitors,
              (SELECT COUNT(*)
              FROM canonical_events_v2
              WHERE ${windowClause}
                AND event_family = 'image_view'
                AND session_id IN (SELECT session_id FROM internal_test_sessions)
                AND ${canonicalViewerPredicate}) AS internal_test_image_views,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) = 'page_view'
                 AND COALESCE(page, '') = '/'${rawViewerExclusionClause}) AS home_page_view_events,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) = 'pilot_home_page_view'
                 AND COALESCE(page, '') = '/'${rawViewerExclusionClause}) AS pilot_home_page_view_events,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('cowboy_jump', 'picture_shows_jump')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')${rawViewerExclusionClause}) AS home_cowboy_jump_events,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')${rawViewerExclusionClause}) AS pilot_home_cowboy_jump_events,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')
                 AND COALESCE(country, '') <> ''${rawViewerExclusionClause}) AS pilot_home_cowboy_geo_coverage,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')
                 AND COALESCE(ua, '') <> ''${rawViewerExclusionClause}) AS pilot_home_cowboy_ua_coverage,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')
                 AND COALESCE(referer, '') <> ''
                 AND lower(COALESCE(referer, '')) <> 'unknown'${rawViewerExclusionClause}) AS pilot_home_cowboy_referrer_coverage,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')
                 AND COALESCE(ip, '') <> ''${rawViewerExclusionClause}) AS pilot_home_cowboy_ip_coverage,
              (SELECT COUNT(*)
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')
                 AND (COALESCE(city, '') <> '' OR COALESCE(region, '') <> '')${rawViewerExclusionClause}) AS pilot_home_cowboy_city_region_coverage,
              (SELECT COUNT(DISTINCT COALESCE(NULLIF(session_id, ''), 'none'))
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')${rawViewerExclusionClause}) AS pilot_home_cowboy_sessions,
              (SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'none'))
               FROM raw_events
               WHERE ${rawWindowClause}
                 AND lower(COALESCE(event_type, '')) IN ('pilot_home_cowboy_jump_click', 'pilot_home_picture_shows_jump_click')
                 AND COALESCE(page, '') = '/'
                 AND COALESCE(target_id, '') IN ('Cowboy_Jump_Home', 'Picture_Shows_Widget_Home')${rawViewerExclusionClause}) AS pilot_home_cowboy_visitors,
              (SELECT COUNT(*)
               FROM (
                 WITH trusted_page_loads AS (
                   SELECT
                     session_id,
                     ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS seq,
                     page_path
                   FROM canonical_events_v2
                   WHERE ${windowClause}
                     AND canonical_page_load = 1
                     AND metric_scope = 'primary'
                     AND session_id IS NOT NULL
                     AND is_bot = 0
                     AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                     AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                     AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)
                     ${viewerExcludedSessionSubquery ? 'AND session_id NOT IN (SELECT session_id FROM viewer_excluded_sessions)' : ''}
                     AND page_path IS NOT NULL
                 )
                 SELECT session_id
                 FROM trusted_page_loads
                 GROUP BY session_id
                 HAVING MIN(CASE WHEN page_path LIKE '%/i-%' THEN seq END) IS NOT NULL
               )) AS sessions_reaching_first_image,
              (SELECT COUNT(*)
               FROM (
                 WITH trusted_page_loads AS (
                   SELECT
                     session_id,
                     ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS seq,
                     page_path
                   FROM canonical_events_v2
                   WHERE ${windowClause}
                     AND canonical_page_load = 1
                     AND metric_scope = 'primary'
                     AND session_id IS NOT NULL
                     AND is_bot = 0
                     AND session_id NOT IN (SELECT session_id FROM suspicious_internal_shallow)
                     AND session_id NOT IN (SELECT session_id FROM suspicious_datacenter_shallow)
                     AND session_id NOT IN (SELECT session_id FROM internal_test_sessions)
                     ${viewerExcludedSessionSubquery ? 'AND session_id NOT IN (SELECT session_id FROM viewer_excluded_sessions)' : ''}
                     AND page_path IS NOT NULL
                 )
                 SELECT session_id
                 FROM trusted_page_loads
                 GROUP BY session_id
                 HAVING MIN(CASE WHEN page_path LIKE '%/i-%' THEN seq END) = 1
               )) AS direct_to_first_image_sessions`
    ).first(),
    env.DB.prepare(
      `SELECT event_family, COUNT(*) AS count
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND metric_scope = 'primary'
         AND ${trustedSessionPredicate}
         AND ${canonicalViewerPredicate}
       GROUP BY event_family
       ORDER BY count DESC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `SELECT
         event_family,
         COALESCE(event_action, '') AS event_action,
         COALESCE(json_extract(metadata_json, '$.raw_event_type'), '') AS raw_event_type,
         COALESCE(json_extract(metadata_json, '$.raw_source_layer'), '') AS raw_source_layer,
         COUNT(*) AS count
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND metric_scope = 'primary'
         AND ${trustedSessionPredicate}
         AND ${canonicalViewerPredicate}
         AND event_family IN ('buy_click', 'gallery_action', 'grid_action', 'image_nav', 'story_action', 'engagement_hint')
       GROUP BY event_family, COALESCE(event_action, ''), COALESCE(json_extract(metadata_json, '$.raw_event_type'), ''), COALESCE(json_extract(metadata_json, '$.raw_source_layer'), '')
       ORDER BY event_family ASC, count DESC, event_action ASC, raw_event_type ASC`
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
        ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
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
         ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
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
              SUM(CASE WHEN event_family = 'image_view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN event_family = 'buy_click' THEN 1 ELSE 0 END) AS buy_clicks
       FROM canonical_events_v2
       WHERE ${windowClause}
         AND event_family IN ('buy_click', 'image_view', 'image_nav', 'grid_action', 'gallery_action', 'story_action')
         AND metric_scope = 'primary'
         AND session_id IS NOT NULL
         AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
        AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
         AND session_id NOT IN (${internalTestSessionSubquery})
         AND ${canonicalViewerPredicate}
         ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
         AND image_id IS NOT NULL
         AND (page_path IS NULL OR page_path LIKE '%/i-%' OR image_id LIKE 'i-%')
       GROUP BY image_id
       HAVING views > 0 OR buy_clicks > 0
       ORDER BY buy_clicks DESC, views DESC, image_id ASC
       ${topImageLimitClause}`
    ).all(),
    env.DB.prepare(
      `SELECT
         ${rawSourceLabelExpression} AS source_label,
         COUNT(*) AS views
       FROM raw_events
       WHERE ${rawWindowClause}
         AND lower(COALESCE(event_type, '')) = 'direct_image'
         AND lower(COALESCE(source, '')) = 'proxy'
         ${rawViewerExclusionClause}
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
             ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
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
         ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
       GROUP BY geo_label
       ORDER BY views DESC, geo_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${sourceLabelExpression} AS source_label,
           COALESCE(referrer_path, '') AS referrer_path,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND session_id IS NOT NULL
           AND is_bot = 0
       )
      SELECT source_label, COUNT(*) AS sessions
      FROM landing_rows
      WHERE rn = 1
        AND lower(COALESCE(source_label, '')) <> 'k4 internal'
        AND lower(COALESCE(source_label, '')) <> 'internal test'
       GROUP BY source_label
       ORDER BY sessions DESC, source_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${sourceLabelExpression} AS source_label,
           COALESCE(referrer_path, '') AS referrer_path,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND session_id IS NOT NULL
           AND is_bot = 0
           AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
             AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
             AND session_id NOT IN (${internalTestSessionSubquery})
             ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
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
      `WITH landing_rows AS (
         SELECT
           session_id,
           ${sourceLabelExpression} AS source_label,
           COALESCE(referrer_path, '') AS referrer_path,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND session_id IS NOT NULL
           AND is_bot = 0
           AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
             AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
             AND session_id NOT IN (${internalTestSessionSubquery})
             ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
       )
      SELECT COALESCE(sf.source_family, landing_rows.source_label) AS source_label, COUNT(*) AS sessions
      FROM landing_rows
      JOIN session_facts_v2 sf ON sf.session_id = landing_rows.session_id
      WHERE rn = 1
        AND lower(COALESCE(sf.source_family, landing_rows.source_label, '')) <> 'k4 internal'
        AND lower(COALESCE(sf.source_family, landing_rows.source_label, '')) <> 'internal test'
        AND ${qualifiedExternalSessionPredicate}
        AND ${facebookQualifiedPredicate}
       GROUP BY source_label
       ORDER BY sessions DESC, source_label ASC
       LIMIT 10`
    ).all(),
    env.DB.prepare(
      `WITH keyed AS (
         SELECT
           page_key,
           COALESCE(NULLIF(session_id, ''), NULLIF(session_id_v2, ''), NULLIF(visitor_id, '')) AS actor_id
         FROM raw_events
         WHERE ${rawWindowClause}
           AND page_key IS NOT NULL
           ${rawViewerExclusionClause}
       )
       SELECT
         page_key,
         COUNT(*) AS events,
         COUNT(DISTINCT actor_id) AS actors
       FROM keyed
       GROUP BY page_key
       ORDER BY events DESC, page_key ASC
       LIMIT 25`
    ).all(),
    env.DB.prepare(
      `WITH keyed AS (
         SELECT
           COALESCE(NULLIF(session_id, ''), NULLIF(session_id_v2, ''), NULLIF(visitor_id, '')) AS actor_id,
           ts,
           id,
           page_key
         FROM raw_events
         WHERE ${rawWindowClause}
           AND page_key IS NOT NULL
           ${rawViewerExclusionClause}
       ),
       first_hits AS (
         SELECT
           actor_id,
           page_key,
           MIN(ts) AS first_ts,
           MIN(id) AS first_id
         FROM keyed
         WHERE actor_id IS NOT NULL
         GROUP BY actor_id, page_key
       ),
       ordered_paths AS (
         SELECT
           actor_id,
           page_key,
           ROW_NUMBER() OVER (PARTITION BY actor_id ORDER BY first_ts ASC, first_id ASC) AS step_no
         FROM first_hits
       ),
       transitions AS (
         SELECT
           actor_id,
           LAG(page_key) OVER (PARTITION BY actor_id ORDER BY step_no ASC) AS from_key,
           page_key AS to_key
         FROM ordered_paths
       )
       SELECT
         from_key,
         to_key,
         COUNT(*) AS transitions
       FROM transitions
       WHERE from_key IS NOT NULL
         AND to_key IS NOT NULL
         AND from_key <> to_key
       GROUP BY from_key, to_key
       ORDER BY transitions DESC, from_key ASC, to_key ASC
       LIMIT 25`
    ).all(),
    env.DB.prepare(
      `WITH keyed AS (
         SELECT
           COALESCE(NULLIF(session_id, ''), NULLIF(session_id_v2, ''), NULLIF(visitor_id, '')) AS actor_id,
           page_key
         FROM raw_events
         WHERE ${rawWindowClause}
           AND page_key IS NOT NULL
           ${rawViewerExclusionClause}
       ),
       actor_stats AS (
         SELECT
           actor_id,
           COUNT(DISTINCT page_key) AS distinct_keys
         FROM keyed
         WHERE actor_id IS NOT NULL
         GROUP BY actor_id
       )
       SELECT
         COUNT(*) AS actors,
         SUM(CASE WHEN distinct_keys >= 2 THEN 1 ELSE 0 END) AS actors_with_2plus_keys
       FROM actor_stats`
    ).first(),
    env.DB.prepare(
      `WITH trusted_page_loads AS (
         SELECT
           session_id,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS seq,
           page_path
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND metric_scope = 'primary'
           AND session_id IS NOT NULL
           AND is_bot = 0
           AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
           AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
           AND session_id NOT IN (${internalTestSessionSubquery})
          ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
           AND page_path IS NOT NULL
       ),
       first_image AS (
         SELECT
           session_id,
           MIN(seq) AS first_image_seq
         FROM trusted_page_loads
         WHERE page_path LIKE '%/i-%'
         GROUP BY session_id
       )
       SELECT
         first_image_seq - 1 AS hop_count,
         COUNT(*) AS sessions
       FROM first_image
       GROUP BY hop_count
       ORDER BY hop_count ASC
       LIMIT 12`
    ).all(),
    env.DB.prepare(
      `WITH trusted_page_loads AS (
         SELECT
           session_id,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS seq,
           page_path
         FROM canonical_events_v2
         WHERE ${windowClause}
           AND canonical_page_load = 1
           AND metric_scope = 'primary'
           AND session_id IS NOT NULL
           AND is_bot = 0
           AND session_id NOT IN (${suspiciousInternalShallowSessionSubquery})
           AND session_id NOT IN (${suspiciousDatacenterSessionSubquery})
           AND session_id NOT IN (${internalTestSessionSubquery})
          ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
           AND page_path IS NOT NULL
       ),
       first_image AS (
         SELECT
           session_id,
           MIN(seq) AS first_image_seq
         FROM trusted_page_loads
         WHERE page_path LIKE '%/i-%'
         GROUP BY session_id
       ),
       session_paths AS (
         SELECT
           ordered.session_id,
           ordered.first_image_seq - 1 AS hop_count,
           ordered.path_sequence
         FROM (
           SELECT
             tpl.session_id,
             fi.first_image_seq,
             tpl.seq,
             GROUP_CONCAT(tpl.page_path, ' -> ') OVER (
               PARTITION BY tpl.session_id
               ORDER BY tpl.seq
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             ) AS path_sequence
           FROM trusted_page_loads tpl
           JOIN first_image fi ON fi.session_id = tpl.session_id
           WHERE tpl.seq <= fi.first_image_seq
         ) AS ordered
         WHERE ordered.seq = ordered.first_image_seq
       ),
       grouped_paths AS (
         SELECT
           hop_count,
           path_sequence,
           COUNT(*) AS sessions
         FROM session_paths
         GROUP BY hop_count, path_sequence
       ),
       ranked_paths AS (
         SELECT
           hop_count,
           path_sequence,
           sessions,
           ROW_NUMBER() OVER (PARTITION BY hop_count ORDER BY sessions DESC, path_sequence ASC) AS rank_within_hop
         FROM grouped_paths
       )
       SELECT
         hop_count,
         path_sequence,
         sessions,
         rank_within_hop
       FROM ranked_paths
       WHERE rank_within_hop <= 2
       ORDER BY hop_count ASC, rank_within_hop ASC
       LIMIT 24`
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
           ${viewerExcludedSessionSubquery ? `AND session_id NOT IN (${viewerExcludedSessionSubquery})` : ''}
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
    filters: filterState,
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
    entrySourceRawMix: entrySourceRawMix?.results || [],
    entrySourceTrustedMix: entrySourceTrustedMix?.results || [],
    entrySourceQualifiedMix: entrySourceQualifiedMix?.results || [],
    entrySourceMix: entrySourceQualifiedMix?.results || [],
    pageKeyCoverageMix: pageKeyCoverageMix?.results || [],
    pageKeyTransitionMix: pageKeyTransitionMix?.results || [],
    pageKeyActorStats: pageKeyActorStats || null,
    firstImageHopMix: firstImageHopMix?.results || [],
    firstImagePathMix: firstImagePathMix?.results || [],
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
