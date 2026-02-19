/**
 * K4 Studios Image Proxy + Gateway + Image Page Policy Worker
 *
 * NOTE:
 * This worker is SEO-critical infrastructure.
 * Do not introduce UA-based behavior or refactor without review.
 * Same URL must always return same bytes.
 *
 * Canonical invariants:
 * 1) /img/{id}/{size} MUST be deterministic: same URL = same bytes (no UA-based sizing).
 * 2) Bots may influence indexing ONLY via status codes on IMAGE PAGES (~301/410), never image bytes.
 * 3) Never redirect to SmugMug. Never leak origin URLs.
 *
 * Responsibilities:
 * - /img/{id}/{size} - proxy image bytes from SmugMug using image-manifest.json
 * - Image pages (/Galleries/, /Other/) - canonicalization + 410 policy
 * - Gateway layer - country block (HTML only), scraper UA block (HTML only)
 * - /track - analytics event ingestion (POST)
 * - /admin/analytics - password-protected analytics dashboard
 */

// ═══════════════════════════════════════════════════════════════════════════
// SHARED MODULES (Phase 1 extraction)
// ═══════════════════════════════════════════════════════════════════════════
import {
  ALLOWED_BOTS,
  BLOCKED_BOTS,
  BLOCKED_IP_PREFIXES,
  DATACENTER_PREFIXES,
  VERIFIED_BOTS,
  DATACENTER_CITIES,
  DATACENTER_ASNS,
  hashIP,
  classifyUA,
  isBlockedIP,
  isDatacenterIP,
  getVerifiedBotName,
  isVerifiedSearchBot,
  getGeoFromRequest,
  detectDevice,
  isSyntheticTraffic
} from './src/shared/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS COLLECTOR (Phase 1 Step 5 — single orchestration boundary)
// Worker never imports from classifier.js or storage.js directly.
// ═══════════════════════════════════════════════════════════════════════════
import {
  isSearchBot,
  logEdgeEvent,
  logArtView,
  logVerifiedBot,
  updateBotIntelligence
} from './src/analytics/collector.js';

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD CONTROLLER (Phase 4 — orchestrates all dashboard queries)
// ═══════════════════════════════════════════════════════════════════════════
import { handleDashboardRequest } from './src/analytics/dashboard/controller.js';

const MANIFEST_URL = "https://k4studios.com/image-manifest.json";
const IMAGE_ID_MAP_URL = "https://k4studios.com/imageIdMap.json";
const MANIFEST_CACHE_TTL = 3600; // seconds

// --------------------
// SIZE FALLBACK CHAINS
// --------------------
const SIZE_FALLBACK = {
  xl: ["xl", "l", "m", "s", "src"],
  l:  ["l", "m", "s", "xl", "src"],
  m:  ["m", "s", "l", "src"],
  // Never fall back to XL for grid thumbnails
  s:  ["s", "m", "src"],
  src:["src", "s", "m", "l", "xl"]
};

// NOTE: calculateRiskScore now imported from ./src/analytics/classifier.js
// NOTE: updateBotIntelligence now imported from ./src/analytics/storage.js

// getThrottleDelay REMOVED — risk scoring is label-only, never changes request behavior.
// Throttling/blocking is manual-only via dashboard. See Hank's directive:
// "Risk score should NEVER change request behavior automatically. It should only label."

/**
 * In-memory cache for blocked IPs.
 * Loaded once from D1, refreshed every 60s or on block/unblock.
 * Avoids 1 D1 query per /img/ request (—30 images/page = massive savings).
 */
let blockedIpCache = new Set();
let blockedIpCacheTime = 0;
const BLOCKED_IP_CACHE_TTL = 60_000; // 60 seconds

async function loadBlockedIps(env) {
  if (!env?.DB) return;
  const now = Date.now();
  if (now - blockedIpCacheTime < BLOCKED_IP_CACHE_TTL) return;
  try {
    const rows = await env.DB.prepare(
      'SELECT ip_hash FROM blocked_ips WHERE is_active = 1'
    ).all();
    blockedIpCache = new Set((rows.results || []).map(r => r.ip_hash));
    blockedIpCacheTime = now;
  } catch (e) {
    console.error('Load blocked IPs error:', e);
    // Keep stale cache rather than clearing
  }
}

function invalidateBlockedIpCache() {
  blockedIpCacheTime = 0;
}

/**
 * Check if IP is blocked — uses in-memory Set (loaded from D1 every 60s).
 * Zero D1 cost for the vast majority of /img/ requests.
 */
async function isIPBlocked(env, ipHash) {
  if (!env?.DB) return false;
  await loadBlockedIps(env);
  return blockedIpCache.has(ipHash);
}

const ALWAYS_ALLOWED = [
  "/sitemap.xml",
  "/robots.txt",
  "/e05ffc8ff8004372b01c0e153ba16b44.txt" // IndexNow key
];

// NOTE: SEARCH_BOT_PATTERN now imported from ./src/analytics/classifier.js

// --------------------
// EDGE + IN-MEM JSON CACHES
// --------------------
let manifestCache = null;
let manifestCacheTime = 0;

let imageIdMapCache = null;
let imageIdMapCacheTime = 0;

async function fetchJSONWithCache(ctx, url, memGet, memSet) {
  const now = Date.now();

  // in-memory cache
  const mem = memGet();
  if (mem.data && now - mem.time < MANIFEST_CACHE_TTL * 1000) {
    return mem.data;
  }

  // edge cache
  const cache = caches.default;
  const cacheKey = new Request(url);
  let response = await cache.match(cacheKey);

  if (!response) {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "K4-Image-Proxy-Worker/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`JSON fetch failed (${url}): ${response.status}`);
    }

    const responseToCache = new Response(response.clone().body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${MANIFEST_CACHE_TTL}`
      }
    });

    ctx.waitUntil(cache.put(cacheKey, responseToCache));
  }

  const json = await response.json();
  memSet(json, now);
  return json;
}

function getManifest(ctx) {
  return fetchJSONWithCache(
    ctx,
    MANIFEST_URL,
    () => ({ data: manifestCache, time: manifestCacheTime }),
    (data, time) => { manifestCache = data; manifestCacheTime = time; }
  );
}

function getImageIdMap(ctx) {
  return fetchJSONWithCache(
    ctx,
    IMAGE_ID_MAP_URL,
    () => ({ data: imageIdMapCache, time: imageIdMapCacheTime }),
    (data, time) => { imageIdMapCache = data; imageIdMapCacheTime = time; }
  );
}

// --------------------
// /img ROUTE RESOLUTION
// --------------------
function parseImageRoute(pathname) {
  // allow optional trailing slash
  const match = pathname.match(/^\/img\/(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)\/?$/);
  if (!match) return null;
  return { imageId: match[1], size: match[2] };
}

function resolveImageUrl(manifest, imageId, requestedSize) {
  const imageData = manifest[imageId];
  if (!imageData) return null;

  const fallbackChain = SIZE_FALLBACK[requestedSize] || SIZE_FALLBACK.m;
  for (const size of fallbackChain) {
    if (imageData[size]) return imageData[size];
  }
  return null;
}

async function proxyImage(smugMugUrl, request) {
  const imageResponse = await fetch(smugMugUrl, {
    headers: {
      Accept: request.headers.get("Accept") || "image/*",
      "User-Agent": "K4-Image-Proxy-Worker/1.0",
      ...(request.headers.get("Referer") && { Referer: request.headers.get("Referer") })
    },
    // Cache at CF edge for 1 year regardless of SmugMug's cache headers
    cf: {
      cacheTtl: 31536000,       // 1 year in seconds (matches browser Cache-Control)
      cacheEverything: true     // Cache even with SmugMug's private/no-cache headers
    }
  });

  if (!imageResponse.ok) {
    return new Response("Image not found", {
      status: imageResponse.status,
      headers: { "Cache-Control": "no-store" }
    });
  }

  // IMPORTANT: No UA-based behavior here. Same URL => same bytes.
  const headers = {
    "Content-Type": imageResponse.headers.get("Content-Type") || "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Proxy-Origin": "k4studios"
  };

  // Note: we intentionally do NOT add X-Robots-Tag on XL,
  // because it can create confusing caching/indexing behavior.
  // Index control should happen at page level, not on image bytes.

  return new Response(imageResponse.body, { status: 200, headers });
}

// --------------------
// GHOST IMAGE FALLBACK
// --------------------
// i-k4studios is a placeholder/ghost image in every gallery database.
// It's used for state management but should never display.
// Return a 1x1 transparent pixel instead of 404.
const GHOST_IMAGE_ID = "i-k4studios";
const TRANSPARENT_PIXEL_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
  0x01, 0x00, 0x01, 0x00, // 1x1
  0x80, 0x00, 0x00, // Global color table flag
  0xff, 0xff, 0xff, // White
  0x00, 0x00, 0x00, // Black (transparent)
  0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, // Graphic control extension (transparency)
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // Image descriptor
  0x02, 0x02, 0x44, 0x01, 0x00, // Image data
  0x3b // GIF trailer
]);

async function handleImageRequest(request, ctx, env) {
  const url = new URL(request.url);
  const route = parseImageRoute(url.pathname);

  if (!route) {
    return new Response("Invalid image route", {
      status: 400,
      headers: { "Cache-Control": "no-store" }
    });
  }

  // Ghost image fallback - return transparent pixel instead of 404
  if (route.imageId === GHOST_IMAGE_ID) {
    return new Response(TRANSPARENT_PIXEL_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Ghost-Image": "true"
      }
    });
  }

  // Check for dynamically blocked IPs (from blocked_ips table)
  // NOTE: Throttle delay removed — it was adding 500ms+ to every image and
  // the 2 D1 queries per /img request (—30 images/page = 60 queries) was
  // adding latency for ALL visitors including search engine crawlers.
  // Blocking is hardcoded in BLOCKED_IP_PREFIXES for confirmed bad actors.
  // The blocked_ips table check is kept for manual emergency blocks only.
  const ip = request.headers.get("CF-Connecting-IP") || 
             request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  const ipHash = hashIP(ip);
  
  if (env?.DB && ipHash) {
    try {
      const isBlocked = await isIPBlocked(env, ipHash);
      if (isBlocked) {
        // Return 403 for blocked IPs - they get nothing
        return new Response("Blocked", {
          status: 403,
          headers: { "Cache-Control": "no-store" }
        });
      }
    } catch (e) {
      // Fail open - don't break images on DB errors
      console.error('Bot check error:', e);
    }
  }

  try {
    const manifest = await getManifest(ctx);
    const smugMugUrl = resolveImageUrl(manifest, route.imageId, route.size);

    if (!smugMugUrl) {
      return new Response("Image not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" }
      });
    }

    // Log art views by size:
    // XL = tracked via /__k4track/event beacon (user clicks), not image loads
    // L = external embeds ONLY (Google Images, Bing, Pinterest, FB, etc.)
    //     Skip L tracking for on-site traffic (k4studios referrer) to avoid inflated counts
    if (env?.DB) {
      // XL logging removed - now tracked via event beacon on zoom/slideshow click
      if (false) { // xl_zoom disabled - keeping code for reference
        ctx.waitUntil(logArtView(env, 'xl_zoom', route.imageId, request));
      } else if (route.size === 'l') {
        const referer = request.headers.get('Referer') || '';
        // Only log L-size as external_image if NOT from k4studios or localhost (true external embed)
        if (!referer.includes('k4studios.com') && !referer.includes('localhost')) {
          ctx.waitUntil(logArtView(env, 'external_image', route.imageId, request));
        }
      }
      
      // Track verified search bots by User-Agent (free plan doesn't have botManagement)
      const ua = request.headers.get("User-Agent") || '';
      if (isVerifiedSearchBot(ua)) {
        ctx.waitUntil(logVerifiedBot(env, route.imageId, request));
      }
    }

    return proxyImage(smugMugUrl, request);
  } catch (err) {
    console.error("Image proxy error:", err);
    return new Response("Internal error", {
      status: 500,
      headers: { "Cache-Control": "no-store" }
    });
  }
}

// --------------------
// IMAGE PAGE POLICY
// --------------------
function isImagePageRoute(pathname) {
  return /\/(Galleries|Other)\/.*\/i-[a-zA-Z0-9-]+\/?$/.test(pathname);
}

function extractImageId(pathname) {
  const match = pathname.match(/(i-[a-zA-Z0-9-]+)\/?$/);
  return match ? match[1] : null;
}

function getParentGallery(pathname) {
  return pathname.replace(/\/i-[a-zA-Z0-9-]+\/?$/, "");
}

// NOTE: isSearchBot now imported from ./src/analytics/classifier.js
// NOTE: logEdgeEvent, logArtView, logVerifiedBot now imported from ./src/analytics/storage.js

// --------------------
// ART VIEWS TRACKING (Layer B)
// --------------------
// Tracks actual art being viewed - server-side, no JS required
// Types: 'image' (proxy), 'image_page' (/Galleries/*/i-*), 'gallery_view' (JS-verified gallery landing)

// NOTE: isSyntheticTraffic, hashIP, classifyUA now imported from ./src/shared/

/**
 * Prefer an IPv4 address when both IPv4+IPv6 may be present.
 * This helps the admin dashboard's "Exclude My IP" match the majority of
 * events/art_views rows when a client is dual-stack.
 */
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

/**
 * Extract gallery path from a URL path
 * e.g., /Galleries/Painterly/Western/Color -> Painterly/Western/Color
 */
function extractGallerySlug(pathname) {
  const match = pathname.match(/^\/(Galleries|Other)\/(.+?)\/?$/);
  if (!match) return pathname;
  return match[2];
}

/**
 * Policy:
 * - If image exists:
 *   - If wrong gallery path -> 301 to canonical (from imageIdMap)
 *   - If case mismatch -> 301 to canonical casing
 *   - Else -> pass through (return null)
 * - If image missing:
 *   - bot -> 410 Gone (cacheable)
 *   - human -> 302 to parent gallery
 */
async function handleImagePagePolicy(request, pathname, ctx, env) {
  const imageId = extractImageId(pathname);
  if (!imageId) return null;

  try {
    const [manifest, imageIdMap] = await Promise.all([
      getManifest(ctx),
      getImageIdMap(ctx)
    ]);

    // Image exists
    if (manifest[imageId]) {
      const validPathsRaw = imageIdMap ? imageIdMap[imageId] : null;
      const requestedGalleryPath = getParentGallery(pathname);

      if (validPathsRaw) {
        const validPaths = Array.isArray(validPathsRaw) ? validPathsRaw : [validPathsRaw];

        const requestedLower = requestedGalleryPath.toLowerCase();
        const matchedPath = validPaths.find(p => (p || "").toLowerCase() === requestedLower);

        // Wrong path entirely -> canonicalize to first known valid path
        if (!matchedPath) {
          const canonicalUrl = `https://www.k4studios.com${validPaths[0]}/${imageId}`;
          // Log edge event (fire and forget via waitUntil)
          ctx.waitUntil(logEdgeEvent(env, '301', pathname, imageId, isSearchBot(request), request));
          return Response.redirect(canonicalUrl, 301);
        }

        // Case mismatch -> redirect to canonical casing
        if (matchedPath !== requestedGalleryPath) {
          const canonicalUrl = `https://www.k4studios.com${matchedPath}/${imageId}`;
          // Log edge event (fire and forget via waitUntil)
          ctx.waitUntil(logEdgeEvent(env, '301', pathname, imageId, isSearchBot(request), request));
          return Response.redirect(canonicalUrl, 301);
        }
      }

      // Correct path -> pass through to origin static page
      return null;
    }

    // Image missing
    const parentGallery = getParentGallery(pathname);
    
    // Check if parent gallery is a known valid gallery path
    const isKnownGallery = imageIdMap && Object.values(imageIdMap).some(paths => {
      const pathArray = Array.isArray(paths) ? paths : [paths];
      return pathArray.some(p => p && p.toLowerCase() === parentGallery.toLowerCase());
    });

    // Bot OR unknown gallery -> 410 Gone
    if (isSearchBot(request) || !isKnownGallery) {
      ctx.waitUntil(logEdgeEvent(env, '410', pathname, imageId, isSearchBot(request), request));
      return new Response("Gone", {
        status: 410,
        headers: {
          "X-Robots-Tag": "noindex",
          "Cache-Control": "public, max-age=86400" // 1 day
        }
      });
    }

    // Human with known gallery -> 302 fallback to parent gallery
    ctx.waitUntil(logEdgeEvent(env, '302', pathname, imageId, false, request));
    return Response.redirect(`https://www.k4studios.com${parentGallery}`, 302);

  } catch (err) {
    console.error("Image page policy error:", err);
    // Fail open to origin to avoid accidental mass-410 on transient errors
    return null;
  }
}

// --------------------
// GATEWAY REQUEST HANDLER (FIREWALL)
// --------------------
async function handleGatewayRequest(request, env) {
  const url = new URL(request.url);
  const ua = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept") || "";

  // Always allow these paths + HEAD/OPTIONS
  if (
    ALWAYS_ALLOWED.includes(url.pathname) ||
    request.method === "HEAD" ||
    request.method === "OPTIONS"
  ) {
    console.log("PROXY TARGET (always-allowed):", request.url);
    return fetch(request);
  }

  // Allow known bots through gateway (they still get image-page policy)
  if (ALLOWED_BOTS.test(ua)) {
    console.log("PROXY TARGET (allowed-bot):", request.url);
    return fetch(request);
  }

  const isHTML = accept.includes("text/html");

  if (isHTML) {
    // Country blocking (HTML only)
    const blockedCountries = (env.BLOCKED_COUNTRIES || "CN,RU,IR,KP")
      .split(",")
      .map(c => c.trim().toUpperCase());

    const country = request.cf?.country;
    if (country && blockedCountries.includes(country)) {
      return new Response("Access Denied", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }

    // Block obvious scraper UAs (HTML only)
    if (BLOCKED_BOTS.test(ua)) {
      console.log("Blocked UA:", ua);
      return new Response("Blocked", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }

    // EDGE REFERRER CAPTURE: Set k4_entry_ref cookie on first HTML request
    // This captures the true referrer before SPA navigation loses it
    const cookies = request.headers.get("cookie") || "";
    const hasEntryRefCookie = cookies.includes("k4_entry_ref=");
    
    // Only set cookie on true top-level navigation (not SPA transitions or iframes)
    const isTopLevelNav = 
      request.headers.get("Sec-Fetch-Dest") === "document" &&
      request.headers.get("Sec-Fetch-Mode") === "navigate";
    
    if (!hasEntryRefCookie && isTopLevelNav) {
      // Capture the raw referrer from the edge (most reliable source)
      // Store the full URL so the SQL CASE can distinguish google_images vs google_search etc.
      const edgeReferer = request.headers.get("referer") || "";
      const cookieValue = edgeReferer 
        ? encodeURIComponent(edgeReferer) 
        : "direct";
      
      // Log for debugging
      console.log("Edge referrer capture:", { raw: edgeReferer, cookieValue });
      
      // Fetch the origin response
      console.log("PROXY TARGET (cookie-set):", request.url);
      const originResponse = await fetch(request);
      
      // Clone response and add the cookie
      const newResponse = new Response(originResponse.body, originResponse);
      newResponse.headers.append(
        "Set-Cookie",
        `k4_entry_ref=${cookieValue}; Max-Age=3600; Path=/; Secure; SameSite=Lax`
      );
      return newResponse;
    }
  }

  console.log("PROXY TARGET (default):", request.url);
  return fetch(request);
}

// --------------------
// ANALYTICS: /track ENDPOINT
// --------------------
// NOTE: normalizeReferrer now imported from ./src/analytics/classifier.js

async function handleTrackRequest(request, env, ctx) {
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
    
    // Store the raw edge referrer URL directly (for SQL LIKE matching)
    // normalizeReferrer is kept as fallback for old normalized cookie values
    const bestReferrer = edgeReferrer || clientReferrer;
    const referrer = bestReferrer || "unknown";

    // Detect device/platform from User-Agent
    const ua = (request.headers.get("User-Agent") || "").toLowerCase();
    let device = "unknown";
    if (ua.includes("iphone") || ua.includes("ipad")) {
      device = "ios";
    } else if (ua.includes("android")) {
      device = "android";
    } else if (ua.includes("macintosh") || ua.includes("mac os")) {
      device = "mac";
    } else if (ua.includes("windows")) {
      device = "windows";
    } else if (ua.includes("linux")) {
      device = "linux";
    }

    // Insert into D1
    await env.DB.prepare(`
      INSERT INTO events (session_id, event, gallery_id, image_id, page_type, referrer, country, region, city, ip, device, page_path, theme, raw_referrer, event_ts_ms, event_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      session_id,
      event,
      gallery_id,
      image_id,
      page_type,
      referrer,
      country,
      region,
      city,
      ip,
      device,
      page_path,
      theme,
      clientReferrer,  // Store raw referrer for debugging
      event_ts_ms,     // Client timestamp (ms since epoch)
      event_order      // Event sequence within session
    ).run();

    // Mirror key JS-verified intents into art_views (keeps dashboard consistent)
    // We do this here (same-origin /track) because cross-origin beacons are more likely to be blocked.
    if (event === 'chapter_view') {
      const targetId = image_id || (typeof page_path === 'string'
        ? (page_path.match(/\/(i-[a-zA-Z0-9_-]+)\/?$/)?.[1] || null)
        : null);
      if (targetId) {
        ctx.waitUntil(logArtView(env, 'chapter_view', targetId, request, session_id));
      }
    }

    // Mirror JS-verified gallery views into art_views
    if (event === 'gallery_view') {
      const targetId = gallery_id || (typeof page_path === 'string'
        ? page_path.replace(/^\/Galleries\//, '').replace(/^\/Other\//, '').replace(/\/$/, '')
        : null);
      if (targetId) {
        ctx.waitUntil(logArtView(env, 'gallery_view', targetId, request, session_id));
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
function handleTrackOptions() {
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

// --------------------
// EDGE EVENTS: /edge-event (for 301/410/404 logging from Netlify functions)
// --------------------
async function handleEdgeEvent(request, env) {
  try {
    // Use shared ingestion gate - one function, all paths
    if (isSyntheticTraffic(request)) {
      return new Response('OK', { status: 200 }); // Silent drop
    }
    
    const data = await request.json();
    
    // Required fields
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

function handleEdgeEventOptions() {
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

// --------------------
// BOT MANAGEMENT API
// --------------------

/**
 * Block an IP (add to blocked_ips, takes effect immediately)
 * POST /__k4stats/block { ip_hash, reason? }
 */
async function handleBlockIP(request, env) {
  try {
    const { ip_hash, reason } = await request.json();
    
    if (!ip_hash) {
      return new Response(JSON.stringify({ error: 'ip_hash required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Get current risk info from suspected_bots
    const suspectInfo = await env.DB.prepare(`
      SELECT risk_level, risk_score, rules_triggered, total_requests 
      FROM suspected_bots WHERE ip_hash = ?
    `).bind(ip_hash).first();
    
    // Invalidate in-memory cache so new block takes effect immediately
    invalidateBlockedIpCache();
    
    // Insert into blocked_ips
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
    
    // Update suspected_bots status
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

/**
 * Unblock an IP (keeps record, sets is_active = 0)
 * POST /__k4stats/unblock { ip_hash }
 */
async function handleUnblockIP(request, env) {
  try {
    const { ip_hash } = await request.json();
    
    if (!ip_hash) {
      return new Response(JSON.stringify({ error: 'ip_hash required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Invalidate in-memory cache so unblock takes effect immediately
    invalidateBlockedIpCache();
    
    // Soft-delete: set is_active = 0, record unblocked_at
    await env.DB.prepare(`
      UPDATE blocked_ips 
      SET is_active = 0, unblocked_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();
    
    // Downgrade suspected_bots status to watching (risk scoring is label-only, no enforcement)
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

/**
 * Refresh bot intelligence (recalculate risk scores)
 * POST /__k4stats/refresh-bots
 */
async function handleRefreshBots(request, env) {
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
// ANALYTICS: /admin/analytics DASHBOARD
// --------------------
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

async function handleAdminAnalytics(request, env) {
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
    const html = await handleDashboardRequest(env, {
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

// CSV Export handler
async function handleExportCSV(request, env) {
  // Check auth
  const authHeader = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  if (authHeader !== expected) {
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
    // Build date filter
    let dateClause;
    if (yesterday) {
      dateClause = `created_at >= datetime('now', '-5 hours', '-1 day', 'start of day') AND created_at < datetime('now', '-5 hours', 'start of day')`;
    } else {
      dateClause = `created_at > datetime('now', '-5 hours', '-${days} days')`;
    }

    const query = `
      SELECT 
        created_at, session_id, event, gallery_id, image_id, 
        page_path, referrer, device, country, region, city, theme
      FROM events 
      WHERE ${dateClause}
      ORDER BY created_at DESC
    `;
    const results = await env.DB.prepare(query).all();
    const rows = results.results || [];

    // Build CSV
    const headers = ['created_at', 'session_id', 'event', 'gallery_id', 'image_id', 'page_path', 'referrer', 'device', 'country', 'region', 'city', 'theme'];
    const csvRows = [headers.join(',')];
    
    for (const row of rows) {
      const values = headers.map(h => {
        const val = row[h] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(val).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');
    const filename = `k4-analytics-${yesterday ? 'yesterday' : days + 'days'}-${new Date().toISOString().slice(0,10)}.csv`;

    return new Response(csv, {
      headers: withAdminNoCacheHeaders({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      })
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(`Export error: ${err.message}`,
      {
        status: 500,
        headers: withAdminNoCacheHeaders({ "Content-Type": "text/plain; charset=utf-8" })
      }
    );
  }
}

// ====================
// SERP TRACKER SYSTEM
// ====================
// Track Google rankings via DataForSEO API
// Manual trigger only - no cron, no Bing, no AI Overview
// Cost: ~$0.12/day (15 keywords — x $0.008.008)

const OUR_DOMAINS = ['k4studios.com', 'www.k4studios.com'];
const MAX_RANK = 50; // Search depth for sparkline scaling

// Escape HTML to prevent XSS
function escapeHtml(s='') {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

// Safe JSON parse with fallback
function safeJson(s, fallback=[]) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

/**
 * Fetch SERP results from DataForSEO (Google only)
 */
async function fetchSerpFromDataForSEO(keyword, env) {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  
  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured');
  }
  
  const auth = btoa(`${login}:${password}`);
  
  const payload = [{
    keyword: keyword,
    location_name: "United States",
    language_name: "English",
    depth: 50
  }];
  
  const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`DataForSEO API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Parse DataForSEO response and extract our rank
 */
function parseSerpResponse(data) {
  const result = {
    ourRank: null,
    ourUrl: null,
    allRankings: [],
    top3Urls: [],
    organicResults: []
  };
  
  try {
    const task = data?.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      console.error('DataForSEO task failed:', task?.status_message);
      return result;
    }
    
    const items = task.result?.[0]?.items || [];
    
    let rank = 0;
    for (const item of items) {
      if (item.type === 'organic') {
        rank++;
        const url = item.url || '';
        const domain = item.domain || '';
        
        result.organicResults.push({ rank, url, domain, title: item.title || '' });
        
        if (rank <= 3) {
          result.top3Urls.push({ rank, url, domain });
        }
        
        if (OUR_DOMAINS.some(d => domain.includes(d))) {
          result.allRankings.push({ rank, url, title: item.title || '' });
          if (!result.ourRank) {
            result.ourRank = rank;
            result.ourUrl = url;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error parsing SERP response:', err);
  }
  
  return result;
}

/**
 * Run SERP check for all enabled keywords (Google only)
 */
async function runSerpCheck(env) {
  if (!env.DB) {
    throw new Error('Database not configured');
  }
  
  const keywords = await env.DB.prepare(
    'SELECT keyword FROM serp_keywords WHERE enabled = 1 ORDER BY keyword ASC'
  ).all();
  
  if (!keywords.results?.length) {
    return { checked: 0, message: 'No keywords to check' };
  }
  
  const checkedAt = new Date().toISOString().slice(0, 10);
  let checked = 0;
  const errors = [];
  
  for (const kw of keywords.results) {
    try {
      // Check if already fetched today
      const existing = await env.DB.prepare(
        'SELECT id FROM serp_results WHERE keyword = ? AND engine = ? AND checked_at = ?'
      ).bind(kw.keyword, 'google', checkedAt).first();
      
      if (existing) continue;
      
      const response = await fetchSerpFromDataForSEO(kw.keyword, env);
      const parsed = parseSerpResponse(response);
      
      await env.DB.prepare(`
        INSERT INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        kw.keyword,
        'google',
        checkedAt,
        parsed.ourRank,
        parsed.ourUrl,
        JSON.stringify(parsed.allRankings),
        JSON.stringify(parsed.top3Urls),
        JSON.stringify(parsed.organicResults.slice(0, 10))
      ).run();
      
      checked++;
      await new Promise(r => setTimeout(r, 200));
      
    } catch (err) {
      errors.push(`${kw.keyword}: ${err.message}`);
      console.error(`SERP check failed for ${kw.keyword}:`, err);
    }
  }
  
  return { checked, errors, checkedAt };
}

/**
 * Handle SERP dashboard request
 */
async function handleSerpDashboard(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  
  if (!env.DB) {
    return new Response('Database not configured', { status: 500 });
  }
  
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30');
  
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    
    const keywords = await env.DB.prepare(
      'SELECT * FROM serp_keywords WHERE enabled = 1 ORDER BY keyword ASC'
    ).all();
    
    const latestResults = await env.DB.prepare(`
      SELECT sr1.* FROM serp_results sr1
      INNER JOIN (
        SELECT keyword, engine, MAX(checked_at) as max_date
        FROM serp_results
        GROUP BY keyword, engine
      ) sr2 ON sr1.keyword = sr2.keyword AND sr1.engine = sr2.engine AND sr1.checked_at = sr2.max_date
      ORDER BY sr1.keyword
    `).all();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    
    const previousResults = await env.DB.prepare(
      'SELECT keyword, our_rank FROM serp_results WHERE engine = ? AND checked_at = ?'
    ).bind('google', yesterdayStr).all();
    
    const prevMap = new Map();
    for (const r of (previousResults.results || [])) {
      prevMap.set(r.keyword, r.our_rank);
    }
    
    const trendData = await env.DB.prepare(`
      SELECT keyword, checked_at, our_rank 
      FROM serp_results 
      WHERE engine = 'google' AND checked_at >= ?
      ORDER BY keyword, checked_at
    `).bind(cutoffStr).all();
    
    const trendByKeyword = {};
    for (const r of (trendData.results || [])) {
      if (!trendByKeyword[r.keyword]) trendByKeyword[r.keyword] = [];
      trendByKeyword[r.keyword].push({ date: r.checked_at, rank: r.our_rank });
    }
    
    const html = renderSerpDashboard({
      days,
      keywords: keywords.results || [],
      latestResults: latestResults.results || [],
      previousMap: prevMap,
      trendByKeyword
    });
    
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    
  } catch (err) {
    console.error('SERP dashboard error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}

/**
 * Handle manual SERP fetch trigger
 */
async function handleSerpFetch(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  
  try {
    const result = await runSerpCheck(env);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle keyword management
 */
async function handleSerpKeyword(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  
  try {
    const body = await request.json();
    const { action, keyword, priority } = body;
    
    if (action === 'add' && keyword) {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing) VALUES (?, ?, 1, 1, 0)'
      ).bind(keyword.toLowerCase().trim(), priority || 5).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'delete' && keyword) {
      await env.DB.prepare('DELETE FROM serp_keywords WHERE keyword = ?').bind(keyword).run();
      await env.DB.prepare('DELETE FROM serp_results WHERE keyword = ?').bind(keyword).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle event tracking - zoom clicks, slideshow starts
 * Tracks user intent (button clicks) not image loads
 */
async function handleTrackEvent(request, env, ctx) {
  if (!env?.DB) {
    return new Response('ok', { status: 200 }); // Fail silently
  }
  
  // Use shared ingestion gate - one function, all paths
  if (isSyntheticTraffic(request)) {
    return new Response('ok', { status: 200 }); // Silent drop
  }
  
  try {
    const body = await request.json();
    const { type, imageId } = body;
    
    // Validate event type
    const validTypes = ['xl_zoom', 'slideshow_start', 'chapter_view'];
    if (!type || !validTypes.includes(type)) {
      return new Response('ok', { status: 200 }); // Fail silently
    }
    
    // Validate image ID
    if (!imageId || !/^i-[a-zA-Z0-9]+$/.test(imageId)) {
      return new Response('ok', { status: 200 }); // Fail silently
    }
    
    // Log the event using existing logArtView
    ctx.waitUntil(logArtView(env, type, imageId, request));
    
    return new Response('ok', { 
      status: 200,
      headers: { 
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    console.error('Track event error:', e);
    return new Response('ok', { status: 200 }); // Fail silently
  }
}

/**
 * Handle SERP launch page - quick links to search each keyword
 */
async function handleSerpLaunch(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  
  if (!env.DB) {
    return new Response('Database not configured', { status: 500 });
  }
  
  try {
    const keywords = await env.DB.prepare(
      'SELECT keyword FROM serp_keywords WHERE enabled = 1 ORDER BY keyword ASC'
    ).all();
    
    const kwList = keywords.results || [];
    
    // Fetch today's logged ranks
    const today = new Date().toISOString().slice(0, 10);
    const todayRanks = await env.DB.prepare(`
      SELECT keyword, engine, our_rank FROM serp_results 
      WHERE checked_at = ?
    `).bind(today).all();
    
    // Build a map of today's ranks by keyword and engine
    const todayMap = {};
    for (const r of (todayRanks.results || [])) {
      if (!todayMap[r.keyword]) todayMap[r.keyword] = {};
      todayMap[r.keyword][r.engine] = r.our_rank;
    }
    
    const keywordCards = kwList.map((kw, idx) => {
      const encoded = encodeURIComponent(kw.keyword);
      const safeKw = escapeHtml(kw.keyword);
      const todayData = todayMap[kw.keyword] || {};
      const gVal = todayData.google || '';
      const gaiVal = todayData.google_ai || '';
      const bVal = todayData.bing || '';
      const hasLogged = gVal || gaiVal || bVal;
      return `
        <div class="kw-card" data-keyword="${safeKw}">
          <div class="kw-header">
            <div class="kw-name">${safeKw}</div>
            <div class="kw-buttons">
              <button onclick="openGoogle('${encoded}')" class="btn google">Google</button>
              <button onclick="openBing('${encoded}')" class="btn bing">Bing</button>
            </div>
          </div>
          <div class="kw-inputs">
            <div class="input-group">
              <label>Google</label>
              <input type="number" id="g-${idx}" placeholder="#" min="1" max="100" value="${gVal}">
            </div>
            <div class="input-group">
              <label>G-AI</label>
              <input type="number" id="gai-${idx}" placeholder="#" min="1" max="100" value="${gaiVal}">
            </div>
            <div class="input-group">
              <label>Bing</label>
              <input type="number" id="b-${idx}" placeholder="#" min="1" max="100" value="${bVal}">
            </div>
            <div class="save-group">
              <button onclick="logRank(${idx}, '${safeKw}')" class="btn-log${hasLogged ? ' logged' : ''}">💾 Save</button>
              ${hasLogged ? '<span class="saved-date">Saved today</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 SERP Launch Pad</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: #1a1a1a; 
      color: #e0e0e0; 
      padding: 30px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 { color: #fff; margin-bottom: 10px; display: flex; align-items: center; gap: 15px; }
    h1 a { font-size: 14px; color: #4a9eff; text-decoration: none; }
    .subtitle { color: #888; margin-bottom: 30px; font-size: 14px; }
    .kw-card {
      background: #252525;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 15px;
    }
    .kw-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 15px;
    }
    .kw-name {
      font-size: 18px;
      font-weight: 500;
      color: #fff;
      text-transform: capitalize;
    }
    .kw-buttons {
      display: flex;
      gap: 10px;
    }
    .kw-inputs {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      padding-top: 15px;
      border-top: 1px solid #333;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .input-group label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
    }
    .input-group input {
      width: 60px;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #444;
      background: #1a1a1a;
      color: #fff;
      font-size: 14px;
      text-align: center;
      -moz-appearance: textfield;
    }
    .input-group input::-webkit-outer-spin-button,
    .input-group input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .input-group input:focus {
      outline: none;
      border-color: #4a9eff;
    }
    .btn {
      padding: 10px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      border: none;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .btn.google {
      background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 75%, #ea4335 100%);
      background-size: 300% 300%;
      color: #fff;
    }
    .btn.bing {
      background: linear-gradient(135deg, #00809d 0%, #0078d4 100%);
      color: #fff;
    }
    .btn-log {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      background: #10b981;
      color: #fff;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      margin-left: auto;
    }
    .btn-log:hover { background: #059669; }
    .btn-log:disabled { background: #666; cursor: not-allowed; }
    .btn-log.saved { background: #fbbf24; color: #000; }
    .btn-log.logged { background: #6366f1; border: 1px solid #818cf8; }
    .btn-log.logged:hover { background: #4f46e5; }
    .save-group { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-left: auto; }
    .saved-date { font-size: 10px; color: #10b981; }
    .tip {
      background: #252525;
      border-left: 4px solid #fbbf24;
      padding: 15px 20px;
      border-radius: 0 8px 8px 0;
      margin-top: 30px;
      font-size: 13px;
      color: #888;
    }
    .tip strong { color: #fbbf24; }
    .empty { text-align: center; color: #666; padding: 40px; }
  </style>
</head>
<body>
  <h1>
    🚀 SERP Launch Pad
    <a href="/__k4serp" target="_blank">📊 Dashboard</a>
  </h1>
  <p class="subtitle">Search each keyword, then log your rank (saves to dashboard)</p>
  
  ${keywordCards || '<div class="empty">No keywords configured. Add some in the dashboard.</div>'}
  
  <div class="tip">
    <strong>💡 Tip:</strong> Open this page in incognito first (Ctrl+Shift+N in Chrome, Ctrl+Shift+P in Edge/Firefox), 
    then click the search buttons - tabs will inherit incognito mode. Enter your rank (or leave blank if not found).
  </div>
  
  <script>
    function openGoogle(q) {
      window.open('https://www.google.com/search?q=' + q, '_blank');
    }
    
    function openBing(q) {
      window.open('https://www.bing.com/search?q=' + q, '_blank');
    }
    
    async function logRank(idx, keyword) {
      const gRank = document.getElementById('g-' + idx).value || null;
      const gaiRank = document.getElementById('gai-' + idx).value || null;
      const bRank = document.getElementById('b-' + idx).value || null;
      
      if (!gRank && !gaiRank && !bRank) {
        alert('Enter at least one rank');
        return;
      }
      
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '...';
      
      try {
        const res = await fetch('/__k4serp/log', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keyword, 
            google: gRank ? parseInt(gRank) : null,
            google_ai: gaiRank ? parseInt(gaiRank) : null,
            bing: bRank ? parseInt(bRank) : null
          })
        });
        
        if (res.ok) {
          btn.textContent = '? Saved!';
          btn.classList.add('saved');
          btn.classList.add('logged');
          // Update the saved date text
          const saveGroup = btn.parentElement;
          let dateSpan = saveGroup.querySelector('.saved-date');
          if (!dateSpan) {
            dateSpan = document.createElement('span');
            dateSpan.className = 'saved-date';
            saveGroup.appendChild(dateSpan);
          }
          dateSpan.textContent = 'Saved today';
          setTimeout(() => {
            btn.textContent = '💾 Save';
            btn.classList.remove('saved');
            btn.disabled = false;
          }, 1500);
        } else {
          throw new Error('Failed to save');
        }
      } catch (e) {
        btn.textContent = '? Error';
        setTimeout(() => {
          btn.textContent = '💾 Save';
          btn.disabled = false;
        }, 2000);
      }
    }
  </script>
</body>
</html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    
  } catch (err) {
    console.error('SERP launch error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}

/**
 * Handle manual rank logging from launch pad
 */
async function handleSerpLog(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  try {
    const body = await request.json();
    const { keyword, google, google_ai, bing, bing_ai } = body;
    
    if (!keyword) {
      return new Response(JSON.stringify({ error: 'Keyword required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const checkedAt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    // Log Google rank if provided
    if (google !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'google', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, google).run();
    }
    
    // Log Google AI rank if provided (store as google_ai engine)
    if (google_ai !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'google_ai', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, google_ai).run();
    }
    
    // Log Bing rank if provided
    if (bing !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'bing', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, bing).run();
    }
    
    // Log Bing AI rank if provided
    if (bing_ai !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'bing_ai', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, bing_ai).run();
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('SERP log error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function checkSerpAuth(request, env) {
  const auth = request.headers.get('Authorization');
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  
  if (auth !== expected) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="K4 SERP Tracker"' }
    });
  }
  return null;
}

function renderSerpDashboard({ days, keywords, latestResults, previousMap, trendByKeyword }) {
  // Group results by keyword, then by engine
  const byKeywordEngine = {};
  for (const r of latestResults) {
    if (!byKeywordEngine[r.keyword]) byKeywordEngine[r.keyword] = {};
    byKeywordEngine[r.keyword][r.engine] = r;
  }
  
  const googleRanks = latestResults.filter(r => r.engine === 'google' && r.our_rank).map(r => r.our_rank);
  const avgRank = googleRanks.length ? (googleRanks.reduce((a, b) => a + b, 0) / googleRanks.length) : null;
  const lastCheck = latestResults.reduce((max, r) => !max || r.checked_at > max ? r.checked_at : max, null);
  const rankedCount = googleRanks.length;
  
  const keywordRows = keywords.map(kw => {
    const engines = byKeywordEngine[kw.keyword] || {};
    const googleResult = engines.google;
    const googleAiResult = engines.google_ai;
    const bingResult = engines.bing;
    
    const gRank = googleResult?.our_rank;
    const gaiRank = googleAiResult?.our_rank;
    const bRank = bingResult?.our_rank;
    
    const prevRank = previousMap.get(kw.keyword);
    const change = gRank && prevRank ? prevRank - gRank : null;
    
    const changeIcon = change === null ? '' 
      : change > 0 ? `<span style="color:#10b981">▲${change}</span>`
      : change < 0 ? `<span style="color:#ef4444">▼${Math.abs(change)}</span>`
      : '<span style="color:#888">—</span>';
    
    const trend = trendByKeyword[kw.keyword] || [];
    const sparkline = trend.slice(-14).map(t => Math.min(MAX_RANK, Math.max(1, t.rank ?? MAX_RANK)));
    
    const rankCell = (rank) => {
      if (!rank) return '<td class="rank-cell">-</td>';
      const cls = rank <= 3 ? 'rank-top3' : rank <= 10 ? 'rank-top10' : '';
      return `<td class="rank-cell ${cls}">${rank}</td>`;
    };
    
    return `
      <tr>
        <td style="font-weight:500">${escapeHtml(kw.keyword)}</td>
        <td class="rank-cell ${gRank && gRank <= 3 ? 'rank-top3' : gRank && gRank <= 10 ? 'rank-top10' : ''}">
          ${gRank || '-'} ${changeIcon}
        </td>
        ${rankCell(gaiRank)}
        ${rankCell(bRank)}
        <td>
          ${sparkline.length > 1 ? `
            <svg class="sparkline" viewBox="0 0 70 20" preserveAspectRatio="none">
              <polyline fill="none" stroke="#4a9eff" stroke-width="1.5" points="${
                sparkline.map((v, i) => `${i * (70 / Math.max(sparkline.length - 1, 1))},${((v - 1) / (MAX_RANK - 1)) * 20}`).join(' ')
              }"/>
            </svg>
          ` : '-'}
        </td>
        <td style="text-align:center">
          <button onclick="deleteKeyword('${escapeHtml(kw.keyword)}')" style="background:none;border:none;color:#ef4444;cursor:pointer">?</button>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 SERP Tracker</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
    h1 { color: #fff; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
    h1 a { font-size: 14px; color: #4a9eff; text-decoration: none; }
    h2 { color: #888; font-size: 14px; text-transform: uppercase; margin: 30px 0 10px; }
    .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px; }
    .stat { background: #252525; padding: 12px 20px; border-radius: 8px; }
    .stat .value { font-size: 24px; font-weight: bold; color: #4a9eff; }
    .stat .label { font-size: 11px; color: #888; margin-top: 2px; }
    .stat.good .value { color: #10b981; }
    table { width: 100%; border-collapse: collapse; background: #252525; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #333; }
    th { background: #1a1a1a; color: #888; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #2a2a2a; }
    .rank-cell { font-weight: bold; font-size: 16px; }
    .rank-top3 { color: #10b981; }
    .rank-top10 { color: #fbbf24; }
    .sparkline { width: 70px; height: 20px; }
    .controls { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
    .controls a, .controls button { 
      color: #4a9eff; text-decoration: none; padding: 8px 16px; 
      border-radius: 6px; background: #333; border: none; cursor: pointer; font-size: 13px;
    }
    .controls a:hover, .controls button:hover { background: #444; }
    .controls button.primary { background: #2563eb; color: #fff; }
    .controls button.primary:hover { background: #1d4ed8; }
    .add-form { background: #252525; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 10px; align-items: center; }
    .add-form input { padding: 8px 12px; border-radius: 6px; border: 1px solid #444; background: #1a1a1a; color: #e0e0e0; }
    .add-form input[type="text"] { flex: 1; min-width: 200px; }
    .last-check { color: #666; font-size: 12px; margin-left: auto; }
  </style>
</head>
<body>
  <h1>
    🔍 K4 SERP Tracker 
    <a href="/__k4serp/launch">🚀 Launch Pad</a>
    <a href="/__k4stats">? Analytics</a>
  </h1>
  
  <div class="controls">
    <a href="?days=7">7 Days</a>
    <a href="?days=30">30 Days</a>
    <a href="?days=90">90 Days</a>
    <span class="last-check">Last: ${lastCheck || 'Never'}</span>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="value">${keywords.length}</div>
      <div class="label">Keywords</div>
    </div>
    <div class="stat ${avgRank && avgRank <= 10 ? 'good' : ''}">
      <div class="value">${avgRank ? avgRank.toFixed(1) : '-'}</div>
      <div class="label">Avg Google Rank</div>
    </div>
    <div class="stat">
      <div class="value">${rankedCount}/${keywords.length}</div>
      <div class="label">Ranking</div>
    </div>
  </div>

  <h2>Keyword Rankings (Google)</h2>
  
  <table>
    <thead>
      <tr>
        <th>Keyword</th>
        <th>Google</th>
        <th>G-AI</th>
        <th>Bing</th>
        <th>14-Day Trend</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${keywordRows || '<tr><td colspan="6" style="text-align:center;color:#888">No keywords. Add some below!</td></tr>'}
    </tbody>
  </table>

  <h2>Add Keyword</h2>
  <div class="add-form">
    <input type="text" id="newKeyword" placeholder="Enter keyword...">
    <button onclick="addKeyword()">+ Add</button>
  </div>

  <script>
    async function addKeyword() {
      const keyword = document.getElementById('newKeyword').value.trim();
      if (!keyword) return alert('Enter a keyword');
      
      const res = await fetch('/__k4serp/keyword', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', keyword })
      });
      if (res.ok) location.reload();
      else alert('Error adding keyword');
    }
    
    async function deleteKeyword(keyword) {
      if (!confirm('Delete "' + keyword + '"?')) return;
      
      const res = await fetch('/__k4serp/keyword', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', keyword })
      });
      if (res.ok) location.reload();
      else alert('Error deleting keyword');
    }
  </script>
</body>
</html>`;
}

// --------------------
// WORKER ENTRY POINT
// --------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 0) Bot short-circuit for /track — prevent Netlify function burn
    // Verified bots (Googlebot, Applebot, Bingbot, etc.) get 204 No Content
    // Humans still hit the function. Bots never do.
    if (
      url.pathname.startsWith('/track') &&
      request.cf?.botManagement?.verifiedBot
    ) {
      return new Response(null, { status: 204 });
    }

    // 0a) Analytics tracking endpoint (humans only reach here)
    if (url.pathname === "/track") {
      if (request.method === "OPTIONS") {
        return handleTrackOptions();
      }
      return handleTrackRequest(request, env, ctx);
    }

    // 0a) Edge event tracking (~301/410/404 from Netlify functions)
    if (url.pathname === "/edge-event") {
      if (request.method === "OPTIONS") {
        return handleEdgeEventOptions();
      }
      return handleEdgeEvent(request, env);
    }

    // 0b) Analytics dashboard
    if (url.pathname === "/__k4stats") {
      return handleAdminAnalytics(request, env);
    }

    // 0c) Analytics CSV export
    if (url.pathname === "/__k4stats/export") {
      return handleExportCSV(request, env);
    }

    // 0d) Bot management API - Block IP
    // No separate auth check - these endpoints are only callable from the authenticated dashboard
    // The POST-only + JSON body requirement provides basic protection
    if (url.pathname === "/__k4stats/block" && request.method === "POST") {
      return handleBlockIP(request, env);
    }

    // 0e) Bot management API - Unblock IP
    if (url.pathname === "/__k4stats/unblock" && request.method === "POST") {
      return handleUnblockIP(request, env);
    }

    // 0f) Bot management API - Refresh bot intelligence
    if (url.pathname === "/__k4stats/refresh-bots" && request.method === "POST") {
      return handleRefreshBots(request, env);
    }

    // 0g) SERP Tracker Dashboard
    if (url.pathname === "/__k4serp") {
      return handleSerpDashboard(request, env);
    }

    // 0g-launch) SERP Launch Pad - quick search links
    if (url.pathname === "/__k4serp/launch") {
      return handleSerpLaunch(request, env);
    }

    // 0g-log) SERP Log - save manual rank entry
    if (url.pathname === "/__k4serp/log" && request.method === "POST") {
      return handleSerpLog(request, env);
    }

    // 0h) SERP Tracker - Manual fetch trigger
    if (url.pathname === "/__k4serp/fetch" && request.method === "POST") {
      return handleSerpFetch(request, env);
    }

    // 0i) SERP Tracker - Keyword management
    if (url.pathname === "/__k4serp/keyword" && request.method === "POST") {
      return handleSerpKeyword(request, env);
    }

    // 0j) Event tracking - zoom clicks, slideshow starts (user intent, not image loads)
    if (url.pathname === "/__k4track/event") {
      if (request.method === "OPTIONS") {
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
      if (request.method === "POST") {
        return handleTrackEvent(request, env, ctx);
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // 1) Image detail pages: apply policy first, then log art view
    if (isImagePageRoute(url.pathname)) {
      const policyResponse = await handleImagePagePolicy(request, url.pathname, ctx, env);
      if (policyResponse) return policyResponse;
      
      // Log image page view (someone viewing an image detail page)
      const imageId = extractImageId(url.pathname);
      if (imageId && env?.DB) {
        ctx.waitUntil(logArtView(env, 'image_page', imageId, request));
      }
      
      return fetch(request);
    }

    // 2) Gallery pages: pass through (gallery tracking is now JS-verified via GalleryInfo.jsx → /track → gallery_view)
    if ((url.pathname.startsWith("/Galleries/") || url.pathname.startsWith("/Other/")) && 
        !url.pathname.includes("/i-")) {
      return fetch(request);
    }

    // 3) /img proxy routes
    if (url.pathname.startsWith("/img/")) {
      return handleImageRequest(request, ctx, env);
    }

    // 4) Everything else: gateway firewall
    try {
      console.log("PROXY TARGET (gateway):", request.url);
      return await handleGatewayRequest(request, env);
    } catch (err) {
      console.error("Gateway error (failing open):", err);
      console.log("PROXY TARGET (fallback):", request.url);
      return fetch(request);
    }
  }
};
