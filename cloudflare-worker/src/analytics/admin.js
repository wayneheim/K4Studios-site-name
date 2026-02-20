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
        page, referer, ua, country, region, city, visitor_id
      FROM raw_events 
      WHERE ${dateClause}
      ORDER BY ts DESC
    `;
    const results = await env.DB.prepare(query).all();
    const rows = results.results || [];

    const headers = ['ts', 'session_id', 'event_type', 'target_id', 'page', 'referer', 'ua', 'country', 'region', 'city', 'visitor_id'];
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

    const suspectInfo = await env.DB.prepare(`
      SELECT risk_level, risk_score, rules_triggered, total_requests 
      FROM suspected_bots WHERE ip_hash = ?
    `).bind(ip_hash).first();

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
