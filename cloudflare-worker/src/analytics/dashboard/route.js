// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD ROUTE HANDLER (Phase 4 — full request lifecycle for /__k4stats)
// Owns: auth check, query param parsing, filter building, controller call,
// Response construction. Worker delegates here with zero dashboard logic.
// ═══════════════════════════════════════════════════════════════════════════
import { hashIP } from '../../shared/index.js';
import { handleDashboardRequest as runDashboardController } from './controller.js';

function withAdminNoCacheHeaders(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  // Ensure any intermediary cache varies by credentials.
  headers.set("Vary", "Authorization");
  return headers;
}

function checkBasicAuth(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Basic ")) return false;

  const encoded = auth.slice(6);
  const decoded = atob(encoded);
  const [user, pass] = decoded.split(":");

  // Compare against secrets (set via wrangler secret put)
  return user === (env.ADMIN_USER || "admin") && pass === env.ADMIN_PASS;
}

function requireAuth() {
  return new Response("Unauthorized", {
    status: 401,
    headers: withAdminNoCacheHeaders({
      "WWW-Authenticate": 'Basic realm="K4 Analytics"',
      "Content-Type": "text/plain"
    })
  });
}

function getBestClientIP(request) {
  const cfIp = request.headers.get("CF-Connecting-IP") || null;
  const xff = request.headers.get("X-Forwarded-For") || null;

  const isIPv4 = (ip) => typeof ip === 'string' && ip.includes('.') && !ip.includes(':');

  if (isIPv4(cfIp)) return cfIp;

  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean);
    const firstIPv4 = parts.find(isIPv4);
    if (firstIPv4) return firstIPv4;
    if (parts.length > 0) return parts[0];
  }

  return cfIp;
}

export async function handleDashboardRequest(request, env, ctx) {
  // Check auth
  if (!checkBasicAuth(request, env)) {
    return requireAuth();
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "1", 10);
  const yesterday = url.searchParams.get("yesterday") === "1";
  const selectedDateRaw = url.searchParams.get("date");
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDateRaw || "") ? selectedDateRaw : null;
  const galleryFilter = url.searchParams.get("gallery") || null;
  const excludeIp = url.searchParams.get("excludeIp") || null;
  const hideBots = url.searchParams.get("hideBots") === "1";
  const hideChardon = url.searchParams.get("hideChardon") === "1";

  // Get viewer's current IP for the "exclude me" button
  const viewerIp = getBestClientIP(request);

  try {
    // Build date filter (adjusted for Eastern Time, UTC-5)
    // Use date() comparison for calendar day matching in Eastern time
    let rangeDateClause;
    if (yesterday) {
      // Yesterday = Eastern calendar day before today
      rangeDateClause = `date(created_at, '-5 hours') = date('now', '-5 hours', '-1 day')`;
    } else if (days === 1) {
      // Today = current Eastern calendar day
      rangeDateClause = `date(created_at, '-5 hours') = date('now', '-5 hours')`;
    } else {
      // Last N days (rolling window from now)
      rangeDateClause = `created_at > datetime('now', '-5 hours', '-${days} days')`;
    }

    // If a specific Eastern calendar day is selected, render stats for that day
    // (but keep the trend chart using the current range).
    const dateClause = selectedDate
      ? `date(created_at, '-5 hours') = '${selectedDate}'`
      : rangeDateClause;
    const galleryClause = galleryFilter ? `AND gallery_id = '${galleryFilter}'` : "";
    const ipClause = excludeIp ? `AND (ip IS NULL OR ip != '${excludeIp}')` : "";
    // Art views use ip_hash instead of raw IP (see hashIP())
    const excludeIpHash = (excludeIp && excludeIp !== 'unknown') ? hashIP(excludeIp) : null;
    const viewerIpHash = (viewerIp && viewerIp !== 'unknown') ? hashIP(viewerIp) : null;
    // Combined art_views filter: IP exclusion + datacenter bot IPs + Chardon/localhost (via ip_hash + referrer)
    const artIpParts = [];
    if (excludeIpHash && excludeIpHash !== 'unknown') artIpParts.push(`ip_hash != '${excludeIpHash}'`);
    if (hideBots) artIpParts.push(`NOT (ip_hash LIKE '3.%' OR ip_hash LIKE '17.%' OR ip_hash LIKE '18.%' OR ip_hash LIKE '40.77.%' OR ip_hash LIKE '52.%' OR ip_hash LIKE '54.%' OR ip_hash LIKE '65.55.%')`);
    if (hideChardon && viewerIpHash && !excludeIpHash) artIpParts.push(`ip_hash != '${viewerIpHash}'`);
    if (hideChardon) artIpParts.push(`(referrer IS NULL OR referrer NOT LIKE '%localhost%')`);
    const artIpClause = artIpParts.length > 0 ? 'AND ' + artIpParts.join(' AND ') : '';
    // Bot filter: exclude AWS, Apple crawler (17.x), Microsoft/Bing (40.77.x, 65.55.x), Ashburn datacenter
    const botClause = hideBots ? `AND NOT (ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%' OR city = 'Ashburn' OR device = 'unknown')` : "";
    // Chardon filter: exclude team member location
    const chardonClause = hideChardon ? `AND city != 'Chardon'` : "";

    // Build priorPeriodClause for getDashboardStats
    const priorPeriodClause = selectedDate
      ? `date(created_at, '-5 hours') < '${selectedDate}'`
      : (yesterday 
        ? `created_at < datetime('now', '-5 hours', '-1 day', 'start of day')`
        : `created_at < datetime('now', '-5 hours', '-${days} days')`
      );

    // Call dashboard controller — orchestrates all queries + renders HTML
    const html = await runDashboardController(env, {
      dateClause, galleryClause, ipClause, botClause, chardonClause,
      priorPeriodClause, rangeDateClause, artIpClause,
      yesterday, days, selectedDate, galleryFilter, excludeIp, viewerIp,
      hideBots, hideChardon
    });

    return new Response(html, {
      status: 200,
      headers: withAdminNoCacheHeaders({
        "Content-Type": "text/html; charset=utf-8"
      })
    });

  } catch (err) {
    console.error("Admin analytics error:", err);
    return new Response(`Error: ${err.message}`,
      {
        status: 500,
        headers: withAdminNoCacheHeaders({ "Content-Type": "text/plain; charset=utf-8" })
      }
    );
  }
}
