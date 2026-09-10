import { V3_DATACENTER_ASNS } from './model.js';

const EASTERN_TIME_ZONE = 'America/New_York';
const diagnosticAsnList = V3_DATACENTER_ASNS.join(',');
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EASTERN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function easternDay(date) {
  const parts = Object.fromEntries(formatter.formatToParts(date)
    .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDay(day, offset) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + offset)).toISOString().slice(0, 10);
}

function easternDayStartSql(day) {
  const [year, month, date] = day.split('-').map(Number);
  const target = Date.UTC(year, month - 1, date);
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = Object.fromEntries(dateTimeFormatter.formatToParts(new Date(candidate))
      .filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
    const actualValue = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    candidate += target - actualValue;
  }
  return new Date(candidate).toISOString().replace('T', ' ').slice(0, 19);
}

export function getV3Window(windowKey = 'today', now = new Date()) {
  const today = easternDay(now);
  if (windowKey === 'yesterday') return { key: 'yesterday', label: 'Yesterday', startDay: shiftDay(today, -1), endDay: shiftDay(today, -1) };
  if (windowKey === '7d') return { key: '7d', label: 'Last 7 days', startDay: shiftDay(today, -6), endDay: today };
  if (windowKey === '30d') return { key: '30d', label: 'Last 30 days', startDay: shiftDay(today, -29), endDay: today };
  return { key: 'today', label: 'Today', startDay: today, endDay: today };
}

function rows(result) {
  return Array.isArray(result?.results) ? result.results : [];
}

export async function getV3CoreSummary(env, { windowKey = 'today', now = new Date() } = {}) {
  const window = getV3Window(windowKey, now);
  const bounds = [window.startDay, window.endDay];
  const [metricResult, peopleResult, dimensionResult, sessionBreakdownResult, imageResult, stateResult] = await env.DB.batch([
    env.DB.prepare(`
      SELECT COALESCE(SUM(page_views),0) AS page_views,
        COALESCE(SUM(image_views),0) AS image_views,
        COALESCE(SUM(pricing_opens),0) AS pricing_opens,
        COALESCE(SUM(order_submits),0) AS order_submits
      FROM analytics_v3_daily_metrics WHERE day BETWEEN ? AND ?
    `).bind(...bounds),
    env.DB.prepare(`
      SELECT
        (SELECT COUNT(DISTINCT visitor_id) FROM analytics_v3_daily_visitors WHERE day BETWEEN ? AND ?) AS visitors,
        (SELECT COUNT(DISTINCT session_id) FROM analytics_v3_daily_sessions WHERE day BETWEEN ? AND ?) AS sessions,
        (SELECT COUNT(DISTINCT session_id) FROM analytics_v3_daily_sessions WHERE day BETWEEN ? AND ? AND engaged=1) AS engaged_sessions
    `).bind(...bounds, ...bounds, ...bounds),
    env.DB.prepare(`
      SELECT dimension, label, SUM(count) AS count
      FROM analytics_v3_daily_dimensions
      WHERE day BETWEEN ? AND ? AND dimension IN ('page','action','action_group','image_geo_views')
      GROUP BY dimension, label
      ORDER BY dimension, count DESC
    `).bind(...bounds),
    env.DB.prepare(`
      WITH scoped AS MATERIALIZED (
        SELECT landing_page,entry_source,visitor_id,visitor_geo,image_geo
        FROM analytics_v3_daily_sessions WHERE day BETWEEN ? AND ?
      )
      SELECT 'entry_page' kind,landing_page label,COUNT(*) count FROM scoped
        WHERE landing_page IS NOT NULL GROUP BY landing_page
      UNION ALL
      SELECT 'entry_source',entry_source,COUNT(*) FROM scoped
        WHERE entry_source IS NOT NULL GROUP BY entry_source
      UNION ALL
      SELECT 'visitor_geo',visitor_geo,COUNT(DISTINCT visitor_id) FROM scoped
        WHERE visitor_geo IS NOT NULL GROUP BY visitor_geo
      UNION ALL
      SELECT 'image_geo',image_geo,COUNT(DISTINCT visitor_id) FROM scoped
        WHERE image_geo IS NOT NULL GROUP BY image_geo
    `).bind(...bounds),
    env.DB.prepare(`
      WITH grouped AS MATERIALIZED (
        SELECT image_id,MAX(NULLIF(page_path,'')) page_path,SUM(count) count,
          SUM(pricing_opens) pricing_opens
        FROM analytics_v3_daily_images WHERE day BETWEEN ? AND ?
        GROUP BY image_id
      ), top_viewed AS (
        SELECT image_id FROM grouped WHERE count>0
        ORDER BY count DESC,image_id LIMIT 25
      )
      SELECT image_id,page_path,count,pricing_opens FROM grouped
      WHERE pricing_opens>0 OR image_id IN (SELECT image_id FROM top_viewed)
      ORDER BY count DESC,pricing_opens DESC,image_id
    `).bind(...bounds),
    env.DB.prepare('SELECT last_raw_event_id, last_event_ts, updated_at FROM analytics_v3_state WHERE singleton=1')
  ]);

  const totals = rows(metricResult)[0] || {};
  const people = rows(peopleResult)[0] || {};
  const dimensionRows = rows(dimensionResult);
  const sessionRows = rows(sessionBreakdownResult);
  const top = (dimension, limit) => dimensionRows.filter((row) => row.dimension === dimension)
    .slice(0, limit).map((row) => ({ label: row.label, count: Number(row.count || 0) }));
  const topSession = (kind, limit) => sessionRows.filter((row) => row.kind === kind)
    .map((row) => ({ label: row.label, count: Number(row.count || 0) }))
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label)).slice(0, limit);
  const imageViewGeoCounts = new Map(top('image_geo_views', Number.MAX_SAFE_INTEGER)
    .map((row) => [row.label, row.count]));
  return {
    window,
    state: rows(stateResult)[0] || null,
    counts: {
      visitors: Number(people.visitors || 0),
      sessions: Number(people.sessions || 0),
      engaged_sessions: Number(people.engaged_sessions || 0),
      page_views: Number(totals.page_views || 0), image_views: Number(totals.image_views || 0),
      pricing_opens: Number(totals.pricing_opens || 0), order_submits: Number(totals.order_submits || 0)
    },
    topPages: top('page', 10),
    topImages: rows(imageResult).map((row) => ({
      label: row.image_id, imageId: row.image_id, pagePath: row.page_path || null,
      count: Number(row.count || 0), pricingOpens: Number(row.pricing_opens || 0)
    })),
    entryPages: topSession('entry_page', 25), acquisition: topSession('entry_source', 10),
    visitorGeography: topSession('visitor_geo', 20),
    imageGeography: topSession('image_geo', 20).map((row) => ({
      ...row, imageViews: imageViewGeoCounts.get(row.label) || 0
    })),
    actionGroups: top('action_group', 10), actions: top('action', 25)
  };
}

export async function getV3Diagnostics(env, { windowKey = 'today', now = new Date() } = {}) {
  const window = getV3Window(windowKey, now);
  const start = easternDayStartSql(window.startDay);
  const end = easternDayStartSql(shiftDay(window.endDay, 1));
  const bounds = [start, end];
  const diagnosticPredicate = `(source<>'js' OR event_type IN ('direct_image','harvester_friction') OR cf_asn IN (${diagnosticAsnList}) OR country='T1' OR lower(COALESCE(ua,'')) LIKE '%bot%' OR lower(COALESCE(ua,'')) LIKE '%headless%')`;
  const [eventMix, asnMix, userAgents] = await env.DB.batch([
    env.DB.prepare(`SELECT source || ' / ' || event_type AS label, COUNT(*) count FROM raw_events INDEXED BY idx_raw_events_ts WHERE ts>=? AND ts<? AND ${diagnosticPredicate} GROUP BY source,event_type ORDER BY count DESC LIMIT 30`).bind(...bounds),
    env.DB.prepare(`SELECT 'ASN ' || COALESCE(CAST(cf_asn AS TEXT),'unknown') label, COUNT(*) count FROM raw_events INDEXED BY idx_raw_events_ts WHERE ts>=? AND ts<? AND ${diagnosticPredicate} GROUP BY cf_asn ORDER BY count DESC LIMIT 20`).bind(...bounds),
    env.DB.prepare(`SELECT COALESCE(NULLIF(ua,''),'Unknown user agent') label, COUNT(*) count FROM raw_events INDEXED BY idx_raw_events_ts WHERE ts>=? AND ts<? AND ${diagnosticPredicate} GROUP BY ua ORDER BY count DESC LIMIT 15`).bind(...bounds)
  ]);
  const map = (result) => rows(result).map((row) => ({ label: row.label, count: Number(row.count || 0) }));
  return { window, eventMix: map(eventMix), asnMix: map(asnMix), userAgents: map(userAgents) };
}
