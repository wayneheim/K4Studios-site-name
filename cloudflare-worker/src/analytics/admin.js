// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ADMIN API (Phase 6 — extracted from monolith)
// Handles /__k4stats sub-path endpoints:
//   /export       — CSV download of events
//   /block        — Block an IP (add to blocked_ips)
//   /unblock      — Unblock an IP (soft-delete)
//   /refresh-bots — Recalculate bot risk scores
// ═══════════════════════════════════════════════════════════════════════════
import { updateBotIntelligence } from './storage.js';

// --------------------
// Shared helpers
// --------------------
const PROTECTED_CRAWLER_PATTERN =
  /(googlebot|googlebot-image|google-inspectiontool|adsbot-google|googleother|apis-google|bingbot|bingpreview|msnbot|bingimagesbot|adidxbot|duckduckbot|applebot|yandex|baiduspider|slurp)/i;

function withAdminNoCacheHeaders(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Vary", "Authorization");
  return headers;
}

function checkAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  return authHeader === expected;
}

function clampInt(value, { min, max, fallback }) {
  const n = parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function isProtectedCrawlerRow(row) {
  if (!row) return false;
  if (Number(row.is_verified_bot || 0) === 1) return true;
  return PROTECTED_CRAWLER_PATTERN.test(String(row.bot_name || ''));
}

async function getBlockSafetyInfo(env, ipHash) {
  const row = await env.DB.prepare(`
    SELECT risk_level, risk_score, rules_triggered, total_requests, is_verified_bot, bot_name
    FROM suspected_bots WHERE ip_hash = ?
  `).bind(ipHash).first();

  if (isProtectedCrawlerRow(row)) {
    return { row, protected: true, reason: 'protected_search_crawler' };
  }

  const recentUa = await env.DB.prepare(`
    SELECT ua
    FROM raw_events
    WHERE ip_hash = ?
      AND ua IS NOT NULL
      AND ua != ''
    ORDER BY ts DESC
    LIMIT 20
  `).bind(ipHash).all();

  const matchedUa = (recentUa?.results || []).find(r => PROTECTED_CRAWLER_PATTERN.test(String(r.ua || '')));
  if (matchedUa) {
    return { row, protected: true, reason: 'protected_search_crawler_ua', ua: matchedUa.ua };
  }

  return { row, protected: false };
}

// --------------------
// CSV Export
// --------------------
export async function handleExportCSV(request, env) {
  if (!checkAuth(request, env)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: withAdminNoCacheHeaders({
        "WWW-Authenticate": 'Basic realm="K4 Analytics Export"',
        "Content-Type": "text/plain"
      })
    });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);
  const yesterday = url.searchParams.get("yesterday") === "1";

  try {
    let dateClause;
    if (yesterday) {
      dateClause = `ts >= datetime('now', '-5 hours', '-1 day', 'start of day') AND ts < datetime('now', '-5 hours', 'start of day')`;
    } else {
      dateClause = `ts > datetime('now', '-5 hours', '-${days} days')`;
    }

    const query = `
      SELECT 
        ts, session_id, event_type, target_id,
        page, referer, ua, country, region, city, visitor_id,
        source_layer, trigger
      FROM raw_events 
      WHERE ${dateClause}
      ORDER BY ts DESC
    `;
    const results = await env.DB.prepare(query).all();
    const rows = results.results || [];

    const headers = ['ts', 'session_id', 'event_type', 'target_id', 'page', 'referer', 'ua', 'country', 'region', 'city', 'visitor_id', 'source_layer', 'trigger'];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map(h => {
        const val = row[h] || '';
        const escaped = String(val).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');
    const filename = `k4-analytics-${yesterday ? 'yesterday' : days + 'days'}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: withAdminNoCacheHeaders({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      })
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(`Export error: ${err.message}`, {
      status: 500,
      headers: withAdminNoCacheHeaders({ "Content-Type": "text/plain; charset=utf-8" })
    });
  }
}

// --------------------
// Block IP
// --------------------
export async function handleBlockIP(request, env) {
  try {
    const { ip_hash, reason } = await request.json();

    if (!ip_hash) {
      return new Response(JSON.stringify({ error: 'ip_hash required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const safety = await getBlockSafetyInfo(env, ip_hash);
    if (safety.protected) {
      return new Response(JSON.stringify({
        error: safety.reason,
        ip_hash,
        bot_name: safety.row?.bot_name || null
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const suspectInfo = safety.row;

    await env.DB.prepare(`
      INSERT INTO blocked_ips (ip_hash, risk_level, risk_score, rules_triggered, total_requests, reason, blocked_by)
      VALUES (?, ?, ?, ?, ?, ?, 'manual')
      ON CONFLICT(ip_hash) DO UPDATE SET
        is_active = 1,
        blocked_at = datetime('now'),
        reason = excluded.reason,
        unblocked_at = NULL
    `).bind(
      ip_hash,
      suspectInfo?.risk_level || 4,
      suspectInfo?.risk_score || 0,
      suspectInfo?.rules_triggered || '[]',
      suspectInfo?.total_requests || 0,
      reason || 'Manual block from dashboard'
    ).run();

    await env.DB.prepare(`
      UPDATE suspected_bots SET status = 'blocked', updated_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();

    return new Response(JSON.stringify({ success: true, ip_hash }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Block IP error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --------------------
// Unblock IP
// --------------------
export async function handleUnblockIP(request, env) {
  try {
    const { ip_hash } = await request.json();

    if (!ip_hash) {
      return new Response(JSON.stringify({ error: 'ip_hash required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(`
      UPDATE blocked_ips 
      SET is_active = 0, unblocked_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();

    await env.DB.prepare(`
      UPDATE suspected_bots SET status = 'watching', updated_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();

    return new Response(JSON.stringify({ success: true, ip_hash }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Unblock IP error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --------------------
// Refresh Bot Intelligence
// --------------------
export async function handleRefreshBots(request, env) {
  try {
    const count = await updateBotIntelligence(env);
    return new Response(JSON.stringify({ success: true, updated: count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Refresh bots error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --------------------
// Recent Events (debug)
// --------------------
// Auth required. Intended for quickly verifying ingestion + writes.
// GET /__k4stats/recent?minutes=180&limit=100&event=guide_open
export async function handleRecentEvents(request, env) {
  if (!checkAuth(request, env)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: withAdminNoCacheHeaders({
        "WWW-Authenticate": 'Basic realm="K4 Analytics Recent"',
        "Content-Type": "text/plain"
      })
    });
  }

  if (!env?.DB) {
    return new Response(JSON.stringify({ ok: false, error: 'DB not bound' }), {
      status: 500,
      headers: withAdminNoCacheHeaders({ 'Content-Type': 'application/json' })
    });
  }

  const url = new URL(request.url);
  const minutes = clampInt(url.searchParams.get('minutes'), { min: 1, max: 60 * 24 * 14, fallback: 180 }); // up to 14 days
  const limit = clampInt(url.searchParams.get('limit'), { min: 1, max: 500, fallback: 100 });
  const includeUa = url.searchParams.get('ua') === '1';

  const eventType = (url.searchParams.get('event') || '').trim() || null;
  const visitorId = (url.searchParams.get('visitor') || '').trim() || null;
  const sessionId = (url.searchParams.get('session') || '').trim() || null;
  const source = (url.searchParams.get('source') || '').trim() || null;

  const where = [`ts > datetime('now', '-5 hours', '-${minutes} minutes')`];
  const bindings = [];

  if (eventType) {
    where.push('event_type = ?');
    bindings.push(eventType);
  }
  if (visitorId) {
    where.push('visitor_id = ?');
    bindings.push(visitorId);
  }
  if (sessionId) {
    where.push('session_id = ?');
    bindings.push(sessionId);
  }
  if (source) {
    where.push('source = ?');
    bindings.push(source);
  }

  try {
    const uaSelect = includeUa ? ', r.ua' : '';
    const query = `
      SELECT
        r.ts,
        r.event_type,
        r.target_id,
        r.page,
        r.source,
        r.session_id,
        r.visitor_id,
        r.ip_hash,
        r.country,
        r.region,
        r.city
        ${uaSelect},
        r.cf_asn,
        COALESCE(r.is_bot, 0) as is_bot,
        COALESCE(sb.risk_level, 0) as bot_risk_level,
        sb.status as bot_status,
        COALESCE(sb.is_datacenter, 0) as bot_is_datacenter,
        COALESCE(sb.is_verified_bot, 0) as bot_is_verified_bot,
        CASE WHEN bi.ip_hash IS NOT NULL AND bi.is_active = 1 THEN 1 ELSE 0 END as is_blocked
      FROM classified_events r
      LEFT JOIN suspected_bots sb ON sb.ip_hash = r.ip_hash
      LEFT JOIN blocked_ips bi ON bi.ip_hash = r.ip_hash
      WHERE ${where.join(' AND ').replace(/\bevent_type\b/g, 'r.event_type').replace(/\bvisitor_id\b/g, 'r.visitor_id').replace(/\bsession_id\b/g, 'r.session_id').replace(/\bsource\b/g, 'r.source')}
      ORDER BY r.ts DESC
      LIMIT ${limit}
    `;

    const result = await env.DB.prepare(query).bind(...bindings).all();
    const rows = result.results || [];

    return new Response(JSON.stringify({
      ok: true,
      minutes,
      limit,
      filters: { eventType, visitorId, sessionId, source },
      includeUa,
      rows
    }), {
      status: 200,
      headers: withAdminNoCacheHeaders({ 'Content-Type': 'application/json' })
    });
  } catch (e) {
    console.error('Recent events error:', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: withAdminNoCacheHeaders({ 'Content-Type': 'application/json' })
    });
  }
}
