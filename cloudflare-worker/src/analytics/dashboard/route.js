// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD ROUTE HANDLER (Phase 4 — full request lifecycle for /__k4stats)
// Owns: auth check, query param parsing, filter building, controller call,
// Response construction. Worker delegates here with zero dashboard logic.
// ═══════════════════════════════════════════════════════════════════════════
import { hashIP } from '../../shared/index.js';
import { handleDashboardRequest as runDashboardController, handleDashboardSection as runDashboardSection } from './controller.js';

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
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  return auth === expected;
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

function buildEasternDayClause(column = 'ts', offsetDays = 0) {
  const offset = offsetDays === 0 ? '' : `, '${offsetDays} day'`;
  return `${column} >= datetime('now', '-5 hours', 'start of day'${offset}, '+5 hours') AND ${column} < datetime('now', '-5 hours', 'start of day'${offset}, '+1 day', '+5 hours')`;
}

function buildEasternDateClauseForLiteral(dateStr, column = 'ts') {
  return `${column} >= datetime('${dateStr} 05:00:00') AND ${column} < datetime('${dateStr} 05:00:00', '+1 day')`;
}

function buildEasternRangeClause(column = 'ts', backDays = 0) {
  return `${column} >= datetime('now', '-5 hours', 'start of day', '-${backDays} days', '+5 hours') AND ${column} < datetime('now', '-5 hours', 'start of day', '+1 day', '+5 hours')`;
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
  const section = url.searchParams.get('section');
  const refresh = url.searchParams.get('refresh') === '1';
  const galleryFilter = url.searchParams.get("gallery") || null;
  const excludeIp = url.searchParams.get("excludeIp") || null;
  const hideBots = url.searchParams.get("hideBots") === "1";
  const hideChardon = url.searchParams.get("hideChardon") === "1";

  // Get viewer's current IP for the "exclude me" button
  const viewerIp = getBestClientIP(request);

  try {
    // Build date filter as ET timestamp ranges (index-friendly; avoids date(ts, ...)).
    let rangeDateClause;
    if (yesterday) {
      // Yesterday = Eastern calendar day before today.
      rangeDateClause = buildEasternDayClause('ts', -1);
    } else if (days === 1) {
      // Today = current Eastern calendar day.
      rangeDateClause = buildEasternDayClause('ts', 0);
    } else {
      // Last N days (calendar days in Eastern time, inclusive of today).
      const n = Math.max(1, days);
      const backDays = Math.max(0, n - 1);
      rangeDateClause = buildEasternRangeClause('ts', backDays);
    }

    // Preserve the time-only clause (no global filters) so we can compute
    // "how many were hidden" when Hide Bots is enabled.
    const baseRangeDateClause = rangeDateClause;

    // Truth-only date clause: respects selectedDate / range, but ignores all UI filters.
    // Used for leaderboard-style panels that should not change based on presentation toggles.
    const truthDateClause = (selectedDate
      ? buildEasternDateClauseForLiteral(selectedDate, 'ts')
      : baseRangeDateClause);

    // Global filters must be baked into date/range clauses because many queries
    // only use dateClause and ignore ipClause/chardonClause.
    //
    // We keep two sets:
    // - globalPartsNoBots: context filters (excludeIp / hideChardon)
    // - globalPartsAll: context filters + Hide Bots (when enabled)
    const globalPartsNoBots = [];
    if (excludeIp) globalPartsNoBots.push(`(ip IS NULL OR ip != '${excludeIp}')`);

    const shallowSuspiciousIpSubquery = `
      SELECT DISTINCT raw.ip_hash
      FROM raw_events raw
      JOIN session_facts_v2 sf ON sf.session_id = raw.session_id
      WHERE raw.ip_hash IS NOT NULL
        AND raw.ip_hash != ''
        AND (
          COALESCE(sf.is_suspicious_internal_shallow, 0) = 1
          OR COALESCE(sf.is_suspicious_datacenter_shallow, 0) = 1
        )
    `;

    // If Hide Bots is enabled, we keep the actual predicate around for
    // "Filtered"/hidden counts in the dashboard.
    const hideBotsPredicate = hideBots
      ? `(
          -- Never hide the authenticated dashboard viewer by default.
          -- If you want to remove your own traffic, use "Exclude My IP".
          (${viewerIp ? `ip IS NOT NULL AND ip != '${viewerIp}' AND ` : ''}(
            ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%'
            OR city = 'Ashburn'
            OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
            OR ip_hash IN (
              SELECT ip_hash FROM suspected_bots
              WHERE status = 'blocked'
                 OR is_datacenter = 1
                 OR risk_level >= 4
            )
            OR ip_hash IN (${shallowSuspiciousIpSubquery})
          ))
        )`
      : '';

    if (hideChardon) {
      // Hide Team = hide Chardon + hide localhost dev referrers + hide the dashboard viewer's IP.
      // (Viewer IP exclusion keeps this working even when your ISP/VPN IP changes.)
      if (viewerIp) globalPartsNoBots.push(`(ip IS NULL OR ip != '${viewerIp}')`);
      globalPartsNoBots.push(`city != 'Chardon'`);
      globalPartsNoBots.push(`(referer IS NULL OR referer NOT LIKE '%localhost%')`);
    }

    const globalPartsAll = [...globalPartsNoBots];

    if (hideBots) {
      // Make Hide Bots apply globally (many panels only use dateClause/rangeDateClause).
      // Uses both legacy heuristics and behavioral bot intelligence (suspected_bots).
      globalPartsAll.push(`NOT ${hideBotsPredicate}`);
    }

    const globalFilterClause = globalPartsAll.length ? (' AND ' + globalPartsAll.join(' AND ')) : '';
    const globalFilterClauseNoBots = globalPartsNoBots.length ? (' AND ' + globalPartsNoBots.join(' AND ')) : '';

    rangeDateClause = `${rangeDateClause}${globalFilterClause}`;

    // If a specific Eastern calendar day is selected, render stats for that day
    // (but keep the trend chart using the current range).
    const baseDateClause = (selectedDate
      ? buildEasternDateClauseForLiteral(selectedDate, 'ts')
      : baseRangeDateClause) + globalFilterClauseNoBots;

    const dateClause = `${baseDateClause}${globalFilterClause}`;
    const galleryClause = galleryFilter ? `AND gallery_id = '${galleryFilter}'` : "";
    const ipClause = excludeIp ? `AND (ip IS NULL OR ip != '${excludeIp}')` : "";
    // Art views use ip_hash instead of raw IP (see hashIP())
    const excludeIpHash = (excludeIp && excludeIp !== 'unknown') ? hashIP(excludeIp) : null;
    const viewerIpHash = (viewerIp && viewerIp !== 'unknown') ? hashIP(viewerIp) : null;
    // Combined art_views filter: IP exclusion + datacenter bot IPs + Chardon/localhost (via ip_hash + referrer)
    const artIpParts = [];
    if (excludeIpHash && excludeIpHash !== 'unknown') artIpParts.push(`ip_hash != '${excludeIpHash}'`);
    if (hideBots) {
      // Hide bots for art-view panels:
      // - hard-coded datacenter/searchbot prefixes (legacy)
      // - active blocks
      // - behavioral suspects (timing/velocity/volume/no-branching) from suspected_bots
      // - low-confidence shallow sessions already identified by the v2 pipeline
      artIpParts.push(
        `NOT (
          ip_hash LIKE '3.%' OR ip_hash LIKE '17.%' OR ip_hash LIKE '18.%' OR ip_hash LIKE '40.77.%' OR ip_hash LIKE '52.%' OR ip_hash LIKE '54.%' OR ip_hash LIKE '65.55.%'
          OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
          OR ip_hash IN (
            SELECT ip_hash FROM suspected_bots
            WHERE status = 'blocked'
               OR is_datacenter = 1
               OR risk_level >= 4
          )
          OR ip_hash IN (${shallowSuspiciousIpSubquery})
        )`
      );
    }
    if (hideChardon && viewerIpHash && !excludeIpHash) artIpParts.push(`ip_hash != '${viewerIpHash}'`);
    if (hideChardon) artIpParts.push(`(referrer IS NULL OR referrer NOT LIKE '%localhost%')`);
    const artIpClause = artIpParts.length > 0 ? 'AND ' + artIpParts.join(' AND ') : '';
    // Bot filter: exclude legacy datacenter/searchbot ranges, active blocks,
    // high-risk suspected bots, and shallow low-confidence sessions from v2.
    const botClause = hideBots
      ? `AND NOT (
          ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%'
          OR city = 'Ashburn'
          OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
          OR ip_hash IN (
            SELECT ip_hash FROM suspected_bots
            WHERE status = 'blocked'
               OR is_datacenter = 1
               OR risk_level >= 4
          )
          OR ip_hash IN (${shallowSuspiciousIpSubquery})
        )`
      : "";
    // Chardon filter: exclude team member location
    const chardonClause = hideChardon ? `AND city != 'Chardon'` : "";

    // Build priorPeriodClause for getDashboardStats
    const priorPeriodClause = (selectedDate
      ? `ts < datetime('${selectedDate} 05:00:00')`
      : (yesterday
        ? `ts < datetime('now', '-5 hours', 'start of day', '-1 day', '+5 hours')`
        : (() => {
            const n = Math.max(1, days);
            const backDays = Math.max(0, n - 1);
            return `ts < datetime('now', '-5 hours', 'start of day', '-${backDays} days', '+5 hours')`;
          })()
      )) + globalFilterClause;

    // Pass the auth header to the renderer so admin JS calls can re-use it.
    // This is safe: this page is only served after successful authentication.
    const authHeader = request.headers.get('Authorization') || '';

    // Section-only request (lazy-load blocks)
    if (section) {
      const html = await runDashboardSection(env, {
        dateClause, galleryClause, ipClause, botClause, chardonClause,
        priorPeriodClause, rangeDateClause, artIpClause,
        baseDateClause, truthDateClause, hideBotsPredicate,
        yesterday, days, selectedDate, galleryFilter, excludeIp, viewerIp,
        hideBots, hideChardon, authHeader
      }, section, refresh);

      return new Response(html, {
        status: 200,
        headers: withAdminNoCacheHeaders({
          "Content-Type": "text/html; charset=utf-8"
        })
      });
    }

    // Call dashboard controller — orchestrates all queries + renders HTML
    const html = await runDashboardController(env, {
      dateClause, galleryClause, ipClause, botClause, chardonClause,
      priorPeriodClause, rangeDateClause, artIpClause,
      baseDateClause, truthDateClause, hideBotsPredicate,
      yesterday, days, selectedDate, galleryFilter, excludeIp, viewerIp,
      hideBots, hideChardon, authHeader
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
