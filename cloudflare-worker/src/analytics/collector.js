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
  logVerifiedBot as _logVerifiedBot
} from './storage.js';

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
//
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

// ═══════════════════════════════════════════════════════════════════════════
// /track ENDPOINT — Phase 5 extraction from monolith
// Identical logic, zero changes. Accepts POST with JSON body,
// writes to D1 events table, mirrors chapter_view/gallery_view to art_views.
// ═══════════════════════════════════════════════════════════════════════════

export async function handleTrackRequest(request, env, ctx) {
  // Only accept POST
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Use shared ingestion gate - one function, all paths
  if (isSyntheticTraffic(request)) {
    return new Response(null, { status: 204 }); // Silent drop
  }

  try {
    const body = await request.json();

    // Extract event data
    const {
      session_id = null,
      event = null,
      gallery_id = null,
      image_id = null,
      page_type = null,
      theme = null,
      referrer: clientReferrer = null,
      page_path = null,
      event_ts_ms = null,  // Client timestamp for timing analysis
      event_order = null   // Event sequence within session
    } = body;

    // Event is required
    if (!event) {
      return new Response("Missing event", { status: 400 });
    }

    // Reject events from legacy SmugMug paths (photoshoots, not K4 galleries)
    // These paths return 410 Gone per _redirects but JS may still fire on cached pages
    const legacyPaths = ['/Photoshootsandevents/', '/Photography-Galleries/', '/Scheduled-Shoots/', '/Is-Winter/'];
    if (page_path && legacyPaths.some(p => page_path.startsWith(p))) {
      return new Response(JSON.stringify({ ok: true, filtered: 'legacy_path' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
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
    const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
    const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;

    // Store the raw edge referrer URL directly (for SQL LIKE matching)
    // normalizeReferrer is kept as fallback for old normalized cookie values
    const bestReferrer = edgeReferrer || clientReferrer;
    const referrer = bestReferrer || "unknown";

    // V2 Architecture: All events go directly to raw_events via logArtView
    // (Legacy 'events' table no longer exists)
    
    // JS-verified chapter views
    if (event === 'chapter_view') {
      const targetId = image_id || (typeof page_path === 'string'
        ? (page_path.match(/\/(i-[a-zA-Z0-9_-]+)\/?$/)?.[1] || null)
        : null);
      if (targetId) {
        ctx.waitUntil(logArtView(env, 'chapter_view', targetId, request, session_id, 'js', visitorId));
      }
    }

    // xl_zoom = user intent beacon (never image request)
    // Back-compat: legacy clients may emit zoom_open/zoom via /track
    if (event === 'xl_zoom' || event === 'zoom_open' || event === 'zoom') {
      const targetId = image_id || (typeof page_path === 'string'
        ? (page_path.match(/\/(i-[a-zA-Z0-9_-]+)\/?$/)?.[1] || null)
        : null);
      if (targetId) {
        ctx.waitUntil(logArtView(env, 'xl_zoom', targetId, request, session_id, 'js', visitorId));
      }
    }

    // JS-verified gallery views
    if (event === 'gallery_view') {
      const targetId = gallery_id || (typeof page_path === 'string'
        ? page_path.replace(/^\/Galleries\//, '').replace(/^\/Other\//, '').replace(/\/$/, '')
        : null);
      if (targetId) {
        ctx.waitUntil(logArtView(env, 'gallery_view', targetId, request, session_id, 'js', visitorId));
      }
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "https://www.k4studios.com",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });

  } catch (err) {
    console.error("Track error:", err);
    return new Response("Error", { status: 500 });
  }
}

// Handle CORS preflight for /track
export function handleTrackOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://www.k4studios.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
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

    const data = await request.json();

    const eventType = data.event_type || data.eventType || '404';
    const path = data.path || data.page_path || null;
    const imageId = data.image_id || data.imageId || null;
    const isBot = data.is_bot || data.isBot ? 1 : 0;
    const referrer = data.referrer || null;
    const country = data.country || request.cf?.country || null;

    await env.DB.prepare(`
      INSERT INTO edge_events (event_type, path, image_id, is_bot, referrer, country)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(eventType, path, imageId, isBot, referrer, country).run();

    return new Response('OK', {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST"
      }
    });
  } catch (err) {
    console.error("Edge event error:", err);
    return new Response("Error", { status: 500 });
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
    const { type, imageId } = body;

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
    const cookieHeader = request.headers.get("cookie") || "";
    const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
    const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;

    const canonicalType = (type === 'zoom_open' || type === 'zoom') ? 'xl_zoom' : type;
    ctx.waitUntil(logArtView(env, canonicalType, imageId, request, null, 'js', visitorId));

    return new Response('ok', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    console.error('Track event error:', e);
    return new Response('ok', { status: 200 });
  }
}

