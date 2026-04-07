import { canonicalizeRawEventV2 } from './canonical.js';
import { getV2SchemaStatus } from './queries.js';

const REFRESH_STATE_TABLE = 'analytics_v2_state';
const LAST_PROCESSED_KEY = 'last_processed_raw_event_id';
const LAST_REFRESH_KEY = 'last_refresh_at';
const LAST_SUMMARY_KEY = 'last_refresh_summary';

async function columnExists(env, tableName, columnName) {
  const columns = (await env.DB.prepare(`PRAGMA table_info(${tableName})`).all())?.results || [];
  return columns.some((column) => String(column?.name || '') === columnName);
}

async function ensureV2ClassificationColumns(env) {
  const canonicalMetricScopeExists = await columnExists(env, 'canonical_events_v2', 'metric_scope');
  if (!canonicalMetricScopeExists) {
    await env.DB.prepare(`ALTER TABLE canonical_events_v2 ADD COLUMN metric_scope TEXT NOT NULL DEFAULT 'primary'`).run();
  }

  const canonicalDiagnosticClassExists = await columnExists(env, 'canonical_events_v2', 'diagnostic_class');
  if (!canonicalDiagnosticClassExists) {
    await env.DB.prepare(`ALTER TABLE canonical_events_v2 ADD COLUMN diagnostic_class TEXT`).run();
  }

  const suspiciousExists = await columnExists(env, 'session_facts_v2', 'is_suspicious_internal_shallow');
  if (!suspiciousExists) {
    await env.DB.prepare(`ALTER TABLE session_facts_v2 ADD COLUMN is_suspicious_internal_shallow INTEGER NOT NULL DEFAULT 0`).run();
  }

  const suspiciousDatacenterExists = await columnExists(env, 'session_facts_v2', 'is_suspicious_datacenter_shallow');
  if (!suspiciousDatacenterExists) {
    await env.DB.prepare(`ALTER TABLE session_facts_v2 ADD COLUMN is_suspicious_datacenter_shallow INTEGER NOT NULL DEFAULT 0`).run();
  }

  const sourceFamilyExists = await columnExists(env, 'session_facts_v2', 'source_family');
  if (!sourceFamilyExists) {
    await env.DB.prepare(`ALTER TABLE session_facts_v2 ADD COLUMN source_family TEXT`).run();
  }
}

async function ensureRefreshStateTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ${REFRESH_STATE_TABLE} (
      key TEXT PRIMARY KEY,
      value_text TEXT,
      value_int INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
}

async function getLastProcessedRawEventId(env) {
  await ensureRefreshStateTable(env);
  const stateRow = await env.DB.prepare(
    `SELECT value_int
     FROM ${REFRESH_STATE_TABLE}
     WHERE key = ?
     LIMIT 1`
  ).bind(LAST_PROCESSED_KEY).first();

  if (Number.isFinite(Number(stateRow?.value_int))) {
    return Number(stateRow.value_int);
  }

  const canonicalRow = await env.DB.prepare(
    `SELECT COALESCE(MAX(raw_event_id), 0) AS max_raw_event_id
     FROM canonical_events_v2`
  ).first();
  return Number(canonicalRow?.max_raw_event_id || 0);
}

async function upsertRefreshState(env, key, valueText, valueInt = null) {
  await env.DB.prepare(
    `INSERT INTO ${REFRESH_STATE_TABLE} (key, value_text, value_int, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       value_text = excluded.value_text,
       value_int = excluded.value_int,
       updated_at = datetime('now')`
  ).bind(key, valueText, valueInt).run();
}

function buildMetadataJson(rawEvent, canonical) {
  return JSON.stringify({
    raw_event_type: rawEvent?.event_type || null,
    raw_source_layer: rawEvent?.source_layer || null,
    country: rawEvent?.country || null,
    region: rawEvent?.region || null,
    city: rawEvent?.city || null,
    ua: rawEvent?.ua || null,
    raw_source_signal: canonical?.sourceSignal || null,
    dedupe_window_seconds: canonical?.dedupeWindowSeconds || null,
    dedupe_bucket: canonical?.dedupeBucket || null
  });
}

async function rebuildSessionFactsV2(env) {
  await env.DB.prepare(`DELETE FROM session_facts_v2`).run();
  await env.DB.prepare(
    `WITH ordered AS (
       SELECT
         id,
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
         WHEN lower(landing.referrer_host) LIKE 'localhost:%' OR lower(landing.referrer_host) = 'localhost' THEN 'Internal Test'
         WHEN lower(landing.referrer_host) LIKE '%edge.k4studios.com%' THEN 'Internal Test'
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
       ON bot_context.session_id = aggregated.session_id`
  ).run();

  await env.DB.prepare(
    `UPDATE session_facts_v2
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
       THEN 1 ELSE 0 END`
  ).run();
}

async function rebuildVisitorFactsV2(env) {
  await env.DB.prepare(`DELETE FROM visitor_facts_v2`).run();
  await env.DB.prepare(
    `WITH visitor_base AS (
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
     FROM visitor_agg`
  ).run();
}

export async function getV2RefreshStatus(env) {
  const schema = await getV2SchemaStatus(env);
  if (!schema.ready) {
    return {
      schemaReady: false,
      lastProcessedRawEventId: 0,
      pendingRawRows: 0,
      lastRefreshAt: null,
      lastSummary: null
    };
  }

  await ensureRefreshStateTable(env);
  const lastProcessedRawEventId = await getLastProcessedRawEventId(env);
  const [pendingRow, refreshRow, summaryRow] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS pending_raw_rows
       FROM raw_events
       WHERE id > ?`
    ).bind(lastProcessedRawEventId).first(),
    env.DB.prepare(
      `SELECT value_text, updated_at
       FROM ${REFRESH_STATE_TABLE}
       WHERE key = ?
       LIMIT 1`
    ).bind(LAST_REFRESH_KEY).first(),
    env.DB.prepare(
      `SELECT value_text
       FROM ${REFRESH_STATE_TABLE}
       WHERE key = ?
       LIMIT 1`
    ).bind(LAST_SUMMARY_KEY).first()
  ]);

  let lastSummary = null;
  if (summaryRow?.value_text) {
    try {
      lastSummary = JSON.parse(summaryRow.value_text);
    } catch (_) {
      lastSummary = null;
    }
  }

  return {
    schemaReady: true,
    lastProcessedRawEventId,
    pendingRawRows: Number(pendingRow?.pending_raw_rows || 0),
    lastRefreshAt: refreshRow?.value_text || refreshRow?.updated_at || null,
    lastSummary
  };
}

export async function refreshV2Incremental(env, { batchSize = 1000 } = {}) {
  const schema = await getV2SchemaStatus(env);
  if (!schema.ready) {
    throw new Error('V2 schema is not ready yet. Apply the scaffold migration first.');
  }

  await ensureRefreshStateTable(env);
  await ensureV2ClassificationColumns(env);
  const lastProcessedRawEventId = await getLastProcessedRawEventId(env);
  const normalizedBatchSize = Math.max(1, Math.min(Number(batchSize || 1000), 1000));
  const rawRows = (await env.DB.prepare(
    `SELECT
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
     WHERE id > ?
     ORDER BY id ASC
     LIMIT ?`
  ).bind(lastProcessedRawEventId, normalizedBatchSize).all())?.results || [];

  let acceptedRows = 0;
  let insertedCanonicalRows = 0;
  let processedRawRows = rawRows.length;
  let maxProcessedRawEventId = lastProcessedRawEventId;

  for (const rawEvent of rawRows) {
    maxProcessedRawEventId = Math.max(maxProcessedRawEventId, Number(rawEvent?.id || 0));
    const canonical = canonicalizeRawEventV2(rawEvent);
    if (!canonical?.accepted) {
      continue;
    }

    acceptedRows += 1;
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO canonical_events_v2 (
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
         metadata_json,
         updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      rawEvent.id,
      rawEvent.ts || null,
      canonical.occurredAt,
      canonical.dedupeKey,
      canonical.canonicalPageLoad,
      canonical.eventFamily,
      canonical.eventAction,
      canonical.pagePath,
      canonical.imageId,
      canonical.galleryId,
      canonical.sourceSurface,
      canonical.metricScope,
      canonical.diagnosticClass,
      canonical.sourceSignal,
      canonical.referrerHost,
      canonical.referrerPath,
      canonical.sessionId,
      canonical.visitorId,
      canonical.identityConfidence,
      canonical.isBot,
      buildMetadataJson(rawEvent, canonical)
    ).run();

    insertedCanonicalRows += Number(result?.meta?.changes || 0);
  }

  if (processedRawRows > 0) {
    await rebuildSessionFactsV2(env);
    await rebuildVisitorFactsV2(env);
    await upsertRefreshState(env, LAST_PROCESSED_KEY, String(maxProcessedRawEventId), maxProcessedRawEventId);
  }

  const refreshedAt = new Date().toISOString();
  const summary = {
    processedRawRows,
    acceptedRows,
    insertedCanonicalRows,
    lastProcessedRawEventId: maxProcessedRawEventId,
    batchSize: normalizedBatchSize,
    hasMore: processedRawRows === normalizedBatchSize
  };

  await upsertRefreshState(env, LAST_REFRESH_KEY, refreshedAt, maxProcessedRawEventId);
  await upsertRefreshState(env, LAST_SUMMARY_KEY, JSON.stringify(summary), maxProcessedRawEventId);

  return {
    refreshedAt,
    ...summary
  };
}