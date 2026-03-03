var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/analytics/worker.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var DATACENTER_PREFIXES = [
  // OVH hosting (specific ranges, not broad /8)
  "51.81.",
  "51.68.",
  "51.38.",
  // OVH US/EU
  "135.148.",
  "135.181.",
  // OVH US / Hetzner FI
  "146.59.",
  // OVH PL
  "57.128.",
  "57.129.",
  // OVH DE/EU
  // AWS (specific known hosting /16 ranges)
  "3.145.",
  "3.148.",
  // AWS Ohio
  "18.117.",
  "18.118.",
  "18.218.",
  "18.222.",
  // AWS Ohio
  "34.205.",
  "34.224.",
  "34.235.",
  // AWS US-East
  "52.55.",
  "52.70.",
  "52.73.",
  // AWS US-East
  "54.236.",
  // AWS US-East
  "15.204.",
  // OVH
  // Hetzner, DigitalOcean, Vultr
  "159.138.",
  // Huawei Cloud
  "162.19.",
  // OVH
  "185.170.",
  // Datacenter
  "216.244.",
  // DotBot / hosting
  // Chinese cloud (specific ranges)
  "43.154.",
  "43.155.",
  "43.159.",
  // Tencent Cloud specific
  "101.32.",
  "101.33.",
  // Tencent Cloud
  "119.28.",
  "124.243."
  // Alibaba/Huawei
];
var VERIFIED_BOTS = [
  { name: "Googlebot", pattern: /googlebot|google-inspectiontool|googleother|apis-google/i },
  { name: "Bingbot", pattern: /bingbot|bingpreview|msnbot/i },
  { name: "Applebot", pattern: /applebot/i },
  { name: "DuckDuckBot", pattern: /duckduckbot/i },
  { name: "Yandex", pattern: /yandex/i },
  { name: "Baidu", pattern: /baiduspider/i },
  { name: "Facebook", pattern: /facebookexternalhit|facebot/i },
  { name: "Twitter", pattern: /twitterbot/i },
  { name: "Pinterest", pattern: /pinterestbot/i },
  { name: "LinkedIn", pattern: /linkedinbot/i },
  { name: "OpenAI", pattern: /gptbot|chatgpt-user|oai-searchbot/i },
  { name: "Claude", pattern: /claudebot|anthropic-ai|claude-web/i }
];
var DATACENTER_CITIES = [
  "Ashburn",
  "Moses Lake",
  "Leesburg",
  "Dublin",
  "Prineville",
  "Boardman",
  "The Dalles",
  "Forest City",
  "Council Bluffs",
  "Clonee"
];
var DATACENTER_ASNS = [
  16509,
  14618,
  8075,
  15169,
  396982,
  13335
];
var TRUSTED_TEST_IPS = /* @__PURE__ */ new Set([
  "184.56.48.57"
]);
function normalizeIpHash(value) {
  if (!value) return "";
  return String(value).split(",")[0]?.trim() || "";
}
__name(normalizeIpHash, "normalizeIpHash");
__name2(normalizeIpHash, "normalizeIpHash");
function getVerifiedBotName(ua) {
  if (!ua) return null;
  for (const bot of VERIFIED_BOTS) {
    if (bot.pattern.test(ua)) return bot.name;
  }
  return null;
}
__name(getVerifiedBotName, "getVerifiedBotName");
__name2(getVerifiedBotName, "getVerifiedBotName");
var crawlerStatusTableInitPromise = null;
async function ensureCrawlerStatusTable(env) {
  if (!env?.DB) return;
  if (crawlerStatusTableInitPromise) {
    await crawlerStatusTableInitPromise;
    return;
  }
  crawlerStatusTableInitPromise = (async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS crawler_status_daily (
        day TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        bot_name TEXT NOT NULL,
        total_requests INTEGER NOT NULL DEFAULT 0,
        status_200 INTEGER NOT NULL DEFAULT 0,
        status_301 INTEGER NOT NULL DEFAULT 0,
        status_302 INTEGER NOT NULL DEFAULT 0,
        status_404 INTEGER NOT NULL DEFAULT 0,
        status_410 INTEGER NOT NULL DEFAULT 0,
        status_429 INTEGER NOT NULL DEFAULT 0,
        status_5xx INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (day, ip_hash, bot_name)
      )`
    ).run();
    await env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_crawler_status_daily_ip_day ON crawler_status_daily (ip_hash, day)`
    ).run();
    await env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_crawler_status_daily_bot_day ON crawler_status_daily (bot_name, day)`
    ).run();
  })();
  try {
    await crawlerStatusTableInitPromise;
  } catch (e) {
    crawlerStatusTableInitPromise = null;
    throw e;
  }
}
__name(ensureCrawlerStatusTable, "ensureCrawlerStatusTable");
__name2(ensureCrawlerStatusTable, "ensureCrawlerStatusTable");
function getCrawlerStatusDeltas(eventType, inferredFrom = null) {
  const normalizedType = String(eventType || "").trim().toLowerCase();
  const normalizedFrom = String(inferredFrom || "").trim().toLowerCase();
  const deltas = {
    total_requests: 0,
    status_200: 0,
    status_301: 0,
    status_302: 0,
    status_404: 0,
    status_410: 0,
    status_429: 0,
    status_5xx: 0
  };
  if (!normalizedType) return deltas;
  if (normalizedType === "301") {
    deltas.total_requests = 1;
    deltas.status_301 = 1;
    return deltas;
  }
  if (normalizedType === "302") {
    deltas.total_requests = 1;
    deltas.status_302 = 1;
    return deltas;
  }
  if (normalizedType === "404") {
    deltas.total_requests = 1;
    deltas.status_404 = 1;
    return deltas;
  }
  if (normalizedType === "410" || normalizedType === "smart404_gone") {
    deltas.total_requests = 1;
    deltas.status_410 = 1;
    return deltas;
  }
  if (normalizedType === "429" || normalizedType === "harvester_friction" && normalizedFrom === "429") {
    deltas.total_requests = 1;
    deltas.status_429 = 1;
    return deltas;
  }
  if (/^5\d\d$/.test(normalizedType)) {
    deltas.total_requests = 1;
    deltas.status_5xx = 1;
    return deltas;
  }
  if (normalizedType === "200" || normalizedType === "verified_bot" || normalizedType === "image_page" || normalizedType === "external_image_page" || normalizedType === "direct_image") {
    deltas.total_requests = 1;
    deltas.status_200 = 1;
    return deltas;
  }
  return deltas;
}
__name(getCrawlerStatusDeltas, "getCrawlerStatusDeltas");
__name2(getCrawlerStatusDeltas, "getCrawlerStatusDeltas");
async function recordCrawlerStatusDaily(env, ipHash, botName, eventType, inferredFrom = null) {
  if (!env?.DB || !ipHash || !botName) return;
  const deltas = getCrawlerStatusDeltas(eventType, inferredFrom);
  if (!deltas.total_requests) return;
  try {
    await ensureCrawlerStatusTable(env);
    await env.DB.prepare(
      `INSERT INTO crawler_status_daily (
        day, ip_hash, bot_name, total_requests, status_200, status_301, status_302, status_404, status_410, status_429, status_5xx, updated_at
      ) VALUES (
        date('now', '-5 hours'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(day, ip_hash, bot_name) DO UPDATE SET
        total_requests = total_requests + excluded.total_requests,
        status_200 = status_200 + excluded.status_200,
        status_301 = status_301 + excluded.status_301,
        status_302 = status_302 + excluded.status_302,
        status_404 = status_404 + excluded.status_404,
        status_410 = status_410 + excluded.status_410,
        status_429 = status_429 + excluded.status_429,
        status_5xx = status_5xx + excluded.status_5xx,
        updated_at = datetime('now')`
    ).bind(
      ipHash,
      botName,
      deltas.total_requests,
      deltas.status_200,
      deltas.status_301,
      deltas.status_302,
      deltas.status_404,
      deltas.status_410,
      deltas.status_429,
      deltas.status_5xx
    ).run();
  } catch (e) {
    console.log("Crawler status aggregate write failed:", e.message);
  }
}
__name(recordCrawlerStatusDaily, "recordCrawlerStatusDaily");
__name2(recordCrawlerStatusDaily, "recordCrawlerStatusDaily");
function hashIP(ip) {
  if (!ip) return "unknown";
  const normalized = String(ip).split(",")[0]?.trim();
  return normalized || "unknown";
}
__name(hashIP, "hashIP");
__name2(hashIP, "hashIP");
function isSyntheticTraffic(request) {
  const city = request.cf?.city;
  if (city && DATACENTER_CITIES.includes(city)) {
    return true;
  }
  const asn = request.cf?.asn;
  if (asn && DATACENTER_ASNS.includes(asn)) {
    return true;
  }
  const ua = (request.headers.get("User-Agent") || "").toLowerCase();
  if (ua.includes("headless") || ua.includes("chrome-lighthouse") || ua.includes("phantomjs") || ua.includes("puppeteer") || ua.includes("selenium") || ua.includes("webdriver") || /\bcurl\b/.test(ua) || /\bbot\b/.test(ua) || /\bspider\b/.test(ua) || /\bcrawler\b/.test(ua) || ua === "" || ua === "unknown") {
    return true;
  }
  return false;
}
__name(isSyntheticTraffic, "isSyntheticTraffic");
__name2(isSyntheticTraffic, "isSyntheticTraffic");
var GALLERY_LANDING_PATHS = [
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
  "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color",
  "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White",
  "/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars",
  "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Iceland",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/South/Gallery",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Color",
  "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Black-White",
  "/Galleries/Fine-Art-Photography/Portraits/Color",
  "/Galleries/Fine-Art-Photography/Portraits/Black-White",
  "/Galleries/Fine-Art-Photography/Portraits/Reenactors",
  "/Galleries/Fine-Art-Photography/Transportation/Boats",
  "/Galleries/Fine-Art-Photography/Transportation/Cars",
  "/Galleries/Fine-Art-Photography/Transportation/Military",
  "/Galleries/Fine-Art-Photography/Transportation/Planes",
  "/Galleries/Fine-Art-Photography/Transportation/Trains",
  "/Galleries/Fine-Art-Photography/Transportation/Trains-Black-White",
  "/Galleries/Fine-Art-Photography/Architecture/Gallery",
  "/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments",
  "/Galleries/Fine-Art-Photography/Miscellaneous/Pets",
  "/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife",
  "/Other/K4-Select-Series/Engrained/Engrained-Series"
];
var notCacheWarmer = /* @__PURE__ */ __name2(
  (alias) => `LOWER(COALESCE(${alias}.ua, '')) NOT LIKE '%k4-cache-warmer%'`,
  "notCacheWarmer"
);
var sqlStringLiteral = /* @__PURE__ */ __name2(
  (value) => `'${String(value).replace(/'/g, "''")}'`,
  "sqlStringLiteral"
);
var CANONICAL_GALLERY_LANDING_PATHS = GALLERY_LANDING_PATHS.map(
  (p) => p && p[0] === "/" ? p : `/${p}`
);
var GALLERY_LANDING_IN_LIST = `(${CANONICAL_GALLERY_LANDING_PATHS.map(sqlStringLiteral).join(",")})`;
function getAccessType(referer) {
  if (!referer) return "direct";
  let host;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch (e) {
    return "unknown";
  }
  if (host.endsWith("k4studios.com")) return "internal_navigation";
  return "external_referral";
}
__name(getAccessType, "getAccessType");
__name2(getAccessType, "getAccessType");
function getReferrerSource(referer) {
  if (!referer) return null;
  const r = referer.toLowerCase().trim();
  if (r === "direct" || r === "" || r === "null") return "Direct";
  let host;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch (e) {
    if (r.includes("google")) return "Google Search";
    if (r.includes("bing")) return "Bing";
    return "Other";
  }
  if (host.endsWith("k4studios.com")) return null;
  if (host.includes("googleusercontent")) return "Google Images";
  if (host.includes("google")) return "Google Search";
  if (host.includes("bing")) return "Bing";
  if (host === "t.co" || host.includes("twitter") || host.includes("x.com")) return "Twitter/X";
  if (host.includes("facebook") || host.includes("fb.com")) return "Facebook";
  if (host.includes("pinterest")) return "Pinterest";
  if (host.includes("duckduckgo")) return "DuckDuckGo";
  if (host.includes("yandex")) return "Yandex";
  if (host.includes("baidu")) return "Baidu";
  if (host.includes("chatgpt") || host.includes("openai")) return "ChatGPT";
  return host;
}
__name(getReferrerSource, "getReferrerSource");
__name2(getReferrerSource, "getReferrerSource");
function getAssetSourceLabel(assetSource) {
  if (!assetSource) return null;
  const s = String(assetSource).trim().toLowerCase();
  if (!s) return null;
  if (s === "og") return "Open Graph";
  if (s === "tw") return "Twitter/X";
  if (s === "pn") return "Pinterest";
  if (s === "sd") return "Structured Data";
  return null;
}
__name(getAssetSourceLabel, "getAssetSourceLabel");
__name2(getAssetSourceLabel, "getAssetSourceLabel");
function formatOGPlatformLabel(ogPlatform) {
  const p = String(ogPlatform || "").trim().toLowerCase();
  if (!p) return null;
  const map = {
    facebook: "Facebook",
    discord: "Discord",
    slack: "Slack",
    linkedin: "LinkedIn",
    twitter: "Twitter",
    whatsapp: "WhatsApp",
    apple: "Apple",
    unknown: "Unknown"
  };
  if (map[p]) return map[p];
  return p.charAt(0).toUpperCase() + p.slice(1);
}
__name(formatOGPlatformLabel, "formatOGPlatformLabel");
__name2(formatOGPlatformLabel, "formatOGPlatformLabel");
function formatAssetSourceLabel(assetSourceLabel, ogPlatform) {
  if (!assetSourceLabel) return null;
  if (assetSourceLabel !== "Open Graph") return assetSourceLabel;
  const plat = formatOGPlatformLabel(ogPlatform);
  if (!plat) return "Open Graph";
  return `Open Graph (${plat})`;
}
__name(formatAssetSourceLabel, "formatAssetSourceLabel");
__name2(formatAssetSourceLabel, "formatAssetSourceLabel");
function classifyForEntryRef(referer) {
  if (!referer) return "direct";
  let host;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch (e) {
    return "unattributed";
  }
  if (host.endsWith("k4studios.com")) return "unattributed";
  if (host.includes("googleusercontent") || host.includes("images.google")) return "google_images";
  if (host.includes("google")) return "google_search";
  if (host.includes("bing")) return "bing_search";
  if (host === "t.co" || host.includes("twitter") || host.includes("x.com")) return "twitter";
  if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
  if (host.includes("pinterest")) return "pinterest";
  if (host.includes("duckduckgo")) return "duckduckgo";
  if (host.includes("chatgpt") || host.includes("openai")) return "chatgpt";
  if (host.includes("instagram")) return "instagram";
  if (host.includes("linkedin")) return "linkedin";
  return "unattributed";
}
__name(classifyForEntryRef, "classifyForEntryRef");
__name2(classifyForEntryRef, "classifyForEntryRef");
var IMAGE_ID_MAP_URL = "https://k4studios.com/imageIdMap.json";
var IMAGE_ID_MAP_TTL_MS = 60 * 60 * 1e3;
var _imageIdMapCache = null;
var _imageIdMapCacheTime = 0;
async function getImageIdMapCached() {
  const now = Date.now();
  if (_imageIdMapCache && now - _imageIdMapCacheTime < IMAGE_ID_MAP_TTL_MS) {
    return _imageIdMapCache;
  }
  try {
    const res = await fetch(IMAGE_ID_MAP_URL, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error("imageIdMap fetch failed: " + res.status);
    const data = await res.json();
    if (data && typeof data === "object") {
      _imageIdMapCache = data;
      _imageIdMapCacheTime = now;
      return _imageIdMapCache;
    }
  } catch (e) {
    console.log("imageIdMap fetch failed:", e?.message || e);
  }
  return _imageIdMapCache;
}
__name(getImageIdMapCached, "getImageIdMapCached");
__name2(getImageIdMapCached, "getImageIdMapCached");
function getCanonicalGalleryPathForImageId(imageIdMap, imageId) {
  if (!imageIdMap || !imageId) return null;
  const raw = imageIdMap[imageId];
  const path = Array.isArray(raw) ? raw[0] : raw;
  if (!path || typeof path !== "string") return null;
  return String(path).replace(/\/+$/, "");
}
__name(getCanonicalGalleryPathForImageId, "getCanonicalGalleryPathForImageId");
__name2(getCanonicalGalleryPathForImageId, "getCanonicalGalleryPathForImageId");
async function getHumanCount(env, dateClause = "") {
  const jsProof = `EXISTS (
    SELECT 1 FROM classified_events j
    WHERE j.visitor_id = e.visitor_id
      AND j.source = 'js'
      AND j.visitor_id IS NOT NULL
      AND j.visitor_id != ''
  )`;
    const query = dateClause ? `
        SELECT COUNT(DISTINCT e.visitor_id) as count
        FROM classified_events e
        WHERE e.is_bot = 0
          AND e.visitor_id IS NOT NULL
          AND e.visitor_id != ''
          AND ${jsProof}
          AND ${dateClause.replace(/\bts\b/g, "e.ts")}
      ` : `
        SELECT COUNT(DISTINCT e.visitor_id) as count
        FROM classified_events e
        WHERE e.is_bot = 0
          AND e.source = 'js'
          AND e.visitor_id IS NOT NULL
          AND e.visitor_id != ''
      `;
  const result = await env.DB.prepare(query).first();
  return result?.count || 0;
}
__name(getHumanCount, "getHumanCount");
__name2(getHumanCount, "getHumanCount");
async function getArtViews(env, filters) {
  const { dateClause, baseDateClause, hideBotsPredicate, hideBots, selectedDate } = filters;
  const notBotWhenHide = /* @__PURE__ */ __name2(
    (alias) => hideBots ? `AND COALESCE(${alias}.is_bot, 0) = 0` : "",
    "notBotWhenHide"
  );
    const humanCount = await getHumanCount(env, dateClause);
    if (humanCount === 0) {
      return {
        artViewsSummary: {
          unique_viewers: 0,
          chapter_views: 0,
          xl_zooms: 0,
          galleries: 0,
          external_images: 0,
          total: 0
        },
        artViewsByType: [],
        topArtViews: { chapters: [], xlZooms: [], external: [], galleries: [] },
        externalImageAccess: [],
        externalImageAccessTotal: 0,
        externalReachGeo: [],
        externalReachSources: [],
        externalDailySummary: {
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          todayLabel: selectedDate || "Today",
          yesterdayLabel: selectedDate ? "Prev Day" : "Yesterday",
          today: { total: 0, u: 0, e: 0 },
          yesterday: { total: 0, u: 0, e: 0 },
          delta: 0,
          pct: 0,
          topSources: []
        },
        entryRefCountsObj: {},
        imageAccessOverview: [],
        viewerDepth: {
          avgScore: 0,
          highDepthCount: 0,
          totalViewers: 0,
          distribution: []
        },
        suppressionStats: { suppressedToday: 0, activeSuppressedIPs: 0 }
      };
    }
  let artViewsSummary = {
    unique_viewers: humanCount,
    chapter_views: 0,
    xl_zooms: 0,
    galleries: 0,
    external_images: 0,
    total: 0
  };
  try {
    const summaryQuery = `
      SELECT 'xl_zoom' as event_type, COUNT(*) as views
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type = 'xl_zoom'
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}

      UNION ALL

      SELECT 'gallery_view' as event_type, COUNT(*) as views
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type IN ('gallery', 'gallery_view')
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}

      UNION ALL

      SELECT 'external_image' as event_type, COUNT(*) as views
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
    `;
    const summaryResult = await env.DB.prepare(summaryQuery).all();
    for (const row of summaryResult.results || []) {
      if (row.event_type === "xl_zoom") {
        artViewsSummary.xl_zooms = row.views;
      }
      if (row.event_type === "gallery" || row.event_type === "gallery_view") {
        artViewsSummary.galleries = row.views;
      }
      if (row.event_type === "external" || row.event_type === "external_image") {
        artViewsSummary.external_images = row.views;
      }
    }
    try {
      const chapterViewsQuery = `
        SELECT COUNT(*) as chapter_views
        FROM (
          SELECT e.visitor_id, e.target_id, COALESCE(e.session_id, 'd:' || date(e.ts)) as session_bucket
          FROM human_population hp
          JOIN classified_events e ON e.visitor_id = hp.visitor_id
          WHERE e.event_type IN ('chapter_exposure', 'chapter_view')
            AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
          GROUP BY e.visitor_id, e.target_id, session_bucket
        )
      `;
      const chapterViewsResult = await env.DB.prepare(chapterViewsQuery).first();
      artViewsSummary.chapter_views = chapterViewsResult?.chapter_views || 0;
    } catch (e) {
      console.log("Chapter views query failed:", e.message);
    }
    artViewsSummary.total = artViewsSummary.chapter_views + artViewsSummary.external_images;
  } catch (e) {
    console.log("Summary query failed:", e.message);
  }
  try {
    const frictionQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN inferred_from = 'delay' THEN 1 ELSE 0 END) as delayed,
        SUM(CASE WHEN inferred_from = '429' THEN 1 ELSE 0 END) as blocked_429
      FROM raw_events
      WHERE event_type = 'harvester_friction'
        AND ${dateClause || 'ts > datetime("now", "-1 day")'}
    `;
    const frictionResult = await env.DB.prepare(frictionQuery).first();
    artViewsSummary.harvester_friction_events = frictionResult?.total || 0;
    artViewsSummary.harvester_friction_delay_events = frictionResult?.delayed || 0;
    artViewsSummary.harvester_friction_429_events = frictionResult?.blocked_429 || 0;
  } catch (e) {
    console.log("Harvester friction query failed:", e.message);
  }
  let topChapters = [];
  try {
    const topChaptersQuery = `
      SELECT
        e.target_id,
        SUM(CASE WHEN e.event_type = 'chapter_view' THEN 1 ELSE 0 END) as js_views,
        SUM(CASE WHEN e.event_type = 'chapter_exposure' THEN 1 ELSE 0 END) as proxy_views,
        COUNT(DISTINCT CASE WHEN e.event_type = 'chapter_view' THEN e.visitor_id ELSE NULL END) as js_unique_viewers,
        COUNT(DISTINCT CASE WHEN e.event_type = 'chapter_exposure' THEN e.visitor_id ELSE NULL END) as proxy_unique_viewers,
        GROUP_CONCAT(DISTINCT LOWER(COALESCE(hp.device_type, 'unknown'))) as device_types,
        GROUP_CONCAT(DISTINCT e.country) as countries,
        MAX(CASE WHEN e.event_type = 'chapter_view' THEN 1 ELSE 0 END) as has_js_view,
        MAX(CASE WHEN e.event_type = 'chapter_view' THEN e.ts ELSE NULL END) as last_seen_js,
        MAX(CASE WHEN e.event_type = 'chapter_exposure' THEN e.ts ELSE NULL END) as last_seen_proxy,

        (
          SELECT e2.page
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_view'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.page IS NOT NULL
          GROUP BY e2.page
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_page_js,
        (
          SELECT e2.page
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_exposure'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.page IS NOT NULL
          GROUP BY e2.page
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_page_proxy,

        (
          SELECT e2.referer
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_view'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.referer IS NOT NULL
            AND e2.referer NOT LIKE '%k4studios.com%'
          GROUP BY e2.referer
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_referer_js,
        (
          SELECT e2.referer
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_exposure'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.referer IS NOT NULL
            AND e2.referer NOT LIKE '%k4studios.com%'
          GROUP BY e2.referer
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_referer_proxy,

        (
          SELECT e2.country
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_view'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_country_js,
        (
          SELECT e2.region
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_view'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_region_js,
        (
          SELECT e2.city
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_view'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city_js,

        (
          SELECT e2.country
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_exposure'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_country_proxy,
        (
          SELECT e2.region
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_exposure'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_region_proxy,
        (
          SELECT e2.city
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'chapter_exposure'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city_proxy
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type IN ('chapter_exposure', 'chapter_view')
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY (
        CASE
          WHEN MAX(CASE WHEN e.event_type = 'chapter_view' THEN 1 ELSE 0 END) = 1
          THEN SUM(CASE WHEN e.event_type = 'chapter_view' THEN 1 ELSE 0 END)
          ELSE SUM(CASE WHEN e.event_type = 'chapter_exposure' THEN 1 ELSE 0 END)
        END
      ) DESC
      LIMIT 2000
    `;
    const result = await env.DB.prepare(topChaptersQuery).all();
    topChapters = (result.results || []).map((r) => {
      const hasJsView = r.has_js_view === 1;
      const views = hasJsView ? r.js_views || 0 : r.proxy_views || 0;
      const uniqueViewers = hasJsView ? r.js_unique_viewers || 0 : r.proxy_unique_viewers || 0;
      const bestReferer = hasJsView ? r.best_referer_js : r.best_referer_proxy;
      const bestPage = hasJsView ? r.best_page_js : r.best_page_proxy;
      const lastSeen = hasJsView ? r.last_seen_js : r.last_seen_proxy;
      const geo = hasJsView ? {
        country: r.geo_country_js,
        region: r.geo_region_js,
        city: r.geo_city_js
      } : {
        country: r.geo_country_proxy,
        region: r.geo_region_proxy,
        city: r.geo_city_proxy
      };
      const referrerSource = getReferrerSource(bestReferer);
      return {
        type: hasJsView ? "chapter_view" : "chapter_exposure",
        target_id: r.target_id,
        views,
        unique_viewers: uniqueViewers,
        has_js_view: hasJsView,
        last_seen: lastSeen || null,
        devices: (r.device_types || "").split(",").map((s) => (s || "").trim()).filter(Boolean),
        countries: r.countries,
        url: bestPage || null,
        geo,
        referrer_source: referrerSource
      };
    });
  } catch (e) {
    console.log("Top chapters query failed:", e.message);
  }
  let topZooms = [];
  try {
    const topZoomsQuery = `
      SELECT 
        e.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT e.visitor_id) as unique_viewers,
        GROUP_CONCAT(DISTINCT LOWER(COALESCE(hp.device_type, 'unknown'))) as device_types,
        MAX(e.ts) as last_seen,
        (
          SELECT e2.page
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'xl_zoom'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.page IS NOT NULL
          GROUP BY e2.page
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_page,
        (
          SELECT e2.country
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'xl_zoom'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_country,
        (
          SELECT e2.region
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'xl_zoom'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_region,
        (
          SELECT e2.city
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'xl_zoom'
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type = 'xl_zoom'
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 2000
    `;
    const result = await env.DB.prepare(topZoomsQuery).all();
    topZooms = (result.results || []).map((r) => ({
      type: "xl_zoom",
      target_id: r.target_id,
      views: r.views,
      unique_viewers: r.unique_viewers,
      last_seen: r.last_seen || null,
      devices: (r.device_types || "").split(",").map((s) => (s || "").trim()).filter(Boolean),
      url: r.best_page || null,
      geo: { country: r.geo_country, region: r.geo_region, city: r.geo_city }
    }));
  } catch (e) {
    console.log("Top zooms query failed:", e.message);
  }
  let topGalleries = [];
  try {
    const topGalleriesQuery = `
      SELECT 
        e.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT e.visitor_id) as unique_viewers,
        GROUP_CONCAT(DISTINCT LOWER(COALESCE(hp.device_type, 'unknown'))) as device_types,
        (
          SELECT e2.page
          FROM classified_events e2
          WHERE e2.event_type IN ('gallery', 'gallery_view')
            AND e2.target_id = e.target_id
            AND e2.page IS NOT NULL
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
          GROUP BY e2.page
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_page
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type IN ('gallery', 'gallery_view')
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 50
    `;
    const result = await env.DB.prepare(topGalleriesQuery).all();
    const rawGalleries = (result.results || []).map((r) => ({
      type: "gallery_view",
      target_id: r.target_id,
      views: r.views,
      unique_viewers: r.unique_viewers,
      devices: (r.device_types || "").split(",").map((s) => (s || "").trim()).filter(Boolean),
      gallery_url: r.best_page && String(r.best_page).startsWith("/") ? r.best_page : r.best_page ? "/" + String(r.best_page).replace(/^\/+/, "") : null
    }));
    const getDisplayName = /* @__PURE__ */ __name2((path) => {
      const parts = String(path || "").split("/").filter(Boolean);
      return parts.slice(-2).join("/") || path;
    }, "getDisplayName");
    topGalleries = rawGalleries.map((g) => ({
      ...g,
      display_name: getDisplayName(g.target_id)
    })).sort((a, b) => b.views - a.views).slice(0, 15);
  } catch (e) {
    console.log("Top galleries query failed:", e.message);
  }
  let viewerDepth = {
    avgScore: 0,
    highDepthCount: 0,
    totalViewers: 0,
    distribution: [],
    maxScore: 0
  };
  try {
    const depthQuery = `
      WITH viewer_scores AS (
        SELECT 
          e.visitor_id,
          SUM(
            CASE
              WHEN e.event_type IN ('gallery', 'gallery_view') THEN 1
              WHEN e.event_type IN ('chapter_exposure', 'chapter_view') THEN 2
              WHEN e.event_type = 'xl_zoom' THEN 5
              ELSE 0
            END
          ) AS depth_score
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
        GROUP BY e.visitor_id
        HAVING depth_score > 0
      )
      SELECT 
        COUNT(*) as total_viewers,
        ROUND(AVG(depth_score), 1) as avg_score,
        SUM(CASE WHEN depth_score >= 20 THEN 1 ELSE 0 END) as high_depth_count,
        SUM(CASE WHEN depth_score >= 10 AND depth_score < 20 THEN 1 ELSE 0 END) as engaged_count,
        SUM(CASE WHEN depth_score >= 3 AND depth_score < 10 THEN 1 ELSE 0 END) as curious_count,
        SUM(CASE WHEN depth_score < 3 THEN 1 ELSE 0 END) as casual_count,
        MAX(depth_score) as max_score
      FROM viewer_scores
    `;
    const depthResult = await env.DB.prepare(depthQuery).first();
    if (depthResult) {
      viewerDepth = {
        totalViewers: depthResult.total_viewers || 0,
        avgScore: depthResult.avg_score || 0,
        highDepthCount: depthResult.high_depth_count || 0,
        maxScore: depthResult.max_score || 0,
        distribution: [
          {
            label: "Collectors (20+)",
            count: depthResult.high_depth_count || 0
          },
          { label: "Engaged (10-19)", count: depthResult.engaged_count || 0 },
          { label: "Curious (3-9)", count: depthResult.curious_count || 0 },
          { label: "Casual (<3)", count: depthResult.casual_count || 0 }
        ]
      };
    }
  } catch (e) {
    console.log("Depth query failed:", e.message);
  }
  let suppressionStats = { suppressedToday: 0, activeSuppressedIPs: 0 };
  try {
    if (hideBots && baseDateClause && hideBotsPredicate) {
      const hiddenQuery = `
        SELECT
          COUNT(*) as hidden_events,
          COUNT(DISTINCT visitor_id) as hidden_visitors
        FROM classified_events
        WHERE visitor_id IS NOT NULL
          AND visitor_id != ''
          AND is_bot = 0
          AND EXISTS (
            SELECT 1 FROM classified_events j
            WHERE j.visitor_id = classified_events.visitor_id
              AND j.source = 'js'
          )
          AND ${baseDateClause}
          AND ${hideBotsPredicate}
      `;
      const hiddenResult = await env.DB.prepare(hiddenQuery).first();
      suppressionStats.suppressedToday = hiddenResult?.hidden_events || 0;
      suppressionStats.activeSuppressedIPs = hiddenResult?.hidden_visitors || 0;
    } else {
      const botCountQuery = `
        SELECT COUNT(*) as bot_events, COUNT(DISTINCT visitor_id) as bot_visitors
        FROM classified_events
        WHERE is_bot = 1
          AND visitor_id IS NOT NULL
          AND visitor_id != ''
          AND ${dateClause || `ts > datetime('now', '-1 day')`}
      `;
      const botResult = await env.DB.prepare(botCountQuery).first();
      suppressionStats.suppressedToday = botResult?.bot_events || 0;
      suppressionStats.activeSuppressedIPs = botResult?.bot_visitors || 0;
    }
  } catch (e) {
    console.log("Bot count query failed:", e.message);
  }
  let externalImageAccess = [];
  try {
    const externalQueryWithRefTypeAndAssetSource = `
      SELECT 
        e.target_id,
        COUNT(*) as hits,
        MAX(e.ts) as last_seen,
        e.referer,
        e.ref_type,
        e.asset_source,
        e.og_platform,
        e.country,
        (
          SELECT e2.country
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_country,
        (
          SELECT e2.region
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_region,
        (
          SELECT e2.city
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id, e.referer, e.ref_type, e.asset_source, e.og_platform
      ORDER BY hits DESC
      LIMIT 2000
    `;
    const externalQueryWithRefType = `
      SELECT 
        e.target_id,
        COUNT(*) as hits,
        MAX(e.ts) as last_seen,
        e.referer,
        e.ref_type,
        e.country,
        (
          SELECT e2.country
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_country,
        (
          SELECT e2.region
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_region,
        (
          SELECT e2.city
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id, e.referer, e.ref_type
      ORDER BY hits DESC
      LIMIT 2000
    `;
    const externalQueryLegacy = `
      SELECT 
        e.target_id,
        COUNT(*) as hits,
        MAX(e.ts) as last_seen,
        e.referer,
        e.country,
        (
          SELECT e2.country
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_country,
        (
          SELECT e2.region
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_region,
        (
          SELECT e2.city
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id, e.referer
      ORDER BY hits DESC
      LIMIT 2000
    `;
    let result;
    try {
      result = await env.DB.prepare(
        externalQueryWithRefTypeAndAssetSource
      ).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("no such column") && msg.includes("asset_source")) {
        result = await env.DB.prepare(externalQueryWithRefType).all();
      } else if (msg.includes("no such column") && msg.includes("ref_type")) {
        result = await env.DB.prepare(externalQueryLegacy).all();
      } else {
        throw e;
      }
    }
    const accessPriority = {
      external_referral: 0,
      direct: 1,
      internal_navigation: 2,
      unknown: 3
    };
    externalImageAccess = (result.results || []).map((r) => {
      const assetSourceLabel = formatAssetSourceLabel(
        getAssetSourceLabel(r.asset_source),
        r.og_platform
      );
      const accessType = r.ref_type ? r.ref_type === "direct" ? "direct" : r.ref_type === "external" ? "external_referral" : r.ref_type === "internal" ? "internal_navigation" : "unknown" : getAccessType(r.referer);
      const referrerSource = accessType === "external_referral" ? getReferrerSource(r.referer) || "Other" : accessType === "direct" ? "No Referrer" : accessType === "internal_navigation" ? "Internal" : "Unknown";
      let refererHost = null;
      if (r.referer) {
        try {
          refererHost = new URL(r.referer).hostname;
        } catch (e) {
        }
      }
      return {
        target_id: r.target_id,
        hits: r.hits,
        last_seen: r.last_seen || null,
        access_type: accessType,
        referrer_source: referrerSource,
        asset_source: r.asset_source || null,
        asset_source_label: assetSourceLabel,
        og_platform: r.og_platform || null,
        referer_host: refererHost,
        country: r.country,
        geo: {
          country: r.geo_country,
          region: r.geo_region,
          city: r.geo_city
        }
      };
    }).sort(
      (a, b) => b.hits - a.hits || (accessPriority[a.access_type] ?? 9) - (accessPriority[b.access_type] ?? 9)
    );
  } catch (e) {
    console.log("External image access query failed:", e.message);
  }
  let externalImageAccessTotal = 0;
  try {
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
    `;
    const result = await env.DB.prepare(totalQuery).first();
    externalImageAccessTotal = result?.total || 0;
  } catch (e) {
    console.log("External image access total query failed:", e.message);
  }
  let externalReachGeo = [];
  try {
    const geoQuery = `
      SELECT 
        e.country,
        e.city,
        e.region,
        COUNT(DISTINCT e.ip_hash) as hits
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND e.country IS NOT NULL
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.country, e.city, e.region
      ORDER BY hits DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(geoQuery).all();
    externalReachGeo = (result.results || []).map((r) => ({
      country: r.country,
      city: r.city,
      region: r.region,
      hits: r.hits
    }));
  } catch (e) {
    console.log("External reach geo query failed:", e.message);
  }
  let externalReachSources = [];
  try {
    const srcQueryWithRefTypeAndAssetSource = `
      SELECT 
        e.referer,
        e.ref_type,
        e.asset_source,
        e.og_platform,
        COUNT(DISTINCT e.ip_hash) as hits
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer, e.ref_type, e.asset_source, e.og_platform
      ORDER BY hits DESC
      LIMIT 50
    `;
    const srcQueryWithRefType = `
      SELECT 
        e.referer,
        e.ref_type,
        COUNT(DISTINCT e.ip_hash) as hits
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer, e.ref_type
      ORDER BY hits DESC
      LIMIT 50
    `;
    const srcQueryLegacy = `
      SELECT 
        e.referer,
        COUNT(DISTINCT e.ip_hash) as hits
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
      ORDER BY hits DESC
      LIMIT 20
    `;
    let result;
    try {
      result = await env.DB.prepare(srcQueryWithRefTypeAndAssetSource).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("no such column") && msg.includes("asset_source")) {
        result = await env.DB.prepare(srcQueryWithRefType).all();
      } else if (msg.includes("no such column") && msg.includes("ref_type")) {
        result = await env.DB.prepare(srcQueryLegacy).all();
      } else {
        throw e;
      }
    }
    const sourceMap = {};
    for (const r of result.results || []) {
      const assetLabel = formatAssetSourceLabel(
        getAssetSourceLabel(r.asset_source),
        r.og_platform
      );
      const accessType = r.ref_type ? r.ref_type === "direct" ? "direct" : r.ref_type === "external" ? "external_referral" : r.ref_type === "internal" ? "internal_navigation" : "unknown" : getAccessType(r.referer);
      const source = assetLabel ? assetLabel : accessType === "external_referral" ? getReferrerSource(r.referer) || "Other" : accessType === "direct" ? "Direct" : accessType === "internal_navigation" ? "Internal" : "Unknown";
      sourceMap[source] = (sourceMap[source] || 0) + r.hits;
    }
    externalReachSources = Object.entries(sourceMap).map(([source, hits]) => ({ source, hits })).sort((a, b) => b.hits - a.hits);
  } catch (e) {
    console.log("External reach sources query failed:", e.message);
  }
  let externalDailySummary = {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    todayLabel: selectedDate || "Today",
    yesterdayLabel: selectedDate ? "Prev Day" : "Yesterday",
    today: { total: 0, u: 0, e: 0 },
    yesterday: { total: 0, u: 0, e: 0 },
    delta: 0,
    pct: 0,
    topSources: externalReachSources.slice(0, 3)
  };
  try {
    const labelToday = selectedDate || "Today";
    const labelYesterday = selectedDate ? "Prev Day" : "Yesterday";
    const dayExpr = selectedDate ? `'${selectedDate}'` : `date('now', '-5 hours')`;
    const prevDayExpr = selectedDate ? `date('${selectedDate}', '-1 day')` : `date('now', '-5 hours', '-1 day')`;
    const dailyQuery = `
      SELECT
        date(e.ts, '-5 hours') as day,
        COUNT(*) as total,
        SUM(CASE WHEN COALESCE(e.ref_type, '') = 'external' THEN 1 ELSE 0 END) as e_hits,
        SUM(CASE WHEN COALESCE(e.ref_type, '') != 'external' THEN 1 ELSE 0 END) as u_hits
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND date(e.ts, '-5 hours') IN (${dayExpr}, ${prevDayExpr})
      GROUP BY date(e.ts, '-5 hours')
    `;
    const daily = await env.DB.prepare(dailyQuery).all();
    const byDay = /* @__PURE__ */ new Map((daily.results || []).map((r) => [String(r.day || ""), {
      total: Number(r.total || 0),
      u: Number(r.u_hits || 0),
      e: Number(r.e_hits || 0)
    }]));
    const dayKey = selectedDate || (/* @__PURE__ */ new Date(Date.now() - 5 * 60 * 60 * 1e3)).toISOString().slice(0, 10);
    const prevDateObj = new Date(dayKey + "T00:00:00Z");
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const prevKey = prevDateObj.toISOString().slice(0, 10);
    const todayData = byDay.get(dayKey) || { total: 0, u: 0, e: 0 };
    const yesterdayData = byDay.get(prevKey) || { total: 0, u: 0, e: 0 };
    const delta = todayData.total - yesterdayData.total;
    const pct = yesterdayData.total > 0 ? Math.round(delta / yesterdayData.total * 1e3) / 10 : 0;
    externalDailySummary = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      todayLabel: labelToday,
      yesterdayLabel: labelYesterday,
      today: todayData,
      yesterday: yesterdayData,
      delta,
      pct,
      topSources: externalReachSources.slice(0, 3)
    };
  } catch (e) {
    console.log("External daily summary query failed:", e.message);
  }
  let topExternal = [];
  try {
    const extImgQuery = `
      SELECT 
        e.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT e.ip) as unique_viewers,
        (
          SELECT e2.referer
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('external_image', 'direct_image')
            AND (e2.visitor_id IS NULL OR e2.visitor_id = '')
            AND ${notCacheWarmer("e2")}
            ${notBotWhenHide("e2")}
            AND ${dateClause.replace(/\bts\b/g, "e2.ts") || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.referer IS NOT NULL
          GROUP BY e2.referer
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as top_referer
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(extImgQuery).all();
    topExternal = (result.results || []).map((r) => {
      const at = getAccessType(r.top_referer);
      const src = at === "external_referral" ? classifyForEntryRef(r.top_referer) : at === "direct" ? "direct" : "unattributed";
      return {
        target_id: r.target_id,
        views: r.views,
        unique_viewers: r.unique_viewers,
        top_source: src
      };
    });
  } catch (e) {
    console.log("Top external images query failed:", e.message);
  }
  let externalDisplays = [];
  let noRefExternalViews = 0;
  try {
    const dispQueryWithRefType = `
      SELECT 
        e.referer,
        e.ref_type,
        COUNT(*) as views
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer, e.ref_type
      ORDER BY views DESC
      LIMIT 50
    `;
    const dispQueryLegacy = `
      SELECT 
        e.referer,
        COUNT(*) as views
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
      ORDER BY views DESC
      LIMIT 30
    `;
    let result;
    try {
      result = await env.DB.prepare(dispQueryWithRefType).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("no such column") && msg.includes("ref_type")) {
        result = await env.DB.prepare(dispQueryLegacy).all();
      } else {
        throw e;
      }
    }
    const sourceMap = {};
    for (const r of result.results || []) {
      if (r.ref_type === "direct" || !r.referer) {
        noRefExternalViews += r.views;
        continue;
      }
      const at = r.ref_type ? r.ref_type === "direct" ? "direct" : r.ref_type === "external" ? "external_referral" : r.ref_type === "internal" ? "internal_navigation" : "unknown" : getAccessType(r.referer);
      if (at === "internal_navigation") continue;
      const source = getReferrerSource(r.referer) || "Other";
      sourceMap[source] = (sourceMap[source] || 0) + r.views;
    }
    externalDisplays = Object.entries(sourceMap).map(([source, views]) => ({ source, views })).sort((a, b) => b.views - a.views);
  } catch (e) {
    console.log("External displays query failed:", e.message);
  }
  let entryRefCountsObj = {};
  try {
    const entryQueryWithRefType = `
      SELECT 
        e.referer,
        e.ref_type,
        COUNT(*) as cnt
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer, e.ref_type
    `;
    const entryQueryLegacy = `
      SELECT 
        e.referer,
        COUNT(*) as cnt
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
    `;
    let result;
    try {
      result = await env.DB.prepare(entryQueryWithRefType).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("no such column") && msg.includes("ref_type")) {
        result = await env.DB.prepare(entryQueryLegacy).all();
      } else {
        throw e;
      }
    }
    for (const r of result.results || []) {
      const key = r.ref_type === "direct" ? "direct" : r.ref_type === "internal" ? "unattributed" : classifyForEntryRef(r.referer);
      entryRefCountsObj[key] = (entryRefCountsObj[key] || 0) + r.cnt;
    }
  } catch (e) {
    console.log("Entry ref counts query failed:", e.message);
  }
  let externalGeography = [];
  try {
    const extGeoQuery = `
      SELECT 
        e.country,
        e.city,
        e.region,
        COUNT(DISTINCT e.ip_hash) as unique_viewers
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer("e")}
        ${notBotWhenHide("e")}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND e.country IS NOT NULL
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.country, e.city, e.region
      ORDER BY unique_viewers DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(extGeoQuery).all();
    externalGeography = (result.results || []).map((r) => ({
      country: r.country,
      city: r.city,
      region: r.region,
      unique_viewers: r.unique_viewers
    }));
  } catch (e) {
    console.log("External geography query failed:", e.message);
  }
  artViewsSummary.externalDisplays = externalDisplays;
  artViewsSummary.noRefExternalViews = noRefExternalViews;
  artViewsSummary.externalGeography = externalGeography;
  const imageAccessOverview = [];
  return {
    artViewsSummary,
    artViewsByType: [],
    topArtViews: {
      chapters: topChapters,
      xlZooms: topZooms,
      external: topExternal,
      galleries: topGalleries
    },
    externalImageAccess,
    externalImageAccessTotal,
    externalReachGeo,
    externalReachSources,
    externalDailySummary,
    entryRefCountsObj,
    imageAccessOverview,
    viewerDepth,
    suppressionStats
  };
}
__name(getArtViews, "getArtViews");
__name2(getArtViews, "getArtViews");
async function getDashboardStats(env, filters) {
  const { dateClause } = filters;
  const where = (dateClause || "").replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")';
  const humanCount = await getHumanCount(env, dateClause);
  if (humanCount === 0) {
    return {
      summary: {
        unique_visitors: 0,
        sessions: 0,
        total_events: 0,
        avg_events_per_session: 0,
        pct_navigated: 0,
        collector_notes_opens: 0
      },
      returningVisitors: 0,
      newVisitors: 0
    };
  }
  let sessionCount = 0;
  try {
    const sessionsQuery = `
      WITH base_events AS (
        SELECT
          COALESCE(
            NULLIF(e.session_id, ''),
            NULLIF(e.session_id_v2, ''),
            NULLIF(e.visitor_id, ''),
            'anon:' || COALESCE(NULLIF(e.ip_hash, ''), NULLIF(e.ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:', e.ts) || printf('%02d', (CAST(strftime('%M', e.ts) AS INTEGER) / 30) * 30)
          ) AS session_key
        FROM classified_events e
        WHERE ${where}
          AND COALESCE(e.is_bot, 0) = 0
          AND ${notCacheWarmer("e")}
          AND e.event_type IN (
            'page_pixel',
            'page_view',
            'edge_page',
            'image_page',
            'external_image_page',
            'chapter_view',
            'chapter_exposure',
            'state_pixel',
            'action_pixel',
            'gallery_view'
          )
      )
      SELECT COUNT(DISTINCT session_key) as sessions
      FROM base_events
      WHERE session_key IS NOT NULL
        AND session_key != ''
    `;
    const result = await env.DB.prepare(sessionsQuery).first();
    sessionCount = result?.sessions || 0;
  } catch (e) {
    console.log("Sessions count failed:", e.message);
  }
  let totalEvents = 0;
  try {
    const eventsQuery = `
      SELECT COUNT(*) as count
      FROM classified_events e
      WHERE ${where}
        AND COALESCE(e.is_bot, 0) = 0
        AND ${notCacheWarmer("e")}
        AND e.event_type IN (
          'page_pixel',
          'page_view',
          'edge_page',
          'image_page',
          'external_image_page',
          'chapter_view',
          'chapter_exposure',
          'state_pixel',
          'action_pixel',
          'gallery_view'
        )
    `;
    const result = await env.DB.prepare(eventsQuery).first();
    totalEvents = result?.count || 0;
  } catch (e) {
    console.log("Events count failed:", e.message);
  }
  return {
    summary: {
      unique_visitors: humanCount,
      sessions: sessionCount,
      total_events: totalEvents,
      avg_events_per_session: sessionCount > 0 ? Math.round(totalEvents / sessionCount * 10) / 10 : 0,
      pct_navigated: 0,
      collector_notes_opens: 0
    },
    returningVisitors: 0,
    newVisitors: humanCount
  };
}
__name(getDashboardStats, "getDashboardStats");
__name2(getDashboardStats, "getDashboardStats");
async function getStatePixelTestRoaring20s(env, filters) {
  const { dateClause } = filters;
  const qualifiedDateClause = (dateClause || "").replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")';
  const qualifiedDateClauseRaw = (dateClause || "").replace(/\bts\b/g, "r.ts").replace(/\be\.ts\b/g, "r.ts").replace(/\be2\.ts\b/g, "r.ts") || 'r.ts > datetime("now", "-1 day")';
  const sisterPixelLayerPredicate = `1=1`;
  const sisterPixelLayerPredicateBase = `1=1`;
  const isChapterImagePageExpr = `(
    e.page IS NOT NULL
    AND (
      substr(e.page, 1, 10) = '/Galleries/'
      OR substr(e.page, 1, 7) = '/Other/'
    )
    AND instr(e.page, '/i-') > 0
  )`;
  const uaClassExpr = `CASE
    WHEN LOWER(COALESCE(e.ua, '')) LIKE '%iphone%' OR LOWER(COALESCE(e.ua, '')) LIKE '%ipad%' OR LOWER(COALESCE(e.ua, '')) LIKE '%ipod%' THEN 'ios'
    WHEN LOWER(COALESCE(e.ua, '')) LIKE '%android%' THEN 'android'
    WHEN LOWER(COALESCE(e.ua, '')) LIKE '%mac os%' AND LOWER(COALESCE(e.ua, '')) LIKE '%safari%' AND LOWER(COALESCE(e.ua, '')) NOT LIKE '%chrome%' THEN 'mac_safari'
    WHEN LOWER(COALESCE(e.ua, '')) LIKE '%mobile%' THEN 'mobile'
    ELSE 'desktop'
  END`;
  try {
    const summaryQuery = `
      WITH base AS (
        SELECT
          e.ip_hash AS ip_hash,
          ${uaClassExpr} AS ua_class,
          CAST(strftime('%s', e.ts, '-5 hours') / 1800 AS INTEGER) AS bucket,
          e.event_type AS event_type,
          e.page AS page,
          e.source AS source
        FROM raw_events e
        WHERE ${qualifiedDateClause}
          AND ${notCacheWarmer("e")}
      )
      SELECT
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
        ) AS state_pixel_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type = 'state_pixel'
            AND r.source_layer = 'sister_pixel_v1'
        ) AS sister_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'zoom_pixel_v1'
        ) AS zoom_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'grid_open_pixel_v1'
        ) AS grid_open_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'theme_grid_open_pixel_v1'
        ) AS theme_grid_open_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'grid_image_click_pixel_v1'
        ) AS grid_image_click_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'theme_grid_image_click_pixel_v1'
        ) AS theme_grid_image_click_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'grid_show_more_pixel_v1'
        ) AS grid_show_more_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'grid_show_previous_pixel_v1'
        ) AS grid_show_previous_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'browse_all_open_pixel_v1'
        ) AS browse_all_open_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'browse_all_image_click_pixel_v1'
        ) AS browse_all_image_click_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'gallery_preview_click_pixel_v1'
        ) AS gallery_preview_click_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'gallery_hero_click_pixel_v1'
        ) AS gallery_hero_click_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'gallery_explore_click_pixel_v1'
        ) AS gallery_explore_click_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'gallery_landing_view_pixel_v1'
        ) AS gallery_landing_view_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'exit_to_gallery_pixel_v1'
        ) AS exit_to_gallery_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'scroll_25_pixel_v1'
        ) AS scroll_25_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'scroll_50_pixel_v1'
        ) AS scroll_50_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'scroll_75_pixel_v1'
        ) AS scroll_75_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'scroll_100_pixel_v1'
        ) AS scroll_100_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'cowboy_jump_pixel_v1'
        ) AS cowboy_jump_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'order_clicked_pixel_v1'
        ) AS order_clicked_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'series_info_pixel_v1'
        ) AS series_info_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'more_info_open_pixel_v1'
        ) AS more_info_open_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'sister_image_click_pixel_v1'
        ) AS sister_image_click_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'slideshow_start_pixel_v1'
        ) AS slideshow_start_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'chapter_nav_prev_pixel_v1'
        ) AS chapter_nav_prev_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'chapter_nav_next_pixel_v1'
        ) AS chapter_nav_next_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'slideshow_nav_prev_pixel_v1'
        ) AS slideshow_nav_prev_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'slideshow_nav_next_pixel_v1'
        ) AS slideshow_nav_next_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'collector_notes_open_pixel_v1'
        ) AS collector_notes_open_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'guide_open_pixel_v1'
        ) AS guide_open_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'guide_close_pixel_v1'
        ) AS guide_close_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'guide_done_pixel_v1'
        ) AS guide_done_pixel_v1_hits,
        (
          SELECT COUNT(*)
          FROM raw_events r
          WHERE ${qualifiedDateClauseRaw}
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND r.source_layer = 'guide_click_outside_pixel_v1'
        ) AS guide_click_outside_pixel_v1_hits,
        SUM(CASE WHEN event_type = 'edge_page' AND source = 'edge' AND (${isChapterImagePageExpr.replace(/\be\.page\b/g, "page")}) THEN 1 ELSE 0 END) AS edge_page_hits,
        COUNT(DISTINCT CASE WHEN event_type IN ('state_pixel', 'action_pixel')
          THEN ip_hash || '|' || ua_class || '|' || bucket END) AS state_pixel_sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'edge_page' AND source = 'edge' AND (${isChapterImagePageExpr.replace(/\be\.page\b/g, "page")})
          THEN ip_hash || '|' || ua_class || '|' || bucket END) AS edge_page_sessions
      FROM base
    `;
    const summaryRow = await env.DB.prepare(summaryQuery).first();
    const refQuery = `
      WITH src AS (
        SELECT e.referer AS referer
        FROM raw_events e
        WHERE ${qualifiedDateClause}
          AND ${notCacheWarmer("e")}
          AND e.event_type IN ('state_pixel', 'action_pixel')
      )
      SELECT
        CASE
          WHEN referer IS NULL OR referer = '' THEN '(none)'
          WHEN instr(referer, '://') > 0 THEN lower(
            substr(
              referer,
              instr(referer, '://') + 3,
              CASE
                WHEN instr(substr(referer, instr(referer, '://') + 3), '/') > 0
                  THEN instr(substr(referer, instr(referer, '://') + 3), '/') - 1
                ELSE length(referer)
              END
            )
          )
          ELSE lower(referer)
        END AS ref_host,
        COUNT(*) AS hits
      FROM src
      GROUP BY ref_host
      ORDER BY hits DESC
      LIMIT 10
    `;
    const refRows = await env.DB.prepare(refQuery).all();
    const viewerStatsQuery = `
      WITH sp AS (
        SELECT
          e.visitor_id AS visitor_id,
          e.session_id AS session_id,
          e.target_id AS target_id
        FROM raw_events e
        WHERE ${qualifiedDateClause}
          AND ${notCacheWarmer("e")}
          AND e.event_type IN ('state_pixel', 'action_pixel')
          AND e.visitor_id IS NOT NULL
          AND e.visitor_id != ''
      ),
      by_visit AS (
        SELECT
          visitor_id,
          COALESCE(NULLIF(session_id, ''), 'nosid:' || visitor_id) AS visit_id,
          COUNT(*) AS exposures,
          COUNT(DISTINCT target_id) AS unique_images
        FROM sp
        GROUP BY visitor_id, visit_id
      ),
      by_viewer AS (
        SELECT
          visitor_id,
          SUM(exposures) AS exposures,
          SUM(exposures - unique_images) AS duplicate_exposures,
          MAX(CASE WHEN exposures > unique_images THEN 1 ELSE 0 END) AS has_duplicates
        FROM by_visit
        GROUP BY visitor_id
      )
      SELECT
        COUNT(*) AS viewers,
        SUM(exposures) AS total_exposures,
        SUM(duplicate_exposures) AS total_duplicate_exposures,
        AVG(exposures) AS avg_exposures_per_viewer,
        AVG(duplicate_exposures) AS avg_duplicate_exposures_per_viewer,
        SUM(CASE WHEN has_duplicates = 1 THEN 1 ELSE 0 END) AS viewers_with_duplicates,
        (100.0 * SUM(CASE WHEN has_duplicates = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS pct_viewers_with_duplicates
      FROM by_viewer
    `;
    const viewerStatsRow = await env.DB.prepare(viewerStatsQuery).first();
    const byGalleryQuery = `
      WITH image_views AS (
        SELECT
          CASE
            WHEN e.page IS NULL OR e.page = '' THEN NULL
            WHEN instr(e.page, '/i-') > 0 THEN substr(e.page, 1, instr(e.page, '/i-') - 1)
            ELSE NULL
          END AS gallery_path,
          e.target_id AS image_id
        FROM raw_events e
        WHERE ${qualifiedDateClause}
          AND ${notCacheWarmer("e")}
          AND e.event_type IN ('state_pixel', 'action_pixel')
          AND e.page IS NOT NULL
          AND e.page != ''
          AND (e.page LIKE '/Galleries/%/i-%' OR e.page LIKE '/Other/%/i-%')
          AND e.target_id IS NOT NULL
          AND e.target_id != ''
          AND e.target_id LIKE 'i-%'
          AND e.target_id NOT LIKE '%/%'
          AND e.target_id NOT LIKE 'i-test%'
          AND COALESCE(e.source_layer, '') != 'cowboy_jump_pixel_v1'
      )
      SELECT
        gallery_path,
        COUNT(*) AS image_views,
        COUNT(DISTINCT image_id) AS unique_images
      FROM image_views
      WHERE gallery_path IS NOT NULL
        AND gallery_path != ''
      GROUP BY gallery_path
      ORDER BY image_views DESC
      LIMIT 25
    `;
    const byGalleryRows = await env.DB.prepare(byGalleryQuery).all();

    const pixelImageAccessQuery = `
      WITH sp AS (
        SELECT
          e.target_id AS target_id,
          e.page AS page,
          e.visitor_id AS visitor_id,
          e.country AS country,
          e.region AS region,
          e.city AS city,
          e.source_layer AS source_layer,
          e.ua AS user_agent,
          e.referer AS referer,
          e.ts AS ts
        FROM raw_events e
        WHERE ${qualifiedDateClause}
          AND ${notCacheWarmer("e")}
          AND e.event_type IN ('state_pixel', 'action_pixel')
          AND e.target_id IS NOT NULL
          AND e.target_id != ''
          AND e.target_id LIKE 'i-%'
            AND e.target_id NOT LIKE '%/%'
          AND e.target_id NOT LIKE 'i-test%'
          AND e.target_id != '/'
          AND COALESCE(e.source_layer, '') != 'cowboy_jump_pixel_v1'
      ),
      ranked AS (
        SELECT
          target_id,
          page,
          country,
          region,
          city,
          source_layer,
          user_agent,
          referer,
          ts,
          ROW_NUMBER() OVER (PARTITION BY target_id ORDER BY ts DESC) AS rn
        FROM sp
      ),
      agg AS (
        SELECT
          target_id,
          COUNT(*) AS exposures,
          SUM(CASE WHEN source_layer = 'zoom_pixel_v1' THEN 1 ELSE 0 END) AS zoom_views,
          COUNT(DISTINCT CASE WHEN visitor_id IS NOT NULL AND visitor_id != '' THEN visitor_id END) AS viewers,
          MAX(ts) AS last_seen,
          GROUP_CONCAT(DISTINCT source_layer) AS source_layers
        FROM sp
        GROUP BY target_id
      )
      SELECT
        a.target_id,
        a.exposures,
        a.zoom_views,
        a.viewers,
        a.last_seen,
        a.source_layers,
        r.page,
        r.country,
        r.region,
        r.city,
        r.source_layer,
        r.user_agent,
        r.referer
      FROM agg a
      LEFT JOIN ranked r
        ON r.target_id = a.target_id
       AND r.rn = 1
      ORDER BY a.last_seen DESC, a.exposures DESC
    `;
    const pixelImageAccessRows = await env.DB.prepare(pixelImageAccessQuery).all();
    return {
      state_pixel_hits: Number(summaryRow?.state_pixel_hits || 0),
      sister_pixel_v1_hits: Number(summaryRow?.sister_pixel_v1_hits || 0),
      zoom_pixel_v1_hits: Number(summaryRow?.zoom_pixel_v1_hits || 0),
      grid_open_pixel_v1_hits: Number(summaryRow?.grid_open_pixel_v1_hits || 0),
      theme_grid_open_pixel_v1_hits: Number(summaryRow?.theme_grid_open_pixel_v1_hits || 0),
      grid_image_click_pixel_v1_hits: Number(summaryRow?.grid_image_click_pixel_v1_hits || 0),
      theme_grid_image_click_pixel_v1_hits: Number(summaryRow?.theme_grid_image_click_pixel_v1_hits || 0),
      grid_show_more_pixel_v1_hits: Number(summaryRow?.grid_show_more_pixel_v1_hits || 0),
      grid_show_previous_pixel_v1_hits: Number(summaryRow?.grid_show_previous_pixel_v1_hits || 0),
      browse_all_open_pixel_v1_hits: Number(summaryRow?.browse_all_open_pixel_v1_hits || 0),
      browse_all_image_click_pixel_v1_hits: Number(summaryRow?.browse_all_image_click_pixel_v1_hits || 0),
      gallery_preview_click_pixel_v1_hits: Number(summaryRow?.gallery_preview_click_pixel_v1_hits || 0),
      gallery_hero_click_pixel_v1_hits: Number(summaryRow?.gallery_hero_click_pixel_v1_hits || 0),
      gallery_explore_click_pixel_v1_hits: Number(summaryRow?.gallery_explore_click_pixel_v1_hits || 0),
      gallery_landing_view_pixel_v1_hits: Number(summaryRow?.gallery_landing_view_pixel_v1_hits || 0),
      exit_to_gallery_pixel_v1_hits: Number(summaryRow?.exit_to_gallery_pixel_v1_hits || 0),
      scroll_25_pixel_v1_hits: Number(summaryRow?.scroll_25_pixel_v1_hits || 0),
      scroll_50_pixel_v1_hits: Number(summaryRow?.scroll_50_pixel_v1_hits || 0),
      scroll_75_pixel_v1_hits: Number(summaryRow?.scroll_75_pixel_v1_hits || 0),
      scroll_100_pixel_v1_hits: Number(summaryRow?.scroll_100_pixel_v1_hits || 0),
      cowboy_jump_pixel_v1_hits: Number(summaryRow?.cowboy_jump_pixel_v1_hits || 0),
      order_clicked_pixel_v1_hits: Number(summaryRow?.order_clicked_pixel_v1_hits || 0),
      series_info_pixel_v1_hits: Number(summaryRow?.series_info_pixel_v1_hits || 0),
      more_info_open_pixel_v1_hits: Number(summaryRow?.more_info_open_pixel_v1_hits || 0),
      sister_image_click_pixel_v1_hits: Number(summaryRow?.sister_image_click_pixel_v1_hits || 0),
      slideshow_start_pixel_v1_hits: Number(summaryRow?.slideshow_start_pixel_v1_hits || 0),
      chapter_nav_prev_pixel_v1_hits: Number(summaryRow?.chapter_nav_prev_pixel_v1_hits || 0),
      chapter_nav_next_pixel_v1_hits: Number(summaryRow?.chapter_nav_next_pixel_v1_hits || 0),
      slideshow_nav_prev_pixel_v1_hits: Number(summaryRow?.slideshow_nav_prev_pixel_v1_hits || 0),
      slideshow_nav_next_pixel_v1_hits: Number(summaryRow?.slideshow_nav_next_pixel_v1_hits || 0),
      collector_notes_open_pixel_v1_hits: Number(summaryRow?.collector_notes_open_pixel_v1_hits || 0),
      guide_open_pixel_v1_hits: Number(summaryRow?.guide_open_pixel_v1_hits || 0),
      guide_close_pixel_v1_hits: Number(summaryRow?.guide_close_pixel_v1_hits || 0),
      guide_done_pixel_v1_hits: Number(summaryRow?.guide_done_pixel_v1_hits || 0),
      guide_click_outside_pixel_v1_hits: Number(summaryRow?.guide_click_outside_pixel_v1_hits || 0),
      edge_page_hits: Number(summaryRow?.edge_page_hits || 0),
      state_pixel_sessions: Number(summaryRow?.state_pixel_sessions || 0),
      edge_page_sessions: Number(summaryRow?.edge_page_sessions || 0),
      top_referrers: refRows?.results || [],
      viewer_stats: {
        viewers: Number(viewerStatsRow?.viewers || 0),
        total_exposures: Number(viewerStatsRow?.total_exposures || 0),
        total_duplicate_exposures: Number(
          viewerStatsRow?.total_duplicate_exposures || 0
        ),
        avg_exposures_per_viewer: Number(
          viewerStatsRow?.avg_exposures_per_viewer || 0
        ),
        avg_duplicate_exposures_per_viewer: Number(
          viewerStatsRow?.avg_duplicate_exposures_per_viewer || 0
        ),
        viewers_with_duplicates: Number(
          viewerStatsRow?.viewers_with_duplicates || 0
        ),
        pct_viewers_with_duplicates: Number(
          viewerStatsRow?.pct_viewers_with_duplicates || 0
        )
      },
      by_gallery: byGalleryRows?.results || [],
      pixel_image_access: pixelImageAccessRows?.results || []
    };
  } catch (e) {
    console.log("State pixel test query failed:", e?.message || e);
    return {
      state_pixel_hits: 0,
      sister_pixel_v1_hits: 0,
      zoom_pixel_v1_hits: 0,
      grid_open_pixel_v1_hits: 0,
      theme_grid_open_pixel_v1_hits: 0,
      grid_image_click_pixel_v1_hits: 0,
      theme_grid_image_click_pixel_v1_hits: 0,
      grid_show_more_pixel_v1_hits: 0,
      grid_show_previous_pixel_v1_hits: 0,
      browse_all_open_pixel_v1_hits: 0,
      browse_all_image_click_pixel_v1_hits: 0,
      gallery_preview_click_pixel_v1_hits: 0,
      gallery_hero_click_pixel_v1_hits: 0,
      gallery_explore_click_pixel_v1_hits: 0,
      gallery_landing_view_pixel_v1_hits: 0,
      exit_to_gallery_pixel_v1_hits: 0,
      scroll_25_pixel_v1_hits: 0,
      scroll_50_pixel_v1_hits: 0,
      scroll_75_pixel_v1_hits: 0,
      scroll_100_pixel_v1_hits: 0,
      cowboy_jump_pixel_v1_hits: 0,
      order_clicked_pixel_v1_hits: 0,
      series_info_pixel_v1_hits: 0,
      more_info_open_pixel_v1_hits: 0,
      sister_image_click_pixel_v1_hits: 0,
      slideshow_start_pixel_v1_hits: 0,
      chapter_nav_prev_pixel_v1_hits: 0,
      chapter_nav_next_pixel_v1_hits: 0,
      slideshow_nav_prev_pixel_v1_hits: 0,
      slideshow_nav_next_pixel_v1_hits: 0,
      collector_notes_open_pixel_v1_hits: 0,
      guide_open_pixel_v1_hits: 0,
      guide_close_pixel_v1_hits: 0,
      guide_done_pixel_v1_hits: 0,
      guide_click_outside_pixel_v1_hits: 0,
      edge_page_hits: 0,
      state_pixel_sessions: 0,
      edge_page_sessions: 0,
      top_referrers: [],
      viewer_stats: {
        viewers: 0,
        total_exposures: 0,
        total_duplicate_exposures: 0,
        avg_exposures_per_viewer: 0,
        avg_duplicate_exposures_per_viewer: 0,
        viewers_with_duplicates: 0,
        pct_viewers_with_duplicates: 0
      },
      by_gallery: [],
      pixel_image_access: []
    };
  }
}
__name(getStatePixelTestRoaring20s, "getStatePixelTestRoaring20s");
__name2(getStatePixelTestRoaring20s, "getStatePixelTestRoaring20s");
async function getEventBreakdown(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"),
      "qualify"
    );
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const trackedEvents = [
      "xl_zoom",
      "browse_all_click",
      "order_clicked",
      "collector_notes_open",
      "cowboy_jump",
      "exit_to_gallery",
      "gallery_explore_click",
      "gallery_preview_click",
      "guide_open",
      "guide_close",
      "guide_done",
      "guide_click_outside",
      "gallery_hero_click",
      "more_info_open",
      "nav_next",
      "nav_prev",
      "order_submitted",
      "series_info",
      "sister_image_click",
      "slideshow_start",
      "story_slider_click",
      "theme_click",
      "all_list_click",
      "grid_open",
      "grid_image_click",
      "grid_show_more",
      "grid_show_previous",
      "scroll_25",
      "scroll_50",
      "scroll_75",
      "scroll_100",
      "page_view",
      "session_exit"
    ];
    const trackedListSql = trackedEvents.map((e) => `'${e}'`).join(", ");
    const eventsQuery = `
      SELECT
        e.event_type AS event,
        COUNT(*) AS count
      FROM classified_events e
      WHERE ${where}
        ${qualify(ipClause)}
        ${qualify(safeBotClause)}
        ${qualify(chardonClause)}
        AND e.source = 'js'
        AND e.event_type IN (${trackedListSql})
      GROUP BY e.event_type
      ORDER BY count DESC
    `;
    const events = await env.DB.prepare(eventsQuery).all();
    return { events };
  } catch (e) {
    console.log("Event breakdown query failed:", e.message);
    return { events: { results: [] } };
  }
}
__name(getEventBreakdown, "getEventBreakdown");
__name2(getEventBreakdown, "getEventBreakdown");
async function getGalleryPerformance(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause, alias) => (clause || "").replace(/\bts\b/g, `${alias}.ts`).replace(/\bip\b/g, `${alias}.ip`).replace(/\bcity\b/g, `${alias}.city`).replace(/\bcountry\b/g, `${alias}.country`).replace(/\bregion\b/g, `${alias}.region`),
      "qualify"
    );
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const whereE = qualify(dateClause, "e") || 'e.ts > datetime("now", "-1 day")';
    const whereE2 = qualify(dateClause, "e2") || 'e2.ts > datetime("now", "-1 day")';
    const galleryQuery = `
      WITH normalized_page_views AS (
        SELECT
          e.session_id,
          (
            CASE
              WHEN COALESCE(NULLIF(e.page, ''), e.target_id) LIKE 'https://www.k4studios.com/%' THEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 25)
              WHEN COALESCE(NULLIF(e.page, ''), e.target_id) LIKE 'https://k4studios.com/%' THEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 22)
              WHEN COALESCE(NULLIF(e.page, ''), e.target_id) LIKE 'http://www.k4studios.com/%' THEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 24)
              WHEN COALESCE(NULLIF(e.page, ''), e.target_id) LIKE 'http://k4studios.com/%' THEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 21)
              ELSE COALESCE(NULLIF(e.page, ''), e.target_id)
            END
          ) AS page_path
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${whereE}
          ${qualify(ipClause, "e")}
          ${qualify(safeBotClause, "e")}
          ${qualify(chardonClause, "e")}
          AND e.source = 'js'
          AND e.event_type = 'page_view'
          AND e.session_id IS NOT NULL
          AND (e.page IS NOT NULL OR e.target_id IS NOT NULL)
      ),
      page_views AS (
        SELECT
          session_id,
          page_path,
          CASE
            WHEN page_path LIKE '%/i-%' THEN (
              CASE
                WHEN SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1) LIKE '%/Gallery'
                  THEN SUBSTR(SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1), 1, LENGTH(SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1)) - 8)
                ELSE SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1)
              END
            )
            WHEN page_path LIKE '%/Gallery' THEN SUBSTR(page_path, 1, LENGTH(page_path) - 8)
            WHEN page_path LIKE '/Galleries/%' OR page_path LIKE '/Other/%' THEN (
              CASE
                WHEN RTRIM(page_path, '/') LIKE '%/Gallery' THEN SUBSTR(RTRIM(page_path, '/'), 1, LENGTH(RTRIM(page_path, '/')) - 8)
                ELSE RTRIM(page_path, '/')
              END
            )
            ELSE NULL
          END AS base_path
        FROM normalized_page_views
        WHERE (page_path LIKE '/Galleries/%' OR page_path LIKE '/Other/%')
          AND page_path NOT IN ('/Galleries', '/Galleries/', '/Other', '/Other/')
      ),
      session_gallery AS (
        SELECT DISTINCT session_id, base_path
        FROM page_views
        WHERE base_path IS NOT NULL
      ),
      normalized_zoom_events AS (
        SELECT DISTINCT
          e.session_id,
          (
            CASE
              WHEN e.page LIKE 'https://www.k4studios.com/%' THEN SUBSTR(e.page, 25)
              WHEN e.page LIKE 'https://k4studios.com/%' THEN SUBSTR(e.page, 22)
              WHEN e.page LIKE 'http://www.k4studios.com/%' THEN SUBSTR(e.page, 24)
              WHEN e.page LIKE 'http://k4studios.com/%' THEN SUBSTR(e.page, 21)
              ELSE e.page
            END
          ) AS page_path
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${whereE}
          ${qualify(ipClause, "e")}
          ${qualify(safeBotClause, "e")}
          ${qualify(chardonClause, "e")}
          AND e.source = 'js'
          AND e.event_type = 'xl_zoom'
          AND e.session_id IS NOT NULL
          AND e.page IS NOT NULL
      ),
      zoom_events AS (
        SELECT DISTINCT
          session_id,
          CASE
            WHEN page_path LIKE '%/i-%' THEN (
              CASE
                WHEN SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1) LIKE '%/Gallery'
                  THEN SUBSTR(SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1), 1, LENGTH(SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1)) - 8)
                ELSE SUBSTR(page_path, 1, INSTR(page_path, '/i-') - 1)
              END
            )
            ELSE NULL
          END AS base_path
        FROM normalized_zoom_events
      )
      SELECT
        sg.base_path AS gallery_id,
        COUNT(DISTINCT sg.session_id) AS sessions,
        ROUND(
          100.0 * COUNT(DISTINCT CASE WHEN ze.session_id IS NOT NULL THEN sg.session_id END)
          / NULLIF(COUNT(DISTINCT sg.session_id), 0),
          1
        ) AS zoom_pct,
        ROUND(
          1.0 * COUNT(e2.id) / NULLIF(COUNT(DISTINCT sg.session_id), 0),
          1
        ) AS avg_events
      FROM session_gallery sg
      LEFT JOIN zoom_events ze
        ON ze.session_id = sg.session_id AND ze.base_path = sg.base_path
      JOIN classified_events e2
        ON e2.session_id = sg.session_id
      WHERE e2.source = 'js'
        AND ${whereE2}
        ${qualify(ipClause, "e2")}
        ${qualify(safeBotClause, "e2")}
        ${qualify(chardonClause, "e2")}
      GROUP BY sg.base_path
      ORDER BY sessions DESC
      LIMIT 15
    `;
    const galleriesRaw = await env.DB.prepare(galleryQuery).all();
    const rows = galleriesRaw?.results || [];
    const results = rows.map((r) => {
      const fullPath = String(r.gallery_id || "");
      const parts = fullPath.split("/").filter(Boolean);
      const displayName = parts.slice(-2).join(" \u203A ").replace(/-/g, " ");
      let gallery_type = "other";
      if (fullPath.includes("/Painterly-Fine-Art-Photography/")) {
        gallery_type = "painterly";
      } else if (fullPath.includes("/Fine-Art-Photography/")) {
        gallery_type = "traditional";
      } else if (fullPath.includes("/Engrained/") || fullPath.includes("/Archive/")) {
        gallery_type = "select";
      }
      return {
        gallery_id: displayName || fullPath || "Unknown",
        gallery_type,
        sessions: r.sessions || 0,
        zoom_pct: r.zoom_pct || 0,
        avg_events: r.avg_events || 0
      };
    });
    return { results };
  } catch (e) {
    console.log("Gallery performance query failed:", e.message);
    return { results: [] };
  }
}
__name(getGalleryPerformance, "getGalleryPerformance");
__name2(getGalleryPerformance, "getGalleryPerformance");
async function getReferrers(env, filters) {
  return { results: [] };
}
__name(getReferrers, "getReferrers");
__name2(getReferrers, "getReferrers");
async function getGeography(env, filters) {
  try {
    const { dateClause, botClause, chardonClause, ipClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region"),
      "qualify"
    );
    const geoQuery = `
      WITH site_events AS (
        SELECT
          e.country,
          e.region,
          e.city,
          COALESCE(NULLIF(e.visitor_id, ''), 'ip:' || COALESCE(e.ip, 'unknown')) AS actor,
          CASE
            WHEN SUBSTR(raw_page, 1, 1) = '/' THEN raw_page
            ELSE '/' || raw_page
          END AS page_path
        FROM (
          SELECT
            e.country,
            e.region,
            e.city,
            e.visitor_id,
            e.ip,
            COALESCE(NULLIF(e.page, ''), CASE WHEN SUBSTR(COALESCE(e.target_id, ''), 1, 1) = '/' THEN NULLIF(e.target_id, '') ELSE NULL END) AS raw_page
          FROM classified_events e
          WHERE ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
            AND e.country IS NOT NULL
            AND e.event_type IN ('page_pixel', 'page_view', 'edge_page', 'image_page', 'external_image_page')
            ${qualify(botClause)}
            ${qualify(chardonClause)}
            ${qualify(ipClause)}
        ) e
        WHERE raw_page IS NOT NULL
          AND LOWER(raw_page) NOT LIKE 'http%'
      ),
      site_base AS (
        SELECT
          country,
          region,
          city,
          COUNT(DISTINCT actor) AS visitors
        FROM site_events
        WHERE page_path NOT IN ${GALLERY_LANDING_IN_LIST}
          AND NOT (page_path GLOB '*/i-*' AND page_path NOT GLOB '*/i-*/*')
        GROUP BY country, region, city
      ),
      art_base AS (
        SELECT
          e.country, e.region, e.city,
          COUNT(DISTINCT COALESCE(NULLIF(e.visitor_id, ''), 'ip:' || COALESCE(e.ip, 'unknown'))) as art_viewers
        FROM classified_events e
        WHERE ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
          AND e.country IS NOT NULL
          AND e.event_type IN ('state_pixel', 'action_pixel')
          AND e.target_id LIKE 'i-%'
          AND e.target_id NOT LIKE '%/%'
          ${qualify(botClause)}
          ${qualify(chardonClause)}
          ${qualify(ipClause)}
        GROUP BY e.country, e.region, e.city
      ),
      base AS (
        SELECT
          v.country,
          v.region,
          v.city,
          v.visitors,
          COALESCE(a.art_viewers, 0) as art_viewers
        FROM site_base v
        LEFT JOIN art_base a
          ON COALESCE(a.country, '') = COALESCE(v.country, '')
         AND COALESCE(a.region, '') = COALESCE(v.region, '')
         AND COALESCE(a.city, '') = COALESCE(v.city, '')

        UNION ALL

        SELECT
          a.country,
          a.region,
          a.city,
          0 as visitors,
          a.art_viewers
        FROM art_base a
        WHERE NOT EXISTS (
          SELECT 1
          FROM site_base v
          WHERE COALESCE(v.country, '') = COALESCE(a.country, '')
            AND COALESCE(v.region, '') = COALESCE(a.region, '')
            AND COALESCE(v.city, '') = COALESCE(a.city, '')
        )
      ),
      top_visitors AS (
        SELECT * FROM base
        ORDER BY visitors DESC, country, region, city
        LIMIT 200
      ),
      top_art AS (
        SELECT * FROM base
        WHERE art_viewers > 0
        ORDER BY art_viewers DESC, country, region, city
        LIMIT 500
      )
      SELECT * FROM top_visitors
      UNION
      SELECT * FROM top_art
    `;
    return await env.DB.prepare(geoQuery).all();
  } catch (e) {
    console.log("Geography query failed:", e.message);
    return { results: [] };
  }
}
__name(getGeography, "getGeography");
__name2(getGeography, "getGeography");
async function getPeriodTotals(env, filters) {
  try {
    const { dateClause, botClause, chardonClause } = filters;
    const qualifyBot = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region"),
      "qualifyBot"
    );
    const periodQuery = `
      SELECT 
        COUNT(DISTINCT e.visitor_id) as total_visitors,
        COUNT(DISTINCT CASE 
          WHEN e.event_type = 'chapter_view'
          THEN e.visitor_id 
          ELSE NULL 
        END) as total_art_viewers
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
        AND e.source = 'js'
        AND COALESCE(e.is_bot, 0) = 0
        ${qualifyBot(botClause)}
        ${qualifyBot(chardonClause)}
        AND EXISTS (
          SELECT 1 FROM classified_events j
          WHERE j.visitor_id = e.visitor_id
            AND j.source = 'js'
        )
    `;
    const result = await env.DB.prepare(periodQuery).first();
    return result || { total_visitors: 0, total_art_viewers: 0 };
  } catch (e) {
    console.log("Period totals query failed:", e.message);
    return { total_visitors: 0, total_art_viewers: 0 };
  }
}
__name(getPeriodTotals, "getPeriodTotals");
__name2(getPeriodTotals, "getPeriodTotals");
async function getDailyTrend(env, filters) {
  try {
    const {
      rangeDateClause,
      galleryClause,
      ipClause,
      botClause,
      chardonClause
    } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bgallery_id\b/g, "e.gallery_id").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bdevice\b/g, "e.device").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region"),
      "qualify"
    );
    const where = qualify(rangeDateClause) || `date(e.ts, '-5 hours') = date('now', '-5 hours')`;
    const pixelActorExpr = `
      CASE
        WHEN r.visitor_id IS NOT NULL AND r.visitor_id != '' THEN 'v:' || r.visitor_id
        ELSE 'h:' || COALESCE(NULLIF(r.ip_hash, ''), COALESCE(NULLIF(r.ip, ''), 'unknown')) || '|' ||
          CASE
            WHEN LOWER(COALESCE(r.ua, '')) LIKE '%iphone%' OR LOWER(COALESCE(r.ua, '')) LIKE '%ipad%' OR LOWER(COALESCE(r.ua, '')) LIKE '%ipod%' THEN 'ios'
            WHEN LOWER(COALESCE(r.ua, '')) LIKE '%android%' THEN 'android'
            WHEN LOWER(COALESCE(r.ua, '')) LIKE '%mobile%' THEN 'mobile'
            ELSE 'desktop'
          END
      END
    `;
    const trendQuery = `
      SELECT
        date(e.ts, '-5 hours') as day,
        COUNT(DISTINCT CASE
          WHEN e.source = 'js' AND COALESCE(e.is_bot, 0) = 0
          THEN e.visitor_id
          ELSE NULL
        END) as visitors,
        COUNT(DISTINCT CASE
          WHEN e.source = 'js' AND COALESCE(e.is_bot, 0) = 0
          THEN NULLIF(e.session_id, '')
          ELSE NULL
        END) as sessions,
        COUNT(DISTINCT CASE
          WHEN e.source = 'js' AND e.event_type IN ('chapter_view', 'xl_zoom', 'gallery_view') AND COALESCE(e.is_bot, 0) = 0
          THEN e.visitor_id
          ELSE NULL
        END) as art_viewers,
        (
          SELECT COUNT(DISTINCT ${pixelActorExpr})
          FROM raw_events r
          WHERE date(r.ts, '-5 hours') = date(e.ts, '-5 hours')
            AND r.event_type IN ('state_pixel', 'action_pixel')
            AND ${notCacheWarmer('r')}
        ) as pixel_reach
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
        ${qualify(galleryClause)}
        ${qualify(ipClause)}
        ${qualify(botClause)}
        ${qualify(chardonClause)}
        AND EXISTS (
          SELECT 1 FROM classified_events j
          WHERE j.visitor_id = e.visitor_id
            AND j.source = 'js'
        )
      GROUP BY date(e.ts, '-5 hours')
      ORDER BY day ASC
    `;
    return await env.DB.prepare(trendQuery).all();
  } catch (e) {
    console.log("Daily trend query failed:", e.message);
    return { results: [] };
  }
}
__name(getDailyTrend, "getDailyTrend");
__name2(getDailyTrend, "getDailyTrend");
async function getSessionMetrics(env, filters) {
  try {
    const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bgallery_id\b/g, "e.gallery_id").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer").replace(/\bua\b/g, "e.ua").replace(/\bis_bot\b/g, "COALESCE(e.is_bot, 0)"),
      "qualify"
    );
    const where = [
      qualify(dateClause) || 'e.ts > datetime("now", "-1 day")',
      qualify(galleryClause),
      qualify(ipClause),
      qualify(botClause),
      qualify(chardonClause)
    ].filter(Boolean).join("\n        ");
    const sessionKey = `COALESCE(NULLIF(e.session_id, ''), e.visitor_id || ':' || date(e.ts, '-5 hours'))`;
    const devicesQuery = `
      SELECT 
        LOWER(COALESCE(hp.device_type, 'unknown')) as device,
        COUNT(DISTINCT ${sessionKey}) as sessions
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
        AND e.source = 'js'
      GROUP BY device
      ORDER BY sessions DESC
    `;
    const devices = await env.DB.prepare(devicesQuery).all();
    const bounceQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN event_count = 1 THEN 1 ELSE 0 END) as bounce_sessions
      FROM (
        SELECT ${sessionKey} as session_key, COUNT(*) as event_count
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          AND e.source = 'js'
          AND e.visitor_id IS NOT NULL
        GROUP BY session_key
      )
    `;
    const bounceResult = await env.DB.prepare(bounceQuery).first();
    const bounceRate = bounceResult?.total_sessions > 0 ? Math.round(
      100 * (bounceResult.bounce_sessions || 0) / bounceResult.total_sessions
    ) : 0;
    const durationQuery = `
      SELECT ROUND(AVG(duration_seconds), 0) as avg_duration
      FROM (
        SELECT 
          ${sessionKey} as session_key,
          (JULIANDAY(MAX(e.ts)) - JULIANDAY(MIN(e.ts))) * 86400 as duration_seconds
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          AND e.source = 'js'
          AND e.visitor_id IS NOT NULL
        GROUP BY session_key
        HAVING COUNT(*) > 1
      )
    `;
    const durationResult = await env.DB.prepare(durationQuery).first();
    const avgDurationSecs = durationResult?.avg_duration || 0;
    const avgDurationFormatted = avgDurationSecs >= 60 ? `${Math.floor(avgDurationSecs / 60)}m ${Math.round(avgDurationSecs % 60)}s` : `${Math.round(avgDurationSecs)}s`;
    const peakHoursQuery = `
      SELECT 
        CAST(strftime('%H', e.ts, '-5 hours') AS INTEGER) as hour,
        COUNT(DISTINCT ${sessionKey}) as sessions
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
        AND e.source = 'js'
        AND e.visitor_id IS NOT NULL
      GROUP BY hour
      ORDER BY sessions DESC
    `;
    const peakHoursResult = await env.DB.prepare(peakHoursQuery).all();
    const hourRows = peakHoursResult?.results || [];
    const pickTop = /* @__PURE__ */ __name2(
      (rows) => rows.sort((a, b) => (b.sessions || 0) - (a.sessions || 0))[0] || null,
      "pickTop"
    );
    const topAm = pickTop(hourRows.filter((r) => (r.hour ?? 0) < 12));
    const topPm = pickTop(hourRows.filter((r) => (r.hour ?? 0) >= 12));
    const formatHour = /* @__PURE__ */ __name2((hour24) => {
      const h = Number(hour24) || 0;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "pm" : "am";
      return `${hour12}${ampm}`;
    }, "formatHour");
    const peakHours = [
      ...topAm ? [
        {
          period: "AM",
          hour: formatHour(topAm.hour),
          sessions: topAm.sessions
        }
      ] : [],
      ...topPm ? [
        {
          period: "PM",
          hour: formatHour(topPm.hour),
          sessions: topPm.sessions
        }
      ] : []
    ];
    const deviceEngagementQuery = `
      WITH viewer_depth AS (
        SELECT
          hp.visitor_id as visitor_id,
          LOWER(COALESCE(hp.device_type, 'unknown')) as device,
          SUM(
            CASE e.event_type
              WHEN 'gallery_view' THEN 1
              WHEN 'gallery' THEN 1
              WHEN 'chapter_view' THEN 2
              WHEN 'chapter_exposure' THEN 2
              WHEN 'xl_zoom' THEN 5
              WHEN 'slideshow_start' THEN 2
              ELSE 0
            END
          ) as depth_score
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          AND e.source = 'js'
        GROUP BY hp.visitor_id, device
      )
      SELECT
        device,
        COUNT(*) as sessions,
        ROUND(AVG(depth_score), 1) as avg_depth
      FROM viewer_depth
      GROUP BY device
      ORDER BY sessions DESC
    `;
    const deviceEngagementResult = await env.DB.prepare(
      deviceEngagementQuery
    ).all();
    return {
      devices,
      bounceRate,
      avgDurationSecs,
      avgDurationFormatted,
      peakHours,
      deviceEngagement: deviceEngagementResult?.results || []
    };
  } catch (e) {
    console.log("Session metrics query failed:", e.message);
    return {
      devices: { results: [] },
      bounceRate: 0,
      avgDurationSecs: 0,
      avgDurationFormatted: "0s",
      peakHours: [],
      deviceEngagement: []
    };
  }
}
__name(getSessionMetrics, "getSessionMetrics");
__name2(getSessionMetrics, "getSessionMetrics");
async function getTopPages(env, filters) {
  try {
    const { dateClause } = filters;
    const where = (dateClause || "").trim() || 'e.ts > datetime("now", "-1 day")';
    const pagesQuery = `
      WITH normalized AS (
        SELECT
          CASE
            WHEN SUBSTR(raw_page, 1, 1) = '/'
              THEN raw_page
            ELSE '/' || raw_page
          END AS page_path
        FROM (
          SELECT
            COALESCE(
              NULLIF(e.page, ''),
              CASE WHEN SUBSTR(COALESCE(e.target_id, ''), 1, 1) = '/' THEN NULLIF(e.target_id, '') ELSE NULL END
            ) AS raw_page
          FROM classified_events e
          WHERE ${where}
            AND COALESCE(e.is_bot,0) = 0
            AND e.event_type IN (
              'page_pixel',
              'page_view'
            )
        ) p
        WHERE raw_page IS NOT NULL
          AND LOWER(raw_page) NOT LIKE 'http%'
      )
      SELECT page_path, COUNT(*) AS views
      FROM normalized
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 25
    `;
    return await env.DB.prepare(pagesQuery).all();
  } catch (e) {
    console.log("Top pages query failed:", e.message, e.stack);
    return { results: [] };
  }
}
__name(getTopPages, "getTopPages");
__name2(getTopPages, "getTopPages");
async function getTopGalleryLandingPages(env, filters) {
  try {
    const { dateClause } = filters;
    const where = (dateClause || "").trim() || 'e.ts > datetime("now", "-1 day")';
    const galleryPagesQuery = `
      WITH e AS (
        SELECT
          CASE
            WHEN SUBSTR(raw_page, 1, 1) = '/' THEN raw_page
            ELSE '/' || raw_page
          END AS page_path,
          NULLIF(e.visitor_id, '') AS visitor_id
        FROM (
          SELECT
            e.visitor_id,
            e.event_type,
            COALESCE(
              NULLIF(e.page, ''),
              CASE WHEN SUBSTR(COALESCE(e.target_id, ''), 1, 1) = '/' THEN NULLIF(e.target_id, '') ELSE NULL END
            ) AS raw_page
          FROM classified_events e
          WHERE ${where}
            AND COALESCE(e.is_bot,0) = 0
            AND e.event_type IN (
              'page_pixel',
              'page_view',
              'edge_page',
              'image_page',
              'external_image_page',
              'chapter_view',
              'chapter_exposure',
              'state_pixel',
              'action_pixel',
              'gallery_view'
            )
        ) e
        WHERE raw_page IS NOT NULL
          AND LOWER(raw_page) NOT LIKE 'http%'
      )
      SELECT
        page_path,
        COUNT(*) AS views,
        COUNT(DISTINCT NULLIF(visitor_id, '')) AS unique_viewers
      FROM e
      WHERE page_path IN ${GALLERY_LANDING_IN_LIST}
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 25
    `;
    return await env.DB.prepare(galleryPagesQuery).all();
  } catch (e) {
    console.log("Top gallery landing pages query failed:", e.message, e.stack);
    return { results: [] };
  }
}
__name(getTopGalleryLandingPages, "getTopGalleryLandingPages");
__name2(getTopGalleryLandingPages, "getTopGalleryLandingPages");
async function getBrowserViewsSummary(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"),
      "qualify"
    );
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const isChapterPage = `(page_path GLOB '*/i-*' AND page_path NOT GLOB '*/i-*/*')`;
    const q = `
      WITH normalized AS (
        SELECT
          CASE
            WHEN SUBSTR(raw_page, 1, 1) = '/' THEN raw_page
            ELSE '/' || raw_page
          END AS page_path,
          visitor_id
        FROM (
          SELECT
            COALESCE(
              NULLIF(e.page, ''),
              CASE WHEN SUBSTR(COALESCE(e.target_id, ''), 1, 1) = '/' THEN NULLIF(e.target_id, '') ELSE NULL END
            ) AS raw_page,
            NULLIF(e.visitor_id, '') AS visitor_id
          FROM classified_events e
          WHERE ${where}
            ${qualify(ipClause)}
            ${qualify(safeBotClause)}
            ${qualify(chardonClause)}
            AND ${notCacheWarmer("e")}
            AND COALESCE(e.is_bot,0) = 0
            AND e.event_type IN (
              'page_pixel',
              'page_view'
            )
            AND (e.page IS NOT NULL OR e.target_id IS NOT NULL)
            AND COALESCE(
              NULLIF(e.page, ''),
              CASE WHEN SUBSTR(COALESCE(e.target_id, ''), 1, 1) = '/' THEN NULLIF(e.target_id, '') ELSE NULL END
            ) IS NOT NULL
        )
      )
      SELECT
        COUNT(*) AS js_page_views,
        COUNT(DISTINCT visitor_id) AS js_page_viewers,

        -- 1) Site pages/content: everything except gallery landing pages and /i- chapter/image pages
        SUM(CASE
          WHEN page_path NOT IN ${GALLERY_LANDING_IN_LIST}
           AND NOT ${isChapterPage}
          THEN 1 ELSE 0 END) AS site_content_views,
        COUNT(DISTINCT CASE
          WHEN page_path NOT IN ${GALLERY_LANDING_IN_LIST}
           AND NOT ${isChapterPage}
          THEN visitor_id ELSE NULL END) AS site_content_viewers,

        -- 2) Gallery landing page loads (browser)
        SUM(CASE WHEN page_path IN ${GALLERY_LANDING_IN_LIST} THEN 1 ELSE 0 END) AS gallery_landing_views,
        COUNT(DISTINCT CASE WHEN page_path IN ${GALLERY_LANDING_IN_LIST} THEN visitor_id ELSE NULL END) AS gallery_landing_viewers,

        -- 3) Chapter/Image page loads (browser) \u2014 /i- pages
        SUM(CASE WHEN ${isChapterPage} THEN 1 ELSE 0 END) AS chapter_image_views,
        COUNT(DISTINCT CASE WHEN ${isChapterPage} THEN visitor_id ELSE NULL END) AS chapter_image_viewers,

        (
          SELECT COUNT(*)
          FROM classified_events e
          WHERE ${where}
            ${qualify(ipClause)}
            ${qualify(safeBotClause)}
            ${qualify(chardonClause)}
            AND ${notCacheWarmer("e")}
            AND COALESCE(e.is_bot,0) = 0
            AND e.event_type IN ('external_image', 'direct_image', 'external_image_page')
        ) AS external_direct_image_loads
      FROM normalized
    `;
    const row = await env.DB.prepare(q).first();
    return {
      js_page_views: Number(row?.js_page_views || 0),
      js_page_viewers: Number(row?.js_page_viewers || 0),
      site_content_views: Number(row?.site_content_views || 0),
      site_content_viewers: Number(row?.site_content_viewers || 0),
      gallery_landing_views: Number(row?.gallery_landing_views || 0),
      gallery_landing_viewers: Number(row?.gallery_landing_viewers || 0),
      chapter_image_views: Number(row?.chapter_image_views || 0),
      chapter_image_viewers: Number(row?.chapter_image_viewers || 0),
      external_direct_image_loads: Number(row?.external_direct_image_loads || 0)
    };
  } catch (e) {
    console.log("Browser views summary query failed:", e.message, e.stack);
    return {
      js_page_views: 0,
      js_page_viewers: 0,
      site_content_views: 0,
      site_content_viewers: 0,
      gallery_landing_views: 0,
      gallery_landing_viewers: 0,
      chapter_image_views: 0,
      chapter_image_viewers: 0,
      external_direct_image_loads: 0
    };
  }
}
__name(getBrowserViewsSummary, "getBrowserViewsSummary");
__name2(getBrowserViewsSummary, "getBrowserViewsSummary");
async function getTopImages(env, filters) {
  return {
    images: { results: [] },
    uniqueImagesViewed: 0,
    totalImageSessions: 0,
    totalImageViews: 0
  };
}
__name(getTopImages, "getTopImages");
__name2(getTopImages, "getTopImages");
async function getEntryAnalysis(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"),
      "qualify"
    );
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const entryPagesQuery = `
      WITH base_events AS (
        SELECT
          COALESCE(
            NULLIF(e.session_id, ''),
            NULLIF(e.session_id_v2, ''),
            NULLIF(e.visitor_id, ''),
            'anon:' || COALESCE(NULLIF(e.ip_hash, ''), NULLIF(e.ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:', e.ts) || printf('%02d', (CAST(strftime('%M', e.ts) AS INTEGER) / 30) * 30)
          ) AS session_key,
          CASE
            WHEN SUBSTR(raw_page, 1, 1) = '/' THEN raw_page
            ELSE '/' || raw_page
          END AS page_path,
          e.referer AS referrer,
          e.ts
        FROM (
          SELECT
            e.session_id,
            e.session_id_v2,
            e.visitor_id,
            e.ip_hash,
            e.ip,
            e.referer,
            e.ts,
            COALESCE(NULLIF(e.page, ''), CASE WHEN SUBSTR(COALESCE(e.target_id, ''), 1, 1) = '/' THEN NULLIF(e.target_id, '') ELSE NULL END) AS raw_page
          FROM classified_events e
          WHERE ${where}
            ${qualify(ipClause)}
            ${qualify(safeBotClause)}
            ${qualify(chardonClause)}
            AND COALESCE(e.is_bot,0) = 0
            AND e.event_type IN (
              'page_pixel',
              'page_view',
              'edge_page',
              'image_page',
              'external_image_page',
              'chapter_view',
              'chapter_exposure',
              'state_pixel',
              'action_pixel',
              'gallery_view'
            )
        ) e
        WHERE raw_page IS NOT NULL
          AND LOWER(raw_page) NOT LIKE 'http%'
      ),
      first_pages AS (
        SELECT
          session_key,
          page_path,
          referrer,
          ROW_NUMBER() OVER (PARTITION BY session_key ORDER BY ts ASC) AS rn
        FROM base_events
      ),
      session_ext_ref AS (
        SELECT session_key, referrer,
          ROW_NUMBER() OVER (PARTITION BY session_key ORDER BY ts ASC) AS rn
        FROM base_events
        WHERE referrer IS NOT NULL
          AND referrer != ''
          AND referrer != 'unknown'
          AND referrer != 'direct'
          AND referrer NOT LIKE '%k4studios.com%'
      )
      SELECT
        fp.page_path,
        CASE
          WHEN COALESCE(ser.referrer, fp.referrer) IS NULL OR COALESCE(ser.referrer, fp.referrer) = '' OR COALESCE(ser.referrer, fp.referrer) = 'unknown' OR COALESCE(ser.referrer, fp.referrer) = 'direct' THEN 'direct'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%images.google.%' OR COALESCE(ser.referrer, fp.referrer) LIKE '%google.%/imgres%' THEN 'google_images'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%google.%' THEN 'google_search'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%bing.%/images%' THEN 'bing_images'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%bing.%' THEN 'bing_search'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%pinterest.%' THEN 'pinterest'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%facebook.%' OR COALESCE(ser.referrer, fp.referrer) LIKE '%fb.%' THEN 'facebook'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%twitter.%' OR COALESCE(ser.referrer, fp.referrer) LIKE '%t.co/%' OR COALESCE(ser.referrer, fp.referrer) LIKE '%x.com%' THEN 'twitter'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%chatgpt.com%' OR COALESCE(ser.referrer, fp.referrer) LIKE '%chat.openai.com%' THEN 'chatgpt'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%instagram.%' THEN 'instagram'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%linkedin.%' THEN 'linkedin'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%duckduckgo.%' THEN 'duckduckgo'
          WHEN COALESCE(ser.referrer, fp.referrer) LIKE '%k4studios.com%' THEN 'internal'
          ELSE 'unattributed'
        END AS ref_source,
        COUNT(DISTINCT fp.session_key) AS sessions
      FROM first_pages fp
      LEFT JOIN session_ext_ref ser ON ser.session_key = fp.session_key AND ser.rn = 1
      WHERE fp.rn = 1
      GROUP BY fp.page_path, ref_source
      ORDER BY sessions DESC
      LIMIT 25
    `;
    const entryPages = await env.DB.prepare(entryPagesQuery).all();
    let imagePageViewsFromEvents = 0;
    let imageEntrySessionsFromEvents = 0;
    try {
      const imagePageViewsQuery = `
        SELECT COUNT(*) as views
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          ${qualify(ipClause)}
          ${qualify(safeBotClause)}
          ${qualify(chardonClause)}
          AND e.source = 'js'
          AND e.event_type = 'page_view'
          AND (e.page IS NOT NULL OR e.target_id IS NOT NULL)
          AND COALESCE(NULLIF(e.page, ''), e.target_id) LIKE '%/i-%'
      `;
      const imagePageViewsResult = await env.DB.prepare(imagePageViewsQuery).first();
      imagePageViewsFromEvents = imagePageViewsResult?.views || 0;
      const imageEntrySessionsQuery = `
        WITH first_pages AS (
          SELECT
            e.session_id,
            ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.ts ASC) AS rn,
            COALESCE(NULLIF(e.page, ''), e.target_id) AS page_path
          FROM human_population hp
          JOIN classified_events e ON e.visitor_id = hp.visitor_id
          WHERE ${where}
            ${qualify(ipClause)}
            ${qualify(safeBotClause)}
            ${qualify(chardonClause)}
            AND e.source = 'js'
            AND e.event_type = 'page_view'
            AND e.session_id IS NOT NULL
            AND (e.page IS NOT NULL OR e.target_id IS NOT NULL)
        )
        SELECT COUNT(DISTINCT session_id) as sessions
        FROM first_pages
        WHERE rn = 1 AND page_path LIKE '%/i-%'
      `;
      const imageEntrySessionsResult = await env.DB.prepare(
        imageEntrySessionsQuery
      ).first();
      imageEntrySessionsFromEvents = imageEntrySessionsResult?.sessions || 0;
    } catch (e) {
      console.log("Entry diagnostics query failed:", e.message);
    }
    return {
      entryPages,
      imagePageViewsFromEvents,
      imageEntrySessionsFromEvents,
      entryRefCounts: { results: [] }
    };
  } catch (e) {
    console.log("Entry analysis query failed:", e.message);
    return {
      entryPages: { results: [] },
      imagePageViewsFromEvents: 0,
      imageEntrySessionsFromEvents: 0,
      entryRefCounts: { results: [] }
    };
  }
}
__name(getEntryAnalysis, "getEntryAnalysis");
__name2(getEntryAnalysis, "getEntryAnalysis");
async function getEngagementDepth(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"),
      "qualify"
    );
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const cowboyQuery = `
      SELECT COUNT(*) AS count
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
        ${qualify(ipClause)}
        ${qualify(safeBotClause)}
        ${qualify(chardonClause)}
        AND e.source = 'js'
        AND e.event_type = 'cowboy_jump'
    `;
    const cowboyRow = await env.DB.prepare(cowboyQuery).first();
    const cowboyJumps = cowboyRow?.count || 0;
    let themesClicked = { results: [] };
    try {
      const themesQuery = `
        SELECT
          e.target_id AS theme,
          COUNT(DISTINCT e.session_id) AS sessions,
          COUNT(*) AS clicks
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          ${qualify(ipClause)}
          ${qualify(safeBotClause)}
          ${qualify(chardonClause)}
          AND e.source = 'js'
          AND e.event_type = 'theme_click'
          AND e.target_id IS NOT NULL
          AND e.session_id IS NOT NULL
        GROUP BY e.target_id
        ORDER BY sessions DESC
        LIMIT 10
      `;
      themesClicked = await env.DB.prepare(themesQuery).all();
    } catch (e) {
      console.log("Themes clicked query failed:", e.message);
    }
    return {
      themesClicked,
      cowboyJumps,
      topDepthSessions: [],
      minEngagement: 0,
      maxEngagement: 0,
      avgDepthScore: 0,
      deepSessionPct: 0,
      deepSessions: 0,
      totalSessions: 0,
      botSessions: 0,
      botPct: 0
    };
  } catch (e) {
    console.log("Engagement depth query failed:", e.message);
    return {
      themesClicked: { results: [] },
      cowboyJumps: 0,
      topDepthSessions: [],
      minEngagement: 0,
      maxEngagement: 0,
      avgDepthScore: 0,
      deepSessionPct: 0,
      deepSessions: 0,
      totalSessions: 0,
      botSessions: 0,
      botPct: 0
    };
  }
}
__name(getEngagementDepth, "getEngagementDepth");
__name2(getEngagementDepth, "getEngagementDepth");
async function getExitAnalysis(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name2(
      (clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"),
      "qualify"
    );
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const exitPagesQuery = `
      WITH base_events AS (
        SELECT
          COALESCE(
            NULLIF(e.session_id, ''),
            NULLIF(e.session_id_v2, ''),
            NULLIF(e.visitor_id, ''),
            'anon:' || COALESCE(NULLIF(e.ip_hash, ''), NULLIF(e.ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:', e.ts) || printf('%02d', (CAST(strftime('%M', e.ts) AS INTEGER) / 30) * 30)
          ) AS session_key,
          CASE
            WHEN SUBSTR(raw_page, 1, 1) = '/' THEN raw_page
            ELSE '/' || raw_page
          END AS page_path,
          e.ts
        FROM (
          SELECT
            e.session_id,
            e.session_id_v2,
            e.visitor_id,
            e.ip_hash,
            e.ip,
            e.ts,
            COALESCE(NULLIF(e.page, ''), CASE WHEN SUBSTR(COALESCE(e.target_id, ''), 1, 1) = '/' THEN NULLIF(e.target_id, '') ELSE NULL END) AS raw_page
          FROM classified_events e
          WHERE ${where}
            ${qualify(ipClause)}
            ${qualify(safeBotClause)}
            ${qualify(chardonClause)}
            AND COALESCE(e.is_bot,0) = 0
            AND e.event_type IN (
              'page_pixel',
              'page_view',
              'edge_page',
              'image_page',
              'external_image_page',
              'chapter_view',
              'chapter_exposure',
              'state_pixel',
              'action_pixel',
              'gallery_view'
            )
        ) e
        WHERE raw_page IS NOT NULL
          AND LOWER(raw_page) NOT LIKE 'http%'
      ),
      last_pages AS (
        SELECT
          session_key,
          page_path,
          ROW_NUMBER() OVER (PARTITION BY session_key ORDER BY ts DESC) AS rn
        FROM base_events
      )
      SELECT
        page_path,
        COUNT(DISTINCT session_key) AS sessions
      FROM last_pages
      WHERE rn = 1
      GROUP BY page_path
      ORDER BY sessions DESC
      LIMIT 15
    `;
    const exitPages = await env.DB.prepare(exitPagesQuery).all();
    const rows = exitPages?.results || [];
    const exitByCategory = {
      home: 0,
      gallery: 0,
      images: 0,
      landing: 0,
      blog: 0,
      photoshoots: 0,
      other: 0
    };
    const isLandingPage = /* @__PURE__ */ __name2((path) => {
      if (!path || typeof path !== "string") return false;
      if (path === "/" || path === "") return false;
      if (path.startsWith("/Galleries/") || path.startsWith("/Other/"))
        return false;
      if (path.startsWith("/Blog/") || path.startsWith("/blog/")) return false;
      if (path.startsWith("/Photoshootsandevents/") || path.startsWith("/Photography-Galleries/") || path.startsWith("/Scheduled-Shoots/"))
        return false;
      return /^\/[^\/]+\/?$/.test(path);
    }, "isLandingPage");
    for (const r of rows) {
      const path = String(r.page_path || "");
      const sessions = Number(r.sessions || 0);
      if (!sessions) continue;
      if (path === "/" || path === "") {
        exitByCategory.home += sessions;
      } else if (path.includes("/i-")) {
        exitByCategory.images += sessions;
      } else if (path.startsWith("/Galleries/") || path.startsWith("/Other/")) {
        exitByCategory.gallery += sessions;
      } else if (path.startsWith("/Blog/") || path.startsWith("/blog/")) {
        exitByCategory.blog += sessions;
      } else if (path.startsWith("/Photoshootsandevents/") || path.startsWith("/Photography-Galleries/") || path.startsWith("/Scheduled-Shoots/")) {
        exitByCategory.photoshoots += sessions;
      } else if (isLandingPage(path)) {
        exitByCategory.landing += sessions;
      } else {
        exitByCategory.other += sessions;
      }
    }
    const exitSummary = {
      total_exit_sessions: rows.reduce(
        (sum, r) => sum + Number(r.sessions || 0),
        0
      )
    };
    return { exitPages, exitSummary, exitByCategory };
  } catch (e) {
    console.log("Exit analysis query failed:", e.message);
    return { exitPages: { results: [] }, exitSummary: {}, exitByCategory: {} };
  }
}
__name(getExitAnalysis, "getExitAnalysis");
__name2(getExitAnalysis, "getExitAnalysis");
async function getEdgeEvents(env, filters) {
  try {
    const { dateClause, yesterday, days } = filters || {};
    const d = Math.max(1, Math.min(parseInt(days || "1", 10) || 1, 31));
    const dateWhere = dateClause ? `${String(dateClause).replace(/\bts\b/g, "e.ts")}` : yesterday ? `date(e.ts, '-5 hours') = date('now', '-5 hours', '-1 day')` : `e.ts > datetime('now', '-${d} day')`;
    const eventsQuery = `
      SELECT
        e.event_type,
        e.target_id as path,
        e.is_bot,
        COUNT(*) as hits
      FROM classified_events e
      WHERE ${dateWhere}
        AND e.source = 'edge'
        AND e.event_type IN ('301','302','404','410','smart404_redirect','smart404_gone','smart404_fallback','smart404_homepage')
      GROUP BY e.event_type, e.target_id, e.is_bot
      ORDER BY hits DESC
      LIMIT 60
    `;
    const edgeEvents = await env.DB.prepare(eventsQuery).all();
    const summaryQuery = `
      SELECT
        e.event_type,
        COUNT(*) as total,
        SUM(CASE WHEN e.is_bot = 1 THEN 1 ELSE 0 END) as bot_hits,
        SUM(CASE WHEN e.is_bot = 1 THEN 0 ELSE 1 END) as human_hits
      FROM classified_events e
      WHERE ${dateWhere}
        AND e.source = 'edge'
        AND e.event_type IN ('301','302','404','410','smart404_redirect','smart404_gone','smart404_fallback','smart404_homepage')
      GROUP BY e.event_type
      ORDER BY total DESC
    `;
    const edgeSummaryResult = await env.DB.prepare(summaryQuery).all();
    const edgeSummary = edgeSummaryResult?.results || [];
    return { edgeEvents, edgeSummary };
  } catch (e) {
    console.log("Edge events query failed:", e.message);
    return { edgeEvents: { results: [] }, edgeSummary: [] };
  }
}
__name(getEdgeEvents, "getEdgeEvents");
__name2(getEdgeEvents, "getEdgeEvents");
async function getBotIntelligence(env) {
  const botIntelligence = {
    suspects: [],
    blocked: [],
    verified: [],
    stats: { total: 0, risk3: 0, risk4: 0, verified: 0, verified_bots: 0 }
  };
  try {
    const SUSPECTS_LIMIT = 500;
    const VERIFIED_LIMIT = 20;
    await ensureCrawlerStatusTable(env);
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
      WHERE is_verified_bot = 0
        AND risk_level >= 2
        AND status != 'blocked'
      ORDER BY risk_level DESC, risk_score DESC, total_requests DESC
      LIMIT ${SUSPECTS_LIMIT}
    `;
    const suspectsResult = await env.DB.prepare(suspectsQuery).all();
    botIntelligence.suspects = suspectsResult?.results || [];
    if (!Array.isArray(botIntelligence.suspects) || botIntelligence.suspects.length === 0 || botIntelligence.suspects.some((s) => !s?.ip_hash)) {
      const fallbackQuery = `
        WITH base AS (
          SELECT
            ip_hash,
            ts,
            country,
            referer,
            is_bot
          FROM classified_events
          WHERE ts > datetime('now', '-7 days')
            AND ip_hash IS NOT NULL
            AND ip_hash != ''
        )
        SELECT
          ip_hash,
          COUNT(*) as total_requests,
          COUNT(DISTINCT date(ts)) as days_seen,
          MIN(ts) as first_seen,
          MAX(ts) as last_seen,
          MAX(country) as country,
          SUM(CASE WHEN referer IS NOT NULL AND referer != '' THEN 1 ELSE 0 END) > 0 as has_referrer,
          MAX(is_bot) as is_flagged_bot
        FROM base
        GROUP BY ip_hash
        HAVING COUNT(*) >= 5 OR MAX(is_bot) = 1
        ORDER BY total_requests DESC
        LIMIT 50
      `;
      const fb = await env.DB.prepare(fallbackQuery).all();
      botIntelligence.suspects = (fb?.results || []).map((r) => ({
        ip_hash: r.ip_hash,
        risk_level: 2,
        risk_score: r.is_flagged_bot ? 2 : 0,
        rules_triggered: JSON.stringify(
          r.is_flagged_bot ? ["auto_flagged_bot"] : []
        ),
        first_seen: r.first_seen,
        last_seen: r.last_seen,
        days_seen: r.days_seen,
        total_requests: r.total_requests,
        image_page_pct: null,
        has_referrer: r.has_referrer ? 1 : 0,
        is_datacenter: null,
        is_verified_bot: 0,
        bot_name: null,
        country: r.country,
        status: "watching"
      }));
    }
    try {
      const totalsQuery = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN risk_level = 3 THEN 1 ELSE 0 END) AS risk3,
          SUM(CASE WHEN risk_level >= 4 THEN 1 ELSE 0 END) AS risk4
        FROM suspected_bots
        WHERE is_verified_bot = 0
          AND risk_level >= 2
          AND status != 'blocked'
      `;
      const totals = await env.DB.prepare(totalsQuery).first();
      botIntelligence.stats.total = totals?.total || 0;
      botIntelligence.stats.risk3 = totals?.risk3 || 0;
      botIntelligence.stats.risk4 = totals?.risk4 || 0;
    } catch (e) {
      console.log("Bot intelligence totals query failed:", e.message);
    }
    try {
      const frictionStatsQuery = `
        WITH suspects AS (
          SELECT ip_hash
          FROM suspected_bots
          WHERE risk_level >= 2
            AND is_verified_bot = 0
            AND status != 'blocked'
          ORDER BY risk_level DESC, risk_score DESC, total_requests DESC
          LIMIT ${SUSPECTS_LIMIT}
        ),

        friction_429_by_day AS (
          SELECT
            ip_hash,
            date(ts, '-5 hours') AS et_day,
            COUNT(*) AS count_429
          FROM raw_events
          WHERE event_type = 'harvester_friction'
            AND inferred_from = '429'
            AND ts >= datetime('now', '-7 days')
            AND ip_hash IN (SELECT ip_hash FROM suspects)
          GROUP BY ip_hash, et_day
        ),

        friction_429_max AS (
          SELECT
            ip_hash,
            MAX(count_429) AS friction_429_max_day_7d
          FROM friction_429_by_day
          GROUP BY ip_hash
        ),

        friction_24h AS (
          SELECT
            ip_hash,
            SUM(CASE WHEN inferred_from = '429' THEN 1 ELSE 0 END) AS friction_429_24h,
            SUM(CASE WHEN inferred_from = 'delay' THEN 1 ELSE 0 END) AS friction_delay_24h
          FROM raw_events
          WHERE event_type = 'harvester_friction'
            AND ts > datetime('now', '-24 hours')
            AND ip_hash IN (SELECT ip_hash FROM suspects)
          GROUP BY ip_hash
        ),

        velocity AS (
          SELECT
            ip_hash,
            MAX(unique_images_per_minute) AS peak_unique_images_per_minute_24h
          FROM (
            SELECT
              ip_hash,
              strftime('%Y-%m-%d %H:%M', ts) AS minute,
              COUNT(DISTINCT target_id) AS unique_images_per_minute
            FROM raw_events
            WHERE target_id IS NOT NULL
              AND ts > datetime('now', '-24 hours')
              AND ip_hash IN (SELECT ip_hash FROM suspects)
            GROUP BY ip_hash, minute
          )
          GROUP BY ip_hash
        ),

        delay_burst_ip AS (
          SELECT
            ip_hash,
            MAX(window_delays) AS max_friction_delay_10m_24h
          FROM (
            SELECT
              ip_hash,
              (strftime('%s', ts) / 600) AS ten_min_bucket,
              SUM(CASE WHEN event_type = 'harvester_friction' AND inferred_from = 'delay' THEN 1 ELSE 0 END) AS window_delays
            FROM raw_events
            WHERE ts > datetime('now', '-24 hours')
              AND ip_hash IN (SELECT ip_hash FROM suspects)
            GROUP BY ip_hash, ten_min_bucket
          )
          GROUP BY ip_hash
        ),

        ip_asn AS (
          SELECT
            ip_hash,
            MAX(cf_asn) AS cf_asn_last24h
          FROM raw_events
          WHERE ts > datetime('now', '-24 hours')
            AND cf_asn IS NOT NULL
            AND ip_hash IN (SELECT ip_hash FROM suspects)
          GROUP BY ip_hash
        ),

        delay_burst_asn AS (
          SELECT
            cf_asn,
            MAX(window_delays) AS max_friction_delay_10m_asn_24h
          FROM (
            SELECT
              cf_asn,
              (strftime('%s', ts) / 600) AS ten_min_bucket,
              SUM(CASE WHEN event_type = 'harvester_friction' AND inferred_from = 'delay' THEN 1 ELSE 0 END) AS window_delays
            FROM raw_events
            WHERE ts > datetime('now', '-24 hours')
              AND cf_asn IS NOT NULL
              AND ip_hash IN (SELECT ip_hash FROM suspects)
            GROUP BY cf_asn, ten_min_bucket
          )
          GROUP BY cf_asn
        ),

        known_search_ua_14d AS (
          SELECT
            ip_hash,
            SUM(CASE WHEN
              LOWER(COALESCE(ua, '')) LIKE '%googlebot%'
              OR LOWER(COALESCE(ua, '')) LIKE '%google-inspectiontool%'
              OR LOWER(COALESCE(ua, '')) LIKE '%googlebot-image%'
              OR LOWER(COALESCE(ua, '')) LIKE '%bingbot%'
              OR LOWER(COALESCE(ua, '')) LIKE '%bingpreview%'
              OR LOWER(COALESCE(ua, '')) LIKE '%msnbot%'
              OR LOWER(COALESCE(ua, '')) LIKE '%duckduckbot%'
              OR LOWER(COALESCE(ua, '')) LIKE '%yandex%'
              OR LOWER(COALESCE(ua, '')) LIKE '%baiduspider%'
              OR LOWER(COALESCE(ua, '')) LIKE '%applebot%'
              OR LOWER(COALESCE(ua, '')) LIKE '%slurp%'
              OR LOWER(COALESCE(ua, '')) LIKE '%petalbot%'
              OR LOWER(COALESCE(ua, '')) LIKE '%ccbot%'
            THEN 1 ELSE 0 END) AS known_search_ua_hits_14d,
            COUNT(*) AS total_ua_events_14d
          FROM raw_events
          WHERE ts > datetime('now', '-14 days')
            AND ip_hash IN (SELECT ip_hash FROM suspects)
          GROUP BY ip_hash
        )

        SELECT
          s.ip_hash,
          COALESCE(f24.friction_429_24h, 0) AS friction_429_24h,
          COALESCE(f24.friction_delay_24h, 0) AS friction_delay_24h,
          COALESCE(fm.friction_429_max_day_7d, 0) AS friction_429_max_day_7d,
          COALESCE(v.peak_unique_images_per_minute_24h, 0) AS peak_unique_images_per_minute_24h,
          COALESCE(dip.max_friction_delay_10m_24h, 0) AS max_friction_delay_10m_24h,
          COALESCE(dasn.max_friction_delay_10m_asn_24h, 0) AS max_friction_delay_10m_asn_24h,
          COALESCE(ks.known_search_ua_hits_14d, 0) AS known_search_ua_hits_14d,
          CASE
            WHEN COALESCE(ks.total_ua_events_14d, 0) > 0
            THEN (1.0 * COALESCE(ks.known_search_ua_hits_14d, 0)) / ks.total_ua_events_14d
            ELSE 0
          END AS known_search_ua_ratio_14d
        FROM suspects s
        LEFT JOIN friction_24h f24 ON f24.ip_hash = s.ip_hash
        LEFT JOIN friction_429_max fm ON fm.ip_hash = s.ip_hash
        LEFT JOIN velocity v ON v.ip_hash = s.ip_hash
        LEFT JOIN delay_burst_ip dip ON dip.ip_hash = s.ip_hash
        LEFT JOIN ip_asn ia ON ia.ip_hash = s.ip_hash
        LEFT JOIN delay_burst_asn dasn ON dasn.cf_asn = ia.cf_asn_last24h
        LEFT JOIN known_search_ua_14d ks ON ks.ip_hash = s.ip_hash
      `;
      const frictionRows = (await env.DB.prepare(frictionStatsQuery).all())?.results || [];
      const frictionMap = new Map(frictionRows.map((r) => [r.ip_hash, r]));
      for (const suspect of botIntelligence.suspects) {
        const f = frictionMap.get(suspect.ip_hash);
        suspect.friction_429_24h = f?.friction_429_24h || 0;
        suspect.friction_delay_24h = f?.friction_delay_24h || 0;
        suspect.friction_429_max_day_7d = f?.friction_429_max_day_7d || 0;
        suspect.peak_unique_images_per_minute_24h = f?.peak_unique_images_per_minute_24h || 0;
        suspect.max_friction_delay_10m_24h = f?.max_friction_delay_10m_24h || 0;
        suspect.max_friction_delay_10m_asn_24h = f?.max_friction_delay_10m_asn_24h || 0;
        suspect.known_search_ua_hits_14d = f?.known_search_ua_hits_14d || 0;
        suspect.known_search_ua_ratio_14d = f?.known_search_ua_ratio_14d || 0;
      }
    } catch (e) {
      console.log("Friction stats enrichment failed:", e.message);
    }
    const verifiedQuery = `
      SELECT
        sb.ip_hash,
        sb.bot_name,
        sb.total_requests,
        sb.last_seen,
        sb.country,
        COALESCE(cs.status_total_7d, 0) as status_total_7d,
        COALESCE(cs.status_200_7d, 0) as status_200_7d,
        COALESCE(cs.status_301_7d, 0) as status_301_7d,
        COALESCE(cs.status_302_7d, 0) as status_302_7d,
        COALESCE(cs.status_404_7d, 0) as status_404_7d,
        COALESCE(cs.status_410_7d, 0) as status_410_7d,
        COALESCE(cs.status_429_7d, 0) as status_429_7d,
        COALESCE(cs.status_5xx_7d, 0) as status_5xx_7d
      FROM suspected_bots sb
      LEFT JOIN (
        SELECT
          ip_hash,
          SUM(total_requests) as status_total_7d,
          SUM(status_200) as status_200_7d,
          SUM(status_301) as status_301_7d,
          SUM(status_302) as status_302_7d,
          SUM(status_404) as status_404_7d,
          SUM(status_410) as status_410_7d,
          SUM(status_429) as status_429_7d,
          SUM(status_5xx) as status_5xx_7d
        FROM crawler_status_daily
        WHERE day >= date('now', '-5 hours', '-6 days')
        GROUP BY ip_hash
      ) cs ON sb.ip_hash = cs.ip_hash
      WHERE sb.is_verified_bot = 1 AND sb.status = 'verified'
      ORDER BY sb.total_requests DESC
      LIMIT ${VERIFIED_LIMIT}
    `;
    const verifiedResult = await env.DB.prepare(verifiedQuery).all();
    botIntelligence.verified = verifiedResult?.results || [];
    botIntelligence.stats.verified = botIntelligence.verified.reduce(
      (sum, v) => sum + (v.total_requests || 0),
      0
    );
    try {
      const verifiedTotalQuery = `
        SELECT COUNT(*) AS verified_bots
        FROM suspected_bots
        WHERE is_verified_bot = 1 AND status = 'verified'
      `;
      const vt = await env.DB.prepare(verifiedTotalQuery).first();
      botIntelligence.stats.verified_bots = vt?.verified_bots || 0;
    } catch (e) {
      console.log("Verified bots total query failed:", e.message);
    }
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
    botIntelligence.blocked = blockedResult?.results || [];
  } catch (e) {
    console.log("Bot intelligence query failed:", e.message);
  }
  return botIntelligence;
}
__name(getBotIntelligence, "getBotIntelligence");
__name2(getBotIntelligence, "getBotIntelligence");
function buildDashboardData(queryResults, filterParams) {
  const {
    summary,
    returningVisitors,
    newVisitors,
    events,
    galleries,
    referrers,
    geo,
    trend,
    devices,
    bounceRate,
    avgDurationFormatted,
    peakHours,
    deviceEngagement,
    pages,
    images,
    uniqueImagesViewed,
    totalImageSessions,
    totalImageViews,
    themesClicked,
    cowboyJumps,
    topDepthSessions,
    minEngagement,
    maxEngagement,
    avgDepthScore,
    deepSessionPct,
    deepSessions,
    totalSessions,
    botSessions,
    botPct,
    entryPages,
    imagePageViewsFromEvents,
    imageEntrySessionsFromEvents,
    entryRefCounts,
    exitPages,
    exitSummary,
    exitByCategory,
    edgeEvents,
    edgeSummary,
    artViewsSummary,
    artViewsByType,
    topArtViews,
    externalImageAccess,
    externalImageAccessTotal,
    externalReachGeo,
    externalReachSources,
    externalDailySummary,
    entryRefCountsObj,
    imageAccessOverview,
    viewerDepth,
    suppressionStats,
    botIntelligence,
    periodTotals,
    statePixelTestRoaring20s,
    topGalleryLandingPages,
    browserViewsSummary
  } = queryResults;
  const {
    days,
    yesterday,
    selectedDate,
    galleryFilter,
    excludeIp,
    viewerIp,
    hideBots,
    hideChardon,
    authHeader
  } = filterParams;
  return {
    days,
    yesterday,
    selectedDate,
    galleryFilter,
    excludeIp,
    viewerIp,
    summary,
    newVisitors,
    returningVisitors,
    cowboyJumps: cowboyJumps || 0,
    events: events?.results || [],
    galleries: galleries?.results || [],
    referrers: referrers?.results || [],
    geo: geo?.results || [],
    trend: trend?.results || [],
    devices: devices?.results || [],
    pages: Array.isArray(pages) ? pages : pages?.results || [],
    images: images?.results || [],
    uniqueImagesViewed,
    totalImageSessions,
    totalImageViews,
    themesClicked: themesClicked?.results || [],
    topDepthSessions: topDepthSessions || [],
    minEngagement,
    maxEngagement,
    avgDepthScore,
    deepSessionPct,
    deepSessions,
    totalSessions,
    exitPages: exitPages?.results || [],
    exitSummary: exitSummary || {},
    exitByCategory: exitByCategory || [],
    botPct,
    botSessions,
    hideBots,
    hideChardon,
    edgeEvents: edgeEvents?.results || [],
    edgeSummary: edgeSummary || [],
    entryPages: entryPages?.results || [],
    entryRefCounts: entryRefCountsObj || {},
    imagePageViewsFromEvents,
    imageEntrySessionsFromEvents,
    bounceRate,
    avgDurationFormatted,
    peakHours,
    deviceEngagement,
    artViewsSummary,
    artViewsByType,
    topArtViews,
    externalImageAccess: externalImageAccess || [],
    externalImageAccessTotal: externalImageAccessTotal || 0,
    externalReachGeo: externalReachGeo || [],
    externalReachSources: externalReachSources || [],
    externalDailySummary: externalDailySummary || {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      todayLabel: selectedDate || "Today",
      yesterdayLabel: selectedDate ? "Prev Day" : "Yesterday",
      today: { total: 0, u: 0, e: 0 },
      yesterday: { total: 0, u: 0, e: 0 },
      delta: 0,
      pct: 0,
      topSources: []
    },
    viewerDepth,
    imageAccessOverview: imageAccessOverview || [],
    suppressionStats,
    botIntelligence,
    periodTotals: periodTotals || { total_visitors: 0, total_art_viewers: 0 },
    statePixelTestRoaring20s,
    topGalleryLandingPages: Array.isArray(topGalleryLandingPages) ? topGalleryLandingPages : topGalleryLandingPages?.results || [],
    browserViewsSummary,
    authHeader: authHeader || ""
  };
}
__name(buildDashboardData, "buildDashboardData");
__name2(buildDashboardData, "buildDashboardData");
function renderDashboard({
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
  events,
  galleries,
  referrers,
  geo,
  trend,
  devices,
  statePixelTestRoaring20s,
  pages,
  topGalleryLandingPages,
  browserViewsSummary,
  images,
  uniqueImagesViewed,
  totalImageSessions,
  totalImageViews,
  themesClicked,
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
  externalImageAccess,
  externalImageAccessTotal,
  externalReachGeo,
  externalReachSources,
  externalDailySummary,
  imageAccessOverview,
  viewerDepth,
  suppressionStats,
  botIntelligence,
  periodTotals,
  authHeader
}) {
  const s = summary || {};
  const safeDeviceEngagement = Array.isArray(deviceEngagement) ? deviceEngagement : [];
  const sp = statePixelTestRoaring20s || {};
  const spSisterV1Hits = Number(sp.sister_pixel_v1_hits || 0);
  const spZoomV1Hits = Number(sp.zoom_pixel_v1_hits || 0);
  const spGridOpenV1Hits = Number(sp.grid_open_pixel_v1_hits || 0);
  const spThemeGridOpenV1Hits = Number(sp.theme_grid_open_pixel_v1_hits || 0);
  const spGridImageClickV1Hits = Number(sp.grid_image_click_pixel_v1_hits || 0);
  const spThemeGridImageClickV1Hits = Number(sp.theme_grid_image_click_pixel_v1_hits || 0);
  const spGridShowMoreV1Hits = Number(sp.grid_show_more_pixel_v1_hits || 0);
  const spGridShowPreviousV1Hits = Number(sp.grid_show_previous_pixel_v1_hits || 0);
  const spBrowseAllOpenV1Hits = Number(sp.browse_all_open_pixel_v1_hits || 0);
  const spBrowseAllImageClickV1Hits = Number(
    sp.browse_all_image_click_pixel_v1_hits || 0
  );
  const spGalleryPreviewClickV1Hits = Number(
    sp.gallery_preview_click_pixel_v1_hits || 0
  );
  const spGalleryHeroClickV1Hits = Number(sp.gallery_hero_click_pixel_v1_hits || 0);
  const spGalleryExploreClickV1Hits = Number(
    sp.gallery_explore_click_pixel_v1_hits || 0
  );
  const spGalleryLandingViewV1Hits = Number(
    sp.gallery_landing_view_pixel_v1_hits || 0
  );
  const spExitToGalleryV1Hits = Number(sp.exit_to_gallery_pixel_v1_hits || 0);
  const spScroll25V1Hits = Number(sp.scroll_25_pixel_v1_hits || 0);
  const spScroll50V1Hits = Number(sp.scroll_50_pixel_v1_hits || 0);
  const spScroll75V1Hits = Number(sp.scroll_75_pixel_v1_hits || 0);
  const spScroll100V1Hits = Number(sp.scroll_100_pixel_v1_hits || 0);
  const spCowboyJumpV1Hits = Number(sp.cowboy_jump_pixel_v1_hits || 0);
  const spOrderClickedV1Hits = Number(sp.order_clicked_pixel_v1_hits || 0);
  const spSeriesInfoV1Hits = Number(sp.series_info_pixel_v1_hits || 0);
  const spMoreInfoOpenV1Hits = Number(sp.more_info_open_pixel_v1_hits || 0);
  const spSisterImageClickV1Hits = Number(
    sp.sister_image_click_pixel_v1_hits || 0
  );
  const spSlideshowStartV1Hits = Number(sp.slideshow_start_pixel_v1_hits || 0);
  const spChapterNavPrevV1Hits = Number(
    sp.chapter_nav_prev_pixel_v1_hits || 0
  );
  const spChapterNavNextV1Hits = Number(
    sp.chapter_nav_next_pixel_v1_hits || 0
  );
  const spSlideshowNavPrevV1Hits = Number(
    sp.slideshow_nav_prev_pixel_v1_hits || 0
  );
  const spSlideshowNavNextV1Hits = Number(
    sp.slideshow_nav_next_pixel_v1_hits || 0
  );
  const spCollectorNotesV1Hits = Number(sp.collector_notes_open_pixel_v1_hits || 0);
  const spGuideButtonsV1Hits =
    Number(sp.guide_open_pixel_v1_hits || 0) +
    Number(sp.guide_close_pixel_v1_hits || 0) +
    Number(sp.guide_done_pixel_v1_hits || 0) +
    Number(sp.guide_click_outside_pixel_v1_hits || 0);
  const spPixelEventMax = Math.max(
    spZoomV1Hits,
    spSisterV1Hits,
    spGridOpenV1Hits,
    spThemeGridOpenV1Hits,
    spGridImageClickV1Hits,
    spThemeGridImageClickV1Hits,
    spGridShowMoreV1Hits,
    spGridShowPreviousV1Hits,
    spBrowseAllOpenV1Hits,
    spBrowseAllImageClickV1Hits,
    spGalleryPreviewClickV1Hits,
    spGalleryHeroClickV1Hits,
    spGalleryExploreClickV1Hits,
    spGalleryLandingViewV1Hits,
    spExitToGalleryV1Hits,
    spScroll25V1Hits,
    spScroll50V1Hits,
    spScroll75V1Hits,
    spScroll100V1Hits,
    spCowboyJumpV1Hits,
    spOrderClickedV1Hits,
    spSeriesInfoV1Hits,
    spMoreInfoOpenV1Hits,
    spSisterImageClickV1Hits,
    spSlideshowStartV1Hits,
    spChapterNavPrevV1Hits,
    spChapterNavNextV1Hits,
    spSlideshowNavPrevV1Hits,
    spSlideshowNavNextV1Hits,
    spCollectorNotesV1Hits,
    spGuideButtonsV1Hits,
    1
  );
  const spViewerStats = sp.viewer_stats || {};
  const spViewers = Number(spViewerStats.viewers || 0);
  const spAvgExposuresPerViewer = Number(spViewerStats.avg_exposures_per_viewer || 0);
  const spAvgDupExposuresPerViewer = Number(
    spViewerStats.avg_duplicate_exposures_per_viewer || 0
  );
  const spPctViewersWithDupes = Number(spViewerStats.pct_viewers_with_duplicates || 0);
  const pulsePixelExposures = Number(sp.sister_pixel_v1_hits || 0);
  const spSessions = Number(sp.state_pixel_sessions || 0);
  const spByGallery = Array.isArray(sp.by_gallery) ? sp.by_gallery : [];
  const spPixelImageAccess = Array.isArray(sp.pixel_image_access) ? sp.pixel_image_access : [];
  const safeTopGalleryLandingPages = Array.isArray(topGalleryLandingPages) ? topGalleryLandingPages : [];
  const galleryLandingPathSet = /* @__PURE__ */ new Set(CANONICAL_GALLERY_LANDING_PATHS);
  const normalizeGalleryPath = /* @__PURE__ */ __name2((inputPath) => {
    if (!inputPath) return null;
    let path = String(inputPath).trim();
    if (!path) return null;
    if (!path.startsWith("/")) path = "/" + path.replace(/^\/+/, "");
    path = path === "/" ? "/" : path.replace(/\/+$/, "");
    if (!path || path === "/" || path === "/Galleries" || path === "/Other") return null;
    if (!galleryLandingPathSet.has(path)) return null;
    return path;
  }, "normalizeGalleryPath");
  const galleryCellMap = /* @__PURE__ */ new Map();
  for (const row of safeTopGalleryLandingPages) {
    const normalizedPath = normalizeGalleryPath(row?.page_path);
    if (!normalizedPath) continue;
    galleryCellMap.set(normalizedPath, {
      page_path: normalizedPath,
      views: Number(row?.views || 0),
      unique_viewers: Number(row?.unique_viewers || 0)
    });
  }
  const galleryCellRows = Array.from(galleryCellMap.values()).map((row) => ({
    ...row,
    total_activity: Number(row.views || 0)
  })).sort((a, b) => {
    const diff = Number(b.total_activity || 0) - Number(a.total_activity || 0);
    if (diff !== 0) return diff;
    return String(a.page_path || "").localeCompare(String(b.page_path || ""));
  }).slice(0, 25);
  const topGalleryLandingTotalViews = galleryCellRows.reduce(
    (sum, r) => sum + Number(r?.total_activity || 0),
    0
  );
  const bvs = browserViewsSummary || {};
  const siteContentViews = Number(bvs.site_content_views || 0);
  const siteContentViewers = Number(bvs.site_content_viewers || 0);
  const galleryLandingViews = Number(bvs.gallery_landing_views || 0);
  const galleryLandingViewers = Number(bvs.gallery_landing_viewers || 0);
  const chapterImageViews = Number(bvs.chapter_image_views || 0);
  const chapterImageViewers = Number(bvs.chapter_image_viewers || 0);
  const externalDirectImageLoads = Number(bvs.external_direct_image_loads || 0);
  const fmt2 = /* @__PURE__ */ __name2(
    (n) => Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "0.00",
    "fmt2"
  );
  const fmtLoc = /* @__PURE__ */ __name2((city, region, country) => {
    const c = String(city || "").trim();
    const r = String(region || "").trim();
    const co = String(country || "").trim();
    return [c, r, co].filter(Boolean).join(", ") || "Unknown";
  }, "fmtLoc");
  const galleryDisplayNameFromPath = /* @__PURE__ */ __name2((path) => {
    const parts = String(path || "").split("/").filter(Boolean);
    const clean = parts[0] === "Galleries" || parts[0] === "Other" ? parts.slice(1) : parts;
    return clean.slice(-2).join("/") || String(path || "");
  }, "galleryDisplayNameFromPath");
  const trendArr = Array.isArray(trend) ? trend : [];
  const selectedTrend = selectedDate ? trendArr.find((d) => d?.day === selectedDate) || null : null;
  const todayTrend = selectedTrend || (trendArr.length > 0 ? trendArr[trendArr.length - 1] : null);
  const artViewersToday = todayTrend?.art_viewers || 0;
  const siteVisitorsToday = todayTrend?.visitors || 0;
  const summedSiteVisitors = trendArr.reduce(
    (sum, d) => sum + (d.visitors || 0),
    0
  );
  const summedArtViewers = trendArr.reduce(
    (sum, d) => sum + (d.art_viewers || 0),
    0
  );
  const uniqueSiteVisitors = periodTotals?.total_visitors || 0;
  const uniqueArtViewers = periodTotals?.total_art_viewers || 0;
  const isMultiDay = days > 1 && !selectedDate && !yesterday;
  const isSingleDay = !isMultiDay;
  const singleDayTrend = selectedTrend || trendArr[0] || null;
  const totalSiteVisitors = isMultiDay ? summedSiteVisitors : singleDayTrend?.visitors || summedSiteVisitors;
  const totalArtViewers = isMultiDay ? summedArtViewers : singleDayTrend?.art_viewers || summedArtViewers;
  const isLevel5BlockRecommended = /* @__PURE__ */ __name2((suspect) => {
    if (!suspect || suspect.status === "blocked") return false;
    if (TRUSTED_TEST_IPS.has(normalizeIpHash(suspect.ip_hash))) return false;
    const knownSearchBots = /* @__PURE__ */ new Set([
      "googlebot",
      "bingbot",
      "duckduckbot",
      "yandexbot",
      "baiduspider",
      "applebot",
      "slurp",
      "petalbot",
      "ccbot",
      "facebookexternalhit"
    ]);
    const botName = String(suspect.bot_name || "").trim().toLowerCase();
    if (suspect.status === "verified") return false;
    if (botName && knownSearchBots.has(botName)) return false;
    const knownSearchUaHits14d = Number(suspect.known_search_ua_hits_14d || 0);
    const knownSearchUaRatio14d = Number(suspect.known_search_ua_ratio_14d || 0);
    if (knownSearchUaHits14d >= 20 && knownSearchUaRatio14d >= 0.6) return false;
    if ((suspect.risk_level || 0) < 4) return false;
    if (suspect.is_verified_bot) return false;
    const hardStopsDay = Number(
      suspect.friction_429_max_day_7d || suspect.friction_429_24h || 0
    );
    if (hardStopsDay >= 10) return true;
    const peakUniquePerMin = Number(
      suspect.peak_unique_images_per_minute_24h || 0
    );
    if (peakUniquePerMin >= 20) return true;
    const delayBurstIp = Number(suspect.max_friction_delay_10m_24h || 0);
    const delayBurstAsn = Number(suspect.max_friction_delay_10m_asn_24h || 0);
    const delayBurst = Math.max(delayBurstIp, delayBurstAsn);
    if (delayBurst >= 40) return true;
    const totalReqs = Number(suspect.total_requests || 0);
    const daysSeen = Number(suspect.days_seen || 0);
    if (totalReqs >= 200 && daysSeen >= 3) return true;
    return false;
  }, "isLevel5BlockRecommended");
  const eventLabels = {
    // -- High-value user interactions --
    page_view: "Page View",
    xl_zoom: "XL Zoom",
    browse_all_click: "Browse All Click",
    all_list_click: "All List Click",
    order_clicked: "Buy Button Click",
    order_submitted: "Order Submitted",
    collector_notes_open: "Collector Notes",
    more_info_open: "More Info",
    cowboy_jump: "Cowboy Jump",
    exit_to_gallery: "Exit to Gallery",
    gallery_explore_click: "Gallery Explore Click",
    gallery_preview_click: "Gallery Preview Click",
    gallery_hero_click: "Gallery Hero Click",
    guide_open: "Guide",
    guide_close: "Guide - Close",
    guide_done: "Guide - Done",
    guide_click_outside: "Guide - Click Outside",
    nav_next: "Nav Next",
    nav_prev: "Nav Prev",
    series_info: "Series Info",
    sister_image_click: "Sister Image Click",
    slideshow_start: "Slideshow Start",
    story_slider_click: "Story Slider Click",
    theme_click: "Theme Click",
    grid_open: "Grid Open",
    grid_image_click: "Grid Image Click",
    grid_show_more: "Grid Show More",
    grid_show_previous: "Grid Show Previous",
    scroll_25: "Scroll 25%",
    scroll_50: "Scroll 50%",
    scroll_75: "Scroll 75%",
    scroll_100: "Scroll 100%",
    session_exit: "Session Exit"
  };
  const eventCounts = {};
  events.forEach((e) => {
    eventCounts[e.event] = e.count;
  });
  if (artViewsSummary?.slideshow_starts) {
    if (eventCounts["slideshow_start"] == null) {
      eventCounts["slideshow_start"] = artViewsSummary.slideshow_starts;
    }
  }
  const allEvents = Object.keys(eventLabels).map((key) => ({
    event: key,
    label: eventLabels[key],
    count: eventCounts[key] || 0
  })).sort((a, b) => b.count - a.count);
  const pixelCoveredEvents = /* @__PURE__ */ __name2(new Set([
    "xl_zoom",
    "grid_open",
    "grid_image_click",
    "grid_show_more",
    "grid_show_previous",
    "browse_all_click",
    "browse_all_image_click",
    "cowboy_jump",
    "order_clicked",
    "series_info",
    "collector_notes_open",
    "guide_open",
    "guide_close",
    "guide_done",
    "guide_click_outside",
    "gallery_explore_click",
    "all_list_click",
    "scroll_25",
    "scroll_50",
    "scroll_75",
    "scroll_100",
    "more_info_open",
    "sister_image_click",
    "slideshow_start"
  ]), "pixelCoveredEvents");
  const formatEventName = /* @__PURE__ */ __name2((name) => {
    if (eventLabels[name]) return eventLabels[name];
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, "formatEventName");
  const maxEventCount = Math.max(...allEvents.map((e) => e.count), 1);
  const maxRefSessions = Math.max(...referrers.map((r) => r.sessions), 1);
  const maxGeoVisitors = Math.max(...geo.map((g) => g.visitors), 1);
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
  const excludeMeUrl = (() => {
    const p = new URLSearchParams(baseParams);
    if (viewerIp) p.set("excludeIp", viewerIp);
    return "?" + p.toString();
  })();
  const showAllUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("excludeIp");
    return "?" + p.toString();
  })();
  const hideBotsUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("hideBots", "1");
    return "?" + p.toString();
  })();
  const showBotsUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("hideBots");
    return "?" + p.toString();
  })();
  const hideChardonUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("hideChardon", "1");
    return "?" + p.toString();
  })();
  const showChardonUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("hideChardon");
    return "?" + p.toString();
  })();
  const refreshUEUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("refreshUE", "1");
    return "?" + p.toString();
  })();
  const periodLabel = yesterday ? "Yesterday" : `Last ${days} day(s)`;
  const greenBadgeLabel = (() => {
    const today = /* @__PURE__ */ new Date();
    const fmt = /* @__PURE__ */ __name2(
      (d) => d.toISOString().slice(0, 10),
      "fmt"
    );
    if (selectedDate) {
      const prefix = yesterday ? "Yesterday" : days === 1 ? "Today" : days === 7 ? "7D" : days === 30 ? "30D" : "3M";
      return `${prefix} \u2014 ${selectedDate}`;
    }
    if (days === 1 && !yesterday) return fmt(today);
    if (yesterday) {
      const yd = new Date(today);
      yd.setDate(yd.getDate() - 1);
      return fmt(yd);
    }
    if (days === 7) return "7 Day Tally";
    if (days === 30) return "30 Day Tally";
    if (days === 90) return "3 Month Tally";
    return `${days}D Tally`;
  })();
  const imageAccessTotals = (() => {
    const rows = imageAccessOverview || [];
    let imageProxyViews = 0;
    let unverifiedViews = 0;
    let externalViews = 0;
    let chapterJsViews = 0;
    let zoomViews = 0;
    for (const row of rows) {
      const badges = Array.isArray(row?.badges) ? row.badges : [];
      const chapterViews = Number(row?.chapter_views || 0);
      const proxyOnlyChapterViews = badges.includes("I") && !badges.includes("C") ? chapterViews : 0;
      const jsChapterViews = badges.includes("C") ? chapterViews : 0;
      const rowUnverifiedViews = Number(row?.unverified_views || 0);
      const extViews = Number(row?.external_views || 0);
      chapterJsViews += jsChapterViews;
      zoomViews += Number(row?.xl_zooms || 0);
      imageProxyViews += proxyOnlyChapterViews + extViews;
      unverifiedViews += rowUnverifiedViews;
      externalViews += extViews;
    }
    const allViews = chapterJsViews + zoomViews + imageProxyViews + unverifiedViews;
    return {
      uniqueImages: rows.length,
      allViews,
      chapterViews: chapterJsViews,
      zoomViews,
      imageProxyViews,
      unverifiedViews,
      externalViews
    };
  })();
  const otherAccessViews = (imageAccessTotals.unverifiedViews || 0) + (imageAccessTotals.externalViews || 0);
  const internalProxyViews = Math.max(
    0,
    (imageAccessTotals.imageProxyViews || 0) - (imageAccessTotals.externalViews || 0)
  );
  const coreAccessViews = (imageAccessTotals.chapterViews || 0) + (imageAccessTotals.zoomViews || 0) + internalProxyViews;
  const exposureViews = (imageAccessTotals.chapterViews || 0) + (imageAccessTotals.externalViews || 0);
  const extSummary = externalDailySummary || {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    todayLabel: selectedDate || "Today",
    yesterdayLabel: selectedDate ? "Prev Day" : "Yesterday",
    today: { total: 0, u: 0, e: 0 },
    yesterday: { total: 0, u: 0, e: 0 },
    delta: 0,
    pct: 0,
    topSources: []
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --k4-scrollbar-size: 5px;
      --k4-scrollbar-track: #111;
      --k4-scrollbar-thumb: #333;
      --k4-scrollbar-thumb-hover: #444;
      --k4-panel-list-max: 450px;
      --k4-grid-panel-max: 420px;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
    body.k4-loading, body.k4-loading * { cursor: progress !important; }
    .container { max-width: 1800px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 20px; }
    h2 { color: #888; font-size: 14px; text-transform: uppercase; margin: 20px 0 10px; }
    .controls { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .controls a { color: #4a9eff; text-decoration: none; padding: 5px 10px; border-radius: 4px; }
    .controls a:hover, .controls a.active { background: #333; }
    .pulse { display: flex; gap: 8px; margin-bottom: 8px; align-items: stretch; }
    .pulse .pulse-stat { flex: 1 1 0; min-width: 0; justify-content: center; }
    .pulse-row { display: flex; gap: 8px; margin-bottom: 10px; align-items: stretch; }
    .pulse-row .pulse-stat { flex: 1; justify-content: center; }
    .pulse-stat { background: #252525; padding: 6px 12px; border-radius: 6px; display: flex; align-items: center; gap: 6px; position: relative; cursor: help; }
    .pulse-stat.clickable { cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
    .pulse-stat.clickable:hover { transform: scale(1.02); }
    .pulse-stat.clickable.off { opacity: 0.4; }
    .pulse-stat .value { font-size: 18px; font-weight: bold; color: #4a9eff; }
    .pulse-stat .label { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
    .pulse-stat .info-icon { width: 12px; height: 12px; border-radius: 50%; background: #444; color: #888; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .pulse-stat .tooltip { display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; white-space: nowrap; z-index: 1000; margin-top: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); max-width: 280px; white-space: normal; line-height: 1.4; }
    .pulse-stat .tooltip::after { content: ''; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-bottom-color: #333; }
    .pulse-stat:hover .tooltip { display: block; }
    .pulse-stat.highlight { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
    .pulse-stat.highlight .value { color: #fff; }
    .pulse-stat.highlight .label { color: #fde68a; }
    .pulse-stat.highlight .info-icon { background: rgba(255,255,255,0.2); color: #fde68a; }
    .pulse-stat.collector { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); }
    .pulse-stat.collector .value { color: #fff; }
    .pulse-stat.collector .label { color: #c4b5fd; }
    .pulse-stat.collector .info-icon { background: rgba(255,255,255,0.2); color: #c4b5fd; }
    /* Custom scrollbar (thin + dark) */
    * { scrollbar-width: thin; scrollbar-color: var(--k4-scrollbar-thumb) var(--k4-scrollbar-track); }
    *::-webkit-scrollbar { width: var(--k4-scrollbar-size); height: var(--k4-scrollbar-size); }
    *::-webkit-scrollbar-track { background: var(--k4-scrollbar-track); border-radius: 999px; }
    *::-webkit-scrollbar-thumb { background: var(--k4-scrollbar-thumb); border-radius: 999px; }
    *::-webkit-scrollbar-thumb:hover { background: var(--k4-scrollbar-thumb-hover); }
    table { width: 100%; border-collapse: collapse; background: #252525; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
    th, td { padding: 5px 8px; text-align: left; border-bottom: 1px solid #333; font-size: 12px; }
    th { background: #1a1a1a; color: #888; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    /* Main grid - 4-column full-width layout to match other containers */
    .grid, .grid-tall { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0 auto 10px auto; width: 100%; max-width: 1780px; }
    .section { background: #252525; border-radius: 8px; padding: 10px; overflow: visible; }
    .grid > .section, .grid-tall > .section { max-height: var(--k4-grid-panel-max); overflow-y: auto; scrollbar-gutter: stable; }

    /* Split-panel layout: avoid nested scrollbars by making the panel fixed-height
       and putting the scroll only on the intended inner list region. */
    .grid > .section.k4-split-panel,
    .grid-tall > .section.k4-split-panel {
      height: var(--k4-grid-panel-max);
      max-height: var(--k4-grid-panel-max);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .k4-split-panel .k4-split-scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding-right: 6px;
      scrollbar-gutter: stable;
    }
    .section h3 { color: #fff; font-size: 13px; margin-bottom: 6px; }
    /* Bar chart styles */
    .bar-row { display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #333; }
    .bar-row:last-child { border-bottom: none; }
    .bar-label { width: 100px; flex-shrink: 0; font-size: 11px; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    .section-tip .tooltip { display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; z-index: 1000; margin-top: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); width: 220px; line-height: 1.4; }
    .section-tip .tooltip::after { content: ''; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-bottom-color: #333; }
    .section-tip:hover .tooltip { display: block; }
    .mini-btn { font-size: 10px; padding: 3px 8px; border: 1px solid #444; border-radius: 6px; background: #1a1a1a; color: #ccc; cursor: pointer; }
    .mini-btn:hover { background: #333; }
    .k4-overlay { display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.75); justify-content:center; align-items:center; }
    .k4-overlay.open { display:flex; }
    .k4-overlay-box { background:#1a1a1a; border:1px solid #333; border-radius:10px; width:90vw; max-width:900px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,.6); }
    .k4-overlay-hdr { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid #333; }
    .k4-overlay-hdr h2 { margin:0; font-size:14px; color:#bbb; }
    .k4-overlay-close { background:none; border:none; color:#888; font-size:20px; cursor:pointer; padding:0 4px; }
    .k4-overlay-close:hover { color:#fff; }
    .k4-overlay-body { overflow-y:auto; padding:12px 16px; flex:1; }
    .k4-overlay-body pre { white-space:pre-wrap; word-break:break-word; margin:0; font-family:ui-monospace,Consolas,monospace; font-size:12px; line-height:1.6; color:#ddd; }
    /* Art Views header bar */
    .artviews-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 8px; margin: 20px 0 12px 0; }
    .artviews-header .artviews-title { font-weight: 600; font-size: 16px; letter-spacing: 0.04em; }
    .artviews-header .artviews-title .subtle { margin-left: 10px; opacity: 0.6; font-size: 0.85em; color: #10b981; }
    .artviews-header .help-trigger { position: relative; cursor: help; }
    .artviews-header .help-trigger .info-icon { width: 18px; height: 18px; border-radius: 50%; background: #444; color: #888; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .artviews-header .help-trigger .tooltip { display: none; position: absolute; top: 100%; right: 0; transform: none; background: #333; color: #e0e0e0; padding: 10px 14px; border-radius: 6px; font-size: 11px; z-index: 1000; margin-top: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); width: 280px; line-height: 1.5; }
    .artviews-header .help-trigger .tooltip::after { content: ''; position: absolute; bottom: 100%; right: 8px; border: 6px solid transparent; border-bottom-color: #333; }
    .artviews-header .help-trigger:hover .tooltip { display: block; }
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
      /* \u2550\u2550\u2550 MOBILE MASTER RESET \u2550\u2550\u2550 */
      /* Body: 95% width, centered, no edge touching */
      body { 
        padding: 0 !important; 
        margin: 0 !important;
        width: 100% !important;
        overflow-x: hidden !important;
      }
      
      /* Main container: 95% width, centered */
      .container { 
        width: 95% !important; 
        max-width: 95% !important; 
        margin: 0 auto !important; 
        padding: 8px 0 !important;
      }
      
      /* \u2550\u2550\u2550 FORCE ALL GRIDS TO SINGLE COLUMN \u2550\u2550\u2550 */
      .grid, .grid-tall, .access-grid, .art-views-grid, .external-grid, .bot-intel-grid, .exit-grid {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      
      /* Override ANY inline max-width or fit-content */
      [style*="max-width"], [style*="fit-content"] {
        max-width: 100% !important;
        width: 100% !important;
      }
      
      /* \u2550\u2550\u2550 ALL SECTIONS: UNIFORM WIDTH \u2550\u2550\u2550 */
      .section {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 0 12px 0 !important;
        padding: 12px !important;
        box-sizing: border-box !important;
        max-height: none !important;
        overflow: visible !important;
      }

      /* Split panels should not be fixed-height on mobile */
      .section.k4-split-panel { height: auto !important; }
      .section.k4-split-panel .k4-split-scroll {
        overflow: visible !important;
        padding-right: 0 !important;
      }
      
      /* \u2550\u2550\u2550 PULSE STATS \u2550\u2550\u2550 */
      .pulse-row { flex-wrap: wrap; }
      .pulse-row .pulse-stat { flex: none; }
      .pulse { flex-wrap: wrap; gap: 6px; justify-content: center; width: 100% !important; }
      .pulse .pulse-stat { flex: 1 1 calc(33% - 6px); min-width: 80px; max-width: 120px; }
      .pulse-stat { padding: 6px 8px; }
      .pulse-stat .value { font-size: 13px; }
      .pulse-stat .label { font-size: 8px; }
      
      /* \u2550\u2550\u2550 TYPOGRAPHY \u2550\u2550\u2550 */
      h1 { font-size: 18px; flex-wrap: wrap; gap: 8px; text-align: center; }
      h1 a { font-size: 11px !important; margin-left: 0 !important; display: inline-block; }
      h2 { font-size: 13px; margin: 12px 0 6px; text-align: center; }
      h3 { font-size: 14px; }
      
      /* \u2550\u2550\u2550 CONTROLS \u2550\u2550\u2550 */
      .controls { 
        gap: 4px; 
        flex-wrap: wrap; 
        justify-content: center; 
        padding: 0; 
        width: 100% !important;
      }
      .controls a { font-size: 11px; padding: 6px 10px; }
      .controls > div { width: 100%; margin-top: 8px; flex-wrap: wrap; gap: 6px; justify-content: center; }
      .ip-filter { flex-wrap: wrap; gap: 6px; justify-content: center; width: 100%; }
      .controls > span { order: -1; width: 100%; text-align: center; margin-bottom: 4px; }
      
      /* \u2550\u2550\u2550 BAR CHARTS \u2550\u2550\u2550 */
      /* \u2550\u2550\u2550 BAR CHARTS \u2550\u2550\u2550 */
      .bar-label { width: 90px; font-size: 10px; flex-shrink: 0 !important; }
      .bar-row { 
        width: 100% !important; 
        display: flex !important;
        align-items: center !important;
      }
      .bar-container { 
        flex: 1 1 auto !important; 
        width: auto !important;
      }
      .bar-value { 
        flex-shrink: 0 !important; 
        min-width: 30px !important;
        text-align: right !important;
      }
      
      /* \u2550\u2550\u2550 TREND CHART \u2550\u2550\u2550 */
      .trend-chart { 
        padding: 12px !important; 
        overflow-x: auto; 
        margin-bottom: 15px; 
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .trend-chart h3 { font-size: 12px; margin-bottom: 8px; }
      .trend-bars { min-width: auto; gap: 3px; height: 80px; }
      .trend-bar { min-width: 30px; flex: 1; }
      .trend-bar-label { font-size: 9px; bottom: -20px; }
      .trend-bar-value { font-size: 10px; top: -16px; }
      
      /* \u2550\u2550\u2550 TABLES \u2550\u2550\u2550 */
      .section table { 
        display: table !important; 
        width: 100% !important; 
        table-layout: auto !important;
      }
      .section th, .section td {
        padding: 6px 8px !important;
      }

      /* Blocked IPs archive: make columns distribute cleanly on mobile */
      .blocked-ips-wrap { width: 100% !important; }
      .blocked-ips-table {
        width: 100% !important;
        table-layout: fixed !important;
      }
      .blocked-ips-table th:nth-child(1), .blocked-ips-table td:nth-child(1) { width: 92px; }
      .blocked-ips-table th:nth-child(3), .blocked-ips-table td:nth-child(3) { width: 56px; }
      .blocked-ips-table th:nth-child(4), .blocked-ips-table td:nth-child(4) { width: 78px; }
      .blocked-ips-table th:nth-child(5), .blocked-ips-table td:nth-child(5) { width: 78px; }
      .blocked-ips-table th:not(:nth-child(2)), .blocked-ips-table td:not(:nth-child(2)) { white-space: nowrap !important; }
      .blocked-ips-table th:nth-child(2), .blocked-ips-table td:nth-child(2) {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }
      
      /* \u2550\u2550\u2550 ART VIEWS HEADER \u2550\u2550\u2550 */
      .artviews-header { flex-wrap: wrap; gap: 8px; padding: 8px; }
      .artviews-header .artviews-title { font-size: 14px; }
      
      /* \u2550\u2550\u2550 BOT INTEL \u2550\u2550\u2550 */
      .bot-intel-grid .section { padding: 8px; width: 100% !important; }
      .bot-intel-grid table { font-size: 10px; width: 100% !important; }
      .bot-intel-grid th, .bot-intel-grid td { padding: 4px 2px; }
      
      /* \u2550\u2550\u2550 IMAGE ACCESS OVERVIEW \u2550\u2550\u2550 */
      #accessOverviewList { overflow-x: hidden; width: 100% !important; }
      #accessOverviewList > div:first-of-type { display: none !important; }
      #pixelAccessList { overflow-x: hidden; width: 100% !important; }
      #pixelAccessList > div:first-of-type { display: none !important; }
      
      /* \u2550\u2550\u2550 IMAGE ACCESS ROW: MOBILE CARD LAYOUT \u2550\u2550\u2550 */
      .access-row {
        display: grid !important;
        grid-template-columns: 72px 1fr 1fr 1fr !important;
        grid-template-rows: auto auto auto auto auto !important;
        gap: 6px 10px !important;
        min-width: 0 !important;
        width: 100% !important;
        padding: 12px !important;
        box-sizing: border-box !important;
        white-space: normal !important;
        align-items: start !important;
      }
      
      /* CRITICAL: Allow ALL children to shrink */
      .access-row, .access-row * {
        min-width: 0 !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }
      
      /* Image container: Row 1, Col 1 */
      .access-row > div:nth-child(1) { 
        grid-row: 1 / 3 !important;
        grid-column: 1 !important;
        width: 64px !important;
        justify-self: center !important;
      }
      .access-row img {
        width: 64px !important;
        height: 64px !important;
        flex-shrink: 0 !important;
        object-fit: cover !important;
        border-radius: 6px !important;
      }
      
      /* ID/badges column: Row 1, Col 2 */
      .access-row > div:nth-child(2) { 
        grid-row: 1 !important;
        grid-column: 2 / -1 !important;
        width: 100% !important;
      }
      
      /* Location: Row 2, Col 2 */
      .access-row > span:nth-child(3) {
        grid-row: 2 !important;
        grid-column: 2 / -1 !important;
        width: 100% !important;
        font-size: 12px !important;
      }
      
      /* C/Z/i stats: Row 3, distribute across available width */
      .access-row > span:nth-child(4),
      .access-row > span:nth-child(5),
      .access-row > span:nth-child(6) {
        grid-row: 3 !important;
        width: auto !important;
        text-align: center !important;
        padding: 4px 8px !important;
        background: rgba(255,255,255,0.03) !important;
        border-radius: 4px !important;
        font-size: 13px !important;
      }
      .access-row > span:nth-child(4) { grid-column: 2 !important; }
      .access-row > span:nth-child(5) { grid-column: 3 !important; }
      .access-row > span:nth-child(6) { grid-column: 4 !important; }
      
      /* Source: Row 5, span full width */
      .access-row > div:nth-child(7) {
        grid-row: 4 !important;
        grid-column: 1 / -1 !important;
        width: 100% !important;
        padding-top: 6px !important;
        border-top: 1px solid rgba(255,255,255,0.06) !important;
        margin-top: 4px !important;
      }

      .pixel-access-row {
        display: grid !important;
        grid-template-columns: 72px 1fr 1fr 1fr !important;
        grid-template-rows: auto auto auto auto !important;
        gap: 6px 10px !important;
        min-width: 0 !important;
        width: 100% !important;
        padding: 12px !important;
        box-sizing: border-box !important;
        white-space: normal !important;
        align-items: start !important;
      }
      .pixel-access-row, .pixel-access-row * {
        min-width: 0 !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }
      .pixel-access-row > div:nth-child(1) {
        grid-row: 1 / 3 !important;
        grid-column: 1 !important;
        width: 64px !important;
        justify-self: center !important;
      }
      .pixel-access-row img {
        width: 64px !important;
        height: 64px !important;
        object-fit: cover !important;
        border-radius: 6px !important;
      }
      .pixel-access-row > div:nth-child(2) {
        grid-row: 1 !important;
        grid-column: 2 / -1 !important;
        width: 100% !important;
      }
      .pixel-access-row > div:nth-child(3) {
        grid-row: 2 !important;
        grid-column: 2 / -1 !important;
        width: 100% !important;
      }
      .pixel-access-row > div:nth-child(4) {
        grid-row: 3 !important;
        grid-column: 2 / -1 !important;
        width: 100% !important;
        font-size: 12px !important;
      }
      .pixel-access-row > div:nth-child(5),
      .pixel-access-row > div:nth-child(6),
      .pixel-access-row > div:nth-child(7) {
        grid-row: 4 !important;
        width: auto !important;
        text-align: center !important;
        padding: 4px 8px !important;
        background: rgba(255,255,255,0.03) !important;
        border-radius: 4px !important;
        font-size: 13px !important;
      }
      .pixel-access-row > div:nth-child(5) { grid-column: 2 !important; }
      .pixel-access-row > div:nth-child(6) { grid-column: 3 !important; }
      .pixel-access-row > div:nth-child(7) { grid-column: 4 !important; }
      
      /* ID line: horizontal flow */
      .access-idline { 
        display: flex !important;
        flex-wrap: wrap !important; 
        gap: 6px !important;
        align-items: center !important;
      }
      .access-id { 
        font-size: 13px !important;
      }
      .access-devices { 
        flex: 0 0 auto !important; 
      }
      
      /* \u2550\u2550\u2550 ACCESS STATS BADGES (header) \u2550\u2550\u2550 */
      .access-stats { 
        flex-wrap: wrap !important; 
        gap: 4px !important; 
        justify-content: center !important; 
        margin-left: 0 !important; 
        width: 100% !important; 
      }
      .access-stats > span { font-size: 10px !important; padding: 3px 6px !important; }
      #accessFilterBtns { flex-wrap: wrap; }
    }
    /* Extra small mobile */
    @media (max-width: 480px) {
      body { padding: 5px; }
      .pulse { gap: 4px; }
      .pulse .pulse-stat { flex: 1 1 calc(50% - 4px); min-width: 0; max-width: none; }
      .pulse-stat { padding: 5px 6px; }
      .pulse-stat .value { font-size: 11px; }
      .pulse-stat .label { font-size: 7px; letter-spacing: -0.3px; }
      h1 { font-size: 15px; text-align: center; }
      h1 a { font-size: 10px !important; }
      h2 { font-size: 12px; text-align: center; }
      .controls a { font-size: 10px; padding: 5px 8px; }
      .controls > span { font-size: 11px !important; padding: 3px 8px !important; }
      .ip-filter a { font-size: 9px; padding: 4px 8px; }
      .trend-chart { padding: 8px; }
      .trend-bars { height: 70px; gap: 2px; }
      .trend-bar { min-width: 25px; }
      .trend-bar-label { font-size: 8px; bottom: -18px; }
      .trend-bar-value { font-size: 9px; top: -14px; }
      .bar-label { width: 70px; font-size: 9px; }
      .bar-value { font-size: 10px; }
      th, td { padding: 4px 6px; font-size: 10px; }
      /* Stack export button below filters */
      .controls > div { flex-direction: column; align-items: center; }
      .controls .export-btn { width: 100%; text-align: center; }
      /* Chart header mobile */
      .chart-header { display: flex; flex-direction: column; gap: 4px; text-align: center; }
      /* Stats badges wrap */
      .access-stats { flex-wrap: wrap; gap: 4px !important; justify-content: center !important; margin-left: 0 !important; width: 100%; }
      .access-stats > span { font-size: 10px !important; padding: 3px 6px !important; }
      /* Filter buttons */
      #accessFilterBtns { flex-wrap: wrap; }
      .chart-header #chart-title { font-size: 13px; }
      .chart-totals { margin-left: 0 !important; font-size: 10px !important; }
    }
    /* Chart header default */
    .chart-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px; }
    /* Trend chart styles */
    .trend-chart { background: #252525; border-radius: 8px; padding: 20px; margin-top: 10px; margin-bottom: 30px; }
    .trend-chart h3 { color: #fff; font-size: 14px; }
    .trend-bars { display: flex; align-items: flex-end; gap: 4px; height: 100px; padding-bottom: 25px; position: relative; }
    .trend-bar { flex: 1; min-width: 25px; max-width: 70px; background: linear-gradient(180deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px 4px 0 0; position: relative; cursor: pointer; transition: all 0.2s; }
    .trend-bar:hover { opacity: 0.8; }
    .trend-bar.selected { background: linear-gradient(180deg, #10b981 0%, #059669 100%); box-shadow: 0 0 12px rgba(16, 185, 129, 0.5); }
    .trend-bar.selected .trend-bar-value { color: #10b981; font-weight: bold; }
    .trend-bar.selected .trend-bar-label { color: #10b981; font-weight: bold; }
    .trend-bar-label { position: absolute; bottom: -26px; left: 50%; transform: translateX(-50%); font-size: 13px; color: #888; white-space: nowrap; }
    .data-change-marker { color: #f59e0b; font-size: 14px; font-weight: bold; cursor: help; position: relative; top: -1px; margin-left: 1px; }
    .trend-bar-value { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: 14px; color: #aaa; font-weight: 500; }
    .no-chart { color: #666; font-size: 13px; }
    .ip-filter { display: flex; gap: 10px; align-items: center; }
    .ip-filter a { font-size: 12px; }
    .ip-filter .exclude-active { background: #7c3aed; color: #fff; }
    .ip-filter .bot-filter { background: #4b5563; color: #fff; }
    .ip-filter .bot-filter.active { background: #059669; }
    .ip-badge { font-size: 11px; color: #888; background: #333; padding: 3px 8px; border-radius: 4px; }
  </style>
</head>
<body>
<div class="container">
  <h1>K4 Analytics <a href="/__k4serp" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none;margin-left:20px">\u{1F4CA} SERP</a> <a href="/__k4serp/launch" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none">\u{1F680} Launch Pad</a></h1>
  
  <div class="controls">
    <a href="?days=1${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 1 && !yesterday ? "active" : ""}">Today*</a>
    <a href="?yesterday=1${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${yesterday ? "active" : ""}">Yesterday*</a>
    <a href="?days=7${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 7 && !yesterday ? "active" : ""}">7 Days</a>
    <a href="?days=30${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 30 && !yesterday ? "active" : ""}">30 Days</a>
    <a href="?days=90${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 90 && !yesterday ? "active" : ""}">3 Months</a>
    <span style="background:#059669;padding:4px 10px;border-radius:4px;color:#fff;font-size:13px;">\u{1F4C5} ${greenBadgeLabel}</span>
    <div style="margin-left:auto;display:flex;gap:10px;align-items:center;">
      <div class="ip-filter">
        ${excludeIp ? `<span class="ip-badge">Excluding: ${excludeIp}</span><a href="${showAllUrl}">Show All IPs</a>` : `<a href="${excludeMeUrl}" class="exclude-active">Exclude My IP</a>`}
        ${hideBots ? `<a href="${showBotsUrl}" class="bot-filter active">\u{1F916} Bots Hidden</a>` : `<a href="${hideBotsUrl}" class="bot-filter">\u{1F916} Hide Bots</a>`}
        ${hideChardon ? `<a href="${showChardonUrl}" class="bot-filter active">\u{1F3E0} Team Hidden</a>` : `<a href="${hideChardonUrl}" class="bot-filter">\u{1F3E0} Hide Team</a>`}
      </div>
      <a href="/__k4stats/export?days=${days}${yesterday ? "&yesterday=1" : ""}${hideBots ? "&hideBots=1" : ""}" class="export-btn" style="background: #2d4a2d; padding: 5px 12px; border-radius: 4px; color: #4ade80;">\u{1F4E5} Export CSV</a>
    </div>
  </div>



  ${trend.length > 1 ? `
  <h3 class="chart-header" style="color:#fff;font-size:14px;margin-bottom:6px;">
    <span id="chart-title">Site Visitors per Day</span>
    <span class="chart-totals" style="font-size:12px;color:#888;margin-left:12px;">Total: <span style="color:#4a9eff;font-weight:bold;">${totalSiteVisitors}</span>${isMultiDay && uniqueSiteVisitors < summedSiteVisitors ? ` <span style="color:#666;">(${uniqueSiteVisitors} unique)</span>` : ""} visitors, <span style="color:#a855f7;font-weight:bold;">${totalArtViewers}</span>${isMultiDay && uniqueArtViewers < summedArtViewers ? ` <span style="color:#666;">(${uniqueArtViewers} unique)</span>` : ""} viewed images, <span style="color:#10b981;font-weight:bold;">${trendArr.reduce((s, d) => s + (d.pixel_reach || 0), 0)}</span> pixel reach</span>
  </h3>
  <div class="trend-chart">
    <div class="trend-bars" id="trend-chart-bars">
      ${(() => {
    const maxViewers = Math.max(...trend.map((t) => t.visitors), 1);
    return trend.map((t) => {
      const height = Math.max(t.visitors / maxViewers * 100, 2);
      const dateLabel = t.day.slice(5);
      const isDataChangeDate = t.day === "2026-02-14";
      const isSelected = selectedDate === t.day;
      return `
            <div class="trend-bar${isSelected ? " selected" : ""}" data-visitors="${t.visitors}" data-sessions="${t.sessions}" data-art-viewers="${t.art_viewers || 0}" data-pixel-reach="${t.pixel_reach || 0}" data-day="${t.day}" style="height: ${height}%" title="${t.day}: ${t.visitors} visitors, ${t.art_viewers || 0} viewed images, ${t.pixel_reach || 0} pixel reach">
              <span class="trend-bar-value">${t.visitors}</span>
              <span class="trend-bar-label">${dateLabel}${isDataChangeDate ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ""}</span>
            </div>
          `;
    }).join("");
  })()}
    </div>
  </div>
  <script>
    (function() {
      const bars = document.querySelectorAll('.trend-bar');
      // Click on bar to load that day's data (preserve days for chart context)
      bars.forEach(bar => {
        bar.style.cursor = 'pointer';
        bar.addEventListener('click', function() {
          const day = this.dataset.day;
          if (day) {
            const url = new URL(window.location.href);
            url.searchParams.set('date', day);
            url.searchParams.delete('yesterday');
            // Keep days param for chart context, default to 7 if not set
            if (!url.searchParams.get('days')) {
              url.searchParams.set('days', '7');
            }
            window.location.href = url.toString();
          }
        });
      });
    })();
  <\/script>
  ` : trend.length === 1 ? `
  <div class="trend-chart">
    <h3>Site Visitors</h3>
    <div class="trend-bars" style="justify-content: center;">
      <div class="trend-bar" style="height: 100%; width: 80px;" title="${trend[0].day}: ${trend[0].visitors} visitors (${trend[0].art_viewers || 0} viewed images)">
        <span class="trend-bar-value">${trend[0].visitors}</span>
        <span class="trend-bar-label">${trend[0].day.slice(5)}${trend[0].day === "2026-02-14" ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ""}</span>
      </div>
    </div>
  </div>
  ` : ""}

  <h2>Browser Views</h2>
  <div class="pulse-row">
    <div class="pulse-stat" style="background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);">
      <span class="value" style="color: #fff;">\u{1F4C4} ${siteContentViews}</span>
      <span class="label" style="color: #cbd5e1;">Site Pages / Content <span class="info-icon" style="background: rgba(255,255,255,0.12); color: #cbd5e1;">i</span></span>
      <div class="tooltip">Count of browser page-load events (<code>page_view</code> + <code>page_pixel</code>) mapped to site content pages. If 6 people hit Home, that\u2019s 6. If 1 person revisits Home 8 times, that\u2019s 8. Includes everything EXCEPT leaf gallery landing pages and chapter/image pages (/i-...). This is <em>not</em> sessions and <em>not</em> unique pages. Viewers: ${siteContentViewers}.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">\u{1F5BC} ${galleryLandingViews}</span>
      <span class="label" style="color: #a7f3d0;">Gallery Landing Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Count of browser page-load events (<code>page_view</code> + <code>page_pixel</code>) to <em>leaf gallery landing pages</em> (the gallery roots that contain images \u2014 essentially the chapter URL without the trailing <code>/i-...</code>). Content/collection pages under <code>/Galleries</code> are treated as Site Content. Viewers: ${galleryLandingViewers}.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
      <span class="value" style="color: #fff;">\u{1F50D} <span style="color:#ddd6fe;">${chapterImageViews}</span>/<span style="color:#f5d0fe;">${externalDirectImageLoads}</span></span>
      <span class="label" style="color: #ddd6fe;">Image Views (Chapter/Direct) <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">Split image loads: <strong>${chapterImageViews}</strong> chapter page image loads from <code>page_view</code>/<code>page_pixel</code> on <code>/i-...</code> pages (Viewers: ${chapterImageViewers}), and <strong>${externalDirectImageLoads}</strong> external/direct image loads (<code>external_image</code>, <code>direct_image</code>, <code>external_image_page</code>).</div>
    </div>
  </div>

  <h2>Pulse</h2>
  <div class="pulse">
    <div class="pulse-stat">
      <span class="value">${s.unique_visitors > 0 ? (s.sessions / s.unique_visitors).toFixed(1) : "0"}</span>
      <span class="label">Sessions/Visitor <span class="info-icon">i</span></span>
      <div class="tooltip">Average number of sessions per human visitor. Higher = more return visits or deeper browsing patterns. ${s.sessions || 0} sessions from ${s.unique_visitors || 0} unique visitors.</div>
    </div>
    <div class="pulse-stat">
      <span class="value"><span style="color:#10b981">${newVisitors}</span>/<span style="color:#f59e0b">${returningVisitors}</span></span>
      <span class="label">New/Ret <span class="info-icon">i</span></span>
      <div class="tooltip">New: IPs never seen before this period. Returning: IPs that visited previously. Green = new, Orange = returning.</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.avg_events_per_session || 0}</span>
      <span class="label">Average Engagement <span class="info-icon">i</span></span>
      <div class="tooltip">Average number of tracked engagement events per session.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#10b981;">${pulsePixelExposures}</span>
      <span class="label">Pixel Exposures <span class="info-icon">i</span></span>
      <div class="tooltip">Count of <strong>state_pixel</strong> events where <code>source_layer=sister_pixel_v1</code>. Excludes <code>action_pixel</code> so this reflects real exposure hits, not redundant action events.</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${spSessions}</span>
      <span class="label">Pixel Sessions <span class="info-icon">i</span></span>
      <div class="tooltip">Distinct 30-minute buckets clustered by <code>ip_hash + ua_class</code> that produced at least one sister pixel exposure event.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#22d3ee;">${avgDurationFormatted}</span>
      <span class="label">Avg Time <span class="info-icon">i</span></span>
      <div class="tooltip">Average session duration (first to last event). Only counts sessions with 2+ events. For art browsing, 2+ min is good engagement.</div>
    </div>
    ${peakHours.length > 0 ? `<div class="pulse-stat">
      <span class="value" style="color:#f472b6;">${peakHours.map((h) => h.hour).join(", ")}</span>
      <span class="label">Peak <span class="info-icon">i</span></span>
      <div class="tooltip">Highest traffic hour in morning (AM) and evening (PM) periods. ${peakHours.map((h) => `${h.period}: ${h.hour} (${h.sessions} sessions)`).join(", ")}. Great for social posting timing.</div>
    </div>` : ""}
    <div class="pulse-stat">
      <span class="value" style="color: ${bounceRate > 60 ? "#ef4444" : bounceRate > 40 ? "#f59e0b" : "#10b981"};">${bounceRate}%</span>
      <span class="label" style="color: ${bounceRate > 60 ? "#fecaca" : bounceRate > 40 ? "#fed7aa" : "#a7f3d0"};">Bounce <span class="info-icon" style="background: rgba(255,255,255,0.2); color: ${bounceRate > 60 ? "#fecaca" : bounceRate > 40 ? "#fed7aa" : "#a7f3d0"};">i</span></span>
      <div class="tooltip">Sessions with only 1 event (came and left immediately). Lower is better. Above 60% = concern, below 40% = great.</div>
    </div>
  </div>

  <div class="section" style="max-width:1780px;margin:0 auto 18px;">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <h3 style="margin:0;">Viewer Behavior (Sister Pixel)</h3>
      <span class="section-tip"><span class="info-icon" style="cursor:help;">i</span><div class="tooltip">Identity-based view of sister pixel behavior using <code>visitor_id</code> and <code>session_id</code>. \u201CDuplicates\u201D = exposures where a visitor re-viewed the same image within the same visit (visit = session_id, with a fallback if missing).</div></span>
    </div>
    <div style="margin-top:10px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="color:#888;font-size:12px;text-align:left;">
            <th style="padding:6px 0;border-bottom:1px solid #333;">Viewers</th>
            <th style="padding:6px 0;border-bottom:1px solid #333;">Avg exposures / viewer</th>
            <th style="padding:6px 0;border-bottom:1px solid #333;">Avg duplicate exposures / viewer</th>
            <th style="padding:6px 0;border-bottom:1px solid #333;">% viewers w/ duplicates</th>
          </tr>
        </thead>
        <tbody style="font-size:13px;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #222;">${spViewers}</td>
            <td style="padding:8px 0;border-bottom:1px solid #222;">${fmt2(spAvgExposuresPerViewer)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #222;">${fmt2(spAvgDupExposuresPerViewer)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #222;">${fmt2(spPctViewersWithDupes)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="section" style="max-width:1780px;margin:0 auto 18px;">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <h3 style="margin:0;">Most Popular Subjects/Galleries</h3>
      <span class="section-tip"><span class="info-icon" style="cursor:help;">i</span><div class="tooltip">Summary from image-page pixel traffic only. We keep rows where <code>page</code> contains <code>/i-...</code>, strip the image segment, and group counts by gallery root.</div></span>
    </div>
    <div style="margin-top:10px;">
      ${spByGallery.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="color:#888;font-size:12px;text-align:left;">
            <th style="padding:6px 0;border-bottom:1px solid #333;">Gallery</th>
            <th style="padding:6px 0;border-bottom:1px solid #333;">Viewed Images</th>
            <th style="padding:6px 0;border-bottom:1px solid #333;">Unique Images</th>
          </tr>
        </thead>
        <tbody style="font-size:13px;">
          ${spByGallery.map((r) => {
    const galleryPath = String(r.gallery_path || "");
    const displayLabel = galleryDisplayNameFromPath(galleryPath);
    const linkUrl = galleryPath && galleryPath.startsWith("/") ? "https://k4studios.com" + galleryPath : "#";
    const imageViews = Number(r.image_views || 0);
    const uniqueImages = Number(r.unique_images || 0);
    return `<tr><td style="padding:8px 0;border-bottom:1px solid #222;"><a href="${linkUrl}" target="_blank" rel="noopener" style="color:#c4b5fd;text-decoration:none;" title="${galleryPath}">${displayLabel}</a></td><td style="padding:8px 0;border-bottom:1px solid #222;">${imageViews}</td><td style="padding:8px 0;border-bottom:1px solid #222;">${uniqueImages}</td></tr>`;
  }).join("")}
        </tbody>
      </table>
      ` : `<div style="color:#aaa;font-size:13px;">No sister pixel gallery data for this period.</div>`}
    </div>
  </div>

  <div class="section" style="max-width:1780px;margin:0 auto 18px;">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <h3 style="margin:0;">Sister Pixel Image Access Overview</h3>
      <span class="section-tip"><span class="info-icon" style="cursor:help;">i</span><div class="tooltip">Per-image breakout from <code>raw_events</code> for <code>event_type='state_pixel'</code>. Includes all <code>source_layer</code> values (e.g. Sister Pixel + Zoom Pixel). This is a test mirror of the Art Views \u2192 \u201CImage Access Overview\u201D concept, but powered by pixels (not JS).</div></span>
      <span style="margin-left:auto;font-size:12px;color:#888;">Rows: <strong style="color:#fff;">${spPixelImageAccess.length || 0}</strong></span>
    </div>
    <div style="margin-top:10px;">
      ${spPixelImageAccess.length > 0 ? `
      <div style="max-height: var(--k4-panel-list-max); overflow-y: auto; padding-right: 4px; scrollbar-gutter: stable;" id="pixelAccessList">
        <div style="position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: 90px 180px minmax(120px, 1fr) minmax(140px, 1fr) 90px minmax(100px, 0.8fr) 70px 60px 60px; gap: 10px; padding: 7px 8px; background: #252525; color: #777; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #444; align-items: center;">
          <span style="display:flex;justify-content:center;">Image</span>
          <span>Type / ID</span>
          <span>\u{1F4C1} Gallery</span>
          <span>\u{1F4CD} Location</span>
          <span>\u{1F4BB} Platform</span>
          <span>\u{1F517} Referrer</span>
          <span style="display:flex;justify-content:flex-start;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#06b6d422;color:#06b6d4;font-size:9px;font-weight:bold;border:1px solid #06b6d455;" title="Zoom views">Z</span></span>
          <span style="text-align:center;">Exp</span>
          <span style="text-align:center;">View</span>
        </div>
        ${spPixelImageAccess.map((r, idx) => {
    const imageId = String(r.target_id || "");
    const rawPage = String(r.page || "");
    const galleryPath = rawPage && rawPage.includes("/i-") ? rawPage.substring(0, rawPage.indexOf("/i-")) : rawPage;
    const displayGallery = galleryDisplayNameFromPath(galleryPath || "") || "(missing)";
    const galleryUrl = galleryPath && galleryPath.startsWith("/") ? "https://k4studios.com" + galleryPath : "";
    const chapterPath = rawPage && rawPage.includes("/i-") ? rawPage : imageId && galleryPath && galleryPath.startsWith("/") ? `${galleryPath}/${imageId}` : "";
    const imageUrl = chapterPath && chapterPath.startsWith("/") ? "https://k4studios.com" + chapterPath : "#";
    const exposures = Number(r.exposures || 0);
    const zoomViews = Number(r.zoom_views || 0);
    const viewers = Number(r.viewers || 0);
    const loc = fmtLoc(r.city, r.region, r.country);
    const layerStr = String(r.source_layers || r.source_layer || "").trim();
    const layers = layerStr ? layerStr.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const hasSister = layers.includes("sister_pixel_v1") || String(r.source_layer || "") === "sister_pixel_v1";
    const hasZoom = layers.includes("zoom_pixel_v1") || String(r.source_layer || "") === "zoom_pixel_v1";
    // Device/platform detection from user_agent
    const ua = String(r.user_agent || "").toLowerCase();
    let deviceIcon = "";
    let platformLabel = "";
    if (ua.includes("iphone")) {
      deviceIcon = '<span title="iOS / iPhone" style="font-size:13px;">\u{1F4F1}</span>';
      platformLabel = "iPhone";
    } else if (ua.includes("ipad")) {
      deviceIcon = '<span title="iOS / iPad" style="font-size:13px;">\u{1F4F1}</span>';
      platformLabel = "iPad";
    } else if (ua.includes("android") && ua.includes("mobile")) {
      deviceIcon = '<span title="Android Mobile" style="font-size:13px;">\u{1F4F1}</span>';
      platformLabel = "Android";
    } else if (ua.includes("android")) {
      deviceIcon = '<span title="Android Tablet" style="font-size:13px;">\u{1F4F1}</span>';
      platformLabel = "Android Tab";
    } else if (ua.includes("macintosh") || ua.includes("mac os")) {
      deviceIcon = '<span title="Mac" style="font-size:13px;">\u{1F34E}</span>';
      platformLabel = "Mac";
    } else if (ua.includes("windows")) {
      deviceIcon = '<span title="Windows" style="font-size:13px;">\u{1FA9F}</span>';
      platformLabel = "Windows";
    } else if (ua.includes("linux") && !ua.includes("android")) {
      deviceIcon = '<span title="Linux" style="font-size:13px;">\u{1F427}</span>';
      platformLabel = "Linux";
    } else if (ua.includes("bot") || ua.includes("crawl") || ua.includes("spider")) {
      deviceIcon = '<span title="Bot/Crawler" style="font-size:13px;">\u{1F916}</span>';
      platformLabel = "Bot";
    } else if (ua) {
      deviceIcon = '<span title="Desktop" style="font-size:13px;">\u{1F5A5}\uFE0F</span>';
      platformLabel = "Desktop";
    }
    // Referrer classification
    const rawRef = String(r.referer || "").trim();
    let refLabel = "";
    let refIcon = "";
    let refColor = "#6b7280";
    if (!rawRef || rawRef === "unknown" || rawRef === "direct") {
      refLabel = "Direct"; refIcon = "\u{1F517}"; refColor = "#6b7280";
    } else if (rawRef.includes("images.google.") || (rawRef.includes("google.") && rawRef.includes("/imgres"))) {
      refLabel = "Google Img"; refIcon = "\u{1F5BC}\uFE0F"; refColor = "#f59e0b";
    } else if (rawRef.includes("google.")) {
      refLabel = "Google"; refIcon = "\u{1F50D}"; refColor = "#4a9eff";
    } else if (rawRef.includes("bing.") && rawRef.includes("/images")) {
      refLabel = "Bing Img"; refIcon = "\u{1F5BC}\uFE0F"; refColor = "#f59e0b";
    } else if (rawRef.includes("bing.")) {
      refLabel = "Bing"; refIcon = "\u{1F171}\uFE0F"; refColor = "#10b981";
    } else if (rawRef.includes("pinterest.")) {
      refLabel = "Pinterest"; refIcon = "\u{1F4CC}"; refColor = "#e11d48";
    } else if (rawRef.includes("facebook.") || rawRef.includes("fb.")) {
      refLabel = "Facebook"; refIcon = "\u{1F4D8}"; refColor = "#3b82f6";
    } else if (rawRef.includes("twitter.") || rawRef.includes("t.co/") || rawRef.includes("x.com")) {
      refLabel = "Twitter/X"; refIcon = "\u{1F426}"; refColor = "#38bdf8";
    } else if (rawRef.includes("chatgpt.com") || rawRef.includes("openai.com")) {
      refLabel = "ChatGPT"; refIcon = "\u{1F916}"; refColor = "#10b981";
    } else if (rawRef.includes("instagram.")) {
      refLabel = "Instagram"; refIcon = "\u{1F4F7}"; refColor = "#e879f9";
    } else if (rawRef.includes("linkedin.")) {
      refLabel = "LinkedIn"; refIcon = "\u{1F4BC}"; refColor = "#3b82f6";
    } else if (rawRef.includes("duckduckgo.")) {
      refLabel = "DDG"; refIcon = "\u{1F986}"; refColor = "#f97316";
    } else if (rawRef.includes("k4studios.com")) {
      refLabel = "Internal"; refIcon = "\u{1F504}"; refColor = "#6b7280";
    } else {
      try { refLabel = new URL(rawRef).hostname.replace(/^www\\./, ""); } catch (_) { refLabel = "Other"; }
      refIcon = "\u{1F310}"; refColor = "#9ca3af";
    }
    // P badge (lime green) for pixel view
    const pBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;background:#84cc1622;color:#84cc16;font-size:10px;font-weight:bold;border:1px solid #84cc1655;" title="Pixel View">P</span>';
    // Z column: numeric zoom count with the same cyan Z styling
    const zDisplay = zoomViews === 0
      ? '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:20px;padding:0 6px;border-radius:3px;background:#6b728022;color:#6b7280;font-size:10px;font-weight:bold;border:1px solid #6b728055;" title="Zoom views: 0 / ' + exposures + '">0</span>'
      : '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:20px;padding:0 6px;border-radius:3px;background:#06b6d422;color:#06b6d4;font-size:10px;font-weight:bold;border:1px solid #06b6d455;" title="Zoom views: ' + zoomViews + ' / ' + exposures + '">' + zoomViews + '</span>';
    const thumb = imageId && imageId.startsWith("i-") ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (idx < 6 ? "eager" : "lazy") + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #84cc1644;">' : '<span style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:#333;border-radius:6px;font-size:18px;border:1px solid #333;">\u{1F5BC}</span>';
    const borderColor = hasZoom ? "#06b6d444" : "#84cc1644";
    return `<div class="pixel-access-row" style="display:grid;grid-template-columns: 90px 180px minmax(120px, 1fr) minmax(140px, 1fr) 90px minmax(100px, 0.8fr) 70px 60px 60px;gap:10px;padding:8px 8px;border-bottom:1px solid #2a2a2a;border-left:3px solid ${borderColor};align-items:center;font-size:13px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
      <div style="display:flex;align-items:center;justify-content:center;">
        <a href="${imageUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;">${thumb}</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;">
          <div style="flex:0 0 auto;display:flex;gap:4px;">${pBadge}</div>
          <a href="${imageUrl}" target="_blank" rel="noopener" style="color:#84cc16;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;" title="${imageId}">${imageId || "(missing)"}</a>
        </div>
        <div style="font-size:11px;color:#6b7280;">pixel</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;">
        <span style="font-size:14px;flex-shrink:0;">\u{1F4C1}</span>
        ${galleryUrl ? `<a href="${galleryUrl}" target="_blank" rel="noopener" style="color:#93c5fd;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${galleryPath}">${displayGallery}</a>` : `<span style="color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${galleryPath}">${displayGallery}</span>`}
      </div>
      <div style="display:flex;align-items:center;gap:6px;color:#9aa3ad;overflow:hidden;">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${loc}">${loc}</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px;min-width:0;">
        ${deviceIcon ? `<span style="display:inline-flex;align-items:center;flex-shrink:0;">${deviceIcon}</span>` : ""}
        <span style="font-size:11px;color:#9aa3ad;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${platformLabel}</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden;" title="${rawRef}">
        <span style="flex-shrink:0;">${refIcon}</span>
        <span style="font-size:11px;color:${refColor};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${refLabel}</span>
      </div>
      <div style="display:flex;justify-content:flex-start;">${zDisplay}</div>
      <div style="text-align:center;font-weight:bold;color:#e5e7eb;">${exposures}</div>
      <div style="text-align:center;color:#e5e7eb;">${viewers}</div>
    </div>`;
  }).join("")}
      </div>
      ` : `<div style="color:#aaa;font-size:13px;">No pixel per-image data for this period.</div>`}
    </div>
  </div>


  ${isSingleDay ? `
  <div class="access-grid" style="display:none; grid-template-columns: 1fr 280px; gap: 12px; max-width: 1780px; margin: 0 auto;">
    <div class="section" style="max-height: none;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <h3 style="margin:0;">🌐 External Reach (Daily)</h3>
        <a href="${refreshUEUrl}" class="mini-btn" style="text-decoration:none;">↻ Refresh</a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div style="background:#1f1f1f;border:1px solid #333;border-radius:6px;padding:8px;">
          <div style="font-size:10px;color:#9aa3ad;">${extSummary.todayLabel}</div>
          <div style="font-size:18px;font-weight:800;color:#f59e0b;">${Number(extSummary?.today?.total || 0)}</div>
          <div style="font-size:11px;color:#cbd5e1;">U ${Number(extSummary?.today?.u || 0)} · E ${Number(extSummary?.today?.e || 0)}</div>
        </div>
        <div style="background:#1f1f1f;border:1px solid #333;border-radius:6px;padding:8px;">
          <div style="font-size:10px;color:#9aa3ad;">${extSummary.yesterdayLabel}</div>
          <div style="font-size:18px;font-weight:800;color:#93c5fd;">${Number(extSummary?.yesterday?.total || 0)}</div>
          <div style="font-size:11px;color:#cbd5e1;">U ${Number(extSummary?.yesterday?.u || 0)} · E ${Number(extSummary?.yesterday?.e || 0)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-size:11px;color:#9aa3ad;">Delta:</span>
        <span style="font-size:12px;font-weight:700;color:${Number(extSummary?.delta || 0) >= 0 ? "#f59e0b" : "#93c5fd"};">${Number(extSummary?.delta || 0) >= 0 ? "+" : ""}${Number(extSummary?.delta || 0)} (${Number(extSummary?.pct || 0)}%)</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${(Array.isArray(extSummary?.topSources) && extSummary.topSources.length > 0 ? extSummary.topSources : (externalReachSources || []).slice(0, 4)).map((s2) => '<div style="display:flex;align-items:center;justify-content:space-between;background:#1a1a1a;border-radius:4px;padding:4px 6px;"><span style="color:#ccc;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+String(s2?.source || "Unknown")+'</span><span style="color:#f59e0b;font-size:11px;font-weight:700;">'+Number(s2?.hits || 0)+'</span></div>').join("") || '<div style="color:#666;font-size:11px;">No external source data yet</div>'}
      </div>
      <div style="margin-top:8px;font-size:10px;color:#666;">Generated ${String(extSummary?.generatedAt || "").replace("T", " ").slice(0, 19)}Z</div>
    </div>

    <!-- Image Access Overview (unified panel) -->
    <div class="section" style="max-height: none; display:none;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
        <h3 style="margin: 0;">\u{1F4CA} Image Access Overview</h3>
        <span style="font-size: 10px; color: #9aa3ad;">External / Unidentified art views (U + E, non-JS signals)</span>
        <div class="access-stats" style="margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; justify-content: flex-end;">
          <span title="Other = Unverified (U) + External (E). Non-JS image fetches: previews, embeds, privacy browsers, crawlers." style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #666;background:#1f1f1f;color:#cbd5e1;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#2a2a2a;color:#bbb;font-size:10px;font-weight:bold;border:1px solid #555;">O</span>
            <span style="font-weight:800;color:#e5e7eb;">${otherAccessViews}</span>
          </span>
        </div>
      </div>
      <div style="max-height: var(--k4-panel-list-max); overflow-y: auto; padding-right: 4px; scrollbar-gutter: stable;" id="accessOverviewList">
        <!-- Column headers (inside scroller so scrollbar doesn't shift columns) -->
        <div style="position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: 90px 220px 180px 90px auto; gap: 10px; padding: 7px 8px; background: #252525; color: #777; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #444; align-items: center;">
          <span style="display:flex;justify-content:center;">Image</span>
          <span style="display:flex;justify-content:flex-start;padding-left:14px;">Type / ID</span>
          <span onclick="sortAccessLocation()" id="accessLocationHeader" style="cursor:pointer; user-select:none;">\u{1F4CD} Location \u21C5</span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#2a2a2a;color:#bbb;font-size:9px;font-weight:bold;border:1px solid #555;" title="Other hits (U+E)">O</span></span>
          <span style="display:flex;align-items:center;gap:8px;">
            <span>Source</span>
            <span onclick="sortAccessTime()" id="accessTimeHeader" title="Sort by time (newest first)" style="cursor:pointer; user-select:none; font-size: 12px; opacity: 0.9;">\u{1F552}</span>
          </span>
        </div>
        ${(imageAccessOverview || []).filter((row) => {
    const badges = Array.isArray(row.badges) ? row.badges : [];
    return badges.includes("U") || badges.includes("E");
  }).map((row, i) => {
    const imageId = row.image_id?.startsWith("i-") ? row.image_id : null;
    const rowDevices = Array.isArray(row.devices) ? row.devices : [];
    const rawUrl = row.url ? String(row.url) : "";
    const linkUrl = rawUrl ? rawUrl.startsWith("http") ? rawUrl : "https://k4studios.com" + (rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl) : "https://k4studios.com/art/" + row.image_id;
    function deviceIconsHtml(devices2) {
      if (!Array.isArray(devices2) || devices2.length === 0)
        return "";
      const iconMap = {
        ios: "\u{1F4F1}",
        android: "\u{1F170}\uFE0F",
        mac: "\u{1F34E}",
        windows: "\u{1FA9F}",
        linux: "\u{1F427}",
        desktop: "\u{1F5A5}\uFE0F",
        mobile: "\u{1F4F1}",
        tablet: "\u{1F4F1}",
        unknown: "\u2753"
      };
      const labelMap = {
        ios: "iOS",
        android: "Android",
        mac: "Mac",
        windows: "Windows",
        linux: "Linux",
        desktop: "Desktop",
        mobile: "Mobile",
        tablet: "Tablet",
        unknown: "Unknown"
      };
      const uniq = Array.from(
        new Set(
          devices2.map((d) => String(d || "").toLowerCase()).filter(Boolean)
        )
      );
      const icons = uniq.slice(0, 4).map((d) => {
        const icon = iconMap[d] || "\u2753";
        const label = labelMap[d] || d;
        return '<span title="' + label + '" style="font-size:12px;">' + icon + "</span>";
      }).join("");
      return '<span title="Devices" style="display:inline-flex;align-items:center;gap:4px;opacity:0.85;">' + icons + "</span>";
    }
    __name(deviceIconsHtml, "deviceIconsHtml");
    __name2(deviceIconsHtml, "deviceIconsHtml");
    const deviceIcons = deviceIconsHtml(rowDevices);
    const COUNTRY_COLORS = {
      US: "#5ab1ff",
      CA: "#9bd67a",
      GB: "#ffb86b",
      FR: "#e68cff",
      DE: "#ffd166",
      BR: "#7ae582",
      AU: "#ffa69e",
      default: "#9aa3ad"
    };
    function formatLocation(g) {
      if (!g) return "\u2014";
      const country = (g.country || "").toString().trim();
      const region = (g.region || "").toString().trim();
      const city = (g.city || "").toString().trim();
      if (city && region)
        return city + ", " + region + ", " + country;
      if (city) return city + ", " + country;
      return country || "\u2014";
    }
    __name(formatLocation, "formatLocation");
    __name2(formatLocation, "formatLocation");
    const geo2 = row.geo || null;
    const geoCountry = (geo2?.country || row.countries && row.countries[0] || "").toString().trim().toUpperCase();
    const locationText = formatLocation({
      country: geoCountry || geo2?.country || "",
      region: geo2?.region,
      city: geo2?.city
    });
    const locColor = COUNTRY_COLORS[geoCountry] || COUNTRY_COLORS.default;
    const primaryBadge = row.badges.includes("C") ? "C" : row.badges.includes("I") ? "I" : row.badges.includes("E") ? "E" : "U";
    const primaryColors = {
      C: { text: "#a78bfa", bdr: "#a78bfa55" },
      I: { text: "#8b5cf6", bdr: "#8b5cf655" },
      // Image exposure (proxy only) - dimmer purple
      E: { text: "#3b82f6", bdr: "#3b82f655" },
      U: { text: "#f59e0b", bdr: "#f59e0b55" }
    };
    const p = primaryColors[primaryBadge] || primaryColors.U;
    const badgeHtml = row.badges.map((b) => {
      const colors = {
        C: { bg: "#a78bfa22", text: "#a78bfa", bdr: "#a78bfa55" },
        I: { bg: "#8b5cf622", text: "#8b5cf6", bdr: "#8b5cf655" },
        U: { bg: "#f59e0b22", text: "#f59e0b", bdr: "#f59e0b55" },
        E: { bg: "#3b82f622", text: "#3b82f6", bdr: "#3b82f655" }
      };
      const c = colors[b] || colors.U;
      const label = b === "U" ? "u" : b === "I" ? "i" : b;
      return '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;background:' + c.bg + ";color:" + c.text + ";font-size:10px;font-weight:bold;border:1px solid " + c.bdr + ';" title="' + (b === "C" ? "Chapter View (JS verified)" : b === "I" ? "Image Exposure (proxy only)" : b === "E" ? "External Referral" : "Unverified") + '">' + label + "</span>";
    }).join(" ");
    const srcIcons = {
      "Google Search": "\u{1F50D}",
      "Google Images": "\u{1F5BC}\uFE0F",
      Bing: "\u{1F50D}",
      "Twitter/X": "\u{1F426}",
      Facebook: "\u{1F4D8}",
      Pinterest: "\u{1F4CC}",
      DuckDuckGo: "\u{1F986}",
      ChatGPT: "\u{1F9E0}",
      "Open Graph": "\u{1F578}\uFE0F",
      "Structured Data": "\u{1F9FE}",
      "No Referrer": "\u{1F517}",
      Direct: "\u{1F517}",
      Internal: "\u{1F3E0}",
      Unknown: "\u2753"
    };
    function normalizeSourceDomain(raw) {
      if (!raw) return "";
      const s2 = String(raw).trim();
      if (!s2) return "";
      try {
        return new URL(s2).hostname.toLowerCase();
      } catch (_) {
        return s2.toLowerCase().replace(/^www\./, "").split("/")[0];
      }
    }
    __name(normalizeSourceDomain, "normalizeSourceDomain");
    __name2(normalizeSourceDomain, "normalizeSourceDomain");
    function sourceBadgeHtml(rawSource) {
      const domain = normalizeSourceDomain(rawSource);
      const pretty = String(rawSource || "").trim();
      const baseLabel = pretty.replace(/\s*\([^)]*\)\s*$/, "").trim();
      let icon = srcIcons[pretty] || srcIcons[baseLabel] || "\u{1F310}";
      let label = pretty || "Unknown";
      if (domain === "google.com" || domain.endsWith(".google.com") || pretty === "Google Search") {
        icon = "\u{1F7E2}";
        label = domain === "images.google.com" || pretty === "Google Images" ? "Google Images" : "Google";
      }
      if (domain === "images.google.com" || pretty === "Google Images") {
        icon = "\u{1F7E2}";
        label = "Google Images";
      }
      if (domain === "pinterest.com" || domain.endsWith(".pinterest.com") || pretty === "Pinterest") {
        icon = "\u{1F534}";
        label = "Pinterest";
      }
      if (domain === "bing.com" || domain.endsWith(".bing.com") || pretty === "Bing") {
        icon = "\u{1F535}";
        label = "Bing";
      }
      if (domain === "t.co" || domain.endsWith(".twitter.com") || domain === "x.com" || domain.endsWith(".x.com") || pretty === "Twitter/X") {
        icon = "\u{1F426}";
        label = "Twitter/X";
      }
      if (domain === "facebook.com" || domain.endsWith(".facebook.com") || domain === "fb.com" || domain.endsWith(".fb.com") || pretty === "Facebook") {
        icon = "\u{1F535}";
        label = "Facebook";
      }
      if (baseLabel === "Open Graph") {
        icon = "\u{1F578}\uFE0F";
        label = pretty;
      }
      if (baseLabel === "Structured Data") {
        icon = "\u{1F9FE}";
        label = pretty;
      }
      const title = pretty || domain || "Unknown";
      const safeLabel = label || title;
      return '<span title="' + title + '" style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;border:1px solid #333;background:#1f1f1f;color:#cbd5e1;font-size:11px;line-height:1;white-space:nowrap;"><span style="font-size:12px;">' + icon + '</span><span style="opacity:0.95;">' + safeLabel + "</span></span>";
    }
    __name(sourceBadgeHtml, "sourceBadgeHtml");
    __name2(sourceBadgeHtml, "sourceBadgeHtml");
    function rankSourceForDisplay(src) {
      const pretty = String(src || "").trim();
      if (!pretty) return 999;
      const baseLabel = pretty.replace(/\s*\([^)]*\)\s*$/, "").trim();
      const rank = {
        "Google Images": 0,
        "Google Search": 1,
        Google: 1,
        Bing: 2,
        Pinterest: 3,
        "Twitter/X": 4,
        Facebook: 5,
        DuckDuckGo: 6,
        ChatGPT: 7,
        "Open Graph": 20,
        "Structured Data": 21,
        "No Referrer": 80,
        // Keep legacy label low-priority (older mental model)
        Direct: 85,
        Internal: 90,
        Unknown: 99
      };
      if (rank[pretty] != null) return rank[pretty];
      if (rank[baseLabel] != null) return rank[baseLabel];
      return 40;
    }
    __name(rankSourceForDisplay, "rankSourceForDisplay");
    __name2(rankSourceForDisplay, "rankSourceForDisplay");
    const sources = Array.isArray(row.sources) ? row.sources : [];
    const sourcesSorted = sources.map((s2) => String(s2 || "").trim()).filter(Boolean).sort(
      (a, b) => rankSourceForDisplay(a) - rankSourceForDisplay(b) || a.localeCompare(b)
    );
    const srcHtml = sourcesSorted.length > 0 ? sourcesSorted.slice(0, 2).map(sourceBadgeHtml).join(" ") : '<span title="No external referrer observed for this image yet" style="display:inline-flex;align-items:center;gap:6px;color:#666;font-size:11px;white-space:nowrap;"><span style="font-size:12px;">\u{1F310}</span><span>Awaiting external referrer</span></span>';
    const rowBadges = Array.isArray(row.badges) ? row.badges : [];
    const uViews = Number(row.unverified_views || 0);
    const otherHits = uViews + Number(row.external_views || 0);
    const otherColor = rowBadges.includes("E") ? "#3b82f6" : "#f59e0b";
    const borderColor = row.badges.includes("C") ? "#a78bfa44" : row.badges.includes("I") ? "#8b5cf644" : row.badges.includes("E") ? "#3b82f644" : "#f59e0b44";
    const thumbHtml = imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 6 ? "eager" : "lazy") + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid ' + p.bdr + ';">' : '<span style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:#333;border-radius:6px;font-size:18px;border:1px solid ' + p.bdr + ';">\u{1F5BC}</span>';
    const deviceHtml = deviceIcons ? '<span class="access-devices" style="flex:0 0 auto;">' + deviceIcons + "</span>" : "";
    return `<a href="${linkUrl}" target="_blank" class="access-row" data-badges="${row.badges.join(",")}" data-primary="${primaryBadge}" data-otherhits="${otherHits}" data-country="${geoCountry || ""}" data-region="${(geo2?.region || "") + ""}" data-city="${(geo2?.city || "") + ""}" data-lastseen="${row.last_seen || ""}" style="display:grid;grid-template-columns:90px 220px 180px 90px auto;gap:10px;align-items:center;padding:8px 8px;border-bottom:1px solid #2a2a2a;border-left:3px solid ${borderColor};text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'"><div style="display:flex;align-items:center;justify-content:center;width:90px;">${thumbHtml}</div><div style="display:flex;flex-direction:column;gap:4px;min-width:0;padding-left:14px;"><div class="access-idline" style="display:flex;align-items:center;gap:6px;min-width:0;"><div style="display:flex;gap:2px;flex:0 0 auto;">${badgeHtml}</div><span class="access-id" style="color:${p.text};font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;" title="${row.image_id}">${row.image_id}</span>${deviceHtml}</div></div><span style="color:${locColor};font-size:13px;opacity:0.82;letter-spacing:0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${locationText}">${locationText}</span><span style="display:flex;justify-content:center;font-weight:bold;color:${otherColor};font-size:14px;">${otherHits || "\u2014"}</span><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${srcHtml}</div></a>`;
  }).join("") || '<p style="color: #555; font-size: 11px;">No image access data yet</p>'}
      </div>
      <p style="font-size: 9px; color: #555; margin-top: 6px;">O = External/Unidentified non-JS art views (U + E)</p>
    </div>
    <!-- Devices -->
    <div class="section" style="max-height: none;">
      <div class="section-header">
        <h3>Devices</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Sessions and engagement by device. Engage Lvl shows how deeply each platform's users interact.</div></span>
      </div>
      <table>
        <tr><th>Platform</th><th>Sessions</th><th>Engage Lvl</th></tr>
        ${safeDeviceEngagement.map((d) => {
    const icons = {
      ios: "\u{1F4F1}",
      android: "\u{1F170}\uFE0F",
      mac: "\u{1F34E}",
      windows: "\u{1FA9F}",
      linux: "\u{1F427}",
      desktop: "\u{1F5A5}\uFE0F",
      mobile: "\u{1F4F1}",
      tablet: "\u{1F4F1}",
      unknown: "\u2753"
    };
    const labels = {
      ios: "iOS",
      android: "Android",
      mac: "Mac",
      windows: "Windows",
      linux: "Linux",
      desktop: "Desktop",
      mobile: "Mobile",
      tablet: "Tablet",
      unknown: "Unknown"
    };
    const engageColor = d.avg_depth >= 15 ? "#10b981" : d.avg_depth >= 8 ? "#f59e0b" : "#888";
    return `<tr><td>${icons[d.device] || "\u2753"} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
  }).join("")}
        ${safeDeviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ""}
      </table>
    </div>
  </div>
  <script>
    var accessLocationSortAsc = true;
    function sortAccessLocation() {
      var list = document.getElementById('accessOverviewList');
      if (!list) return;

      // first child is the sticky header
      var children = Array.prototype.slice.call(list.children);
      if (children.length <= 1) return;
      var header = children[0];
      var rows = children.slice(1).filter(function(el) { return el.classList && el.classList.contains('access-row'); });

      rows.sort(function(a, b) {
        function key(el) {
          var c = (el.dataset.country || '').toUpperCase();
          var r = (el.dataset.region || '').toUpperCase();
          var ci = (el.dataset.city || '').toUpperCase();
          return [c, r, ci].join('||');
        }
        var ka = key(a);
        var kb = key(b);
        if (ka < kb) return accessLocationSortAsc ? -1 : 1;
        if (ka > kb) return accessLocationSortAsc ? 1 : -1;
        return 0;
      });

      // Re-append in new order
      list.innerHTML = '';
      list.appendChild(header);
      rows.forEach(function(r) { list.appendChild(r); });

      accessLocationSortAsc = !accessLocationSortAsc;
      var hdr = document.getElementById('accessLocationHeader');
      if (hdr) hdr.style.opacity = '1';
    }

    function sortAccessTime() {
      var list = document.getElementById('accessOverviewList');
      if (!list) return;

      // first child is the sticky header
      var children = Array.prototype.slice.call(list.children);
      if (children.length <= 1) return;
      var header = children[0];
      var rows = children.slice(1).filter(function(el) { return el.classList && el.classList.contains('access-row'); });

      rows.sort(function(a, b) {
        var ka = a.dataset.lastseen || '';
        var kb = b.dataset.lastseen || '';
        // Newest first
        if (ka < kb) return 1;
        if (ka > kb) return -1;
        return 0;
      });

      // Re-append in new order
      list.innerHTML = '';
      list.appendChild(header);
      rows.forEach(function(r) { list.appendChild(r); });

      var hdr = document.getElementById('accessTimeHeader');
      if (hdr) hdr.style.opacity = '1';
    }
  <\/script>




  <!-- All sections grid -->
  <div class="grid" style="margin-top: 20px;">
    <div class="section" style="order: 5;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <h3 style="margin:0;">Pixel Event Tracking</h3>
          <span class="section-tip"><span class="info-icon" style="cursor:help;">i</span><div class="tooltip">Temporary pixel totals for the selected date window from <code>raw_events</code> where <code>event_type IN ('state_pixel','action_pixel')</code>. Useful while pixel trackers are being rolled into Event Breakdown.</div></span>
        </div>
      </div>
      <div style="padding-right: 6px;">
        <div class="bar-row" data-label="Zoom (total)" data-count="${spZoomV1Hits}">
          <span class="bar-label" title="Zoom (total)">Zoom (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spZoomV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);"></div>
          </div>
          <span class="bar-value">${spZoomV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Chapter Views (total)" data-count="${spSisterV1Hits}">
          <span class="bar-label" title="Chapter Views (total)">Chapter Views (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spSisterV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);"></div>
          </div>
          <span class="bar-value">${spSisterV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Grid Open (total)" data-count="${spGridOpenV1Hits}">
          <span class="bar-label" title="Grid Open (total)">Grid Open (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGridOpenV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);"></div>
          </div>
          <span class="bar-value">${spGridOpenV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Theme Grid Open (total)" data-count="${spThemeGridOpenV1Hits}">
          <span class="bar-label" title="Theme Grid Open (total)">Theme Grid Open (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spThemeGridOpenV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);"></div>
          </div>
          <span class="bar-value">${spThemeGridOpenV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Grid Image Click (total)" data-count="${spGridImageClickV1Hits}">
          <span class="bar-label" title="Grid Image Click (total)">Grid Image Click (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGridImageClickV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);"></div>
          </div>
          <span class="bar-value">${spGridImageClickV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Theme Grid Image Click (total)" data-count="${spThemeGridImageClickV1Hits}">
          <span class="bar-label" title="Theme Grid Image Click (total)">Theme Grid Image Click (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spThemeGridImageClickV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);"></div>
          </div>
          <span class="bar-value">${spThemeGridImageClickV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Grid Show More (total)" data-count="${spGridShowMoreV1Hits}">
          <span class="bar-label" title="Grid Show More (total)">Grid Show More (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGridShowMoreV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);"></div>
          </div>
          <span class="bar-value">${spGridShowMoreV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Grid Show Previous (total)" data-count="${spGridShowPreviousV1Hits}">
          <span class="bar-label" title="Grid Show Previous (total)">Grid Show Previous (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGridShowPreviousV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #d97706 0%, #92400e 100%);"></div>
          </div>
          <span class="bar-value">${spGridShowPreviousV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Complete List Open (total)" data-count="${spBrowseAllOpenV1Hits}">
          <span class="bar-label" title="Complete List Open (total)">Complete List Open (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spBrowseAllOpenV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #f59e0b 0%, #92400e 100%);"></div>
          </div>
          <span class="bar-value">${spBrowseAllOpenV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Complete List Image Click (total)" data-count="${spBrowseAllImageClickV1Hits}">
          <span class="bar-label" title="Complete List Image Click (total)">Complete List Image Click (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spBrowseAllImageClickV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #ec4899 0%, #9d174d 100%);"></div>
          </div>
          <span class="bar-value">${spBrowseAllImageClickV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Gallery Preview Click (total)" data-count="${spGalleryPreviewClickV1Hits}">
          <span class="bar-label" title="Gallery Preview Click (total)">Gallery Preview Click (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGalleryPreviewClickV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #38bdf8 0%, #0369a1 100%);"></div>
          </div>
          <span class="bar-value">${spGalleryPreviewClickV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Gallery Hero Click (total)" data-count="${spGalleryHeroClickV1Hits}">
          <span class="bar-label" title="Gallery Hero Click (total)">Gallery Hero Click (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGalleryHeroClickV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #22c55e 0%, #166534 100%);"></div>
          </div>
          <span class="bar-value">${spGalleryHeroClickV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Explore Gallery Click (total)" data-count="${spGalleryExploreClickV1Hits}">
          <span class="bar-label" title="Explore Gallery Click (total)">Explore Gallery Click (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGalleryExploreClickV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #10b981 0%, #065f46 100%);"></div>
          </div>
          <span class="bar-value">${spGalleryExploreClickV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Gallery Landing View (total)" data-count="${spGalleryLandingViewV1Hits}">
          <span class="bar-label" title="Gallery Landing View (total)">Gallery Landing View (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGalleryLandingViewV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #22c55e 0%, #166534 100%);"></div>
          </div>
          <span class="bar-value">${spGalleryLandingViewV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Exit to Gallery (total)" data-count="${spExitToGalleryV1Hits}">
          <span class="bar-label" title="Exit to Gallery (total)">Exit to Gallery (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spExitToGalleryV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);"></div>
          </div>
          <span class="bar-value">${spExitToGalleryV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Scroll 25% (total)" data-count="${spScroll25V1Hits}">
          <span class="bar-label" title="Scroll 25% (total)">Scroll 25% (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spScroll25V1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%);"></div>
          </div>
          <span class="bar-value">${spScroll25V1Hits}</span>
        </div>
        <div class="bar-row" data-label="Scroll 50% (total)" data-count="${spScroll50V1Hits}">
          <span class="bar-label" title="Scroll 50% (total)">Scroll 50% (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spScroll50V1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%);"></div>
          </div>
          <span class="bar-value">${spScroll50V1Hits}</span>
        </div>
        <div class="bar-row" data-label="Scroll 75% (total)" data-count="${spScroll75V1Hits}">
          <span class="bar-label" title="Scroll 75% (total)">Scroll 75% (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spScroll75V1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);"></div>
          </div>
          <span class="bar-value">${spScroll75V1Hits}</span>
        </div>
        <div class="bar-row" data-label="Scroll 100% (total)" data-count="${spScroll100V1Hits}">
          <span class="bar-label" title="Scroll 100% (total)">Scroll 100% (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spScroll100V1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #6d28d9 0%, #3b0764 100%);"></div>
          </div>
          <span class="bar-value">${spScroll100V1Hits}</span>
        </div>
        <div class="bar-row" data-label="Cowboy Jump (total)" data-count="${spCowboyJumpV1Hits}">
          <span class="bar-label" title="Cowboy Jump (total)">Cowboy Jump (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spCowboyJumpV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);"></div>
          </div>
          <span class="bar-value">${spCowboyJumpV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Buy Button (total)" data-count="${spOrderClickedV1Hits}">
          <span class="bar-label" title="Buy Button (total)">Buy Button (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spOrderClickedV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #f97316 0%, #c2410c 100%);"></div>
          </div>
          <span class="bar-value">${spOrderClickedV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Series Info (total)" data-count="${spSeriesInfoV1Hits}">
          <span class="bar-label" title="Series Info (total)">Series Info (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spSeriesInfoV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);"></div>
          </div>
          <span class="bar-value">${spSeriesInfoV1Hits}</span>
        </div>
        <div class="bar-row" data-label="More About Image (total)" data-count="${spMoreInfoOpenV1Hits}">
          <span class="bar-label" title="More About Image (total)">More About Image (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spMoreInfoOpenV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);"></div>
          </div>
          <span class="bar-value">${spMoreInfoOpenV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Explore More Photos (total)" data-count="${spSisterImageClickV1Hits}">
          <span class="bar-label" title="Explore More Photos (total)">Explore More Photos (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spSisterImageClickV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #10b981 0%, #047857 100%);"></div>
          </div>
          <span class="bar-value">${spSisterImageClickV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Slideshow Start (total)" data-count="${spSlideshowStartV1Hits}">
          <span class="bar-label" title="Slideshow Start (total)">Slideshow Start (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spSlideshowStartV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #eab308 0%, #a16207 100%);"></div>
          </div>
          <span class="bar-value">${spSlideshowStartV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Chapter Nav Prev (total)" data-count="${spChapterNavPrevV1Hits}">
          <span class="bar-label" title="Chapter Nav Prev (total)">Chapter Nav Prev (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spChapterNavPrevV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #22d3ee 0%, #155e75 100%);"></div>
          </div>
          <span class="bar-value">${spChapterNavPrevV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Chapter Nav Next (total)" data-count="${spChapterNavNextV1Hits}">
          <span class="bar-label" title="Chapter Nav Next (total)">Chapter Nav Next (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spChapterNavNextV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #2dd4bf 0%, #115e59 100%);"></div>
          </div>
          <span class="bar-value">${spChapterNavNextV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Slideshow Prev (total)" data-count="${spSlideshowNavPrevV1Hits}">
          <span class="bar-label" title="Slideshow Prev (total)">Slideshow Prev (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spSlideshowNavPrevV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #38bdf8 0%, #0c4a6e 100%);"></div>
          </div>
          <span class="bar-value">${spSlideshowNavPrevV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Slideshow Next (total)" data-count="${spSlideshowNavNextV1Hits}">
          <span class="bar-label" title="Slideshow Next (total)">Slideshow Next (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spSlideshowNavNextV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #34d399 0%, #065f46 100%);"></div>
          </div>
          <span class="bar-value">${spSlideshowNavNextV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Collector Notes (total)" data-count="${spCollectorNotesV1Hits}">
          <span class="bar-label" title="Collector Notes (total)">Collector Notes (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spCollectorNotesV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #64748b 0%, #475569 100%);"></div>
          </div>
          <span class="bar-value">${spCollectorNotesV1Hits}</span>
        </div>
        <div class="bar-row" data-label="Guide Buttons (total)" data-count="${spGuideButtonsV1Hits}">
          <span class="bar-label" title="Guide Buttons (total)">Guide Buttons (total)</span>
          <div class="bar-container">
            <div class="bar" style="width: ${spPixelEventMax > 0 ? (spGuideButtonsV1Hits / spPixelEventMax * 100).toFixed(1) : "0.0"}%; background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);"></div>
          </div>
          <span class="bar-value">${spGuideButtonsV1Hits}</span>
        </div>
      </div>
    </div>

    <!-- Site Geography -->
    <div class="section k4-split-panel" style="order: 3;">
      <div class="section-header">
        <h3>\u{1F5FA}\uFE0F Site Geography</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Geography for non-gallery, non-image page browsing (excludes gallery landing pages and <code>/i-...</code> image pages), grouped by location.</div></span>
      </div>
      ${(() => {
    const countryColors = {
      US: "#3b82f6",
      FR: "#ef4444",
      DE: "#f97316",
      BR: "#22c55e",
      GB: "#6366f1",
      CA: "#ec4899",
      AU: "#eab308",
      MX: "#14b8a6",
      IN: "#f59e0b",
      JP: "#e11d48",
      IT: "#84cc16",
      ES: "#a855f7",
      NL: "#fb923c",
      AT: "#dc2626",
      HU: "#c026d3",
      SG: "#0ea5e9",
      HK: "#d946ef",
      CN: "#b91c1c",
      KR: "#2563eb",
      CO: "#fbbf24",
      PL: "#f43f5e",
      SE: "#06b6d4",
      NO: "#0284c7",
      FI: "#0369a1",
      CH: "#dc2626",
      RU: "#1d4ed8",
      UA: "#fcd34d",
      AR: "#60a5fa",
      ZA: "#a78bfa",
      NZ: "#2dd4bf",
      PT: "#e879f9",
      CG: "#f472b6",
      CL: "#38bdf8",
      PE: "#fbbf24",
      IE: "#4ade80",
      BE: "#facc15",
      CZ: "#7dd3fc",
      DK: "#ef4444",
      GR: "#0ea5e9",
      IL: "#6366f1",
      TW: "#d946ef",
      TH: "#f97316",
      PH: "#8b5cf6",
      TR: "#dc2626",
      RO: "#fde047"
    };
    function countryColor(code) {
      if (countryColors[code]) return countryColors[code];
      if (!code) return "#9ca3af";
      let h = 0;
      for (let i = 0; i < code.length; i++) h = code.charCodeAt(i) * 31 + h;
      const hue = Math.abs(h) % 360;
      return "hsl(" + hue + ", 70%, 55%)";
    }
    __name(countryColor, "countryColor");
    __name2(countryColor, "countryColor");
    function renderGeoRows(items, maxCount, colorFn) {
      const buildInspectUrl = /* @__PURE__ */ __name2((g) => {
        const params = new URLSearchParams();
        if (g.country) params.set("country", g.country);
        if (g.region) params.set("region", g.region);
        if (g.city) params.set("city", g.city);
        if (days) params.set("days", String(days));
        if (yesterday) params.set("yesterday", "1");
        if (selectedDate) params.set("date", selectedDate);
        if (hideBots) params.set("hideBots", "1");
        if (hideChardon) params.set("hideChardon", "1");
        if (excludeIp) params.set("excludeIp", excludeIp);
        return "/__k4stats/inspect?" + params.toString();
      }, "buildInspectUrl");
      return items.map((g) => {
        const barColor = colorFn(g.country);
        const href = buildInspectUrl(g);
        return '<div class="bar-row"><a class="bar-label" href="' + href + '" title="Inspect ' + g.label + '" style="color:#ccc; text-decoration:none;">' + g.label + '</a><div class="bar-container"><div class="bar" style="width: ' + (g.count / maxCount * 100).toFixed(1) + "%; background: " + barColor + ';"></div></div><span class="bar-value">' + g.count + "</span></div>";
      }).join("");
    }
    __name(renderGeoRows, "renderGeoRows");
    __name2(renderGeoRows, "renderGeoRows");
    const siteGeo = (geo || []).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
      city: g.city,
      region: g.region,
      country: g.country,
      visitors: g.visitors
    }));
    const mergedGeo = {};
    siteGeo.forEach((g) => {
      if (!mergedGeo[g.label]) mergedGeo[g.label] = { ...g };
      else mergedGeo[g.label].visitors += g.visitors;
    });
    const siteRows = Object.values(mergedGeo).map((g) => ({ ...g, count: g.visitors })).filter((g) => g.count > 0).sort((a, b) => b.count - a.count);
    const siteMax = Math.max(...siteRows.map((g) => g.count), 1);
    if (siteRows.length > 0) {
      return '<div class="k4-split-scroll">' + renderGeoRows(siteRows, siteMax, countryColor) + "</div>";
    }
    return '<p style="color:#666;">No site visitor data yet</p>';
  })()}
    </div>

    <!-- Image Geography (JS) -->
    <div class="section k4-split-panel" style="order: 4;">
      <div class="section-header">
        <h3>\u{1F3A8} Image Geography (JS)</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Unique JS visitors with image P-pixel activity (state/action pixels on valid i-* targets).</div></span>
      </div>
      ${(() => {
    const countryColors = {
      US: "#a78bfa",
      FR: "#ef4444",
      DE: "#f97316",
      BR: "#22c55e",
      GB: "#6366f1",
      CA: "#ec4899",
      AU: "#eab308",
      MX: "#14b8a6",
      IN: "#f59e0b",
      JP: "#e11d48",
      IT: "#84cc16",
      ES: "#a855f7",
      NL: "#fb923c",
      AT: "#dc2626",
      HU: "#c026d3",
      SG: "#0ea5e9",
      HK: "#d946ef",
      CN: "#b91c1c",
      KR: "#2563eb",
      CO: "#fbbf24",
      PL: "#f43f5e",
      SE: "#06b6d4",
      NO: "#0284c7",
      FI: "#0369a1",
      CH: "#dc2626",
      RU: "#1d4ed8",
      UA: "#fcd34d",
      AR: "#60a5fa",
      ZA: "#a78bfa",
      NZ: "#2dd4bf",
      PT: "#e879f9",
      CG: "#f472b6",
      CL: "#38bdf8",
      PE: "#fbbf24",
      IE: "#4ade80",
      BE: "#facc15",
      CZ: "#7dd3fc",
      DK: "#ef4444",
      GR: "#0ea5e9",
      IL: "#6366f1",
      TW: "#d946ef",
      TH: "#f97316",
      PH: "#8b5cf6",
      TR: "#dc2626",
      RO: "#fde047"
    };
    function countryColor(code) {
      if (countryColors[code]) return countryColors[code];
      if (!code) return "#9ca3af";
      let h = 0;
      for (let i = 0; i < code.length; i++) h = code.charCodeAt(i) * 31 + h;
      const hue = Math.abs(h) % 360;
      return "hsl(" + hue + ", 70%, 55%)";
    }
    __name(countryColor, "countryColor");
    __name2(countryColor, "countryColor");
    function renderGeoRows(items, maxCount, colorFn) {
      const buildInspectUrl = /* @__PURE__ */ __name2((g) => {
        const params = new URLSearchParams();
        if (g.country) params.set("country", g.country);
        if (g.region) params.set("region", g.region);
        if (g.city) params.set("city", g.city);
        if (days) params.set("days", String(days));
        if (yesterday) params.set("yesterday", "1");
        if (selectedDate) params.set("date", selectedDate);
        if (hideBots) params.set("hideBots", "1");
        if (hideChardon) params.set("hideChardon", "1");
        if (excludeIp) params.set("excludeIp", excludeIp);
        return "/__k4stats/inspect?" + params.toString();
      }, "buildInspectUrl");
      return items.map((g) => {
        const barColor = colorFn(g.country);
        const href = buildInspectUrl(g);
        return '<div class="bar-row"><a class="bar-label" href="' + href + '" title="Inspect ' + g.label + '" style="color:#ccc; text-decoration:none;">' + g.label + '</a><div class="bar-container"><div class="bar" style="width: ' + (g.count / maxCount * 100).toFixed(1) + "%; background: " + barColor + ';"></div></div><span class="bar-value">' + g.count + "</span></div>";
      }).join("");
    }
    __name(renderGeoRows, "renderGeoRows");
    __name2(renderGeoRows, "renderGeoRows");
    const artGeo = (geo || []).filter((g) => g.art_viewers > 0).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
      city: g.city,
      region: g.region,
      country: g.country,
      art_viewers: g.art_viewers || 0
    }));
    const mergedGeo = {};
    artGeo.forEach((g) => {
      if (!mergedGeo[g.label]) mergedGeo[g.label] = { ...g };
      else mergedGeo[g.label].art_viewers += g.art_viewers;
    });
    const artRows = Object.values(mergedGeo).map((g) => ({ ...g, count: g.art_viewers })).sort((a, b) => b.count - a.count);
    const artMax = Math.max(...artRows.map((g) => g.count), 1);
    if (artRows.length > 0) {
      return '<div class="k4-split-scroll">' + renderGeoRows(artRows, artMax, countryColor) + "</div>";
    }
    return '<p style="color:#666;">No art viewer data yet</p>';
  })()}
    </div>

    <!-- External Reach (moved to Art Views row) -->
    <div class="section k4-split-panel" style="display:none;">
      <div class="section-header">
        <h3>\u{1F310} External Reach</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Non-JS traffic: bots, bounces, blocked JS. Separate population from verified visitors.</div></span>
      </div>
      ${(() => {
    function renderGeoRows(items, maxCount) {
      return items.map((g) => {
        return '<div class="bar-row"><span class="bar-label" title="' + g.label + '">' + g.label + '</span><div class="bar-container"><div class="bar" style="width: ' + (g.count / maxCount * 100).toFixed(1) + '%; background: #f59e0b;"></div></div><span class="bar-value">' + g.count + "</span></div>";
      }).join("");
    }
    __name(renderGeoRows, "renderGeoRows");
    __name2(renderGeoRows, "renderGeoRows");
    const extGeo = (externalReachGeo || []).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
      country: g.country,
      count: g.hits
    }));
    const extMax = Math.max(...extGeo.map((g) => g.count), 1);
    let html = "";
    if (extGeo.length > 0) {
      html += '<div class="k4-split-scroll" style="margin-bottom: 12px;">' + renderGeoRows(extGeo, extMax) + "</div>";
    } else {
      html += '<p style="color:#666; margin-bottom: 12px;">No external data yet</p>';
    }
    if ((externalReachSources || []).length > 0) {
      html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #f59e0b;">\u{1F4E1} Sources</div>';
      const srcIcons = {
        "Google Search": "\u{1F50D}",
        "Google Images": "\u{1F5BC}\uFE0F",
        Bing: "\u{1F171}\uFE0F",
        "Twitter/X": "\u{1F426}",
        Facebook: "\u{1F4D8}",
        Pinterest: "\u{1F4CC}",
        DuckDuckGo: "\u{1F986}",
        ChatGPT: "\u{1F9E0}",
        "Open Graph": "\u{1F578}\uFE0F",
        "Structured Data": "\u{1F9FE}",
        Yandex: "\u{1F50D}",
        Baidu: "\u{1F50D}",
        Direct: "\u{1F517}",
        Internal: "\u{1F3E0}",
        Other: "\u{1F310}",
        Unknown: "\u2753"
      };
      html += '<div style="display: flex; flex-direction: column; gap: 3px;">';
      for (const s2 of externalReachSources.slice(0, 6)) {
        const label = String(s2.source || "Unknown");
        const base = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
        const icon = srcIcons[label] || srcIcons[base] || "\u{1F310}";
        html += '<div style="display: flex; align-items: center; gap: 6px; padding: 3px 6px; background: #1a1a1a; border-radius: 4px;"><span style="font-size: 14px;">' + icon + '</span><span style="color: #ccc; font-size: 11px; flex: 1;" title="' + label + '">' + label + '</span><span style="color: #f59e0b; font-size: 11px; font-weight: bold;">' + s2.hits + "</span></div>";
      }
      html += "</div>";
    }
    return html;
  })()}
    </div>

    <div class="section" style="order: 7; max-height: none;">
      <div class="section-header" style="justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 style="margin:0;">🌐 External Reach (Daily)</h3>
          <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">External Reach (Daily) shows U/E non-JS traffic for a single selected date.</div></span>
        </div>
        ${isSingleDay ? `<a href="${refreshUEUrl}" class="mini-btn" style="text-decoration:none;">↻ Refresh</a>` : ``}
      </div>
      <div style="min-width:0;">
          ${isSingleDay ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <div style="background:#1f1f1f;border:1px solid #333;border-radius:6px;padding:8px;">
              <div style="font-size:10px;color:#9aa3ad;">${extSummary.todayLabel}</div>
              <div style="font-size:18px;font-weight:800;color:#f59e0b;">${Number(extSummary?.today?.total || 0)}</div>
              <div style="font-size:11px;color:#cbd5e1;">U ${Number(extSummary?.today?.u || 0)} · E ${Number(extSummary?.today?.e || 0)}</div>
            </div>
            <div style="background:#1f1f1f;border:1px solid #333;border-radius:6px;padding:8px;">
              <div style="font-size:10px;color:#9aa3ad;">${extSummary.yesterdayLabel}</div>
              <div style="font-size:18px;font-weight:800;color:#93c5fd;">${Number(extSummary?.yesterday?.total || 0)}</div>
              <div style="font-size:11px;color:#cbd5e1;">U ${Number(extSummary?.yesterday?.u || 0)} · E ${Number(extSummary?.yesterday?.e || 0)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="font-size:11px;color:#9aa3ad;">Delta:</span>
            <span style="font-size:12px;font-weight:700;color:${Number(extSummary?.delta || 0) >= 0 ? "#f59e0b" : "#93c5fd"};">${Number(extSummary?.delta || 0) >= 0 ? "+" : ""}${Number(extSummary?.delta || 0)} (${Number(extSummary?.pct || 0)}%)</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${(Array.isArray(extSummary?.topSources) && extSummary.topSources.length > 0 ? extSummary.topSources : (externalReachSources || []).slice(0, 4)).map((s2) => '<div style="display:flex;align-items:center;justify-content:space-between;background:#1a1a1a;border-radius:4px;padding:4px 6px;"><span style="color:#ccc;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+String(s2?.source || "Unknown")+'</span><span style="color:#f59e0b;font-size:11px;font-weight:700;">'+Number(s2?.hits || 0)+'</span></div>').join("") || '<div style="color:#666;font-size:11px;">No external source data yet</div>'}
          </div>
          <div style="margin-top:8px;font-size:10px;color:#666;">Generated ${String(extSummary?.generatedAt || "").replace("T", " ").slice(0, 19)}Z</div>
          ` : `
          <div style="color:#666;font-size:12px;opacity:0.8;">Select a single date to view daily external reach.</div>
          `}

          <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
            <div style="font-size:11px;color:#9aa3ad;margin:0 0 6px 0;font-weight:600;">Devices</div>
            <table>
              <tr><th>Platform</th><th>Sessions</th><th>Engage</th></tr>
              ${safeDeviceEngagement.map((d) => {
    const icons = {
      ios: "\u{1F4F1}",
      android: "\u{1F170}\uFE0F",
      mac: "\u{1F34E}",
      windows: "\u{1FA9F}",
      linux: "\u{1F427}",
      desktop: "\u{1F5A5}\uFE0F",
      mobile: "\u{1F4F1}",
      tablet: "\u{1F4F1}",
      unknown: "\u2753"
    };
    const labels = {
      ios: "iOS",
      android: "Android",
      mac: "Mac",
      windows: "Windows",
      linux: "Linux",
      desktop: "Desktop",
      mobile: "Mobile",
      tablet: "Tablet",
      unknown: "Unknown"
    };
    const engageColor = d.avg_depth >= 15 ? "#10b981" : d.avg_depth >= 8 ? "#f59e0b" : "#888";
    return `<tr><td>${icons[d.device] || "\u2753"} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
  }).join("")}
              ${safeDeviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ""}
            </table>
          </div>
      </div>
    </div>

    <div class="section" style="order: 6;">
      <div class="section-header" style="margin-bottom: ${edgeEvents.length === 0 && edgeSummary.length === 0 ? "0" : "12px"};">
        <h3 style="display: inline;">\u{1F9ED} Index Health</h3>
        ${edgeEvents.length === 0 && edgeSummary.length === 0 ? '<span style="color:#666; margin-left: 12px;">No edge events yet</span>' : ""}
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Edge events: 301 redirects (canonical fixes), 410 Gone (removed content), 404 fallbacks. Healthy sites show these tapering over time.</div></span>
        ${edgeEvents.length > 0 ? '<button class="mini-btn" type="button" onclick="k4OpenEdgeEventList()" title="Open full edge-event list in a new window (no truncation)">Full list</button>' : ""}
      </div>
      ${edgeSummary.length > 0 ? `
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        ${edgeSummary.map((s2) => {
    const typeColors = {
      smart404_redirect: "#10b981",
      smart404_gone: "#f59e0b",
      smart404_fallback: "#ef4444",
      smart404_homepage: "#a855f7",
      301: "#10b981",
      302: "#10b981",
      410: "#f59e0b",
      404: "#ef4444"
    };
    const typeLabels = {
      smart404_redirect: "301",
      smart404_gone: "410",
      smart404_fallback: "404",
      smart404_homepage: "Home",
      301: "301",
      302: "302",
      410: "410",
      404: "404"
    };
    const color = typeColors[s2.event_type] || "#888";
    const label = typeLabels[s2.event_type] || s2.event_type;
    return `<span style="background: ${color}22; color: ${color}; padding: 4px 10px; border-radius: 12px; font-size: 11px;">${label}: ${s2.total} <span style="opacity:0.7">(\u{1F916}${s2.bot_hits} \u{1F464}${s2.human_hits})</span></span>`;
  }).join("")}
      </div>
      ` : ""}
      ${edgeEvents.length > 0 ? `
      <div>
        ${edgeEvents.map((e) => {
    const eventColors = {
      smart404_redirect: "#10b981",
      smart404_gone: "#f59e0b",
      smart404_fallback: "#ef4444",
      smart404_homepage: "#a855f7",
      301: "#10b981",
      302: "#10b981",
      410: "#f59e0b",
      404: "#ef4444"
    };
    const eventLabels2 = {
      smart404_redirect: "301",
      smart404_gone: "410",
      smart404_fallback: "404",
      smart404_homepage: "Home",
      301: "301",
      302: "302",
      410: "410",
      404: "404"
    };
    const color = eventColors[e.event_type] || "#888";
    const label = eventLabels2[e.event_type] || e.event_type;
    const shortPath = e.path && e.path.length > 40 ? "..." + e.path.slice(-37) : e.path || "unknown";
    const botIcon = e.is_bot ? "\u{1F916}" : "\u{1F464}";
    return `
          <div class="edge-row" data-hits="${e.hits || 0}" data-bot="${e.is_bot ? 1 : 0}" data-type="${label}" data-path="${e.path || ""}" style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #333; gap: 8px;">
            <span style="background: ${color}22; color: ${color}; padding: 2px 8px; border-radius: 8px; font-size: 10px; flex-shrink: 0;">${label}</span>
            <span style="flex: 1; color: #ccc; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.path || ""}">${shortPath}</span>
            <span style="font-size: 11px;">${botIcon}</span>
            <span style="color: #888; font-size: 12px; font-weight: bold;">${e.hits}</span>
          </div>
        `;
  }).join("")}
      </div>
      ` : ""}
    </div>

    <div class="section" style="order: 1;">
      <div class="section-header">
        <h3>Top 25 Site Pages</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Top overall linkable pages from page-bearing events. Colors: blue=site, green=images, yellow=gallery landing.</div></span>
      </div>
      ${pages.length === 0 ? '<p style="color:#666">No data yet</p>' : (() => {
    const galleryPaths = new Set(GALLERY_LANDING_PATHS);
    const maxViews = Math.max(...pages.map((p) => p.views || 0), 1);
    const rowsHtml = pages.map((p, i) => {
      const path = String(p.page_path || "/");
      const isChapter = /\/i-[A-Za-z0-9]+$/.test(path);
      const isGallery = galleryPaths.has(path);
      const color = isChapter ? "#84cc16" : isGallery ? "#eab308" : "#4a9eff";
      const shortPath = path.length > 32 ? "..." + path.slice(-29) : path;
      const count = p.views || 0;
      return `
          <div class="bar-row">
            <a class="bar-label" href="https://www.k4studios.com${path}" target="_blank" title="${path}" style="color: ${color}; text-decoration: none;">${shortPath}</a>
            <div class="bar-container">
              <div class="bar" style="width: ${(count / maxViews * 100).toFixed(1)}%; background: ${color};"></div>
            </div>
            <span class="bar-value">${count}</span>
          </div>`;
    }).join("");
    return `<div style="max-height: 320px; overflow: auto; padding-right: 4px;">${rowsHtml}</div>`;
  })()}
    </div>

    <div class="section" style="order: 2;">
      <div class="section-header">
        <h3>Top 25 Entry Pages (Sessions)</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">First page hit in a session, grouped by page + referrer source. Includes site pages, gallery landing pages, and chapter/image pages.</div></span>
      </div>
      ${entryPages.length === 0 ? '<p style="color:#666">No data yet</p>' : `
      <div style="max-height: 320px; overflow: auto; padding-right: 4px;">
        <table>
          <tr><th>Page</th><th>From</th><th>Sess</th></tr>
          ${entryPages.slice(0, 25).map((p) => {
    const rawPath = String(p.page_path || "/");
    const fullPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    const isChapter = /\/i-[A-Za-z0-9]+$/.test(fullPath);
    const isGalleryLanding = !isChapter && GALLERY_LANDING_PATHS.includes(fullPath);
    const typeColor = isChapter ? "#84cc16" : isGalleryLanding ? "#eab308" : "#4a9eff";
    const shortPath = (() => {
      const path = fullPath;
      const maxLen = 34;
      if (path.length <= maxLen) return path;
      const startLen = 14;
      const endLen = Math.max(8, maxLen - startLen - 3);
      return path.slice(0, startLen) + "..." + path.slice(-endLen);
    })();
    const pageIcon = isChapter ? "\u{1F5BC}\uFE0F" : isGalleryLanding ? "\u{1F4C1}" : "\u{1F4C4}";
    const refIcons = {
      google_search: "\u{1F50D}",
      google_images: "\u{1F5BC}\uFE0F",
      bing_search: "\u{1F171}\uFE0F",
      bing_images: "\u{1F5BC}\uFE0F",
      pinterest: "\u{1F4CC}",
      twitter: "\u{1F426}",
      facebook: "\u{1F4D8}",
      instagram: "\u{1F4F7}",
      linkedin: "\u{1F4BC}",
      duckduckgo: "\u{1F986}",
      direct: "\u{1F517}",
      internal: "\u{1F504}",
      unattributed: "\u{1F512}"
    };
    const refIcon = refIcons[p.ref_source] || "\u{1F512}";
    return `<tr><td title="${fullPath}" style="color:${typeColor};">${pageIcon} ${shortPath}</td><td title="${p.ref_source}">${refIcon}</td><td>${p.sessions}</td></tr>`;
  }).join("")}
        </table>
      </div>
      `}
    </div>

    <div class="section" style="order: 8;">
      <div class="section-header">
        <h3>\u{1F6AA} Where People Leave + Themes</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Exit pages: where sessions ended. Shows which page types are natural endpoints vs potential problems.</div></span>
      </div>
      <div class="exit-grid">
        <div class="exit-block" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">
          <span class="value">\u{1F3E0} ${exitByCategory.home || 0}</span>
          <span class="label" style="color: #c7d2fe;">Home</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <span class="value">\u{1F4C1} ${exitByCategory.gallery || 0}</span>
          <span class="label" style="color: #a7f3d0;">Gallery</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%);">
          <span class="value">\u{1F4D6} ${exitByCategory.images || 0}</span>
          <span class="label" style="color: #bfdbfe;">Images</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);">
          <span class="value">\u{1F4C4} ${exitByCategory.landing || 0}</span>
          <span class="label" style="color: #ddd6fe;">Landing</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <span class="value">\u{1F3E0} ${exitByCategory.blog || 0}</span>
          <span class="label" style="color: #fef3c7;">Blog</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
          <span class="value">\u{1F4F8} ${exitByCategory.photoshoots || 0}</span>
          <span class="label" style="color: #fbcfe8;">Shoots</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); grid-column: span 2;">
          <span class="value">\u{1F4E6} ${exitByCategory.other || 0}</span>
          <span class="label" style="color: #d1d5db;">Other</span>
        </div>
      </div>

      <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
        <div style="font-size:11px;color:#9aa3ad;margin:0 0 6px 0;font-weight:600;">\u{1F3A8} Top 10 Themes Clicked</div>
        ${themesClicked.length === 0 ? '<p style="color:#666">No theme clicks yet</p>' : `
        <div style="max-height: 210px; overflow: auto; padding-right: 4px;">
          <table>
            <tr><th>Theme</th><th>Sessions</th><th>Clicks</th></tr>
            ${themesClicked.map(
  (t) => `
              <tr>
                <td>${formatEventName(t.theme || "Unknown")}</td>
                <td>${t.sessions}</td>
                <td>${t.clicks}</td>
              </tr>
            `
).join("")}
          </table>
        </div>
        `}
      </div>

      
    </div>

  </div>

  <!-- Bot Intelligence Section -->
  <div style="max-width: 1780px; margin: 0 auto;">
  <h2 style="margin-top: 30px;">\u{1F6E1}\uFE0F Bot Intelligence <span style="font-size: 12px; color: #888; font-weight: normal;">(Threat Classification)</span></h2>
  <div style="display:flex; align-items:center; justify-content:space-between; gap: 12px; flex-wrap: wrap; color: #888; margin: -10px 0 12px 0; font-size: 12px;">
    <div>
      Risk accumulates over time. \u{1F7E0} Level 3 = observe. \u{1F7E3} Level 4 = friction-managed extraction. \u{1F7E4} Level 5 = block recommended (\u226510 429s/day OR sustained high-rate pulls).
    </div>
    <div style="display:flex; align-items:center; gap: 10px; margin-left: auto;">
      <div style="color:#666; font-size: 11px; padding: 4px 8px; border: 1px solid #333; border-radius: 999px; background: #1f1f1f; white-space: nowrap;">
        Protected (selected period): \u{1F9CA} ${artViewsSummary?.harvester_friction_events || 0} slowed \xB7 \u23F3 ${artViewsSummary?.harvester_friction_delay_events || 0} delayed \xB7 \u26D4 ${artViewsSummary?.harvester_friction_429_events || 0} 429
      </div>
      <button onclick="blockAllLevel5()" style="background:#92400e; color:#fde68a; border:1px solid #b45309; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:11px; white-space: nowrap;">\u{1F7E4} Block All Level 5</button>
      <button onclick="refreshBotIntelligence()" style="background: #333; color: #888; border: 1px solid #555; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap;">\u{1F504} Refresh</button>
    </div>
  </div>
  
  <!-- Risk Summary Pills -->
  <div class="pulse" style="margin-bottom: 15px;">
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">\u{1F7E2} ${botIntelligence?.stats?.verified_bots ?? (botIntelligence?.verified?.length || 0)}</span>
      <span class="label" style="color: #a7f3d0;">Verified Bots <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Confirmed search engine bots (Googlebot, Bingbot, etc). Good traffic - they index your art for image search!</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);">
      <span class="value" style="color: #1f2937;">\u{1F7E1} ${Math.max(0, (botIntelligence?.stats?.total ?? 0) - (botIntelligence?.stats?.risk3 ?? 0) - (botIntelligence?.stats?.risk4 ?? 0))}</span>
      <span class="label" style="color: #422006;">Watching <span class="info-icon" style="background: rgba(0,0,0,0.15); color: #422006;">i</span></span>
      <div class="tooltip"><strong>Risk score 2-4.</strong> Slightly suspicious behavior but not aggressive. Could be a curious human or a polite bot. Monitoring only.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
      <span class="value" style="color: #fff;">\u{1F7E0} ${botIntelligence?.stats?.risk3 || 0}</span>
      <span class="label" style="color: #fed7aa;">High Risk <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fed7aa;">i</span></span>
      <div class="tooltip"><strong>Risk score 5-7.</strong> High-confidence scraper. Monitoring only \u2014 no automatic enforcement. Review and manually block if needed. Triggers: no referrer + high volume, no branching, datacenter IP, multi-day presence.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);">
      <span class="value" style="color: #fff;">\u{1F7E3} ${(() => {
    const suspects = (botIntelligence?.suspects || []).filter(
      (s2) => s2 && s2.status !== "blocked"
    );
    const blockRecommendedCount = suspects.filter(
      isLevel5BlockRecommended
    ).length;
    const frictionManagedCount = suspects.filter((s2) => (s2.risk_level || 0) >= 4).length - blockRecommendedCount;
    return suspects.length > 0 ? Math.max(0, frictionManagedCount) : Math.max(
      0,
      (botIntelligence?.stats?.risk4 || 0) - blockRecommendedCount
    );
  })()}</span>
      <span class="label" style="color: #f5d0fe;">Friction-Managed <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #f5d0fe;">i</span></span>
      <div class="tooltip"><strong>Friction-managed IPs (cumulative, Level 4).</strong> Total count of unique IPs classified as automated extractors over time. These clients are automatically slowed (650-1600ms delay) or rate-limited (429 at \u226540 unique images/min) by the image proxy. See <em>Protected (selected period)</em> for recent friction event volume.</div>
    </div>
    ${(() => {
    const suspects = (botIntelligence?.suspects || []).filter(
      (s2) => s2 && s2.status !== "blocked"
    );
    const count = suspects.filter(isLevel5BlockRecommended).length;
    return `<div class="pulse-stat" style="background: linear-gradient(135deg, #78350f 0%, #92400e 100%);">
        <span class="value" style="color: #fff;">\u{1F7E4} ${count}</span>
        <span class="label" style="color: #fde68a;">Block Recommended <span class="info-icon" style="background: rgba(255,255,255,0.16); color: #fde68a;">i</span></span>
        <div class="tooltip"><strong>Level 5 governance signal (UI-only).</strong> K4 Bad Actor Day: scraper persists after friction and generates <strong>\u226510 429s/day</strong>, sustained high-rate image pulls (\u226520 unique/min), delay bursts (\u226540 in 10min), or <strong>\u2265200 requests over 3+ days</strong> at Level 4. Consider <em>Force Block</em> if clearly non-beneficial traffic.</div>
      </div>`;
  })()}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
      <span class="value" style="color: #fff;"><span style="text-shadow: 0 0 2px #000, 0 0 4px #000;">\u2296</span> ${botIntelligence?.blocked?.filter((b) => Number(b.is_active) === 1)?.length || 0}</span>
      <span class="label" style="color: #fecaca;">Blocked <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fecaca;">i</span></span>
      <div class="tooltip">Manually blocked IPs. Returns 403 Forbidden. Can unblock from Blocked IPs section below.</div>
    </div>
  </div>

  <div class="bot-intel-grid" style="display: grid; grid-template-columns: 580px 580px 580px; gap: 16px; width: fit-content; margin: 0 auto;">
    <!-- Verified Search Bots (Good!) -->
    <div class="section" style="border: 1px solid #10b98133;">
      <h3 style="color: #10b981;">\u{1F7E2} Verified Search Bots</h3>
      <p style="color: #888; font-size: 10px; margin: -5px 0 10px 0;">Search engines indexing your art for Google/Bing Images!${(() => {
    const total = botIntelligence?.stats?.verified_bots || 0;
    const shown = (botIntelligence?.verified || []).length;
    return total > shown && shown > 0 ? ` (Showing top ${shown} of ${total})` : "";
  })()}</p>
      ${(botIntelligence?.verified || []).length === 0 ? '<p style="color:#666">No verified bots detected yet</p>' : '<div style="max-height: 400px; overflow-y: auto;">' + (botIntelligence?.verified || []).map((v) => {
    const botIcons = {
      googlebot: "\u{1F50D}",
      bingbot: "\u{1F171}\uFE0F",
      applebot: "\u{1F34E}",
      duckduckbot: "\u{1F986}",
      yandex: "\u{1F1F7}\u{1F1FA}",
      baidu: "\u{1F1E8}\u{1F1F3}",
      facebook: "\u{1F4D8}",
      twitter: "\u{1F426}",
      pinterest: "\u{1F4CC}",
      linkedin: "\u{1F4BC}",
      openai: "\u{1F300}",
      claude: "\u{1F9E0}"
    };
    const icon = botIcons[v.bot_name?.toLowerCase()] || "\u{1F916}";
    const displayName = v.bot_name ? v.bot_name.charAt(0).toUpperCase() + v.bot_name.slice(1) : "Unknown";
    const total7d = v.status_total_7d || 0;
    const status200 = v.status_200_7d || 0;
    const status301 = v.status_301_7d || 0;
    const status302 = v.status_302_7d || 0;
    const status404 = v.status_404_7d || 0;
    const status410 = v.status_410_7d || 0;
    const status429 = v.status_429_7d || 0;
    const status5xx = v.status_5xx_7d || 0;
    const breakdown = total7d > 0 ? total7d + " status-coded requests (7d)" : v.total_requests + " lifetime requests";
    const metricCell = (label, value) => {
      const style = value > 0 ? "font-weight:700; color:#e5e7eb;" : "color:#9ca3af;";
      return '<span style="display:inline-block; ' + style + '">' + label + ': ' + value + '</span>';
    };
    const separator = '<span style="display:inline-block; margin:0 5px; color:#4b5563;">|</span>';
    const signalParts = [
      { label: "T", value: total7d },
      { label: "200", value: status200 },
      { label: "301", value: status301 },
      { label: "302", value: status302 },
      { label: "404", value: status404 },
      { label: "410", value: status410 },
      { label: "429", value: status429 },
      { label: "5xx", value: status5xx }
    ].filter((s2) => s2.label === "T" || Number(s2.value || 0) > 0);
    const statusSignals = signalParts.map((s2) => metricCell(s2.label, s2.value)).join(separator);
    return '<div style="display: flex; align-items: center; padding: 8px; margin-bottom: 6px; background: #10b98111; border-radius: 6px; gap: 10px;"><span style="font-size: 18px;">' + icon + '</span><div style="flex: 1;"><div style="display:flex; align-items:center; justify-content:space-between; gap:10px;"><div style="color: #10b981; font-weight: bold; font-size: 12px;">' + displayName + '</div><div style="color: #9ca3af; font-size: 10px; letter-spacing:0; white-space: nowrap;">' + statusSignals + '</div></div><div style="color: #888; font-size: 10px;">' + breakdown + '</div></div><span style="color: #666; font-size: 10px;">' + (v.country || "") + '</span></div>';
  }).join("") + "</div>"}
    </div>

    <!-- Suspected automation (governance view) -->
    <div class="section">
      <h3>\u{1F9ED} Traffic Governance</h3>
      <p style="color: #888; font-size: 10px; margin: -5px 0 10px 0;">Most automated traffic is mitigated automatically. Manual blocking should be reserved for persistent abuse.${(() => {
    const total = botIntelligence?.stats?.total || 0;
    const shown = (botIntelligence?.suspects || []).filter(
      (s2) => s2 && s2.status !== "blocked"
    ).length;
    return total > shown && shown > 0 ? ` (Showing top ${shown} of ${total})` : "";
  })()}</p>
      ${(botIntelligence?.suspects || []).length === 0 ? '<p style="color:#666">No suspicious IPs detected yet</p>' : `
      <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; font-size: 11px;">
          <tr style="position: sticky; top: 0; background: #252525;">
            <th style="text-align: left; padding: 4px;">Risk</th>
            <th style="text-align: left; padding: 4px;">Status</th>
            <th style="text-align: left; padding: 4px;">IP Hash</th>
            <th style="text-align: right; padding: 4px;">Reqs</th>
            <th style="text-align: left; padding: 4px;">Rules</th>
            <th style="text-align: center; padding: 4px;">Days</th>
            <th style="text-align: center; padding: 4px;">Action</th>
          </tr>
          ${(botIntelligence?.suspects || []).filter((s2) => s2.risk_level >= 2 && s2.status !== "blocked").sort((a, b) => {
    const aBlock = isLevel5BlockRecommended(a) ? 1 : 0;
    const bBlock = isLevel5BlockRecommended(b) ? 1 : 0;
    if (aBlock !== bBlock) return bBlock - aBlock;
    const aRisk = Number(a?.risk_level || 0);
    const bRisk = Number(b?.risk_level || 0);
    if (aRisk !== bRisk) return bRisk - aRisk;
    const aScore = Number(a?.risk_score || 0);
    const bScore = Number(b?.risk_score || 0);
    if (aScore !== bScore) return bScore - aScore;
    const aReq = Number(a?.total_requests || 0);
    const bReq = Number(b?.total_requests || 0);
    return bReq - aReq;
  }).map((s2) => {
    const riskColors = {
      1: "#10b981",
      2: "#fbbf24",
      3: "#f97316",
      4: "#a855f7",
      5: "#92400e"
    };
    const riskIcons = {
      1: "\u{1F7E2}",
      2: "\u{1F7E1}",
      3: "\u{1F7E0}",
      4: "\u{1F7E3}",
      5: "\u{1F7E4}"
    };
    const isBlockRecommended = isLevel5BlockRecommended(s2);
    const rules = JSON.parse(s2.rules_triggered || "[]");
    const rulesShort = rules.slice(0, 2).map((r) => r.replace(/_/g, " ").slice(0, 12)).join(", ");
    const isBlocked = s2.status === "blocked";
    const displayRiskLevel = isBlockRecommended ? 5 : s2.risk_level || 0;
    const riskColor = riskColors[displayRiskLevel] || "#888";
    const riskIcon = riskIcons[displayRiskLevel] || "\u2753";
    const rowStyle = isBlocked ? "opacity: 0.5;" : "";
    const reqColor = s2.total_requests > 100 ? "#ef4444" : "#888";
    const daysColor = s2.days_seen > 2 ? "#f97316" : "#888";
    const protectionStatus = isBlocked ? "manual_block" : isBlockRecommended ? "block_recommended" : (s2.risk_level || 0) >= 4 ? "friction_active" : "observation";
    const statusBadges = {
      friction_active: {
        bg: "#a855f722",
        color: "#f5d0fe",
        text: "\u{1F7E3} Friction Active"
      },
      block_recommended: {
        bg: "#92400e22",
        color: "#fde68a",
        text: "\u{1F7E4} Block Recommended"
      },
      observation: {
        bg: "#f9731622",
        color: "#fed7aa",
        text: "\u{1F7E0} Observing"
      },
      manual_block: {
        bg: "#dc262622",
        color: "#fecaca",
        text: "\u{1F534} Manual Block"
      }
    };
    const status = statusBadges[protectionStatus] || statusBadges.observation;
    const statusHtml = '<span title="' + protectionStatus + '" style="display:inline-flex;align-items:center;gap:6px;background:' + status.bg + ";color:" + status.color + ';padding:2px 6px;border-radius:999px;font-size:10px;">' + status.text + "</span>";
    const actionHtml = isBlocked ? '<span style="color: #666;">Blocked</span>' : isBlockRecommended ? `<button onclick="blockIP('` + s2.ip_hash + `')" title="Block recommended: \u226510 429s/day or sustained high-rate pulls" style="background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">Force Block</button>` : `<button onclick="blockIP('` + s2.ip_hash + `')" title="Force a manual block (usually unnecessary; friction already mitigates most automation)" style="background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">Force Block</button>`;
    return '<tr data-level5="' + (isBlockRecommended ? "1" : "0") + '" data-iphash="' + s2.ip_hash + '" style="border-bottom: 1px solid #333; ' + rowStyle + '"><td style="padding: 6px 4px;"><span style="background: ' + riskColor + "22; color: " + riskColor + '; padding: 2px 6px; border-radius: 8px; font-weight: bold;">' + riskIcon + " " + displayRiskLevel + '</span></td><td style="padding: 6px 4px;">' + statusHtml + '</td><td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">' + s2.ip_hash + '<span style="color: #666; margin-left: 4px;">' + (s2.country || "") + '</span></td><td style="padding: 6px 4px; text-align: right; font-weight: bold; color: ' + reqColor + ';">' + s2.total_requests + '</td><td style="padding: 6px 4px; color: #888; font-size: 10px;" title="' + rules.join(", ") + '">' + rulesShort + (rules.length > 2 ? "..." : "") + '</td><td style="padding: 6px 4px; text-align: center;"><span style="color: ' + daysColor + ';">' + s2.days_seen + '</span></td><td style="padding: 6px 4px; text-align: center;">' + actionHtml + "</td></tr>";
  }).join("")}
        </table>
      </div>
      `}
    </div>

    <!-- Blocked IPs Archive -->
    <div class="section">
      <h3>\u2296 Blocked IPs <span style="font-size: 11px; color: #666; font-weight: normal;">(Archive)</span></h3>
      ${(botIntelligence?.blocked || []).length === 0 ? '<p style="color:#666">No blocked IPs yet</p>' : `
      <div class="blocked-ips-wrap" style="max-height: 400px; overflow-y: auto; width: 100%;">
        <table class="blocked-ips-table" style="width: 100%; font-size: 11px;">
          <tr style="position: sticky; top: 0; background: #252525;">
            <th style="text-align: left; padding: 4px;">Status</th>
            <th style="text-align: left; padding: 4px;">IP Hash</th>
            <th style="text-align: right; padding: 4px;">Reqs</th>
            <th style="text-align: left; padding: 4px;">Blocked</th>
            <th style="text-align: center; padding: 4px;">Action</th>
          </tr>
          ${(botIntelligence?.blocked || []).map((b) => {
    const isActive = Number(b.is_active) === 1;
    const blockedDate = b.blocked_at ? new Date(b.blocked_at).toLocaleDateString() : "-";
    const rowStyle = !isActive ? "opacity: 0.4;" : "";
    const statusBg = isActive ? "#dc262622" : "#37415122";
    const statusColor = isActive ? "#ef4444" : "#6b7280";
    const statusText = isActive ? "\u26D4 Active" : "\u2713 Unblocked";
    const actionHtml = isActive ? `<button onclick="unblockIP('` + b.ip_hash + `')" style="background: #374151; color: #9ca3af; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">Unblock</button>` : '<span style="color: #666;">\u2014</span>';
    return '<tr style="border-bottom: 1px solid #333; ' + rowStyle + '"><td style="padding: 6px 4px;"><span style="background: ' + statusBg + "; color: " + statusColor + '; padding: 2px 6px; border-radius: 8px; font-size: 10px;">' + statusText + '</span></td><td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">' + b.ip_hash + '</td><td style="padding: 6px 4px; text-align: right; color: #888;">' + (b.total_requests || "-") + '</td><td style="padding: 6px 4px; color: #666; font-size: 10px;">' + blockedDate + '</td><td style="padding: 6px 4px; text-align: center;">' + actionHtml + "</td></tr>";
  }).join("")}
        </table>
      </div>
      `}
    </div>

  </div>
  </div>
  ` : ""}

  <p style="margin-top: 30px; color: #666; font-size: 12px; max-width: 1780px; margin-left: auto; margin-right: auto;">
    Generated ${/* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()} \u2014 ${periodLabel}
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

    // Admin auth \u2014 embedded server-side (page is already auth-protected).
    // fetch() doesn't reliably forward cached Basic Auth credentials,
    // so we pass the header explicitly on all admin POST calls.
    const _k4auth = '${(authHeader || "").replace(/'/g, "\\'")}';

    function k4AdminFetch(url, opts) {
      opts = opts || {};
      opts.headers = Object.assign({ 'Authorization': _k4auth }, opts.headers || {});
      opts.credentials = 'include';
      return fetch(url, opts);
    }

    // Bot Intelligence functions
    async function blockIP(ipHash) {
      if (!confirm('FORCE BLOCK IP: ' + ipHash + '?\\n\\nNote: Most automated traffic is already slowed/rate-limited automatically. Use manual blocking only for persistent abuse.\\n\\nThis takes effect immediately.')) return;
      
      try {
        document.body.classList.add('k4-loading');
        const res = await k4AdminFetch('/__k4stats/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hash: ipHash, reason: 'Force block from governance dashboard' })
        });
        
        if (res.ok) {
          alert('IP blocked successfully');
          location.reload();
        } else {
          const data = await res.json().catch(() => ({}));
          alert('Error: ' + (data.error || 'HTTP ' + res.status));
          document.body.classList.remove('k4-loading');
        }
      } catch (e) {
        alert('Error: ' + e.message);
        document.body.classList.remove('k4-loading');
      }
    }

    async function blockAllLevel5() {
      const rows = Array.from(document.querySelectorAll('tr[data-level5="1"][data-iphash]'));
      const ipHashes = Array.from(new Set(rows.map(r => (r.getAttribute('data-iphash') || '').trim()).filter(Boolean)));
      if (ipHashes.length === 0) {
        alert('No Level 5 entries available to block.');
        return;
      }
      if (!confirm('FORCE BLOCK all Level 5 entries now?\\n\\nCount: ' + ipHashes.length + '\\n\\nThis will immediately activate manual blocks for each listed IP.')) return;

      try {
        document.body.classList.add('k4-loading');
        const res = await k4AdminFetch('/__k4stats/block-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hashes: ipHashes, reason: 'Bulk Level 5 block from governance dashboard' })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          alert('Bulk block completed. Blocked ' + (data.blocked || 0) + ' IPs.');
          location.reload();
        } else {
          alert('Error: ' + (data.error || 'HTTP ' + res.status));
          document.body.classList.remove('k4-loading');
        }
      } catch (e) {
        alert('Error: ' + e.message);
        document.body.classList.remove('k4-loading');
      }
    }

    async function unblockIP(ipHash) {
      if (!confirm('Unblock IP: ' + ipHash + '?')) return;
      
      try {
        document.body.classList.add('k4-loading');
        const res = await k4AdminFetch('/__k4stats/unblock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hash: ipHash })
        });
        
        if (res.ok) {
          alert('IP unblocked successfully');
          location.reload();
        } else {
          const data = await res.json().catch(() => ({}));
          alert('Error: ' + (data.error || 'HTTP ' + res.status));
          document.body.classList.remove('k4-loading');
        }
      } catch (e) {
        alert('Error: ' + e.message);
        document.body.classList.remove('k4-loading');
      }
    }

    async function refreshBotIntelligence() {
      try {
        document.body.classList.add('k4-loading');
        const res = await k4AdminFetch('/__k4stats/refresh-bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
          const data = await res.json();
          alert('Bot intelligence refreshed. Updated ' + (data.updated || 0) + ' IPs.');
          location.reload();
        } else {
          const data = await res.json().catch(() => ({}));
          alert('Error: ' + (data.error || 'HTTP ' + res.status));
          document.body.classList.remove('k4-loading');
        }
      } catch (e) {
        alert('Error: ' + e.message);
        document.body.classList.remove('k4-loading');
      }
    }
  <\/script>

  <script>
    // UX: show progress cursor + hourglass immediately on navigation.
    (function() {
      function setLoading(clickedAnchor) {
        try { document.body.classList.add('k4-loading'); } catch (e) {}

        if (!clickedAnchor) return;
        try {
          if (clickedAnchor.dataset && clickedAnchor.dataset.k4LoadingApplied === '1') return;
          // Only decorate simple text links to avoid mangling complex HTML.
          if (clickedAnchor.children && clickedAnchor.children.length > 0) return;
          const t = (clickedAnchor.textContent || '').trim();
          if (!t || t.endsWith('\u23F3')) return;
          clickedAnchor.dataset.k4LoadingApplied = '1';
          clickedAnchor.textContent = t + ' \u23F3';
        } catch (e) {}
      }

      window.addEventListener('beforeunload', function() { setLoading(null); });

      document.addEventListener('click', function(ev) {
        if (ev.defaultPrevented) return;
        if (ev.button !== 0) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

        const a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
        if (!a) return;
        if (a.target === '_blank') return;
        if (!a.href) return;

        // Same-page hash changes should not trigger loading.
        try {
          const u = new URL(a.href, window.location.href);
          const cur = new URL(window.location.href);
          const isHashOnly = (u.origin === cur.origin && u.pathname === cur.pathname && u.search === cur.search && u.hash && u.hash !== cur.hash);
          if (isHashOnly) return;
        } catch (e) {}

        setLoading(a);
      }, { capture: true });
    })();
  <\/script>

  <script>
  function k4OpenEdgeEventList() {
    var overlay = document.getElementById('k4-edge-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'k4-edge-overlay';
      overlay.className = 'k4-overlay';
      var box = document.createElement('div');
      box.className = 'k4-overlay-box';
      var hdr = document.createElement('div');
      hdr.className = 'k4-overlay-hdr';
      var h2 = document.createElement('h2');
      h2.textContent = 'Edge Events (full paths)';
      var closeBtn = document.createElement('button');
      closeBtn.className = 'k4-overlay-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = function() { overlay.classList.remove('open'); };
      hdr.appendChild(h2);
      hdr.appendChild(closeBtn);
      var body = document.createElement('div');
      body.className = 'k4-overlay-body';
      var pre = document.createElement('pre');
      pre.id = 'k4-edge-pre';
      body.appendChild(pre);
      box.appendChild(hdr);
      box.appendChild(body);
      overlay.appendChild(box);
      overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.classList.remove('open'); });
      document.body.appendChild(overlay);
    }
    var rows = document.querySelectorAll('.edge-row');
    var lines = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var hits = r.getAttribute('data-hits') || '0';
      var bot = r.getAttribute('data-bot') === '1' ? '\\uD83E\\uDD16' : '\\uD83D\\uDC64';
      var type = r.getAttribute('data-type') || '';
      var path = r.getAttribute('data-path') || '';
      lines.push(hits + '\\t' + bot + '\\t' + type + '\\t' + path);
    }
    document.getElementById('k4-edge-pre').textContent = lines.join('\\n');
    overlay.classList.add('open');
  }
  <\/script>
</div>
</body>
</html>`;
}
__name(renderDashboard, "renderDashboard");
__name2(renderDashboard, "renderDashboard");
function renderInspectPage({
  title,
  locationLabel,
  backUrl,
  sessions,
  timeline,
  selectedSessionId,
  baseInspectParams,
  error
}) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const base = baseInspectParams || {};
  const buildInspectUrl = /* @__PURE__ */ __name2((sessionId) => {
    const params = new URLSearchParams();
    if (base.country) params.set("country", base.country);
    if (base.region) params.set("region", base.region);
    if (base.city) params.set("city", base.city);
    if (base.days) params.set("days", base.days);
    if (base.yesterday === "1") params.set("yesterday", "1");
    if (base.date) params.set("date", base.date);
    if (base.hideBots === "1") params.set("hideBots", "1");
    if (base.hideChardon === "1") params.set("hideChardon", "1");
    if (base.excludeIp) params.set("excludeIp", base.excludeIp);
    if (sessionId) params.set("session", sessionId);
    return `/__k4stats/inspect?${params.toString()}`;
  }, "buildInspectUrl");
  const refIcons = {
    google_search: "\u{1F50D}",
    google_images: "\u{1F5BC}\uFE0F",
    bing_search: "\u{1F171}\uFE0F",
    bing_images: "\u{1F5BC}\uFE0F",
    pinterest: "\u{1F4CC}",
    twitter: "\u{1F426}",
    facebook: "\u{1F4D8}",
    instagram: "\u{1F4F7}",
    linkedin: "\u{1F4BC}",
    duckduckgo: "\u{1F986}",
    direct: "\u{1F517}",
    internal: "\u{1F504}",
    unattributed: "\u{1F512}"
  };
  const fmtDur = /* @__PURE__ */ __name2((sec) => {
    const n = Number(sec || 0);
    if (!Number.isFinite(n) || n <= 0) return "0s";
    if (n < 60) return `${n}s`;
    const m = Math.floor(n / 60);
    const s = n % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  }, "fmtDur");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || "Inspect"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
    body.k4-loading, body.k4-loading * { cursor: progress !important; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 10px; font-size: 18px; }
    .sub { color: #aaa; font-size: 12px; margin-bottom: 14px; }
    a { color: #4a9eff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .controls { margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .pill { background: #252525; border: 1px solid #333; border-radius: 8px; padding: 6px 10px; font-size: 12px; color: #ccc; }
    .err { background: #3b1d1d; border: 1px solid #7f1d1d; color: #fecaca; padding: 10px; border-radius: 8px; margin-bottom: 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; background: #252525; border-radius: 10px; overflow: hidden; margin-bottom: 14px; }
    th, td { padding: 7px 10px; text-align: left; border-bottom: 1px solid #333; font-size: 12px; vertical-align: top; }
    th { background: #1a1a1a; color: #888; font-size: 11px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    .muted { color: #888; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
    .row-selected { background: rgba(74, 158, 255, 0.10); }
    .section { background: #252525; border-radius: 10px; padding: 12px; margin-bottom: 14px; border: 1px solid #333; }
    .section h2 { font-size: 13px; color: #fff; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="controls">
      <a href="${backUrl || "/__k4stats"}">\u2190 Back to dashboard</a>
      <span class="pill">${locationLabel || ""}</span>
      <span class="pill muted">Click a session to view timeline</span>
    </div>

    <h1>Inspect Geography</h1>
    <div class="sub">Most recent JS sessions from this location.</div>

    ${error ? `<div class="err">${String(error)}</div>` : ""}

    <div class="section">
      <h2>Recent Sessions</h2>
      ${safeSessions.length === 0 ? '<div class="muted">No sessions found for this location in the selected window.</div>' : `
      <table>
        <tr><th>Last</th><th>Dur</th><th>Entry</th><th>From</th><th>Evts</th><th>Session</th></tr>
        ${safeSessions.map((s) => {
    const sid = String(s.session_id || "");
    const isSel = selectedSessionId && sid && sid === selectedSessionId;
    const entry = String(s.entry_page || "/");
    const shortEntry = entry.length > 44 ? "..." + entry.slice(-41) : entry;
    const ref = String(s.ref_source || "unattributed");
    const refIcon = refIcons[ref] || "\u{1F512}";
    const evts = Number(s.events || 0);
    const last = String(s.last_ts || "");
    const dur = fmtDur(s.duration_s);
    const shortSid = sid ? sid.slice(0, 8) : "";
    const href = buildInspectUrl(sid);
    return `<tr class="${isSel ? "row-selected" : ""}">
            <td class="mono">${last}</td>
            <td>${dur}</td>
            <td title="${entry}"><a href="${href}">\u{1F4C4} ${shortEntry}</a></td>
            <td title="${ref}">${refIcon}</td>
            <td>${evts}</td>
            <td class="mono"><a href="${href}">${shortSid}</a></td>
          </tr>`;
  }).join("")}
      </table>
      `}
    </div>

    <div class="section">
      <h2>Session Timeline${selectedSessionId ? ` <span class="muted mono">(${selectedSessionId.slice(0, 8)})</span>` : ""}</h2>
      ${!selectedSessionId ? '<div class="muted">Select a session above.</div>' : safeTimeline.length === 0 ? '<div class="muted">No events found for that session.</div>' : `
      <table>
        <tr><th>Time</th><th>Event</th><th>Page/Target</th><th>Meta</th></tr>
        ${safeTimeline.map((e) => {
    const ts = String(e.ts || "");
    const type = String(e.event_type || "");
    const path = String(e.page_path || "");
    const shortPath = path.length > 60 ? "..." + path.slice(-57) : path;
    const metaParts = [];
    if (e.img_size) metaParts.push(String(e.img_size));
    if (e.ref_type) metaParts.push(String(e.ref_type));
    if (e.referer) metaParts.push(String(e.referer));
    const meta = metaParts.join(" \xB7 ");
    return `<tr>
            <td class="mono">${ts}</td>
            <td class="mono">${type}</td>
            <td title="${path}">${shortPath || '<span class="muted">(none)</span>'}</td>
            <td class="muted" title="${meta}">${meta.length > 80 ? meta.slice(0, 77) + "..." : meta}</td>
          </tr>`;
  }).join("")}
      </table>
      `}
    </div>
  </div>

<script>
  // UX: show progress cursor + hourglass immediately on navigation.
  (function() {
    function setLoading(clickedAnchor) {
      try { document.body.classList.add('k4-loading'); } catch (e) {}

      if (!clickedAnchor) return;
      try {
        if (clickedAnchor.dataset && clickedAnchor.dataset.k4LoadingApplied === '1') return;
        if (clickedAnchor.children && clickedAnchor.children.length > 0) return;
        const t = (clickedAnchor.textContent || '').trim();
        if (!t || t.endsWith('\u23F3')) return;
        clickedAnchor.dataset.k4LoadingApplied = '1';
        clickedAnchor.textContent = t + ' \u23F3';
      } catch (e) {}
    }

    window.addEventListener('beforeunload', function() { setLoading(null); });

    document.addEventListener('click', function(ev) {
      if (ev.defaultPrevented) return;
      if (ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
      if (!a) return;
      if (a.target === '_blank') return;
      if (!a.href) return;

      try {
        const u = new URL(a.href, window.location.href);
        const cur = new URL(window.location.href);
        const isHashOnly = (u.origin === cur.origin && u.pathname === cur.pathname && u.search === cur.search && u.hash && u.hash !== cur.hash);
        if (isHashOnly) return;
      } catch (e) {}

      setLoading(a);
    }, { capture: true });
  })();
<\/script>

</body>
</html>`;
}
__name(renderInspectPage, "renderInspectPage");
__name2(renderInspectPage, "renderInspectPage");
async function handleDashboardRequest(env, filters) {
  const {
    dateClause,
    galleryClause,
    ipClause,
    botClause,
    chardonClause,
    priorPeriodClause,
    rangeDateClause,
    artIpClause,
    baseDateClause,
    truthDateClause,
    hideBotsPredicate,
    yesterday,
    days,
    selectedDate,
    galleryFilter,
    excludeIp,
    viewerIp,
    hideBots,
    hideChardon,
    authHeader
  } = filters;
  const { summary, returningVisitors, newVisitors } = await getDashboardStats(
    env,
    {
      dateClause,
      galleryClause,
      ipClause,
      botClause,
      chardonClause,
      priorPeriodClause
    }
  );
  const { events } = await getEventBreakdown(env, {
    dateClause,
    galleryClause,
    ipClause,
    botClause,
    chardonClause
  });
  const galleries = await getGalleryPerformance(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const referrers = await getReferrers(env, {
    dateClause,
    galleryClause,
    ipClause,
    botClause,
    chardonClause
  });
  const geo = await getGeography(env, {
    dateClause,
    galleryClause,
    ipClause,
    botClause,
    chardonClause
  });
  const trend = await getDailyTrend(env, {
    rangeDateClause,
    galleryClause,
    ipClause,
    botClause,
    chardonClause
  });
  const {
    devices,
    bounceRate,
    avgDurationSecs,
    avgDurationFormatted,
    peakHours,
    deviceEngagement
  } = await getSessionMetrics(env, {
    dateClause,
    galleryClause,
    ipClause,
    botClause,
    chardonClause
  });
  const pages = await getTopPages(env, {
    dateClause: truthDateClause || dateClause,
    ipClause: "",
    botClause: "",
    chardonClause: ""
  });
  const { images, uniqueImagesViewed, totalImageSessions, totalImageViews } = await getTopImages(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const {
    themesClicked,
    cowboyJumps,
    topDepthSessions,
    minEngagement,
    maxEngagement,
    avgDepthScore,
    deepSessionPct,
    deepSessions,
    totalSessions,
    botSessions,
    botPct
  } = await getEngagementDepth(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const {
    entryPages,
    imagePageViewsFromEvents,
    imageEntrySessionsFromEvents,
    entryRefCounts
  } = await getEntryAnalysis(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const { exitPages, exitSummary, exitByCategory } = await getExitAnalysis(
    env,
    {
      dateClause,
      ipClause,
      botClause,
      chardonClause
    }
  );
  const { edgeEvents, edgeSummary } = await getEdgeEvents(env, {
    dateClause,
    yesterday,
    days
  });
  const {
    artViewsSummary,
    artViewsByType,
    topArtViews,
    externalImageAccess,
    externalImageAccessTotal,
    externalReachGeo,
    externalReachSources,
    externalDailySummary,
    entryRefCountsObj,
    imageAccessOverview,
    viewerDepth,
    suppressionStats
  } = await getArtViews(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause,
    artIpClause,
    baseDateClause,
    hideBotsPredicate,
    hideBots,
    selectedDate
  });
  const botIntelligence = await getBotIntelligence(env);
  const periodTotals = await getPeriodTotals(env, {
    dateClause: rangeDateClause,
    botClause,
    chardonClause
  });
  const statePixelTestRoaring20s = await getStatePixelTestRoaring20s(env, {
    dateClause
  });
  const topGalleryLandingPages = await getTopGalleryLandingPages(env, {
    dateClause
  });
  const browserViewsSummary = await getBrowserViewsSummary(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const queryResults = {
    summary,
    returningVisitors,
    newVisitors,
    events,
    galleries,
    referrers,
    geo,
    trend,
    devices,
    bounceRate,
    avgDurationFormatted,
    peakHours,
    deviceEngagement,
    pages,
    images,
    uniqueImagesViewed,
    totalImageSessions,
    totalImageViews,
    themesClicked,
    cowboyJumps,
    topDepthSessions,
    minEngagement,
    maxEngagement,
    avgDepthScore,
    deepSessionPct,
    deepSessions,
    totalSessions,
    botSessions,
    botPct,
    entryPages,
    imagePageViewsFromEvents,
    imageEntrySessionsFromEvents,
    entryRefCounts,
    exitPages,
    exitSummary,
    exitByCategory,
    edgeEvents,
    edgeSummary,
    artViewsSummary,
    artViewsByType,
    topArtViews,
    externalImageAccess,
    externalImageAccessTotal,
    externalReachGeo,
    externalReachSources,
    externalDailySummary,
    entryRefCountsObj,
    imageAccessOverview,
    viewerDepth,
    suppressionStats,
    botIntelligence,
    periodTotals,
    statePixelTestRoaring20s,
    topGalleryLandingPages,
    browserViewsSummary
  };
  const dashboardData = buildDashboardData(queryResults, {
    days,
    yesterday,
    selectedDate,
    galleryFilter,
    excludeIp,
    viewerIp,
    hideBots,
    hideChardon,
    authHeader
  });
  return renderDashboard(dashboardData);
}
__name(handleDashboardRequest, "handleDashboardRequest");
__name2(handleDashboardRequest, "handleDashboardRequest");
function withAdminNoCacheHeaders(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Vary", "Authorization");
  return headers;
}
__name(withAdminNoCacheHeaders, "withAdminNoCacheHeaders");
__name2(withAdminNoCacheHeaders, "withAdminNoCacheHeaders");
function checkBasicAuth(request, env) {
  const auth = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  return auth === expected;
}
__name(checkBasicAuth, "checkBasicAuth");
__name2(checkBasicAuth, "checkBasicAuth");
function requireAuth() {
  return new Response("Unauthorized", {
    status: 401,
    headers: withAdminNoCacheHeaders({
      "WWW-Authenticate": 'Basic realm="K4 Analytics"',
      "Content-Type": "text/plain"
    })
  });
}
__name(requireAuth, "requireAuth");
__name2(requireAuth, "requireAuth");
function getBestClientIP(request) {
  const cfIp = request.headers.get("CF-Connecting-IP") || null;
  const xff = request.headers.get("X-Forwarded-For") || null;
  const isIPv4 = /* @__PURE__ */ __name2(
    (ip) => typeof ip === "string" && ip.includes(".") && !ip.includes(":"),
    "isIPv4"
  );
  if (isIPv4(cfIp)) return cfIp;
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    const firstIPv4 = parts.find(isIPv4);
    if (firstIPv4) return firstIPv4;
    if (parts.length > 0) return parts[0];
  }
  return cfIp;
}
__name(getBestClientIP, "getBestClientIP");
__name2(getBestClientIP, "getBestClientIP");
async function handleDashboardRequest2(request, env, ctx) {
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
  const viewerIp = getBestClientIP(request);
  try {
    let rangeDateClause;
    if (yesterday) {
      rangeDateClause = `date(ts, '-5 hours') = date('now', '-5 hours', '-1 day')`;
    } else if (days === 1) {
      rangeDateClause = `date(ts, '-5 hours') = date('now', '-5 hours')`;
    } else {
      rangeDateClause = `ts > datetime('now', '-5 hours', '-${days} days')`;
    }
    const baseRangeDateClause = rangeDateClause;
    const truthDateClause = selectedDate ? `date(ts, '-5 hours') = '${selectedDate}'` : baseRangeDateClause;
    const globalPartsNoBots = [];
    if (excludeIp)
      globalPartsNoBots.push(`(ip IS NULL OR ip != '${excludeIp}')`);
    const hideBotsPredicate = hideBots ? `(
          -- Never hide the authenticated dashboard viewer by default.
          -- If you want to remove your own traffic, use "Exclude My IP".
          (${viewerIp ? `ip IS NOT NULL AND ip != '${viewerIp}' AND ` : ""}(
            ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%'
            OR city = 'Ashburn'
            OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
            OR ip_hash IN (
              SELECT ip_hash FROM suspected_bots
              WHERE status = 'blocked'
                 OR is_datacenter = 1
            )
          ))
        )` : "";
    if (hideChardon) {
      if (viewerIp)
        globalPartsNoBots.push(`(ip IS NULL OR ip != '${viewerIp}')`);
      globalPartsNoBots.push(`city != 'Chardon'`);
      globalPartsNoBots.push(
        `(referer IS NULL OR referer NOT LIKE '%localhost%')`
      );
    }
    const globalPartsAll = [...globalPartsNoBots];
    if (hideBots) {
      globalPartsAll.push(`NOT ${hideBotsPredicate}`);
    }
    const globalFilterClause = globalPartsAll.length ? " AND " + globalPartsAll.join(" AND ") : "";
    const globalFilterClauseNoBots = globalPartsNoBots.length ? " AND " + globalPartsNoBots.join(" AND ") : "";
    rangeDateClause = `${rangeDateClause}${globalFilterClause}`;
    const baseDateClause = (selectedDate ? `date(ts, '-5 hours') = '${selectedDate}'` : baseRangeDateClause) + globalFilterClauseNoBots;
    const dateClause = `${baseDateClause}${globalFilterClause}`;
    const galleryClause = galleryFilter ? `AND gallery_id = '${galleryFilter}'` : "";
    const ipClause = excludeIp ? `AND (ip IS NULL OR ip != '${excludeIp}')` : "";
    const excludeIpHash = excludeIp && excludeIp !== "unknown" ? hashIP(excludeIp) : null;
    const viewerIpHash = viewerIp && viewerIp !== "unknown" ? hashIP(viewerIp) : null;
    const artIpParts = [];
    if (excludeIpHash && excludeIpHash !== "unknown")
      artIpParts.push(`ip_hash != '${excludeIpHash}'`);
    if (hideBots) {
      artIpParts.push(
        `NOT (
          ip_hash LIKE '3.%' OR ip_hash LIKE '17.%' OR ip_hash LIKE '18.%' OR ip_hash LIKE '40.77.%' OR ip_hash LIKE '52.%' OR ip_hash LIKE '54.%' OR ip_hash LIKE '65.55.%'
          OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
          OR ip_hash IN (
            SELECT ip_hash FROM suspected_bots
            WHERE status = 'blocked'
               OR is_datacenter = 1
          )
        )`
      );
    }
    if (hideChardon && viewerIpHash && !excludeIpHash)
      artIpParts.push(`ip_hash != '${viewerIpHash}'`);
    if (hideChardon)
      artIpParts.push(`(referrer IS NULL OR referrer NOT LIKE '%localhost%')`);
    const artIpClause = artIpParts.length > 0 ? "AND " + artIpParts.join(" AND ") : "";
    const botClause = hideBots ? `AND NOT (
          ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%'
          OR city = 'Ashburn'
          OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
          OR ip_hash IN (
            SELECT ip_hash FROM suspected_bots
            WHERE status = 'blocked'
               OR is_datacenter = 1
          )
        )` : "";
    const chardonClause = hideChardon ? `AND city != 'Chardon'` : "";
    const priorPeriodClause = (selectedDate ? `date(ts, '-5 hours') < '${selectedDate}'` : yesterday ? `ts < datetime('now', '-5 hours', '-1 day', 'start of day')` : `ts < datetime('now', '-5 hours', '-${days} days')`) + globalFilterClause;
    const authHeader = request.headers.get("Authorization") || "";
    const html = await handleDashboardRequest(env, {
      dateClause,
      galleryClause,
      ipClause,
      botClause,
      chardonClause,
      priorPeriodClause,
      rangeDateClause,
      artIpClause,
      baseDateClause,
      truthDateClause,
      hideBotsPredicate,
      yesterday,
      days,
      selectedDate,
      galleryFilter,
      excludeIp,
      viewerIp,
      hideBots,
      hideChardon,
      authHeader
    });
    return new Response(html, {
      status: 200,
      headers: withAdminNoCacheHeaders({
        "Content-Type": "text/html; charset=utf-8"
      })
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    return new Response(`Error: ${err.message}`, {
      status: 500,
      headers: withAdminNoCacheHeaders({
        "Content-Type": "text/plain; charset=utf-8"
      })
    });
  }
}
__name(handleDashboardRequest2, "handleDashboardRequest2");
__name2(handleDashboardRequest2, "handleDashboardRequest");
function withAdminNoCacheHeaders2(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Vary", "Authorization");
  return headers;
}
__name(withAdminNoCacheHeaders2, "withAdminNoCacheHeaders2");
__name2(withAdminNoCacheHeaders2, "withAdminNoCacheHeaders");
function sqlString(value) {
  return String(value || "").replace(/'/g, "''");
}
__name(sqlString, "sqlString");
__name2(sqlString, "sqlString");
function parseBool01(value) {
  return value === "1" || value === "true";
}
__name(parseBool01, "parseBool01");
__name2(parseBool01, "parseBool01");
function buildDateWhere({ days, yesterday, selectedDate }) {
  const nDays = Number.isFinite(days) ? days : 1;
  if (selectedDate) {
    return `date(e.ts, '-5 hours') = '${sqlString(selectedDate)}'`;
  }
  if (yesterday) {
    return `date(e.ts, '-5 hours') = date('now', '-5 hours', '-1 day')`;
  }
  if (nDays === 1) {
    return `date(e.ts, '-5 hours') = date('now', '-5 hours')`;
  }
  return `e.ts > datetime('now', '-5 hours', '-${Math.max(1, Math.min(30, nDays))} days')`;
}
__name(buildDateWhere, "buildDateWhere");
__name2(buildDateWhere, "buildDateWhere");
function classifyRefSourceSql(refCol = "entry_referer") {
  return `CASE
    WHEN ${refCol} IS NULL OR ${refCol} = '' OR ${refCol} = 'unknown' OR ${refCol} = 'direct' THEN 'direct'
    WHEN ${refCol} LIKE '%images.google.%' OR ${refCol} LIKE '%google.%/imgres%' THEN 'google_images'
    WHEN ${refCol} LIKE '%google.%' THEN 'google_search'
    WHEN ${refCol} LIKE '%bing.%/images%' THEN 'bing_images'
    WHEN ${refCol} LIKE '%bing.%' THEN 'bing_search'
    WHEN ${refCol} LIKE '%pinterest.%' THEN 'pinterest'
    WHEN ${refCol} LIKE '%facebook.%' OR ${refCol} LIKE '%fb.%' THEN 'facebook'
    WHEN ${refCol} LIKE '%twitter.%' OR ${refCol} LIKE '%t.co/%' OR ${refCol} LIKE '%x.com%' THEN 'twitter'
    WHEN ${refCol} LIKE '%chatgpt.com%' OR ${refCol} LIKE '%chat.openai.com%' THEN 'chatgpt'
    WHEN ${refCol} LIKE '%instagram.%' THEN 'instagram'
    WHEN ${refCol} LIKE '%linkedin.%' THEN 'linkedin'
    WHEN ${refCol} LIKE '%duckduckgo.%' THEN 'duckduckgo'
    WHEN ${refCol} LIKE '%k4studios.com%' THEN 'internal'
    ELSE 'unattributed'
  END`;
}
__name(classifyRefSourceSql, "classifyRefSourceSql");
__name2(classifyRefSourceSql, "classifyRefSourceSql");
async function handleInspectRequest(request, env) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "1", 10);
  const yesterday = parseBool01(url.searchParams.get("yesterday"));
  const selectedDateRaw = url.searchParams.get("date");
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDateRaw || "") ? selectedDateRaw : null;
  const hideBots = parseBool01(url.searchParams.get("hideBots"));
  const hideChardon = parseBool01(url.searchParams.get("hideChardon"));
  const excludeIp = url.searchParams.get("excludeIp") || null;
  const country = (url.searchParams.get("country") || "").trim();
  const region = (url.searchParams.get("region") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();
  const sessionId = (url.searchParams.get("session") || "").trim();
  const limit = Math.max(
    5,
    Math.min(50, parseInt(url.searchParams.get("limit") || "25", 10))
  );
  if (!country) {
    const html2 = renderInspectPage({
      title: "Inspect Geography",
      locationLabel: "Unknown location",
      backUrl: "/__k4stats",
      sessions: [],
      timeline: [],
      selectedSessionId: null,
      error: "Missing required parameter: country"
    });
    return new Response(html2, {
      status: 400,
      headers: withAdminNoCacheHeaders2({
        "Content-Type": "text/html; charset=utf-8"
      })
    });
  }
  const locationLabel = [city || null, region || null, country || null].filter(Boolean).join(", ");
  const dateWhere = buildDateWhere({ days, yesterday, selectedDate });
  const parts = [dateWhere];
  parts.push(`e.source = 'js'`);
  parts.push(`e.session_id IS NOT NULL`);
  parts.push(`e.country = '${sqlString(country)}'`);
  if (region) parts.push(`e.region = '${sqlString(region)}'`);
  if (city) parts.push(`e.city = '${sqlString(city)}'`);
  if (excludeIp)
    parts.push(`(e.ip IS NULL OR e.ip != '${sqlString(excludeIp)}')`);
  if (hideChardon) {
    parts.push(`e.city != 'Chardon'`);
    parts.push(`(e.referer IS NULL OR e.referer NOT LIKE '%localhost%')`);
  }
  if (hideBots) {
    parts.push(`COALESCE(e.is_bot, 0) = 0`);
  }
  const where = parts.length ? parts.map((p) => `(${p})`).join(" AND ") : "1=1";
  const sessionsQuery = `
    WITH session_events AS (
      SELECT
        e.session_id,
        MIN(e.ts) AS first_ts,
        MAX(e.ts) AS last_ts,
        CAST((julianday(MAX(e.ts)) - julianday(MIN(e.ts))) * 86400 AS INTEGER) AS duration_s,
        COUNT(*) AS events
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
      GROUP BY e.session_id
    ),
    entry_pages AS (
      SELECT session_id, visitor_id, page_path AS entry_page, referer AS entry_referer
      FROM (
        SELECT
          e.session_id,
          e.visitor_id,
          COALESCE(NULLIF(e.page, ''), e.target_id) AS page_path,
          e.referer,
          ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.ts ASC) AS rn
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          AND e.event_type = 'page_view'
          AND (e.page IS NOT NULL OR e.target_id IS NOT NULL)
      )
      WHERE rn = 1
    )
    SELECT
      se.session_id,
      ep.visitor_id,
      se.first_ts,
      se.last_ts,
      se.duration_s,
      se.events,
      ep.entry_page,
      ep.entry_referer,
      ${classifyRefSourceSql("ep.entry_referer")} AS ref_source
    FROM session_events se
    LEFT JOIN entry_pages ep ON ep.session_id = se.session_id
    ORDER BY se.last_ts DESC
    LIMIT ${limit}
  `;
  let sessions = [];
  try {
    const result = await env.DB.prepare(sessionsQuery).all();
    sessions = result?.results || [];
  } catch (e) {
    const html2 = renderInspectPage({
      title: "Inspect Geography",
      locationLabel,
      backUrl: "/__k4stats",
      sessions: [],
      timeline: [],
      selectedSessionId: null,
      error: `Query failed: ${e.message}`
    });
    return new Response(html2, {
      status: 500,
      headers: withAdminNoCacheHeaders2({
        "Content-Type": "text/html; charset=utf-8"
      })
    });
  }
  let timeline = [];
  if (sessionId) {
    const timelineQuery = `
      SELECT
        e.ts,
        e.event_type,
        COALESCE(NULLIF(e.page, ''), e.target_id) AS page_path,
        e.target_id,
        e.img_size,
        e.ref_type,
        SUBSTR(COALESCE(e.referer, ''), 1, 160) AS referer
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${where}
        AND e.session_id = '${sqlString(sessionId)}'
      ORDER BY e.ts ASC
      LIMIT 400
    `;
    try {
      const tRes = await env.DB.prepare(timelineQuery).all();
      timeline = tRes?.results || [];
    } catch (e) {
      timeline = [
        {
          ts: "",
          event_type: "error",
          page_path: "",
          target_id: "",
          img_size: "",
          ref_type: "",
          referer: `Timeline query failed: ${e.message}`
        }
      ];
    }
  }
  const params = new URLSearchParams();
  if (days && !Number.isNaN(days)) params.set("days", String(days));
  if (yesterday) params.set("yesterday", "1");
  if (selectedDate) params.set("date", selectedDate);
  if (hideBots) params.set("hideBots", "1");
  if (hideChardon) params.set("hideChardon", "1");
  if (excludeIp) params.set("excludeIp", excludeIp);
  const backUrl = `/__k4stats?${params.toString()}`;
  const html = renderInspectPage({
    title: "Inspect Geography",
    locationLabel,
    backUrl,
    sessions,
    timeline,
    selectedSessionId: sessionId || null,
    baseInspectParams: {
      country,
      region,
      city,
      days: String(days),
      yesterday: yesterday ? "1" : "0",
      date: selectedDate || "",
      hideBots: hideBots ? "1" : "0",
      hideChardon: hideChardon ? "1" : "0",
      excludeIp: excludeIp || ""
    }
  });
  return new Response(html, {
    status: 200,
    headers: withAdminNoCacheHeaders2({
      "Content-Type": "text/html; charset=utf-8"
    })
  });
}
__name(handleInspectRequest, "handleInspectRequest");
__name2(handleInspectRequest, "handleInspectRequest");
function calculateRiskScore(stats) {
  let score = 0;
  const rules = [];
  if (stats.is_verified_bot) {
    return { score: 0, rules: ["verified_bot"], riskLevel: 1 };
  }
  if (stats.max_velocity > 3) {
    score += 3;
    rules.push("high_velocity");
  }
  if ((stats.max_session_eps || 0) > 6) {
    score += 3;
    rules.push("inhuman_session_speed");
  }
  if ((stats.distinct_visitors || 0) >= 15 && (stats.total_requests || 0) >= 20) {
    score += 4;
    rules.push("cookie_churn");
  }
  if (stats.requests_per_hour > 50) {
    score += 2;
    rules.push("high_volume");
  }
  if (stats.image_page_pct > 95 && stats.gallery_pct < 1) {
    score += 3;
    rules.push("no_branching");
  }
  if (!stats.has_referrer && stats.total_requests > 20) {
    score += 2;
    rules.push("no_referrer_high_volume");
  }
  if (stats.is_datacenter) {
    score += 1;
    rules.push("datacenter_ip");
  }
  if (stats.days_seen > 2) {
    score += Math.min(stats.days_seen - 1, 3);
    rules.push("multi_day");
  }
  if (["NL", "FI", "PL", "RU", "CN", "SG"].includes(stats.country)) {
    const suspiciousByNoRef = !stats.has_referrer && (stats.total_requests || 0) > 10;
    const suspiciousByVolume = (stats.total_requests || 0) > 80;
    if (suspiciousByNoRef || suspiciousByVolume) {
      score += 1;
      rules.push("suspicious_origin");
    }
  }
  let riskLevel;
  if (score >= 8) {
    riskLevel = 4;
  } else if (score >= 5) {
    riskLevel = 3;
  } else if (score >= 2) {
    riskLevel = 2;
  } else {
    riskLevel = 1;
  }
  return { score, rules, riskLevel };
}
__name(calculateRiskScore, "calculateRiskScore");
__name2(calculateRiskScore, "calculateRiskScore");
function detectOGPlatform(request) {
  const ua = (request?.headers?.get("user-agent") || "").toLowerCase();
  if (ua.includes("facebookexternalhit")) return "facebook";
  if (ua.includes("facebot")) return "facebook";
  if (ua.includes("linkedinbot")) return "linkedin";
  if (ua.includes("discordbot")) return "discord";
  if (ua.includes("slackbot")) return "slack";
  if (ua.includes("twitterbot")) return "twitter";
  if (ua.includes("xbot")) return "twitter";
  if (ua.includes("whatsapp")) return "whatsapp";
  if (ua.includes("applebot")) return "apple";
  return "unknown";
}
__name(detectOGPlatform, "detectOGPlatform");
__name2(detectOGPlatform, "detectOGPlatform");
function riskLevelFromScore(score) {
  const s = Number(score || 0);
  if (s >= 8) return 4;
  if (s >= 5) return 3;
  if (s >= 2) return 2;
  return 1;
}
__name(riskLevelFromScore, "riskLevelFromScore");
__name2(riskLevelFromScore, "riskLevelFromScore");
function isLevel4BlockCandidate({
  score,
  rules,
  totalRequests,
  daysSeen,
  requestsPerHour,
  maxVelocity,
  maxSessionEps
}) {
  const s = Number(score || 0);
  if (s < 8) return false;
  const total = Number(totalRequests || 0);
  if (total < 30) return false;
  const r = new Set(Array.isArray(rules) ? rules : []);
  const hasHardSignal = r.has("cookie_churn") || r.has("inhuman_session_speed") || r.has("high_velocity");
  const isPersistent = Number(daysSeen || 1) >= 2;
  const isExtremeVolume = Number(requestsPerHour || 0) >= 120 || total >= 120;
  const isNoRefHighVolume = r.has("no_referrer_high_volume") && (Number(requestsPerHour || 0) >= 60 || total >= 60);
  const isVeryFast = Number(maxVelocity || 0) >= 5 || Number(maxSessionEps || 0) >= 10;
  return hasHardSignal || isPersistent || isExtremeVolume || isNoRefHighVolume || isVeryFast;
}
__name(isLevel4BlockCandidate, "isLevel4BlockCandidate");
__name2(isLevel4BlockCandidate, "isLevel4BlockCandidate");
async function logRawEvent(env, eventType, targetId, request, extras = {}) {
  try {
    if (!env?.DB) return;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashIP(ip);
    const ua = request.headers.get("User-Agent") || "";
    const verifiedBotName = getVerifiedBotName(ua);
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const cfAsn = request.cf?.asn || null;
    const {
      sessionId = null,
      source = "proxy",
      page = null,
      refererOverride = null,
      deltaMs = null,
      visitorId = null,
      sourceLayer = null,
      imgSize = null,
      refType = null,
      inferred = null,
      inferredFrom = null,
      assetSource = null,
      ogPlatform: ogPlatformFromExtras = null
    } = extras;
    let ogPlatform = ogPlatformFromExtras;
    if ((ogPlatform === null || ogPlatform === void 0) && assetSource === "og") {
      ogPlatform = detectOGPlatform(request);
    }
    const referer = refererOverride !== null && refererOverride !== void 0 ? refererOverride : request.headers.get("Referer") || null;
    const baseColumns = [
      "ip",
      "ip_hash",
      "event_type",
      "target_id",
      "page",
      "session_id",
      "ua",
      "referer",
      "source",
      "country",
      "region",
      "city",
      "delta_ms",
      "cf_asn",
      "visitor_id"
    ];
    const baseValues = [
      ip,
      ipHash,
      eventType,
      targetId,
      page,
      sessionId,
      ua,
      referer,
      source,
      country,
      region,
      city,
      deltaMs,
      cfAsn,
      visitorId
    ];
    const optional = [
      { name: "source_layer", value: sourceLayer },
      { name: "img_size", value: imgSize },
      { name: "ref_type", value: refType },
      { name: "inferred", value: inferred },
      { name: "inferred_from", value: inferredFrom },
      { name: "asset_source", value: assetSource },
      { name: "og_platform", value: ogPlatform }
    ].filter((o) => o.value !== null && o.value !== void 0);
    const missingColumnRegex = /no such column:\s*([a-zA-Z0-9_]+)/i;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const columns = baseColumns.concat(optional.map((o) => o.name));
        const values = baseValues.concat(optional.map((o) => o.value));
        const placeholders = columns.map(() => "?").join(", ");
        await env.DB.prepare(
          `INSERT INTO raw_events (${columns.join(", ")}) VALUES (${placeholders})`
        ).bind(...values).run();
        if (verifiedBotName) {
          await recordCrawlerStatusDaily(env, ipHash, verifiedBotName, eventType, inferredFrom);
        }
        return;
      } catch (e) {
        const msg = String(e?.message || e);
        const isMissingColumn = msg.includes("no such column") || msg.includes("has no column");
        if (!isMissingColumn) throw e;
        const match = msg.match(missingColumnRegex);
        const missing = match?.[1] || null;
        if (!missing) {
          optional.length = 0;
          continue;
        }
        const idx = optional.findIndex((o) => o.name === missing);
        if (idx >= 0) {
          optional.splice(idx, 1);
          continue;
        }
        throw e;
      }
    }
  } catch (e) {
    console.error("Raw event logging error:", e);
  }
}
__name(logRawEvent, "logRawEvent");
__name2(logRawEvent, "logRawEvent");
async function logArtView(env, type, targetId, request, sessionId = null, source = "js", visitorId = null, imgSize = null, refType = null, inferred = null, inferredFrom = null, assetSource = null) {
  const page = request.headers.get("Referer") || null;
  await logRawEvent(env, type, targetId, request, {
    sessionId,
    source,
    page,
    visitorId,
    imgSize,
    refType,
    inferred,
    inferredFrom,
    assetSource
  });
}
__name(logArtView, "logArtView");
__name2(logArtView, "logArtView");
async function logEdgeEvent(env, eventType, path, imageId, isBot, request, visitorId = null) {
  await logRawEvent(env, eventType, path, request, {
    source: "edge",
    visitorId,
    inferredFrom: imageId || null
  });
}
__name(logEdgeEvent, "logEdgeEvent");
__name2(logEdgeEvent, "logEdgeEvent");
async function updateBotIntelligence(env) {
  if (!env?.DB) return 0;
  try {
    const aggregateQuery = `
      WITH base AS (
        SELECT
          ip_hash,
          ts,
          country,
          referer,
          ua,
          event_type,
          target_id,
          page,
          source,
          session_id,
          visitor_id,
          is_bot
        FROM classified_events
        WHERE ts > datetime('now', '-7 days')
          AND ip_hash IS NOT NULL
          AND ip_hash != ''
      ),
      session_stats AS (
        SELECT
          ip_hash,
          session_id,
          COUNT(*) as session_events,
          (JULIANDAY(MAX(ts)) - JULIANDAY(MIN(ts))) * 86400.0 as session_seconds
        FROM base
        WHERE session_id IS NOT NULL
          AND session_id != ''
          AND source = 'js'
        GROUP BY ip_hash, session_id
      ),
      session_speed AS (
        SELECT
          ip_hash,
          MAX(
            session_events / CASE
              WHEN session_seconds IS NULL OR session_seconds < 1 THEN 1
              ELSE session_seconds
            END
          ) as max_session_eps
        FROM session_stats
        GROUP BY ip_hash
      ),
      ip_stats AS (
        SELECT
          ip_hash,
          COUNT(*) as total_requests,
          COUNT(DISTINCT visitor_id) as distinct_visitors,
          COUNT(DISTINCT date(ts)) as days_seen,
          MIN(ts) as first_seen,
          MAX(ts) as last_seen,
          MAX(country) as country,
          SUM(CASE WHEN referer IS NOT NULL AND referer != '' THEN 1 ELSE 0 END) > 0 as has_referrer,
          ROUND(
            100.0 * SUM(
              CASE
                WHEN event_type IN (
                  'image_page',
                  'external_image_page',
                  'chapter_exposure',
                  'external_image',
                  'direct_image'
                ) THEN 1
                ELSE 0
              END
            ) / COUNT(*),
            1
          ) as image_page_pct,
          ROUND(
            100.0 * SUM(CASE WHEN event_type IN ('gallery', 'gallery_view') THEN 1 ELSE 0 END) / COUNT(*),
            1
          ) as gallery_pct,
          MAX(CASE WHEN event_type = 'verified_bot' THEN 1 ELSE 0 END) as is_verified_bot,
          MAX(is_bot) as is_flagged_bot
        FROM base
        GROUP BY ip_hash
        HAVING COUNT(*) >= 5
            OR MAX(is_bot) = 1
            OR COUNT(DISTINCT visitor_id) >= 10
      ),
      per_hour AS (
        SELECT ip_hash, MAX(cnt) as max_per_hour
        FROM (
          SELECT ip_hash, strftime('%Y-%m-%d %H', ts) as hour_bucket, COUNT(*) as cnt
          FROM base
          GROUP BY ip_hash, hour_bucket
        )
        GROUP BY ip_hash
      ),
      per_minute AS (
        SELECT ip_hash, MAX(cnt) as max_per_minute
        FROM (
          SELECT ip_hash, strftime('%Y-%m-%d %H:%M', ts) as minute_bucket, COUNT(*) as cnt
          FROM base
          GROUP BY ip_hash, minute_bucket
        )
        GROUP BY ip_hash
      )
      SELECT
        s.*,
        COALESCE(h.max_per_hour, 0) as max_per_hour,
        COALESCE(m.max_per_minute, 0) as max_per_minute,
        COALESCE(ss.max_session_eps, 0) as max_session_eps
      FROM ip_stats s
      LEFT JOIN per_hour h USING (ip_hash)
      LEFT JOIN per_minute m USING (ip_hash)
      LEFT JOIN session_speed ss USING (ip_hash)
      ORDER BY total_requests DESC
      LIMIT 100
    `;
    const statsResult = await env.DB.prepare(aggregateQuery).all();
    const ipStats = statsResult.results || [];
    let upserted = 0;
    for (const stats of ipStats) {
      const normalizedIpHash = normalizeIpHash(stats.ip_hash);
      const isTrustedTestIp = TRUSTED_TEST_IPS.has(normalizedIpHash);
      const isDatacenter = DATACENTER_PREFIXES.some(
        (p) => String(stats.ip_hash || "").startsWith(p)
      );
      const requestsPerHour = Number(stats.max_per_hour || 0);
      const maxVelocity = Number(stats.max_per_minute || 0) / 60;
      let botName = null;
      const isVerifiedBot = Boolean(stats.is_verified_bot) || isTrustedTestIp;
      if (isTrustedTestIp) {
        botName = "trusted_tester";
      } else if (isVerifiedBot) {
        try {
          const uaRow = await env.DB.prepare(
            `SELECT ua FROM raw_events WHERE ip_hash = ? AND event_type = 'verified_bot' ORDER BY ts DESC LIMIT 1`
          ).bind(stats.ip_hash).first();
          botName = getVerifiedBotName(uaRow?.ua || "") || "verified_bot";
        } catch {
          botName = "verified_bot";
        }
      }
      const {
        score: baseScore,
        rules: baseRules,
        riskLevel: baseRiskLevel
      } = calculateRiskScore({
        total_requests: Number(stats.total_requests || 0),
        distinct_visitors: Number(stats.distinct_visitors || 0),
        days_seen: Number(stats.days_seen || 1),
        max_velocity: maxVelocity,
        max_session_eps: Number(stats.max_session_eps || 0),
        requests_per_hour: requestsPerHour,
        image_page_pct: Number(stats.image_page_pct || 0),
        gallery_pct: Number(stats.gallery_pct || 0),
        has_referrer: Boolean(stats.has_referrer),
        is_datacenter: isDatacenter,
        is_verified_bot: isVerifiedBot,
        country: stats.country || null
      });
      let score = baseScore;
      const rules = [...baseRules];
      if (stats.is_flagged_bot && !isTrustedTestIp) {
        score += 2;
        rules.push("auto_flagged_bot");
      }
      let riskLevel = Math.max(baseRiskLevel, riskLevelFromScore(score));
      if (isTrustedTestIp) {
        score = 0;
        riskLevel = 1;
        rules.length = 0;
        rules.push("trusted_test_ip_allowlist");
      }
      if (riskLevel >= 4) {
        const ok = isLevel4BlockCandidate({
          score,
          rules,
          totalRequests: Number(stats.total_requests || 0),
          daysSeen: Number(stats.days_seen || 1),
          requestsPerHour,
          maxVelocity,
          maxSessionEps: Number(stats.max_session_eps || 0)
        });
        if (!ok) riskLevel = 3;
      }
      const status = stats.is_verified_bot ? "verified" : "watching";
      const effectiveStatus = isVerifiedBot ? "verified" : "watching";
      await env.DB.prepare(
        `
        INSERT INTO suspected_bots (
          ip_hash,
          risk_level,
          risk_score,
          rules_triggered,
          first_seen,
          last_seen,
          days_seen,
          total_requests,
          max_velocity,
          image_page_pct,
          has_referrer,
          is_datacenter,
          is_verified_bot,
          bot_name,
          country,
          status,
          updated_at,
          classifier_version
        )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 3)
        ON CONFLICT(ip_hash) DO UPDATE SET
          risk_level = excluded.risk_level,
          risk_score = excluded.risk_score,
          rules_triggered = excluded.rules_triggered,
          last_seen = excluded.last_seen,
          days_seen = excluded.days_seen,
          total_requests = excluded.total_requests,
          max_velocity = excluded.max_velocity,
          image_page_pct = excluded.image_page_pct,
          has_referrer = excluded.has_referrer,
          is_datacenter = excluded.is_datacenter,
          is_verified_bot = excluded.is_verified_bot,
          bot_name = COALESCE(excluded.bot_name, suspected_bots.bot_name),
          country = COALESCE(excluded.country, suspected_bots.country),
          updated_at = datetime('now'),
          status = CASE
            WHEN suspected_bots.status IN ('blocked', 'verified') THEN suspected_bots.status
            ELSE excluded.status
          END,
          classifier_version = 3
      `
      ).bind(
        stats.ip_hash,
        riskLevel,
        score,
        JSON.stringify(rules),
        stats.first_seen,
        stats.last_seen,
        Number(stats.days_seen || 1),
        Number(stats.total_requests || 0),
        maxVelocity,
        Number(stats.image_page_pct || 0),
        stats.has_referrer ? 1 : 0,
        isDatacenter ? 1 : 0,
        isVerifiedBot ? 1 : 0,
        botName,
        stats.country,
        effectiveStatus
      ).run();
      upserted++;
    }
    return upserted;
  } catch (e) {
    console.error("Bot intelligence update error:", e);
    return 0;
  }
}
__name(updateBotIntelligence, "updateBotIntelligence");
__name2(updateBotIntelligence, "updateBotIntelligence");
async function recoverExposureFromZoom(env, request, visitorId, imageId, sessionId) {
  try {
    if (!env?.DB) return;
    if (!visitorId || !imageId || !sessionId) return;
    const existing = await env.DB.prepare(
      `
      SELECT 1
      FROM classified_events
      WHERE visitor_id = ?
        AND target_id = ?
        AND event_type = 'chapter_exposure'
        AND session_id = ?
      LIMIT 1
    `
    ).bind(visitorId, imageId, sessionId).first();
    if (existing) return;
    await logArtView2(
      env,
      "chapter_exposure",
      imageId,
      request,
      sessionId,
      "recovery",
      visitorId,
      null,
      null,
      1,
      "zoom"
    );
  } catch (err) {
    console.error("Exposure recovery failed:", err?.message || err);
  }
}
__name(recoverExposureFromZoom, "recoverExposureFromZoom");
__name2(recoverExposureFromZoom, "recoverExposureFromZoom");
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve("timeout"), ms))
  ]);
}
__name(withTimeout, "withTimeout");
__name2(withTimeout, "withTimeout");
async function logEdgeEvent2(...args) {
  try {
    return await withTimeout(logEdgeEvent(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logEdgeEvent]:", err?.message || err);
  }
}
__name(logEdgeEvent2, "logEdgeEvent2");
__name2(logEdgeEvent2, "logEdgeEvent");
async function logArtView2(...args) {
  try {
    return await withTimeout(logArtView(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logArtView]:", err?.message || err);
  }
}
__name(logArtView2, "logArtView2");
__name2(logArtView2, "logArtView");
async function logRawEvent2(...args) {
  try {
    return await logRawEvent(...args);
  } catch (err) {
    console.error("analytics failure [logRawEvent]:", err?.message || err);
  }
}
__name(logRawEvent2, "logRawEvent2");
__name2(logRawEvent2, "logRawEvent");
function readCookieValue(cookieHeader, name) {
  if (!cookieHeader || !name) return null;
  const re = new RegExp(
    "(?:^|;\\s*)" + name.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&") + "=([^;]+)"
  );
  const m = String(cookieHeader).match(re);
  return m ? m[1] : null;
}
__name(readCookieValue, "readCookieValue");
__name2(readCookieValue, "readCookieValue");
function makeSidSetCookieHeader(requestUrl, sessionId) {
  if (!sessionId) return null;
  let hostname = "";
  try {
    hostname = new URL(requestUrl).hostname || "";
  } catch (_) {
    hostname = "";
  }
  const domainAttr = hostname.endsWith("k4studios.com") ? "; Domain=.k4studios.com" : "";
  const value = encodeURIComponent(String(sessionId));
  return `k4_sid=${value}; Path=/; SameSite=Lax; Secure${domainAttr}`;
}
__name(makeSidSetCookieHeader, "makeSidSetCookieHeader");
__name2(makeSidSetCookieHeader, "makeSidSetCookieHeader");
function makeVidSetCookieHeader(requestUrl, visitorId) {
  if (!visitorId) return null;
  let hostname = "";
  try {
    hostname = new URL(requestUrl).hostname || "";
  } catch (_) {
    hostname = "";
  }
  const domainAttr = hostname.endsWith("k4studios.com") ? "; Domain=.k4studios.com" : "";
  const value = encodeURIComponent(String(visitorId));
  return `k4_vid=${value}; Path=/; Max-Age=31536000; SameSite=Lax; Secure${domainAttr}`;
}
__name(makeVidSetCookieHeader, "makeVidSetCookieHeader");
__name2(makeVidSetCookieHeader, "makeVidSetCookieHeader");
function getAllowedOrigin(request) {
  const origin = request?.headers?.get?.("Origin") || null;
  if (!origin) return "https://www.k4studios.com";
  try {
    const u = new URL(origin);
    if (u.hostname === "www.k4studios.com" || u.hostname === "k4studios.com") {
      return origin;
    }
  } catch (_) {
  }
  return "https://www.k4studios.com";
}
__name(getAllowedOrigin, "getAllowedOrigin");
__name2(getAllowedOrigin, "getAllowedOrigin");
function applyNoStore(headers) {
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return headers;
}
__name(applyNoStore, "applyNoStore");
__name2(applyNoStore, "applyNoStore");
async function handleTrackRequest(request, env, ctx) {
  if (request.method !== "POST") {
    const headers = applyNoStore(new Headers({ "Content-Type": "text/plain" }));
    return new Response("Method not allowed", { status: 405, headers });
  }
  if (isSyntheticTraffic(request)) {
    const headers = applyNoStore(new Headers());
    return new Response(null, { status: 204, headers });
  }
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      const headers2 = new Headers({
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": getAllowedOrigin(request),
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin"
      });
      applyNoStore(headers2);
      return new Response("Invalid JSON", { status: 400, headers: headers2 });
    }
    const {
      session_id = null,
      event = null,
      gallery_id = null,
      image_id = null,
      source_layer = null,
      page_type = null,
      theme = null,
      referrer: clientReferrer = null,
      page_path = null,
      event_ts_ms = null,
      // Client timestamp for timing analysis
      event_order = null
      // Event sequence within session
    } = body;
    const normalizedPagePath = typeof page_path === "string" && page_path ? page_path.startsWith("/") ? page_path : "/" + page_path : null;
    if (!event) {
      const headers2 = applyNoStore(
        new Headers({ "Content-Type": "text/plain" })
      );
      return new Response("Missing event", { status: 400, headers: headers2 });
    }
    const legacyPaths = [
      "/Photoshootsandevents/",
      "/Photography-Galleries/",
      "/Scheduled-Shoots/",
      "/Is-Winter/"
    ];
    if (normalizedPagePath && legacyPaths.some((p) => normalizedPagePath.startsWith(p))) {
      return new Response(
        JSON.stringify({ ok: true, filtered: "legacy_path" }),
        {
          status: 200,
          headers: applyNoStore(
            new Headers({ "Content-Type": "application/json" })
          )
        }
      );
    }
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || null;
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/k4_entry_ref=([^;]+)/);
    const edgeReferrer = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
    const existingVisitorId = vidCookieMatch ? vidCookieMatch[1] : null;
    const cryptoObj = globalThis?.crypto;
    const mintedVisitorId = !existingVisitorId && typeof cryptoObj?.randomUUID === "function" ? cryptoObj.randomUUID() : !existingVisitorId ? String(Date.now()) + "-" + Math.random().toString(16).slice(2) : null;
    const visitorId = existingVisitorId || mintedVisitorId;
    const sidCookie = readCookieValue(cookieHeader, "k4_sid");
    const bestSessionId = session_id || sidCookie || null;
    const bestReferrer = edgeReferrer || clientReferrer;
    const referrer = bestReferrer || "unknown";
    const normalizeGalleryTargetId = /* @__PURE__ */ __name2((path) => {
      if (typeof path !== "string") return null;
      return path.replace(/^\/Galleries\//, "").replace(/^\/Other\//, "").replace(/\/$/, "");
    }, "normalizeGalleryTargetId");
    const inferImageIdFromPath = /* @__PURE__ */ __name2((path) => {
      if (typeof path !== "string") return null;
      return path.match(/\/(i-[a-zA-Z0-9_-]+)\/?$/)?.[1] || null;
    }, "inferImageIdFromPath");
    const storedEventType = event === "zoom_open" || event === "zoom" ? "xl_zoom" : event;
    let targetId = null;
    if (storedEventType === "page_view") {
      targetId = normalizedPagePath;
    } else if (storedEventType === "chapter_view") {
      targetId = image_id || inferImageIdFromPath(normalizedPagePath);
    } else if (storedEventType === "xl_zoom") {
      targetId = image_id || inferImageIdFromPath(normalizedPagePath);
      if (event === "xl_zoom" && targetId && bestSessionId && visitorId) {
        ctx?.waitUntil?.(
          recoverExposureFromZoom(
            env,
            request,
            visitorId,
            targetId,
            bestSessionId
          )
        );
      }
    } else if (storedEventType === "gallery_view") {
      targetId = gallery_id || normalizeGalleryTargetId(normalizedPagePath);
    } else if (storedEventType === "theme_click") {
      targetId = theme || normalizedPagePath || null;
    } else {
      targetId = image_id || gallery_id || normalizedPagePath || null;
    }
    ctx?.waitUntil?.(
      logRawEvent2(env, storedEventType, targetId, request, {
        sessionId: bestSessionId,
        source: "js",
        visitorId,
        sourceLayer: typeof source_layer === "string" && source_layer ? source_layer : null,
        // Use the client-reported page_path for easier SQL grouping.
        page: normalizedPagePath || null,
        // Preserve the best external referrer (edge cookie beats client hint).
        refererOverride: bestReferrer || null
      })
    );
    const sidSetCookie = makeSidSetCookieHeader(request.url, bestSessionId);
    const vidSetCookie = existingVisitorId ? null : makeVidSetCookieHeader(request.url, visitorId);
    const headers = new Headers({
      "Access-Control-Allow-Origin": getAllowedOrigin(request),
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin"
    });
    applyNoStore(headers);
    if (sidSetCookie) headers.append("Set-Cookie", sidSetCookie);
    if (vidSetCookie) headers.append("Set-Cookie", vidSetCookie);
    return new Response(null, {
      status: 204,
      headers
    });
  } catch (err) {
    console.error("Track error:", err);
    const headers = applyNoStore(new Headers({ "Content-Type": "text/plain" }));
    return new Response("Error", { status: 500, headers });
  }
}
__name(handleTrackRequest, "handleTrackRequest");
__name2(handleTrackRequest, "handleTrackRequest");
function handleTrackOptions() {
  return new Response(null, {
    status: 204,
    headers: applyNoStore(
      new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      })
    )
  });
}
__name(handleTrackOptions, "handleTrackOptions");
__name2(handleTrackOptions, "handleTrackOptions");
const PIXEL_LAYER_BY_ACTION = {
  chapter_view: "sister_pixel_v1",
  xl_zoom: "zoom_pixel_v1",
  zoom_open: "zoom_pixel_v1",
  grid_open: "grid_open_pixel_v1",
  theme_grid_open: "theme_grid_open_pixel_v1",
  grid_image_click: "grid_image_click_pixel_v1",
  theme_grid_image_click: "theme_grid_image_click_pixel_v1",
  grid_show_more: "grid_show_more_pixel_v1",
  grid_show_previous: "grid_show_previous_pixel_v1",
  cowboy_jump: "cowboy_jump_pixel_v1",
  order_clicked: "order_clicked_pixel_v1",
  order_submitted: "order_submitted_pixel_v1",
  series_info: "series_info_pixel_v1",
  more_info_open: "more_info_open_pixel_v1",
  sister_image_click: "sister_image_click_pixel_v1",
  slideshow_start: "slideshow_start_pixel_v1",
  slideshow_nav_prev: "slideshow_nav_prev_pixel_v1",
  slideshow_nav_next: "slideshow_nav_next_pixel_v1",
  browse_all_open: "browse_all_open_pixel_v1",
  browse_all_image_click: "browse_all_image_click_pixel_v1",
  gallery_hero_click: "gallery_hero_click_pixel_v1",
  gallery_preview_click: "gallery_preview_click_pixel_v1",
  gallery_explore_click: "gallery_explore_click_pixel_v1",
  gallery_landing_view: "gallery_landing_view_pixel_v1",
  exit_to_gallery: "exit_to_gallery_pixel_v1",
  scroll_25: "scroll_25_pixel_v1",
  scroll_50: "scroll_50_pixel_v1",
  scroll_75: "scroll_75_pixel_v1",
  scroll_100: "scroll_100_pixel_v1",
  collector_notes_open: "collector_notes_open_pixel_v1",
  guide_open: "guide_open_pixel_v1",
  guide_close: "guide_close_pixel_v1",
  guide_done: "guide_done_pixel_v1",
  guide_click_outside: "guide_click_outside_pixel_v1"
};
const ONE_BY_ONE_GIF_BYTES = new Uint8Array([
  71,
  73,
  70,
  56,
  57,
  97,
  1,
  0,
  1,
  0,
  128,
  0,
  0,
  0,
  0,
  0,
  255,
  255,
  255,
  33,
  249,
  4,
  1,
  0,
  0,
  1,
  0,
  44,
  0,
  0,
  0,
  0,
  1,
  0,
  1,
  0,
  0,
  2,
  2,
  68,
  1,
  0,
  59
]);
async function handleStatePixelRequest(request, env, ctx) {
  const headers = applyNoStore(
    new Headers({
      "Content-Type": "image/gif",
      "X-Content-Type-Options": "nosniff"
    })
  );
  if (isSyntheticTraffic(request)) {
    return new Response(ONE_BY_ONE_GIF_BYTES, { status: 200, headers });
  }
  try {
    const url = new URL(request.url);
    const pixelType = (url.searchParams.get("t") || "").trim().toLowerCase();
    if (pixelType !== "action" && pixelType !== "image" && pixelType !== "page") {
      return new Response(ONE_BY_ONE_GIF_BYTES, { status: 200, headers });
    }
    const action = (url.searchParams.get("e") || "").trim();
    if (pixelType === "action" && !action) {
      return new Response(ONE_BY_ONE_GIF_BYTES, { status: 200, headers });
    }
    const imageId = (url.searchParams.get("id") || "").trim() || null;
    const galleryId = (url.searchParams.get("g") || "").trim() || null;
    const sourceLayer = (url.searchParams.get("sl") || "").trim() || (pixelType === "action" ? PIXEL_LAYER_BY_ACTION[action] || `${action}_pixel_v1` : pixelType === "image" ? "sister_pixel_v1" : "page_pixel_v1");
    const pageType = (url.searchParams.get("pt") || "").trim() || null;
    const theme = (url.searchParams.get("th") || "").trim() || null;
    const trigger = (url.searchParams.get("tr") || "").trim() || (pixelType === "action" ? action : pixelType);
    const pagePathParam = (url.searchParams.get("path") || "").trim() || null;
    const cookieHeader = request.headers.get("cookie") || "";
    const sidCookie = readCookieValue(cookieHeader, "k4_sid");
    const sidQuery = (url.searchParams.get("sid") || "").trim() || null;
    const bestSessionId = sidCookie || sidQuery || null;
    const vidCookie = readCookieValue(cookieHeader, "k4_vid");
    const existingVisitorId = vidCookie || null;
    const cryptoObj = globalThis?.crypto;
    const mintedVisitorId = !existingVisitorId && typeof cryptoObj?.randomUUID === "function" ? cryptoObj.randomUUID() : !existingVisitorId ? String(Date.now()) + "-" + Math.random().toString(16).slice(2) : null;
    const visitorId = existingVisitorId || mintedVisitorId;
    const httpReferer = request.headers.get("Referer") || null;
    let normalizedPagePath = null;
    if (httpReferer) {
      try {
        normalizedPagePath = new URL(httpReferer).pathname || null;
      } catch (_) {
        normalizedPagePath = null;
      }
    }
    const pagePath = pagePathParam || normalizedPagePath || null;
    // Read k4_entry_ref cookie (set by edge proxy) for the real external referrer.
    // The HTTP Referer for pixel requests is always the hosting k4studios page,
    // which is useless for attribution. The cookie captures the true entry source.
    const entryRefMatch = cookieHeader.match(/k4_entry_ref=([^;]+)/);
    const entryReferer = entryRefMatch ? decodeURIComponent(entryRefMatch[1]) : null;
    const storedReferer = entryReferer || httpReferer;
    const targetId = pixelType === "page" ? pagePath : imageId || galleryId || pagePath || null;
    const eventType = pixelType === "image" ? "state_pixel" : pixelType === "page" ? "page_pixel" : "action_pixel";
    ctx?.waitUntil?.(
      logRawEvent2(env, eventType, targetId, request, {
        sessionId: bestSessionId,
        source: "pixel",
        visitorId,
        sourceLayer,
        page: pagePath,
        refererOverride: storedReferer,
        pageType,
        theme,
        trigger
      })
    );
    const sidSetCookie = makeSidSetCookieHeader(request.url, bestSessionId);
    const vidSetCookie = existingVisitorId ? null : makeVidSetCookieHeader(request.url, visitorId);
    if (sidSetCookie) headers.append("Set-Cookie", sidSetCookie);
    if (vidSetCookie) headers.append("Set-Cookie", vidSetCookie);
    return new Response(ONE_BY_ONE_GIF_BYTES, { status: 200, headers });
  } catch (err) {
    console.error("State pixel error:", err);
    return new Response(ONE_BY_ONE_GIF_BYTES, { status: 200, headers });
  }
}
__name(handleStatePixelRequest, "handleStatePixelRequest");
__name2(handleStatePixelRequest, "handleStatePixelRequest");
async function handleEdgeEvent(request, env) {
  try {
    if (isSyntheticTraffic(request)) {
      return new Response("OK", { status: 200 });
    }
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST"
        }
      });
    }
    const rawType = data.event_type || data.eventType || "404";
    const eventType = String(rawType).trim() || "404";
    const path = data.path || data.page_path || null;
    const imageId = data.image_id || data.imageId || null;
    await logEdgeEvent2(
      env,
      eventType,
      path || "unknown",
      imageId,
      false,
      request,
      null
    );
    return new Response("OK", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST"
      }
    });
  } catch (err) {
    console.error("Edge event error:", err);
    const url = new URL(request.url);
    const debug = url.searchParams.get("k4debug") === "1";
    return new Response(
      debug ? "Error: " + (err?.message || String(err)) : "Error",
      { status: 500 }
    );
  }
}
__name(handleEdgeEvent, "handleEdgeEvent");
__name2(handleEdgeEvent, "handleEdgeEvent");
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
__name(handleEdgeEventOptions, "handleEdgeEventOptions");
__name2(handleEdgeEventOptions, "handleEdgeEventOptions");
function withAdminNoCacheHeaders3(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Vary", "Authorization");
  return headers;
}
__name(withAdminNoCacheHeaders3, "withAdminNoCacheHeaders3");
__name2(withAdminNoCacheHeaders3, "withAdminNoCacheHeaders");
function checkAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  return authHeader === expected;
}
__name(checkAuth, "checkAuth");
__name2(checkAuth, "checkAuth");
function clampInt(value, { min, max, fallback }) {
  const n = parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
__name(clampInt, "clampInt");
__name2(clampInt, "clampInt");
async function handleExportCSV(request, env) {
  if (!checkAuth(request, env)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: withAdminNoCacheHeaders3({
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
    const headers = [
      "ts",
      "session_id",
      "event_type",
      "target_id",
      "page",
      "referer",
      "ua",
      "country",
      "region",
      "city",
      "visitor_id"
    ];
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h] || "";
        const escaped = String(val).replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes('"') ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(","));
    }
    const csv = csvRows.join("\n");
    const filename = `k4-analytics-${yesterday ? "yesterday" : days + "days"}-${/* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: withAdminNoCacheHeaders3({
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`
      })
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(`Export error: ${err.message}`, {
      status: 500,
      headers: withAdminNoCacheHeaders3({
        "Content-Type": "text/plain; charset=utf-8"
      })
    });
  }
}
__name(handleExportCSV, "handleExportCSV");
__name2(handleExportCSV, "handleExportCSV");
async function handleBlockIP(request, env) {
  try {
    const { ip_hash, reason } = await request.json();
    const normalizedIpHash = normalizeIpHash(ip_hash);
    if (!normalizedIpHash) {
      return new Response(JSON.stringify({ error: "ip_hash required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (TRUSTED_TEST_IPS.has(normalizedIpHash)) {
      return new Response(JSON.stringify({ error: "trusted_test_ip_cannot_be_blocked", ip_hash: normalizedIpHash }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    const suspectInfo = await env.DB.prepare(
      `
      SELECT risk_level, risk_score, rules_triggered, total_requests 
      FROM suspected_bots WHERE ip_hash = ?
    `
    ).bind(normalizedIpHash).first();
    await env.DB.prepare(
      `
      INSERT INTO blocked_ips (ip_hash, risk_level, risk_score, rules_triggered, total_requests, reason, blocked_by)
      VALUES (?, ?, ?, ?, ?, ?, 'manual')
      ON CONFLICT(ip_hash) DO UPDATE SET
        is_active = 1,
        blocked_at = datetime('now'),
        reason = excluded.reason,
        unblocked_at = NULL
    `
    ).bind(
      normalizedIpHash,
      suspectInfo?.risk_level || 4,
      suspectInfo?.risk_score || 0,
      suspectInfo?.rules_triggered || "[]",
      suspectInfo?.total_requests || 0,
      reason || "Manual block from dashboard"
    ).run();
    await env.DB.prepare(
      `
      UPDATE suspected_bots SET status = 'blocked', updated_at = datetime('now')
      WHERE ip_hash = ?
    `
    ).bind(normalizedIpHash).run();
    return new Response(JSON.stringify({ success: true, ip_hash: normalizedIpHash }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Block IP error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleBlockIP, "handleBlockIP");
__name2(handleBlockIP, "handleBlockIP");
async function handleBulkBlockIP(request, env) {
  try {
    const { ip_hashes, reason } = await request.json();
    const hashes = Array.isArray(ip_hashes) ? ip_hashes.map((v) => normalizeIpHash(v)).filter(Boolean) : [];
    if (hashes.length === 0) {
      return new Response(JSON.stringify({ error: "ip_hashes required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const filteredHashes = hashes.filter((v) => !TRUSTED_TEST_IPS.has(v));
    const skippedTrusted = hashes.filter((v) => TRUSTED_TEST_IPS.has(v));
    let blocked = 0;
    for (const ip_hash of filteredHashes) {
      const suspectInfo = await env.DB.prepare(
        `
        SELECT risk_level, risk_score, rules_triggered, total_requests
        FROM suspected_bots WHERE ip_hash = ?
      `
      ).bind(ip_hash).first();
      await env.DB.prepare(
        `
        INSERT INTO blocked_ips (ip_hash, risk_level, risk_score, rules_triggered, total_requests, reason, blocked_by)
        VALUES (?, ?, ?, ?, ?, ?, 'manual')
        ON CONFLICT(ip_hash) DO UPDATE SET
          is_active = 1,
          blocked_at = datetime('now'),
          reason = excluded.reason,
          unblocked_at = NULL
      `
      ).bind(
        ip_hash,
        suspectInfo?.risk_level || 4,
        suspectInfo?.risk_score || 0,
        suspectInfo?.rules_triggered || "[]",
        suspectInfo?.total_requests || 0,
        reason || "Bulk Level 5 block from dashboard"
      ).run();
      await env.DB.prepare(
        `
        UPDATE suspected_bots SET status = 'blocked', updated_at = datetime('now')
        WHERE ip_hash = ?
      `
      ).bind(ip_hash).run();
      blocked++;
    }
    return new Response(JSON.stringify({ success: true, blocked, skipped_trusted: skippedTrusted }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Bulk block IP error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleBulkBlockIP, "handleBulkBlockIP");
__name2(handleBulkBlockIP, "handleBulkBlockIP");
async function handleUnblockIP(request, env) {
  try {
    const { ip_hash } = await request.json();
    if (!ip_hash) {
      return new Response(JSON.stringify({ error: "ip_hash required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    await env.DB.prepare(
      `
      UPDATE blocked_ips 
      SET is_active = 0, unblocked_at = datetime('now')
      WHERE ip_hash = ?
    `
    ).bind(ip_hash).run();
    await env.DB.prepare(
      `
      UPDATE suspected_bots SET status = 'watching', updated_at = datetime('now')
      WHERE ip_hash = ?
    `
    ).bind(ip_hash).run();
    return new Response(JSON.stringify({ success: true, ip_hash }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Unblock IP error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleUnblockIP, "handleUnblockIP");
__name2(handleUnblockIP, "handleUnblockIP");
async function handleRefreshBots(request, env) {
  try {
    const count = await updateBotIntelligence(env);
    return new Response(JSON.stringify({ success: true, updated: count }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Refresh bots error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleRefreshBots, "handleRefreshBots");
__name2(handleRefreshBots, "handleRefreshBots");
async function handleRecentEvents(request, env) {
  if (!checkAuth(request, env)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: withAdminNoCacheHeaders3({
        "WWW-Authenticate": 'Basic realm="K4 Analytics Recent"',
        "Content-Type": "text/plain"
      })
    });
  }
  if (!env?.DB) {
    return new Response(JSON.stringify({ ok: false, error: "DB not bound" }), {
      status: 500,
      headers: withAdminNoCacheHeaders3({ "Content-Type": "application/json" })
    });
  }
  const url = new URL(request.url);
  const minutes = clampInt(url.searchParams.get("minutes"), {
    min: 1,
    max: 60 * 24 * 14,
    fallback: 180
  });
  const limit = clampInt(url.searchParams.get("limit"), {
    min: 1,
    max: 500,
    fallback: 100
  });
  const includeUa = url.searchParams.get("ua") === "1";
  const eventType = (url.searchParams.get("event") || "").trim() || null;
  const visitorId = (url.searchParams.get("visitor") || "").trim() || null;
  const sessionId = (url.searchParams.get("session") || "").trim() || null;
  const source = (url.searchParams.get("source") || "").trim() || null;
  const where = [`ts > datetime('now', '-5 hours', '-${minutes} minutes')`];
  const bindings = [];
  if (eventType) {
    where.push("event_type = ?");
    bindings.push(eventType);
  }
  if (visitorId) {
    where.push("visitor_id = ?");
    bindings.push(visitorId);
  }
  if (sessionId) {
    where.push("session_id = ?");
    bindings.push(sessionId);
  }
  if (source) {
    where.push("source = ?");
    bindings.push(source);
  }
  try {
    const uaSelect = includeUa ? ", r.ua" : "";
    const query = `
      SELECT
        r.ts,
        r.event_type,
        r.target_id,
        r.page,
        r.source,
        r.session_id,
        r.visitor_id,
        r.ip_hash,
        r.country,
        r.region,
        r.city
        ${uaSelect},
        r.cf_asn,
        COALESCE(r.is_bot, 0) as is_bot,
        COALESCE(sb.risk_level, 0) as bot_risk_level,
        sb.status as bot_status,
        COALESCE(sb.is_datacenter, 0) as bot_is_datacenter,
        COALESCE(sb.is_verified_bot, 0) as bot_is_verified_bot,
        CASE WHEN bi.ip_hash IS NOT NULL AND bi.is_active = 1 THEN 1 ELSE 0 END as is_blocked
      FROM classified_events r
      LEFT JOIN suspected_bots sb ON sb.ip_hash = r.ip_hash
      LEFT JOIN blocked_ips bi ON bi.ip_hash = r.ip_hash
      WHERE ${where.join(" AND ").replace(/\bevent_type\b/g, "r.event_type").replace(/\bvisitor_id\b/g, "r.visitor_id").replace(/\bsession_id\b/g, "r.session_id").replace(/\bsource\b/g, "r.source")}
      ORDER BY r.ts DESC
      LIMIT ${limit}
    `;
    const result = await env.DB.prepare(query).bind(...bindings).all();
    const rows = result.results || [];
    return new Response(
      JSON.stringify({
        ok: true,
        minutes,
        limit,
        filters: { eventType, visitorId, sessionId, source },
        includeUa,
        rows
      }),
      {
        status: 200,
        headers: withAdminNoCacheHeaders3({
          "Content-Type": "application/json"
        })
      }
    );
  } catch (e) {
    console.error("Recent events error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      {
        status: 500,
        headers: withAdminNoCacheHeaders3({
          "Content-Type": "application/json"
        })
      }
    );
  }
}
__name(handleRecentEvents, "handleRecentEvents");
__name2(handleRecentEvents, "handleRecentEvents");
function checkBasicAuth2(request, env) {
  const auth = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  return auth === expected;
}
__name(checkBasicAuth2, "checkBasicAuth2");
__name2(checkBasicAuth2, "checkBasicAuth");
function requireAuth2() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="K4 Analytics"',
      "Content-Type": "text/plain",
      "Cache-Control": "no-store"
    }
  });
}
__name(requireAuth2, "requireAuth2");
__name2(requireAuth2, "requireAuth");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__k4stats")) {
      if (!checkBasicAuth2(request, env)) {
        return requireAuth2();
      }
    }
    if ((url.pathname.startsWith("/track") || url.pathname.startsWith("/__k4e") || url.pathname.startsWith("/_state")) && request.cf?.botManagement?.verifiedBot) {
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/__k4stats") {
      return handleDashboardRequest2(request, env, ctx);
    }
    if (url.pathname === "/__k4stats/inspect") {
      return handleInspectRequest(request, env, ctx);
    }
    if (url.pathname === "/__k4stats/export") {
      return handleExportCSV(request, env);
    }
    if (url.pathname === "/__k4stats/block" && request.method === "POST") {
      return handleBlockIP(request, env);
    }
    if (url.pathname === "/__k4stats/block-bulk" && request.method === "POST") {
      return handleBulkBlockIP(request, env);
    }
    if (url.pathname === "/__k4stats/unblock" && request.method === "POST") {
      return handleUnblockIP(request, env);
    }
    if (url.pathname === "/__k4stats/refresh-bots" && request.method === "POST") {
      return handleRefreshBots(request, env);
    }
    if (url.pathname === "/__k4stats/recent") {
      return handleRecentEvents(request, env);
    }
    if (url.pathname === "/track" || url.pathname === "/__k4e") {
      if (request.method === "OPTIONS") {
        return handleTrackOptions();
      }
      return handleTrackRequest(request, env, ctx);
    }
    if (url.pathname === "/_state") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        const headers = applyNoStore(new Headers({ "Content-Type": "text/plain" }));
        return new Response("Method not allowed", { status: 405, headers });
      }
      return handleStatePixelRequest(request, env, ctx);
    }
    if (url.pathname === "/edge-event") {
      if (request.method === "OPTIONS") {
        return handleEdgeEventOptions();
      }
      return handleEdgeEvent(request, env);
    }
    return fetch(request);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
