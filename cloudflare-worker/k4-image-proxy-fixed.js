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
  '216.244.66.',  // DotBot crawler
];

function isBlockedIP(ip) {
  if (!ip) return false;
  return BLOCKED_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
}

// Datacenter IP ranges that suggest bot behavior when combined with no referrer
// IMPORTANT: Use specific /16 or /24 prefixes only � never /8 blocks like '3.'
// Broad prefixes were catching residential ISP users from MX, SG, EU etc.
const DATACENTER_PREFIXES = [
  // OVH hosting (specific ranges, not broad /8)
  '51.81.', '51.68.', '51.38.',     // OVH US/EU
  '135.148.', '135.181.',            // OVH US / Hetzner FI
  '146.59.',                         // OVH PL
  '57.128.', '57.129.',              // OVH DE/EU
  // AWS (specific known hosting /16 ranges)
  '3.145.', '3.148.',               // AWS Ohio
  '18.117.', '18.118.', '18.218.', '18.222.', // AWS Ohio
  '34.205.', '34.224.', '34.235.',   // AWS US-East
  '52.55.', '52.70.', '52.73.',      // AWS US-East
  '54.236.',                         // AWS US-East
  '15.204.',                         // OVH
  // Hetzner, DigitalOcean, Vultr
  '159.138.',                         // Huawei Cloud
  '162.19.',                          // OVH
  '185.170.',                         // Datacenter
  '216.244.',                         // DotBot / hosting
  // Chinese cloud (specific ranges)
  '43.154.', '43.155.', '43.159.',   // Tencent Cloud specific
  '101.32.', '101.33.',              // Tencent Cloud
  '119.28.', '124.243.',             // Alibaba/Huawei
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
  { name: 'OpenAI', pattern: /gptbot|chatgpt-user|oai-searchbot/i },
  { name: 'Claude', pattern: /claudebot|anthropic-ai|claude-web/i },
];

function getVerifiedBotName(ua) {
  if (!ua) return null;
  for (const bot of VERIFIED_BOTS) {
    if (bot.pattern.test(ua)) return bot.name;
  }
  return null;
}

function isVerifiedSearchBot(ua) {
  return getVerifiedBotName(ua) !== null;
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
 * In-memory cache for blocked IPs.
 * Loaded once from D1, refreshed every 60s or on block/unblock.
 * Avoids 1 D1 query per /img/ request (�30 images/page = massive savings).
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
 * Check if IP is blocked � uses in-memory Set (loaded from D1 every 60s).
 * Zero D1 cost for the vast majority of /img/ requests.
 */
async function isIPBlocked(env, ipHash) {
  if (!env?.DB) return false;
  await loadBlockedIps(env);
  return blockedIpCache.has(ipHash);
}

/**
 * Update suspected_bots table with aggregated stats from art_views
 * Called periodically or on dashboard load
 */
async function updateBotIntelligence(env) {
  if (!env?.DB) return;
  
  try {
    // Aggregate suspicious activity from art_views (last 7 days)
    // Also aggregate IPs that were auto-flagged as bots
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
          ROUND(COUNT(*) * 1.0 / (JULIANDAY(MAX(created_at)) - JULIANDAY(MIN(created_at)) + 0.001) / 24, 1) as requests_per_hour,
          MAX(is_bot) as is_flagged_bot
        FROM art_views
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY ip_hash
        HAVING COUNT(*) >= 5 OR MAX(is_bot) = 1
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
      
      // Calculate risk (boost if auto-flagged as bot)
      let { score, rules, riskLevel } = calculateRiskScore({
        ...stats,
        is_datacenter: isDatacenter,
        is_verified_bot: false, // Can't verify from hash alone
      });
      
      // If auto-flagged as bot (datacenter + no referrer), add a modest boost
      // NOT auto-elevated to risk 3 anymore � the +30 score was nuclear
      // (malicious threshold is 8) and caused mass false-positive throttling.
      // Now just a +2 signal that combines with other rules normally.
      if (stats.is_flagged_bot) {
        score += 2;
        rules.push('auto_flagged_bot');
      }
      
      // Determine status: WATCHING by default, never auto-throttle.
      // Throttling/blocking is manual-only via the dashboard.
      // Auto-throttle was causing mass false positives (171 IPs throttled,
      // including owner's IP and verified Facebook crawler).
      let status = 'watching';
      
      // Upsert into suspected_bots (preserve blocked status)
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
          updated_at = datetime('now'),
          status = CASE WHEN suspected_bots.status IN ('blocked', 'verified', 'throttled') THEN suspected_bots.status ELSE excluded.status END
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
  // NOTE: Throttle delay removed � it was adding 500ms+ to every image and
  // the 2 D1 queries per /img request (�30 images/page = 60 queries) was
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
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const referrer = request.headers.get("Referer") || null;
    
    // Bot detection: only flag if datacenter IP + no referrer
    // REMOVED: (isOnsiteType && !referrer) � was flagging 69-81% of real
    // gallery/image_page views as bots. Many legitimate users visit without
    // Referer headers: direct links, emails, bookmarks, privacy browsers.
    // This false positive was cascading into auto_flagged_bot ? throttling.
    const isBot = (isDatacenterIP(ip) && !referrer) ? 1 : 0;
    
    // Insert with dedup key (IP hash + target + type + hour)
    // The UNIQUE constraint on dedup_key handles collisions gracefully
    // Type is included so chapter view + zoom = 2 separate valid entries
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const dedupKey = `${ipHash}:${targetId}:${type}:${hour}`;
    
    await env.DB.prepare(`
      INSERT OR IGNORE INTO art_views (type, target_id, ip_hash, ua_class, country, region, city, referrer, dedup_key, is_bot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(type, targetId, ipHash, uaClass, country, region, city, referrer, dedupKey, isBot).run();
  } catch (e) {
    // Never let logging break the response
    console.error('Art view logging error:', e);
  }
}

/**
 * Log verified search bot activity (Googlebot, Bingbot, etc.)
 * This is GOOD - it means search engines are indexing your images!
 */
async function logVerifiedBot(env, imageId, request) {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || 'unknown';
    const ipHash = hashIP(ip);
    const ua = request.headers.get("User-Agent") || '';
    const country = request.cf?.country || null;
    
    // Extract bot name from user agent
    let botName = 'unknown';
    if (/googlebot/i.test(ua)) botName = 'googlebot';
    else if (/bingbot/i.test(ua)) botName = 'bingbot';
    else if (/applebot/i.test(ua)) botName = 'applebot';
    else if (/yandexbot/i.test(ua)) botName = 'yandexbot';
    else if (/duckduckbot/i.test(ua)) botName = 'duckduckbot';
    else if (/baiduspider/i.test(ua)) botName = 'baidu';
    else if (/facebookexternalhit/i.test(ua)) botName = 'facebook';
    else if (/twitterbot/i.test(ua)) botName = 'twitter';
    else if (/pinterestbot/i.test(ua)) botName = 'pinterest';
    
    // Upsert into suspected_bots with verified flag
    await env.DB.prepare(`
      INSERT INTO suspected_bots (ip_hash, risk_level, risk_score, rules_triggered, first_seen, last_seen, days_seen, total_requests, is_verified_bot, bot_name, country, status, updated_at)
      VALUES (?, 0, 0, '[]', datetime('now'), datetime('now'), 1, 1, 1, ?, ?, 'verified', datetime('now'))
      ON CONFLICT(ip_hash) DO UPDATE SET
        last_seen = datetime('now'),
        total_requests = total_requests + 1,
        is_verified_bot = 1,
        bot_name = excluded.bot_name,
        status = 'verified',
        updated_at = datetime('now')
    `).bind(ipHash, botName, country).run();
  } catch (e) {
    console.error('Verified bot logging error:', e);
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
      // Capture the raw referrer from the edge (most reliable source)
      // Store the full URL so the SQL CASE can distinguish google_images vs google_search etc.
      const edgeReferer = request.headers.get("referer") || "";
      const cookieValue = edgeReferer 
        ? encodeURIComponent(edgeReferer) 
        : "direct";
      
      // Log for debugging
      console.log("Edge referrer capture:", { raw: edgeReferer, cookieValue });
      
      // Fetch the origin response
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
      lower === "unknown" || lower === "other" || lower === "chatgpt") {
    return lower;
  }
  
  // Normalize full URLs
  if (lower.includes("google.") || lower.includes("google/")) return "google";
  if (lower.includes("bing.")) return "bing";
  if (lower.includes("facebook.") || lower.includes("fb.")) return "facebook";
  if (lower.includes("instagram.")) return "instagram";
  if (lower.includes("twitter.") || lower.includes("x.com") || lower.includes("t.co/")) return "twitter";
  if (lower.includes("chatgpt.com") || lower.includes("chat.openai.com")) return "chatgpt";
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
        await logArtView(env, 'chapter_view', targetId, request);
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
    
    // Downgrade suspected_bots status to watching (not throttled � auto-throttle is disabled)
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

    // Query 1: Summary stats
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT ip) as unique_visitors,
        COUNT(*) as total_events,
        ROUND(1.0 * COUNT(*) / NULLIF(COUNT(DISTINCT session_id), 0), 1) as avg_events_per_session,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN event IN ('nav_next', 'nav_prev') THEN session_id END) / 
          NULLIF(COUNT(DISTINCT session_id), 0), 1) as pct_navigated,
        COUNT(CASE WHEN event = 'collector_notes_open' THEN 1 END) as collector_notes_opens
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
    `;
    const summary = await env.DB.prepare(summaryQuery).first();

    // Query 1b: New vs returning visitors (IPs seen before this period)
    // For yesterday mode, use start-of-yesterday as the boundary
    // For rolling windows, use the days offset
    const priorPeriodClause = selectedDate
      ? `date(created_at, '-5 hours') < '${selectedDate}'`
      : (yesterday 
        ? `created_at < datetime('now', '-5 hours', '-1 day', 'start of day')`
        : `created_at < datetime('now', '-5 hours', '-${days} days')`
      );
    
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

    // Query 2: Event breakdown (no LIMIT so granular counts always reconcile)
    const eventsQuery = `
      SELECT event, COUNT(*) as count 
      FROM events 
      WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
      GROUP BY event 
      ORDER BY count DESC
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
    // For /Galleries/.../Western-Cowboy-Portraits/Color/i-xxxxx ? group by gallery folder
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
        const displayName = parts.slice(-2).join(' � ').replace(/-/g, ' ');
        
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
      WHERE ${rangeDateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
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

    // Query 12b: Top Entry Pages (first page of each session) with referrer
    // This shows WHERE people actually land on the site and WHERE they came from
    const entryPagesQuery = `
      WITH first_pages AS (
        SELECT 
          session_id,
          ip,
          page_path,
          referrer,
          raw_referrer,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) as rn
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND page_path IS NOT NULL
          AND event = 'page_view'
      )
      SELECT 
        page_path,
        CASE 
          WHEN referrer IS NULL OR referrer = '' OR referrer = 'unknown' OR referrer = 'direct' THEN 'direct'
          WHEN COALESCE(raw_referrer, referrer) LIKE '%images.google.%' OR COALESCE(raw_referrer, referrer) LIKE '%google.%/imgres%' THEN 'google_images'
          WHEN referrer = 'google' OR referrer LIKE '%google.%' THEN 'google_search'
          WHEN COALESCE(raw_referrer, referrer) LIKE '%bing.%/images%' THEN 'bing_images'
          WHEN referrer = 'bing' OR referrer LIKE '%bing.%' THEN 'bing_search'
          WHEN referrer = 'pinterest' OR referrer LIKE '%pinterest.%' THEN 'pinterest'
          WHEN referrer = 'facebook' OR referrer LIKE '%facebook.%' OR referrer LIKE '%fb.%' THEN 'facebook'
          WHEN referrer = 'twitter' OR referrer LIKE '%twitter.%' OR referrer LIKE '%t.co/%' OR referrer LIKE '%x.com%' THEN 'twitter'
          WHEN referrer = 'chatgpt' OR referrer LIKE '%chatgpt.com%' OR referrer LIKE '%chat.openai.com%' THEN 'chatgpt'
          WHEN referrer = 'instagram' OR referrer LIKE '%instagram.%' THEN 'instagram'
          WHEN referrer = 'linkedin' OR referrer LIKE '%linkedin.%' THEN 'linkedin'
          WHEN referrer LIKE '%duckduckgo.%' THEN 'duckduckgo'
          WHEN referrer = 'internal' OR referrer LIKE '%k4studios.com%' THEN 'internal'
          ELSE 'unattributed'
        END as ref_source,
        COUNT(DISTINCT session_id) as sessions
      FROM first_pages
      WHERE rn = 1
      GROUP BY page_path, ref_source
      ORDER BY sessions DESC
      LIMIT 15
    `;
    const entryPagesResult = await env.DB.prepare(entryPagesQuery).all();
    const entryPages = entryPagesResult.results || [];

    // Diagnostic: first-party chapter/image page activity (from events)
    // Helps explain cases where Top Entry Pages show /i-... but Layer-B chapter_view is 0
    // (common cause: cross-site beacon to workers.dev blocked by privacy tools / CSP).
    let imagePageViewsFromEvents = 0;
    let imageEntrySessionsFromEvents = 0;
    try {
      const imagePageViewsQuery = `
        SELECT COUNT(*) as views
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND event = 'page_view'
          AND page_path IS NOT NULL
          AND page_path LIKE '%/i-%'
      `;
      const imagePageViewsResult = await env.DB.prepare(imagePageViewsQuery).first();
      imagePageViewsFromEvents = imagePageViewsResult?.views || 0;

      const imageEntrySessionsQuery = `
        WITH first_pages AS (
          SELECT
            session_id,
            ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) as rn,
            page_path
          FROM events
          WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
            AND page_path IS NOT NULL
            AND event = 'page_view'
        )
        SELECT COUNT(DISTINCT session_id) as sessions
        FROM first_pages
        WHERE rn = 1 AND page_path LIKE '%/i-%'
      `;
      const imageEntrySessionsResult = await env.DB.prepare(imageEntrySessionsQuery).first();
      imageEntrySessionsFromEvents = imageEntrySessionsResult?.sessions || 0;
    } catch (e) {
      console.log('image page diagnostics query failed:', e.message);
    }
    
    // Entry referrer summary - where did site visitors come from?
    // More specific patterns to distinguish search vs images
    const entryRefSummaryQuery = `
      WITH first_pages AS (
        SELECT 
          session_id,
          ip,
          referrer,
          raw_referrer,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) as rn
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND page_path IS NOT NULL
          AND event = 'page_view'
      )
      SELECT 
        CASE 
          WHEN referrer IS NULL OR referrer = '' OR referrer = 'unknown' OR referrer = 'direct' THEN 'direct'
          -- Match raw URLs (future data with raw referrer in cookie)
          WHEN COALESCE(raw_referrer, referrer) LIKE '%images.google.%' OR COALESCE(raw_referrer, referrer) LIKE '%google.%/imgres%' THEN 'google_images'
          -- Match normalized labels (existing data) AND raw URLs
          WHEN referrer = 'google' OR referrer LIKE '%google.%' THEN 'google_search'
          WHEN COALESCE(raw_referrer, referrer) LIKE '%bing.%/images%' THEN 'bing_images'
          WHEN referrer = 'bing' OR referrer LIKE '%bing.%' THEN 'bing_search'
          WHEN referrer = 'pinterest' OR referrer LIKE '%pinterest.%' THEN 'pinterest'
          WHEN referrer = 'facebook' OR referrer LIKE '%facebook.%' OR referrer LIKE '%fb.%' THEN 'facebook'
          WHEN referrer = 'twitter' OR referrer LIKE '%twitter.%' OR referrer LIKE '%t.co/%' OR referrer LIKE '%x.com%' THEN 'twitter'
          WHEN referrer = 'chatgpt' OR referrer LIKE '%chatgpt.com%' OR referrer LIKE '%chat.openai.com%' THEN 'chatgpt'
          WHEN referrer = 'instagram' OR referrer LIKE '%instagram.%' THEN 'instagram'
          WHEN referrer = 'linkedin' OR referrer LIKE '%linkedin.%' THEN 'linkedin'
          WHEN referrer LIKE '%duckduckgo.%' THEN 'duckduckgo'
          WHEN referrer = 'internal' OR referrer LIKE '%k4studios.com%' THEN 'internal'
          ELSE 'unattributed'
        END as ref_source,
        COUNT(DISTINCT ip) as visitors
      FROM first_pages
      WHERE rn = 1
      GROUP BY ref_source
      HAVING ref_source != 'internal'
      ORDER BY visitors DESC
    `;
    const entryRefSummaryResult = await env.DB.prepare(entryRefSummaryQuery).all();
    const entryRefSummary = entryRefSummaryResult.results || [];
    // Convert to lookup
    const entryRefCounts = {};
    entryRefSummary.forEach(r => { entryRefCounts[r.ref_source] = r.visitors; });

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
    
    // Calculate min/max engagement scores from topDepthSessions
    const engagementScores = topDepthSessions.map(s => s.depth_score).filter(s => s > 0);
    const minEngagement = engagementScores.length > 0 ? Math.min(...engagementScores) : 0;
    const maxEngagement = engagementScores.length > 0 ? Math.max(...engagementScores) : 0;

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

    // Query 15b: Exit summary by page category (Home/Gallery/Images/Landing/Blog/Other)
    const exitSummaryQuery = `
      SELECT 
        CASE
          WHEN page_path = '/' THEN 'home'
          WHEN page_path LIKE '%/i-%' THEN 'images'
          WHEN page_path LIKE '/Blog%' OR page_path LIKE '/blog%' THEN 'blog'
          WHEN page_path = '/Other/K4-Select-Series/Engrained' THEN 'gallery'
          WHEN page_path LIKE '/%' AND page_path NOT LIKE '/%/%' AND page_path != '/' THEN 'gallery'
          WHEN page_path IN ('/About', '/Contact', '/FAQ', '/Privacy', '/Terms', '/What-Is-Western-Art', '/What-Is-Western-Fine-Art-Photography', '/What-Is-Painterly-Photography', '/What-Is-Cowboy-Fine-Art-Photography', '/Other/K4-Select-Series') THEN 'landing'
          ELSE 'other'
        END as exit_category,
        COUNT(*) as exits
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'session_exit'
        AND page_path IS NOT NULL
      GROUP BY exit_category
      ORDER BY exits DESC
    `;
    const exitSummaryResult = await env.DB.prepare(exitSummaryQuery).all();
    const exitSummary = exitSummaryResult.results || [];
    // Convert to lookup object
    const exitByCategory = {};
    exitSummary.forEach(e => { exitByCategory[e.exit_category] = e.exits; });

    // Query 16: Edge Events (301/410/404 from edge_events table)
    // IMPORTANT: Use dateClause (which respects selectedDate) for art_views queries.
    // edgeDateClause is only used for edge_events (which don't support selectedDate browsing).
    // Before this fix, art_views used edgeDateClause � which ignored selectedDate,
    // causing Pulse (events) and Art Viewers (art_views) to show different date windows.
    const edgeDateClause = yesterday 
      ? `date(created_at, '-5 hours') = date('now', '-5 hours', '-1 day')`
      : days === 1 
        ? `date(created_at, '-5 hours') = date('now', '-5 hours')`
        : `created_at > datetime('now', '-5 hours', '-${days} days')`;
    // artDateClause: identical to dateClause but keeps the name for clarity in art_views queries
    const artDateClause = dateClause;
    
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
    let artViewsSummary = { xl_zooms: 0, slideshow_starts: 0, external_images: 0, image_pages: 0, chapter_views: 0, galleries: 0, total: 0, unique_viewers: 0, onsite_viewers: 0 };
    let artViewsByType = [];
    let topArtViews = [];
    try {
      // Bot filter clause - always exclude is_bot = 1
      const botFilterClause = 'AND (is_bot = 0 OR is_bot IS NULL)';
      
      // Summary by type (humans only)
      const artViewsSummaryQuery = `
        SELECT 
          type,
          COUNT(*) as views,
          COUNT(DISTINCT target_id) as unique_targets,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} ${botFilterClause} ${artIpClause}
        GROUP BY type
      `;
      const artViewsSummaryResult = await env.DB.prepare(artViewsSummaryQuery).all();
      artViewsByType = artViewsSummaryResult.results || [];
      
      // Calculate totals
      let pollutedExternalCount = 0;
      for (const row of artViewsByType) {
        if (row.type === 'xl_zoom') artViewsSummary.xl_zooms = row.views;
        if (row.type === 'slideshow_start') artViewsSummary.slideshow_starts = row.views;
        if (row.type === 'image') artViewsSummary.xl_zooms += row.views; // Legacy 'image' type ? treat as xl_zoom
        if (row.type === 'image_page') artViewsSummary.image_pages = row.views;
        if (row.type === 'chapter_view') artViewsSummary.chapter_views = row.views;
        if (row.type === 'gallery') artViewsSummary.galleries = row.views;
        if (row.type === 'external_image') pollutedExternalCount = row.views; // Track polluted count to subtract
      }
      
      // Get CLEAN external image count (excluding k4studios referrers - old polluted data)
      const cleanExternalQuery = `
        SELECT COUNT(*) as views
        FROM art_views
        WHERE ${artDateClause} ${botFilterClause} ${artIpClause} AND type = 'external_image'
          AND referrer IS NOT NULL AND referrer != ''
          AND referrer NOT LIKE '%k4studios%' AND referrer NOT LIKE '%localhost%'
      `;
      const cleanExternalResult = await env.DB.prepare(cleanExternalQuery).first();
      artViewsSummary.external_images = cleanExternalResult?.views || 0;
      
      // Total Image Views = Chapter Views (JS-verified) + External (actual views, not engagement clicks)
      // XL zooms and slideshow starts are engagement actions, not separate views
      // chapter_view = human-verified (JS beacon), image_page = server-side (includes bots)
      artViewsSummary.total = (artViewsSummary.chapter_views || 0) + artViewsSummary.external_images;
      
      // Get unique ART viewers (chapters + clean external only, not gallery browsers or zoom clickers)
      // chapter_view = JS-verified human, external_image = server-side external embed
      // Include null-referrer externals (legitimate viewers without Referer header)
      const uniqueViewersQuery = `
        SELECT COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} AND (is_bot = 0 OR is_bot IS NULL) ${artIpClause}
          AND type IN ('chapter_view', 'external_image')
          AND (type != 'external_image' OR referrer IS NULL OR (referrer NOT LIKE '%k4studios%' AND referrer NOT LIKE '%localhost%'))
      `;
      const uniqueViewersResult = await env.DB.prepare(uniqueViewersQuery).first();
      artViewsSummary.unique_viewers = uniqueViewersResult?.unique_viewers || 0;
      
      // Get on-site unique viewers (JS-verified chapter viewers only)
      // Must match the population in unique_viewers so External-only = unique - onsite >= 0
      const onsiteViewersQuery = `
        SELECT COUNT(DISTINCT ip_hash) as onsite_viewers
        FROM art_views
        WHERE ${artDateClause} AND (is_bot = 0 OR is_bot IS NULL) ${artIpClause} AND type = 'chapter_view'
      `;
      const onsiteViewersResult = await env.DB.prepare(onsiteViewersQuery).first();
      artViewsSummary.onsite_viewers = onsiteViewersResult?.onsite_viewers || 0;
      
      // Top viewed art - separate queries for each type (humans only)
      const topChaptersQuery = `
        SELECT 
          type,
          target_id,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} AND type = 'chapter_view' ${botFilterClause} ${artIpClause}
        GROUP BY target_id
        ORDER BY views DESC
        LIMIT 15
      `;
      const topXLZoomsQuery = `
        SELECT 
          type,
          target_id,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} AND (type = 'xl_zoom' OR type = 'image') ${botFilterClause} ${artIpClause}
        GROUP BY target_id
        ORDER BY views DESC
        LIMIT 15
      `;
      // External images (Google Images, Bing, Pinterest, etc - NOT from k4studios)
      // Exclude k4studios referrers (internal traffic logged before filter was added)
      // Show top images by total views, with dominant source indicator
      const topExternalQuery = `
        SELECT 
          'external_image' as type,
          target_id,
          CASE 
            WHEN referrer LIKE '%google.%' THEN 'google'
            WHEN referrer LIKE '%bing.%' THEN 'bing'
            WHEN referrer LIKE '%pinterest.%' THEN 'pinterest'
            WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%fb.%' THEN 'facebook'
            WHEN referrer LIKE '%twitter.%' OR referrer LIKE '%t.co/%' OR referrer LIKE '%x.com%' THEN 'twitter'
            WHEN referrer LIKE '%chatgpt.com%' OR referrer LIKE '%chat.openai.com%' THEN 'chatgpt'
            WHEN referrer LIKE '%duckduckgo.%' THEN 'duckduckgo'
            ELSE 'unattributed'
          END as top_source,
          COUNT(*) as views,
          COUNT(*) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} AND type = 'external_image' ${botFilterClause} ${artIpClause}
          AND referrer IS NOT NULL AND referrer != ''
          AND referrer NOT LIKE '%k4studios%' AND referrer NOT LIKE '%localhost%'
        GROUP BY target_id, top_source
        ORDER BY views DESC
        LIMIT 15
      `;
      const topGalleriesQuery = `
        SELECT 
          type,
          target_id,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} AND type = 'gallery' ${botFilterClause} ${artIpClause}
        GROUP BY target_id
        ORDER BY views DESC
        LIMIT 15
      `;
      const [topChaptersResult, topXLZoomsResult, topExternalResult, topGalleriesResult] = await Promise.all([
        env.DB.prepare(topChaptersQuery).all(),
        env.DB.prepare(topXLZoomsQuery).all(),
        env.DB.prepare(topExternalQuery).all(),
        env.DB.prepare(topGalleriesQuery).all()
      ]);
      topArtViews = {
        chapters: topChaptersResult.results || [],
        xlZooms: topXLZoomsResult.results || [],
        external: topExternalResult.results || [],
        galleries: topGalleriesResult.results || []
      };
      
      // Art View External Displays - where are our images being shown externally?
      // ONLY external_image types - images being served to other platforms (not clicks to site)
      // Exclude k4studios referrers (internal traffic that was logged before filter was added)
      const artExternalDisplayQuery = `
        SELECT 
          CASE 
            WHEN referrer LIKE '%images.google.%' OR referrer LIKE '%google.%/imgres%' THEN 'Google Images'
            WHEN referrer LIKE '%google.%' THEN 'Google Search'
            WHEN referrer LIKE '%bing.%/images%' THEN 'Bing Images'
            WHEN referrer LIKE '%bing.%' THEN 'Bing Search'
            WHEN referrer LIKE '%pinterest.%' THEN 'Pinterest'
            WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%fb.%' THEN 'Facebook'
            WHEN referrer LIKE '%twitter.%' OR referrer LIKE '%t.co/%' OR referrer LIKE '%x.com%' THEN 'Twitter/X'
            WHEN referrer LIKE '%chatgpt.com%' OR referrer LIKE '%chat.openai.com%' THEN 'ChatGPT'
            WHEN referrer LIKE '%instagram.%' THEN 'Instagram'
            WHEN referrer LIKE '%linkedin.%' THEN 'LinkedIn'
            WHEN referrer LIKE '%duckduckgo.%' THEN 'DuckDuckGo'
            WHEN referrer LIKE '%yandex.%' THEN 'Yandex'
            WHEN referrer LIKE '%baidu.%' THEN 'Baidu'
            ELSE referrer
          END as source,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} ${botFilterClause} ${artIpClause} AND type = 'external_image'
          AND referrer IS NOT NULL AND referrer != ''
          AND referrer NOT LIKE '%k4studios%' AND referrer NOT LIKE '%localhost%'
        GROUP BY source
        ORDER BY views DESC
      `;
      const artExternalDisplayResult = await env.DB.prepare(artExternalDisplayQuery).all();
      artViewsSummary.externalDisplays = artExternalDisplayResult.results || [];
      
      // Count external image views with no referrer (potential unauthorized embedding)
      const noRefExternalQuery = `
        SELECT COUNT(*) as views, COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} ${botFilterClause} ${artIpClause} AND type = 'external_image'
          AND (referrer IS NULL OR referrer = '')
      `;
      const noRefResult = await env.DB.prepare(noRefExternalQuery).first();
      artViewsSummary.noRefExternalViews = noRefResult?.views || 0;
      artViewsSummary.noRefExternalViewers = noRefResult?.unique_viewers || 0;
      
      // Art Views Geography - where are art viewers located? (city-level)
      const artGeoQuery = `
        SELECT 
          country, region, city,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_viewers
        FROM art_views
        WHERE ${artDateClause} ${botFilterClause} ${artIpClause}
          AND type IN ('chapter_view', 'xl_zoom', 'slideshow_start', 'external_image')
        GROUP BY country, region, city
        ORDER BY unique_viewers DESC, views DESC
        LIMIT 25
      `;
      const artGeoResult = await env.DB.prepare(artGeoQuery).all();
      artViewsSummary.geography = artGeoResult.results || [];
    } catch (e) {
      console.log('art_views query failed (table may not exist):', e.message);
    }

    // Reliable on-site counts: use explicit same-origin events (not /i- URL proxies)
    // - chapter_view is fired by the chapter interface itself
    // - zoom_open is the click that opens the XL zoom overlay
    try {
      const beaconChapterViews = artViewsSummary?.chapter_views || 0;
      const beaconXLZooms = artViewsSummary?.xl_zooms || 0;

      const chapterViewsEventsQuery = `
        SELECT COUNT(*) as views
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND event = 'chapter_view'
      `;
      const chapterViewsEventsResult = await env.DB.prepare(chapterViewsEventsQuery).first();
      const chapterViewsEvents = chapterViewsEventsResult?.views || 0;

      const topChaptersEventsQuery = `
        SELECT 
          image_id,
          COUNT(*) as views,
          COUNT(DISTINCT ip) as unique_viewers
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND event = 'chapter_view'
          AND image_id IS NOT NULL
        GROUP BY image_id
        ORDER BY views DESC
        LIMIT 15
      `;
      const topChaptersEventsResult = await env.DB.prepare(topChaptersEventsQuery).all();
      const topChaptersEvents = (topChaptersEventsResult.results || []).map((r) => ({
        type: 'chapter_view',
        target_id: r.image_id,
        views: r.views || 0,
        unique_viewers: r.unique_viewers || 0
      }));

      const xlZoomsEventsQuery = `
        SELECT COUNT(*) as views
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND event = 'zoom_open'
      `;
      const xlZoomsEventsResult = await env.DB.prepare(xlZoomsEventsQuery).first();
      const xlZoomsEvents = xlZoomsEventsResult?.views || 0;

      const topXLZoomsEventsQuery = `
        SELECT 
          image_id,
          COUNT(*) as views,
          COUNT(DISTINCT ip) as unique_viewers
        FROM events
        WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
          AND event = 'zoom_open'
          AND image_id IS NOT NULL
        GROUP BY image_id
        ORDER BY views DESC
        LIMIT 15
      `;
      const topXLZoomsEventsResult = await env.DB.prepare(topXLZoomsEventsQuery).all();
      const topXLZoomsEvents = (topXLZoomsEventsResult.results || []).map((r) => ({
        type: 'xl_zoom',
        target_id: r.image_id,
        views: r.views || 0,
        unique_viewers: r.unique_viewers || 0
      }));

      // Normalize shape (topArtViews is sometimes initialized as an array)
      if (!topArtViews || Array.isArray(topArtViews)) {
        topArtViews = { chapters: [], xlZooms: [], external: [], galleries: [] };
      }

      // Store beacon values for debugging, but use same-origin events for on-site numbers.
      artViewsSummary.chapter_views_beacon = beaconChapterViews;
      artViewsSummary.xl_zooms_beacon = beaconXLZooms;
      artViewsSummary.chapter_views = chapterViewsEvents;
      artViewsSummary.xl_zooms = xlZoomsEvents;

      if (topChaptersEvents.length > 0) topArtViews.chapters = topChaptersEvents;
      if (topXLZoomsEvents.length > 0) topArtViews.xlZooms = topXLZoomsEvents;

      // Recompute total (chapter views + clean external embeds)
      artViewsSummary.total = (artViewsSummary.chapter_views || 0) + (artViewsSummary.external_images || 0);
    } catch (e) {
      console.log('on-site art view events query failed:', e.message);
    }

    // Query 18: Bot Intelligence (suspected_bots + blocked_ips)
    let botIntelligence = { suspects: [], blocked: [], verified: [], stats: { total: 0, risk3: 0, risk4: 0, blocked: 0, verified: 0 } };
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
      
      // Get verified bots (good traffic!) with image/page breakdown
      const verifiedQuery = `
        SELECT 
          sb.ip_hash, 
          sb.bot_name, 
          sb.total_requests, 
          sb.last_seen, 
          sb.country,
          COALESCE(img.image_count, 0) as image_count,
          COALESCE(pg.page_count, 0) as page_count
        FROM suspected_bots sb
        LEFT JOIN (
          SELECT ip_hash, COUNT(*) as image_count 
          FROM art_views 
          WHERE type IN ('xl_zoom', 'external_image') 
          GROUP BY ip_hash
        ) img ON sb.ip_hash = img.ip_hash
        LEFT JOIN (
          SELECT ip_hash, COUNT(*) as page_count 
          FROM art_views 
          WHERE type IN ('image_page', 'gallery') 
          GROUP BY ip_hash
        ) pg ON sb.ip_hash = pg.ip_hash
        WHERE sb.is_verified_bot = 1 AND sb.status = 'verified'
        ORDER BY sb.total_requests DESC
        LIMIT 20
      `;
      const verifiedResult = await env.DB.prepare(verifiedQuery).all();
      botIntelligence.verified = verifiedResult.results || [];
      botIntelligence.stats.verified = botIntelligence.verified.reduce((sum, v) => sum + v.total_requests, 0);
      
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
      
      // Calculate stats (exclude blocked from watching/throttled/candidates counts)
      for (const s of botIntelligence.suspects) {
        if (s.status !== 'blocked') {
          botIntelligence.stats.total++;
          if (s.risk_level === 3) botIntelligence.stats.risk3++;
          if (s.risk_level >= 4) botIntelligence.stats.risk4++;
        }
      }
    } catch (e) {
      console.log('bot_intelligence query failed:', e.message);
    }

    // Render HTML
    const html = renderDashboard({
      days,
      yesterday,
      selectedDate,
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
      minEngagement,
      maxEngagement,
      avgDepthScore,
      deepSessionPct,
      deepSessions,
      totalSessions,
      exitPages,
      exitSummary,
      exitByCategory,
      botPct,
      botSessions,
      hideBots,
      hideChardon,
      edgeEvents,
      edgeSummary,
      entryPages,
      entryRefCounts,
      imagePageViewsFromEvents,
      imageEntrySessionsFromEvents,
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

    const csv = csvRows.join('\\n');
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

function renderDashboard({ days, yesterday, selectedDate, galleryFilter, excludeIp, viewerIp, summary, newVisitors, returningVisitors, cowboyJumps, events, entries, galleries, referrers, geo, trend, devices, pages, images, uniqueImagesViewed, totalImageSessions, totalImageViews, themesClicked, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, exitPages, exitSummary, exitByCategory, botPct, botSessions, hideBots, hideChardon, edgeEvents, edgeSummary, entryPages, entryRefCounts, imagePageViewsFromEvents, imageEntrySessionsFromEvents, bounceRate, avgDurationFormatted, peakHours, deviceEngagement, artViewsSummary, artViewsByType, topArtViews, botIntelligence }) {
  const s = summary || {};
  
  // Canonical list of all trackable events with display labels
  // Alphabetized: high-value events first, then passive/scroll events
  const eventLabels = {
    // -- High-value user interactions --
    'browse_all_click': 'Browse All Click',
    'order_clicked': 'Buy Button Click',
    'collector_notes_open': 'Collector Notes',
    'cowboy_jump': 'Cowboy Jump',
    'exit_to_gallery': 'Exit to Gallery',
    'gallery_explore_click': 'Gallery Explore Click',
    'gallery_preview_click': 'Gallery Preview Click',
    'guide_open': 'Guide',
    'guide_close': 'Guide - Close',
    'guide_done': 'Guide - Done',
    'guide_click_outside': 'Guide - Click Outside',
    'gallery_hero_click': 'Hero Image Click',
    'more_info_open': 'More About Image',
    'nav_next': 'Nav - Next',
    'nav_prev': 'Nav - Prev',
    'order_submitted': 'Order Inquiry Sent',
    'series_info': 'Series Info',
    'sister_image_click': 'Sister Image Click',
    'slideshow_start': 'Slideshow Start',
    'story_slider_click': 'Story Slider Click',
    'theme_click': 'Theme Click',
    // zoom_open is intentionally omitted: redundant with the XL Zooms metric above

    // -- Passive / system events --
    'all_list_click': 'All Galleries Click',
    'grid_open': 'Grid - Open',
    'grid_image_click': 'Grid - Image Click',
    'grid_show_more': 'Grid - Show More',
    'grid_show_previous': 'Grid - Show Previous',
    'scroll_25': 'Page - 25% Scroll',
    'scroll_50': 'Page - 50% Scroll',
    'scroll_75': 'Page - 75% Scroll',
    'scroll_100': 'Page - 100% Scroll',
    'page_view': 'Page View',
    'session_exit': 'Session Exit'
  };
  
  // Merge DB results with canonical list - always show all events
  const eventCounts = {};
  events.forEach(e => { eventCounts[e.event] = e.count; });
  
  // Inject slideshow_start from art_views (Layer B) into event counts
  if (artViewsSummary?.slideshow_starts) {
    eventCounts['slideshow_start'] = (eventCounts['slideshow_start'] || 0) + artViewsSummary.slideshow_starts;
  }
  
  const allEvents = Object.keys(eventLabels).map(key => ({
    event: key,
    label: eventLabels[key],
    count: eventCounts[key] || 0
  })).sort((a, b) => b.count - a.count);
  
  // Helper to format event names (fallback for unlisted events)
  const formatEventName = (name) => {
    if (eventLabels[name]) return eventLabels[name];
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Calculate max for bar chart scaling
  const maxEventCount = Math.max(...allEvents.map(e => e.count), 1);
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
    .container { max-width: 1800px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 20px; }
    h2 { color: #888; font-size: 14px; text-transform: uppercase; margin: 20px 0 10px; }
    .controls { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 5px; }
    .controls a { color: #4a9eff; text-decoration: none; padding: 5px 10px; border-radius: 4px; }
    .controls a:hover, .controls a.active { background: #333; }
    .pulse { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .pulse .pulse-stat { flex: 1; justify-content: center; }
    .pulse-row { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; }
    .pulse-row .pulse-stat { flex: 1; justify-content: center; }
    .pulse-stat { background: #252525; padding: 6px 12px; border-radius: 6px; display: flex; align-items: center; gap: 6px; position: relative; cursor: help; }
    .pulse-stat.clickable { cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
    .pulse-stat.clickable:hover { transform: scale(1.02); }
    .pulse-stat.clickable.off { opacity: 0.4; }
    .pulse-stat .value { font-size: 18px; font-weight: bold; color: #4a9eff; }
    .pulse-stat .label { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
    .pulse-stat .info-icon { width: 12px; height: 12px; border-radius: 50%; background: #444; color: #888; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .pulse-stat .tooltip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; white-space: nowrap; z-index: 1000; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); max-width: 280px; white-space: normal; line-height: 1.4; }
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
    table { width: 100%; border-collapse: collapse; background: #252525; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
    th, td { padding: 5px 8px; text-align: left; border-bottom: 1px solid #333; font-size: 12px; }
    th { background: #1a1a1a; color: #888; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    /* Main grid - fixed 5-column layout, centered */
    .grid, .grid-tall { display: grid; grid-template-columns: repeat(5, 348px); gap: 10px; margin: 0 auto 10px auto; width: fit-content; }
    .section { background: #252525; border-radius: 8px; padding: 10px; overflow: visible; }
    .section h3 { color: #fff; font-size: 13px; margin-bottom: 6px; }
    /* Bar chart styles */
    .bar-row { display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #333; }
    .bar-row:last-child { border-bottom: none; }
    .bar-label { width: 110px; flex-shrink: 0; font-size: 11px; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-container { flex: 1; background: #1a1a1a; border-radius: 4px; height: 16px; margin: 0 6px; overflow: hidden; }
    .bar { height: 100%; background: linear-gradient(90deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px; transition: width 0.3s ease; }
    .bar-value { width: 35px; flex-shrink: 0; text-align: right; font-size: 12px; color: #888; }
    .bar-orange .bar { background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); }
    .bar-green .bar { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
    /* Section tooltips */
    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .section-header h3 { margin: 0; }
    .section-tip { position: relative; cursor: help; }
    .section-tip .info-icon { width: 14px; height: 14px; border-radius: 50%; background: #444; color: #888; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .section-tip .tooltip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; z-index: 1000; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); width: 220px; line-height: 1.4; }
    .section-tip .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #333; }
    .section-tip:hover .tooltip { display: block; }
    /* Wide sections span 2 columns */
    .section.wide { grid-column: span 2; }
    /* Exit blocks - uniform width stacking */
    .exit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
    .exit-block { border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 6px; }
    .exit-block .value { font-size: 14px; font-weight: bold; color: #fff; }
    .exit-block .label { font-size: 10px; }
    /* Art Views 3-column grid - responsive */
    .art-views-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 1780px; margin: 0 auto; }
    @media (max-width: 1000px) { .art-views-grid { grid-template-columns: repeat(2, 1fr); width: 100%; } }
    @media (max-width: 600px) { .art-views-grid { grid-template-columns: 1fr; width: 100%; } }
    /* External traffic 3-column - equal width, fills container */
    .external-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 768px) { .external-grid { grid-template-columns: 1fr; width: 100%; } }
    /* Mobile-friendly */
    @media (max-width: 768px) {
      body { padding: 10px; }
      .container { max-width: 100%; }
      .grid, .grid-tall { grid-template-columns: 1fr; }
      .section.wide { grid-column: span 1; }
      .pulse-row { flex-wrap: wrap; }
      .pulse-row .pulse-stat { flex: none; }
      .pulse { flex-wrap: wrap; gap: 5px; }
      .pulse .pulse-stat { flex: none; }
      .pulse-stat { padding: 4px 8px; }
      .pulse-stat .value { font-size: 14px; }
      .pulse-stat .label { font-size: 9px; }
      h1 { font-size: 18px; }
      h2 { font-size: 13px; margin: 15px 0 8px; }
      .section { padding: 10px; max-height: none; }
      .bar-label { width: 80px; font-size: 10px; }
      .controls { gap: 3px; }
      .controls a { font-size: 10px; padding: 4px 6px; }
      .exit-grid { grid-template-columns: 1fr; }
      .bot-intel-grid { grid-template-columns: 1fr !important; }
    }
    /* Trend chart styles */
    .trend-chart { background: #252525; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .trend-chart h3 { color: #fff; font-size: 14px; margin-bottom: 15px; }
    .trend-bars { display: flex; align-items: flex-end; gap: 4px; height: 100px; padding-bottom: 25px; position: relative; }
    .trend-bar { flex: 1; min-width: 20px; max-width: 60px; background: linear-gradient(180deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px 4px 0 0; position: relative; cursor: pointer; transition: opacity 0.2s; }
    .trend-bar:hover { opacity: 0.8; }
    .trend-bar-label { position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #666; white-space: nowrap; }
    .data-change-marker { color: #f59e0b; font-size: 14px; font-weight: bold; cursor: help; position: relative; top: -1px; margin-left: 1px; }
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
<div class="container">
  <h1>K4 Analytics <a href="/__k4serp" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none;margin-left:20px">📊 SERP</a> <a href="/__k4serp/launch" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none">🚀 Launch Pad</a></h1>
  
  <div class="controls">
    <a href="?days=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 1 && !yesterday ? 'active' : ''}">Today*</a>
    <a href="?yesterday=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${yesterday ? 'active' : ''}">Yesterday*</a>
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
        ? `<a href="${showChardonUrl}" class="bot-filter active">🏠 Team Hidden</a>`
        : `<a href="${hideChardonUrl}" class="bot-filter">🏠 Hide Team</a>`
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
          const isDataChangeDate = t.day === '2026-02-14';
          return `
            <div class="trend-bar" data-visitors="${t.visitors}" data-sessions="${t.sessions}" data-day="${t.day}" style="height: ${height}%" title="${t.day}: ${t.visitors} visitors, ${t.sessions} sessions">
              <span class="trend-bar-value">${t.visitors}</span>
              <span class="trend-bar-label">${dateLabel}${isDataChangeDate ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ''}</span>
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
      <div class="trend-bar" style="height: 100%; width: 80px;" title="${trend[0].day}: ${trend[0].sessions} sessions, ${trend[0].visitors} unique IPs">
        <span class="trend-bar-value">${trend[0].sessions}</span>
        <span class="trend-bar-label">${trend[0].day.slice(5)}${trend[0].day === '2026-02-14' ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ''}</span>
      </div>
    </div>
  </div>
  ` : ''}

  <h2>Pulse</h2>
  <div class="pulse">
    <div class="pulse-stat">
      <span class="value">${s.unique_visitors || 0}</span>
      <span class="label">JS Visitors <span class="info-icon">i</span></span>
      <div class="tooltip">Unique IPs with JS events (Layer C). Only counts visitors whose browser loaded JavaScript and triggered events. Does NOT include image-only viewers � see Art Views below for complete picture.</div>
    </div>
    <div class="pulse-stat">
      <span class="value"><span style="color:#10b981">${newVisitors}</span>/<span style="color:#f59e0b">${returningVisitors}</span></span>
      <span class="label">New/Ret <span class="info-icon">i</span></span>
      <div class="tooltip">New: IPs never seen before this period. Returning: IPs that visited previously. Green = new, Orange = returning.</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.sessions || 0}${minEngagement > 0 ? `<span style="opacity: 0.6; font-size: 0.7em;"> (${minEngagement}-${maxEngagement})</span>` : ''}</span>
      <span class="label">Engaged <span class="info-icon">i</span></span>
      <div class="tooltip">Engaged sessions: browser sessions where JS loaded and events fired. Range shows min-max engagement scores (zoom=4, notes=5, theme=3, nav=2).</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.avg_events_per_session || 0}</span>
      <span class="label">Avg/Sess <span class="info-icon">i</span></span>
      <div class="tooltip">Average events per session. Higher = more engaged visitors exploring galleries and images.</div>
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
  </div>

  <div class="pulse-row">
    ${cowboyJumps > 0 ? `<div class="pulse-stat highlight">
      <span class="value">🤠 ${cowboyJumps}</span>
      <span class="label">Cowboy Jump <span class="info-icon">i</span></span>
      <div class="tooltip">Sessions that used the cowboy easter egg navigation. Fun engagement metric!</div>
    </div>` : ''}
    <div class="pulse-stat" style="background: ${bounceRate > 60 ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : bounceRate > 40 ? 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'};">
      <span class="value" style="color: #fff;">${bounceRate}%</span>
      <span class="label" style="color: ${bounceRate > 40 ? '#fed7aa' : '#a7f3d0'};">Bounce <span class="info-icon" style="background: rgba(255,255,255,0.2); color: ${bounceRate > 40 ? '#fed7aa' : '#a7f3d0'};">i</span></span>
      <div class="tooltip">Sessions with only 1 event (came and left immediately). Lower is better. Above 60% = concern, below 40% = great.</div>
    </div>
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
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">👤 ${artViewsSummary?.unique_viewers || 0}</span>
      <span class="label" style="color: #a7f3d0;">Art Viewers <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Unique IPs that viewed your art. Chapter viewers (JS-verified on-site): ${artViewsSummary?.onsite_viewers || 0}. External embeds: ${Math.max(0, (artViewsSummary?.unique_viewers || 0) - (artViewsSummary?.onsite_viewers || 0))}. Server-side page loads: ${artViewsSummary?.image_pages || 0} unique IPs.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
      <span class="value" style="color: #fff;">👤 ${artViewsSummary?.total || 0}</span>
      <span class="label" style="color: #ddd6fe;">Image Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">JS-verified image views (human only). Chapter browsing (${artViewsSummary?.chapter_views || 0}) + External embeds (${artViewsSummary?.external_images || 0}). Server-side page loads: ${artViewsSummary?.image_pages || 0}.</div>
    </div>
  </div>

  <!-- Art Views Section (Multi-Layer Art Attention Tracking) -->
  <h2 style="margin-top: 20px; margin-bottom: 8px;">🎨 Art Views <span style="font-size: 12px; color: #888; font-weight: normal;">(Chapters: JS-verified | External: Server-Side)</span></h2>
  <p style="color: #888; margin: 0 0 10px 0; font-size: 12px;">
    <strong style="color: #10b981;">Human art viewers (cleaned)</strong> — bots, scrapers, and datacenter traffic excluded. 
    <span class="section-tip" style="display: inline;"><span class="info-icon">i</span><div class="tooltip">Chapters &amp; XL Zooms: counted from JS events (same-origin /track beacon, Layer C). External embeds: server-side /img/ proxy logs (Layer B). Gallery visits: server-side HTML loads (Layer B). Bot exclusion: datacenter IPs without referrer, known scraper UAs.</div></span>
  </p>
  ${(topArtViews?.chapters?.length > 0 || topArtViews?.xlZooms?.length > 0 || topArtViews?.galleries?.length > 0) ? `
  <div class="art-views-grid">
      <!-- Chapters Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #a78bfa; display: flex; align-items: center; justify-content: space-between;">
          <span>📖 Chapters</span>
          <span style="background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Chapters = explicit chapter interface views (events.event='chapter_view', same-origin /track). Beacon (workers.dev) is shown for debugging only: ${artViewsSummary?.chapter_views_beacon || 0}. First-party sanity: image page views=${imagePageViewsFromEvents}, image entry sessions=${imageEntrySessionsFromEvents}.">${artViewsSummary?.chapter_views || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.chapters || []).map((a, i) => {
            const imageId = a.target_id.startsWith('i-') ? a.target_id : null;
            return '<a href="https://k4studios.com/art/' + a.target_id + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(167, 139, 250, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #a78bfa; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(167,139,250,0.25)\'" onmouseout="this.style.background=\'rgba(167,139,250,0.1)\'">' +
              (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? 'eager' : 'lazy') + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">🔍</span>') +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: #a78bfa; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                  '<span style="font-size: 12px; font-weight: bold; color: #a78bfa;">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No chapters yet</p>'}
        </div>
      </div>
      <!-- XL Zooms Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #06b6d4; display: flex; align-items: center; justify-content: space-between;">
          <span>🔍 XL Zooms</span>
          <span style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Zoom button clicks">${artViewsSummary?.xl_zooms || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.xlZooms || []).map((a, i) => {
            const imageId = a.target_id.startsWith('i-') ? a.target_id : null;
            return '<a href="https://k4studios.com/art/' + a.target_id + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(6, 182, 212, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #06b6d4; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(6,182,212,0.25)\'" onmouseout="this.style.background=\'rgba(6,182,212,0.1)\'">' +
              (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? 'eager' : 'lazy') + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">📖</span>') +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: #06b6d4; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                  '<span style="font-size: 12px; font-weight: bold; color: #06b6d4;">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No XL zooms yet</p>'}
        </div>
      </div>
      <!-- Galleries Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #c4b5fd; display: flex; align-items: center; justify-content: space-between;">
          <span>📁 Galleries</span>
          <span style="background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%); color: #1f2937; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Total gallery page views">${artViewsSummary?.galleries || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.galleries || []).map((a, i) => {
            return '<a href="https://k4studios.com/gallery/' + a.target_id + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(196, 181, 253, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #c4b5fd; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(196,181,253,0.25)\'" onmouseout="this.style.background=\'rgba(196,181,253,0.1)\'">' +
              '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 24px;">📁</span>' +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: #c4b5fd; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                  '<span style="font-size: 12px; font-weight: bold; color: #c4b5fd;">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No galleries yet</p>'}
        </div>
      </div>
    </div>
    <p style="font-size: 10px; color: #555; margin-top: 8px;">Views | Unique viewers. Server-side tracking, no JS required.</p>
  </div>
  ` : ''}
  
  <!-- External Traffic - 3-Column: Top Images | Displays | Visitors -->
  ${(artViewsSummary?.externalDisplays?.length > 0 || topArtViews?.external?.length > 0 || Object.keys(entryRefCounts).length > 0) ? `
  <div class="section" style="margin-top: 10px; max-width: 1780px; margin-left: auto; margin-right: auto; max-height: none;">
    <h3>🌐 External Traffic <span style="font-size: 11px; color: #888; font-weight: normal;">(off-site engagement)</span> <span style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; margin-left: 8px;">${artViewsSummary?.external_images || 0} embeds</span></h3>
    <div class="external-grid">
      <!-- Left: Top External Images -->
      <div>
        <div style="font-size: 11px; color: #f97316; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">🏆 Top Images</div>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews?.external || []).map((a, i) => {
            const imageId = a.target_id.startsWith('i-') ? a.target_id : null;
            const sourceIcons = { onsite: '🏠', google: '🔍', bing: '🅱️', pinterest: '📌', facebook: '📘', twitter: '🐦', duckduckgo: '🦆', unattributed: '🌐', other: '🌐', direct: '❓' };
            const sourceColors = { onsite: '#10b981', google: '#4285f4', bing: '#00809d', pinterest: '#e60023', facebook: '#1877f2', twitter: '#1da1f2', duckduckgo: '#de5833', unattributed: '#f97316', other: '#f97316', direct: '#6b7280' };
            const srcIcon = sourceIcons[a.top_source] || '🌐';
            const srcColor = sourceColors[a.top_source] || '#f97316';
            return '<a href="https://k4studios.com/art/' + a.target_id + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: ' + srcColor + '18; border-radius: 6px; padding: 4px; border-left: 3px solid ' + srcColor + '; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'' + srcColor + '35\'" onmouseout="this.style.background=\'' + srcColor + '18\'">' +
              (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? 'eager' : 'lazy') + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">' + srcIcon + '</span>') +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: ' + srcColor + '; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px; align-items: center;">' +
                  '<span style="font-size: 14px;">' + srcIcon + '</span>' +
                  '<span style="font-size: 12px; font-weight: bold; color: ' + srcColor + ';">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No external embeds yet</p>'}
        </div>
      </div>
      <!-- Center: Image Displays -->
      <div>
        <div style="font-size: 11px; color: #f97316; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">📤 By Source</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(artViewsSummary.externalDisplays || []).map(r => {
            const icons = { 'Google Images': '🔍', 'Google Search': '🔍', 'Bing Images': '🅱️', 'Bing Search': '🅱️', 'Pinterest': '📌', 'Facebook': '📘', 'Twitter/X': '🐦', 'Instagram': '📷', 'LinkedIn': '💼', 'DuckDuckGo': '🦆', 'Direct / No Referrer': '🔗', 'Yandex': '🇷🇺', 'Baidu': '🇨🇳' };
            const icon = icons[r.source] || '🌐';
            // For unknown referrers (raw URLs that didn't match any pattern), shorten the display
            let displayName = r.source;
            if (!icons[r.source] && r.source.startsWith('http')) {
              try { displayName = new URL(r.source).hostname; } catch(e) {}
            }
            return '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px;">' +
              '<span style="font-size: 14px;">' + icon + '</span>' +
              '<span style="color: #ccc; font-size: 11px; flex: 1;" title="' + r.source + '">' + displayName + '</span>' +
              '<span style="color: #f97316; font-size: 11px; font-weight: bold;">' + r.views.toLocaleString() + '</span>' +
            '</div>';
          }).join('') || '<p style="color:#666; font-size: 10px;">No external displays</p>'}
          ${artViewsSummary.noRefExternalViews > 0 ? 
            '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px; border-left: 2px solid #ef4444; margin-top: 4px;" title="Image requests with no referrer header. Could be email clients, privacy browsers, or someone embedding your images with referrer stripped.">' +
              '<span style="font-size: 14px;">⚠️</span>' +
              '<span style="color: #ef4444; font-size: 11px; flex: 1;">Unknown Source</span>' +
              '<span style="color: #ef4444; font-size: 11px; font-weight: bold;">' + artViewsSummary.noRefExternalViews.toLocaleString() + '</span>' +
            '</div>' : ''}
        </div>
      </div>
      <!-- Right: Visitors to Site (from events table - JS tracking) -->
      <div>
        <div style="font-size: 11px; color: #22c55e; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">📥 Visitors to Site</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(() => {
            // Confirmed sources (clean referrer match)
            const confirmed = [
              { key: 'direct', label: 'Direct / Typed URL', icon: '🔗' },
              { key: 'google_search', label: 'Google Search', icon: '🔍' },
              { key: 'google_images', label: 'Google Images', icon: '🖼️' },
              { key: 'bing_search', label: 'Bing Search', icon: '🅱️' },
              { key: 'bing_images', label: 'Bing Images', icon: '🖼️' },
              { key: 'pinterest', label: 'Pinterest', icon: '📌' },
              { key: 'facebook', label: 'Facebook', icon: '📘' },
              { key: 'twitter', label: 'Twitter/X', icon: '🐦' },
              { key: 'chatgpt', label: 'ChatGPT', icon: '🤖' },
              { key: 'instagram', label: 'Instagram', icon: '📷' },
              { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
              { key: 'duckduckgo', label: 'DuckDuckGo', icon: '🦆' }
            ];
            const confirmedItems = confirmed
              .filter(s => entryRefCounts[s.key])
              .sort((a, b) => (entryRefCounts[b.key] || 0) - (entryRefCounts[a.key] || 0))
              .map(s => '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px;">' +
                '<span style="font-size: 14px;">' + s.icon + '</span>' +
                '<span style="color: #ccc; font-size: 11px; flex: 1;">' + s.label + '</span>' +
                '<span style="color: #22c55e; font-size: 11px; font-weight: bold;">' + entryRefCounts[s.key] + '</span>' +
              '</div>');
            // Unattributed (privacy-suppressed referrers - this is normal!)
            const unattributed = entryRefCounts['unattributed'] || 0;
            const unattributedItem = unattributed ? 
              '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px; border-left: 2px solid #6b7280;" title="Privacy-suppressed referrers (mobile, in-app browsers, HTTPS). This is normal modern web behavior.">' +
                '<span style="font-size: 14px;">🔒</span>' +
                '<span style="color: #888; font-size: 11px; flex: 1;">Unattributed</span>' +
                '<span style="color: #6b7280; font-size: 11px; font-weight: bold;">' + unattributed + '</span>' +
              '</div>' : '';
            const all = confirmedItems.join('') + unattributedItem;
            return all || '<p style="color:#666; font-size: 10px;">No external visitors yet</p>';
          })()}
        </div>
        <p style="font-size: 9px; color: #555; margin-top: 6px;">🔒 = privacy-suppressed (mobile, in-app, HTTPS)</p>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- All sections grid -->\n  <div class="grid" style="margin-top: 20px;">
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
        <h3 style="margin:0;">Event Breakdown</h3>
        <button id="eventSortToggle" onclick="toggleEventSort()" title="Toggle sort: Alphabetical / By Count" style="
          font-size:10px; padding:2px 8px; border:1px solid #ccc; border-radius:4px;
          background:#f5f0eb; color:#666; cursor:pointer; font-family:monospace; letter-spacing:0.5px;
        ">A?Z</button>
      </div>
      <div id="eventList" style="padding-right: 6px;">
      ${allEvents.map(e => `
          <div class="bar-row" data-label="${e.label}" data-count="${e.count}">
            <span class="bar-label" title="${e.label}">${e.label}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(e.count / maxEventCount * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${e.count}</span>
          </div>
        `).join('')
      }
      </div>
      <script>
        var eventSortMode = 'count';
        function toggleEventSort() {
          var btn = document.getElementById('eventSortToggle');
          var list = document.getElementById('eventList');
          var rows = Array.from(list.querySelectorAll('.bar-row'));
          if (eventSortMode === 'count') {
            rows.sort(function(a, b) { return a.dataset.label.localeCompare(b.dataset.label); });
            eventSortMode = 'alpha';
            btn.textContent = '#';
            btn.title = 'Sort by count';
          } else {
            rows.sort(function(a, b) { return parseInt(b.dataset.count) - parseInt(a.dataset.count); });
            eventSortMode = 'count';
            btn.textContent = 'A?Z';
            btn.title = 'Sort alphabetically';
          }
          rows.forEach(function(r) { list.appendChild(r); });
        }
      </script>
    </div>

    <!-- Viewer Geography -->
    <div class="section">
      <div class="section-header">
        <h3>🗺️ Viewer Geography</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Combined geography. 🎨 Art Viewers = chapter views, zooms, slideshows (Cloudflare geo). 🌐 Site Visitors = JS-tracked page browsing.</div></span>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 6px; font-size: 10px;">
        <span style="color: #10b981;">🎨 Art</span>
        <span style="color: #6b7280;">🌐 Site</span>
      </div>
      ${(artViewsSummary?.geography?.length > 0 || geo.length > 0) ? (() => {
        const countryColors = {
          'US': '#3b82f6', 'FR': '#ef4444', 'DE': '#f97316', 'BR': '#22c55e', 'GB': '#6366f1',
          'CA': '#ec4899', 'AU': '#eab308', 'MX': '#14b8a6', 'IN': '#f59e0b', 'JP': '#e11d48',
          'IT': '#84cc16', 'ES': '#a855f7', 'NL': '#fb923c', 'AT': '#dc2626', 'HU': '#c026d3',
          'SG': '#0ea5e9', 'HK': '#d946ef', 'CN': '#b91c1c', 'KR': '#2563eb', 'CO': '#fbbf24',
          'PL': '#f43f5e', 'SE': '#06b6d4', 'NO': '#0284c7', 'FI': '#0369a1', 'CH': '#dc2626',
          'RU': '#1d4ed8', 'UA': '#fcd34d', 'AR': '#60a5fa', 'ZA': '#a78bfa', 'NZ': '#2dd4bf',
          'PT': '#e879f9', 'CG': '#f472b6', 'CL': '#38bdf8', 'PE': '#fbbf24', 'IE': '#4ade80',
          'BE': '#facc15', 'CZ': '#7dd3fc', 'DK': '#ef4444', 'GR': '#0ea5e9', 'IL': '#6366f1',
          'TW': '#d946ef', 'TH': '#f97316', 'PH': '#8b5cf6', 'TR': '#dc2626', 'RO': '#fde047',
        };
        // Generate a stable color for any unmapped country so Art bars never fall back to gray
        function countryColor(code) {
          if (countryColors[code]) return countryColors[code];
          if (!code) return '#9ca3af';
          let h = 0; for (let i = 0; i < code.length; i++) h = code.charCodeAt(i) * 31 + h;
          const hue = Math.abs(h) % 360;
          return 'hsl(' + hue + ', 70%, 55%)';
        }
        const artGeo = (artViewsSummary.geography || []).map(g => ({
          label: [g.city, g.region, g.country].filter(Boolean).join(', '),
          country: g.country, count: g.unique_viewers, views: g.views, source: 'art'
        }));
        const siteGeo = (geo || []).map(g => ({
          label: [g.city, g.region, g.country].filter(Boolean).join(', '),
          country: g.country, count: g.visitors, source: 'site'
        }));
        const combined = [...artGeo, ...siteGeo].sort((a, b) => b.count - a.count).slice(0, 15);
        const maxCount = Math.max(...combined.map(g => g.count), 1);
        return '<div style="padding-right: 6px;">' + combined.map(g => {
          const isArt = g.source === 'art';
          const barColor = isArt ? countryColor(g.country) : '#4b5563';
          const icon = isArt ? '🎨' : '🌐';
          return `<div class="bar-row"><span style="width: 16px; text-align: center; flex-shrink: 0; font-size: 10px;">${icon}</span><span class="bar-label" title="${g.label}">${g.label}</span><div class="bar-container"><div class="bar" style="width: ${(g.count / maxCount * 100).toFixed(1)}%; background: ${barColor};"></div></div><span class="bar-value">${g.count}</span></div>`;
        }).join('') + '</div>';
      })() : '<p style="color:#666">No data yet</p>'}
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
          return `<tr><td>${icons[d.device] || '?'} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
        }).join('')}
        ${deviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ''}
      </table>
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
      <div>
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
        <h3>? Top Entry Pages</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">First page visited in each session. 🔍=Google Search, 🖼️=Images, 🅱️=Bing, 📌=Pinterest, 🐦=Twitter, 📘=Facebook, 🔗=Direct, 🔄=Internal</div></span>
      </div>
      ${entryPages.length === 0 ? '<p style="color:#666">No data yet</p>' : `
      <table>
        <tr><th>Page</th><th>From</th><th>Sess</th></tr>
        ${entryPages.slice(0, 15).map(p => {
          const isImage = p.page_path.includes('/i-');
          const shortPath = p.page_path.length > 30 ? '...' + p.page_path.slice(-27) : p.page_path;
          const pageIcon = isImage ? '🖼️' : '📄';
          const refIcons = { 
            google_search: '🔍', google_images: '🖼️', 
            bing_search: '🅱️', bing_images: '🖼️', 
            pinterest: '📌', twitter: '🐦', facebook: '📘', instagram: '📷', 
            linkedin: '💼', duckduckgo: '🦆',
            direct: '🔗', internal: '🔄', unattributed: '🔒' 
          };
          const refIcon = refIcons[p.ref_source] || '🔒';
          return `<tr><td title="${p.page_path}">${pageIcon} ${shortPath}</td><td title="${p.ref_source}">${refIcon}</td><td>${p.sessions}</td></tr>`;
        }).join('')}
      </table>
      `}
    </div>

    <div class="section">
      <h3>Gallery-Chapter Entry Points</h3>
      <table>
        <tr><th>Source</th><th>Sessions</th></tr>
        ${entries.map(e => `<tr><td>${formatEventName(e.entry_source)}</td><td>${e.sessions}</td></tr>`).join('')}
        ${entries.length === 0 ? '<tr><td colspan="2">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>Gallery Performance</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Image views grouped by gallery. Colors: 🟣 Painterly, 🔵 Traditional, 🟠 K4 Select</div></span>
      </div>
      <table>
        <tr><th>Gallery</th><th>Sess</th><th>Zoom%</th><th>Avg</th></tr>
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
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Exit pages: where sessions ended. Shows which page types are natural endpoints vs potential problems.</div></span>
      </div>
      <div class="exit-grid">
        <div class="exit-block" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">
          <span class="value">🏠 ${exitByCategory.home || 0}</span>
          <span class="label" style="color: #c7d2fe;">Home</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <span class="value">📁 ${exitByCategory.gallery || 0}</span>
          <span class="label" style="color: #a7f3d0;">Gallery</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%);">
          <span class="value">📖 ${exitByCategory.images || 0}</span>
          <span class="label" style="color: #bfdbfe;">Images</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);">
          <span class="value">📄 ${exitByCategory.landing || 0}</span>
          <span class="label" style="color: #ddd6fe;">Landing</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <span class="value">🏠 ${exitByCategory.blog || 0}</span>
          <span class="label" style="color: #fef3c7;">Blog</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
          <span class="value">📸 ${exitByCategory.photoshoots || 0}</span>
          <span class="label" style="color: #fbcfe8;">Shoots</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); grid-column: span 2;">
          <span class="value">📦 ${exitByCategory.other || 0}</span>
          <span class="label" style="color: #d1d5db;">Other</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Bot Intelligence Section -->
  <div style="max-width: 1780px; margin: 0 auto;">
  <h2 style="margin-top: 30px;">🛡️ Bot Intelligence <span style="font-size: 12px; color: #888; font-weight: normal;">(Threat Classification)</span></h2>
  <p style="color: #888; margin: -10px 0 15px 0; font-size: 12px;">
    Risk accumulates over time. Level 3+ auto-throttled. Level 4 = manual block candidate.
    <button onclick="refreshBotIntelligence()" style="margin-left: 10px; background: #333; color: #888; border: 1px solid #555; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">🔄 Refresh</button>
  </p>
  
  <!-- Risk Summary Pills -->
  <div class="pulse" style="margin-bottom: 15px;">
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">🟢 ${botIntelligence?.verified?.length || 0}</span>
      <span class="label" style="color: #a7f3d0;">Verified Bots <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Confirmed search engine bots (Googlebot, Bingbot, etc). Good traffic - they index your art for image search!</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);">
      <span class="value" style="color: #1f2937;">🟡 ${Math.max(0, (botIntelligence?.stats?.total ?? 0) - (botIntelligence?.stats?.risk3 ?? 0) - (botIntelligence?.stats?.risk4 ?? 0))}</span>
      <span class="label" style="color: #422006;">Watching <span class="info-icon" style="background: rgba(0,0,0,0.15); color: #422006;">i</span></span>
      <div class="tooltip"><strong>Risk score 2-4.</strong> Slightly suspicious behavior but not aggressive. Could be a curious human or a polite bot. Monitoring only.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
      <span class="value" style="color: #fff;">🟠 ${botIntelligence?.stats?.risk3 || 0}</span>
      <span class="label" style="color: #fed7aa;">Throttled <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fed7aa;">i</span></span>
      <div class="tooltip"><strong>Risk score 5-7.</strong> High-confidence scraper. Auto-slowed (500ms delay). Triggers: no referrer + high volume, no branching, datacenter IP, multi-day presence.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);">
      <span class="value" style="color: #fff;">🟣 ${botIntelligence?.stats?.risk4 || 0}</span>
      <span class="label" style="color: #f5d0fe;">Block Candidates <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #f5d0fe;">i</span></span>
      <div class="tooltip"><strong>Risk score 8+.</strong> Malicious/abusive behavior. Heavily throttled (1000ms). Review in High Risk Watchlist and consider blocking. Escalates from Throttled when: persistent multi-day scraping, extreme velocity, or multiple red flags combine.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
      <span class="value" style="color: #fff;"><span style="text-shadow: 0 0 2px #000, 0 0 4px #000;">?</span> ${botIntelligence?.blocked?.filter(b => b.is_active)?.length || 0}</span>
      <span class="label" style="color: #fecaca;">Blocked <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fecaca;">i</span></span>
      <div class="tooltip">Manually blocked IPs. Returns 403 Forbidden. Can unblock from Blocked IPs section below.</div>
    </div>
  </div>

  <div class="bot-intel-grid" style="display: grid; grid-template-columns: 580px 580px 580px; gap: 16px; width: fit-content; margin: 0 auto;">
    <!-- Verified Search Bots (Good!) -->
    <div class="section" style="border: 1px solid #10b98133;">
      <h3 style="color: #10b981;">🟢 Verified Search Bots</h3>
      <p style="color: #888; font-size: 10px; margin: -5px 0 10px 0;">Search engines indexing your art for Google/Bing Images!</p>
      ${(botIntelligence?.verified || []).length === 0 ? '<p style="color:#666">No verified bots detected yet</p>' : 
      '<div style="max-height: 300px; overflow-y: auto;">' +
        (botIntelligence?.verified || []).map(v => {
          const botIcons = {
            'googlebot': '🔍',
            'bingbot': '🅱️', 
            'applebot': '🍎',
            'duckduckbot': '🦆',
            'yandex': '🇷🇺',
            'baidu': '🇨🇳',
            'facebook': '📘',
            'twitter': '🐦',
            'pinterest': '📌',
            'linkedin': '💼',
            'openai': '🤖',
            'claude': '🧠',
          };
          const icon = botIcons[v.bot_name?.toLowerCase()] || '🤖';
          const displayName = v.bot_name ? v.bot_name.charAt(0).toUpperCase() + v.bot_name.slice(1) : 'Unknown';
          const imgCount = v.image_count || 0;
          const pgCount = v.page_count || 0;
          const breakdown = imgCount > 0 || pgCount > 0 
            ? '🖼️ ' + imgCount + ' images, 📄 ' + pgCount + ' pages'
            : v.total_requests + ' requests';
          return '<div style="display: flex; align-items: center; padding: 8px; margin-bottom: 6px; background: #10b98111; border-radius: 6px; gap: 10px;">' +
            '<span style="font-size: 18px;">' + icon + '</span>' +
            '<div style="flex: 1;">' +
              '<div style="color: #10b981; font-weight: bold; font-size: 12px;">' + displayName + '</div>' +
              '<div style="color: #888; font-size: 10px;">' + breakdown + '</div>' +
            '</div>' +
            '<span style="color: #666; font-size: 10px;">' + (v.country || '') + '</span>' +
          '</div>';
        }).join('') +
      '</div>'
      }
    </div>

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
          ${(botIntelligence?.suspects || []).filter(s => s.risk_level >= 2 && s.status !== 'blocked').map(s => {
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
      <h3>? Blocked IPs <span style="font-size: 11px; color: #666; font-weight: normal;">(Archive)</span></h3>
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
            const statusText = isActive ? '? Active' : '? Unblocked';
            const actionHtml = isActive 
              ? "<button onclick=\"unblockIP('" + b.ip_hash + "')\" style=\"background: #374151; color: #9ca3af; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;\">Unblock</button>"
              : '<span style="color: #666;">�</span>';
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
  </div>

  <p style="margin-top: 30px; color: #666; font-size: 12px; max-width: 1780px; margin-left: auto; margin-right: auto;">
    Generated ${new Date().toISOString()} � ${periodLabel}
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
          credentials: 'include',
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
          credentials: 'include',
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
          credentials: 'include',
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
</div>
</body>
</html>`;
}

// ====================
// SERP TRACKER SYSTEM
// ====================
// Track Google rankings via DataForSEO API
// Manual trigger only - no cron, no Bing, no AI Overview
// Cost: ~$0.12/day (15 keywords � $0.008)

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
async function handleTrackEvent(request, env) {
  if (!env?.DB) {
    return new Response('ok', { status: 200 }); // Fail silently
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
    await logArtView(env, type, imageId, request);
    
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
      : change > 0 ? `<span style="color:#10b981">?${change}</span>`
      : change < 0 ? `<span style="color:#ef4444">?${Math.abs(change)}</span>`
      : '<span style="color:#888">�</span>';
    
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

    // 0) Bot short-circuit for /track � prevent Netlify function burn
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
        return handleTrackEvent(request, env);
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
      return fetch(request); // Pass through after logging
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
