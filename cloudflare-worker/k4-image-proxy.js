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

// --------------------
// BLOCKED IP RANGES (scrapers, AI harvesters)
// --------------------
// Format: [start, end] as numeric IPs or CIDR prefix
const BLOCKED_IP_PREFIXES = [
  '45.148.10.',   // NL scraper - systematic image harvester (identified 2026-02-13)
  '146.59.19.',   // PL datacenter - no referrer bot pattern
  '135.181.213.', // FI datacenter - no referrer bot pattern
  '51.81.32.',    // US datacenter - no referrer bot pattern
  '51.81.210.',   // US datacenter - no referrer bot pattern
  '51.38.125.',   // DE datacenter - no referrer bot pattern
  '51.68.143.',   // PL datacenter - no referrer bot pattern
  '57.129.15.',   // DE datacenter - no referrer bot pattern
  '57.128.197.',  // PL datacenter - no referrer bot pattern
];

function isBlockedIP(ip) {
  if (!ip) return false;
  return BLOCKED_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
}

// Datacenter IP ranges that suggest bot behavior when combined with no referrer
const DATACENTER_PREFIXES = [
  '45.', '46.', '51.', '57.', '135.', '146.', '149.',
  '2001:', '2604:', // IPv6 datacenter ranges
];

function isDatacenterIP(ip) {
  if (!ip) return false;
  return DATACENTER_PREFIXES.some(prefix => ip.startsWith(prefix));
}

// Verified search bots (never block, never throttle)
const VERIFIED_BOTS = [
  { name: 'Googlebot', pattern: /googlebot|google-inspectiontool|googleother|apis-google/i },
  { name: 'Bingbot', pattern: /bingbot|bingpreview|msnbot/i },
  { name: 'Applebot', pattern: /applebot/i },
  { name: 'DuckDuckBot', pattern: /duckduckbot/i },
  { name: 'Yandex', pattern: /yandex/i },
  { name: 'Baidu', pattern: /baiduspider/i },
  { name: 'Facebook', pattern: /facebookexternalhit|facebot/i },
  { name: 'Twitter', pattern: /twitterbot/i },
  { name: 'Pinterest', pattern: /pinterestbot/i },
  { name: 'LinkedIn', pattern: /linkedinbot/i },
];

function getVerifiedBotName(ua) {
  if (!ua) return null;
  for (const bot of VERIFIED_BOTS) {
    if (bot.pattern.test(ua)) return bot.name;
  }
  return null;
}

// --------------------
// BOT INTELLIGENCE SYSTEM
// --------------------
// Risk levels:
// 1 = Verified/Safe (search bots)
// 2 = Suspicious but non-aggressive (watching)
// 3 = High-confidence scraper (auto-throttle)
// 4 = Malicious/Abusive (manual block candidate)

/**
 * Calculate risk score for an IP based on behavior patterns
 * Returns: { score: number, rules: string[], riskLevel: 1|2|3|4 }
 */
function calculateRiskScore(stats) {
  let score = 0;
  const rules = [];
  
  // Verified bot = Risk 1, always safe
  if (stats.is_verified_bot) {
    return { score: 0, rules: ['verified_bot'], riskLevel: 1 };
  }
  
  // Velocity: >3 requests/second sustained
  if (stats.max_velocity > 3) {
    score += 3;
    rules.push('high_velocity');
  }
  
  // Volume: >50 requests/hour
  if (stats.requests_per_hour > 50) {
    score += 2;
    rules.push('high_volume');
  }
  
  // No branching: 100% image_page, 0% gallery
  if (stats.image_page_pct > 95 && stats.gallery_pct < 1) {
    score += 3;
    rules.push('no_branching');
  }
  
  // No referrer + high volume
  if (!stats.has_referrer && stats.total_requests > 20) {
    score += 2;
    rules.push('no_referrer_high_volume');
  }
  
  // Datacenter IP
  if (stats.is_datacenter) {
    score += 1;
    rules.push('datacenter_ip');
  }
  
  // Multi-day presence (persistent scraper)
  if (stats.days_seen > 2) {
    score += Math.min(stats.days_seen - 1, 3);
    rules.push('multi_day');
  }
  
  // Suspicious country patterns (known bot havens + no referrer)
  if (['NL', 'FI', 'PL', 'RU', 'CN'].includes(stats.country) && !stats.has_referrer) {
    score += 1;
    rules.push('suspicious_origin');
  }
  
  // Determine risk level
  let riskLevel;
  if (score >= 8) {
    riskLevel = 4; // Malicious
  } else if (score >= 5) {
    riskLevel = 3; // High-confidence scraper
  } else if (score >= 2) {
    riskLevel = 2; // Suspicious
  } else {
    riskLevel = 1; // Safe (low activity human)
  }
  
  return { score, rules, riskLevel };
}

/**
 * Check if IP should be throttled (Risk 3+)
 * Returns delay in ms to add, or 0 if no throttle
 */
async function getThrottleDelay(env, ipHash) {
  if (!env?.DB) return 0;
  
  try {
    // Check suspected_bots table for this IP
    const result = await env.DB.prepare(`
      SELECT risk_level, status FROM suspected_bots WHERE ip_hash = ?
    `).bind(ipHash).first();
    
    if (!result) return 0;
    
    // Risk 3+ gets throttled (unless blocked - handled separately)
    if (result.risk_level >= 3 && result.status === 'throttled') {
      // Progressive delay: Risk 3 = 500ms, Risk 4 = 1000ms
      return result.risk_level === 4 ? 1000 : 500;
    }
    
    return 0;
  } catch (e) {
    console.error('Throttle check error:', e);
    return 0;
  }
}

/**
 * Check if IP is in the blocked_ips table
 */
async function isIPBlocked(env, ipHash) {
  if (!env?.DB) return false;
  
  try {
    const result = await env.DB.prepare(`
      SELECT 1 FROM blocked_ips WHERE ip_hash = ? AND is_active = 1
    `).bind(ipHash).first();
    
    return !!result;
  } catch (e) {
    console.error('Block check error:', e);
    return false;
  }
}

/**
 * Update suspected_bots table with aggregated stats from art_views
 * Called periodically or on dashboard load
 */
async function updateBotIntelligence(env) {
  if (!env?.DB) return;
  
  try {
    // Aggregate suspicious activity from art_views (last 7 days)
    const aggregateQuery = `
      WITH ip_stats AS (
        SELECT 
          ip_hash,
          COUNT(*) as total_requests,
          COUNT(DISTINCT date(created_at)) as days_seen,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen,
          MAX(country) as country,
          SUM(CASE WHEN referrer IS NOT NULL AND referrer != '' THEN 1 ELSE 0 END) > 0 as has_referrer,
          ROUND(100.0 * SUM(CASE WHEN type = 'image_page' THEN 1 ELSE 0 END) / COUNT(*), 1) as image_page_pct,
          ROUND(100.0 * SUM(CASE WHEN type = 'gallery' THEN 1 ELSE 0 END) / COUNT(*), 1) as gallery_pct,
          ROUND(COUNT(*) * 1.0 / (JULIANDAY(MAX(created_at)) - JULIANDAY(MIN(created_at)) + 0.001) / 24, 1) as requests_per_hour
        FROM art_views
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY ip_hash
        HAVING COUNT(*) >= 10
      )
      SELECT * FROM ip_stats
      ORDER BY total_requests DESC
      LIMIT 100
    `;
    
    const statsResult = await env.DB.prepare(aggregateQuery).all();
    const ipStats = statsResult.results || [];
    
    for (const stats of ipStats) {
      // Check if datacenter IP
      const isDatacenter = DATACENTER_PREFIXES.some(p => stats.ip_hash.startsWith(p.replace('.x', '.')));
      
      // Calculate risk
      const { score, rules, riskLevel } = calculateRiskScore({
        ...stats,
        is_datacenter: isDatacenter,
        is_verified_bot: false, // Can't verify from hash alone
      });
      
      // Determine status based on risk level
      let status = 'watching';
      if (riskLevel >= 3) {
        status = 'throttled';
      }
      
      // Upsert into suspected_bots
      await env.DB.prepare(`
        INSERT INTO suspected_bots (ip_hash, risk_level, risk_score, rules_triggered, first_seen, last_seen, days_seen, total_requests, image_page_pct, has_referrer, is_datacenter, country, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(ip_hash) DO UPDATE SET
          risk_level = excluded.risk_level,
          risk_score = excluded.risk_score,
          rules_triggered = excluded.rules_triggered,
          last_seen = excluded.last_seen,
          days_seen = excluded.days_seen,
          total_requests = excluded.total_requests,
          image_page_pct = excluded.image_page_pct,
          has_referrer = excluded.has_referrer,
          updated_at = datetime('now')
      `).bind(
        stats.ip_hash,
        riskLevel,
        score,
        JSON.stringify(rules),
        stats.first_seen,
        stats.last_seen,
        stats.days_seen,
        stats.total_requests,
        stats.image_page_pct,
        stats.has_referrer ? 1 : 0,
        isDatacenter ? 1 : 0,
        stats.country,
        status
      ).run();
    }
    
    return ipStats.length;
  } catch (e) {
    console.error('Bot intelligence update error:', e);
    return 0;
  }
}

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
      
      // Check for throttling (Risk 3+)
      const delay = await getThrottleDelay(env, ipHash);
      if (delay > 0) {
        // Add artificial delay for scrapers
        await new Promise(resolve => setTimeout(resolve, delay));
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
    // XL = on-site zoom/slideshow (internal)
    // L = external embeds (Google Images, Bing, Pinterest, FB, etc.)
    if (env?.DB) {
      if (route.size === 'xl') {
        ctx.waitUntil(logArtView(env, 'xl_zoom', route.imageId, request));
      } else if (route.size === 'l') {
        ctx.waitUntil(logArtView(env, 'external_image', route.imageId, request));
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

function isSearchBot(request) {
  const ua = request.headers.get("User-Agent") || "";
  return SEARCH_BOT_PATTERN.test(ua);
}

/**
 * Log edge event directly to D1 (fire and forget via waitUntil)
 * This is the correct place to log 301/410/302 events - at the edge.
 */
async function logEdgeEvent(env, eventType, path, imageId, isBot, request) {
  try {
    const referrer = request.headers.get("Referer") || null;
    const country = request.cf?.country || null;
    
    await env.DB.prepare(`
      INSERT INTO edge_events (event_type, path, image_id, is_bot, referrer, country)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(eventType, path, imageId, isBot ? 1 : 0, referrer, country).run();
  } catch (e) {
    // Never let logging break the response
    console.error('Edge event logging error:', e);
  }
}

// --------------------
// ART VIEWS TRACKING (Layer B)
// --------------------
// Tracks actual art being viewed - server-side, no JS required
// Types: 'image' (proxy), 'image_page' (/Galleries/*/i-*), 'gallery' (/Galleries/*)

/**
 * Hash IP for privacy - simple but effective
 */
function hashIP(ip) {
  if (!ip) return 'unknown';
  // Simple hash: take first 3 octets + day for daily uniqueness
  const parts = ip.split('.');
  if (parts.length < 3) return ip.slice(0, 8);
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}

/**
 * Classify UA as human or unknown (not trying to detect all bots here)
 */
function classifyUA(ua) {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  // Only mark as 'bot' if obviously a bot
  if (BLOCKED_BOTS.test(lower)) return 'bot';
  if (ALLOWED_BOTS.test(lower)) return 'bot';
  return 'human';
}

/**
 * Log an art view - fires async, never blocks response
 * Deduplication: one view per IP per target per hour
 */
async function logArtView(env, type, targetId, request) {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || 
               request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || 
               'unknown';
    
    // Hard block known scrapers - don't even log them
    if (isBlockedIP(ip)) return;
    
    const ua = request.headers.get("User-Agent") || '';
    const uaClass = classifyUA(ua);
    
    // Skip obvious bots for this layer - they're counted in Cloudflare
    if (uaClass === 'bot') return;
    
    const ipHash = hashIP(ip);
    const country = request.cf?.country || null;
    const referrer = request.headers.get("Referer") || null;
    
    // Bot detection heuristics for "human" UA spoofing scrapers
    // 1. Datacenter IP + no referrer = likely bot
    // 2. Netherlands/Finland/Poland datacenters with no referrer = high confidence bot
    const suspiciousCountries = ['NL', 'FI', 'PL'];
    const isBot = (isDatacenterIP(ip) && !referrer) || 
                  (suspiciousCountries.includes(country) && !referrer && isDatacenterIP(ip)) ? 1 : 0;
    
    // Insert with dedup key (IP hash + target + hour)
    // The UNIQUE constraint on dedup_key handles collisions gracefully
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const dedupKey = `${ipHash}:${targetId}:${hour}`;
    
    await env.DB.prepare(`
      INSERT OR IGNORE INTO art_views (type, target_id, ip_hash, ua_class, country, referrer, dedup_key, is_bot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(type, targetId, ipHash, uaClass, country, referrer, dedupKey, isBot).run();
  } catch (e) {
    // Never let logging break the response
    console.error('Art view logging error:', e);
  }
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
      page_path = null,
      event_ts_ms = null,  // Client timestamp for timing analysis
      event_order = null   // Event sequence within session
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
    
    // Soft-delete: set is_active = 0, record unblocked_at
    await env.DB.prepare(`
      UPDATE blocked_ips 
      SET is_active = 0, unblocked_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();
    
    // Downgrade suspected_bots status to throttled
    await env.DB.prepare(`
      UPDATE suspected_bots SET status = 'throttled', updated_at = datetime('now')
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
  const hideBots = url.searchParams.get("hideBots") === "1";
  const hideChardon = url.searchParams.get("hideChardon") === "1";

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
    // Bot filter: exclude AWS, Apple crawler (17.x), Microsoft/Bing (40.77.x, 65.55.x), Ashburn datacenter
    const botClause = hideBots ? `AND NOT (ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%' OR city = 'Ashburn' OR device = 'unknown')` : "";
    // Chardon filter: exclude team member location
    const chardonClause = hideChardon ? `AND city != 'Chardon'` : "";

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
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
    `;
    const summary = await env.DB.prepare(summaryQuery).first();

    // Query 1b: New vs returning visitors (IPs seen before this period)
    // For yesterday mode, use start-of-yesterday as the boundary
    // For rolling windows, use the days offset
    const priorPeriodClause = yesterday 
      ? `created_at < datetime('now', '-5 hours', '-1 day', 'start of day')`
      : `created_at < datetime('now', '-5 hours', '-${days} days')`;
    
    const returningQuery = `
      SELECT COUNT(DISTINCT e.ip) as returning_visitors
      FROM events e
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')} ${ipClause.replace(/ip/g, 'e.ip')} ${botClause.replace(/ip/g, 'e.ip').replace(/city/g, 'e.city').replace(/device/g, 'e.device')} ${chardonClause.replace(/city/g, 'e.city')}
        AND e.ip IN (
          SELECT DISTINCT ip FROM events 
          WHERE ${priorPeriodClause}
        )
    `;
    const returningResult = await env.DB.prepare(returningQuery).first();
    const returningVisitors = returningResult?.returning_visitors || 0;
    const newVisitors = (summary?.unique_visitors || 0) - returningVisitors;

    // Query 2: Event breakdown
    const eventsQuery = `
      SELECT event, COUNT(*) as count 
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
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
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event IN ('gallery_hero_click', 'gallery_explore_click', 'gallery_preview_click', 'theme_click')
      GROUP BY event 
      ORDER BY sessions DESC
    `;
    const entries = await env.DB.prepare(entryQuery).all();

    // Query 4: Gallery performance - derive gallery from page_path for image pages
    // For /Galleries/.../Western-Cowboy-Portraits/Color/i-xxxxx → group by gallery folder
    const galleryQuery = `
      WITH gallery_paths AS (
        SELECT 
          session_id,
          event,
          CASE 
            WHEN page_path LIKE '%/i-%' THEN
              SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1)
            WHEN page_path LIKE '%/Gallery' THEN
              SUBSTR(page_path, 1, LENGTH(page_path) - 8)
            ELSE NULL
          END as base_path
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND (page_path LIKE '/Galleries/%/i-%' OR page_path LIKE '/Other/%/i-%' OR page_path LIKE '%/Gallery')
      )
      SELECT 
        base_path as gallery_id,
        COUNT(DISTINCT session_id) as sessions,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN event = 'zoom_open' THEN session_id END) / 
          NULLIF(COUNT(DISTINCT session_id), 0), 1) as zoom_pct,
        ROUND(1.0 * COUNT(*) / NULLIF(COUNT(DISTINCT session_id), 0), 1) as avg_events
      FROM gallery_paths
      WHERE base_path IS NOT NULL
      GROUP BY base_path
      ORDER BY sessions DESC
      LIMIT 15
    `;
    const galleriesRaw = await env.DB.prepare(galleryQuery).all();
    
    // Post-process: extract last 2 path segments for display + determine type
    const galleries = {
      results: (galleriesRaw.results || []).map(g => {
        const fullPath = g.gallery_id;
        const parts = fullPath.split('/').filter(Boolean);
        const displayName = parts.slice(-2).join(' › ').replace(/-/g, ' ');
        
        // Determine gallery type from path
        let gallery_type = 'other';
        if (fullPath.includes('/Painterly-Fine-Art-Photography/')) {
          gallery_type = 'painterly';
        } else if (fullPath.includes('/Fine-Art-Photography/')) {
          gallery_type = 'traditional';
        } else if (fullPath.includes('/Engrained/') || fullPath.includes('/Archive/')) {
          gallery_type = 'select';
        }
        
        return { ...g, gallery_id: displayName, gallery_type };
      })
    };

    // Query 5: Referrers
    const referrerQuery = `
      SELECT referrer, COUNT(DISTINCT session_id) as sessions
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
      GROUP BY referrer 
      ORDER BY sessions DESC
    `;
    const referrers = await env.DB.prepare(referrerQuery).all();

    // Query 6: Geography (unique visitors by location)
    const geoQuery = `
      SELECT country, region, city, COUNT(DISTINCT ip) as visitors
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
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
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
      GROUP BY DATE(created_at, '-5 hours')
      ORDER BY day ASC
    `;
    const trend = await env.DB.prepare(trendQuery).all();

    // Query 8: Device/Platform breakdown
    const deviceQuery = `
      SELECT device, COUNT(DISTINCT session_id) as sessions
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
      GROUP BY device 
      ORDER BY sessions DESC
    `;
    const devices = await env.DB.prepare(deviceQuery).all();

    // Query 8b: Bounce Rate (sessions with only 1 event)
    const bounceQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN event_count = 1 THEN 1 ELSE 0 END) as bounce_sessions
      FROM (
        SELECT session_id, COUNT(*) as event_count
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        GROUP BY session_id
      )
    `;
    const bounceResult = await env.DB.prepare(bounceQuery).first();
    const bounceRate = bounceResult?.total_sessions > 0 
      ? Math.round(100 * bounceResult.bounce_sessions / bounceResult.total_sessions) 
      : 0;

    // Query 8c: Session Duration (avg time between first and last event)
    const durationQuery = `
      SELECT ROUND(AVG(duration_seconds), 0) as avg_duration
      FROM (
        SELECT 
          session_id,
          (JULIANDAY(MAX(created_at)) - JULIANDAY(MIN(created_at))) * 86400 as duration_seconds
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        GROUP BY session_id
        HAVING COUNT(*) > 1
      )
    `;
    const durationResult = await env.DB.prepare(durationQuery).first();
    const avgDurationSecs = durationResult?.avg_duration || 0;
    const avgDurationFormatted = avgDurationSecs >= 60 
      ? `${Math.floor(avgDurationSecs / 60)}m ${Math.round(avgDurationSecs % 60)}s`
      : `${Math.round(avgDurationSecs)}s`;

    // Query 8d: Peak Hours (busiest 2 hours of day, adjusted for EST)
    const peakHoursQuery = `
      SELECT 
        CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) as hour,
        COUNT(DISTINCT session_id) as sessions
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
      GROUP BY hour
      ORDER BY sessions DESC
      LIMIT 2
    `;
    const peakHoursResult = await env.DB.prepare(peakHoursQuery).all();
    const peakHours = (peakHoursResult.results || []).map(h => {
      const hour24 = h.hour;
      const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);
      const ampm = hour24 >= 12 ? 'pm' : 'am';
      return { hour: `${hour12}${ampm}`, sessions: h.sessions };
    });

    // Query 8e: Device Engagement (avg depth score by device type)
    const deviceEngagementQuery = `
      SELECT 
        device,
        COUNT(DISTINCT session_id) as sessions,
        ROUND(AVG(depth_score), 1) as avg_depth
      FROM (
        SELECT 
          session_id,
          MAX(device) as device,
          SUM(
            CASE event
              WHEN 'zoom_open' THEN 4
              WHEN 'collector_notes_open' THEN 5
              WHEN 'theme_click' THEN 3
              WHEN 'nav_next' THEN 2
              WHEN 'nav_prev' THEN 2
              ELSE 1
            END
          ) as depth_score
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        GROUP BY session_id
      )
      GROUP BY device
      ORDER BY sessions DESC
    `;
    const deviceEngagementResult = await env.DB.prepare(deviceEngagementQuery).all();
    const deviceEngagement = deviceEngagementResult.results || [];

    // Query 9: Top pages (exclude image pages and legacy SmugMug paths)
    const pagesQuery = `
      SELECT page_path, COUNT(DISTINCT session_id) as sessions, COUNT(*) as events
      FROM events 
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause} 
        AND page_path IS NOT NULL
        AND page_path NOT LIKE '%/i-%'
        AND page_path NOT LIKE '/Photoshootsandevents/%'
        AND page_path NOT LIKE '/Scheduled-Shoots/%'
        AND page_path NOT LIKE '/Other/Photo-Shoots/%'
        AND page_path NOT LIKE '/Other/Photo-Shoots-and-Themes/%'
        AND page_path NOT LIKE '/Is-Winter/%'
        AND page_path NOT LIKE '/Photography-Galleries/%'
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
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause} 
        AND page_path IS NOT NULL
        AND page_path LIKE '%/i-%'
      GROUP BY page_path 
      ORDER BY sessions DESC
      LIMIT 10
    `;
    const images = await env.DB.prepare(imagesQuery).all();

    // Query 10b: Total image page stats (unique images viewed + total views)
    const imageStatsQuery = `
      SELECT 
        COUNT(DISTINCT page_path) as unique_images,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(CASE WHEN event = 'page_view' THEN 1 END) as total_views
      FROM events 
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause} 
        AND page_path IS NOT NULL
        AND page_path LIKE '%/i-%'
    `;
    const imageStatsResult = await env.DB.prepare(imageStatsQuery).first();
    const uniqueImagesViewed = imageStatsResult?.unique_images || 0;
    const totalImageSessions = imageStatsResult?.total_sessions || 0;
    const totalImageViews = imageStatsResult?.total_views || 0;

    // Query 11: Top themes clicked
    const themesQuery = `
      SELECT 
        theme,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) as clicks
      FROM events 
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause} AND theme IS NOT NULL
      GROUP BY theme 
      ORDER BY sessions DESC
      LIMIT 10
    `;
    const themesClicked = await env.DB.prepare(themesQuery).all();

    // Query 12: Cowboy Jump count (separate from galleries)
    const cowboyQuery = `
      SELECT COUNT(DISTINCT session_id) as jumps
      FROM events 
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause} AND event = 'cowboy_jump'
    `;
    const cowboyResult = await env.DB.prepare(cowboyQuery).first();
    const cowboyJumps = cowboyResult?.jumps || 0;

    // Query 12b: Top Entry Pages (first page of each session)
    // This shows WHERE people actually land on the site
    const entryPagesQuery = `
      WITH first_pages AS (
        SELECT 
          session_id,
          page_path,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) as rn
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND page_path IS NOT NULL
          AND event = 'page_view'
      )
      SELECT 
        page_path,
        COUNT(*) as sessions
      FROM first_pages
      WHERE rn = 1
      GROUP BY page_path
      ORDER BY sessions DESC
      LIMIT 10
    `;
    const entryPagesResult = await env.DB.prepare(entryPagesQuery).all();
    const entryPages = entryPagesResult.results || [];

    // Query 13: Session Depth Score (engagement quality metric)
    // Weighted scoring: zoom=4, collector_notes=5, theme_click=3, nav=2, other=1
    // Also grab location from the first event of each session + bot detection
    const depthQuery = `
      SELECT 
        e.session_id,
        SUM(
          CASE e.event
            WHEN 'zoom_open' THEN 4
            WHEN 'collector_notes_open' THEN 5
            WHEN 'theme_click' THEN 3
            WHEN 'nav_next' THEN 2
            WHEN 'nav_prev' THEN 2
            ELSE 1
          END
        ) as depth_score,
        COUNT(*) as event_count,
        MAX(e.city) as city,
        MAX(e.region) as region,
        MAX(e.country) as country,
        MAX(e.device) as device,
        MAX(e.ip) as ip,
        CASE WHEN 
          MAX(e.ip) LIKE '3.%' OR MAX(e.ip) LIKE '17.%' OR MAX(e.ip) LIKE '18.%' OR MAX(e.ip) LIKE '40.77.%' OR MAX(e.ip) LIKE '52.%' OR MAX(e.ip) LIKE '54.%' OR MAX(e.ip) LIKE '65.55.%'
          OR MAX(e.city) = 'Ashburn'
          OR MAX(e.device) = 'unknown'
        THEN 1 ELSE 0 END as is_bot
      FROM events e
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')} ${ipClause.replace(/ip/g, 'e.ip')} ${botClause.replace(/ip/g, 'e.ip').replace(/city/g, 'e.city').replace(/device/g, 'e.device')} ${chardonClause.replace(/city/g, 'e.city')}
      GROUP BY e.session_id
      ORDER BY depth_score DESC
      LIMIT 15
    `;
    const depthResults = await env.DB.prepare(depthQuery).all();
    const topDepthSessions = depthResults.results || [];

    // Query 13b: Average depth score across all sessions
    const avgDepthQuery = `
      SELECT ROUND(AVG(depth_score), 1) as avg_depth FROM (
        SELECT 
          session_id,
          SUM(
            CASE event
              WHEN 'zoom_open' THEN 4
              WHEN 'collector_notes_open' THEN 5
              WHEN 'theme_click' THEN 3
              WHEN 'nav_next' THEN 2
              WHEN 'nav_prev' THEN 2
              ELSE 1
            END
          ) as depth_score
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        GROUP BY session_id
      )
    `;
    const avgDepthResult = await env.DB.prepare(avgDepthQuery).first();
    const avgDepthScore = avgDepthResult?.avg_depth || 0;

    // Query 14: Deep Session % (north-star metric)
    // Deep = zoom_open OR event_count >= 10 OR scroll_75/scroll_100
    const deepSessionQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN is_deep = 1 THEN 1 ELSE 0 END) as deep_sessions
      FROM (
        SELECT 
          session_id,
          CASE WHEN 
            MAX(CASE WHEN event = 'zoom_open' THEN 1 ELSE 0 END) = 1
            OR COUNT(*) >= 10
            OR MAX(CASE WHEN event IN ('scroll_75', 'scroll_100') THEN 1 ELSE 0 END) = 1
          THEN 1 ELSE 0 END as is_deep
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        GROUP BY session_id
      )
    `;
    const deepResult = await env.DB.prepare(deepSessionQuery).first();
    const totalSessions = deepResult?.total_sessions || 0;
    const deepSessions = deepResult?.deep_sessions || 0;
    const deepSessionPct = totalSessions > 0 ? Math.round(100 * deepSessions / totalSessions) : 0;

    // Query 14b: Bot traffic estimate
    // Heuristics: datacenter IPs (AWS 3.x, 18.x, 52.x, 54.x), Ashburn city, linux+single-event, unknown device
    const botQuery = `
      SELECT 
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT CASE WHEN is_bot = 1 THEN session_id END) as bot_sessions
      FROM (
        SELECT 
          session_id,
          ip,
          city,
          device,
          COUNT(*) as event_count,
          CASE WHEN 
            ip LIKE '3.%' OR ip LIKE '18.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%'
            OR city = 'Ashburn'
            OR device = 'unknown'
            OR (device = 'linux' AND COUNT(*) = 1)
          THEN 1 ELSE 0 END as is_bot
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        GROUP BY session_id
      )
    `;
    const botResult = await env.DB.prepare(botQuery).first();
    const botSessions = botResult?.bot_sessions || 0;
    const botPct = totalSessions > 0 ? Math.round(100 * botSessions / totalSessions) : 0;

    // Query 15: Exit Pages (where do people leave?)
    // Exclude legacy SmugMug paths that return 410
    const exitPagesQuery = `
      SELECT 
        page_path,
        page_type,
        COUNT(*) as exits
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'session_exit'
        AND page_path IS NOT NULL
        AND page_path NOT LIKE '/Photoshootsandevents/%'
        AND page_path NOT LIKE '/Scheduled-Shoots/%'
        AND page_path NOT LIKE '/Other/Photo-Shoots/%'
        AND page_path NOT LIKE '/Other/Photo-Shoots-and-Themes/%'
        AND page_path NOT LIKE '/Is-Winter/%'
        AND page_path NOT LIKE '/Photography-Galleries/%'
        AND page_path NOT LIKE '/keyword/%'
      GROUP BY page_path
      ORDER BY exits DESC
      LIMIT 10
    `;
    const exitPagesResult = await env.DB.prepare(exitPagesQuery).all();
    const exitPages = exitPagesResult.results || [];

    // Query 15b: Exit summary by page type
    const exitSummaryQuery = `
      SELECT 
        page_type,
        COUNT(*) as exits
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'session_exit'
        AND page_type IS NOT NULL
      GROUP BY page_type
      ORDER BY exits DESC
    `;
    const exitSummaryResult = await env.DB.prepare(exitSummaryQuery).all();
    const exitSummary = exitSummaryResult.results || [];

    // Query 16: Edge Events (301/410/404 from edge_events table)
    const edgeDateClause = yesterday 
      ? `date(created_at, '-5 hours') = date('now', '-5 hours', '-1 day')`
      : days === 1 
        ? `date(created_at, '-5 hours') = date('now', '-5 hours')`
        : `created_at > datetime('now', '-5 hours', '-${days} days')`;
    
    const edgeEventsQuery = `
      SELECT 
        event_type,
        path,
        image_id,
        is_bot,
        COUNT(*) as hits
      FROM edge_events
      WHERE ${edgeDateClause}
      GROUP BY event_type, path
      ORDER BY hits DESC, event_type
      LIMIT 20
    `;
    let edgeEvents = [];
    try {
      const edgeEventsResult = await env.DB.prepare(edgeEventsQuery).all();
      edgeEvents = edgeEventsResult.results || [];
    } catch (e) {
      // Table might not exist yet
      console.log('edge_events query failed:', e.message);
    }

    // Query 16b: Edge events summary by type
    const edgeSummaryQuery = `
      SELECT 
        event_type,
        SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_hits,
        SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_hits,
        COUNT(*) as total
      FROM edge_events
      WHERE ${edgeDateClause}
      GROUP BY event_type
      ORDER BY total DESC
    `;
    let edgeSummary = [];
    try {
      const edgeSummaryResult = await env.DB.prepare(edgeSummaryQuery).all();
      edgeSummary = edgeSummaryResult.results || [];
    } catch (e) {
      console.log('edge_events summary failed:', e.message);
    }

    // Query 17: Art Views (Layer B - server-side art attention tracking)
    let artViewsSummary = { xl_zooms: 0, external_images: 0, image_pages: 0, galleries: 0, total: 0 };
    let artViewsByType = [];
    let topArtViews = [];
    try {
      // Bot filter clause - exclude is_bot = 1
      const botFilterClause = 'AND (is_bot = 0 OR is_bot IS NULL)';
      
      // Summary by type (humans only)
      const artViewsSummaryQuery = `
        SELECT 
          type,
          COUNT(*) as views,
          COUNT(DISTINCT target_id) as unique_targets,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${edgeDateClause} ${botFilterClause}
        GROUP BY type
      `;
      const artViewsSummaryResult = await env.DB.prepare(artViewsSummaryQuery).all();
      artViewsByType = artViewsSummaryResult.results || [];
      
      // Calculate totals
      for (const row of artViewsByType) {
        artViewsSummary.total += row.views;
        if (row.type === 'xl_zoom') artViewsSummary.xl_zooms = row.views;
        if (row.type === 'external_image') artViewsSummary.external_images = row.views;
        if (row.type === 'image') artViewsSummary.xl_zooms += row.views; // Legacy 'image' type → treat as xl_zoom
        if (row.type === 'image_page') artViewsSummary.image_pages = row.views;
        if (row.type === 'gallery') artViewsSummary.galleries = row.views;
      }
      
      // Top viewed art - separate queries for images and galleries (humans only)
      const topImagesQuery = `
        SELECT 
          type,
          target_id,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${edgeDateClause} AND type != 'gallery' ${botFilterClause}
        GROUP BY type, target_id
        ORDER BY views DESC
        LIMIT 25
      `;
      const topGalleriesQuery = `
        SELECT 
          type,
          target_id,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${edgeDateClause} AND type = 'gallery' ${botFilterClause}
        GROUP BY target_id
        ORDER BY views DESC
        LIMIT 25
      `;
      const [topImagesResult, topGalleriesResult] = await Promise.all([
        env.DB.prepare(topImagesQuery).all(),
        env.DB.prepare(topGalleriesQuery).all()
      ]);
      topArtViews = {
        images: topImagesResult.results || [],
        galleries: topGalleriesResult.results || []
      };
    } catch (e) {
      console.log('art_views query failed (table may not exist):', e.message);
    }

    // Query 18: Bot Intelligence (suspected_bots + blocked_ips)
    let botIntelligence = { suspects: [], blocked: [], stats: { total: 0, risk3: 0, risk4: 0, blocked: 0 } };
    try {
      // Update bot intelligence (refresh risk scores)
      await updateBotIntelligence(env);
      
      // Get suspected bots (Risk 2+)
      const suspectsQuery = `
        SELECT 
          ip_hash,
          risk_level,
          risk_score,
          rules_triggered,
          first_seen,
          last_seen,
          days_seen,
          total_requests,
          image_page_pct,
          has_referrer,
          is_datacenter,
          is_verified_bot,
          bot_name,
          country,
          status
        FROM suspected_bots
        WHERE risk_level >= 2
        ORDER BY risk_level DESC, risk_score DESC, total_requests DESC
        LIMIT 50
      `;
      const suspectsResult = await env.DB.prepare(suspectsQuery).all();
      botIntelligence.suspects = suspectsResult.results || [];
      
      // Get blocked IPs (including inactive for archive)
      const blockedQuery = `
        SELECT 
          ip_hash,
          risk_level,
          risk_score,
          rules_triggered,
          total_requests,
          blocked_at,
          blocked_by,
          reason,
          unblocked_at,
          is_active
        FROM blocked_ips
        ORDER BY is_active DESC, blocked_at DESC
        LIMIT 50
      `;
      const blockedResult = await env.DB.prepare(blockedQuery).all();
      botIntelligence.blocked = blockedResult.results || [];
      
      // Calculate stats
      for (const s of botIntelligence.suspects) {
        botIntelligence.stats.total++;
        if (s.risk_level === 3) botIntelligence.stats.risk3++;
        if (s.risk_level >= 4) botIntelligence.stats.risk4++;
        if (s.status === 'blocked') botIntelligence.stats.blocked++;
      }
    } catch (e) {
      console.log('bot_intelligence query failed:', e.message);
    }

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
      uniqueImagesViewed,
      totalImageSessions,
      totalImageViews,
      themesClicked: themesClicked.results || [],
      topDepthSessions,
      avgDepthScore,
      deepSessionPct,
      deepSessions,
      totalSessions,
      exitPages,
      exitSummary,
      botPct,
      botSessions,
      hideBots,
      hideChardon,
      edgeEvents,
      edgeSummary,
      entryPages,
      bounceRate,
      avgDurationFormatted,
      peakHours,
      deviceEngagement,
      artViewsSummary,
      artViewsByType,
      topArtViews,
      botIntelligence
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

function renderDashboard({ days, yesterday, galleryFilter, excludeIp, viewerIp, summary, newVisitors, returningVisitors, cowboyJumps, events, entries, galleries, referrers, geo, trend, devices, pages, images, uniqueImagesViewed, totalImageSessions, totalImageViews, themesClicked, topDepthSessions, avgDepthScore, deepSessionPct, deepSessions, totalSessions, exitPages, exitSummary, botPct, botSessions, hideBots, hideChardon, edgeEvents, edgeSummary, entryPages, bounceRate, avgDurationFormatted, peakHours, deviceEngagement, artViewsSummary, artViewsByType, topArtViews, botIntelligence }) {
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
  
  // Build base URL for filter links (preserves current filters)
  const baseParams = new URLSearchParams();
  if (yesterday) {
    baseParams.set("yesterday", "1");
  } else {
    baseParams.set("days", days.toString());
  }
  if (galleryFilter) baseParams.set("gallery", galleryFilter);
  if (excludeIp) baseParams.set("excludeIp", excludeIp);
  if (hideBots) baseParams.set("hideBots", "1");
  if (hideChardon) baseParams.set("hideChardon", "1");
  
  // URL with IP exclusion
  const excludeMeUrl = (() => {
    const p = new URLSearchParams(baseParams);
    if (viewerIp) p.set("excludeIp", viewerIp);
    return "?" + p.toString();
  })();
  
  // URL without IP exclusion
  const showAllUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("excludeIp");
    return "?" + p.toString();
  })();

  // URL with bots hidden
  const hideBotsUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("hideBots", "1");
    return "?" + p.toString();
  })();

  // URL with bots shown
  const showBotsUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("hideBots");
    return "?" + p.toString();
  })();

  // URL with Chardon hidden
  const hideChardonUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("hideChardon", "1");
    return "?" + p.toString();
  })();

  // URL with Chardon shown
  const showChardonUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("hideChardon");
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
    .pulse-stat { background: #252525; padding: 8px 16px; border-radius: 6px; display: flex; align-items: center; gap: 8px; position: relative; cursor: help; }
    .pulse-stat.clickable { cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
    .pulse-stat.clickable:hover { transform: scale(1.02); }
    .pulse-stat.clickable.off { opacity: 0.4; }
    .pulse-stat .value { font-size: 18px; font-weight: bold; color: #4a9eff; }
    .pulse-stat .label { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
    .pulse-stat .info-icon { width: 12px; height: 12px; border-radius: 50%; background: #444; color: #888; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .pulse-stat .tooltip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; white-space: nowrap; z-index: 100; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); max-width: 280px; white-space: normal; line-height: 1.4; }
    .pulse-stat .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #333; }
    .pulse-stat:hover .tooltip { display: block; }
    .pulse-stat.highlight { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
    .pulse-stat.highlight .value { color: #fff; }
    .pulse-stat.highlight .label { color: #fde68a; }
    .pulse-stat.highlight .info-icon { background: rgba(255,255,255,0.2); color: #fde68a; }
    .pulse-stat.collector { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); }
    .pulse-stat.collector .value { color: #fff; }
    .pulse-stat.collector .label { color: #c4b5fd; }
    .pulse-stat.collector .info-icon { background: rgba(255,255,255,0.2); color: #c4b5fd; }
    /* Custom scrollbar for art lists */
    #art-images-list::-webkit-scrollbar, #art-galleries-list::-webkit-scrollbar { width: 6px; }
    #art-images-list::-webkit-scrollbar-track, #art-galleries-list::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 3px; }
    #art-images-list::-webkit-scrollbar-thumb, #art-galleries-list::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
    #art-images-list::-webkit-scrollbar-thumb:hover, #art-galleries-list::-webkit-scrollbar-thumb:hover { background: #555; }
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
    .bar-label { width: 140px; flex-shrink: 0; font-size: 12px; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-container { flex: 1; background: #1a1a1a; border-radius: 4px; height: 20px; margin: 0 10px; overflow: hidden; }
    .bar { height: 100%; background: linear-gradient(90deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px; transition: width 0.3s ease; }
    .bar-value { width: 40px; flex-shrink: 0; text-align: right; font-size: 13px; color: #888; }
    .bar-orange .bar { background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); }
    .bar-green .bar { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
    /* Section tooltips */
    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .section-header h3 { margin: 0; }
    .section-tip { position: relative; cursor: help; }
    .section-tip .info-icon { width: 14px; height: 14px; border-radius: 50%; background: #444; color: #888; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .section-tip .tooltip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; z-index: 100; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); width: 220px; line-height: 1.4; }
    .section-tip .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #333; }
    .section-tip:hover .tooltip { display: block; }
    /* Tall sections get full width on larger screens */
    .section.tall { grid-column: span 1; }
    @media (min-width: 900px) { .grid-tall { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; } }
    @media (min-width: 1400px) { .grid-tall { grid-template-columns: repeat(3, 1fr); } }
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
    .ip-filter .bot-filter { background: #4b5563; color: #fff; }
    .ip-filter .bot-filter.active { background: #059669; }
    .ip-badge { font-size: 11px; color: #888; background: #333; padding: 3px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>K4 Analytics</h1>
  
  <div class="controls">
    <a href="?days=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 1 && !yesterday ? 'active' : ''}">Today</a>
    <a href="?yesterday=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${yesterday ? 'active' : ''}">Yesterday</a>
    <a href="?days=7${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 7 && !yesterday ? 'active' : ''}">7 Days</a>
    <a href="?days=30${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 30 && !yesterday ? 'active' : ''}">30 Days</a>
    <a href="?days=90${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 90 && !yesterday ? 'active' : ''}">3 Months</a>
    <div class="ip-filter">
      ${excludeIp 
        ? `<span class="ip-badge">Excluding: ${excludeIp}</span><a href="${showAllUrl}">Show All IPs</a>`
        : `<a href="${excludeMeUrl}" class="exclude-active">Exclude My IP</a>`
      }
      ${hideBots
        ? `<a href="${showBotsUrl}" class="bot-filter active">🤖 Bots Hidden</a>`
        : `<a href="${hideBotsUrl}" class="bot-filter">🤖 Hide Bots</a>`
      }
      ${hideChardon
        ? `<a href="${showChardonUrl}" class="bot-filter active">📍 Chardon Hidden</a>`
        : `<a href="${hideChardonUrl}" class="bot-filter">📍 Hide Chardon</a>`
      }
    </div>
    <a href="/__k4stats/export?days=${days}${yesterday ? '&yesterday=1' : ''}${hideBots ? '&hideBots=1' : ''}" class="export-btn" style="margin-left: auto; background: #2d4a2d; padding: 5px 12px; border-radius: 4px; color: #4ade80;">📥 Export CSV</a>
  </div>

  ${trend.length > 1 ? `
  <div class="trend-chart">
    <h3>
      <span id="chart-title">Engaged Sessions per Day</span>
      <span style="float: right; font-size: 12px; font-weight: normal;">
        <a href="#" id="toggle-sessions" style="color: #4a9eff; text-decoration: underline;">Sessions</a> |
        <a href="#" id="toggle-visitors" style="color: #888; text-decoration: none;">Unique IPs</a>
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
          bar.title = bar.dataset.day + ': ' + val + ' unique IPs';
        });
        chartTitle.textContent = 'Unique IPs per Day';
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
          bar.title = bar.dataset.day + ': ' + val + ' engaged sessions';
        });
        chartTitle.textContent = 'Engaged Sessions per Day';
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
    <h3>Engaged Sessions</h3>
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
    <div class="pulse-stat">
      <span class="value">${s.unique_visitors || 0}</span>
      <span class="label">Unique IPs <span class="info-icon">i</span></span>
      <div class="tooltip">Unique IP addresses that engaged with JS. Note: Mobile carriers rotate IPs. This is NOT total visitors — see Art Views for attention metrics.</div>
    </div>
    <div class="pulse-stat">
      <span class="value"><span style="color:#10b981">${newVisitors}</span>/<span style="color:#f59e0b">${returningVisitors}</span></span>
      <span class="label">New/Ret <span class="info-icon">i</span></span>
      <div class="tooltip">New: IPs never seen before this period. Returning: IPs that visited previously. Green = new, Orange = returning.</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.sessions || 0}</span>
      <span class="label">Engaged <span class="info-icon">i</span></span>
      <div class="tooltip">Engaged sessions: browser sessions where JS loaded and events fired. This is Layer C (intent) — the innermost funnel.</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.avg_events_per_session || 0}</span>
      <span class="label">Avg/Sess <span class="info-icon">i</span></span>
      <div class="tooltip">Average events per session. Higher = more engaged visitors exploring galleries and images.</div>
    </div>
    <div class="pulse-stat" style="background: ${bounceRate > 60 ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : bounceRate > 40 ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : '#252525'};">
      <span class="value" style="color: ${bounceRate > 40 ? '#fff' : '#ef4444'};">${bounceRate}%</span>
      <span class="label" style="color: ${bounceRate > 40 ? '#fecaca' : '#888'};">Bounce <span class="info-icon" style="${bounceRate > 40 ? 'background: rgba(255,255,255,0.2); color: #fecaca;' : ''}">i</span></span>
      <div class="tooltip">Sessions with only 1 event (came and left immediately). Lower is better. Above 60% = concern, below 40% = great.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#22d3ee;">⏱️ ${avgDurationFormatted}</span>
      <span class="label">Avg Time <span class="info-icon">i</span></span>
      <div class="tooltip">Average session duration (first to last event). Only counts sessions with 2+ events. For art browsing, 2+ min is good engagement.</div>
    </div>
    ${peakHours.length > 0 ? `<div class="pulse-stat">
      <span class="value" style="color:#f472b6;">🕐 ${peakHours.map(h => h.hour).join(', ')}</span>
      <span class="label">Peak <span class="info-icon">i</span></span>
      <div class="tooltip">Busiest hours (EST): ${peakHours.map(h => `${h.hour} (${h.sessions} sessions)`).join(', ')}. Useful for social media posting timing.</div>
    </div>` : ''}
    <div class="pulse-stat">
      <span class="value" style="color:#10b981">${s.pct_navigated || 0}%</span>
      <span class="label">Nav <span class="info-icon">i</span></span>
      <div class="tooltip">% of sessions that used navigation (next/prev arrows). Shows gallery exploration intent.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#f59e0b">${s.pct_zoomed || 0}%</span>
      <span class="label">Zoom <span class="info-icon">i</span></span>
      <div class="tooltip">% of sessions that opened full-resolution zoom. Strong engagement signal — they wanted to see detail.</div>
    </div>
    ${cowboyJumps > 0 ? `<div class="pulse-stat highlight">
      <span class="value">🤠 ${cowboyJumps}</span>
      <span class="label">Cowboy Jump <span class="info-icon">i</span></span>
      <div class="tooltip">Sessions that used the cowboy easter egg navigation. Fun engagement metric!</div>
    </div>` : ''}
    ${(s.collector_notes_opens || 0) > 0 ? `<div class="pulse-stat collector">
      <span class="value">${s.collector_notes_opens}</span>
      <span class="label">Collector Notes <span class="info-icon">i</span></span>
      <div class="tooltip">Times someone opened collector notes. High-intent signal — they want the story behind the image.</div>
    </div>` : ''}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);">
      <span class="value" style="color: #fff;">${avgDepthScore}</span>
      <span class="label" style="color: #a5f3fc;">Engage Lvl <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a5f3fc;">i</span></span>
      <div class="tooltip">Average engagement level per session for this period. Each action earns points: Collector Notes=5, Zoom=4, Theme Click=3, Nav=2, Other=1. Higher = more engaged visitors.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
      <span class="value" style="color: #fff;">${deepSessionPct}%</span>
      <span class="label" style="color: #a7f3d0;">Deep <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">% of sessions that are "deep" (${deepSessions}/${totalSessions}). Deep = zoomed OR 10+ events OR scrolled 75%+. This is your north-star: readers vs skimmers.</div>
    </div>
    ${botPct > 0 ? `<div class="pulse-stat" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">
      <span class="value" style="color: #fff;">🤖 ${botPct}%</span>
      <span class="label" style="color: #d1d5db;">Bots <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #d1d5db;">i</span></span>
      <div class="tooltip">Estimated bot traffic (${botSessions}/${totalSessions} sessions). Detected by: AWS/datacenter IPs, Ashburn city, unknown device. Not filtered from other stats.</div>
    </div>` : ''}
  </div>

  <!-- Art Views Section (Layer B - Server-Side Attention Tracking) -->
  <h2 style="margin-top: 30px;">🎨 Art Views <span style="font-size: 12px; color: #888; font-weight: normal;">(Server-Side)</span></h2>
  <p style="color: #888; margin: -10px 0 15px 0; font-size: 12px;">People who actually looked at your art. No JS required — tracked at the server level. <strong>Click filters to show/hide types below.</strong></p>
  <div class="pulse">
    <div class="pulse-stat" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
      <span class="value" style="color: #fff;">${artViewsSummary?.total || 0}</span>
      <span class="label" style="color: #ddd6fe;">Total Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">Total art views (on-site + external). Chapter Views + XL Zooms + Galleries + External.</div>
    </div>
    <div class="pulse-stat clickable" data-filter="image_page" onclick="toggleArtFilter('image_page')" style="background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);">
      <span class="value" style="color: #fff;">📖 ${artViewsSummary?.image_pages || 0}</span>
      <span class="label" style="color: #ede9fe;">Chapter Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ede9fe;">i</span></span>
      <div class="tooltip">On-site image detail page loads (/Galleries/*/i-*). Someone on YOUR site viewing an image chapter. This is the real "looked at art" metric.</div>
    </div>
    <div class="pulse-stat clickable" data-filter="xl_zoom" onclick="toggleArtFilter('xl_zoom')" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
      <span class="value" style="color: #fff;">🔍 ${artViewsSummary?.xl_zooms || 0}</span>
      <span class="label" style="color: #ddd6fe;">XL Zooms <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">XL images served (/img/*/xl). On-site zoom lightbox or slideshow views. High-intent engagement.</div>
    </div>
    <div class="pulse-stat clickable" data-filter="gallery" onclick="toggleArtFilter('gallery')" style="background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%);">
      <span class="value" style="color: #1f2937;">📁 ${artViewsSummary?.galleries || 0}</span>
      <span class="label" style="color: #374151;">Galleries <span class="info-icon" style="background: rgba(0,0,0,0.1); color: #374151;">i</span></span>
      <div class="tooltip">Gallery page loads. Someone browsing a collection on your site.</div>
    </div>
    <div class="pulse-stat clickable" data-filter="external_image" onclick="toggleArtFilter('external_image')" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
      <span class="value" style="color: #fff;">🌐 ${artViewsSummary?.external_images || 0}</span>
      <span class="label" style="color: #fed7aa;">External <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fed7aa;">i</span></span>
      <div class="tooltip">L-size images served to external platforms (Google Images, Bing, Pinterest, Facebook, etc.). Off-site discovery where your art is seen but not on k4studios.com.</div>
    </div>
  </div>
  ${(topArtViews?.images?.length > 0 || topArtViews?.galleries?.length > 0) ? `
  <div class="section" style="margin-top: 15px;">
    <h3>Top Viewed Art <span style="font-size: 11px; color: #888; font-weight: normal;">(server-side)</span></h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <!-- Images Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #a78bfa;">🖼️ Top Images <span style="color: #666; font-weight: normal;">(showing ${topArtViews.images?.length || 0})</span></h4>
        <div id="art-images-list" style="max-height: 300px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.images || []).map(a => {
            const imageId = a.target_id.startsWith('i-') ? a.target_id : null;
            const icon = a.type === 'xl_zoom' ? '🔍' : a.type === 'external_image' ? '🌐' : a.type === 'image' ? '🔍' : '📖';
            const typeLabel = a.type === 'xl_zoom' ? 'XL Zoom' : a.type === 'external_image' ? 'External' : a.type === 'image_page' ? 'Chapter' : 'XL Zoom';
            const filterType = a.type === 'image' ? 'xl_zoom' : a.type;
            const label = a.target_id.length > 25 ? '...' + a.target_id.slice(-25) : a.target_id;
            const rowBg = a.type === 'external_image' ? 'rgba(249, 115, 22, 0.25)' : a.type === 'xl_zoom' || a.type === 'image' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(167, 139, 250, 0.12)';
            const borderColor = a.type === 'external_image' ? '#f97316' : a.type === 'xl_zoom' || a.type === 'image' ? '#8b5cf6' : '#a78bfa';
            return `
            <div class="art-item" data-type="${filterType}" style="display: flex; align-items: center; padding: 5px 6px; border-left: 3px solid ${borderColor}; gap: 6px; background: ${rowBg}; border-radius: 0 4px 4px 0; margin-bottom: 3px;">
              ${imageId ? `<img src="https://k4studios.com/img/${imageId}/s" alt="" style="width: 32px; height: 32px; object-fit: cover; border-radius: 3px; background: #333; flex-shrink: 0;">` : `<span style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 3px; font-size: 14px;">${icon}</span>`}
              <div style="flex: 1; min-width: 0;">
                <span style="color: #a78bfa; font-size: 10px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${a.target_id}">${label}</span>
                <span style="color: ${a.type === 'external_image' ? '#fb923c' : '#888'}; font-size: 9px;">${typeLabel}</span>
              </div>
              <div style="display: flex; gap: 3px; flex-shrink: 0;">
                <span style="background: #2d2250; padding: 2px 5px; border-radius: 3px; font-size: 11px; font-weight: bold; color: #a78bfa;">${a.views}</span>
                <span style="background: #1f2937; padding: 2px 4px; border-radius: 3px; font-size: 9px; color: #888;">${a.unique_viewers}👤</span>
              </div>
            </div>`;
          }).join('') || '<p style="color: #555; font-size: 11px;">No image views yet</p>'}
        </div>
      </div>
      <!-- Galleries Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #c4b5fd;">📁 Top Galleries <span style="color: #666; font-weight: normal;">(showing ${topArtViews.galleries?.length || 0})</span></h4>
        <div id="art-galleries-list" style="max-height: 300px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.galleries || []).map(a => {
            const label = a.target_id.length > 30 ? '...' + a.target_id.slice(-30) : a.target_id;
            return `
            <div class="art-item" data-type="gallery" style="display: flex; align-items: center; padding: 5px 0; border-bottom: 1px solid #333; gap: 6px;">
              <span style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 3px; font-size: 14px;">📁</span>
              <div style="flex: 1; min-width: 0;">
                <span style="color: #c4b5fd; font-size: 10px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${a.target_id}">${label}</span>
                <span style="color: #666; font-size: 9px;">Gallery</span>
              </div>
              <div style="display: flex; gap: 3px; flex-shrink: 0;">
                <span style="background: #2d2250; padding: 2px 5px; border-radius: 3px; font-size: 11px; font-weight: bold; color: #c4b5fd;">${a.views}</span>
                <span style="background: #1f2937; padding: 2px 4px; border-radius: 3px; font-size: 9px; color: #888;">${a.unique_viewers}👤</span>
              </div>
            </div>`;
          }).join('') || '<p style="color: #555; font-size: 11px;">No gallery views yet</p>'}
        </div>
      </div>
    </div>
    <p style="font-size: 10px; color: #555; margin-top: 8px;">Views | Unique viewers. Server-side tracking, no JS required.</p>
  </div>
  ` : ''}

  <!-- Tall sections row -->
  <div class="grid-tall">
    <div class="section tall">
      <h3>Event Breakdown</h3>
      ${events.length === 0 ? '<p style="color:#666">No events yet</p>' : 
        events.map(e => `
          <div class="bar-row">
            <span class="bar-label" title="${formatEventName(e.event)}">${formatEventName(e.event)}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(e.count / maxEventCount * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${e.count}</span>
          </div>
        `).join('')
      }
    </div>

    <div class="section tall bar-orange">
      <div class="section-header">
        <h3>Referrers</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Traffic sources normalized from HTTP referer. "direct" = typed URL or bookmark. "internal" = navigation within site. "google/bing" = search engines.</div></span>
      </div>
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

    <div class="section tall">
      <div class="section-header">
        <h3>Geography</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Unique visitors by location. Uses IP geolocation from Cloudflare. City-level accuracy varies by region.</div></span>
      </div>
      ${geo.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        geo.map(g => {
          const label = [g.city, g.region, g.country].filter(Boolean).join(', ');
          // Country color mapping - each country gets a distinct color
          const countryColors = {
            'US': '#3b82f6', // blue
            'FR': '#ef4444', // red
            'DE': '#f97316', // orange
            'BR': '#22c55e', // green
            'GB': '#6366f1', // indigo
            'CA': '#ec4899', // pink
            'AU': '#eab308', // yellow
            'MX': '#14b8a6', // teal
            'IN': '#f59e0b', // amber
            'JP': '#e11d48', // rose
            'IT': '#84cc16', // lime
            'ES': '#a855f7', // purple
            'NL': '#fb923c', // orange-400
            'AT': '#dc2626', // red-600
            'HU': '#c026d3', // fuchsia-600
            'SG': '#0ea5e9', // sky
            'HK': '#d946ef', // fuchsia
            'CN': '#b91c1c', // red-700
            'KR': '#2563eb', // blue-600
            'CO': '#fbbf24', // amber-400
            'PL': '#f43f5e', // rose-500
            'SE': '#06b6d4', // cyan
            'NO': '#0284c7', // sky-600
            'FI': '#0369a1', // sky-700
            'BE': '#facc15', // yellow-400
            'CH': '#dc2626', // red
            'PT': '#059669', // emerald-600
            'CZ': '#7c3aed', // violet-600
            'RO': '#4f46e5', // indigo-600
            'GR': '#0891b2', // cyan-600
            'IE': '#16a34a', // green-600
            'RU': '#1d4ed8', // blue-700
            'UA': '#fcd34d', // amber-300
            'AR': '#60a5fa', // blue-400
            'CL': '#f472b6', // pink-400
            'PE': '#fb7185', // rose-400
            'VE': '#fde047', // yellow-300
            'PH': '#34d399', // emerald-400
            'TH': '#c084fc', // purple-400
            'VN': '#f87171', // red-400
            'ID': '#a3e635', // lime-400
            'MY': '#38bdf8', // sky-400
            'NZ': '#2dd4bf', // teal-400
            'ZA': '#a78bfa', // violet-400
          };
          const barColor = countryColors[g.country] || '#9ca3af'; // default gray for unknown
          return `
          <div class="bar-row">
            <span class="bar-label" title="${label}">${label}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(g.visitors / maxGeoVisitors * 100).toFixed(1)}%; background: ${barColor};"></div>
            </div>
            <span class="bar-value">${g.visitors}</span>
          </div>
        `}).join('')
      }
    </div>
  </div>

  <!-- Regular grid -->
  <div class="grid">
    <div class="section" id="engagement-section">
      <div class="section-header">
        <h3>🎯 Top Sessions by Engagement</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Most engaged sessions by weighted score. 🤖 = suspected bot. Hover row for location.</div></span>
        <label style="margin-left: auto; font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; cursor: pointer;">
          <input type="checkbox" id="hide-bots-toggle" style="cursor: pointer;"> Hide bots
        </label>
      </div>
      <p style="color: #666; font-size: 10px; margin-bottom: 8px;">zoom=4, notes=5, theme=3, nav=2</p>
      ${topDepthSessions.length === 0 ? '<p style="color:#666">No sessions yet</p>' : `
      <table id="engagement-table">
        <tr><th>Session</th><th>Events</th><th>Score</th></tr>
        ${topDepthSessions.map((s, i) => {
          const location = [s.city, s.region, s.country].filter(Boolean).join(', ') || 'Unknown';
          const deviceIcons = { ios: '📱', android: '🤖', mac: '🍎', windows: '🪟', linux: '🐧' };
          const deviceIcon = deviceIcons[s.device] || '';
          const isBot = s.is_bot === 1;
          const botIcon = isBot ? '🤖 ' : '';
          const botClass = isBot ? 'bot-row' : '';
          return `
          <tr class="${botClass}" title="📍 ${location} ${deviceIcon}${isBot ? ' (suspected bot)' : ''}" data-is-bot="${isBot ? '1' : '0'}">
            <td style="font-family: monospace; font-size: 11px; cursor: help;">${botIcon}#${i + 1} ${s.session_id ? s.session_id.slice(0, 8) + '...' : 'unknown'}</td>
            <td>${s.event_count}</td>
            <td style="font-weight: bold; color: ${isBot ? '#6b7280' : '#0891b2'};">${s.depth_score}</td>
          </tr>
        `}).join('')}
      </table>
      <script>
        document.getElementById('hide-bots-toggle').addEventListener('change', function() {
          const rows = document.querySelectorAll('#engagement-table tr[data-is-bot="1"]');
          rows.forEach(row => row.style.display = this.checked ? 'none' : '');
        });
      </script>
      `}
    </div>

    <div class="section">
      <h3>Top 10 Pages</h3>
      ${pages.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        pages.map(p => {
          const shortPath = p.page_path.length > 28 ? '...' + p.page_path.slice(-25) : p.page_path;
          return `
          <div class="bar-row">
            <a class="bar-label" href="https://www.k4studios.com${p.page_path}" target="_blank" title="${p.page_path}" style="color: #4a9eff; text-decoration: none;">${shortPath}</a>
            <div class="bar-container">
              <div class="bar" style="width: ${(p.sessions / maxPageSessions * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${p.sessions}</span>
          </div>
        `}).join('')
      }
    </div>

    <div class="section">
      <div class="section-header">
        <h3>Gallery Performance</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Image views grouped by gallery. Colors: 🟣 Painterly, 🔵 Traditional, 🟠 K4 Select</div></span>
      </div>
      <table>
        <tr><th>Gallery</th><th>Sessions</th><th>Zoom %</th><th>Avg Events</th></tr>
        ${galleries.map(g => {
          const typeColors = { painterly: '#a855f7', traditional: '#4a9eff', select: '#f59e0b' };
          const color = typeColors[g.gallery_type] || '#888';
          return `<tr>
            <td style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
              ${formatEventName(g.gallery_id || 'Unknown')}
            </td>
            <td>${g.sessions}</td>
            <td>${g.zoom_pct || 0}%</td>
            <td>${g.avg_events || 0}</td>
          </tr>`;
        }).join('')}
        ${galleries.length === 0 ? '<tr><td colspan="4">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>🚀 Top Entry Pages</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">First page visited in each session. Shows WHERE people actually land on the site (including direct links to images).</div></span>
      </div>
      ${entryPages.length === 0 ? '<p style="color:#666">No data yet</p>' : `
      <table>
        <tr><th>Landing Page</th><th>Sessions</th></tr>
        ${entryPages.map(p => {
          const isImage = p.page_path.includes('/i-');
          const shortPath = p.page_path.length > 35 ? '...' + p.page_path.slice(-32) : p.page_path;
          const icon = isImage ? '🖼️' : '📄';
          return `<tr><td title="${p.page_path}">${icon} ${shortPath}</td><td>${p.sessions}</td></tr>`;
        }).join('')}
      </table>
      `}
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
      <div class="section-header">
        <h3>Devices</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Sessions and engagement by device. Engage Lvl shows how deeply each platform's users interact.</div></span>
      </div>
      <table>
        <tr><th>Platform</th><th>Sessions</th><th>Engage Lvl</th></tr>
        ${deviceEngagement.map(d => {
          const icons = { ios: '📱', android: '🤖', mac: '🍎', windows: '🪟', linux: '🐧', unknown: '❓' };
          const labels = { ios: 'iOS', android: 'Android', mac: 'Mac', windows: 'Windows', linux: 'Linux', unknown: 'Unknown' };
          const engageColor = d.avg_depth >= 15 ? '#10b981' : d.avg_depth >= 8 ? '#f59e0b' : '#888';
          return `<tr><td>${icons[d.device] || '❓'} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
        }).join('')}
        ${deviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ''}
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
      <div class="section-header">
        <h3>🚪 Where People Leave</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Exit pages: where sessions ended. Helps identify which pages hold attention vs which quietly end the journey.</div></span>
      </div>
      ${exitSummary.length > 0 ? `
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        ${exitSummary.map(e => {
          const typeColors = { image: '#4a9eff', gallery: '#10b981', theme: '#f59e0b', landing: '#a855f7' };
          const color = typeColors[e.page_type] || '#888';
          return `<span style="background: ${color}22; color: ${color}; padding: 4px 10px; border-radius: 12px; font-size: 11px;">${e.page_type || 'other'}: ${e.exits}</span>`;
        }).join('')}
      </div>
      ` : ''}
      ${exitPages.length === 0 ? '<p style="color:#666">No exit data yet</p>' : `
      <div style="max-height: 280px; overflow-y: auto;">
        ${exitPages.map(p => {
          const shortPath = p.page_path.length > 35 ? '...' + p.page_path.slice(-32) : p.page_path;
          const typeColors = { image: '#4a9eff', gallery: '#10b981', theme: '#f59e0b', landing: '#a855f7' };
          const dotColor = typeColors[p.page_type] || '#888';
          return `
          <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #333; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor}; flex-shrink: 0;"></span>
            <a href="https://www.k4studios.com${p.page_path}" target="_blank" style="flex: 1; color: #ccc; text-decoration: none; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.page_path}">${shortPath}</a>
            <span style="color: #888; font-size: 12px; font-weight: bold;">${p.exits}</span>
          </div>
        `}).join('')}
      </div>
      `}
    </div>

    <div class="section">
      <div class="section-header" style="margin-bottom: ${edgeEvents.length === 0 && edgeSummary.length === 0 ? '0' : '12px'};">
        <h3 style="display: inline;">🧭 Index Health</h3>
        ${edgeEvents.length === 0 && edgeSummary.length === 0 ? '<span style="color:#666; margin-left: 12px;">No edge events yet</span>' : ''}
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Edge events: 301 redirects (canonical fixes), 410 Gone (removed content), 404 fallbacks. Healthy sites show these tapering over time.</div></span>
      </div>
      ${edgeSummary.length > 0 ? `
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        ${edgeSummary.map(s => {
          const typeColors = { 
            smart404_redirect: '#10b981', 
            smart404_gone: '#f59e0b', 
            smart404_fallback: '#ef4444',
            smart404_homepage: '#a855f7',
            '301': '#10b981',
            '410': '#f59e0b',
            '404': '#ef4444'
          };
          const typeLabels = {
            smart404_redirect: '301',
            smart404_gone: '410',
            smart404_fallback: '404',
            smart404_homepage: 'Home',
            '301': '301',
            '410': '410',
            '404': '404'
          };
          const color = typeColors[s.event_type] || '#888';
          const label = typeLabels[s.event_type] || s.event_type;
          return `<span style="background: ${color}22; color: ${color}; padding: 4px 10px; border-radius: 12px; font-size: 11px;">${label}: ${s.total} <span style="opacity:0.7">(🤖${s.bot_hits} 👤${s.human_hits})</span></span>`;
        }).join('')}
      </div>
      ` : ''}
      ${edgeEvents.length > 0 ? `
      <div style="max-height: 280px; overflow-y: auto;">
        ${edgeEvents.map(e => {
          const eventColors = { 
            smart404_redirect: '#10b981',
            smart404_gone: '#f59e0b',
            smart404_fallback: '#ef4444',
            smart404_homepage: '#a855f7',
            '301': '#10b981',
            '410': '#f59e0b',
            '404': '#ef4444'
          };
          const eventLabels = {
            smart404_redirect: '301',
            smart404_gone: '410',
            smart404_fallback: '404',
            smart404_homepage: 'Home',
            '301': '301',
            '410': '410',
            '404': '404'
          };
          const color = eventColors[e.event_type] || '#888';
          const label = eventLabels[e.event_type] || e.event_type;
          const shortPath = e.path && e.path.length > 40 ? '...' + e.path.slice(-37) : (e.path || 'unknown');
          const botIcon = e.is_bot ? '🤖' : '👤';
          return `
          <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #333; gap: 8px;">
            <span style="background: ${color}22; color: ${color}; padding: 2px 8px; border-radius: 8px; font-size: 10px; flex-shrink: 0;">${label}</span>
            <span style="flex: 1; color: #ccc; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.path || ''}">${shortPath}</span>
            <span style="font-size: 11px;">${botIcon}</span>
            <span style="color: #888; font-size: 12px; font-weight: bold;">${e.hits}</span>
          </div>
        `}).join('')}
      </div>
      ` : ''}
    </div>
  </div>

  <!-- Bot Intelligence Section -->
  <h2 style="margin-top: 30px;">🛡️ Bot Intelligence <span style="font-size: 12px; color: #888; font-weight: normal;">(Threat Classification)</span></h2>
  <p style="color: #888; margin: -10px 0 15px 0; font-size: 12px;">
    Risk accumulates over time. Level 3+ auto-throttled. Level 4 = manual block candidate.
    <button onclick="refreshBotIntelligence()" style="margin-left: 10px; background: #333; color: #888; border: 1px solid #555; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">🔄 Refresh</button>
  </p>
  
  <!-- Risk Summary Pills -->
  <div class="pulse" style="margin-bottom: 15px;">
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">🟢 Verified</span>
      <span class="label" style="color: #a7f3d0;">Search Bots</span>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);">
      <span class="value" style="color: #1f2937;">🟡 ${botIntelligence?.stats?.total - botIntelligence?.stats?.risk3 - botIntelligence?.stats?.risk4 || 0}</span>
      <span class="label" style="color: #422006;">Watching</span>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
      <span class="value" style="color: #fff;">🟠 ${botIntelligence?.stats?.risk3 || 0}</span>
      <span class="label" style="color: #fed7aa;">Throttled</span>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
      <span class="value" style="color: #fff;">🔴 ${botIntelligence?.stats?.risk4 || 0}</span>
      <span class="label" style="color: #fecaca;">Block Candidates</span>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border: 1px solid #374151;">
      <span class="value" style="color: #9ca3af;">⛔ ${botIntelligence?.blocked?.filter(b => b.is_active)?.length || 0}</span>
      <span class="label" style="color: #6b7280;">Blocked</span>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
    <!-- Suspected Bots (Risk 2+) -->
    <div class="section">
      <h3>🎯 High-Risk Watchlist</h3>
      ${(botIntelligence?.suspects || []).length === 0 ? '<p style="color:#666">No suspicious IPs detected yet</p>' : `
      <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; font-size: 11px;">
          <tr style="position: sticky; top: 0; background: #252525;">
            <th style="text-align: left; padding: 4px;">Risk</th>
            <th style="text-align: left; padding: 4px;">IP Hash</th>
            <th style="text-align: right; padding: 4px;">Reqs</th>
            <th style="text-align: left; padding: 4px;">Rules</th>
            <th style="text-align: center; padding: 4px;">Days</th>
            <th style="text-align: center; padding: 4px;">Action</th>
          </tr>
          ${(botIntelligence?.suspects || []).filter(s => s.risk_level >= 3).map(s => {
            const riskColors = { 1: '#10b981', 2: '#fbbf24', 3: '#f97316', 4: '#ef4444' };
            const riskIcons = { 1: '🟢', 2: '🟡', 3: '🟠', 4: '🔴' };
            const rules = JSON.parse(s.rules_triggered || '[]');
            const rulesShort = rules.slice(0, 2).map(r => r.replace(/_/g, ' ').slice(0, 12)).join(', ');
            const isBlocked = s.status === 'blocked';
            const riskColor = riskColors[s.risk_level];
            const riskIcon = riskIcons[s.risk_level];
            const rowStyle = isBlocked ? 'opacity: 0.5;' : '';
            const reqColor = s.total_requests > 100 ? '#ef4444' : '#888';
            const daysColor = s.days_seen > 2 ? '#f97316' : '#888';
            const actionHtml = isBlocked 
              ? '<span style="color: #666;">Blocked</span>'
              : "<button onclick=\"blockIP('" + s.ip_hash + "')\" style=\"background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;\">Block</button>";
            return '<tr style="border-bottom: 1px solid #333; '+rowStyle+'">' +
              '<td style="padding: 6px 4px;"><span style="background: '+riskColor+'22; color: '+riskColor+'; padding: 2px 6px; border-radius: 8px; font-weight: bold;">'+riskIcon+' '+s.risk_level+'</span></td>' +
              '<td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">'+s.ip_hash+'<span style="color: #666; margin-left: 4px;">'+(s.country || '')+'</span></td>' +
              '<td style="padding: 6px 4px; text-align: right; font-weight: bold; color: '+reqColor+';">'+s.total_requests+'</td>' +
              '<td style="padding: 6px 4px; color: #888; font-size: 10px;" title="'+rules.join(', ')+'">'+rulesShort+(rules.length > 2 ? '...' : '')+'</td>' +
              '<td style="padding: 6px 4px; text-align: center;"><span style="color: '+daysColor+';">'+s.days_seen+'</span></td>' +
              '<td style="padding: 6px 4px; text-align: center;">'+actionHtml+'</td>' +
            '</tr>';
          }).join('')}
        </table>
      </div>
      `}
    </div>

    <!-- Blocked IPs Archive -->
    <div class="section">
      <h3>⛔ Blocked IPs <span style="font-size: 11px; color: #666; font-weight: normal;">(Archive)</span></h3>
      ${(botIntelligence?.blocked || []).length === 0 ? '<p style="color:#666">No blocked IPs yet</p>' : `
      <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; font-size: 11px;">
          <tr style="position: sticky; top: 0; background: #252525;">
            <th style="text-align: left; padding: 4px;">Status</th>
            <th style="text-align: left; padding: 4px;">IP Hash</th>
            <th style="text-align: right; padding: 4px;">Reqs</th>
            <th style="text-align: left; padding: 4px;">Blocked</th>
            <th style="text-align: center; padding: 4px;">Action</th>
          </tr>
          ${(botIntelligence?.blocked || []).map(b => {
            const isActive = b.is_active === 1;
            const blockedDate = b.blocked_at ? new Date(b.blocked_at).toLocaleDateString() : '-';
            const rowStyle = !isActive ? 'opacity: 0.4;' : '';
            const statusBg = isActive ? '#dc262622' : '#37415122';
            const statusColor = isActive ? '#ef4444' : '#6b7280';
            const statusText = isActive ? '⛔ Active' : '✓ Unblocked';
            const actionHtml = isActive 
              ? "<button onclick=\"unblockIP('" + b.ip_hash + "')\" style=\"background: #374151; color: #9ca3af; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;\">Unblock</button>"
              : '<span style="color: #666;">—</span>';
            return '<tr style="border-bottom: 1px solid #333; '+rowStyle+'">' +
              '<td style="padding: 6px 4px;"><span style="background: '+statusBg+'; color: '+statusColor+'; padding: 2px 6px; border-radius: 8px; font-size: 10px;">'+statusText+'</span></td>' +
              '<td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">'+b.ip_hash+'</td>' +
              '<td style="padding: 6px 4px; text-align: right; color: #888;">'+(b.total_requests || '-')+'</td>' +
              '<td style="padding: 6px 4px; color: #666; font-size: 10px;">'+blockedDate+'</td>' +
              '<td style="padding: 6px 4px; text-align: center;">'+actionHtml+'</td>' +
            '</tr>';
          }).join('')}
        </table>
      </div>
      `}
    </div>
  </div>

  <p style="margin-top: 30px; color: #666; font-size: 12px;">
    Generated ${new Date().toISOString()} • ${periodLabel}
  </p>

  <script>
    // Art Views filter state - all on by default
    const artFilters = { image_page: true, xl_zoom: true, gallery: true, external_image: true };
    
    function toggleArtFilter(type) {
      artFilters[type] = !artFilters[type];
      
      // Update button appearance
      const btn = document.querySelector('.pulse-stat[data-filter="' + type + '"]');
      if (btn) {
        btn.classList.toggle('off', !artFilters[type]);
      }
      
      // Filter the art items
      document.querySelectorAll('.art-item').forEach(item => {
        const itemType = item.dataset.type;
        // For legacy 'image' type, map to xl_zoom
        const filterKey = itemType === 'image' ? 'xl_zoom' : itemType;
        if (artFilters[filterKey] === false) {
          item.style.display = 'none';
        } else {
          item.style.display = 'flex';
        }
      });
    }

    // Bot Intelligence functions
    async function blockIP(ipHash) {
      if (!confirm('Block IP: ' + ipHash + '?\\n\\nThis will take effect immediately.')) return;
      
      try {
        const res = await fetch('/__k4stats/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hash: ipHash, reason: 'Manual block from dashboard' })
        });
        
        if (res.ok) {
          alert('IP blocked successfully');
          location.reload();
        } else {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    async function unblockIP(ipHash) {
      if (!confirm('Unblock IP: ' + ipHash + '?')) return;
      
      try {
        const res = await fetch('/__k4stats/unblock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hash: ipHash })
        });
        
        if (res.ok) {
          alert('IP unblocked successfully');
          location.reload();
        } else {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    async function refreshBotIntelligence() {
      try {
        const res = await fetch('/__k4stats/refresh-bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
          const data = await res.json();
          alert('Bot intelligence refreshed. Updated ' + (data.updated || 0) + ' IPs.');
          location.reload();
        } else {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
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
      return handleTrackRequest(request, env);
    }

    // 0a) Edge event tracking (301/410/404 from Netlify functions)
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
    if (url.pathname === "/__k4stats/block" && request.method === "POST") {
      // Verify auth (reuse same auth as dashboard)
      const authHeader = request.headers.get("Authorization");
      const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
      if (authHeader !== expected) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleBlockIP(request, env);
    }

    // 0e) Bot management API - Unblock IP
    if (url.pathname === "/__k4stats/unblock" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
      if (authHeader !== expected) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleUnblockIP(request, env);
    }

    // 0f) Bot management API - Refresh bot intelligence
    if (url.pathname === "/__k4stats/refresh-bots" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
      if (authHeader !== expected) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleRefreshBots(request, env);
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

    // 2) Gallery pages (not image pages): log gallery view
    if ((url.pathname.startsWith("/Galleries/") || url.pathname.startsWith("/Other/")) && 
        !url.pathname.includes("/i-") &&
        !url.pathname.endsWith(".json") &&
        !url.pathname.endsWith(".xml")) {
      // Log gallery page view
      const gallerySlug = extractGallerySlug(url.pathname);
      if (gallerySlug && env?.DB) {
        ctx.waitUntil(logArtView(env, 'gallery', gallerySlug, request));
      }
    }

    // 3) /img proxy routes
    if (url.pathname.startsWith("/img/")) {
      return handleImageRequest(request, ctx, env);
    }

    // 4) Everything else: gateway firewall
    try {
      return await handleGatewayRequest(request, env);
    } catch (err) {
      console.error("Gateway error (failing open):", err);
      return fetch(request);
    }
  }
};
