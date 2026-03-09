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
// ANALYTICS (Phase 4 — single namespace entry point)
// Worker imports only from analytics barrel. No deep imports allowed.
// ═══════════════════════════════════════════════════════════════════════════
import {
  handleDashboardRequest,
  handleTrackRequest,
  handleTrackOptions,
  handleEdgeEvent,
  isSearchBot,
  logEdgeEvent,
  logArtView,
  logVerifiedBot
} from './src/analytics/index.js';

// Cache-bust parameter to avoid waiting on Cloudflare's cached manifest after deploys.
// Update this when you need the worker to pick up a newly deployed manifest immediately.
const MANIFEST_URL = "https://k4studios.netlify.app/image-manifest.json";
const IMAGE_ID_MAP_URL = "https://k4studios.com/imageIdMap.json";
const MANIFEST_CACHE_TTL = 3600; // seconds
const IMAGE_CACHE_KEY_VERSION = "20260304-idfix1";

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

// --------------------
// VISITOR ID (k4_vid cookie)
// Single Population Doctrine: 1 cookie = 1 human
// --------------------
const K4_VID_COOKIE_NAME = 'k4_vid';
const K4_VID_MAX_AGE = 31536000; // 1 year in seconds

/**
 * Generate a UUID v4 for new visitors
 */
function generateVisitorId() {
  return crypto.randomUUID();
}

/**
 * Parse k4_vid from Cookie header
 */
function getVisitorIdFromRequest(request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  
  const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${K4_VID_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Get or create visitor_id for this request
 * Returns { visitorId, isNew } where isNew indicates cookie should be set
 */
function getOrCreateVisitorId(request) {
  const existingId = getVisitorIdFromRequest(request);
  if (existingId) {
    return { visitorId: existingId, isNew: false };
  }
  return { visitorId: generateVisitorId(), isNew: true };
}

/**
 * Create Set-Cookie header for k4_vid
 */
function createVisitorIdCookie(visitorId, hostname) {
  const host = String(hostname || '').toLowerCase();
  const domainAttr = host.endsWith('k4studios.com') ? '; Domain=.k4studios.com' : '';
  return `${K4_VID_COOKIE_NAME}=${visitorId}; Path=/; Max-Age=${K4_VID_MAX_AGE}; Secure; SameSite=Lax${domainAttr}`;
}

/**
 * Add visitor_id cookie to response if needed
 */
function addVisitorIdCookie(response, visitorId, isNew, request) {
  if (!isNew) return response;
  
  // Clone response to add Set-Cookie header
  const newHeaders = new Headers(response.headers);
  let hostname;
  try { hostname = new URL(request?.url || '').hostname; } catch(e) { hostname = null; }
  newHeaders.append('Set-Cookie', createVisitorIdCookie(visitorId, hostname));
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

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

// --------------------
// EDGE + IN-MEM JSON CACHES
// --------------------
let manifestCache = null;
let manifestCacheTime = 0;

let imageIdMapCache = null;
let imageIdMapCacheTime = 0;

// Derived caches
let knownGallerySetCache = null;
let knownGallerySetCacheTime = 0;

async function fetchJSONWithCache(ctx, url, memGet, memSet) {
  const now = Date.now();

  // in-memory cache
  const mem = memGet();
  const hasMemData = Boolean(mem?.data);
  const isMemFresh = hasMemData && (now - mem.time < MANIFEST_CACHE_TTL * 1000);
  if (isMemFresh) return mem.data;

  // Keep stale memory data as a safety net.
  // Rationale: transient failures fetching/parsing JSON during deploy/cold cache
  // should not cause mass 404/410/500 signals to crawlers.
  const staleMemData = hasMemData ? mem.data : null;

  try {
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
  } catch (err) {
    if (staleMemData) {
      console.error('JSON cache fallback (stale mem):', url, err?.message || err);
      return staleMemData;
    }
    throw err;
  }
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

function getKnownGallerySetFromImageIdMap(imageIdMap) {
  if (!imageIdMap || typeof imageIdMap !== 'object') return new Set();
  // Rebuild only when the underlying imageIdMap cache refreshes.
  if (knownGallerySetCache && knownGallerySetCacheTime === imageIdMapCacheTime) {
    return knownGallerySetCache;
  }

  const set = new Set();
  for (const paths of Object.values(imageIdMap)) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    for (const p of pathArray) {
      if (!p) continue;
      set.add(String(p).toLowerCase());
    }
  }
  knownGallerySetCache = set;
  knownGallerySetCacheTime = imageIdMapCacheTime;
  return set;
}

// --------------------
// /img ROUTE RESOLUTION
// --------------------
const ASSET_SOURCE_PREFIXES = new Set(['OG', 'TW', 'PN', 'SD']);

function parseImageRoute(pathname) {
  // allow optional trailing slash
  const match = pathname.match(/^\/img\/((?:OG|TW|PN|SD)-)?(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)\/?$/);
  if (!match) return null;

  const rawPrefix = match[1] || null;
  const canonicalImageId = match[2];
  const size = match[3];

  const prefix = rawPrefix ? String(rawPrefix).replace('-', '').toUpperCase() : null;
  if (prefix && !ASSET_SOURCE_PREFIXES.has(prefix)) return null;

  const imageId = prefix ? `${prefix}-${canonicalImageId}` : canonicalImageId;
  const assetSource = prefix ? prefix.toLowerCase() : null;

  return { imageId, canonicalImageId, size, assetSource };
}

function rewriteLegacyProxyToImgRequest(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/proxy\/((?:OG|TW|PN|SD)-)?(i-[a-zA-Z0-9-]+)\.(?:jpe?g|png|webp|gif|avif)\/?$/i);
  if (!match) return null;
  const rawPrefix = match[1] || null;
  const canonicalImageId = match[2];

  const prefix = rawPrefix ? String(rawPrefix).replace('-', '').toUpperCase() : null;
  if (prefix && !ASSET_SOURCE_PREFIXES.has(prefix)) return null;

  const imageId = prefix ? `${prefix}-${canonicalImageId}` : canonicalImageId;

  url.pathname = `/img/${imageId}/l`;
  return new Request(url.toString(), request);
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

function resolveImageUrls(manifest, imageId, requestedSize) {
  const imageData = manifest[imageId];
  if (!imageData) return [];

  const fallbackChain = SIZE_FALLBACK[requestedSize] || SIZE_FALLBACK.m;
  const seen = new Set();
  const urls = [];

  for (const size of fallbackChain) {
    const candidate = imageData[size];
    if (!candidate) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    urls.push(candidate);
  }

  return urls;
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
    "X-Robots-Tag": "noai, noimageai",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Proxy-Origin": "k4studios"
  };

  // NOTE: We intentionally avoid index-control directives on image bytes.
  // `noai, noimageai` are opt-out signals for training, not indexing.

  return new Response(imageResponse.body, { status: 200, headers });
}

async function proxyImageWithFallback(smugMugUrls, request) {
  if (!Array.isArray(smugMugUrls) || smugMugUrls.length === 0) {
    return new Response("Image not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" }
    });
  }

  let lastNotOk = null;
  for (const url of smugMugUrls) {
    try {
      const response = await proxyImage(url, request);
      if (response.status === 200) {
        return response;
      }
      lastNotOk = response;
      if (response.status >= 500) {
        return response;
      }
    } catch (e) {
      console.error('Upstream fallback fetch error:', e);
    }
  }

  return lastNotOk || new Response("Image not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" }
  });
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

function looksLikeBrowser(request) {
  try {
    const ua = request.headers.get('user-agent') || '';
    const accept = request.headers.get('accept') || '';
    const secFetchMode = request.headers.get('sec-fetch-mode') || '';
    const secFetchSite = request.headers.get('sec-fetch-site') || '';

    // Not perfect, but good enough to separate real browsers from aiohttp/curl/wget/etc.
    const hasMozilla = /mozilla\//i.test(ua);
    const wantsHtml = /text\/html/i.test(accept);
    const hasFetchHints = Boolean(secFetchMode) || Boolean(secFetchSite);
    return (hasMozilla && wantsHtml) || (wantsHtml && hasFetchHints);
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFrictionTestOverride(request, env) {
  try {
    const secret = env?.K4_FRICTION_TEST_TOKEN;
    if (!secret) return null;

    const token = request.headers.get('X-K4-Friction-Test') || '';
    if (!token || token !== secret) return null;

    const url = new URL(request.url);
    const asnStr = url.searchParams.get('k4friction_asn');
    if (!asnStr) return null;
    const asn = Number(asnStr);
    if (!Number.isFinite(asn) || asn <= 0) return null;

    const debug = url.searchParams.get('k4friction_debug') === '1';
    return { asn, debug };
  } catch {
    return null;
  }
}

function withFrictionDebugHeaders(response, debugInfo) {
  if (!debugInfo?.enabled) return response;
  try {
    const headers = new Headers(response.headers);
    headers.set(
      'X-K4-Friction-Debug',
      `enabled=1; asn=${debugInfo.asn ?? ''}; bypass=${debugInfo.discoveryBypass ? 1 : 0}; suspect=${debugInfo.suspect ? 1 : 0}; unique=${debugInfo.uniquePerMinute ?? ''}; delayMs=${debugInfo.delayMs ?? ''}; action=${debugInfo.action ?? ''}`
    );
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    return response;
  }
}

function ensureNoAIHeaders(response) {
  try {
    if (!response) return response;
    const existing = response.headers?.get?.('X-Robots-Tag');
    if (existing && String(existing).trim()) return response;

    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noai, noimageai');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    return response;
  }
}

function hasK4SessionCookies(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  return /(?:^|;)\s*k4_vid=/.test(cookieHeader) || /(?:^|;)\s*k4_sid=/.test(cookieHeader);
}

function getFetchHints(request) {
  try {
    const secFetchSite = (request.headers.get('Sec-Fetch-Site') || request.headers.get('sec-fetch-site') || '').toLowerCase();
    const secFetchDest = (request.headers.get('Sec-Fetch-Dest') || request.headers.get('sec-fetch-dest') || '').toLowerCase();
    const secFetchMode = (request.headers.get('Sec-Fetch-Mode') || request.headers.get('sec-fetch-mode') || '').toLowerCase();
    return { secFetchSite, secFetchDest, secFetchMode };
  } catch {
    return { secFetchSite: '', secFetchDest: '', secFetchMode: '' };
  }
}

function isDiscoveryBotUA(uaRaw) {
  // Explicit allowlist for discovery and preview ecosystems.
  // Do NOT include AI crawlers here.
  const ua = String(uaRaw || '');
  return /(googlebot|google-inspectiontool|googleother|apis-google|adsbot-google|googlebot-image|bingbot|bingpreview|msnbot|applebot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|ahrefssiteaudit|semrushbot|facebookexternalhit|facebot|twitterbot|pinterestbot|linkedinbot|slackbot|discordbot|telegrambot)/i.test(ua);
}

function getSuspicionFlags({ request, asn, ua }) {
  // Behavior-based: no referrer + no session cookies + hosting ASN.
  // Do NOT trigger on UA alone.
  const referer = request.headers.get('Referer') || request.headers.get('referer') || '';
  const noReferrer = !referer;
  const noSession = !hasK4SessionCookies(request);

  const hostingASNs = new Set([
    14618, // Amazon.com, Inc. (AWS) — common origin for bulk bots/scrapers
    24940, // Hetzner
    209366, // Semrush (crawler infrastructure)
    16276  // OVH
  ]);

  const hostingASN = hostingASNs.has(Number(asn || 0));
  const isCacheWarmer = String(ua || '').toLowerCase().includes('k4-cache-warmer');

  return {
    noReferrer,
    noSession,
    hostingASN,
    suspect: !isCacheWarmer && noReferrer && noSession && hostingASN
  };
}

async function getAndMarkUniqueImagesPerMinute(ctx, { ipHash, canonicalImageId }) {
  // Best-effort edge-cache counter (no DO/KV required).
  // Tracks unique images per minute per ip_hash.
  // Not perfectly atomic, but sufficient for selective friction.
  const cache = caches.default;
  const minuteBucket = Math.floor(Date.now() / 60000);
  const safeIp = encodeURIComponent(String(ipHash || 'noip'));
  const safeId = encodeURIComponent(String(canonicalImageId || 'noid'));
  const base = `https://k4ratelimit.local/img/${minuteBucket}/${safeIp}`;

  const markerReq = new Request(`${base}/u/${safeId}`);
  const counterReq = new Request(`${base}/count`);

  let isNewUnique = false;
  try {
    const markerHit = await cache.match(markerReq);
    if (!markerHit) {
      isNewUnique = true;
      ctx.waitUntil(
        cache.put(
          markerReq,
          new Response('1', {
            headers: { 'Cache-Control': 'public, max-age=70' }
          })
        )
      );
    }
  } catch (e) {
    console.error('Rate-limit marker error:', e);
  }

  let count = 0;
  try {
    const existing = await cache.match(counterReq);
    if (existing) {
      count = parseInt(await existing.text(), 10) || 0;
    }

    if (isNewUnique) {
      count = count + 1;
      ctx.waitUntil(
        cache.put(
          counterReq,
          new Response(String(count), {
            headers: { 'Cache-Control': 'public, max-age=70' }
          })
        )
      );
    }
  } catch (e) {
    console.error('Rate-limit counter error:', e);
  }

  return { uniquePerMinute: count, isNewUnique };
}

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
  if (route.canonicalImageId === GHOST_IMAGE_ID) {
    return new Response(TRANSPARENT_PIXEL_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Robots-Tag": "noindex, nofollow, noimageindex, noai, noimageai",
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

  // Apply blocked IP policy uniformly (no bot-specific bypass).
  const ua = request.headers.get('User-Agent') || '';
  const cfVerifiedBot = Boolean(request.cf?.botManagement?.verifiedBot);
  const isDiscoveryBot = false;
  
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

  // Canonicalize request URL for caching + manifest lookup.
  // This prevents cache fragmentation when the same underlying image is requested with
  // different attribution prefixes (OG/TW/PN/SD).
  const canonicalUrl = new URL(request.url);
  canonicalUrl.pathname = `/img/${route.canonicalImageId}/${route.size}`;
  canonicalUrl.searchParams.set("__k4v", IMAGE_CACHE_KEY_VERSION);
  const canonicalRequest = (canonicalUrl.pathname === url.pathname)
    ? request
    : new Request(canonicalUrl.toString(), request);

  // Phase 1 Asset Protection: selective friction for suspected bulk harvesting.
  // Runs BEFORE cache lookup (so scraping isn't free) while preserving canonical cache keys.
  const frictionTest = getFrictionTestOverride(request, env);
  const frictionDebug = {
    enabled: Boolean(frictionTest?.debug),
    asn: frictionTest?.asn ?? request.cf?.asn,
    discoveryBypass: false,
    suspect: false,
    uniquePerMinute: null,
    delayMs: null,
    action: 'none'
  };
  try {
    if (request.method === 'GET') {
      // No discovery-bot bypass: apply friction uniformly by behavior.
      const discoveryBypass = isDiscoveryBot;
      const effectiveAsn = frictionTest?.asn ?? request.cf?.asn;
      const flags = getSuspicionFlags({ request, asn: effectiveAsn, ua });
      const protectSizes = new Set(['l', 'xl', 'src']);
      const shouldProtectSize = protectSizes.has(String(route.size || '').toLowerCase());

      frictionDebug.discoveryBypass = discoveryBypass;
      frictionDebug.suspect = Boolean(flags?.suspect);

      if (shouldProtectSize && !discoveryBypass && flags.suspect) {
        const { uniquePerMinute } = await getAndMarkUniqueImagesPerMinute(ctx, {
          ipHash,
          canonicalImageId: route.canonicalImageId
        });

        frictionDebug.uniquePerMinute = uniquePerMinute;

        // Emit a dashboard-visible metric when we actually apply friction.
        // This is intentionally independent of the Hide Bots toggle.
        const frictionAction = uniquePerMinute >= 40 ? '429' : 'delay';
        frictionDebug.action = frictionAction;
        if (env?.DB) {
          ctx.waitUntil(
            logArtView(
              env,
              'harvester_friction',
              route.canonicalImageId,
              request,
              null,
              'proxy',
              null,
              route.size,
              'direct',
              1,
              frictionAction,
              route.assetSource
            )
          );
        }

        // Hard stop only at clearly-bulk rates.
        if (uniquePerMinute >= 40) {
          return new Response('Too Many Requests', {
            status: 429,
            headers: {
              'Cache-Control': 'no-store',
              'Retry-After': '60'
            }
          });
        }

        // Progressive delay (SEO-safe, human-safe; makes bulk scraping expensive).
        let delayMs = 650;
        if (uniquePerMinute >= 10) delayMs = 1100;
        if (uniquePerMinute >= 20) delayMs = 1600;

        frictionDebug.delayMs = delayMs;
        await sleep(delayMs);
      }
    }
  } catch (e) {
    // Fail open: never break images due to protection logic.
    console.error('Selective friction error:', e);
  }

  // Cache lookup must happen on the canonical key.
  // Order: request -> detect prefix -> strip prefix -> canonical id -> cache lookup -> manifest lookup.
  try {
    const cached = await caches.default.match(canonicalRequest);
    if (cached) {
      const upgraded = ensureNoAIHeaders(cached);

      // Refresh cache with upgraded headers so future hits are clean.
      try {
        if (upgraded && upgraded !== cached && upgraded.status === 200) {
          ctx.waitUntil(caches.default.put(canonicalRequest, upgraded.clone()));
        }
      } catch (e) {
        console.error('Cache refresh error:', e);
      }

      // Log attribution even if bytes are served from cache.
      if (env?.DB) {
        const ua = request.headers.get("User-Agent") || '';
        const uaLower = ua.toLowerCase();
        const isCacheWarmer = uaLower.includes('k4-cache-warmer');
        if (!isCacheWarmer && route.size === 'l') {
          const cookieHeader = request.headers.get('Cookie') || '';
          const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
          const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;
          let sessionId = null;
          const sidCookieMatch = cookieHeader.match(/k4_sid=([^;]+)/);
          if (sidCookieMatch) {
            try { sessionId = decodeURIComponent(sidCookieMatch[1]); } catch { sessionId = sidCookieMatch[1]; }
          }

          const referer = request.headers.get('Referer') || '';
          const { secFetchSite } = getFetchHints(request);
          const looksLikeSameSiteSubresource = secFetchSite === 'same-origin' || secFetchSite === 'same-site';
          let refererUrl = null;
          try { refererUrl = referer ? new URL(referer) : null; } catch { refererUrl = null; }
          const refererHost = (refererUrl?.hostname || '').toLowerCase();
          const refererPath = refererUrl?.pathname || '';
          const isInternal =
            refererHost === 'localhost' ||
            refererHost === '127.0.0.1' ||
            refererHost.endsWith('k4studios.com');
          const isImagePageReferer = /\/(Galleries|Other)\/.*\/i-[a-zA-Z0-9-]+\/?$/.test(refererPath);
          const normalizedRefererPath = (refererPath || '').replace(/\/+$/, '');
          const isSameImagePageReferer = normalizedRefererPath.endsWith('/' + route.canonicalImageId);

          if (isInternal && isImagePageReferer && isSameImagePageReferer && visitorId) {
            ctx.waitUntil(logArtView(env, 'chapter_exposure', route.canonicalImageId, request, sessionId, 'proxy', visitorId, 'l', 'internal', null, null, route.assetSource));
          } else if (!isInternal && referer) {
            ctx.waitUntil(logArtView(env, 'external_image', route.canonicalImageId, request, sessionId, 'proxy', visitorId, 'l', 'external', null, null, route.assetSource));
          } else if (!referer && !looksLikeSameSiteSubresource) {
            ctx.waitUntil(logArtView(env, 'direct_image', route.canonicalImageId, request, sessionId, 'proxy', visitorId, 'l', 'direct', null, null, route.assetSource));
          }

          // Only treat a request as a *verified* bot when Cloudflare says so.
          // UA matching is trivially spoofable and can poison bot intelligence.
          if (request.cf?.botManagement?.verifiedBot) {
            ctx.waitUntil(logVerifiedBot(env, route.canonicalImageId, request));
          }
        }
      }

      return withFrictionDebugHeaders(upgraded, frictionDebug);
    }
  } catch (e) {
    // Fail open on cache API issues.
    console.error('Cache lookup error:', e);
  }

  try {
    const manifest = await getManifest(ctx);
    const smugMugUrls = resolveImageUrls(manifest, route.canonicalImageId, route.size);

    if (smugMugUrls.length === 0) {
      return new Response("Image not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" }
      });
    }

    // Log art views by size:
    // - L = can be a real chapter exposure OR an external embed
    // - S/M = ignored (thumbnails/prefetch/noise)
    // - XL = never logged from proxy (zoom intent is JS-only `xl_zoom` beacon)
    if (env?.DB) {
      const ua = request.headers.get("User-Agent") || '';
      const uaLower = ua.toLowerCase();

      // Internal synthetic agent (cache warmer) should NOT pollute analytics.
      // It intentionally fetches images "direct" (no referrer/cookies) to prime caches.
      const isCacheWarmer = uaLower.includes('k4-cache-warmer');

      // Read visitor_id from k4_vid cookie (Single Population Doctrine)
      const cookieHeader = request.headers.get('Cookie') || '';
      const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
      const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;

      // Session bridge cookie (set by BaseLayout): enables session-scoped dedupe/recovery
      let sessionId = null;
      const sidCookieMatch = cookieHeader.match(/k4_sid=([^;]+)/);
      if (sidCookieMatch) {
        try {
          sessionId = decodeURIComponent(sidCookieMatch[1]);
        } catch {
          sessionId = sidCookieMatch[1];
        }
      }

      if (!isCacheWarmer && route.size === 'l') {
        const referer = request.headers.get('Referer') || '';
        const { secFetchSite } = getFetchHints(request);
        const looksLikeSameSiteSubresource = secFetchSite === 'same-origin' || secFetchSite === 'same-site';

        let refererUrl = null;
        try {
          refererUrl = referer ? new URL(referer) : null;
        } catch {
          refererUrl = null;
        }

        const refererHost = (refererUrl?.hostname || '').toLowerCase();
        const refererPath = refererUrl?.pathname || '';

        const isInternal =
          refererHost === 'localhost' ||
          refererHost === '127.0.0.1' ||
          refererHost.endsWith('k4studios.com');

        // Guardrail:
        // Only count *chapter exposure* when the L-size image was requested from an actual
        // image-detail page (…/i-XXXX) FOR THAT SAME IMAGE and the visitor has our k4_vid cookie.
        // This prevents hero/carousel/preload/OG-scraper traffic from inflating chapters.
        const isImagePageReferer = /\/(Galleries|Other)\/.*\/i-[a-zA-Z0-9-]+\/?$/.test(refererPath);
        const normalizedRefererPath = (refererPath || '').replace(/\/+$/, '');
        const canonicalId = route.canonicalImageId;
        const assetSource = route.assetSource;
        const isSameImagePageReferer = normalizedRefererPath.endsWith('/' + canonicalId);

        if (isInternal && isImagePageReferer && isSameImagePageReferer && visitorId) {
          ctx.waitUntil(logArtView(env, 'chapter_exposure', canonicalId, request, sessionId, 'proxy', visitorId, 'l', 'internal', null, null, assetSource));
        } else if (!isInternal && referer) {
          ctx.waitUntil(logArtView(env, 'external_image', canonicalId, request, sessionId, 'proxy', visitorId, 'l', 'external', null, null, assetSource));
        } else if (!referer && !looksLikeSameSiteSubresource) {
          ctx.waitUntil(logArtView(env, 'direct_image', canonicalId, request, sessionId, 'proxy', visitorId, 'l', 'direct', null, null, assetSource));
        }
      }
      
      // Only treat a request as a *verified* bot when Cloudflare says so.
      // UA matching is trivially spoofable and can poison bot intelligence.
      if (request.cf?.botManagement?.verifiedBot) {
        ctx.waitUntil(logVerifiedBot(env, route.canonicalImageId, request));
      }
    }

    const response = await proxyImageWithFallback(smugMugUrls, canonicalRequest);

    // Cache successful responses under the canonical key.
    // Use waitUntil so we don't block serving.
    try {
      if (response?.status === 200) {
        ctx.waitUntil(caches.default.put(canonicalRequest, response.clone()));
      }
    } catch (e) {
      console.error('Cache put error:', e);
    }

    // If the request URL was prefixed, we still serve the canonical bytes.
    // The response headers are already long-lived, so clients + edge can cache as well.
    return withFrictionDebugHeaders(response, frictionDebug);
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
  return /\/(Galleries|galleries|Other|other|Photography-Galleries)\/.*\/[iI]-[a-zA-Z0-9-]+\/?$/.test(pathname);
}

function extractImageId(pathname) {
  const match = pathname.match(/([iI]-[a-zA-Z0-9-]+)\/?$/);
  if (!match) return null;
  const raw = String(match[1]);
  if (raw.length < 2) return null;
  // Canonical prefix is lower-case i-; preserve the rest exactly for ID lookup.
  return `i-${raw.slice(2)}`;
}

function getParentGallery(pathname) {
  return pathname.replace(/\/[iI]-[a-zA-Z0-9-]+\/?$/, "");
}

let canonicalImageIdLookupCache = null;
let canonicalImageIdLookupManifestTime = 0;
let canonicalImageIdLookupMapTime = 0;

function getCanonicalImageIdLookup(manifest, imageIdMap) {
  if (
    canonicalImageIdLookupCache &&
    canonicalImageIdLookupManifestTime === manifestCacheTime &&
    canonicalImageIdLookupMapTime === imageIdMapCacheTime
  ) {
    return canonicalImageIdLookupCache;
  }

  const lookup = new Map();

  if (manifest && typeof manifest === 'object') {
    for (const key of Object.keys(manifest)) {
      if (!key) continue;
      const k = String(key);
      const lower = k.toLowerCase();
      if (!lookup.has(lower)) lookup.set(lower, k);
    }
  }

  if (imageIdMap && typeof imageIdMap === 'object') {
    for (const key of Object.keys(imageIdMap)) {
      if (!key) continue;
      const k = String(key);
      const lower = k.toLowerCase();
      if (!lookup.has(lower)) lookup.set(lower, k);
    }
  }

  canonicalImageIdLookupCache = lookup;
  canonicalImageIdLookupManifestTime = manifestCacheTime;
  canonicalImageIdLookupMapTime = imageIdMapCacheTime;
  return lookup;
}

function resolveCanonicalImageId(imageId, manifest, imageIdMap) {
  if (!imageId) return null;

  if (manifest && Object.prototype.hasOwnProperty.call(manifest, imageId)) {
    return imageId;
  }
  if (imageIdMap && Object.prototype.hasOwnProperty.call(imageIdMap, imageId)) {
    return imageId;
  }

  const lookup = getCanonicalImageIdLookup(manifest, imageIdMap);
  return lookup.get(String(imageId).toLowerCase()) || null;
}

async function createBranded404Response(request) {
  try {
    const reqUrl = new URL(request.url);
    const notFoundUrl = `${reqUrl.origin}/404.html`;
    const pageResp = await fetch(notFoundUrl, { method: 'GET' });

    if (pageResp && (pageResp.ok || pageResp.status === 404)) {
      const headers = new Headers(pageResp.headers);
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      if (!headers.get('Content-Type')) {
        headers.set('Content-Type', 'text/html; charset=utf-8');
      }

      return new Response(pageResp.body, {
        status: 404,
        headers
      });
    }
  } catch (e) {
    console.error('Branded 404 fetch error:', e);
  }

  return new Response('Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

/**
 * Policy:
 * - If image exists:
 *   - If wrong gallery path -> 301 to canonical (from imageIdMap)
 *   - If case mismatch -> 301 to canonical casing
 *   - Else -> pass through (return null)
 * - If image missing:
 *   - 404 Not Found (never existed)
 *   (410 reserved for ghost sentinel i-k4studios and explicit _redirects only)
 */
async function handleImagePagePolicy(request, pathname, ctx, env) {
  const imageId = extractImageId(pathname);
  if (!imageId) return null;

  // Ghost image ID is a UI sentinel (state management) and should never be a real page.
  // If someone requests a URL ending in i-k4studios, it's always junk traffic.
  if (String(imageId).toLowerCase() === GHOST_IMAGE_ID.toLowerCase()) {
    const isSearch = isSearchBot(request);

    // Always return 404 for ghost sentinel to keep behavior identical for
    // crawlers and human viewers.
    ctx.waitUntil(logEdgeEvent(env, '404', pathname, imageId, isSearch, request));
    return await createBranded404Response(request);
  }

  // Preserve query string across canonical redirects (e.g., ?k4debug=1)
  let search = '';
  try {
    search = new URL(request.url).search || '';
  } catch (_) {
    search = '';
  }

  try {
    const [manifest, imageIdMap] = await Promise.all([
      getManifest(ctx),
      getImageIdMap(ctx)
    ]);

    const isSearch = isSearchBot(request);

    const canonicalImageId = resolveCanonicalImageId(imageId, manifest, imageIdMap);

    // Image exists (exact or case-insensitive canonical match)
    if (canonicalImageId) {
      const validPathsRaw = imageIdMap ? (imageIdMap[canonicalImageId] || imageIdMap[imageId]) : null;
      const requestedGalleryPath = getParentGallery(pathname);
      const requestedLower = String(requestedGalleryPath || '').toLowerCase();
      const knownGallerySet = getKnownGallerySetFromImageIdMap(imageIdMap);
      const isKnownGalleryExact = knownGallerySet.has(requestedLower);
      const isKnownGalleryMissingLeaf = knownGallerySet.has(`${requestedLower}/gallery`);

      if (!isKnownGalleryExact && !isKnownGalleryMissingLeaf) {
        ctx.waitUntil(logEdgeEvent(env, '404', pathname, imageId, isSearch, request));
        return await createBranded404Response(request);
      }

      if (validPathsRaw) {
        const validPaths = Array.isArray(validPathsRaw) ? validPathsRaw : [validPathsRaw];
        const matchedPath = validPaths.find(p => (p || "").toLowerCase() === requestedLower);

        // Wrong path entirely:
        // - If the request is structurally shallower than a canonical path for this imageId
        //   (requested gallery path is a strict prefix of a canonical gallery path), treat it
        //   as mutation-probing and return a cheap cacheable 404.
        // - Otherwise, canonicalize to the first known valid path (preserve link equity).
        if (!matchedPath) {
          const galleryLeafPath = validPaths.find(p => {
            const pl = String(p || '').toLowerCase();
            return pl === `${requestedLower}/gallery`;
          });

          if (galleryLeafPath) {
            const canonicalUrl = `https://www.k4studios.com${galleryLeafPath}/${canonicalImageId}${search}`;
            ctx.waitUntil(logEdgeEvent(env, '301', pathname, imageId, isSearch, request));
            return Response.redirect(canonicalUrl, 301);
          }

          const requestedPrefixLower = `${requestedLower}/`;
          const isMissingLeafProbe = validPaths.some(p => {
            const pl = String(p || '').toLowerCase();
            return pl.length > requestedLower.length && pl.startsWith(requestedPrefixLower);
          });

          if (isMissingLeafProbe) {
            // Image ID is valid and canonical path is known. For missing-leaf requests,
            // prefer canonical 301 recovery over 404 so search engines consolidate signals.
            const canonicalMissingLeafPath = validPaths.find(p => {
              const pl = String(p || '').toLowerCase();
              return pl.startsWith(requestedPrefixLower);
            }) || validPaths[0];
            if (canonicalMissingLeafPath) {
              const canonicalUrl = `https://www.k4studios.com${canonicalMissingLeafPath}/${canonicalImageId}${search}`;
              ctx.waitUntil(logEdgeEvent(env, '301', pathname, imageId, isSearch, request));
              return Response.redirect(canonicalUrl, 301);
            }
          }

          const canonicalUrl = `https://www.k4studios.com${validPaths[0]}/${canonicalImageId}${search}`;
          // Log edge event (fire and forget via waitUntil)
          ctx.waitUntil(logEdgeEvent(env, '301', pathname, imageId, isSearch, request));
          return Response.redirect(canonicalUrl, 301);
        }

        // Case/path mismatch or image-id case mismatch -> redirect to canonical casing.
        if (matchedPath !== requestedGalleryPath || canonicalImageId !== imageId) {
          const canonicalUrl = `https://www.k4studios.com${matchedPath}/${canonicalImageId}${search}`;
          // Log edge event (fire and forget via waitUntil)
          ctx.waitUntil(logEdgeEvent(env, '301', pathname, imageId, isSearch, request));
          return Response.redirect(canonicalUrl, 301);
        }
      } else if (canonicalImageId !== imageId) {
        const canonicalUrl = `https://www.k4studios.com${requestedGalleryPath}/${canonicalImageId}${search}`;
        ctx.waitUntil(logEdgeEvent(env, '301', pathname, imageId, isSearch, request));
        return Response.redirect(canonicalUrl, 301);
      }

      // Correct path -> pass through to origin static page
      return null;
    }

    // Image missing
    // Missing image:
    // - 404 for everyone (same behavior for crawlers and humans).
    // WHY 404 not 410: These IDs never existed — they're probe traffic or stale
    // references, not intentionally deleted content. 410 signals permanent removal
    // of something that *was* real, which poisons crawl trust at scale.
    // 410 is reserved for the ghost sentinel (i-k4studios) and explicit _redirects.
    ctx.waitUntil(logEdgeEvent(env, '404', pathname, imageId, isSearch, request));
    return await createBranded404Response(request);

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

    // EDGE REFERRER CAPTURE: Maintain k4_entry_ref on true top-level navigations.
    // Goal: capture the *external* entry source before SPA navigation loses it,
    // while also clearing stale external attribution on bookmark/typed visits.
    const cookies = request.headers.get("cookie") || "";

    // Only set cookie on true top-level navigation (not SPA transitions or iframes)
    const isTopLevelNav =
      request.headers.get("Sec-Fetch-Dest") === "document" &&
      request.headers.get("Sec-Fetch-Mode") === "navigate";

    if (isTopLevelNav) {
      // Capture the raw referrer from the edge (most reliable source)
      // Store the full URL so SQL can distinguish google_images vs google_search, etc.
      const edgeReferer = request.headers.get("referer") || "";

      const cookieMatch = cookies.match(/(?:^|;\s*)k4_entry_ref=([^;]+)/);
      const existingCookieValue = cookieMatch ? cookieMatch[1] : null;

      // Do not treat internal navigation as a new "entry".
      let isInternalReferer = false;
      try {
        if (edgeReferer) {
          const u = new URL(edgeReferer);
          const host = (u.hostname || '').toLowerCase();
          isInternalReferer = host === 'localhost' || host === '127.0.0.1' || host.endsWith('k4studios.com');
        }
      } catch {
        isInternalReferer = false;
      }

      // Overwrite rules:
      // - No referer (bookmark/typed/new-tab) => overwrite to direct (clears stale Google).
      // - External referer => overwrite to that referer (new entry source).
      // - Internal referer => do not overwrite.
      const desiredCookieValue = edgeReferer ? encodeURIComponent(edgeReferer) : 'direct';
      const shouldSetCookie = (!edgeReferer || !isInternalReferer) && existingCookieValue !== desiredCookieValue;
      if (shouldSetCookie) {
        const cookieValue = desiredCookieValue;

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
  }

  console.log("PROXY TARGET (default):", request.url);
  return fetch(request);
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
        INSERT OR REPLACE INTO serp_results 
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
    
    const authHeader = request.headers.get('Authorization');
    const html = renderSerpDashboard({
      days,
      keywords: keywords.results || [],
      latestResults: latestResults.results || [],
      previousMap: prevMap,
      trendByKeyword,
      authHeader
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
              <button onclick="logRank(this, ${idx}, '${safeKw}')" class="btn-log${hasLogged ? ' logged' : ''}">💾 Save</button>
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
    
    const authHeaderLp = ${JSON.stringify(request.headers.get('Authorization') || '')};

    async function logRank(btn, idx, keyword) {
      const gRank = document.getElementById('g-' + idx).value || null;
      const gaiRank = document.getElementById('gai-' + idx).value || null;
      const bRank = document.getElementById('b-' + idx).value || null;
      
      if (!gRank && !gaiRank && !bRank) {
        alert('Enter at least one rank');
        return;
      }
      
      btn.disabled = true;
      btn.textContent = 'Saving…';
      
      try {
        const res = await fetch('/__k4serp?op=log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeaderLp },
          body: JSON.stringify({ 
            keyword, 
            google: gRank ? parseInt(gRank) : null,
            google_ai: gaiRank ? parseInt(gaiRank) : null,
            bing: bRank ? parseInt(bRank) : null
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to save');

        btn.textContent = 'Saved';
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
        }, 1200);
      } catch (e) {
        btn.textContent = 'Error';
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

function renderSerpDashboard({ days, keywords, latestResults, previousMap, trendByKeyword, authHeader }) {
  // Group results by keyword, then by engine
  const byKeywordEngine = {};
  for (const r of latestResults) {
    if (!byKeywordEngine[r.keyword]) byKeywordEngine[r.keyword] = {};
    byKeywordEngine[r.keyword][r.engine] = r;
  }
  
  const getValidRank = (rank) => {
    const n = Number(rank);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  const ranksByEngine = (engine) =>
    latestResults
      .filter(r => r.engine === engine)
      .map(r => getValidRank(r.our_rank))
      .filter(Boolean);

  const avg = (nums) => (nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : null);

  const googleRanks = ranksByEngine('google');
  const googleAiRanks = ranksByEngine('google_ai');
  const bingRanks = ranksByEngine('bing');

  const avgGoogle = avg(googleRanks);
  const avgGoogleAi = avg(googleAiRanks);
  const avgBing = avg(bingRanks);

  const lastCheck = latestResults.reduce((max, r) => !max || r.checked_at > max ? r.checked_at : max, null);
  const rankedGoogleCount = googleRanks.length;
  const rankedGoogleAiCount = googleAiRanks.length;
  const rankedBingCount = bingRanks.length;
  
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
    const recentTrend = trend.slice(-14);
    const sparkline = recentTrend.map(t => {
      const v = getValidRank(t.rank) ?? MAX_RANK;
      return Math.min(MAX_RANK, Math.max(1, v));
    });

    const validRecent = recentTrend.map(t => getValidRank(t.rank)).filter(Boolean);
    const trendPoints = validRecent.length;
    const trendStart = trendPoints ? validRecent[0] : null;
    const trendEnd = trendPoints ? validRecent[validRecent.length - 1] : null;

    let trendPct = null;
    if (trendStart && trendEnd && trendStart > 0 && trendStart !== trendEnd) {
      // Lower rank is better => improvement = start - end
      trendPct = ((trendStart - trendEnd) / trendStart) * 100;
    }

    const trendBadge = (() => {
      if (!trendPoints) return '<span style="color:#666">n=0</span>';
      if (trendPct === null) return `<span style="color:#666">n=${trendPoints}</span>`;
      const isBetter = trendPct > 0;
      const color = isBetter ? '#10b981' : '#ef4444';
      const arrow = isBetter ? '▲' : '▼';
      return `<span style="color:${color}; font-weight:600">${arrow}${Math.abs(trendPct).toFixed(1)}% <span style="color:#666;font-weight:400">(n=${trendPoints})</span></span>`;
    })();
    
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
          <div style="display:flex;align-items:center;gap:10px">
            ${sparkline.length > 1 ? `
              <svg class="sparkline" viewBox="0 0 70 20" preserveAspectRatio="none">
                <polyline fill="none" stroke="#4a9eff" stroke-width="1.5" points="${
                  sparkline.map((v, i) => `${i * (70 / Math.max(sparkline.length - 1, 1))},${((v - 1) / (MAX_RANK - 1)) * 20}`).join(' ')
                }"/>
              </svg>
            ` : '<span style="color:#666">-</span>'}
            ${trendBadge}
          </div>
        </td>
        <td style="text-align:center">
          <button
            onclick="deleteKeyword('${escapeHtml(kw.keyword)}')"
            title="Remove keyword"
            style="background:none;border:1px solid #444;border-radius:6px;color:#ef4444;cursor:pointer;padding:2px 8px"
          >✕</button>
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
    <a href="/__k4serp?op=launch">🚀 Launch Pad</a>
    <a href="/__k4stats">? Analytics</a>
  </h1>
  
  <div class="controls">
    <button class="primary" onclick="fetchNow()">Fetch Now</button>
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
    <div class="stat ${avgGoogle && avgGoogle <= 10 ? 'good' : ''}">
      <div class="value">${avgGoogle ? avgGoogle.toFixed(1) : '-'}</div>
      <div class="label">Avg Google (n=${rankedGoogleCount})</div>
    </div>
    <div class="stat ${avgGoogleAi && avgGoogleAi <= 10 ? 'good' : ''}">
      <div class="value">${avgGoogleAi ? avgGoogleAi.toFixed(1) : '-'}</div>
      <div class="label">Avg G-AI (n=${rankedGoogleAiCount})</div>
    </div>
    <div class="stat ${avgBing && avgBing <= 10 ? 'good' : ''}">
      <div class="value">${avgBing ? avgBing.toFixed(1) : '-'}</div>
      <div class="label">Avg Bing (n=${rankedBingCount})</div>
    </div>
    <div class="stat">
      <div class="value">${rankedGoogleCount}/${keywords.length}</div>
      <div class="label">Google Ranking</div>
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
        <th>14-Day Trend <span style="font-weight:400;color:#666">(↓ rank is better)</span></th>
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
    const _authHeader = ${JSON.stringify(authHeader || '')};

    async function fetchNow() {
      const btn = document.querySelector('.controls button.primary');
      if (!btn) return;
      const prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Fetching…';
      try {
        const res = await fetch('/__k4serp?op=fetch', {
          method: 'POST',
          headers: { 'Authorization': _authHeader }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || ('Fetch failed (' + res.status + ')'));
        }
        location.reload();
      } catch (err) {
        alert(err?.message || 'Fetch failed');
      } finally {
        btn.disabled = false;
        btn.textContent = prev;
      }
    }

    async function addKeyword() {
      const keyword = document.getElementById('newKeyword').value.trim();
      if (!keyword) return alert('Enter a keyword');
      
      const res = await fetch('/__k4serp?op=keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': _authHeader },
        body: JSON.stringify({ action: 'add', keyword })
      });
      if (res.ok) location.reload();
      else { const d = await res.json().catch(() => null); alert(d?.error || 'Error adding keyword (' + res.status + ')'); }
    }
    
    async function deleteKeyword(keyword) {
      if (!confirm('Delete "' + keyword + '"?')) return;
      
      const res = await fetch('/__k4serp?op=keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': _authHeader },
        body: JSON.stringify({ action: 'delete', keyword })
      });
      if (res.ok) location.reload();
      else { const d = await res.json().catch(() => null); alert(d?.error || 'Error deleting keyword (' + res.status + ')'); }
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

    // -----------------------------------------------------
    // Legacy namespace trust + probe rejection (ingress)
    // -----------------------------------------------------
    // Policy:
    // - Trust known legacy namespaces (e.g., /Photography-Galleries/) and let image-page policy handle canonicalization.
    // - Reject unknown /i-xxxxx URLs outside known namespaces as crawler probes (cheap 404, no slash-normalization).
    const path = url.pathname;
    const lowerPath = path.toLowerCase();

    // Legacy SmugMug keyword URL junk should always be hard-404.
    // Prevents homepage fallback with junk path preserved in the address bar.
    if (/(^|\/)keyword(?:\/|$)/i.test(path)) {
      return await createBranded404Response(request);
    }

    // Legacy Photoshootsandevents → SmugMug archive (301).
    // Must run BEFORE the imageIdAtEnd namespace guard, which would 404
    // /Photoshootsandevents/.../i-xxx as an unknown namespace.
    if (/^\/Photoshootsandevents(\/|$)/i.test(path)) {
      return Response.redirect('https://wayne-heim.smugmug.com/Other/Photo-Shoots', 301);
    }

    // Legacy /Other/Photo-Shoots* → SmugMug archive (301, preserve full path).
    // These are old SmugMug gallery URLs that no longer exist on k4studios.
    // Must run before the image-page pipeline which would 404 on unknown image IDs.
    if (/^\/Other\/Photo-Shoots/i.test(path)) {
      return Response.redirect('https://wayne-heim.smugmug.com' + path, 301);
    }

    // Bare /Galleries/lightbox (no ?dataset=) is a dead SmugMug endpoint → 410.
    // Lightbox WITH ?dataset= is a real gallery page — pass through to origin.
    if (lowerPath === '/galleries/lightbox' && !url.searchParams.has('dataset')) {
      return new Response('Gone', {
        status: 410,
        headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, max-age=86400' }
      });
    }

    const imageIdAtEnd = /\/(i-[a-zA-Z0-9-]+)\/?$/.test(path);
    const isLegacyNamespace = path === '/Photography-Galleries' || path.startsWith('/Photography-Galleries/');
    const isKnownNamespace =
      isLegacyNamespace ||
      path.startsWith('/Galleries/') ||
      path.startsWith('/Other/') ||
      path.startsWith('/galleries/') ||
      path.startsWith('/other/');

    if (imageIdAtEnd && !isKnownNamespace) {
      return await createBranded404Response(request);
    }

    // =====================================================
    // LEGACY Traditional-Photos → Fine-Art-Photography REDIRECTS
    // "Traditional-Photos" was the old SmugMug name for what is now
    // "Fine-Art-Photography" on the new site. Simple segment swap covers
    // every sub-path and image-level URL universally.
    //
    // Why at the worker: Netlify _redirects had a catch-all that served the
    // homepage body with 410 status — users saw the homepage on a dead URL.
    // Handling here gives instant effect without a site rebuild.
    // =====================================================
    if (/\/traditional-photos(?:\/|$)/i.test(path)) {
      const rewritten = path.replace(/\/Traditional-Photos/i, '/Fine-Art-Photography');
      return Response.redirect(`https://www.k4studios.com${rewritten}`, 301);
    }

    // =====================================================
    // INVALID GALLERY IMAGE PATH GUARD (EARLY)
    // Prevent crawler structure guessing from burning worker.
    //
    // NOTE: K4 has legitimate image pages like /Galleries/.../Color/i-xxxxx.
    // This guard intentionally targets only the shallow guessed shape seen in crawls:
    //   /Galleries/<slug>/i-xxxxx
    //
    // Ordering note:
    // - This runs BEFORE trailing-slash canonicalization so we don't spend a 301 on junk.
    // =====================================================
    if (/^\/(?:Galleries|galleries)\/[^/]+\/i-[a-zA-Z0-9-]+\/?$/.test(path)) {
      return await createBranded404Response(request);
    }

    // Missing-leaf probe detection is handled universally in image-page policy
    // via imageIdMap comparison (no gallery-specific hardcoding here).

    // 0) Canonicalize trailing slashes (except root) at ingress.
    // This should run before any routing/DB/image-policy logic executes.
    if (path.length > 1 && path.endsWith('/')) {
      url.pathname = path.replace(/\/+$/g, '');
      return Response.redirect(url.toString(), 301);
    }
    
    // === VISITOR ID (Single Population Doctrine) ===
    // Every request gets a visitor_id. Cookie ensures 1 browser = 1 human.
    const { visitorId, isNew: visitorIdIsNew } = getOrCreateVisitorId(request);

    // 0) Bot short-circuit for /track — prevent Netlify function burn
    // Verified bots (Googlebot, Applebot, Bingbot, etc.) get 204 No Content
    // Humans still hit the function. Bots never do.
    if (
      url.pathname.startsWith('/track') &&
      request.cf?.botManagement?.verifiedBot
    ) {
      return new Response(null, { status: 204 });
    }

    // 0a) Analytics tracking endpoints — delegated to analytics worker
    // NOTE: Client uses /__k4e as a less-adblock-prone alias.
    if (url.pathname === "/track" || url.pathname === "/__k4e") {
      if (env.ANALYTICS_ENABLED === "true" && env.ANALYTICS) {
        return env.ANALYTICS.fetch(request);
      }
      if (request.method === "OPTIONS") return handleTrackOptions();
      return handleTrackRequest(request, env, ctx);
    }

    if (url.pathname === "/edge-event") {
      if (env.ANALYTICS_ENABLED === "true" && env.ANALYTICS) {
        return env.ANALYTICS.fetch(request);
      }
      return handleEdgeEvent(request, env);
    }

    // 0a2) State pixels — delegated to analytics worker
    if (url.pathname === "/_state") {
      if (env.ANALYTICS_ENABLED === "true" && env.ANALYTICS) {
        return env.ANALYTICS.fetch(request);
      }
      return new Response("Analytics delegation required", { status: 503 });
    }

    // 0b) Analytics — all /__k4stats paths delegated to analytics worker
    if (url.pathname.startsWith("/__k4stats")) {
      if (env.ANALYTICS_ENABLED === "true" && env.ANALYTICS) {
        return env.ANALYTICS.fetch(request);
      }
      // Fallback: run dashboard locally if delegation disabled
      if (url.pathname === "/__k4stats") {
        return handleDashboardRequest(request, env, ctx);
      }
      return new Response("Analytics delegation required", { status: 503 });
    }

    // 0g) SERP Tracker — route all SERP sub-paths here so they work
    //     even when only /__k4serp is in the Cloudflare route table.
    if (url.pathname === "/__k4serp" || url.pathname.startsWith("/__k4serp/")) {
      const subPath = url.pathname.replace("/__k4serp", "") || "/";
      // Also support ?op= query param for when sub-paths don't reach the worker
      const op = url.searchParams.get("op") || subPath;

      // POST sub-routes
      if (request.method === "POST") {
        if (op === "/keyword" || op === "keyword") return handleSerpKeyword(request, env);
        if (op === "/fetch"   || op === "fetch")   return handleSerpFetch(request, env);
        if (op === "/log"     || op === "log")     return handleSerpLog(request, env);
      }

      // GET sub-routes
      if (op === "/launch" || op === "launch") return handleSerpLaunch(request, env);

      // Default: dashboard
      return handleSerpDashboard(request, env);
    }

    // 1) Image detail pages: apply policy first, then log art view
    if (isImagePageRoute(url.pathname)) {
      const policyResponse = await handleImagePagePolicy(request, url.pathname, ctx, env);
      if (policyResponse) return addVisitorIdCookie(policyResponse, visitorId, visitorIdIsNew, request);
      
      // Log image page view (someone viewing an image detail page)
      const imageId = extractImageId(url.pathname);
      if (imageId && env?.DB) {
        ctx.waitUntil(logArtView(env, 'image_page', imageId, request, null, 'proxy', visitorId));
        
        // No k4_vid cookie = external/bot/no-JS access (not a returning human)
        // These get their own classification separate from chapter_view
        if (visitorIdIsNew) {
          ctx.waitUntil(logArtView(env, 'external_image_page', imageId, request, null, 'proxy', visitorId));
        }
      }
      
      const response = await fetch(request);
      if (response.status === 404) {
        const branded404 = await createBranded404Response(request);
        return addVisitorIdCookie(branded404, visitorId, visitorIdIsNew, request);
      }
      return addVisitorIdCookie(response, visitorId, visitorIdIsNew, request);
    }

    // 2) Gallery pages: pass through.
    // Gallery views are tracked via JS (/track → gallery_view). Do not double-log here.
    if ((url.pathname.startsWith("/Galleries/") || url.pathname.startsWith("/Other/") || url.pathname.startsWith("/galleries/") || url.pathname.startsWith("/other/")) && 
        !url.pathname.includes("/i-")) {
      const response = await fetch(request);
      return addVisitorIdCookie(response, visitorId, visitorIdIsNew, request);
    }

    // 3) /img proxy routes — no cookie for binary image responses
    if (url.pathname.startsWith("/proxy/")) {
      const rewritten = rewriteLegacyProxyToImgRequest(request);
      if (!rewritten) {
        return new Response("Invalid proxy route", {
          status: 400,
          headers: { "Cache-Control": "no-store" }
        });
      }
      return handleImageRequest(rewritten, ctx, env);
    }

    if (url.pathname.startsWith("/img/")) {
      return handleImageRequest(request, ctx, env);
    }

    // 4) Everything else: gateway firewall
    try {
      console.log("PROXY TARGET (gateway):", request.url);
      const response = await handleGatewayRequest(request, env);
      return addVisitorIdCookie(response, visitorId, visitorIdIsNew, request);
    } catch (err) {
      console.error("Gateway error (failing open):", err);
      console.log("PROXY TARGET (fallback):", request.url);
      const response = await fetch(request);
      return addVisitorIdCookie(response, visitorId, visitorIdIsNew, request);
    }
  }
};
