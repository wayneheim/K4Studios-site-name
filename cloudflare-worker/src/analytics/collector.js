// Phase 1 Step 5 — Analytics Collector (Orchestration Boundary)
//
// This module is the SOLE analytics import for the worker.
// Worker → collector.js → { classifier.js, storage.js }
//
// The worker never directly imports from classifier.js or storage.js.
// All analytics operations flow through this single boundary.
//
// This creates the blast-radius firewall:
// - If classifier logic changes → only collector.js + classifier.js touched
// - If storage schema changes → only collector.js + storage.js touched
// - Worker call sites remain stable

import {
  calculateRiskScore,
  normalizeReferrer,
  isSearchBot,
  SEARCH_BOT_PATTERN
} from './classifier.js';

import { isSyntheticTraffic } from '../shared/index.js';

import {
  updateBotIntelligence as _updateBotIntelligence,
  logEdgeEvent as _logEdgeEvent,
  logArtView as _logArtView,
  logVerifiedBot as _logVerifiedBot,
  logRawEvent as _logRawEvent
} from './storage.js';

async function recoverExposureFromZoom(env, request, visitorId, imageId, sessionId) {
  try {
    if (!env?.DB) return;
    if (!visitorId || !imageId || !sessionId) return;

    const existing = await env.DB.prepare(`
      SELECT 1
      FROM classified_events
      WHERE visitor_id = ?
        AND target_id = ?
        AND event_type = 'chapter_exposure'
        AND session_id = ?
      LIMIT 1
    `).bind(visitorId, imageId, sessionId).first();

    if (existing) return;

    // Recovery write: confirms exposure occurred but proxy missed it (cache/race/etc.)
    await logArtView(env, 'chapter_exposure', imageId, request, sessionId, 'recovery', visitorId, null, null, 1, 'zoom');
  } catch (err) {
    console.error('Exposure recovery failed:', err?.message || err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS — stable API surface for the worker
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Classifiers (pure — no guard needed)
  calculateRiskScore,
  normalizeReferrer,
  isSearchBot,
  SEARCH_BOT_PATTERN
};

// ═══════════════════════════════════════════════════════════════════════════
// TIME BUDGET — Phase 2 Step 3 execution safety limit
// Prevents analytics from consuming excessive edge CPU under DB slowdown.
// Resolves silently on timeout — no rejection, no branching.
// ═══════════════════════════════════════════════════════════════════════════

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve =>
      setTimeout(() => resolve("timeout"), ms)
    )
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDED STORAGE WRITERS — Phase 2 Step 2 failure isolation
//
// Every storage function is wrapped so rejected promises inside
// ctx.waitUntil() never surface as unhandled-promise warnings.
// Zero logic changes — only try/catch containment at the boundary.
// ═══════════════════════════════════════════════════════════════════════════

export async function logEdgeEvent(...args) {
  try {
    return await withTimeout(_logEdgeEvent(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logEdgeEvent]:", err?.message || err);
  }
}

export async function logArtView(...args) {
  try {
    return await withTimeout(_logArtView(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logArtView]:", err?.message || err);
  }
}

export async function logRawEvent(...args) {
  try {
    // Raw event writes are the critical path for engagement tracking.
    // They already run under ctx.waitUntil(), so they won't block the response.
    // Do NOT time-box them here, otherwise we can silently drop writes during D1 latency.
    return await _logRawEvent(...args);
  } catch (err) {
    console.error("analytics failure [logRawEvent]:", err?.message || err);
  }
}

export async function logVerifiedBot(...args) {
  try {
    return await withTimeout(_logVerifiedBot(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logVerifiedBot]:", err?.message || err);
  }
}

export async function updateBotIntelligence(...args) {
  try {
    return await withTimeout(_updateBotIntelligence(...args), 1500);
  } catch (err) {
    console.error("analytics failure [updateBotIntelligence]:", err?.message || err);
  }
}

function readCookieValue(cookieHeader, name) {
  if (!cookieHeader || !name) return null;
  const re = new RegExp('(?:^|;\\s*)' + name.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&') + '=([^;]+)');
  const m = String(cookieHeader).match(re);
  return m ? m[1] : null;
}

function normalizeClientVisitorId(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > 128) return null;
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : null;
}

function makeSidSetCookieHeader(requestUrl, sessionId) {
  if (!sessionId) return null;

  let hostname = '';
  try {
    hostname = new URL(requestUrl).hostname || '';
  } catch (_) {
    hostname = '';
  }

  // Only set a cross-subdomain cookie on the real site.
  const domainAttr = hostname.endsWith('k4studios.com') ? '; Domain=.k4studios.com' : '';
  const value = encodeURIComponent(String(sessionId));
  return `k4_sid=${value}; Path=/; SameSite=Lax; Secure${domainAttr}`;
}

function makeVidSetCookieHeader(requestUrl, visitorId) {
  if (!visitorId) return null;
  let hostname = '';
  try {
    hostname = new URL(requestUrl).hostname || '';
  } catch (_) {
    hostname = '';
  }

  const domainAttr = hostname.endsWith('k4studios.com') ? '; Domain=.k4studios.com' : '';
  const value = encodeURIComponent(String(visitorId));
  // 1 year
  return `k4_vid=${value}; Path=/; Max-Age=31536000; SameSite=Lax; Secure${domainAttr}`;
}

function getAllowedOrigin(request) {
  const origin = request?.headers?.get?.('Origin') || null;
  if (!origin) return 'https://www.k4studios.com';
  try {
    const u = new URL(origin);
    if (u.hostname === 'www.k4studios.com' || u.hostname === 'k4studios.com') {
      return origin;
    }
  } catch (_) {
    // ignore
  }
  return 'https://www.k4studios.com';
}

function applyCors(headers, request, methods) {
  headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
  headers.set('Access-Control-Allow-Methods', methods);
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
  return headers;
}

function applyNoStore(headers) {
  headers.set('Cache-Control', 'no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  return headers;
}

// ═══════════════════════════════════════════════════════════════════════════
// /track ENDPOINT — Phase 5 extraction from monolith
// Identical logic, zero changes. Accepts POST with JSON body,
// writes to D1 events table, mirrors chapter_view/gallery_view to art_views.
// ═══════════════════════════════════════════════════════════════════════════

export async function handleTrackRequest(request, env, ctx) {
  // Only accept POST
  if (request.method !== "POST") {
    const headers = applyNoStore(new Headers({ 'Content-Type': 'text/plain' }));
    return new Response("Method not allowed", { status: 405, headers });
  }

  // Use shared ingestion gate - one function, all paths
  if (isSyntheticTraffic(request)) {
    const headers = applyNoStore(new Headers());
    return new Response(null, { status: 204, headers }); // Silent drop
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      // Avoid 500s for malformed client payloads.
      // Ad blockers, misconfigured beacons, or curl quoting issues can corrupt JSON.
      const headers = applyCors(new Headers({
        'Content-Type': 'text/plain'
      }), request, 'POST');
      applyNoStore(headers);
      return new Response('Invalid JSON', { status: 400, headers });
    }

    // Extract event data
    const {
      session_id = null,
      visitor_id = null,
      event = null,
      gallery_id = null,
      image_id = null,
      source_layer = null,
      page_type = null,
      theme = null,
      referrer: clientReferrer = null,
      page_path = null,
      event_ts_ms = null,  // Client timestamp for timing analysis
      event_order = null   // Event sequence within session
    } = body;

    const normalizedPagePath = (typeof page_path === 'string' && page_path)
      ? (page_path.startsWith('/') ? page_path : ('/' + page_path))
      : null;

    // Event is required
    if (!event) {
      const headers = applyNoStore(new Headers({ 'Content-Type': 'text/plain' }));
      return new Response("Missing event", { status: 400, headers });
    }

    // Reject events from legacy SmugMug paths (photoshoots, not K4 galleries)
    // These paths return 410 Gone per _redirects but JS may still fire on cached pages
    const legacyPaths = ['/Photoshootsandevents/', '/Photography-Galleries/', '/Scheduled-Shoots/', '/Is-Winter/'];
    if (normalizedPagePath && legacyPaths.some(p => normalizedPagePath.startsWith(p))) {
      return new Response(JSON.stringify({ ok: true, filtered: 'legacy_path' }), {
        status: 200,
        headers: applyNoStore(new Headers({ 'Content-Type': 'application/json' }))
      });
    }

    // Extract geo from Cloudflare
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;

    // Get client IP
    const ip = request.headers.get("CF-Connecting-IP") ||
               request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
               null;

    // Read edge-captured referrer from cookie (most reliable)
    // Cookie now stores raw URL (URL-encoded) for granular classification
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/k4_entry_ref=([^;]+)/);
    const edgeReferrer = cookieMatch
      ? decodeURIComponent(cookieMatch[1])
      : null;

    // Read visitor_id from k4_vid cookie (Single Population Doctrine)
    // If missing, mint it here (JS-verified by virtue of hitting /track).
    const vidCookie = readCookieValue(cookieHeader, 'k4_vid');
    const clientVisitorId = normalizeClientVisitorId(visitor_id);
    const existingVisitorId = vidCookie || clientVisitorId || null;
    const cryptoObj = globalThis?.crypto;
    const mintedVisitorId = (!existingVisitorId && typeof cryptoObj?.randomUUID === 'function')
      ? cryptoObj.randomUUID()
      : (!existingVisitorId ? (String(Date.now()) + '-' + Math.random().toString(16).slice(2)) : null);
    const visitorId = existingVisitorId || mintedVisitorId;

    // Session continuity: prefer the stable cookie value first, then body fallback.
    const sidCookie = readCookieValue(cookieHeader, 'k4_sid');
    const bodySessionId = (typeof session_id === 'string' && session_id.trim()) ? session_id.trim() : null;
    const bestSessionId = sidCookie || bodySessionId || null;

    // Store the raw edge referrer URL directly (for SQL LIKE matching)
    // normalizeReferrer is kept as fallback for old normalized cookie values
    const bestReferrer = edgeReferrer || clientReferrer;
    const referrer = bestReferrer || "unknown";

    // V2 Architecture: All events go directly to raw_events.
    // We still do special handling for key art events (target_id extraction + recovery),
    // but we ALSO log every /track event name so the Event Breakdown panel stays live.

    const normalizeGalleryTargetId = (path) => {
      if (typeof path !== 'string') return null;
      return path.replace(/^\/Galleries\//, '').replace(/^\/Other\//, '').replace(/\/$/, '');
    };

    const inferImageIdFromPath = (path) => {
      if (typeof path !== 'string') return null;
      return path.match(/\/(i-[a-zA-Z0-9_-]+)\/?$/)?.[1] || null;
    };

    const storedEventType = (event === 'zoom_open' || event === 'zoom') ? 'xl_zoom' : event;

    let targetId = null;
    if (storedEventType === 'page_view') {
      // Dashboard queries expect `page_view.target_id` to be the canonical page path.
      targetId = normalizedPagePath;
    } else if (storedEventType === 'chapter_view' || storedEventType === 'qualified_chapter_view') {
      targetId = image_id || inferImageIdFromPath(normalizedPagePath);
    } else if (storedEventType === 'xl_zoom') {
      targetId = image_id || inferImageIdFromPath(normalizedPagePath);
      if (event === 'xl_zoom' && targetId && bestSessionId && visitorId) {
        ctx?.waitUntil?.(recoverExposureFromZoom(env, request, visitorId, targetId, bestSessionId));
      }
    } else if (storedEventType === 'gallery_view') {
      targetId = gallery_id || normalizeGalleryTargetId(normalizedPagePath);
    } else if (storedEventType === 'theme_click') {
      // Persist the theme label so Top Themes Clicked can aggregate.
      targetId = theme || normalizedPagePath || null;
    } else {
      targetId = image_id || gallery_id || normalizedPagePath || null;
    }

    ctx?.waitUntil?.(logRawEvent(env, storedEventType, targetId, request, {
      sessionId: bestSessionId,
      source: 'js',
      visitorId,
      sourceLayer: (typeof source_layer === 'string' && source_layer) ? source_layer : null,
      // Use the client-reported page_path for easier SQL grouping.
      page: normalizedPagePath || null,
      // Preserve the best external referrer (edge cookie beats client hint).
      refererOverride: bestReferrer || null
    }));

    const sidSetCookie = makeSidSetCookieHeader(request.url, bestSessionId);
    const vidSetCookie = vidCookie ? null : makeVidSetCookieHeader(request.url, visitorId);

    const headers = applyCors(new Headers(), request, 'POST');

    applyNoStore(headers);

    if (sidSetCookie) headers.append('Set-Cookie', sidSetCookie);
    if (vidSetCookie) headers.append('Set-Cookie', vidSetCookie);

    return new Response(null, {
      status: 204,
      headers
    });

  } catch (err) {
    console.error("Track error:", err);
    const headers = applyNoStore(new Headers({ 'Content-Type': 'text/plain' }));
    return new Response("Error", { status: 500, headers });
  }
}

// Handle CORS preflight for /track
export function handleTrackOptions(request = null) {
  return new Response(null, {
    status: 204,
    headers: applyNoStore(applyCors(new Headers({
      "Access-Control-Max-Age": "86400"
    }), request, 'POST, OPTIONS'))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// /edge-event ENDPOINT — Phase 6 extraction from monolith
// Logs 301/410/404 events from Netlify edge functions.
// ═══════════════════════════════════════════════════════════════════════════

export async function handleEdgeEvent(request, env) {
  try {
    if (isSyntheticTraffic(request)) {
      return new Response('OK', { status: 200 });
    }

      let data;
      try {
        data = await request.json();
      } catch (e) {
        return new Response('Invalid JSON', {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST"
          }
        });
      }

    const rawType = data.event_type || data.eventType || '404';
    const eventType = String(rawType).trim() || '404';
    const path = data.path || data.page_path || null;
    const imageId = data.image_id || data.imageId || null;

    // V2: edge events are logged into raw_events (source='edge').
    // We intentionally do NOT persist is_bot here — bot classification happens via VIEWs.
      await logEdgeEvent(env, eventType, path || 'unknown', imageId, false, request, null);

    return new Response('OK', {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST"
      }
    });
  } catch (err) {
    console.error("Edge event error:", err);
      const url = new URL(request.url);
      const debug = url.searchParams.get('k4debug') === '1';
      return new Response(debug ? ("Error: " + (err?.message || String(err))) : "Error", { status: 500 });
  }
}

export function handleEdgeEventOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// /__k4track/event ENDPOINT — Phase 6 extraction from monolith
// Zoom clicks, slideshow starts — user intent tracking via logArtView.
// ═══════════════════════════════════════════════════════════════════════════

export async function handleTrackEvent(request, env, ctx) {
  if (!env?.DB) {
    return new Response('ok', { status: 200 });
  }

  if (isSyntheticTraffic(request)) {
    return new Response('ok', { status: 200 });
  }

  try {
    const body = await request.json();
    const { type, imageId, session_id = null, sessionId = null } = body;
    const cookieHeader = request.headers.get("cookie") || "";
    const sidCookie = readCookieValue(cookieHeader, 'k4_sid');
    const bodySessionId = (typeof session_id === 'string' && session_id.trim())
      ? session_id.trim()
      : ((typeof sessionId === 'string' && sessionId.trim()) ? sessionId.trim() : null);
    const bestSessionId = sidCookie || bodySessionId || null;

    // xl_zoom = user intent beacon (never image request)
    // Back-compat: accept legacy zoom events, but canonicalize immediately.
    const validTypes = ['xl_zoom', 'zoom_open', 'zoom', 'slideshow_start', 'chapter_view'];
    if (!type || !validTypes.includes(type)) {
      return new Response('ok', { status: 200 });
    }

    if (!imageId || !/^i-[a-zA-Z0-9_-]+$/.test(imageId)) {
      return new Response('ok', { status: 200 });
    }

    // Read visitor_id from k4_vid cookie
    const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
    const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;

    const canonicalType = (type === 'zoom_open' || type === 'zoom') ? 'xl_zoom' : type;

    if (canonicalType === 'xl_zoom' && bestSessionId && visitorId) {
      ctx.waitUntil(recoverExposureFromZoom(env, request, visitorId, imageId, bestSessionId));
    }

    ctx.waitUntil(logArtView(env, canonicalType, imageId, request, bestSessionId, 'js', visitorId));

    const sidSetCookie = makeSidSetCookieHeader(request.url, bestSessionId);
    return new Response('ok', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        ...(sidSetCookie ? { 'Set-Cookie': sidSetCookie } : {})
      }
    });
  } catch (e) {
    console.error('Track event error:', e);
    return new Response('ok', { status: 200 });
  }
}

