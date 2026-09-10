import { buildV3RollupBatch } from './model.js';

const RAW_BATCH_SIZE = 250;
// Production D1 accepts fewer bound variables per statement than Miniflare.
// The widest V3 insert has eight columns, so ten rows stays safely below the
// production ceiling while still batching writes efficiently.
const VALUE_CHUNK_SIZE = 10;

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
           entry_referrer, source, country, region, city, cf_asn, ua, ip, ip_hash
    FROM raw_events
    WHERE id > ?
    ORDER BY id
    LIMIT ?
  `).bind(afterId, limit).all();
  return Array.isArray(result?.results) ? result.results : [];
}

function buildWriteStatements(env, rollup, previousCursor, updateToken) {
  const statements = [];

  for (const group of chunks(rollup.daily)) {
    statements.push(env.DB.prepare(`
      INSERT INTO analytics_v3_daily_metrics
        (day,page_views,image_views,pricing_opens,order_submits,core_events)
      VALUES ${valuesSql(group.length, 6)}
      ON CONFLICT(day) DO UPDATE SET
        page_views=page_views+excluded.page_views,
        image_views=image_views+excluded.image_views,
        pricing_opens=pricing_opens+excluded.pricing_opens,
        order_submits=order_submits+excluded.order_submits,
        core_events=core_events+excluded.core_events
    `).bind(...group.flatMap((row) => [row.day, row.pageViews, row.imageViews, row.pricingOpens, row.orderSubmits, row.coreEvents])));
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
        (day,session_id,visitor_id,engaged,landing_page,entry_source,visitor_geo,image_geo)
      VALUES ${valuesSql(group.length, 8)}
      ON CONFLICT(day,session_id) DO UPDATE SET
        visitor_id=COALESCE(analytics_v3_daily_sessions.visitor_id,excluded.visitor_id),
        engaged=MAX(analytics_v3_daily_sessions.engaged,excluded.engaged),
        landing_page=COALESCE(analytics_v3_daily_sessions.landing_page,excluded.landing_page),
        entry_source=COALESCE(analytics_v3_daily_sessions.entry_source,excluded.entry_source),
        visitor_geo=COALESCE(analytics_v3_daily_sessions.visitor_geo,excluded.visitor_geo),
        image_geo=COALESCE(analytics_v3_daily_sessions.image_geo,excluded.image_geo)
    `).bind(...group.flatMap((row) => [
      row.day, row.sessionId, row.visitorId, row.engaged, row.landingPage,
      row.entrySource, row.visitorGeo, row.imageGeo
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
      INSERT INTO analytics_v3_daily_images (day,image_id,page_path,count,pricing_opens)
      VALUES ${valuesSql(group.length, 5)}
      ON CONFLICT(day,image_id,page_path) DO UPDATE SET
        count=count+excluded.count,
        pricing_opens=pricing_opens+excluded.pricing_opens
    `).bind(...group.flatMap((row) => [row.day, row.imageId, row.pagePath || '', row.count, row.pricingOpens || 0])));
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
      const rollup = buildV3RollupBatch(rows);
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
