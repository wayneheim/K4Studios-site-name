import { renderInspectPage } from './renderer.js';

function withAdminNoCacheHeaders(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('Vary', 'Authorization');
  return headers;
}

function sqlString(value) {
  return String(value || '').replace(/'/g, "''");
}

function parseBool01(value) {
  return value === '1' || value === 'true';
}

function buildDateWhere({ days, yesterday, selectedDate }) {
  const nDays = Number.isFinite(days) ? days : 1;

  if (selectedDate) {
    return `date(e.ts, '-5 hours') = '${sqlString(selectedDate)}'`;
  }

  if (yesterday) {
    return `date(e.ts, '-5 hours') = date('now', '-5 hours', '-1 day')`;
  }

  if (nDays === 1) {
    return `date(e.ts, '-5 hours') = date('now', '-5 hours')`;
  }

  // Calendar-day window in Eastern time, inclusive of today.
  const clamped = Math.max(1, Math.min(30, nDays));
  const backDays = Math.max(0, clamped - 1);
  return `date(e.ts, '-5 hours') >= date('now', '-5 hours', '-${backDays} days')`;
}

function classifyRefSourceSql(refCol = 'entry_referer') {
  return `CASE
    WHEN ${refCol} IS NULL OR ${refCol} = '' OR ${refCol} = 'unknown' OR ${refCol} = 'direct' THEN 'direct'
    WHEN ${refCol} LIKE '%images.google.%' OR ${refCol} LIKE '%google.%/imgres%' THEN 'google_images'
    WHEN ${refCol} LIKE '%google.%' THEN 'google_search'
    WHEN ${refCol} LIKE '%bing.%/images%' THEN 'bing_images'
    WHEN ${refCol} LIKE '%bing.%' THEN 'bing_search'
    WHEN ${refCol} LIKE '%pinterest.%' THEN 'pinterest'
    WHEN ${refCol} LIKE '%facebook.%' OR ${refCol} LIKE '%fb.%' THEN 'facebook'
    WHEN ${refCol} LIKE '%twitter.%' OR ${refCol} LIKE '%t.co/%' OR ${refCol} LIKE '%x.com%' THEN 'twitter'
    WHEN ${refCol} LIKE '%chatgpt.com%' OR ${refCol} LIKE '%chat.openai.com%' THEN 'chatgpt'
    WHEN ${refCol} LIKE '%instagram.%' THEN 'instagram'
    WHEN ${refCol} LIKE '%linkedin.%' THEN 'linkedin'
    WHEN ${refCol} LIKE '%duckduckgo.%' THEN 'duckduckgo'
    WHEN ${refCol} LIKE '%k4studios.com%' THEN 'internal'
    ELSE 'unattributed'
  END`;
}

export async function handleInspectRequest(request, env) {
  const url = new URL(request.url);

  const days = parseInt(url.searchParams.get('days') || '1', 10);
  const yesterday = parseBool01(url.searchParams.get('yesterday'));
  const selectedDateRaw = url.searchParams.get('date');
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDateRaw || '') ? selectedDateRaw : null;

  const hideBots = parseBool01(url.searchParams.get('hideBots'));
  const hideChardon = parseBool01(url.searchParams.get('hideChardon'));
  const excludeIp = url.searchParams.get('excludeIp') || null;

  const country = (url.searchParams.get('country') || '').trim();
  const region = (url.searchParams.get('region') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();

  const sessionId = (url.searchParams.get('session') || '').trim();
  const limit = Math.max(5, Math.min(50, parseInt(url.searchParams.get('limit') || '25', 10)));

  if (!country) {
    const html = renderInspectPage({
      title: 'Inspect Geography',
      locationLabel: 'Unknown location',
      backUrl: '/__k4stats',
      sessions: [],
      timeline: [],
      selectedSessionId: null,
      error: 'Missing required parameter: country'
    });

    return new Response(html, {
      status: 400,
      headers: withAdminNoCacheHeaders({ 'Content-Type': 'text/html; charset=utf-8' })
    });
  }

  const locationLabel = [city || null, region || null, country || null].filter(Boolean).join(', ');

  const dateWhere = buildDateWhere({ days, yesterday, selectedDate });

  const parts = [dateWhere];
  parts.push(`e.source = 'js'`);
  parts.push(`e.session_id IS NOT NULL`);
  parts.push(`e.country = '${sqlString(country)}'`);
  if (region) parts.push(`e.region = '${sqlString(region)}'`);
  if (city) parts.push(`e.city = '${sqlString(city)}'`);
  if (excludeIp) parts.push(`(e.ip IS NULL OR e.ip != '${sqlString(excludeIp)}')`);
  if (hideChardon) {
    parts.push(`e.city != 'Chardon'`);
    parts.push(`(e.referer IS NULL OR e.referer NOT LIKE '%localhost%')`);
  }
  if (hideBots) {
    // human_population already filters heavily; this just keeps it consistent with other panels.
    parts.push(`COALESCE(e.is_bot, 0) = 0`);
  }

  const where = parts.length ? parts.map(p => `(${p})`).join(' AND ') : '1=1';

  const sessionsQuery = `
    WITH session_events AS (
      SELECT
        e.session_id,
        MIN(e.ts) AS first_ts,
        MAX(e.ts) AS last_ts,
        CAST((julianday(MAX(e.ts)) - julianday(MIN(e.ts))) * 86400 AS INTEGER) AS duration_s,
        COUNT(*) AS events
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
      GROUP BY e.session_id
    ),
    entry_pages AS (
      SELECT session_id, visitor_id, page_path AS entry_page, referer AS entry_referer
      FROM (
        SELECT
          e.session_id,
          e.visitor_id,
          COALESCE(NULLIF(e.page, ''), e.target_id) AS page_path,
          e.referer,
          ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.ts ASC) AS rn
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          AND e.event_type = 'page_view'
          AND (e.page IS NOT NULL OR e.target_id IS NOT NULL)
      )
      WHERE rn = 1
    )
    SELECT
      se.session_id,
      ep.visitor_id,
      se.first_ts,
      se.last_ts,
      se.duration_s,
      se.events,
      ep.entry_page,
      ep.entry_referer,
      ${classifyRefSourceSql('ep.entry_referer')} AS ref_source
    FROM session_events se
    LEFT JOIN entry_pages ep ON ep.session_id = se.session_id
    ORDER BY se.last_ts DESC
    LIMIT ${limit}
  `;

  let sessions = [];
  try {
    const result = await env.DB.prepare(sessionsQuery).all();
    sessions = result?.results || [];
  } catch (e) {
    const html = renderInspectPage({
      title: 'Inspect Geography',
      locationLabel,
      backUrl: '/__k4stats',
      sessions: [],
      timeline: [],
      selectedSessionId: null,
      error: `Query failed: ${e.message}`
    });

    return new Response(html, {
      status: 500,
      headers: withAdminNoCacheHeaders({ 'Content-Type': 'text/html; charset=utf-8' })
    });
  }

  let timeline = [];
  if (sessionId) {
    const timelineQuery = `
      SELECT
        e.ts,
        e.event_type,
        COALESCE(NULLIF(e.page, ''), e.target_id) AS page_path,
        e.target_id,
        e.img_size,
        e.ref_type,
        SUBSTR(COALESCE(e.referer, ''), 1, 160) AS referer
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
        AND e.session_id = '${sqlString(sessionId)}'
      ORDER BY e.ts ASC
      LIMIT 400
    `;

    try {
      const tRes = await env.DB.prepare(timelineQuery).all();
      timeline = tRes?.results || [];
    } catch (e) {
      timeline = [{ ts: '', event_type: 'error', page_path: '', target_id: '', img_size: '', ref_type: '', referer: `Timeline query failed: ${e.message}` }];
    }
  }

  const params = new URLSearchParams();
  if (days && !Number.isNaN(days)) params.set('days', String(days));
  if (yesterday) params.set('yesterday', '1');
  if (selectedDate) params.set('date', selectedDate);
  if (hideBots) params.set('hideBots', '1');
  if (hideChardon) params.set('hideChardon', '1');
  if (excludeIp) params.set('excludeIp', excludeIp);

  const backUrl = `/__k4stats?${params.toString()}`;

  const html = renderInspectPage({
    title: 'Inspect Geography',
    locationLabel,
    backUrl,
    sessions,
    timeline,
    selectedSessionId: sessionId || null,
    baseInspectParams: {
      country,
      region,
      city,
      days: String(days),
      yesterday: yesterday ? '1' : '0',
      date: selectedDate || '',
      hideBots: hideBots ? '1' : '0',
      hideChardon: hideChardon ? '1' : '0',
      excludeIp: excludeIp || ''
    }
  });

  return new Response(html, {
    status: 200,
    headers: withAdminNoCacheHeaders({ 'Content-Type': 'text/html; charset=utf-8' })
  });
}
