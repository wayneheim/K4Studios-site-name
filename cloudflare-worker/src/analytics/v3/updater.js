import { buildV3RollupBatch, getV3EvidenceSessionKeys } from './model.js';
import { SHOPPING_STAGES } from './shopping.js';

const RAW_BATCH_SIZE = 250;
// Production D1 accepts fewer bound variables per statement than Miniflare.
// Production D1 currently rejects statements above 100 bound variables. The
// widest V3 insert has sixteen columns, so six rows (96 bindings) stays below
// that ceiling while still batching writes efficiently.
const VALUE_CHUNK_SIZE = 6;

function chunks(rows, size = VALUE_CHUNK_SIZE) {
  const output = [];
  for (let index = 0; index < rows.length; index += size) output.push(rows.slice(index, index + size));
  return output;
}

function valuesSql(rowCount, columnCount) {
  return Array.from({ length: rowCount }, () => `(${Array(columnCount).fill('?').join(',')})`).join(',');
}

async function readState(env) {
  return env.DB.prepare('SELECT last_raw_event_id, last_event_ts, updated_at FROM analytics_v3_state WHERE singleton = 1').first();
}

async function acquireUpdateLock(env) {
  const token = crypto.randomUUID();
  const result = await env.DB.prepare(`
    UPDATE analytics_v3_state SET update_token=?, update_started_at=CURRENT_TIMESTAMP
    WHERE singleton=1 AND (update_token IS NULL OR update_started_at < datetime('now','-5 minutes'))
  `).bind(token).run();
  if (Number(result?.meta?.changes || 0) !== 1) {
    throw new Error('A V3 update is already running. Try again shortly.');
  }
  return token;
}

async function releaseUpdateLock(env, token) {
  await env.DB.prepare(`
    UPDATE analytics_v3_state SET update_token=NULL, update_started_at=NULL
    WHERE singleton=1 AND update_token=?
  `).bind(token).run();
}

async function initializeRetentionCursor(env, token) {
  const row = await env.DB.prepare(`
    SELECT COALESCE(MIN(id)-1, (SELECT COALESCE(MAX(id),0) FROM raw_events), 0) AS cursor
    FROM raw_events INDEXED BY idx_raw_events_ts
    WHERE ts >= datetime('now','-30 days')
  `).first();
  const cursor = Math.max(0, Number(row?.cursor || 0));
  await env.DB.prepare(`
    UPDATE analytics_v3_state SET last_raw_event_id=?, updated_at=CURRENT_TIMESTAMP
    WHERE singleton=1 AND last_raw_event_id=0 AND update_token=?
  `).bind(cursor, token).run();
  return cursor;
}

async function readRawBatch(env, afterId, limit) {
  const result = await env.DB.prepare(`
    SELECT id, ts, event_type, target_id, page, session_id, visitor_id, referer,
           entry_referrer, document_referrer, source, source_layer, visitor_status, country, region, city, cf_asn, ua, ip, ip_hash,
           utm_source, utm_medium, utm_campaign, page_instance_id, engaged_ms, engagement_meta
    FROM raw_events
    WHERE id > ?
    ORDER BY id
    LIMIT ?
  `).bind(afterId, limit).all();
  return Array.isArray(result?.results) ? result.results : [];
}

async function readEntryEvidence(env, rows) {
  const previous = [];
  // Primary-key lookups only; lifecycle-only batches must still find the entry
  // established by an earlier cursor batch. Never rescan the raw history.
  for (const group of chunks(getV3EvidenceSessionKeys(rows), 40)) {
    const result = await env.DB.prepare(`
      SELECT day,session_id,landing_page,entry_source,visitor_geo,entry_is_image_fallback,entry_evidence
      FROM analytics_v3_daily_sessions
      WHERE ${group.map(() => '(day=? AND session_id=?)').join(' OR ')}
    `).bind(...group.flatMap((row) => [row.day, row.sessionId])).all();
    previous.push(...(result.results || []));
  }
  return previous;
}

function buildWriteStatements(env, rollup, previousCursor, updateToken) {
  const statements = [];

  for (const group of chunks(rollup.daily)) {
    statements.push(env.DB.prepare(`
      INSERT INTO analytics_v3_daily_metrics
        (day,page_views,image_views,pricing_opens,order_submits,smugmug_clicks,email_clicks,core_events)
      VALUES ${valuesSql(group.length, 8)}
      ON CONFLICT(day) DO UPDATE SET
        page_views=page_views+excluded.page_views,
        image_views=image_views+excluded.image_views,
        pricing_opens=pricing_opens+excluded.pricing_opens,
        order_submits=order_submits+excluded.order_submits,
        smugmug_clicks=smugmug_clicks+excluded.smugmug_clicks,
        email_clicks=email_clicks+excluded.email_clicks,
        core_events=core_events+excluded.core_events
    `).bind(...group.flatMap((row) => [row.day, row.pageViews, row.imageViews, row.pricingOpens, row.orderSubmits, row.smugmugClicks, row.emailClicks, row.coreEvents])));
  }

  for (const group of chunks(rollup.dimensions)) {
    statements.push(env.DB.prepare(`
      INSERT INTO analytics_v3_daily_dimensions (day,dimension,label,count)
      VALUES ${valuesSql(group.length, 4)}
      ON CONFLICT(day,dimension,label) DO UPDATE SET count=count+excluded.count
    `).bind(...group.flatMap((row) => [row.day, row.dimension, row.label, row.count])));
  }

  for (const group of chunks(rollup.sessions)) {
    statements.push(env.DB.prepare(`
      INSERT INTO analytics_v3_daily_sessions
        (day,session_id,visitor_id,visitor_status,engaged,landing_page,entry_source,visitor_geo,image_geo,entry_is_image_fallback,page_view_count,site_device,image_device,oim_domain,entry_evidence,shopping_activity)
      VALUES ${valuesSql(group.length, 16)}
      ON CONFLICT(day,session_id) DO UPDATE SET
        visitor_id=COALESCE(analytics_v3_daily_sessions.visitor_id,excluded.visitor_id),
        visitor_status=COALESCE(analytics_v3_daily_sessions.visitor_status,excluded.visitor_status),
        engaged=MAX(analytics_v3_daily_sessions.engaged,excluded.engaged),
        landing_page=CASE WHEN analytics_v3_daily_sessions.landing_page IS NULL OR (analytics_v3_daily_sessions.entry_is_image_fallback=1 AND excluded.entry_is_image_fallback=0) THEN excluded.landing_page ELSE analytics_v3_daily_sessions.landing_page END,
        entry_source=CASE WHEN analytics_v3_daily_sessions.entry_source IS NULL OR (analytics_v3_daily_sessions.entry_is_image_fallback=1 AND excluded.entry_is_image_fallback=0) THEN excluded.entry_source ELSE analytics_v3_daily_sessions.entry_source END,
        visitor_geo=CASE WHEN analytics_v3_daily_sessions.visitor_geo IS NULL OR (analytics_v3_daily_sessions.entry_is_image_fallback=1 AND excluded.entry_is_image_fallback=0) THEN excluded.visitor_geo ELSE analytics_v3_daily_sessions.visitor_geo END,
        image_geo=COALESCE(analytics_v3_daily_sessions.image_geo,excluded.image_geo),
        site_device=COALESCE(analytics_v3_daily_sessions.site_device,excluded.site_device),
        image_device=COALESCE(analytics_v3_daily_sessions.image_device,excluded.image_device),
        oim_domain=COALESCE(analytics_v3_daily_sessions.oim_domain,excluded.oim_domain),
        entry_is_image_fallback=CASE WHEN analytics_v3_daily_sessions.landing_page IS NULL OR (analytics_v3_daily_sessions.entry_is_image_fallback=1 AND excluded.entry_is_image_fallback=0) THEN excluded.entry_is_image_fallback ELSE analytics_v3_daily_sessions.entry_is_image_fallback END,
        page_view_count=analytics_v3_daily_sessions.page_view_count+excluded.page_view_count,
        entry_evidence=excluded.entry_evidence,
        shopping_activity=json_object(${SHOPPING_STAGES.map(({ event }) => `'${event}',
          COALESCE(json_extract(analytics_v3_daily_sessions.shopping_activity,'$.${event}'),0)
          + COALESCE(json_extract(excluded.shopping_activity,'$.${event}'),0)`).join(',')})
    `).bind(...group.flatMap((row) => [
      row.day, row.sessionId, row.visitorId, row.visitorStatus, row.engaged, row.landingPage,
      row.entrySource, row.visitorGeo, row.imageGeo, row.entryIsImageFallback, row.pageViewCount,
      row.siteDevice, row.imageDevice, row.oimDomain, row.entryEvidence ? JSON.stringify(row.entryEvidence) : null,
      JSON.stringify(row.shoppingActivity || {})
    ])));
  }

  for (const group of chunks(rollup.visitors)) {
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO analytics_v3_daily_visitors (day,visitor_id)
      VALUES ${valuesSql(group.length, 2)}
    `).bind(...group.flatMap((row) => [row.day, row.visitorId])));
  }

  for (const group of chunks(rollup.images)) {
    statements.push(env.DB.prepare(`
      INSERT INTO analytics_v3_daily_images (day,image_id,page_path,count,pricing_opens,smugmug_clicks,email_clicks,shopping_activity)
      VALUES ${valuesSql(group.length, 8)}
      ON CONFLICT(day,image_id,page_path) DO UPDATE SET
        count=count+excluded.count,
        pricing_opens=pricing_opens+excluded.pricing_opens,
        smugmug_clicks=smugmug_clicks+excluded.smugmug_clicks,
        email_clicks=email_clicks+excluded.email_clicks,
        shopping_activity=json_object(${SHOPPING_STAGES.map(({ event }) => `'${event}',
          COALESCE(json_extract(analytics_v3_daily_images.shopping_activity,'$.${event}'),0)
          + COALESCE(json_extract(excluded.shopping_activity,'$.${event}'),0)`).join(',')},
          '_sessions',json((SELECT json_group_array(value) FROM (
            SELECT value FROM json_each(analytics_v3_daily_images.shopping_activity,'$._sessions')
            UNION SELECT value FROM json_each(excluded.shopping_activity,'$._sessions')
          ))))
    `).bind(...group.flatMap((row) => [row.day, row.imageId, row.pagePath || '', row.count, row.pricingOpens || 0, row.smugmugClicks || 0, row.emailClicks || 0, JSON.stringify(row.shoppingActivity || {})])));
  }

  for (const group of chunks(rollup.imageGeography)) {
    statements.push(env.DB.prepare(`
      INSERT INTO analytics_v3_daily_image_geography
        (day,image_id,country,region,city,count)
      VALUES ${valuesSql(group.length, 6)}
      ON CONFLICT(day,image_id,country,region,city) DO UPDATE SET
        count=count+excluded.count
    `).bind(...group.flatMap((row) => [
      row.day, row.imageId, row.country, row.region, row.city, row.count
    ])));
  }

  statements.push(env.DB.prepare(`
    UPDATE analytics_v3_state
    SET last_raw_event_id=?, last_event_ts=?, updated_at=CURRENT_TIMESTAMP
    WHERE singleton=1 AND last_raw_event_id=? AND update_token=?
  `).bind(rollup.lastRawEventId, rollup.lastEventTs, previousCursor, updateToken));
  return statements;
}

export async function updateV3Rollups(env, { maxRows = 2500 } = {}) {
  const cappedRows = Math.max(1, Math.min(Number(maxRows || 2500), 5000));
  const updateToken = await acquireUpdateLock(env);
  try {
    const initialState = await readState(env);
    if (!initialState) throw new Error('Analytics V3 schema has not been initialized.');
    if (Number(initialState.last_raw_event_id || 0) === 0) {
      initialState.last_raw_event_id = await initializeRetentionCursor(env, updateToken);
    }

    let cursor = Number(initialState.last_raw_event_id || 0);
    let scanned = 0;
    let accepted = 0;
    let batchCount = 0;
    let lastEventTs = initialState.last_event_ts || null;

    while (scanned < cappedRows) {
      const rows = await readRawBatch(env, cursor, Math.min(RAW_BATCH_SIZE, cappedRows - scanned));
      if (!rows.length) break;
      const previousSessions = await readEntryEvidence(env, rows);
      const rollup = buildV3RollupBatch(rows, previousSessions);
      if (!rollup.lastRawEventId || rollup.lastRawEventId <= cursor) break;
      await env.DB.batch(buildWriteStatements(env, rollup, cursor, updateToken));
      cursor = rollup.lastRawEventId;
      lastEventTs = rollup.lastEventTs;
      scanned += rollup.scanned;
      accepted += rollup.accepted;
      batchCount += 1;
      if (rows.length < RAW_BATCH_SIZE) break;
    }

    const more = await env.DB.prepare('SELECT id FROM raw_events WHERE id > ? ORDER BY id LIMIT 1').bind(cursor).first();
    await releaseUpdateLock(env, updateToken);
    return { previousCursor: Number(initialState.last_raw_event_id || 0), lastRawEventId: cursor, lastEventTs, scanned, accepted, batchCount, hasMore: Boolean(more) };
  } catch (error) {
    await releaseUpdateLock(env, updateToken).catch(() => {});
    throw error;
  }
}
