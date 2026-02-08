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
 * 2) Bots may influence indexing ONLY via status codes on IMAGE PAGES (301/410), never image bytes.
 * 3) Never redirect to SmugMug. Never leak origin URLs.
 *
 * Responsibilities:
 * - /img/{id}/{size} - proxy image bytes from SmugMug using image-manifest.json
 * - Image pages (/Galleries/, /Other/) - canonicalization + 410 policy
 * - Gateway layer - country block (HTML only), scraper UA block (HTML only)
 * - /track - analytics event ingestion (POST)
 * - /admin/analytics - password-protected analytics dashboard
 */

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

// --------------------
// GATEWAY BOT / SCRAPER LOGIC
// --------------------
const ALLOWED_BOTS =
  /(googlebot|google-inspectiontool|adsbot-google|googleother|apis-google|bingbot|bingpreview|msnbot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|ahrefssiteaudit|semrushbot|screaming\s*frog|sitebulb|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot|slackbot|discordbot|telegrambot|uptimerobot|uptime[- ]?kuma)/i;

const BLOCKED_BOTS =
  /(python|curl|scrapy|spider(?!.*google)|httpclient|axios|wget|postman|libwww-perl|powershell|java\/|node-fetch|okhttp)/i;

const ALWAYS_ALLOWED = [
  "/sitemap.xml",
  "/robots.txt",
  "/e05ffc8ff8004372b01c0e153ba16b44.txt" // IndexNow key
];

// Search bots for IMAGE PAGE 410 policy (narrower, intentionally)
const SEARCH_BOT_PATTERN =
  /(googlebot|google-inspectiontool|googleother|bingbot|bingpreview|msnbot|duckduckbot|yandex|baiduspider|slurp|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot)/i;

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

async function handleImageRequest(request, ctx) {
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

  try {
    const manifest = await getManifest(ctx);
    const smugMugUrl = resolveImageUrl(manifest, route.imageId, route.size);

    if (!smugMugUrl) {
      return new Response("Image not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" }
      });
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

function isSearchBot(request) {
  const ua = request.headers.get("User-Agent") || "";
  return SEARCH_BOT_PATTERN.test(ua);
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
async function handleImagePagePolicy(request, pathname, ctx) {
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
          return Response.redirect(canonicalUrl, 301);
        }

        // Case mismatch -> redirect to canonical casing
        if (matchedPath !== requestedGalleryPath) {
          const canonicalUrl = `https://www.k4studios.com${matchedPath}/${imageId}`;
          return Response.redirect(canonicalUrl, 301);
        }
      }

      // Correct path -> pass through to origin static page
      return null;
    }

    // Image missing
    const parentGallery = getParentGallery(pathname);

    if (isSearchBot(request)) {
      return new Response("Gone", {
        status: 410,
        headers: {
          "X-Robots-Tag": "noindex",
          "Cache-Control": "public, max-age=86400" // 1 day
        }
      });
    }

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
    return fetch(request);
  }

  // Allow known bots through gateway (they still get image-page policy)
  if (ALLOWED_BOTS.test(ua)) {
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
      // Capture the referrer from the edge (most reliable source)
      const edgeReferer = request.headers.get("referer") || "";
      const normalizedRef = normalizeReferrer(edgeReferer);
      
      // Log for debugging (remove after confirming)
      console.log("Edge referrer capture:", { raw: edgeReferer, normalized: normalizedRef });
      
      // Fetch the origin response
      const originResponse = await fetch(request);
      
      // Clone response and add the cookie
      const newResponse = new Response(originResponse.body, originResponse);
      newResponse.headers.append(
        "Set-Cookie",
        `k4_entry_ref=${normalizedRef}; Max-Age=3600; Path=/; Secure; SameSite=Lax`
      );
      return newResponse;
    }
  }

  return fetch(request);
}

// --------------------
// ANALYTICS: /track ENDPOINT
// --------------------
function normalizeReferrer(referer) {
  if (!referer) return "unknown";
  const lower = referer.toLowerCase();
  
  // Handle already-normalized values (from cookie)
  if (lower === "google" || lower === "bing" || lower === "facebook" || 
      lower === "instagram" || lower === "twitter" || lower === "pinterest" || 
      lower === "linkedin" || lower === "internal" || lower === "direct" || 
      lower === "unknown" || lower === "other") {
    return lower;
  }
  
  // Normalize full URLs
  if (lower.includes("google.") || lower.includes("google/")) return "google";
  if (lower.includes("bing.")) return "bing";
  if (lower.includes("facebook.") || lower.includes("fb.")) return "facebook";
  if (lower.includes("instagram.")) return "instagram";
  if (lower.includes("twitter.") || lower.includes("x.com")) return "twitter";
  if (lower.includes("pinterest.")) return "pinterest";
  if (lower.includes("linkedin.")) return "linkedin";
  if (lower.includes("k4studios.com")) return "internal";
  return "other";
}

async function handleTrackRequest(request, env) {
  // Only accept POST
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
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
      page_path = null
    } = body;

    // Event is required
    if (!event) {
      return new Response("Missing event", { status: 400 });
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
    // Fall back to client-sent referrer, then treat as unknown
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/k4_entry_ref=([^;]+)/);
    const edgeReferrer = cookieMatch ? cookieMatch[1] : null;
    
    // Prefer edge-captured referrer, then client, then unknown
    const referrer = normalizeReferrer(edgeReferrer || clientReferrer);

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
      INSERT INTO events (session_id, event, gallery_id, image_id, page_type, referrer, country, region, city, ip, device, page_path, theme, raw_referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      clientReferrer  // Store raw referrer for debugging
    ).run();

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
// ANALYTICS: /admin/analytics DASHBOARD
// --------------------
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
    headers: {
      "WWW-Authenticate": 'Basic realm="K4 Analytics"',
      "Content-Type": "text/plain"
    }
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
  const galleryFilter = url.searchParams.get("gallery") || null;
  const excludeIp = url.searchParams.get("excludeIp") || null;

  // Get viewer's current IP for the "exclude me" button
  const viewerIp = request.headers.get("CF-Connecting-IP") || 
                   request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || 
                   null;

  try {
    // Build date filter (adjusted for Eastern Time, UTC-5)
    // Use date() comparison for calendar day matching in Eastern time
    let dateClause;
    if (yesterday) {
      // Yesterday = Eastern calendar day before today
      dateClause = `date(created_at, '-5 hours') = date('now', '-5 hours', '-1 day')`;
    } else if (days === 1) {
      // Today = current Eastern calendar day
      dateClause = `date(created_at, '-5 hours') = date('now', '-5 hours')`;
    } else {
      // Last N days (rolling window from now)
      dateClause = `created_at > datetime('now', '-5 hours', '-${days} days')`;
    }
    const galleryClause = galleryFilter ? `AND gallery_id = '${galleryFilter}'` : "";
    const ipClause = excludeIp ? `AND (ip IS NULL OR ip != '${excludeIp}')` : "";

    // Query 1: Summary stats
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT ip) as unique_visitors,
        COUNT(*) as total_events,
        ROUND(1.0 * COUNT(*) / NULLIF(COUNT(DISTINCT session_id), 0), 1) as avg_events_per_session,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN event IN ('nav_next', 'nav_prev') THEN session_id END) / 
          NULLIF(COUNT(DISTINCT session_id), 0), 1) as pct_navigated,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN event = 'zoom_open' THEN session_id END) / 
          NULLIF(COUNT(DISTINCT session_id), 0), 1) as pct_zoomed,
        COUNT(CASE WHEN event = 'collector_notes_open' THEN 1 END) as collector_notes_opens
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause}
    `;
    const summary = await env.DB.prepare(summaryQuery).first();

    // Query 1b: New vs returning visitors (IPs seen before this period)
    const returningQuery = `
      SELECT COUNT(DISTINCT e.ip) as returning_visitors
      FROM events e
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')} ${ipClause.replace(/ip/g, 'e.ip')}
        AND e.ip IN (
          SELECT DISTINCT ip FROM events 
          WHERE created_at < datetime('now', '-5 hours', '-${days} days')
        )
    `;
    const returningResult = await env.DB.prepare(returningQuery).first();
    const returningVisitors = returningResult?.returning_visitors || 0;
    const newVisitors = (summary?.unique_visitors || 0) - returningVisitors;

    // Query 2: Event breakdown
    const eventsQuery = `
      SELECT event, COUNT(*) as count 
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause}
      GROUP BY event 
      ORDER BY count DESC
      LIMIT 20
    `;
    const events = await env.DB.prepare(eventsQuery).all();

    // Query 3: Entry effectiveness (cowboy_jump has its own callout)
    const entryQuery = `
      SELECT 
        event as entry_source,
        COUNT(DISTINCT session_id) as sessions
      FROM events 
      WHERE ${dateClause} ${ipClause}
        AND event IN ('gallery_hero_click', 'gallery_explore_click', 'gallery_preview_click', 'theme_click')
      GROUP BY event 
      ORDER BY sessions DESC
    `;
    const entries = await env.DB.prepare(entryQuery).all();

    // Query 4: Gallery performance (exclude Cowboy_Jump_Home which isn't a real gallery)
    const galleryQuery = `
      SELECT 
        gallery_id,
        COUNT(DISTINCT session_id) as sessions,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN event = 'zoom_open' THEN session_id END) / 
          NULLIF(COUNT(DISTINCT session_id), 0), 1) as zoom_pct,
        ROUND(1.0 * COUNT(*) / NULLIF(COUNT(DISTINCT session_id), 0), 1) as avg_events
      FROM events 
      WHERE ${dateClause} AND gallery_id IS NOT NULL AND gallery_id != 'Cowboy_Jump_Home' ${ipClause}
      GROUP BY gallery_id 
      ORDER BY sessions DESC
      LIMIT 15
    `;
    const galleries = await env.DB.prepare(galleryQuery).all();

    // Query 5: Referrers
    const referrerQuery = `
      SELECT referrer, COUNT(DISTINCT session_id) as sessions
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause}
      GROUP BY referrer 
      ORDER BY sessions DESC
    `;
    const referrers = await env.DB.prepare(referrerQuery).all();

    // Query 6: Geography (unique visitors by location)
    const geoQuery = `
      SELECT country, region, city, COUNT(DISTINCT ip) as visitors
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause}
      GROUP BY country, region, city 
      ORDER BY visitors DESC
      LIMIT 25
    `;
    const geo = await env.DB.prepare(geoQuery).all();

    // Query 7: Daily trend (for chart) - includes both visitors and sessions
    // Use Eastern time offset for date grouping to match the filter
    const trendQuery = `
      SELECT 
        DATE(created_at, '-5 hours') as day,
        COUNT(DISTINCT ip) as visitors,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) as events
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause}
      GROUP BY DATE(created_at, '-5 hours')
      ORDER BY day ASC
    `;
    const trend = await env.DB.prepare(trendQuery).all();

    // Query 8: Device/Platform breakdown
    const deviceQuery = `
      SELECT device, COUNT(DISTINCT session_id) as sessions
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause}
      GROUP BY device 
      ORDER BY sessions DESC
    `;
    const devices = await env.DB.prepare(deviceQuery).all();

    // Query 9: Top pages
    // Query 9: Top pages (exclude image pages which have /i- pattern)
    const pagesQuery = `
      SELECT page_path, COUNT(DISTINCT session_id) as sessions, COUNT(*) as events
      FROM events 
      WHERE ${dateClause} ${ipClause} 
        AND page_path IS NOT NULL
        AND page_path NOT LIKE '%/i-%'
      GROUP BY page_path 
      ORDER BY sessions DESC
      LIMIT 10
    `;
    const pages = await env.DB.prepare(pagesQuery).all();

    // Query 10: Most popular images (use page_path with /i- pattern for actual page visits)
    const imagesQuery = `
      SELECT 
        page_path,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) as events,
        COUNT(CASE WHEN event = 'zoom_open' THEN 1 END) as zooms
      FROM events 
      WHERE ${dateClause} ${ipClause} 
        AND page_path IS NOT NULL
        AND page_path LIKE '%/i-%'
      GROUP BY page_path 
      ORDER BY sessions DESC
      LIMIT 10
    `;
    const images = await env.DB.prepare(imagesQuery).all();

    // Query 11: Top themes clicked
    const themesQuery = `
      SELECT 
        theme,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) as clicks
      FROM events 
      WHERE ${dateClause} ${ipClause} AND theme IS NOT NULL
      GROUP BY theme 
      ORDER BY sessions DESC
      LIMIT 10
    `;
    const themesClicked = await env.DB.prepare(themesQuery).all();

    // Query 12: Cowboy Jump count (separate from galleries)
    const cowboyQuery = `
      SELECT COUNT(DISTINCT session_id) as jumps
      FROM events 
      WHERE ${dateClause} ${ipClause} AND event = 'cowboy_jump'
    `;
    const cowboyResult = await env.DB.prepare(cowboyQuery).first();
    const cowboyJumps = cowboyResult?.jumps || 0;

    // Render HTML
    const html = renderDashboard({
      days,
      yesterday,
      galleryFilter,
      excludeIp,
      viewerIp,
      summary,
      newVisitors,
      returningVisitors,
      cowboyJumps,
      events: events.results || [],
      entries: entries.results || [],
      galleries: galleries.results || [],
      referrers: referrers.results || [],
      geo: geo.results || [],
      trend: trend.results || [],
      devices: devices.results || [],
      pages: pages.results || [],
      images: images.results || [],
      themesClicked: themesClicked.results || []
    });

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });

  } catch (err) {
    console.error("Admin analytics error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
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
      headers: { "WWW-Authenticate": 'Basic realm="K4 Analytics Export"' }
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

    const csv = csvRows.join('\\n');
    const filename = `k4-analytics-${yesterday ? 'yesterday' : days + 'days'}-${new Date().toISOString().slice(0,10)}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(`Export error: ${err.message}`, { status: 500 });
  }
}

function renderDashboard({ days, yesterday, galleryFilter, excludeIp, viewerIp, summary, newVisitors, returningVisitors, cowboyJumps, events, entries, galleries, referrers, geo, trend, devices, pages, images, themesClicked }) {
  const s = summary || {};
  
  // Helper to format event names nicely
  const formatEventName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Calculate max for bar chart scaling
  const maxEventCount = Math.max(...events.map(e => e.count), 1);
  const maxRefSessions = Math.max(...referrers.map(r => r.sessions), 1);
  const maxGeoVisitors = Math.max(...geo.map(g => g.visitors), 1);
  const maxPageSessions = Math.max(...pages.map(p => p.sessions), 1);
  
  // Build base URL for filter links
  const baseParams = new URLSearchParams();
  if (yesterday) {
    baseParams.set("yesterday", "1");
  } else {
    baseParams.set("days", days.toString());
  }
  if (galleryFilter) baseParams.set("gallery", galleryFilter);
  
  // URL with IP exclusion
  const excludeMeUrl = (() => {
    const p = new URLSearchParams(baseParams);
    if (viewerIp) p.set("excludeIp", viewerIp);
    return "?" + p.toString();
  })();
  
  // URL without IP exclusion
  const showAllUrl = (() => {
    const p = new URLSearchParams(baseParams);
    return "?" + p.toString();
  })();
  
  // Label for the footer
  const periodLabel = yesterday ? "Yesterday" : `Last ${days} day(s)`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
    h1 { color: #fff; margin-bottom: 20px; }
    h2 { color: #888; font-size: 14px; text-transform: uppercase; margin: 30px 0 10px; }
    .controls { margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 5px; }
    .controls a { color: #4a9eff; text-decoration: none; padding: 5px 10px; border-radius: 4px; }
    .controls a:hover, .controls a.active { background: #333; }
    .pulse { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; align-items: center; }
    .pulse-stat { background: #252525; padding: 8px 16px; border-radius: 6px; display: flex; align-items: center; gap: 8px; }
    .pulse-stat .value { font-size: 18px; font-weight: bold; color: #4a9eff; }
    .pulse-stat .label { font-size: 11px; color: #888; }
    .pulse-stat.highlight { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
    .pulse-stat.highlight .value { color: #fff; }
    .pulse-stat.highlight .label { color: #fde68a; }
    .pulse-stat.collector { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); }
    .pulse-stat.collector .value { color: #fff; }
    .pulse-stat.collector .label { color: #c4b5fd; }
    table { width: 100%; border-collapse: collapse; background: #252525; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    th, td { padding: 10px 15px; text-align: left; border-bottom: 1px solid #333; }
    th { background: #1a1a1a; color: #888; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
    .section { background: #252525; border-radius: 8px; padding: 15px; }
    .section h3 { color: #fff; font-size: 14px; margin-bottom: 10px; }
    /* Bar chart styles */
    .bar-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #333; }
    .bar-row:last-child { border-bottom: none; }
    .bar-label { min-width: 120px; font-size: 13px; color: #ccc; }
    .bar-container { flex: 1; background: #1a1a1a; border-radius: 4px; height: 20px; margin: 0 10px; overflow: hidden; }
    .bar { height: 100%; background: linear-gradient(90deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px; transition: width 0.3s ease; }
    .bar-value { min-width: 50px; text-align: right; font-size: 13px; color: #888; }
    .bar-orange .bar { background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); }
    .bar-green .bar { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
    /* Trend chart styles */
    .trend-chart { background: #252525; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .trend-chart h3 { color: #fff; font-size: 14px; margin-bottom: 15px; }
    .trend-bars { display: flex; align-items: flex-end; gap: 4px; height: 100px; padding-bottom: 25px; position: relative; }
    .trend-bar { flex: 1; min-width: 20px; max-width: 60px; background: linear-gradient(180deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px 4px 0 0; position: relative; cursor: pointer; transition: opacity 0.2s; }
    .trend-bar:hover { opacity: 0.8; }
    .trend-bar-label { position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #666; white-space: nowrap; }
    .trend-bar-value { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #888; }
    .no-chart { color: #666; font-size: 13px; }
    .ip-filter { margin-left: auto; display: flex; gap: 10px; align-items: center; }
    .ip-filter a { font-size: 12px; }
    .ip-filter .exclude-active { background: #7c3aed; color: #fff; }
    .ip-badge { font-size: 11px; color: #888; background: #333; padding: 3px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>K4 Analytics</h1>
  
  <div class="controls">
    <a href="?days=1${excludeIp ? '&excludeIp=' + excludeIp : ''}" class="${days === 1 && !yesterday ? 'active' : ''}">Today</a>
    <a href="?yesterday=1${excludeIp ? '&excludeIp=' + excludeIp : ''}" class="${yesterday ? 'active' : ''}">Yesterday</a>
    <a href="?days=7${excludeIp ? '&excludeIp=' + excludeIp : ''}" class="${days === 7 && !yesterday ? 'active' : ''}">7 Days</a>
    <a href="?days=30${excludeIp ? '&excludeIp=' + excludeIp : ''}" class="${days === 30 && !yesterday ? 'active' : ''}">30 Days</a>
    <a href="?days=90${excludeIp ? '&excludeIp=' + excludeIp : ''}" class="${days === 90 && !yesterday ? 'active' : ''}">3 Months</a>
    <div class="ip-filter">
      ${excludeIp 
        ? `<span class="ip-badge">Excluding: ${excludeIp}</span><a href="${showAllUrl}">Show All</a>`
        : `<a href="${excludeMeUrl}" class="exclude-active">Exclude My IP</a>`
      }
    </div>
    <a href="/__k4stats/export?days=${days}${yesterday ? '&yesterday=1' : ''}" class="export-btn" style="margin-left: auto; background: #2d4a2d; padding: 5px 12px; border-radius: 4px; color: #4ade80;">📥 Export CSV</a>
  </div>

  ${trend.length > 1 ? `
  <div class="trend-chart">
    <h3>
      <span id="chart-title">Visitors per Day</span>
      <span style="float: right; font-size: 12px; font-weight: normal;">
        <a href="#" id="toggle-visitors" style="color: #10b981; text-decoration: underline;">Visitors</a> |
        <a href="#" id="toggle-sessions" style="color: #888; text-decoration: none;">Sessions</a>
      </span>
    </h3>
    <div class="trend-bars" id="trend-chart-bars">
      ${(() => {
        const maxVisitors = Math.max(...trend.map(t => t.visitors), 1);
        return trend.map(t => {
          const height = Math.max((t.visitors / maxVisitors * 100), 2);
          const dateLabel = t.day.slice(5); // MM-DD format
          return `
            <div class="trend-bar" data-visitors="${t.visitors}" data-sessions="${t.sessions}" data-day="${t.day}" style="height: ${height}%" title="${t.day}: ${t.visitors} visitors, ${t.sessions} sessions">
              <span class="trend-bar-value">${t.visitors}</span>
              <span class="trend-bar-label">${dateLabel}</span>
            </div>
          `;
        }).join('');
      })()}
    </div>
  </div>
  <script>
    (function() {
      const visitorsLink = document.getElementById('toggle-visitors');
      const sessionsLink = document.getElementById('toggle-sessions');
      const chartTitle = document.getElementById('chart-title');
      const bars = document.querySelectorAll('.trend-bar');
      
      function showVisitors() {
        const maxVal = Math.max(...Array.from(bars).map(b => parseInt(b.dataset.visitors)), 1);
        bars.forEach(bar => {
          const val = parseInt(bar.dataset.visitors);
          bar.style.height = Math.max((val / maxVal * 100), 2) + '%';
          bar.querySelector('.trend-bar-value').textContent = val;
          bar.title = bar.dataset.day + ': ' + val + ' visitors';
        });
        chartTitle.textContent = 'Visitors per Day';
        visitorsLink.style.color = '#10b981';
        visitorsLink.style.textDecoration = 'underline';
        sessionsLink.style.color = '#888';
        sessionsLink.style.textDecoration = 'none';
      }
      
      function showSessions() {
        const maxVal = Math.max(...Array.from(bars).map(b => parseInt(b.dataset.sessions)), 1);
        bars.forEach(bar => {
          const val = parseInt(bar.dataset.sessions);
          bar.style.height = Math.max((val / maxVal * 100), 2) + '%';
          bar.querySelector('.trend-bar-value').textContent = val;
          bar.title = bar.dataset.day + ': ' + val + ' sessions';
        });
        chartTitle.textContent = 'Sessions per Day';
        sessionsLink.style.color = '#4a9eff';
        sessionsLink.style.textDecoration = 'underline';
        visitorsLink.style.color = '#888';
        visitorsLink.style.textDecoration = 'none';
      }
      
      visitorsLink.addEventListener('click', function(e) { e.preventDefault(); showVisitors(); });
      sessionsLink.addEventListener('click', function(e) { e.preventDefault(); showSessions(); });
    })();
  </script>
  ` : trend.length === 1 ? `
  <div class="trend-chart">
    <h3>Visitors per Day</h3>
    <div class="trend-bars" style="justify-content: center;">
      <div class="trend-bar" style="height: 100%; width: 80px;" title="${trend[0].day}: ${trend[0].visitors} visitors, ${trend[0].sessions} sessions">
        <span class="trend-bar-value">${trend[0].visitors}</span>
        <span class="trend-bar-label">${trend[0].day.slice(5)}</span>
      </div>
    </div>
  </div>
  ` : ''}

  <h2>Pulse</h2>
  <div class="pulse">
    <div class="pulse-stat"><span class="value">${s.unique_visitors || 0}</span><span class="label">Visitors</span></div>
    <div class="pulse-stat"><span class="value"><span style="color:#10b981">${newVisitors}</span>/<span style="color:#f59e0b">${returningVisitors}</span></span><span class="label">New/Ret</span></div>
    <div class="pulse-stat"><span class="value">${s.sessions || 0}</span><span class="label">Sessions</span></div>
    <div class="pulse-stat"><span class="value">${s.avg_events_per_session || 0}</span><span class="label">Avg/Sess</span></div>
    <div class="pulse-stat"><span class="value" style="color:#10b981">${s.pct_navigated || 0}%</span><span class="label">Nav</span></div>
    <div class="pulse-stat"><span class="value" style="color:#f59e0b">${s.pct_zoomed || 0}%</span><span class="label">Zoom</span></div>
    ${cowboyJumps > 0 ? `<div class="pulse-stat highlight"><span class="value">🤠 ${cowboyJumps}</span><span class="label">Cowboy Jump</span></div>` : ''}
    ${(s.collector_notes_opens || 0) > 0 ? `<div class="pulse-stat collector"><span class="value">${s.collector_notes_opens}</span><span class="label">Collector Notes</span></div>` : ''}
  </div>

  <div class="grid">
    <div class="section">
      <h3>Event Breakdown</h3>
      ${events.length === 0 ? '<p style="color:#666">No events yet</p>' : 
        events.map(e => `
          <div class="bar-row">
            <span class="bar-label">${formatEventName(e.event)}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(e.count / maxEventCount * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${e.count}</span>
          </div>
        `).join('')
      }
    </div>

    <div class="section">
      <h3>Entry Points</h3>
      <table>
        <tr><th>Source</th><th>Sessions</th></tr>
        ${entries.map(e => `<tr><td>${formatEventName(e.entry_source)}</td><td>${e.sessions}</td></tr>`).join('')}
        ${entries.length === 0 ? '<tr><td colspan="2">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section">
      <h3>Gallery Performance</h3>
      <table>
        <tr><th>Gallery</th><th>Sessions</th><th>Zoom %</th><th>Avg Events</th></tr>
        ${galleries.map(g => `<tr><td>${formatEventName(g.gallery_id || 'Unknown')}</td><td>${g.sessions}</td><td>${g.zoom_pct || 0}%</td><td>${g.avg_events || 0}</td></tr>`).join('')}
        ${galleries.length === 0 ? '<tr><td colspan="4">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section">
      <h3>🎨 Top 10 Themes Clicked</h3>
      ${themesClicked.length === 0 ? '<p style="color:#666">No theme clicks yet</p>' : `
      <table>
        <tr><th>Theme</th><th>Sessions</th><th>Clicks</th></tr>
        ${themesClicked.map(t => `
          <tr>
            <td>${formatEventName(t.theme || 'Unknown')}</td>
            <td>${t.sessions}</td>
            <td>${t.clicks}</td>
          </tr>
        `).join('')}
      </table>
      `}
    </div>

    <div class="section">
      <h3>🔥 Top 10 Images</h3>
      ${images.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        images.map(i => {
          // Extract image ID from path (e.g., /Galleries/.../i-xxxxxx)
          const imageIdMatch = i.page_path.match(/(i-[a-zA-Z0-9-]+)\/?$/);
          const imageId = imageIdMatch ? imageIdMatch[1] : null;
          // Get last 3 path segments for display
          const pathParts = i.page_path.split('/').filter(Boolean);
          const shortPath = pathParts.slice(-3).join('/');
          return `
          <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #333; gap: 12px;">
            ${imageId ? `<a href="https://www.k4studios.com${i.page_path}" target="_blank"><img src="https://k4studios.com/img/${imageId}/s" alt="" style="width: 56px; height: 56px; object-fit: cover; border-radius: 4px; background: #333; flex-shrink: 0;"></a>` : ''}
            <div style="flex: 1; min-width: 0;">
              <a href="https://www.k4studios.com${i.page_path}" target="_blank" style="color: #4a9eff; text-decoration: none; font-size: 12px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${i.page_path}">${shortPath}</a>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
              ${i.zooms > 0 ? `<div style="background: #1a3a2a; padding: 6px 10px; border-radius: 6px; text-align: center;"><div style="font-size: 16px; font-weight: bold; color: #10b981;">🔍 ${i.zooms}</div></div>` : ''}
              <div style="background: #1a2a3a; padding: 6px 12px; border-radius: 6px; text-align: center; min-width: 50px;"><div style="font-size: 18px; font-weight: bold; color: #4a9eff;">${i.sessions}</div><div style="font-size: 9px; color: #888; margin-top: 2px;">views</div></div>
            </div>
          </div>
        `}).join('')
      }
    </div>

    <div class="section">
      <h3>Top 10 Pages</h3>
      ${pages.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        pages.map(p => `
          <div class="bar-row">
            <a class="bar-label" href="https://www.k4studios.com${p.page_path}" target="_blank" title="${p.page_path}" style="color: #4a9eff; text-decoration: none;">${p.page_path.length > 40 ? '...' + p.page_path.slice(-37) : p.page_path}</a>
            <div class="bar-container">
              <div class="bar" style="width: ${(p.sessions / maxPageSessions * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${p.sessions}</span>
          </div>
        `).join('')
      }
    </div>

    <div class="section bar-orange">
      <h3>Referrers</h3>
      ${referrers.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        referrers.map(r => `
          <div class="bar-row">
            <span class="bar-label">${r.referrer}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(r.sessions / maxRefSessions * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${r.sessions}</span>
          </div>
        `).join('')
      }
    </div>

    <div class="section">
      <h3>Devices</h3>
      <table>
        <tr><th>Platform</th><th>Sessions</th></tr>
        ${devices.map(d => {
          const icons = { ios: '📱', android: '🤖', mac: '🍎', windows: '🪟', linux: '🐧', unknown: '❓' };
          const labels = { ios: 'iOS (iPhone/iPad)', android: 'Android', mac: 'Mac', windows: 'Windows PC', linux: 'Linux', unknown: 'Unknown' };
          return `<tr><td>${icons[d.device] || '❓'} ${labels[d.device] || d.device}</td><td>${d.sessions}</td></tr>`;
        }).join('')}
        ${devices.length === 0 ? '<tr><td colspan="2">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section bar-green">
      <h3>Geography (Unique Visitors)</h3>
      ${geo.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        geo.map(g => `
          <div class="bar-row">
            <span class="bar-label">${[g.city, g.region, g.country].filter(Boolean).join(', ')}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(g.visitors / maxGeoVisitors * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${g.visitors}</span>
          </div>
        `).join('')
      }
    </div>
  </div>

  <p style="margin-top: 30px; color: #666; font-size: 12px;">
    Generated ${new Date().toISOString()} • ${periodLabel}
  </p>
</body>
</html>`;
}

// --------------------
// WORKER ENTRY POINT
// --------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 0) Analytics tracking endpoint
    if (url.pathname === "/track") {
      if (request.method === "OPTIONS") {
        return handleTrackOptions();
      }
      return handleTrackRequest(request, env);
    }

    // 0b) Analytics dashboard
    if (url.pathname === "/__k4stats") {
      return handleAdminAnalytics(request, env);
    }

    // 0c) Analytics CSV export
    if (url.pathname === "/__k4stats/export") {
      return handleExportCSV(request, env);
    }

    // 1) Image detail pages: apply policy first
    if (isImagePageRoute(url.pathname)) {
      const policyResponse = await handleImagePagePolicy(request, url.pathname, ctx);
      if (policyResponse) return policyResponse;
      return fetch(request);
    }

    // 2) /img proxy routes
    if (url.pathname.startsWith("/img/")) {
      return handleImageRequest(request, ctx);
    }

    // 3) Everything else: gateway firewall
    try {
      return await handleGatewayRequest(request, env);
    } catch (err) {
      console.error("Gateway error (failing open):", err);
      return fetch(request);
    }
  }
};
