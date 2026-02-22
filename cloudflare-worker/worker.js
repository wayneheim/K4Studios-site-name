------formdata-undici-008560647731
Content-Disposition: form-data; name="metadata"

{"main_module":"k4-image-proxy.js","bindings":[{"name":"ANALYTICS_ENABLED","type":"plain_text","text":"true"},{"name":"DB","type":"d1","id":"f2c159b0-b0f1-4056-934c-90e9b8a92e14"},{"name":"ANALYTICS","type":"service","service":"k4-analytics"}],"compatibility_date":"2024-01-01","compatibility_flags":[]}
------formdata-undici-008560647731
Content-Disposition: form-data; name="k4-image-proxy.js"; filename="k4-image-proxy.js"
Content-Type: application/javascript+module

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/shared/constants.js
var ALLOWED_BOTS = /(googlebot|google-inspectiontool|adsbot-google|googleother|apis-google|bingbot|bingpreview|msnbot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|ahrefssiteaudit|semrushbot|screaming\s*frog|sitebulb|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot|slackbot|discordbot|telegrambot|uptimerobot|uptime[- ]?kuma)/i;
var BLOCKED_BOTS = /(python|curl|scrapy|spider(?!.*google)|httpclient|axios|wget|postman|libwww-perl|powershell|java\/|node-fetch|okhttp)/i;
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
  // Amazon AWS
  8075,
  // Microsoft Azure
  15169,
  396982,
  // Google Cloud
  13335
  // Cloudflare
];

// src/shared/utils.js
function getVerifiedBotName(ua) {
  if (!ua) return null;
  for (const bot of VERIFIED_BOTS) {
    if (bot.pattern.test(ua)) return bot.name;
  }
  return null;
}
__name(getVerifiedBotName, "getVerifiedBotName");
function isVerifiedSearchBot(ua) {
  return getVerifiedBotName(ua) !== null;
}
__name(isVerifiedSearchBot, "isVerifiedSearchBot");
function hashIP(ip) {
  if (!ip) return "unknown";
  const parts = ip.split(".");
  if (parts.length < 3) return ip.slice(0, 8);
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}
__name(hashIP, "hashIP");

// src/shared/syntheticTraffic.js
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

// src/analytics/classifier.js
var SEARCH_BOT_PATTERN = /(googlebot|google-inspectiontool|googleother|bingbot|bingpreview|msnbot|duckduckbot|yandex|baiduspider|slurp|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot)/i;
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
function isSearchBot(request) {
  const ua = request.headers.get("User-Agent") || "";
  return SEARCH_BOT_PATTERN.test(ua);
}
__name(isSearchBot, "isSearchBot");

// src/analytics/storage.js
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
function riskLevelFromScore(score) {
  const s = Number(score || 0);
  if (s >= 8) return 4;
  if (s >= 5) return 3;
  if (s >= 2) return 2;
  return 1;
}
__name(riskLevelFromScore, "riskLevelFromScore");
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
async function logRawEvent(env, eventType, targetId, request, extras = {}) {
  try {
    if (!env?.DB) return;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashIP(ip);
    const ua = request.headers.get("User-Agent") || "";
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
async function logArtView(env, type, targetId, request, sessionId = null, source = "js", visitorId = null, imgSize = null, refType = null, inferred = null, inferredFrom = null, assetSource = null) {
  const page = request.headers.get("Referer") || null;
  await logRawEvent(env, type, targetId, request, { sessionId, source, page, visitorId, imgSize, refType, inferred, inferredFrom, assetSource });
}
__name(logArtView, "logArtView");
async function logEdgeEvent(env, eventType, path, imageId, isBot, request, visitorId = null) {
  await logRawEvent(env, eventType, path, request, { source: "edge", visitorId, inferredFrom: imageId || null });
}
__name(logEdgeEvent, "logEdgeEvent");
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
      const isDatacenter = DATACENTER_PREFIXES.some((p) => String(stats.ip_hash || "").startsWith(p));
      const requestsPerHour = Number(stats.max_per_hour || 0);
      const maxVelocity = Number(stats.max_per_minute || 0) / 60;
      let botName = null;
      if (stats.is_verified_bot) {
        try {
          const uaRow = await env.DB.prepare(
            `SELECT ua FROM raw_events WHERE ip_hash = ? AND event_type = 'verified_bot' ORDER BY ts DESC LIMIT 1`
          ).bind(stats.ip_hash).first();
          botName = getVerifiedBotName(uaRow?.ua || "") || "verified_bot";
        } catch {
          botName = "verified_bot";
        }
      }
      const { score: baseScore, rules: baseRules, riskLevel: baseRiskLevel } = calculateRiskScore({
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
        is_verified_bot: Boolean(stats.is_verified_bot),
        country: stats.country || null
      });
      let score = baseScore;
      const rules = [...baseRules];
      if (stats.is_flagged_bot) {
        score += 2;
        rules.push("auto_flagged_bot");
      }
      let riskLevel = Math.max(baseRiskLevel, riskLevelFromScore(score));
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
      await env.DB.prepare(`
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
      `).bind(
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
        stats.is_verified_bot ? 1 : 0,
        botName,
        stats.country,
        status
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
async function logVerifiedBot(env, imageId, request) {
  await logRawEvent(env, "verified_bot", imageId, request, { source: "edge" });
}
__name(logVerifiedBot, "logVerifiedBot");

// src/analytics/queries.js
var notCacheWarmer = /* @__PURE__ */ __name((alias) => `LOWER(COALESCE(${alias}.ua, '')) NOT LIKE '%k4-cache-warmer%'`, "notCacheWarmer");
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
function formatAssetSourceLabel(assetSourceLabel, ogPlatform) {
  if (!assetSourceLabel) return null;
  if (assetSourceLabel !== "Open Graph") return assetSourceLabel;
  const plat = formatOGPlatformLabel(ogPlatform);
  if (!plat) return "Open Graph";
  return `Open Graph (${plat})`;
}
__name(formatAssetSourceLabel, "formatAssetSourceLabel");
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
    const res = await fetch(IMAGE_ID_MAP_URL, { headers: { "Accept": "application/json" } });
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
function getCanonicalGalleryPathForImageId(imageIdMap, imageId) {
  if (!imageIdMap || !imageId) return null;
  const raw = imageIdMap[imageId];
  const path = Array.isArray(raw) ? raw[0] : raw;
  if (!path || typeof path !== "string") return null;
  return String(path).replace(/\/+$/, "");
}
__name(getCanonicalGalleryPathForImageId, "getCanonicalGalleryPathForImageId");
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
async function getArtViews(env, filters) {
  const { dateClause, baseDateClause, hideBotsPredicate, hideBots } = filters;
  const notBotWhenHide = /* @__PURE__ */ __name((alias) => hideBots ? `AND COALESCE(${alias}.is_bot, 0) = 0` : "", "notBotWhenHide");
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
      entryRefCountsObj: {},
      imageAccessOverview: [],
      viewerDepth: { avgScore: 0, highDepthCount: 0, totalViewers: 0, distribution: [] },
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
      WITH ranked AS (
        SELECT
          e.visitor_id as visitor_id,
          e.target_id as target_id,
          e.event_type as event_type,
          COALESCE(e.session_id, 'd:' || date(e.ts)) as session_bucket,
          LOWER(COALESCE(hp.device_type, 'unknown')) as device,
          e.country as country,
          e.region as region,
          e.city as city,
          e.page as page,
          e.referer as referer,
          ROW_NUMBER() OVER (
            PARTITION BY e.visitor_id, e.target_id, COALESCE(e.session_id, 'd:' || date(e.ts))
            ORDER BY e.ts DESC
          ) as rn
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE e.event_type IN ('chapter_exposure', 'chapter_view')
          AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
      ),
      chapter_pairs AS (
        SELECT visitor_id, target_id, event_type, session_bucket, device, country, region, city, page, referer
        FROM ranked
        WHERE rn = 1
      )
      SELECT
        cp.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT cp.visitor_id) as unique_viewers,
        GROUP_CONCAT(DISTINCT cp.device) as device_types,
        GROUP_CONCAT(DISTINCT cp.country) as countries,
        MAX(CASE WHEN cp.event_type = 'chapter_view' THEN 1 ELSE 0 END) as has_js_view,
        (
          SELECT cp2.page
          FROM chapter_pairs cp2
          WHERE cp2.target_id = cp.target_id
            AND cp2.page IS NOT NULL
          GROUP BY cp2.page
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_page,
        (
          SELECT cp2.referer
          FROM chapter_pairs cp2
          WHERE cp2.target_id = cp.target_id
            AND cp2.referer IS NOT NULL
            AND cp2.referer NOT LIKE '%k4studios.com%'
          GROUP BY cp2.referer
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as best_referer,
        (
          SELECT cp2.country
          FROM chapter_pairs cp2
          WHERE cp2.target_id = cp.target_id
            AND cp2.country IS NOT NULL
          GROUP BY cp2.country, cp2.region, cp2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_country,
        (
          SELECT cp2.region
          FROM chapter_pairs cp2
          WHERE cp2.target_id = cp.target_id
            AND cp2.country IS NOT NULL
          GROUP BY cp2.country, cp2.region, cp2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_region,
        (
          SELECT cp2.city
          FROM chapter_pairs cp2
          WHERE cp2.target_id = cp.target_id
            AND cp2.country IS NOT NULL
          GROUP BY cp2.country, cp2.region, cp2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM chapter_pairs cp
      GROUP BY cp.target_id
      ORDER BY views DESC
      LIMIT 2000
    `;
    const result = await env.DB.prepare(topChaptersQuery).all();
    topChapters = (result.results || []).map((r) => {
      const referrerSource = getReferrerSource(r.best_referer);
      return {
        type: "chapter_exposure",
        target_id: r.target_id,
        views: r.views,
        unique_viewers: r.unique_viewers,
        has_js_view: r.has_js_view === 1,
        devices: (r.device_types || "").split(",").map((s) => (s || "").trim()).filter(Boolean),
        countries: r.countries,
        url: r.best_page || null,
        geo: { country: r.geo_country, region: r.geo_region, city: r.geo_city },
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
        GROUP_CONCAT(DISTINCT LOWER(COALESCE(hp.device_type, 'unknown'))) as device_types
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
      devices: (r.device_types || "").split(",").map((s) => (s || "").trim()).filter(Boolean)
    }));
    const getLeafKey = /* @__PURE__ */ __name((path) => {
      const parts = String(path || "").split("/").filter(Boolean);
      return parts.slice(-2).join("/") || path;
    }, "getLeafKey");
    const merged = /* @__PURE__ */ new Map();
    for (const g of rawGalleries) {
      const key = getLeafKey(g.target_id);
      if (merged.has(key)) {
        const existing = merged.get(key);
        existing.views += g.views;
        existing.unique_viewers = Math.max(existing.unique_viewers, g.unique_viewers);
        g.devices.forEach((d) => {
          if (!existing.devices.includes(d)) existing.devices.push(d);
        });
        if (g.target_id.length > existing.target_id.length) existing.target_id = g.target_id;
      } else {
        merged.set(key, { ...g });
      }
    }
    topGalleries = Array.from(merged.values()).sort((a, b) => b.views - a.views).slice(0, 15);
  } catch (e) {
    console.log("Top galleries query failed:", e.message);
  }
  let viewerDepth = { avgScore: 0, highDepthCount: 0, totalViewers: 0, distribution: [], maxScore: 0 };
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
          { label: "Collectors (20+)", count: depthResult.high_depth_count || 0 },
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
      result = await env.DB.prepare(externalQueryWithRefTypeAndAssetSource).all();
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
    const accessPriority = { external_referral: 0, direct: 1, internal_navigation: 2, unknown: 3 };
    externalImageAccess = (result.results || []).map((r) => {
      const assetSourceLabel = formatAssetSourceLabel(getAssetSourceLabel(r.asset_source), r.og_platform);
      const accessType = r.ref_type ? r.ref_type === "direct" ? "direct" : r.ref_type === "external" ? "external_referral" : r.ref_type === "internal" ? "internal_navigation" : "unknown" : getAccessType(r.referer);
      const referrerSource = accessType === "external_referral" ? getReferrerSource(r.referer) || "Other" : accessType === "direct" ? "Direct" : accessType === "internal_navigation" ? "Internal" : "Unknown";
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
        access_type: accessType,
        referrer_source: referrerSource,
        asset_source: r.asset_source || null,
        asset_source_label: assetSourceLabel,
        og_platform: r.og_platform || null,
        referer_host: refererHost,
        country: r.country,
        geo: { country: r.geo_country, region: r.geo_region, city: r.geo_city }
      };
    }).sort((a, b) => b.hits - a.hits || (accessPriority[a.access_type] ?? 9) - (accessPriority[b.access_type] ?? 9));
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
      const assetLabel = formatAssetSourceLabel(getAssetSourceLabel(r.asset_source), r.og_platform);
      const accessType = r.ref_type ? r.ref_type === "direct" ? "direct" : r.ref_type === "external" ? "external_referral" : r.ref_type === "internal" ? "internal_navigation" : "unknown" : getAccessType(r.referer);
      const source = assetLabel ? assetLabel : accessType === "external_referral" ? getReferrerSource(r.referer) || "Other" : accessType === "direct" ? "Direct" : accessType === "internal_navigation" ? "Internal" : "Unknown";
      sourceMap[source] = (sourceMap[source] || 0) + r.hits;
    }
    externalReachSources = Object.entries(sourceMap).map(([source, hits]) => ({ source, hits })).sort((a, b) => b.hits - a.hits);
  } catch (e) {
    console.log("External reach sources query failed:", e.message);
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
  const imageMap = {};
  function normalizeGeo(g) {
    if (!g) return null;
    const country = (g.country || "").toString().trim() || null;
    const region = (g.region || "").toString().trim() || null;
    const city = (g.city || "").toString().trim() || null;
    if (!country && !region && !city) return null;
    return { country, region, city };
  }
  __name(normalizeGeo, "normalizeGeo");
  function setGeoIfBetter(img, geo, priority) {
    const g = normalizeGeo(geo);
    if (!g) return;
    if ((img.geo_priority ?? 99) <= priority) return;
    img.geo = g;
    img.geo_priority = priority;
  }
  __name(setGeoIfBetter, "setGeoIfBetter");
  function ensureImage(id) {
    if (!imageMap[id]) {
      imageMap[id] = { image_id: id, badges: [], chapter_views: 0, xl_zooms: 0, unverified_views: 0, external_views: 0, countries: /* @__PURE__ */ new Set(), sources: [], geo: null, geo_priority: 99, devices: /* @__PURE__ */ new Set(), url: null, url_priority: 99 };
    }
    return imageMap[id];
  }
  __name(ensureImage, "ensureImage");
  function normalizeUrl(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    return s;
  }
  __name(normalizeUrl, "normalizeUrl");
  function setUrlIfBetter(img, url, priority) {
    const u = normalizeUrl(url);
    if (!u) return;
    if ((img.url_priority ?? 99) <= priority) return;
    img.url = u;
    img.url_priority = priority;
  }
  __name(setUrlIfBetter, "setUrlIfBetter");
  for (const c of topChapters) {
    const img = ensureImage(c.target_id);
    const badge = c.has_js_view ? "C" : "I";
    if (!img.badges.includes(badge)) img.badges.push(badge);
    img.chapter_views = c.views;
    if (c.has_js_view) {
      setGeoIfBetter(img, c.geo, 0);
      setUrlIfBetter(img, c.url, 0);
      if (c.countries) c.countries.split(",").forEach((co) => co && img.countries.add(co.trim()));
      if (Array.isArray(c.devices)) c.devices.forEach((d) => d && img.devices.add(String(d).toLowerCase()));
      if (c.referrer_source && c.referrer_source !== "Internal" && c.referrer_source !== "Unknown") {
        if (!img.sources.includes(c.referrer_source)) img.sources.push(c.referrer_source);
      }
    } else {
      setGeoIfBetter(img, c.geo, 2);
      setUrlIfBetter(img, c.url, 2);
    }
  }
  for (const z of topZooms) {
    const img = ensureImage(z.target_id);
    img.xl_zooms = z.views;
    setGeoIfBetter(img, z.geo, 0);
    setUrlIfBetter(img, z.url, 1);
    if (Array.isArray(z.devices)) z.devices.forEach((d) => d && img.devices.add(String(d).toLowerCase()));
  }
  for (const ext of externalImageAccess) {
    const img = ensureImage(ext.target_id);
    if (ext.access_type === "external_referral") {
      if (!img.badges.includes("E")) img.badges.push("E");
      img.external_views += ext.hits;
      setGeoIfBetter(img, ext.geo, 2);
    } else {
      if (!img.badges.includes("U")) img.badges.push("U");
      img.unverified_views += ext.hits;
      setGeoIfBetter(img, ext.geo, 1);
    }
    if (ext.country) img.countries.add(ext.country);
    if (ext.asset_source_label) {
      img.sources.push(ext.asset_source_label);
    }
    if (ext.referrer_source && ext.referrer_source !== "Direct" && ext.referrer_source !== "Internal" && ext.referrer_source !== "Unknown") {
      img.sources.push(ext.referrer_source);
    } else if (ext.access_type === "direct") {
      if (!img.sources.includes("Direct")) img.sources.push("Direct");
    } else if (ext.access_type === "internal_navigation") {
      if (!img.sources.includes("Internal")) img.sources.push("Internal");
    }
  }
  try {
    const imageIdMap = await getImageIdMapCached();
    if (imageIdMap) {
      for (const img of Object.values(imageMap)) {
        if (img?.image_id && !img.url) {
          const galleryPath = getCanonicalGalleryPathForImageId(imageIdMap, img.image_id);
          if (galleryPath) {
            const canonicalUrl = "https://k4studios.com" + galleryPath + "/" + img.image_id + "/";
            setUrlIfBetter(img, canonicalUrl, 9);
          }
        }
      }
    }
  } catch (e) {
    console.log("Canonical URL backfill failed:", e?.message || e);
  }
  const imageAccessOverview = Object.values(imageMap).map((img) => ({
    image_id: img.image_id,
    badges: img.badges,
    chapter_views: img.chapter_views,
    xl_zooms: img.xl_zooms,
    unverified_views: img.unverified_views,
    external_views: img.external_views,
    geo: img.geo,
    countries: Array.from(img.countries).filter(Boolean),
    sources: [...new Set(img.sources)],
    devices: Array.from(img.devices).filter(Boolean),
    url: img.url,
    total: img.chapter_views + img.xl_zooms + img.unverified_views + img.external_views
  })).sort((a, b) => b.total - a.total);
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
    entryRefCountsObj,
    imageAccessOverview,
    viewerDepth,
    suppressionStats
  };
}
__name(getArtViews, "getArtViews");
async function getDashboardStats(env, filters) {
  const { dateClause } = filters;
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
      SELECT COUNT(DISTINCT e.session_id) as sessions
      FROM classified_events e
      WHERE e.event_type = 'page_view'
        AND e.source = 'js'
        AND COALESCE(e.is_bot, 0) = 0
        AND e.session_id IS NOT NULL
        AND e.visitor_id IS NOT NULL
        AND e.visitor_id != ''
        AND EXISTS (
          SELECT 1 FROM classified_events j
          WHERE j.visitor_id = e.visitor_id
            AND j.source = 'js'
            AND j.visitor_id IS NOT NULL
            AND j.visitor_id != ''
        )
        AND ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
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
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
        AND e.source = 'js'
        AND EXISTS (
          SELECT 1 FROM classified_events j
          WHERE j.visitor_id = e.visitor_id
            AND j.source = 'js'
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
async function getEventBreakdown(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name((clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"), "qualify");
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const trackedEvents = [
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
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
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
async function getGalleryPerformance(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name((clause, alias) => (clause || "").replace(/\bts\b/g, `${alias}.ts`).replace(/\bip\b/g, `${alias}.ip`).replace(/\bcity\b/g, `${alias}.city`).replace(/\bcountry\b/g, `${alias}.country`).replace(/\bregion\b/g, `${alias}.region`), "qualify");
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
async function getReferrers(env, filters) {
  return { results: [] };
}
__name(getReferrers, "getReferrers");
async function getGeography(env, filters) {
  try {
    const { dateClause } = filters;
    const geoQuery = `
      SELECT 
        e.country, e.region, e.city,
        COUNT(DISTINCT e.visitor_id) as visitors,
        COUNT(DISTINCT CASE 
          WHEN e.event_type IN ('chapter_view', 'xl_zoom', 'gallery_view') 
          THEN e.visitor_id 
          ELSE NULL 
        END) as art_viewers
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${dateClause.replace(/\bts\b/g, "e.ts") || 'e.ts > datetime("now", "-1 day")'}
        AND e.country IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM classified_events j
          WHERE j.visitor_id = e.visitor_id
            AND j.source = 'js'
        )
      GROUP BY e.country, e.region, e.city
      ORDER BY visitors DESC
      LIMIT 20
    `;
    return await env.DB.prepare(geoQuery).all();
  } catch (e) {
    console.log("Geography query failed:", e.message);
    return { results: [] };
  }
}
__name(getGeography, "getGeography");
async function getPeriodTotals(env, filters) {
  try {
    const { dateClause, botClause, chardonClause } = filters;
    const qualifyBot = /* @__PURE__ */ __name((clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region"), "qualifyBot");
    const periodQuery = `
      SELECT 
        COUNT(DISTINCT e.visitor_id) as total_visitors,
        COUNT(DISTINCT CASE 
          WHEN e.event_type IN ('chapter_view', 'xl_zoom', 'gallery_view') 
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
async function getDailyTrend(env, filters) {
  try {
    const { rangeDateClause, galleryClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name((clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bgallery_id\b/g, "e.gallery_id").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bdevice\b/g, "e.device").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region"), "qualify");
    const where = qualify(rangeDateClause) || `date(e.ts, '-5 hours') = date('now', '-5 hours')`;
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
        END) as art_viewers
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
async function getSessionMetrics(env, filters) {
  try {
    const { dateClause } = filters;
    const qualify = /* @__PURE__ */ __name((clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer").replace(/\bua\b/g, "e.ua"), "qualify");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
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
    const bounceRate = bounceResult?.total_sessions > 0 ? Math.round(100 * (bounceResult.bounce_sessions || 0) / bounceResult.total_sessions) : 0;
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
    const pickTop = /* @__PURE__ */ __name((rows) => rows.sort((a, b) => (b.sessions || 0) - (a.sessions || 0))[0] || null, "pickTop");
    const topAm = pickTop(hourRows.filter((r) => (r.hour ?? 0) < 12));
    const topPm = pickTop(hourRows.filter((r) => (r.hour ?? 0) >= 12));
    const formatHour = /* @__PURE__ */ __name((hour24) => {
      const h = Number(hour24) || 0;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "pm" : "am";
      return `${hour12}${ampm}`;
    }, "formatHour");
    const peakHours = [
      ...topAm ? [{ period: "AM", hour: formatHour(topAm.hour), sessions: topAm.sessions }] : [],
      ...topPm ? [{ period: "PM", hour: formatHour(topPm.hour), sessions: topPm.sessions }] : []
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
    const deviceEngagementResult = await env.DB.prepare(deviceEngagementQuery).all();
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
async function getTopPages(env, filters) {
  try {
    const { dateClause } = filters;
    const where = (dateClause || "").trim() || 'ts > datetime("now", "-1 day")';
    const pagesQuery = `
      SELECT page AS page_path, COUNT(*) AS views
      FROM classified_events
      WHERE ${where}
        AND event_type IN ('page_view','gallery_view','chapter_view')
        AND COALESCE(is_bot,0) = 0
        AND page IS NOT NULL AND page != ''
      GROUP BY page
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
async function getTopImages(env, filters) {
  return { images: { results: [] }, uniqueImagesViewed: 0, totalImageSessions: 0, totalImageViews: 0 };
}
__name(getTopImages, "getTopImages");
async function getEntryAnalysis(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name((clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"), "qualify");
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const entryPagesQuery = `
      WITH first_pages AS (
        SELECT
          e.session_id,
          CASE
            WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), e.target_id)
            ELSE '/' || COALESCE(NULLIF(e.page, ''), e.target_id)
          END AS page_path,
          e.referer AS referrer,
          ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.ts ASC) AS rn
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
      SELECT
        page_path,
        CASE
          WHEN referrer IS NULL OR referrer = '' OR referrer = 'unknown' OR referrer = 'direct' THEN 'direct'
          WHEN referrer LIKE '%images.google.%' OR referrer LIKE '%google.%/imgres%' THEN 'google_images'
          WHEN referrer LIKE '%google.%' THEN 'google_search'
          WHEN referrer LIKE '%bing.%/images%' THEN 'bing_images'
          WHEN referrer LIKE '%bing.%' THEN 'bing_search'
          WHEN referrer LIKE '%pinterest.%' THEN 'pinterest'
          WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%fb.%' THEN 'facebook'
          WHEN referrer LIKE '%twitter.%' OR referrer LIKE '%t.co/%' OR referrer LIKE '%x.com%' THEN 'twitter'
          WHEN referrer LIKE '%chatgpt.com%' OR referrer LIKE '%chat.openai.com%' THEN 'chatgpt'
          WHEN referrer LIKE '%instagram.%' THEN 'instagram'
          WHEN referrer LIKE '%linkedin.%' THEN 'linkedin'
          WHEN referrer LIKE '%duckduckgo.%' THEN 'duckduckgo'
          WHEN referrer LIKE '%k4studios.com%' THEN 'internal'
          ELSE 'unattributed'
        END AS ref_source,
        COUNT(DISTINCT session_id) AS sessions
      FROM first_pages
      WHERE rn = 1
        AND referrer NOT LIKE '%k4studios.com%'  -- Exclude internal: not true entries
      GROUP BY page_path, ref_source
      ORDER BY sessions DESC
      LIMIT 15
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
      const imageEntrySessionsResult = await env.DB.prepare(imageEntrySessionsQuery).first();
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
async function getEngagementDepth(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name((clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"), "qualify");
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
async function getExitAnalysis(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;
    const qualify = /* @__PURE__ */ __name((clause) => (clause || "").replace(/\bts\b/g, "e.ts").replace(/\bip\b/g, "e.ip").replace(/\bcity\b/g, "e.city").replace(/\bcountry\b/g, "e.country").replace(/\bregion\b/g, "e.region").replace(/\breferer\b/g, "e.referer"), "qualify");
    const safeBotClause = (botClause || "").replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, " ").replace(/\bdevice\s*=\s*'unknown'\b/gi, "1=1");
    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';
    const exitPagesQuery = `
      WITH last_pages AS (
        SELECT
          e.session_id,
          CASE
            WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), e.target_id)
            ELSE '/' || COALESCE(NULLIF(e.page, ''), e.target_id)
          END AS page_path,
          ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.ts DESC) AS rn
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
      SELECT
        page_path,
        COUNT(*) AS sessions
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
    const isLandingPage = /* @__PURE__ */ __name((path) => {
      if (!path || typeof path !== "string") return false;
      if (path === "/" || path === "") return false;
      if (path.startsWith("/Galleries/") || path.startsWith("/Other/")) return false;
      if (path.startsWith("/Blog/") || path.startsWith("/blog/")) return false;
      if (path.startsWith("/Photoshootsandevents/") || path.startsWith("/Photography-Galleries/") || path.startsWith("/Scheduled-Shoots/")) return false;
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
      total_exit_sessions: rows.reduce((sum, r) => sum + Number(r.sessions || 0), 0)
    };
    return { exitPages, exitSummary, exitByCategory };
  } catch (e) {
    console.log("Exit analysis query failed:", e.message);
    return { exitPages: { results: [] }, exitSummary: {}, exitByCategory: {} };
  }
}
__name(getExitAnalysis, "getExitAnalysis");
async function getEdgeEvents(env, filters) {
  try {
    const { yesterday, days } = filters || {};
    const d = Math.max(1, Math.min(parseInt(days || "1", 10) || 1, 31));
    const dateWhere = yesterday ? `date(e.ts, '-5 hours') = date('now', '-5 hours', '-1 day')` : `e.ts > datetime('now', '-${d} day')`;
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
async function getBotIntelligence(env) {
  let botIntelligence = {
    suspects: [],
    blocked: [],
    verified: [],
    stats: { total: 0, risk3: 0, risk4: 0, blocked: 0, verified: 0 }
  };
  try {
    try {
      const lastUpdate = await env.DB.prepare(
        `
          SELECT
            MAX(updated_at) as last_update,
            (JULIANDAY('now') - JULIANDAY(MAX(updated_at))) * 24 * 60 as minutes_old
          FROM suspected_bots
        `
      ).first();
      const minutesOld = Number(lastUpdate?.minutes_old);
      if (!lastUpdate?.last_update || !Number.isFinite(minutesOld) || minutesOld > 15) {
        await updateBotIntelligence(env);
      }
    } catch {
    }
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
    let suspectsResult;
    try {
      suspectsResult = await env.DB.prepare(suspectsQuery).all();
      botIntelligence.suspects = suspectsResult.results || [];
    } catch {
      botIntelligence.suspects = [];
    }
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
      botIntelligence.suspects = (fb.results || []).map((r) => ({
        ip_hash: r.ip_hash,
        risk_level: 2,
        risk_score: r.is_flagged_bot ? 2 : 0,
        rules_triggered: JSON.stringify(r.is_flagged_bot ? ["auto_flagged_bot"] : []),
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
      const frictionStatsQuery = `
        WITH friction AS (
          SELECT
            ip_hash,
            SUM(CASE WHEN inferred_from = '429' THEN 1 ELSE 0 END) as friction_429_24h,
            SUM(CASE WHEN inferred_from = 'delay' THEN 1 ELSE 0 END) as delay_count
          FROM raw_events
          WHERE event_type = 'harvester_friction'
            AND ts > datetime('now', '-24 hours')
          GROUP BY ip_hash
        ),
        velocity AS (
          SELECT
            ip_hash,
            MAX(minute_uniques) as peak_unique_images_per_minute_24h
          FROM (
            SELECT
              ip_hash,
              COUNT(DISTINCT target_id) as minute_uniques
            FROM raw_events
            WHERE event_type IN ('image_page', 'external_image_page', 'chapter_exposure', 'harvester_friction')
              AND ts > datetime('now', '-24 hours')
            GROUP BY ip_hash, strftime('%Y-%m-%d %H:%M', ts)
          )
          GROUP BY ip_hash
        ),
        delay_burst AS (
          SELECT
            ip_hash,
            MAX(window_delays) as max_friction_delay_10m_24h
          FROM (
            SELECT
              ip_hash,
              COUNT(*) as window_delays
            FROM raw_events
            WHERE event_type = 'harvester_friction'
              AND inferred_from = 'delay'
              AND ts > datetime('now', '-24 hours')
            GROUP BY ip_hash, strftime('%Y-%m-%d %H:', ts) || CAST((CAST(strftime('%M', ts) AS INTEGER) / 10) AS TEXT)
          )
          GROUP BY ip_hash
        )
        SELECT
          f.ip_hash,
          COALESCE(f.friction_429_24h, 0) as friction_429_24h,
          COALESCE(v.peak_unique_images_per_minute_24h, 0) as peak_unique_images_per_minute_24h,
          COALESCE(d.max_friction_delay_10m_24h, 0) as max_friction_delay_10m_24h
        FROM friction f
        LEFT JOIN velocity v ON v.ip_hash = f.ip_hash
        LEFT JOIN delay_burst d ON d.ip_hash = f.ip_hash
      `;
      const frictionStats = await env.DB.prepare(frictionStatsQuery).all();
      const frictionMap = /* @__PURE__ */ new Map();
      for (const row of frictionStats.results || []) {
        frictionMap.set(row.ip_hash, row);
      }
      for (const suspect of botIntelligence.suspects) {
        const fs = frictionMap.get(suspect.ip_hash);
        if (fs) {
          suspect.friction_429_24h = fs.friction_429_24h;
          suspect.peak_unique_images_per_minute_24h = fs.peak_unique_images_per_minute_24h;
          suspect.max_friction_delay_10m_24h = fs.max_friction_delay_10m_24h;
        }
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
        COALESCE(img.image_count, 0) as image_count,
        COALESCE(pg.page_count, 0) as page_count
      FROM suspected_bots sb
      LEFT JOIN (
        SELECT ip_hash, COUNT(*) as image_count
        FROM raw_events
        WHERE ts > datetime('now', '-7 days')
          AND event_type = 'verified_bot'
        GROUP BY ip_hash
      ) img ON sb.ip_hash = img.ip_hash
      LEFT JOIN (
        SELECT ip_hash, COUNT(*) as page_count
        FROM raw_events
        WHERE ts > datetime('now', '-7 days')
          AND event_type IN ('image_page', 'external_image_page')
        GROUP BY ip_hash
      ) pg ON sb.ip_hash = pg.ip_hash
      WHERE sb.is_verified_bot = 1 AND sb.status = 'verified'
      ORDER BY sb.total_requests DESC
      LIMIT 20
    `;
    const verifiedResult = await env.DB.prepare(verifiedQuery).all();
    botIntelligence.verified = verifiedResult.results || [];
    botIntelligence.stats.verified = botIntelligence.verified.reduce(
      (sum, v) => sum + (v.total_requests || 0),
      0
    );
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
    for (const s of botIntelligence.suspects) {
      if (s.status !== "blocked") {
        botIntelligence.stats.total++;
        if (s.risk_level === 3) botIntelligence.stats.risk3++;
        if (s.risk_level >= 4) botIntelligence.stats.risk4++;
      }
    }
  } catch (e) {
    console.log("Bot intelligence query failed:", e.message);
  }
  return botIntelligence;
}
__name(getBotIntelligence, "getBotIntelligence");

// src/analytics/dashboard/schema.js
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
    entryRefCountsObj,
    imageAccessOverview,
    viewerDepth,
    suppressionStats,
    botIntelligence,
    periodTotals
  } = queryResults;
  const {
    days,
    yesterday,
    selectedDate,
    galleryFilter,
    excludeIp,
    viewerIp,
    hideBots,
    hideChardon
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
    viewerDepth,
    imageAccessOverview: imageAccessOverview || [],
    suppressionStats,
    botIntelligence,
    periodTotals: periodTotals || { total_visitors: 0, total_art_viewers: 0 }
  };
}
__name(buildDashboardData, "buildDashboardData");

// src/analytics/dashboard/renderer.js
function renderDashboard({ days, yesterday, selectedDate, galleryFilter, excludeIp, viewerIp, summary, newVisitors, returningVisitors, cowboyJumps, events, galleries, referrers, geo, trend, devices, pages, images, uniqueImagesViewed, totalImageSessions, totalImageViews, themesClicked, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, exitPages, exitSummary, exitByCategory, botPct, botSessions, hideBots, hideChardon, edgeEvents, edgeSummary, entryPages, entryRefCounts, imagePageViewsFromEvents, imageEntrySessionsFromEvents, bounceRate, avgDurationFormatted, peakHours, deviceEngagement, artViewsSummary, artViewsByType, topArtViews, externalImageAccess, externalImageAccessTotal, externalReachGeo, externalReachSources, imageAccessOverview, viewerDepth, suppressionStats, botIntelligence, periodTotals }) {
  const s = summary || {};
  const safeDeviceEngagement = Array.isArray(deviceEngagement) ? deviceEngagement : [];
  const todayTrend = Array.isArray(trend) && trend.length > 0 ? trend[trend.length - 1] : null;
  const artViewersToday = todayTrend?.art_viewers || 0;
  const siteVisitorsToday = todayTrend?.visitors || 0;
  const trendArr = Array.isArray(trend) ? trend : [];
  const summedSiteVisitors = trendArr.reduce((sum, d) => sum + (d.visitors || 0), 0);
  const summedArtViewers = trendArr.reduce((sum, d) => sum + (d.art_viewers || 0), 0);
  const uniqueSiteVisitors = periodTotals?.total_visitors || 0;
  const uniqueArtViewers = periodTotals?.total_art_viewers || 0;
  const isMultiDay = days > 1 && !selectedDate && !yesterday;
  const isSingleDay = !isMultiDay;
  const totalSiteVisitors = isMultiDay ? summedSiteVisitors : trendArr[0]?.visitors || summedSiteVisitors;
  const totalArtViewers = isMultiDay ? summedArtViewers : trendArr[0]?.art_viewers || summedArtViewers;
  const isLevel5BlockRecommended = /* @__PURE__ */ __name((suspect) => {
    if (!suspect || suspect.status === "blocked") return false;
    if ((suspect.risk_level || 0) < 4) return false;
    if (suspect.is_verified_bot) return false;
    const hardStops24h = Number(suspect.friction_429_24h || 0);
    if (hardStops24h >= 10) return true;
    const peakUniquePerMin = Number(suspect.peak_unique_images_per_minute_24h || 0);
    if (peakUniquePerMin >= 20) return true;
    const delayBurstIp = Number(suspect.max_friction_delay_10m_24h || 0);
    const delayBurstAsn = Number(suspect.max_friction_delay_10m_asn_24h || 0);
    const delayBurst = Math.max(delayBurstIp, delayBurstAsn);
    if (delayBurst >= 40) return true;
    return false;
  }, "isLevel5BlockRecommended");
  const eventLabels = {
    // -- High-value user interactions --
    "browse_all_click": "Browse All Click",
    "order_clicked": "Buy Button Click",
    "collector_notes_open": "Collector Notes",
    "cowboy_jump": "Cowboy Jump",
    "exit_to_gallery": "Exit to Gallery",
    "gallery_explore_click": "Gallery Explore Click",
    "gallery_preview_click": "Gallery Preview Click",
    "guide_open": "Guide",
    "guide_close": "Guide - Close",
    "guide_done": "Guide - Done",
    "guide_click_outside": "Guide - Click Outside",
    "gallery_hero_click": "Hero Image Click",
    "more_info_open": "More About Image",
    "nav_next": "Nav - Next",
    "nav_prev": "Nav - Prev",
    "order_submitted": "Order Inquiry Sent",
    "series_info": "Series Info",
    "sister_image_click": "Sister Image Click",
    "slideshow_start": "Slideshow Start",
    "story_slider_click": "Story Slider Click",
    "theme_click": "Theme Click",
    // xl_zoom is intentionally omitted: it's counted separately as a user-intent metric (never image request)
    // -- Passive / system events --
    "all_list_click": "All Galleries Click",
    "grid_open": "Grid - Open",
    "grid_image_click": "Grid - Image Click",
    "grid_show_more": "Grid - Show More",
    "grid_show_previous": "Grid - Show Previous",
    "scroll_25": "Page - 25% Scroll",
    "scroll_50": "Page - 50% Scroll",
    "scroll_75": "Page - 75% Scroll",
    "scroll_100": "Page - 100% Scroll",
    "page_view": "Page View",
    "session_exit": "Session Exit"
  };
  const eventCounts = {};
  events.forEach((e) => {
    eventCounts[e.event] = e.count;
  });
  if (artViewsSummary?.slideshow_starts) {
    eventCounts["slideshow_start"] = (eventCounts["slideshow_start"] || 0) + artViewsSummary.slideshow_starts;
  }
  const allEvents = Object.keys(eventLabels).map((key) => ({
    event: key,
    label: eventLabels[key],
    count: eventCounts[key] || 0
  })).sort((a, b) => b.count - a.count);
  const formatEventName = /* @__PURE__ */ __name((name) => {
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
  const periodLabel = yesterday ? "Yesterday" : `Last ${days} day(s)`;
  const greenBadgeLabel = (() => {
    const today = /* @__PURE__ */ new Date();
    const fmt = /* @__PURE__ */ __name((d) => d.toISOString().slice(0, 10), "fmt");
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
    /* Main grid - fixed 5-column layout, centered */
    .grid, .grid-tall { display: grid; grid-template-columns: repeat(5, 348px); gap: 10px; margin: 0 auto 10px auto; width: fit-content; }
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
    .artviews-header .help-trigger .tooltip { display: none; position: absolute; bottom: 100%; right: 0; transform: none; background: #333; color: #e0e0e0; padding: 10px 14px; border-radius: 6px; font-size: 11px; z-index: 1000; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); width: 280px; line-height: 1.5; }
    .artviews-header .help-trigger .tooltip::after { content: ''; position: absolute; top: 100%; right: 8px; border: 6px solid transparent; border-top-color: #333; }
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
      .ip-filter a { font-size: 10px; padding: 5px 10px; }
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
        min-width: 0 !important;
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

      /* U stat: Row 4, span width */
      .access-row > span:nth-child(7) {
        grid-row: 4 !important;
        grid-column: 2 / -1 !important;
        width: auto !important;
        text-align: center !important;
        padding: 4px 8px !important;
        background: rgba(255,255,255,0.03) !important;
        border-radius: 4px !important;
        font-size: 13px !important;
      }
      
      /* Source: Row 5, span full width */
      .access-row > div:nth-child(8) {
        grid-row: 5 !important;
        grid-column: 1 / -1 !important;
        width: 100% !important;
        padding-top: 6px !important;
        border-top: 1px solid rgba(255,255,255,0.06) !important;
        margin-top: 4px !important;
      }
      
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
    <span class="chart-totals" style="font-size:12px;color:#888;margin-left:12px;">Total: <span style="color:#4a9eff;font-weight:bold;">${totalSiteVisitors}</span>${isMultiDay && uniqueSiteVisitors < summedSiteVisitors ? ` <span style="color:#666;">(${uniqueSiteVisitors} unique)</span>` : ""} visitors, <span style="color:#a855f7;font-weight:bold;">${totalArtViewers}</span>${isMultiDay && uniqueArtViewers < summedArtViewers ? ` <span style="color:#666;">(${uniqueArtViewers} unique)</span>` : ""} viewed art</span>
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
            <div class="trend-bar${isSelected ? " selected" : ""}" data-visitors="${t.visitors}" data-sessions="${t.sessions}" data-art-viewers="${t.art_viewers || 0}" data-day="${t.day}" style="height: ${height}%" title="${t.day}: ${t.visitors} visitors (${t.art_viewers || 0} viewed art)">
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
      <div class="trend-bar" style="height: 100%; width: 80px;" title="${trend[0].day}: ${trend[0].visitors} visitors (${trend[0].art_viewers || 0} viewed art)">
        <span class="trend-bar-value">${trend[0].visitors}</span>
        <span class="trend-bar-label">${trend[0].day.slice(5)}${trend[0].day === "2026-02-14" ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ""}</span>
      </div>
    </div>
  </div>
  ` : ""}

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
      <span class="value">${s.sessions || 0}${minEngagement > 0 ? `<span style="opacity: 0.6; font-size: 0.7em;"> (${minEngagement}-${maxEngagement})</span>` : ""}</span>
      <span class="label">Engaged <span class="info-icon">i</span></span>
      <div class="tooltip">Engaged sessions: browser sessions where JS loaded and events fired. Range shows min-max engagement scores (zoom=4, notes=5, theme=3, nav=2).</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.avg_events_per_session || 0}</span>
      <span class="label">Average Engagement <span class="info-icon">i</span></span>
      <div class="tooltip">Average number of tracked engagement events per session.</div>
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
    <div class="pulse-stat" style="background: ${bounceRate > 60 ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" : bounceRate > 40 ? "linear-gradient(135deg, #c2410c 0%, #9a3412 100%)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)"};">
      <span class="value" style="color: #fff;">${bounceRate}%</span>
      <span class="label" style="color: ${bounceRate > 40 ? "#fed7aa" : "#a7f3d0"};">Bounce <span class="info-icon" style="background: rgba(255,255,255,0.2); color: ${bounceRate > 40 ? "#fed7aa" : "#a7f3d0"};">i</span></span>
      <div class="tooltip">Sessions with only 1 event (came and left immediately). Lower is better. Above 60% = concern, below 40% = great.</div>
    </div>
  </div>

  <div class="pulse-row">
    ${viewerDepth?.avgScore > 0 ? `<div class="pulse-stat collector">
      <span class="value" style="color: #fff;">\u2B50 ${viewerDepth.avgScore}</span>
      <span class="label" style="color: #c4b5fd;">Avg Depth <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #c4b5fd;">i</span></span>
      <div class="tooltip">Viewer Depth Score \u2014 your TRUE NORTH metric. Measures engagement quality: gallery=1, image=2, zoom=5. Higher = deeper art engagement. Distribution: ${viewerDepth.distribution?.map((d) => `${d.label}: ${d.count}`).join(", ") || "none"}. Max today: ${viewerDepth.maxScore || 0}.</div>
    </div>` : ""}
    ${viewerDepth?.highDepthCount > 0 ? `<div class="pulse-stat" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
      <span class="value" style="color: #fff;">\u{1F3AF} ${viewerDepth.highDepthCount}</span>
      <span class="label" style="color: #a7f3d0;">Collectors <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">High-depth viewers (score 20+) exhibiting collector behavior: multiple images, zooms, intentional browsing. These are your potential buyers.</div>
    </div>` : ""}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);">
      <span class="value" style="color: #fff;">\u{1F3A8} ${totalArtViewers}/${totalSiteVisitors}</span>
      <span class="label" style="color: #e9d5ff;">Art Viewers <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #e9d5ff;">i</span></span>
      <div class="tooltip">Art Viewers vs Site Visitors (period total). Art Viewers = visitors who actually viewed art (chapters, galleries, or zoomed images). Site Visitors = all JS-verified page views including blog, homepage, etc. Today: ${artViewersToday}/${siteVisitorsToday}.</div>
    </div>
    ${cowboyJumps > 0 ? `<div class="pulse-stat highlight">
      <span class="value">\u{1F920} ${cowboyJumps}</span>
      <span class="label">Cowboy Jump <span class="info-icon">i</span></span>
      <div class="tooltip">Total cowboy jump clicks. Every click counts!</div>
    </div>` : ""}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">\u{1F4CA} ${s.sessions || 0}${minEngagement > 0 ? `<span style="opacity: 0.6; font-size: 0.7em;"> (${minEngagement}-${maxEngagement})</span>` : ""}</span>
      <span class="label" style="color: #a7f3d0;">Engaged Sessions <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Engaged sessions: browser sessions where JS loaded and events fired. Range shows min-max engagement scores (zoom=4, notes=5, theme=3, nav=2).</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
      <span class="value" style="color: #fff;">\u{1F464} ${artViewsSummary?.total || 0}</span>
      <span class="label" style="color: #ddd6fe;">Exposure Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">Proxy-verified exposures: <strong>C</strong> (Chapters) + <strong>E</strong> (External image serves). It intentionally does <em>not</em> include <strong>Z</strong> (XL zoom intent) or gallery navigation.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);">
      <span class="value" style="color: #fff;">\u{1F9CA} ${artViewsSummary?.harvester_friction_events || 0}</span>
      <span class="label" style="color: #cbd5e1;">Slowed <span class="info-icon" style="background: rgba(255,255,255,0.12); color: #cbd5e1;">i</span></span>
      <div class="tooltip"><strong>Friction events (selected period):</strong> image requests where selective friction engaged. Includes both <em>delayed</em> (650-1600ms) and <em>429'd</em> (hard stop) requests. See \u{1F9CA} Harvester Friction section for breakdown.</div>
    </div>
    ${suppressionStats?.activeSuppressedIPs > 0 ? `<div class="pulse-stat" style="background: linear-gradient(135deg, #475569 0%, #334155 100%);">
      <span class="value" style="color: #94a3b8;">\u{1F6E1} ${suppressionStats.activeSuppressedIPs}</span>
      <span class="label" style="color: #94a3b8;">Filtered <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #94a3b8;">i</span></span>
      <div class="tooltip">${hideBots ? `Visitors hidden by <strong>Hide Bots</strong> for this period. Hidden events: ${suppressionStats.suppressedToday || 0}.` : `Legacy bot-classified visitors (UA/ASN). Bot events this period: ${suppressionStats.suppressedToday || 0}.`}</div>
    </div>` : ""}
  </div>

  ${isSingleDay ? `
  <!-- Art Views Section -->
  <div class="artviews-header">
    <div class="artviews-title">\u{1F3A8} ART VIEWS <span class="subtle">Human art viewers (cleaned)</span></div>
    <span class="help-trigger">
      <span class="info-icon">i</span>
      <div class="tooltip">
        <strong>How Art Views are counted</strong><br><br>
        \u2022 <strong>Chapters</strong> \u2192 proxy L-size image fetches with internal referer<br>
        \u2022 <strong>XL Zooms</strong> \u2192 JS intent beacons (same-origin)<br>
        \u2022 <strong>External embeds</strong> \u2192 proxy L-size fetches with external/no referer<br>
        \u2022 <strong>Bot exclusion</strong> \u2192 datacenter IP + scraper UA filtering
      </div>
    </span>
  </div>

  <div class="access-grid" style="display: grid; grid-template-columns: 1fr 280px 280px; gap: 12px; max-width: 1780px; margin: 0 auto;">
    <!-- Image Access Overview (unified panel) -->
    <div class="section" style="max-height: none;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
        <h3 style="margin: 0;">\u{1F4CA} Image Access Overview</h3>
        <div style="display: flex; gap: 3px;" id="accessFilterBtns">
          <button onclick="filterAccess('all')" data-f="all" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #555; background: #444; color: #fff; font-size: 10px; cursor: pointer; font-weight: bold;">All</button>
          <button onclick="filterAccess('C')" data-f="C" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #a78bfa55; background: #a78bfa22; color: #a78bfa; font-size: 10px; cursor: pointer;">C</button>
          <button onclick="filterAccess('I')" data-f="I" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #8b5cf655; background: #8b5cf622; color: #8b5cf6; font-size: 10px; cursor: pointer;">i</button>
          <button onclick="filterAccess('U')" data-f="U" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #f59e0b55; background: #f59e0b22; color: #f59e0b; font-size: 10px; cursor: pointer;">U</button>
          <button onclick="filterAccess('E')" data-f="E" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #3b82f655; background: #3b82f622; color: #3b82f6; font-size: 10px; cursor: pointer;">E</button>
        </div>
        <span style="font-size: 10px; color: #555;">
          <span style="color: #a78bfa;">C</span>=Chapter JS
          <span style="color: #8b5cf6;">i</span>=Image proxy
          <span style="color: #f59e0b;">U</span>=Unverified
          <span style="color: #3b82f6;">E</span>=External
        </span>
        <div class="access-stats" style="margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; justify-content: flex-end;">
          <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #3a3a3a;background:#222;color:#cbd5e1;font-size:12px;letter-spacing:0.2px;" title="ALL = C + Z + i + U (total views). Note: i includes E. Unique images: ${imageAccessTotals.uniqueImages}">
            <span style="font-size:11px;opacity:0.75;">ALL</span>
            <span style="font-weight:800;color:#fff;">${imageAccessTotals.allViews}</span>
          </span>
          <span title="JS-verified chapter views (badge C only)" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #a78bfa55;background:#a78bfa14;color:#a78bfa;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#a78bfa22;color:#a78bfa;font-size:10px;font-weight:bold;border:1px solid #a78bfa55;">C</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.chapterViews}</span>
          </span>
          <span title="Zoom views" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #06b6d455;background:#06b6d414;color:#06b6d4;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#06b6d422;color:#06b6d4;font-size:10px;font-weight:bold;border:1px solid #06b6d455;">Z</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.zoomViews}</span>
          </span>
          <span title="Image-proxy views (proxy-only exposures + external embeds)" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #8b5cf655;background:#8b5cf614;color:#8b5cf6;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#8b5cf622;color:#8b5cf6;font-size:10px;font-weight:bold;border:1px solid #8b5cf655;">i</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.imageProxyViews}</span>
          </span>
          <span title="Unverified views (non-JS direct/internal)" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #f59e0b55;background:#f59e0b14;color:#f59e0b;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#f59e0b22;color:#f59e0b;font-size:10px;font-weight:bold;border:1px solid #f59e0b55;">U</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.unverifiedViews}</span>
          </span>
          <span title="External embed views (subset of i)" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #3b82f655;background:#3b82f614;color:#3b82f6;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#3b82f622;color:#3b82f6;font-size:10px;font-weight:bold;border:1px solid #3b82f655;">E</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.externalViews}</span>
          </span>
        </div>
      </div>
      <div style="max-height: var(--k4-panel-list-max); overflow-y: auto; padding-right: 4px; scrollbar-gutter: stable;" id="accessOverviewList">
        <!-- Column headers (inside scroller so scrollbar doesn't shift columns) -->
        <div style="position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: 90px 220px 180px 90px 90px 90px 90px auto; gap: 10px; padding: 7px 8px; background: #252525; color: #777; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #444; align-items: center;">
          <span style="display:flex;justify-content:center;">Image</span>
          <span style="display:flex;justify-content:flex-start;padding-left:14px;">Type / ID</span>
          <span onclick="sortAccessLocation()" id="accessLocationHeader" style="cursor:pointer; user-select:none;">\u{1F4CD} Location \u21C5</span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#a78bfa22;color:#a78bfa;font-size:9px;font-weight:bold;border:1px solid #a78bfa55;" title="Chapter views">C</span></span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#06b6d422;color:#06b6d4;font-size:9px;font-weight:bold;border:1px solid #06b6d455;" title="Zoom views">Z</span></span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#8b5cf622;color:#8b5cf6;font-size:9px;font-weight:bold;border:1px solid #8b5cf655;" title="Image proxy (no JS)">i</span></span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#f59e0b22;color:#f59e0b;font-size:9px;font-weight:bold;border:1px solid #f59e0b55;" title="Unverified (non-JS direct/internal)">U</span></span>
          <span>Source</span>
        </div>
        ${(imageAccessOverview || []).map((row, i) => {
    const imageId = row.image_id?.startsWith("i-") ? row.image_id : null;
    const rowDevices = Array.isArray(row.devices) ? row.devices : [];
    const rawUrl = row.url ? String(row.url) : "";
    const linkUrl = rawUrl ? rawUrl.startsWith("http") ? rawUrl : "https://k4studios.com" + (rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl) : "https://k4studios.com/art/" + row.image_id;
    function deviceIconsHtml(devices2) {
      if (!Array.isArray(devices2) || devices2.length === 0) return "";
      const iconMap = { ios: "\u{1F4F1}", android: "\u{1F170}\uFE0F", mac: "\u{1F34E}", windows: "\u{1FA9F}", linux: "\u{1F427}", desktop: "\u{1F5A5}\uFE0F", mobile: "\u{1F4F1}", tablet: "\u{1F4F1}", unknown: "\u2753" };
      const labelMap = { ios: "iOS", android: "Android", mac: "Mac", windows: "Windows", linux: "Linux", desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", unknown: "Unknown" };
      const uniq = Array.from(new Set(devices2.map((d) => String(d || "").toLowerCase()).filter(Boolean)));
      const icons = uniq.slice(0, 4).map((d) => {
        const icon = iconMap[d] || "\u2753";
        const label = labelMap[d] || d;
        return '<span title="' + label + '" style="font-size:12px;">' + icon + "</span>";
      }).join("");
      return '<span title="Devices" style="display:inline-flex;align-items:center;gap:4px;opacity:0.85;">' + icons + "</span>";
    }
    __name(deviceIconsHtml, "deviceIconsHtml");
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
      if (city && region) return city + ", " + region + ", " + country;
      if (city) return city + ", " + country;
      return country || "\u2014";
    }
    __name(formatLocation, "formatLocation");
    const geo2 = row.geo || null;
    const geoCountry = (geo2?.country || row.countries && row.countries[0] || "").toString().trim().toUpperCase();
    const locationText = formatLocation({ country: geoCountry || (geo2?.country || ""), region: geo2?.region, city: geo2?.city });
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
      const colors = { C: { bg: "#a78bfa22", text: "#a78bfa", bdr: "#a78bfa55" }, I: { bg: "#8b5cf622", text: "#8b5cf6", bdr: "#8b5cf655" }, U: { bg: "#f59e0b22", text: "#f59e0b", bdr: "#f59e0b55" }, E: { bg: "#3b82f622", text: "#3b82f6", bdr: "#3b82f655" } };
      const c = colors[b] || colors.U;
      const label = b === "U" ? "u" : b === "I" ? "i" : b;
      return '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;background:' + c.bg + ";color:" + c.text + ";font-size:10px;font-weight:bold;border:1px solid " + c.bdr + ';" title="' + (b === "C" ? "Chapter View (JS verified)" : b === "I" ? "Image Exposure (proxy only)" : b === "E" ? "External Referral" : "Unverified") + '">' + label + "</span>";
    }).join(" ");
    const srcIcons = { "Google Search": "\u{1F50D}", "Google Images": "\u{1F5BC}\uFE0F", "Bing": "\u{1F50D}", "Twitter/X": "\u{1F426}", "Facebook": "\u{1F4D8}", "Pinterest": "\u{1F4CC}", "DuckDuckGo": "\u{1F986}", "ChatGPT": "\u{1F9E0}", "Open Graph": "\u{1F578}\uFE0F", "Structured Data": "\u{1F9FE}", "Direct": "\u{1F517}", "Internal": "\u{1F3E0}", "Unknown": "\u2753" };
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
    const sources = Array.isArray(row.sources) ? row.sources : [];
    const srcHtml = sources.length > 0 ? sources.slice(0, 2).map(sourceBadgeHtml).join(" ") : '<span title="No external referrer observed for this image yet" style="display:inline-flex;align-items:center;gap:6px;color:#666;font-size:11px;white-space:nowrap;"><span style="font-size:12px;">\u{1F310}</span><span>Awaiting external referrer</span></span>';
    const rowBadges = Array.isArray(row.badges) ? row.badges : [];
    const chapterViewsRaw = Number(row.chapter_views || 0);
    const cViews = rowBadges.includes("C") ? chapterViewsRaw : 0;
    const proxyChapterViews = rowBadges.includes("I") && !rowBadges.includes("C") ? chapterViewsRaw : 0;
    const iViews = proxyChapterViews + Number(row.external_views || 0);
    const uViews = Number(row.unverified_views || 0);
    const chColor = cViews > 0 ? "#a78bfa" : "#333";
    const zmColor = row.xl_zooms > 0 ? "#06b6d4" : "#333";
    const iColor = iViews > 0 ? "#8b5cf6" : "#333";
    const uColor = uViews > 0 ? "#f59e0b" : "#333";
    const borderColor = row.badges.includes("C") ? "#a78bfa44" : row.badges.includes("I") ? "#8b5cf644" : row.badges.includes("E") ? "#3b82f644" : "#f59e0b44";
    return '<a href="' + linkUrl + '" target="_blank" class="access-row" data-badges="' + row.badges.join(",") + '" data-country="' + (geoCountry || "") + '" data-region="' + ((geo2?.region || "") + "") + '" data-city="' + ((geo2?.city || "") + "") + '" style="display:grid;grid-template-columns:90px 220px 180px 90px 90px 90px 90px auto;gap:10px;align-items:center;padding:8px 8px;border-bottom:1px solid #2a2a2a;border-left:3px solid ' + borderColor + `;text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'"><div style="display:flex;align-items:center;justify-content:center;width:90px;">` + (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 6 ? "eager" : "lazy") + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid ' + p.bdr + ';">' : '<span style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:#333;border-radius:6px;font-size:18px;border:1px solid ' + p.bdr + ';">\u{1F5BC}</span>') + '</div><div style="display:flex;flex-direction:column;gap:4px;min-width:0;padding-left:14px;"><div class="access-idline" style="display:flex;align-items:center;gap:6px;min-width:0;"><div style="display:flex;gap:2px;flex:0 0 auto;">' + badgeHtml + '</div><span class="access-id" style="color:' + p.text + ';font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;" title="' + row.image_id + '">' + row.image_id + "</span>" + (deviceIcons ? '<span class="access-devices" style="flex:0 0 auto;">' + deviceIcons + "</span>" : "") + '</div></div><span style="color:' + locColor + ';font-size:13px;opacity:0.82;letter-spacing:0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + locationText + '">' + locationText + '</span><span style="display:flex;justify-content:center;font-weight:bold;color:' + chColor + ';font-size:14px;">' + (cViews || "\u2014") + '</span><span style="display:flex;justify-content:center;font-weight:bold;color:' + zmColor + ';font-size:14px;">' + (row.xl_zooms || "\u2014") + '</span><span style="display:flex;justify-content:center;font-weight:bold;color:' + iColor + ';font-size:14px;">' + (iViews || "\u2014") + '</span><span style="display:flex;justify-content:center;font-weight:bold;color:' + uColor + ';font-size:14px;">' + (uViews || "\u2014") + '</span><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + srcHtml + "</div></a>";
  }).join("") || '<p style="color: #555; font-size: 11px;">No image access data yet</p>'}
      </div>
      <p style="font-size: 9px; color: #555; margin-top: 6px;">C=JS-verified chapter \xB7 i=Image proxy (includes E) \xB7 U=Unverified \xB7 E=External embed</p>
    </div>
    <!-- Galleries sidebar (always visible) -->
    <div class="section" style="max-height: none;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #c4b5fd; display: flex; align-items: center; justify-content: space-between;">
        <span>\u{1F4C1} Galleries</span>
        <span style="background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%); color: #1f2937; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">${artViewsSummary?.galleries || 0}</span>
      </h4>
      <div id="art-galleries-list" style="display: flex; flex-direction: column; gap: 6px; max-height: var(--k4-panel-list-max); overflow-y: auto; padding-right: 4px; scrollbar-gutter: stable;">
        ${(topArtViews?.galleries || []).length === 0 ? '<div style="color:#666;font-size:11px;padding:6px 2px;">No data yet</div>' : (topArtViews.galleries || []).map((a, i) => {
    const linkUrl = a.gallery_url ? "https://k4studios.com" + a.gallery_url : "#";
    const devices2 = Array.isArray(a.devices) ? a.devices : [];
    function galleryDeviceIconsHtml(devs) {
      if (!Array.isArray(devs) || devs.length === 0) return "";
      const iconMap = { ios: "\u{1F4F1}", android: "\u{1F170}\uFE0F", mac: "\u{1F34E}", windows: "\u{1FA9F}", linux: "\u{1F427}", desktop: "\u{1F5A5}\uFE0F", mobile: "\u{1F4F1}", tablet: "\u{1F4F1}", unknown: "\u2753" };
      const labelMap = { ios: "iOS", android: "Android", mac: "Mac", windows: "Windows", linux: "Linux", desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", unknown: "Unknown" };
      const uniq = Array.from(new Set(devs.map((d) => String(d || "").toLowerCase()).filter(Boolean)));
      const icons = uniq.slice(0, 3).map((d) => {
        const icon = iconMap[d] || "\u2753";
        const label = labelMap[d] || d;
        return '<span title="' + label + '" style="font-size:12px;">' + icon + "</span>";
      }).join("");
      return '<span title="Devices" style="display:inline-flex;align-items:center;gap:4px;opacity:0.85;">' + icons + "</span>";
    }
    __name(galleryDeviceIconsHtml, "galleryDeviceIconsHtml");
    const deviceIcons = galleryDeviceIconsHtml(devices2);
    return '<a href="' + linkUrl + `" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(196, 181, 253, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #c4b5fd; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='rgba(196,181,253,0.25)'" onmouseout="this.style.background='rgba(196,181,253,0.1)'"><span style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">\u{1F4C1}</span><div style="flex: 1; min-width: 0;"><div style="display:flex; align-items:center; gap:6px;"><div style="color: #c4b5fd; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; flex: 1; min-width: 0;" title="` + a.target_id + '">' + a.target_id + "</div>" + (deviceIcons ? deviceIcons : "") + '</div><div style="display: flex; gap: 8px; margin-top: 2px;"><span style="font-size: 12px; font-weight: bold; color: #c4b5fd;">' + a.views + '</span><span style="font-size: 11px; color: #888;">' + a.unique_viewers + " \u{1F464}</span></div></div></a>";
  }).join("")}
      </div>
    </div>

    <!-- Devices (moved up next to Galleries) -->
    <div class="section" style="max-height: none;">
      <div class="section-header">
        <h3>Devices</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Sessions and engagement by device. Engage Lvl shows how deeply each platform's users interact.</div></span>
      </div>
      <table>
        <tr><th>Platform</th><th>Sessions</th><th>Engage Lvl</th></tr>
        ${safeDeviceEngagement.map((d) => {
    const icons = { ios: "\u{1F4F1}", android: "\u{1F170}\uFE0F", mac: "\u{1F34E}", windows: "\u{1FA9F}", linux: "\u{1F427}", desktop: "\u{1F5A5}\uFE0F", mobile: "\u{1F4F1}", tablet: "\u{1F4F1}", unknown: "\u2753" };
    const labels = { ios: "iOS", android: "Android", mac: "Mac", windows: "Windows", linux: "Linux", desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", unknown: "Unknown" };
    const engageColor = d.avg_depth >= 15 ? "#10b981" : d.avg_depth >= 8 ? "#f59e0b" : "#888";
    return `<tr><td>${icons[d.device] || "\u2753"} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
  }).join("")}
        ${safeDeviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ""}
      </table>
    </div>
  </div>
  <script>
    function filterAccess(type) {
      document.querySelectorAll('#accessFilterBtns button').forEach(function(b) {
        if (type === 'all') {
          b.style.opacity = b.dataset.f === 'all' ? '1' : '0.7';
          b.style.fontWeight = b.dataset.f === 'all' ? 'bold' : 'normal';
        } else {
          b.style.opacity = b.dataset.f === type ? '1' : '0.4';
          b.style.fontWeight = b.dataset.f === type ? 'bold' : 'normal';
        }
      });
      document.querySelectorAll('.access-row').forEach(function(row) {
        if (type === 'all') { row.style.display = 'grid'; return; }
        var badges = row.dataset.badges.split(',');
        row.style.display = badges.includes(type) ? 'grid' : 'none';
      });
    }

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
  <\/script>




  <!-- All sections grid -->
  <div class="grid" style="margin-top: 20px;">
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
        <h3 style="margin:0;">Event Breakdown</h3>
        <button id="eventSortToggle" onclick="toggleEventSort()" title="Toggle sort: Alphabetical / By Count" style="
          font-size:10px; padding:2px 8px; border:1px solid #ccc; border-radius:4px;
          background:#f5f0eb; color:#666; cursor:pointer; font-family:monospace; letter-spacing:0.5px;
        ">A?Z</button>
      </div>
      <div id="eventList" style="padding-right: 6px;">
      ${allEvents.map((e) => `
          <div class="bar-row" data-label="${e.label}" data-count="${e.count}">
            <span class="bar-label" title="${e.label}">${e.label}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(e.count / maxEventCount * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${e.count}</span>
          </div>
        `).join("")}
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
      <\/script>
    </div>

    <!-- Site Geography -->
    <div class="section k4-split-panel">
      <div class="section-header">
        <h3>\u{1F5FA}\uFE0F Site Geography</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">All JS-verified visitors by location (page views, galleries, images, everything).</div></span>
      </div>
      ${(() => {
    const countryColors = {
      "US": "#3b82f6",
      "FR": "#ef4444",
      "DE": "#f97316",
      "BR": "#22c55e",
      "GB": "#6366f1",
      "CA": "#ec4899",
      "AU": "#eab308",
      "MX": "#14b8a6",
      "IN": "#f59e0b",
      "JP": "#e11d48",
      "IT": "#84cc16",
      "ES": "#a855f7",
      "NL": "#fb923c",
      "AT": "#dc2626",
      "HU": "#c026d3",
      "SG": "#0ea5e9",
      "HK": "#d946ef",
      "CN": "#b91c1c",
      "KR": "#2563eb",
      "CO": "#fbbf24",
      "PL": "#f43f5e",
      "SE": "#06b6d4",
      "NO": "#0284c7",
      "FI": "#0369a1",
      "CH": "#dc2626",
      "RU": "#1d4ed8",
      "UA": "#fcd34d",
      "AR": "#60a5fa",
      "ZA": "#a78bfa",
      "NZ": "#2dd4bf",
      "PT": "#e879f9",
      "CG": "#f472b6",
      "CL": "#38bdf8",
      "PE": "#fbbf24",
      "IE": "#4ade80",
      "BE": "#facc15",
      "CZ": "#7dd3fc",
      "DK": "#ef4444",
      "GR": "#0ea5e9",
      "IL": "#6366f1",
      "TW": "#d946ef",
      "TH": "#f97316",
      "PH": "#8b5cf6",
      "TR": "#dc2626",
      "RO": "#fde047"
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
    function renderGeoRows(items, maxCount, colorFn) {
      return items.map((g) => {
        const barColor = colorFn(g.country);
        return '<div class="bar-row"><span class="bar-label" title="' + g.label + '">' + g.label + '</span><div class="bar-container"><div class="bar" style="width: ' + (g.count / maxCount * 100).toFixed(1) + "%; background: " + barColor + ';"></div></div><span class="bar-value">' + g.count + "</span></div>";
      }).join("");
    }
    __name(renderGeoRows, "renderGeoRows");
    const siteGeo = (geo || []).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
      country: g.country,
      visitors: g.visitors
    }));
    const mergedGeo = {};
    siteGeo.forEach((g) => {
      if (!mergedGeo[g.label]) mergedGeo[g.label] = { ...g };
      else mergedGeo[g.label].visitors += g.visitors;
    });
    const siteRows = Object.values(mergedGeo).map((g) => ({ ...g, count: g.visitors })).sort((a, b) => b.count - a.count);
    const siteMax = Math.max(...siteRows.map((g) => g.count), 1);
    if (siteRows.length > 0) {
      return '<div class="k4-split-scroll">' + renderGeoRows(siteRows, siteMax, countryColor) + "</div>";
    }
    return '<p style="color:#666;">No site visitor data yet</p>';
  })()}
    </div>

    <!-- Art Geography -->
    <div class="section k4-split-panel">
      <div class="section-header">
        <h3>\u{1F3A8} Art Geography</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Only visitors who viewed art (chapters, galleries, or zoomed images).</div></span>
      </div>
      ${(() => {
    const countryColors = {
      "US": "#a78bfa",
      "FR": "#ef4444",
      "DE": "#f97316",
      "BR": "#22c55e",
      "GB": "#6366f1",
      "CA": "#ec4899",
      "AU": "#eab308",
      "MX": "#14b8a6",
      "IN": "#f59e0b",
      "JP": "#e11d48",
      "IT": "#84cc16",
      "ES": "#a855f7",
      "NL": "#fb923c",
      "AT": "#dc2626",
      "HU": "#c026d3",
      "SG": "#0ea5e9",
      "HK": "#d946ef",
      "CN": "#b91c1c",
      "KR": "#2563eb",
      "CO": "#fbbf24",
      "PL": "#f43f5e",
      "SE": "#06b6d4",
      "NO": "#0284c7",
      "FI": "#0369a1",
      "CH": "#dc2626",
      "RU": "#1d4ed8",
      "UA": "#fcd34d",
      "AR": "#60a5fa",
      "ZA": "#a78bfa",
      "NZ": "#2dd4bf",
      "PT": "#e879f9",
      "CG": "#f472b6",
      "CL": "#38bdf8",
      "PE": "#fbbf24",
      "IE": "#4ade80",
      "BE": "#facc15",
      "CZ": "#7dd3fc",
      "DK": "#ef4444",
      "GR": "#0ea5e9",
      "IL": "#6366f1",
      "TW": "#d946ef",
      "TH": "#f97316",
      "PH": "#8b5cf6",
      "TR": "#dc2626",
      "RO": "#fde047"
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
    function renderGeoRows(items, maxCount, colorFn) {
      return items.map((g) => {
        const barColor = colorFn(g.country);
        return '<div class="bar-row"><span class="bar-label" title="' + g.label + '">' + g.label + '</span><div class="bar-container"><div class="bar" style="width: ' + (g.count / maxCount * 100).toFixed(1) + "%; background: " + barColor + ';"></div></div><span class="bar-value">' + g.count + "</span></div>";
      }).join("");
    }
    __name(renderGeoRows, "renderGeoRows");
    const artGeo = (geo || []).filter((g) => g.art_viewers > 0).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
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

    <!-- External Reach -->
    <div class="section k4-split-panel">
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
      const srcIcons = { "Google Search": "\u{1F50D}", "Google Images": "\u{1F5BC}\uFE0F", "Bing": "\u{1F171}\uFE0F", "Twitter/X": "\u{1F426}", "Facebook": "\u{1F4D8}", "Pinterest": "\u{1F4CC}", "DuckDuckGo": "\u{1F986}", "ChatGPT": "\u{1F9E0}", "Open Graph": "\u{1F578}\uFE0F", "Structured Data": "\u{1F9FE}", "Yandex": "\u{1F50D}", "Baidu": "\u{1F50D}", "Direct": "\u{1F517}", "Internal": "\u{1F3E0}", "Other": "\u{1F310}", "Unknown": "\u2753" };
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

    <div class="section">
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
      "301": "#10b981",
      "302": "#10b981",
      "410": "#f59e0b",
      "404": "#ef4444"
    };
    const typeLabels = {
      smart404_redirect: "301",
      smart404_gone: "410",
      smart404_fallback: "404",
      smart404_homepage: "Home",
      "301": "301",
      "302": "302",
      "410": "410",
      "404": "404"
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
      "301": "#10b981",
      "302": "#10b981",
      "410": "#f59e0b",
      "404": "#ef4444"
    };
    const eventLabels2 = {
      smart404_redirect: "301",
      smart404_gone: "410",
      smart404_fallback: "404",
      smart404_homepage: "Home",
      "301": "301",
      "302": "302",
      "410": "410",
      "404": "404"
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

    <div class="section">
      <h3>Top 25 Pages</h3>
      ${pages.length === 0 ? '<p style="color:#666">No data yet</p>' : (() => {
    const galleryPaths = /* @__PURE__ */ new Set([
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
      "/Galleries/Fine-Art-Photography/Architecture/Gallery",
      "/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments",
      "/Galleries/Fine-Art-Photography/Miscellaneous/Pets",
      "/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife",
      "/Other/K4-Select-Series/Engrained/Engrained-Series"
    ]);
    const maxViews = Math.max(...pages.map((p) => p.views || 0), 1);
    return pages.map((p, i) => {
      const path = String(p.page_path || "/");
      const isChapter = /\/i-[A-Za-z0-9]+$/.test(path);
      const isGallery = galleryPaths.has(path);
      const color = isChapter ? "#a78bfa" : isGallery ? "#10b981" : "#4a9eff";
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
  })()}
    </div>

    <div class="section">
      <div class="section-header">
        <h3>? Top Entry Pages</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">First page visited in each session. \u{1F50D}=Google Search, \u{1F5BC}\uFE0F=Images, \u{1F171}\uFE0F=Bing, \u{1F4CC}=Pinterest, \u{1F426}=Twitter, \u{1F4D8}=Facebook, \u{1F517}=Direct, \u{1F504}=Internal</div></span>
      </div>
      ${entryPages.length === 0 ? '<p style="color:#666">No data yet</p>' : `
      <table>
        <tr><th>Page</th><th>From</th><th>Sess</th></tr>
        ${entryPages.slice(0, 15).map((p) => {
    const isImage = p.page_path.includes("/i-");
    const shortPath = p.page_path.length > 30 ? "..." + p.page_path.slice(-27) : p.page_path;
    const pageIcon = isImage ? "\u{1F5BC}\uFE0F" : "\u{1F4C4}";
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
    return `<tr><td title="${p.page_path}">${pageIcon} ${shortPath}</td><td title="${p.ref_source}">${refIcon}</td><td>${p.sessions}</td></tr>`;
  }).join("")}
      </table>
      `}
    </div>

    <div class="section">
      <div class="section-header">
        <h3>Gallery Performance</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Image views grouped by gallery. Colors: \u{1F7E3} Painterly, \u{1F535} Traditional, \u{1F7E0} K4 Select</div></span>
      </div>
      <table>
        <tr><th>Gallery</th><th>Sess</th><th>Zoom%</th><th>Avg</th></tr>
        ${galleries.map((g) => {
    const typeColors = { painterly: "#a855f7", traditional: "#4a9eff", select: "#f59e0b" };
    const color = typeColors[g.gallery_type] || "#888";
    return `<tr>
            <td style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
              ${formatEventName(g.gallery_id || "Unknown")}
            </td>
            <td>${g.sessions}</td>
            <td>${g.zoom_pct || 0}%</td>
            <td>${g.avg_events || 0}</td>
          </tr>`;
  }).join("")}
        ${galleries.length === 0 ? '<tr><td colspan="4">No data yet</td></tr>' : ""}
      </table>
    </div>

    <div class="section">
      <h3>\u{1F3A8} Top 10 Themes Clicked</h3>
      ${themesClicked.length === 0 ? '<p style="color:#666">No theme clicks yet</p>' : `
      <table>
        <tr><th>Theme</th><th>Sessions</th><th>Clicks</th></tr>
        ${themesClicked.map((t) => `
          <tr>
            <td>${formatEventName(t.theme || "Unknown")}</td>
            <td>${t.sessions}</td>
            <td>${t.clicks}</td>
          </tr>
        `).join("")}
      </table>
      `}
    </div>

    <div class="section">
      <div class="section-header">
        <h3>\u{1F6AA} Where People Leave</h3>
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
    </div>

    <div class="section" style="max-height: none;">
      <div class="section-header">
        <h3>\u{1F9CA} Harvester Friction</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Selective friction engaged on image requests (delay or 429). This is your \u201CX extraction attempts slowed\u201D metric for the selected period.</div></span>
      </div>
      <div style="display:flex; flex-direction:column; gap: 10px;">
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap: 10px;">
          <span style="color:#cbd5e1; font-weight:700;">Extraction attempts slowed</span>
          <span style="color:#4a9eff; font-weight:900; font-size: 26px;">${artViewsSummary?.harvester_friction_events || 0}</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap: 10px; padding-top: 4px; border-top: 1px solid #333;">
          <span style="color:#9ca3af;">\u23F3 Delayed</span>
          <span style="color:#e5e7eb; font-weight:800;">${artViewsSummary?.harvester_friction_delay_events || 0}</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap: 10px;">
          <span style="color:#9ca3af;">\u26D4 429\u2019d</span>
          <span style="color:#e5e7eb; font-weight:800;">${artViewsSummary?.harvester_friction_429_events || 0}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Bot Intelligence Section -->
  <div style="max-width: 1780px; margin: 0 auto;">
  <h2 style="margin-top: 30px;">\u{1F6E1}\uFE0F Bot Intelligence <span style="font-size: 12px; color: #888; font-weight: normal;">(Threat Classification)</span></h2>
  <p style="color: #888; margin: -10px 0 15px 0; font-size: 12px;">
    Risk accumulates over time. \u{1F7E0} Level 3 = observe. \u{1F7E3} Level 4 = friction-managed extraction. \u{1F7E4} Level 5 = block recommended (\u226510 429s/day OR sustained high-rate pulls).
    <button onclick="refreshBotIntelligence()" style="margin-left: 10px; background: #333; color: #888; border: 1px solid #555; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">\u{1F504} Refresh</button>
  </p>
  
  <!-- Risk Summary Pills -->
  <div class="pulse" style="margin-bottom: 15px;">
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">\u{1F7E2} ${botIntelligence?.verified?.length || 0}</span>
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
    const suspects = (botIntelligence?.suspects || []).filter((s2) => s2 && s2.status !== "blocked");
    const blockRecommendedCount = suspects.filter(isLevel5BlockRecommended).length;
    const frictionManagedCount = suspects.filter((s2) => (s2.risk_level || 0) >= 4).length - blockRecommendedCount;
    return suspects.length > 0 ? Math.max(0, frictionManagedCount) : Math.max(0, (botIntelligence?.stats?.risk4 || 0) - blockRecommendedCount);
  })()}</span>
      <span class="label" style="color: #f5d0fe;">Friction-Managed <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #f5d0fe;">i</span></span>
      <div class="tooltip"><strong>Friction-managed IPs (cumulative, Level 4).</strong> Total count of unique IPs classified as automated extractors over time. These clients are automatically slowed (650-1600ms delay) or rate-limited (429 at \u226540 unique images/min) by the image proxy. See <em>\u{1F9CA} Harvester Friction</em> for today's slowed requests.</div>
    </div>
    ${(() => {
    const suspects = (botIntelligence?.suspects || []).filter((s2) => s2 && s2.status !== "blocked");
    const count = suspects.filter(isLevel5BlockRecommended).length;
    return `<div class="pulse-stat" style="background: linear-gradient(135deg, #78350f 0%, #92400e 100%);">
        <span class="value" style="color: #fff;">\u{1F7E4} ${count}</span>
        <span class="label" style="color: #fde68a;">Block Recommended <span class="info-icon" style="background: rgba(255,255,255,0.16); color: #fde68a;">i</span></span>
        <div class="tooltip"><strong>Level 5 governance signal (UI-only).</strong> K4 Bad Actor Day: scraper persists after friction and generates <strong>\u226510 429s/day</strong> OR shows sustained high-rate image pulls. Consider <em>Force Block</em> if it persists and is clearly non-beneficial traffic.</div>
      </div>`;
  })()}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
      <span class="value" style="color: #fff;"><span style="text-shadow: 0 0 2px #000, 0 0 4px #000;">\u2296</span> ${botIntelligence?.blocked?.filter((b) => b.is_active)?.length || 0}</span>
      <span class="label" style="color: #fecaca;">Blocked <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fecaca;">i</span></span>
      <div class="tooltip">Manually blocked IPs. Returns 403 Forbidden. Can unblock from Blocked IPs section below.</div>
    </div>
  </div>

  <div class="bot-intel-grid" style="display: grid; grid-template-columns: 580px 580px 580px; gap: 16px; width: fit-content; margin: 0 auto;">
    <!-- Verified Search Bots (Good!) -->
    <div class="section" style="border: 1px solid #10b98133;">
      <h3 style="color: #10b981;">\u{1F7E2} Verified Search Bots</h3>
      <p style="color: #888; font-size: 10px; margin: -5px 0 10px 0;">Search engines indexing your art for Google/Bing Images!</p>
      ${(botIntelligence?.verified || []).length === 0 ? '<p style="color:#666">No verified bots detected yet</p>' : '<div style="max-height: 300px; overflow-y: auto;">' + (botIntelligence?.verified || []).map((v) => {
    const botIcons = {
      "googlebot": "\u{1F50D}",
      "bingbot": "\u{1F171}\uFE0F",
      "applebot": "\u{1F34E}",
      "duckduckbot": "\u{1F986}",
      "yandex": "\u{1F1F7}\u{1F1FA}",
      "baidu": "\u{1F1E8}\u{1F1F3}",
      "facebook": "\u{1F4D8}",
      "twitter": "\u{1F426}",
      "pinterest": "\u{1F4CC}",
      "linkedin": "\u{1F4BC}",
      "openai": "\u{1F300}",
      "claude": "\u{1F9E0}"
    };
    const icon = botIcons[v.bot_name?.toLowerCase()] || "\u{1F916}";
    const displayName = v.bot_name ? v.bot_name.charAt(0).toUpperCase() + v.bot_name.slice(1) : "Unknown";
    const imgCount = v.image_count || 0;
    const pgCount = v.page_count || 0;
    const breakdown = imgCount > 0 || pgCount > 0 ? "\u{1F5BC}\uFE0F " + imgCount + " images, \u{1F4C4} " + pgCount + " pages" : v.total_requests + " requests";
    return '<div style="display: flex; align-items: center; padding: 8px; margin-bottom: 6px; background: #10b98111; border-radius: 6px; gap: 10px;"><span style="font-size: 18px;">' + icon + '</span><div style="flex: 1;"><div style="color: #10b981; font-weight: bold; font-size: 12px;">' + displayName + '</div><div style="color: #888; font-size: 10px;">' + breakdown + '</div></div><span style="color: #666; font-size: 10px;">' + (v.country || "") + "</span></div>";
  }).join("") + "</div>"}
    </div>

    <!-- Suspected automation (governance view) -->
    <div class="section">
      <h3>\u{1F9ED} Traffic Governance</h3>
      <p style="color: #888; font-size: 10px; margin: -5px 0 10px 0;">Most automated traffic is mitigated automatically. Manual blocking should be reserved for persistent abuse.</p>
      <div style="color:#666; font-size: 10px; margin: -6px 0 10px 0;">Protected (selected period): \u23F3 ${artViewsSummary?.harvester_friction_delay_events || 0} delayed \xB7 \u26D4 ${artViewsSummary?.harvester_friction_429_events || 0} 429</div>
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
          ${(botIntelligence?.suspects || []).filter((s2) => s2.risk_level >= 2 && s2.status !== "blocked").map((s2) => {
    const riskColors = { 1: "#10b981", 2: "#fbbf24", 3: "#f97316", 4: "#a855f7", 5: "#92400e" };
    const riskIcons = { 1: "\u{1F7E2}", 2: "\u{1F7E1}", 3: "\u{1F7E0}", 4: "\u{1F7E3}", 5: "\u{1F7E4}" };
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
      friction_active: { bg: "#a855f722", color: "#f5d0fe", text: "\u{1F7E3} Friction Active" },
      block_recommended: { bg: "#92400e22", color: "#fde68a", text: "\u{1F7E4} Block Recommended" },
      observation: { bg: "#f9731622", color: "#fed7aa", text: "\u{1F7E0} Observing" },
      manual_block: { bg: "#dc262622", color: "#fecaca", text: "\u{1F534} Manual Block" }
    };
    const status = statusBadges[protectionStatus] || statusBadges.observation;
    const statusHtml = '<span title="' + protectionStatus + '" style="display:inline-flex;align-items:center;gap:6px;background:' + status.bg + ";color:" + status.color + ';padding:2px 6px;border-radius:999px;font-size:10px;">' + status.text + "</span>";
    const actionHtml = isBlocked ? '<span style="color: #666;">Blocked</span>' : isBlockRecommended ? `<button onclick="blockIP('` + s2.ip_hash + `')" title="Block recommended: \u226510 429s/day or sustained high-rate pulls" style="background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">Force Block</button>` : `<button onclick="blockIP('` + s2.ip_hash + `')" title="Force a manual block (usually unnecessary; friction already mitigates most automation)" style="background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">Force Block</button>`;
    return '<tr style="border-bottom: 1px solid #333; ' + rowStyle + '"><td style="padding: 6px 4px;"><span style="background: ' + riskColor + "22; color: " + riskColor + '; padding: 2px 6px; border-radius: 8px; font-weight: bold;">' + riskIcon + " " + displayRiskLevel + '</span></td><td style="padding: 6px 4px;">' + statusHtml + '</td><td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">' + s2.ip_hash + '<span style="color: #666; margin-left: 4px;">' + (s2.country || "") + '</span></td><td style="padding: 6px 4px; text-align: right; font-weight: bold; color: ' + reqColor + ';">' + s2.total_requests + '</td><td style="padding: 6px 4px; color: #888; font-size: 10px;" title="' + rules.join(", ") + '">' + rulesShort + (rules.length > 2 ? "..." : "") + '</td><td style="padding: 6px 4px; text-align: center;"><span style="color: ' + daysColor + ';">' + s2.days_seen + '</span></td><td style="padding: 6px 4px; text-align: center;">' + actionHtml + "</td></tr>";
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
    const isActive = b.is_active === 1;
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

    <!-- Harvester Friction -->
    <div class="section">
      <div class="section-header">
        <h3>\u{1F9CA} Harvester Friction</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Selective friction engaged on image requests (delay or 429). This is your "X extraction attempts slowed" metric for the selected period.</div></span>
      </div>
      <div style="display:flex; flex-direction:column; gap: 10px;">
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap: 10px;">
          <span style="color:#cbd5e1; font-weight:700;">Extraction attempts slowed</span>
          <span style="color:#4a9eff; font-weight:900; font-size: 26px;">${artViewsSummary?.harvester_friction_events || 0}</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap: 10px; padding-top: 4px; border-top: 1px solid #333;">
          <span style="color:#9ca3af;">\u23F3 Delayed</span>
          <span style="color:#e5e7eb; font-weight:800;">${artViewsSummary?.harvester_friction_delay_events || 0}</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap: 10px;">
          <span style="color:#9ca3af;">\u26D4 429'd</span>
          <span style="color:#e5e7eb; font-weight:800;">${artViewsSummary?.harvester_friction_429_events || 0}</span>
        </div>
      </div>
    </div>
  </div>
  </div>
  ` : ""}

  <p style="margin-top: 30px; color: #666; font-size: 12px; max-width: 1780px; margin-left: auto; margin-right: auto;">
    Generated ${(/* @__PURE__ */ new Date()).toISOString()} \u2014 ${periodLabel}
  </p>

  ${isSingleDay ? `
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
      if (!confirm('FORCE BLOCK IP: ' + ipHash + '?

Note: Most automated traffic is already slowed/rate-limited automatically. Use manual blocking only for persistent abuse.

This takes effect immediately.')) return;
      
      try {
        const res = await fetch('/__k4stats/block', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hash: ipHash, reason: 'Force block from governance dashboard' })
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
  <\/script>
  ` : ""}

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

// src/analytics/dashboard/controller.js
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
    hideChardon
  } = filters;
  const { summary, returningVisitors, newVisitors } = await getDashboardStats(env, {
    dateClause,
    galleryClause,
    ipClause,
    botClause,
    chardonClause,
    priorPeriodClause
  });
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
  const { devices, bounceRate, avgDurationSecs, avgDurationFormatted, peakHours, deviceEngagement } = await getSessionMetrics(env, {
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
  const { themesClicked, cowboyJumps, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, botSessions, botPct } = await getEngagementDepth(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const { entryPages, imagePageViewsFromEvents, imageEntrySessionsFromEvents, entryRefCounts } = await getEntryAnalysis(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const { exitPages, exitSummary, exitByCategory } = await getExitAnalysis(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause
  });
  const { edgeEvents, edgeSummary } = await getEdgeEvents(env, { yesterday, days });
  const { artViewsSummary, artViewsByType, topArtViews, externalImageAccess, externalImageAccessTotal, externalReachGeo, externalReachSources, entryRefCountsObj, imageAccessOverview, viewerDepth, suppressionStats } = await getArtViews(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause,
    artIpClause,
    baseDateClause,
    hideBotsPredicate,
    hideBots
  });
  const botIntelligence = await getBotIntelligence(env);
  const periodTotals = await getPeriodTotals(env, { dateClause: rangeDateClause, botClause, chardonClause });
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
    entryRefCountsObj,
    imageAccessOverview,
    viewerDepth,
    suppressionStats,
    botIntelligence,
    periodTotals
  };
  const dashboardData = buildDashboardData(queryResults, {
    days,
    yesterday,
    selectedDate,
    galleryFilter,
    excludeIp,
    viewerIp,
    hideBots,
    hideChardon
  });
  return renderDashboard(dashboardData);
}
__name(handleDashboardRequest, "handleDashboardRequest");

// src/analytics/dashboard/route.js
function withAdminNoCacheHeaders(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Vary", "Authorization");
  return headers;
}
__name(withAdminNoCacheHeaders, "withAdminNoCacheHeaders");
function checkBasicAuth(request, env) {
  const auth = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  return auth === expected;
}
__name(checkBasicAuth, "checkBasicAuth");
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
function getBestClientIP(request) {
  const cfIp = request.headers.get("CF-Connecting-IP") || null;
  const xff = request.headers.get("X-Forwarded-For") || null;
  const isIPv4 = /* @__PURE__ */ __name((ip) => typeof ip === "string" && ip.includes(".") && !ip.includes(":"), "isIPv4");
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
    if (excludeIp) globalPartsNoBots.push(`(ip IS NULL OR ip != '${excludeIp}')`);
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
                 OR is_verified_bot = 1
                 OR is_datacenter = 1
                 OR risk_level >= 3
            )
          ))
        )` : "";
    if (hideChardon) {
      if (viewerIp) globalPartsNoBots.push(`(ip IS NULL OR ip != '${viewerIp}')`);
      globalPartsNoBots.push(`city != 'Chardon'`);
      globalPartsNoBots.push(`(referer IS NULL OR referer NOT LIKE '%localhost%')`);
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
    if (excludeIpHash && excludeIpHash !== "unknown") artIpParts.push(`ip_hash != '${excludeIpHash}'`);
    if (hideBots) {
      artIpParts.push(
        `NOT (
          ip_hash LIKE '3.%' OR ip_hash LIKE '17.%' OR ip_hash LIKE '18.%' OR ip_hash LIKE '40.77.%' OR ip_hash LIKE '52.%' OR ip_hash LIKE '54.%' OR ip_hash LIKE '65.55.%'
          OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
          OR ip_hash IN (
            SELECT ip_hash FROM suspected_bots
            WHERE status = 'blocked'
               OR is_verified_bot = 1
               OR is_datacenter = 1
               OR risk_level >= 3
          )
        )`
      );
    }
    if (hideChardon && viewerIpHash && !excludeIpHash) artIpParts.push(`ip_hash != '${viewerIpHash}'`);
    if (hideChardon) artIpParts.push(`(referrer IS NULL OR referrer NOT LIKE '%localhost%')`);
    const artIpClause = artIpParts.length > 0 ? "AND " + artIpParts.join(" AND ") : "";
    const botClause = hideBots ? `AND NOT (
          ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%'
          OR city = 'Ashburn'
          OR ip_hash IN (SELECT ip_hash FROM blocked_ips WHERE is_active = 1)
          OR ip_hash IN (
            SELECT ip_hash FROM suspected_bots
            WHERE status = 'blocked'
               OR is_verified_bot = 1
               OR is_datacenter = 1
               OR risk_level >= 3
          )
        )` : "";
    const chardonClause = hideChardon ? `AND city != 'Chardon'` : "";
    const priorPeriodClause = (selectedDate ? `date(ts, '-5 hours') < '${selectedDate}'` : yesterday ? `ts < datetime('now', '-5 hours', '-1 day', 'start of day')` : `ts < datetime('now', '-5 hours', '-${days} days')`) + globalFilterClause;
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
      hideChardon
    });
    return new Response(html, {
      status: 200,
      headers: withAdminNoCacheHeaders({
        "Content-Type": "text/html; charset=utf-8"
      })
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    return new Response(
      `Error: ${err.message}`,
      {
        status: 500,
        headers: withAdminNoCacheHeaders({ "Content-Type": "text/plain; charset=utf-8" })
      }
    );
  }
}
__name(handleDashboardRequest2, "handleDashboardRequest");

// src/analytics/collector.js
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
    await logArtView2(env, "chapter_exposure", imageId, request, sessionId, "recovery", visitorId, null, null, 1, "zoom");
  } catch (err) {
    console.error("Exposure recovery failed:", err?.message || err);
  }
}
__name(recoverExposureFromZoom, "recoverExposureFromZoom");
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(
      (resolve) => setTimeout(() => resolve("timeout"), ms)
    )
  ]);
}
__name(withTimeout, "withTimeout");
async function logEdgeEvent2(...args) {
  try {
    return await withTimeout(logEdgeEvent(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logEdgeEvent]:", err?.message || err);
  }
}
__name(logEdgeEvent2, "logEdgeEvent");
async function logArtView2(...args) {
  try {
    return await withTimeout(logArtView(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logArtView]:", err?.message || err);
  }
}
__name(logArtView2, "logArtView");
async function logRawEvent2(...args) {
  try {
    return await withTimeout(logRawEvent(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logRawEvent]:", err?.message || err);
  }
}
__name(logRawEvent2, "logRawEvent");
async function logVerifiedBot2(...args) {
  try {
    return await withTimeout(logVerifiedBot(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logVerifiedBot]:", err?.message || err);
  }
}
__name(logVerifiedBot2, "logVerifiedBot");
function readCookieValue(cookieHeader, name) {
  if (!cookieHeader || !name) return null;
  const re = new RegExp("(?:^|;\\s*)" + name.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&") + "=([^;]+)");
  const m = String(cookieHeader).match(re);
  return m ? m[1] : null;
}
__name(readCookieValue, "readCookieValue");
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
function applyNoStore(headers) {
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return headers;
}
__name(applyNoStore, "applyNoStore");
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
        "Vary": "Origin"
      });
      applyNoStore(headers2);
      return new Response("Invalid JSON", { status: 400, headers: headers2 });
    }
    const {
      session_id = null,
      event = null,
      gallery_id = null,
      image_id = null,
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
      const headers2 = applyNoStore(new Headers({ "Content-Type": "text/plain" }));
      return new Response("Missing event", { status: 400, headers: headers2 });
    }
    const legacyPaths = ["/Photoshootsandevents/", "/Photography-Galleries/", "/Scheduled-Shoots/", "/Is-Winter/"];
    if (normalizedPagePath && legacyPaths.some((p) => normalizedPagePath.startsWith(p))) {
      return new Response(JSON.stringify({ ok: true, filtered: "legacy_path" }), {
        status: 200,
        headers: applyNoStore(new Headers({ "Content-Type": "application/json" }))
      });
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
    const normalizeGalleryTargetId = /* @__PURE__ */ __name((path) => {
      if (typeof path !== "string") return null;
      return path.replace(/^\/Galleries\//, "").replace(/^\/Other\//, "").replace(/\/$/, "");
    }, "normalizeGalleryTargetId");
    const inferImageIdFromPath = /* @__PURE__ */ __name((path) => {
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
        ctx?.waitUntil?.(recoverExposureFromZoom(env, request, visitorId, targetId, bestSessionId));
      }
    } else if (storedEventType === "gallery_view") {
      targetId = gallery_id || normalizeGalleryTargetId(normalizedPagePath);
    } else if (storedEventType === "theme_click") {
      targetId = theme || normalizedPagePath || null;
    } else {
      targetId = image_id || gallery_id || normalizedPagePath || null;
    }
    ctx?.waitUntil?.(logRawEvent2(env, storedEventType, targetId, request, {
      sessionId: bestSessionId,
      source: "js",
      visitorId,
      // Use the client-reported page_path for easier SQL grouping.
      page: normalizedPagePath || null,
      // Preserve the best external referrer (edge cookie beats client hint).
      refererOverride: bestReferrer || null
    }));
    const sidSetCookie = makeSidSetCookieHeader(request.url, bestSessionId);
    const vidSetCookie = existingVisitorId ? null : makeVidSetCookieHeader(request.url, visitorId);
    const headers = new Headers({
      "Access-Control-Allow-Origin": getAllowedOrigin(request),
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
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
function handleTrackOptions() {
  return new Response(null, {
    status: 204,
    headers: applyNoStore(new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }))
  });
}
__name(handleTrackOptions, "handleTrackOptions");
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
    await logEdgeEvent2(env, eventType, path || "unknown", imageId, false, request, null);
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
    return new Response(debug ? "Error: " + (err?.message || String(err)) : "Error", { status: 500 });
  }
}
__name(handleEdgeEvent, "handleEdgeEvent");
async function handleTrackEvent(request, env, ctx) {
  if (!env?.DB) {
    return new Response("ok", { status: 200 });
  }
  if (isSyntheticTraffic(request)) {
    return new Response("ok", { status: 200 });
  }
  try {
    const body = await request.json();
    const { type, imageId, session_id = null, sessionId = null } = body;
    const cookieHeader = request.headers.get("cookie") || "";
    const sidCookie = readCookieValue(cookieHeader, "k4_sid");
    const bestSessionId = session_id || sessionId || sidCookie || null;
    const validTypes = ["xl_zoom", "zoom_open", "zoom", "slideshow_start", "chapter_view"];
    if (!type || !validTypes.includes(type)) {
      return new Response("ok", { status: 200 });
    }
    if (!imageId || !/^i-[a-zA-Z0-9_-]+$/.test(imageId)) {
      return new Response("ok", { status: 200 });
    }
    const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
    const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;
    const canonicalType = type === "zoom_open" || type === "zoom" ? "xl_zoom" : type;
    if (canonicalType === "xl_zoom" && bestSessionId && visitorId) {
      ctx.waitUntil(recoverExposureFromZoom(env, request, visitorId, imageId, bestSessionId));
    }
    ctx.waitUntil(logArtView2(env, canonicalType, imageId, request, bestSessionId, "js", visitorId));
    const sidSetCookie = makeSidSetCookieHeader(request.url, bestSessionId);
    return new Response("ok", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
        ...sidSetCookie ? { "Set-Cookie": sidSetCookie } : {}
      }
    });
  } catch (e) {
    console.error("Track event error:", e);
    return new Response("ok", { status: 200 });
  }
}
__name(handleTrackEvent, "handleTrackEvent");

// k4-image-proxy.js
var MANIFEST_URL = "https://k4studios.com/image-manifest.json";
var IMAGE_ID_MAP_URL2 = "https://k4studios.com/imageIdMap.json";
var MANIFEST_CACHE_TTL = 3600;
var SIZE_FALLBACK = {
  xl: ["xl", "l", "m", "s", "src"],
  l: ["l", "m", "s", "xl", "src"],
  m: ["m", "s", "l", "src"],
  // Never fall back to XL for grid thumbnails
  s: ["s", "m", "src"],
  src: ["src", "s", "m", "l", "xl"]
};
var K4_VID_COOKIE_NAME = "k4_vid";
var K4_VID_MAX_AGE = 31536e3;
function generateVisitorId() {
  return crypto.randomUUID();
}
__name(generateVisitorId, "generateVisitorId");
function getVisitorIdFromRequest(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${K4_VID_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
__name(getVisitorIdFromRequest, "getVisitorIdFromRequest");
function getOrCreateVisitorId(request) {
  const existingId = getVisitorIdFromRequest(request);
  if (existingId) {
    return { visitorId: existingId, isNew: false };
  }
  return { visitorId: generateVisitorId(), isNew: true };
}
__name(getOrCreateVisitorId, "getOrCreateVisitorId");
function createVisitorIdCookie(visitorId, hostname) {
  const host = String(hostname || "").toLowerCase();
  const domainAttr = host.endsWith("k4studios.com") ? "; Domain=.k4studios.com" : "";
  return `${K4_VID_COOKIE_NAME}=${visitorId}; Path=/; Max-Age=${K4_VID_MAX_AGE}; Secure; SameSite=Lax${domainAttr}`;
}
__name(createVisitorIdCookie, "createVisitorIdCookie");
function addVisitorIdCookie(response, visitorId, isNew, request) {
  if (!isNew) return response;
  const newHeaders = new Headers(response.headers);
  let hostname;
  try {
    hostname = new URL(request?.url || "").hostname;
  } catch (e) {
    hostname = null;
  }
  newHeaders.append("Set-Cookie", createVisitorIdCookie(visitorId, hostname));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
__name(addVisitorIdCookie, "addVisitorIdCookie");
var blockedIpCache = /* @__PURE__ */ new Set();
var blockedIpCacheTime = 0;
var BLOCKED_IP_CACHE_TTL = 6e4;
async function loadBlockedIps(env) {
  if (!env?.DB) return;
  const now = Date.now();
  if (now - blockedIpCacheTime < BLOCKED_IP_CACHE_TTL) return;
  try {
    const rows = await env.DB.prepare(
      "SELECT ip_hash FROM blocked_ips WHERE is_active = 1"
    ).all();
    blockedIpCache = new Set((rows.results || []).map((r) => r.ip_hash));
    blockedIpCacheTime = now;
  } catch (e) {
    console.error("Load blocked IPs error:", e);
  }
}
__name(loadBlockedIps, "loadBlockedIps");
async function isIPBlocked(env, ipHash) {
  if (!env?.DB) return false;
  await loadBlockedIps(env);
  return blockedIpCache.has(ipHash);
}
__name(isIPBlocked, "isIPBlocked");
var ALWAYS_ALLOWED = [
  "/sitemap.xml",
  "/robots.txt",
  "/e05ffc8ff8004372b01c0e153ba16b44.txt"
  // IndexNow key
];
var manifestCache = null;
var manifestCacheTime = 0;
var imageIdMapCache = null;
var imageIdMapCacheTime = 0;
var knownGallerySetCache = null;
var knownGallerySetCacheTime = 0;
async function fetchJSONWithCache(ctx, url, memGet, memSet) {
  const now = Date.now();
  const mem = memGet();
  if (mem.data && now - mem.time < MANIFEST_CACHE_TTL * 1e3) {
    return mem.data;
  }
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
__name(fetchJSONWithCache, "fetchJSONWithCache");
function getManifest(ctx) {
  return fetchJSONWithCache(
    ctx,
    MANIFEST_URL,
    () => ({ data: manifestCache, time: manifestCacheTime }),
    (data, time) => {
      manifestCache = data;
      manifestCacheTime = time;
    }
  );
}
__name(getManifest, "getManifest");
function getImageIdMap(ctx) {
  return fetchJSONWithCache(
    ctx,
    IMAGE_ID_MAP_URL2,
    () => ({ data: imageIdMapCache, time: imageIdMapCacheTime }),
    (data, time) => {
      imageIdMapCache = data;
      imageIdMapCacheTime = time;
    }
  );
}
__name(getImageIdMap, "getImageIdMap");
function getKnownGallerySetFromImageIdMap(imageIdMap) {
  if (!imageIdMap || typeof imageIdMap !== "object") return /* @__PURE__ */ new Set();
  if (knownGallerySetCache && knownGallerySetCacheTime === imageIdMapCacheTime) {
    return knownGallerySetCache;
  }
  const set = /* @__PURE__ */ new Set();
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
__name(getKnownGallerySetFromImageIdMap, "getKnownGallerySetFromImageIdMap");
var ASSET_SOURCE_PREFIXES = /* @__PURE__ */ new Set(["OG", "TW", "PN", "SD"]);
function parseImageRoute(pathname) {
  const match = pathname.match(/^\/img\/((?:OG|TW|PN|SD)-)?(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)\/?$/);
  if (!match) return null;
  const rawPrefix = match[1] || null;
  const canonicalImageId = match[2];
  const size = match[3];
  const prefix = rawPrefix ? String(rawPrefix).replace("-", "").toUpperCase() : null;
  if (prefix && !ASSET_SOURCE_PREFIXES.has(prefix)) return null;
  const imageId = prefix ? `${prefix}-${canonicalImageId}` : canonicalImageId;
  const assetSource = prefix ? prefix.toLowerCase() : null;
  return { imageId, canonicalImageId, size, assetSource };
}
__name(parseImageRoute, "parseImageRoute");
function rewriteLegacyProxyToImgRequest(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/proxy\/((?:OG|TW|PN|SD)-)?(i-[a-zA-Z0-9-]+)\.(?:jpe?g|png|webp|gif|avif)\/?$/i);
  if (!match) return null;
  const rawPrefix = match[1] || null;
  const canonicalImageId = match[2];
  const prefix = rawPrefix ? String(rawPrefix).replace("-", "").toUpperCase() : null;
  if (prefix && !ASSET_SOURCE_PREFIXES.has(prefix)) return null;
  const imageId = prefix ? `${prefix}-${canonicalImageId}` : canonicalImageId;
  url.pathname = `/img/${imageId}/l`;
  return new Request(url.toString(), request);
}
__name(rewriteLegacyProxyToImgRequest, "rewriteLegacyProxyToImgRequest");
function resolveImageUrl(manifest, imageId, requestedSize) {
  const imageData = manifest[imageId];
  if (!imageData) return null;
  const fallbackChain = SIZE_FALLBACK[requestedSize] || SIZE_FALLBACK.m;
  for (const size of fallbackChain) {
    if (imageData[size]) return imageData[size];
  }
  return null;
}
__name(resolveImageUrl, "resolveImageUrl");
async function proxyImage(smugMugUrl, request) {
  const imageResponse = await fetch(smugMugUrl, {
    headers: {
      Accept: request.headers.get("Accept") || "image/*",
      "User-Agent": "K4-Image-Proxy-Worker/1.0",
      ...request.headers.get("Referer") && { Referer: request.headers.get("Referer") }
    },
    // Cache at CF edge for 1 year regardless of SmugMug's cache headers
    cf: {
      cacheTtl: 31536e3,
      // 1 year in seconds (matches browser Cache-Control)
      cacheEverything: true
      // Cache even with SmugMug's private/no-cache headers
    }
  });
  if (!imageResponse.ok) {
    return new Response("Image not found", {
      status: imageResponse.status,
      headers: { "Cache-Control": "no-store" }
    });
  }
  const headers = {
    "Content-Type": imageResponse.headers.get("Content-Type") || "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Robots-Tag": "noai, noimageai",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Proxy-Origin": "k4studios"
  };
  return new Response(imageResponse.body, { status: 200, headers });
}
__name(proxyImage, "proxyImage");
var GHOST_IMAGE_ID = "i-k4studios";
var TRANSPARENT_PIXEL_GIF = new Uint8Array([
  71,
  73,
  70,
  56,
  57,
  97,
  // GIF89a
  1,
  0,
  1,
  0,
  // 1x1
  128,
  0,
  0,
  // Global color table flag
  255,
  255,
  255,
  // White
  0,
  0,
  0,
  // Black (transparent)
  33,
  249,
  4,
  1,
  0,
  0,
  0,
  0,
  // Graphic control extension (transparency)
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
  // Image descriptor
  2,
  2,
  68,
  1,
  0,
  // Image data
  59
  // GIF trailer
]);
function looksLikeBrowser(request) {
  try {
    const ua = request.headers.get("user-agent") || "";
    const accept = request.headers.get("accept") || "";
    const secFetchMode = request.headers.get("sec-fetch-mode") || "";
    const secFetchSite = request.headers.get("sec-fetch-site") || "";
    const hasMozilla = /mozilla\//i.test(ua);
    const wantsHtml = /text\/html/i.test(accept);
    const hasFetchHints = Boolean(secFetchMode) || Boolean(secFetchSite);
    return hasMozilla && wantsHtml || wantsHtml && hasFetchHints;
  } catch {
    return false;
  }
}
__name(looksLikeBrowser, "looksLikeBrowser");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep, "sleep");
function getFrictionTestOverride(request, env) {
  try {
    const secret = env?.K4_FRICTION_TEST_TOKEN;
    if (!secret) return null;
    const token = request.headers.get("X-K4-Friction-Test") || "";
    if (!token || token !== secret) return null;
    const url = new URL(request.url);
    const asnStr = url.searchParams.get("k4friction_asn");
    if (!asnStr) return null;
    const asn = Number(asnStr);
    if (!Number.isFinite(asn) || asn <= 0) return null;
    const debug = url.searchParams.get("k4friction_debug") === "1";
    return { asn, debug };
  } catch {
    return null;
  }
}
__name(getFrictionTestOverride, "getFrictionTestOverride");
function withFrictionDebugHeaders(response, debugInfo) {
  if (!debugInfo?.enabled) return response;
  try {
    const headers = new Headers(response.headers);
    headers.set(
      "X-K4-Friction-Debug",
      `enabled=1; asn=${debugInfo.asn ?? ""}; bypass=${debugInfo.discoveryBypass ? 1 : 0}; suspect=${debugInfo.suspect ? 1 : 0}; unique=${debugInfo.uniquePerMinute ?? ""}; delayMs=${debugInfo.delayMs ?? ""}; action=${debugInfo.action ?? ""}`
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
__name(withFrictionDebugHeaders, "withFrictionDebugHeaders");
function ensureNoAIHeaders(response) {
  try {
    if (!response) return response;
    const existing = response.headers?.get?.("X-Robots-Tag");
    if (existing && String(existing).trim()) return response;
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noai, noimageai");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    return response;
  }
}
__name(ensureNoAIHeaders, "ensureNoAIHeaders");
function hasK4SessionCookies(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  return /(?:^|;)\s*k4_vid=/.test(cookieHeader) || /(?:^|;)\s*k4_sid=/.test(cookieHeader);
}
__name(hasK4SessionCookies, "hasK4SessionCookies");
function isDiscoveryBotUA(uaRaw) {
  const ua = String(uaRaw || "");
  return /(googlebot|google-inspectiontool|googleother|apis-google|adsbot-google|googlebot-image|bingbot|bingpreview|msnbot|applebot|duckduckbot|yandex|baiduspider|slurp|petalbot|facebookexternalhit|facebot|twitterbot|pinterestbot|linkedinbot|slackbot|discordbot|telegrambot)/i.test(ua);
}
__name(isDiscoveryBotUA, "isDiscoveryBotUA");
function getSuspicionFlags({ request, asn, ua }) {
  const referer = request.headers.get("Referer") || request.headers.get("referer") || "";
  const noReferrer = !referer;
  const noSession = !hasK4SessionCookies(request);
  const hostingASNs = /* @__PURE__ */ new Set([
    24940,
    // Hetzner
    16276
    // OVH
  ]);
  const hostingASN = hostingASNs.has(Number(asn || 0));
  const isCacheWarmer = String(ua || "").toLowerCase().includes("k4-cache-warmer");
  return {
    noReferrer,
    noSession,
    hostingASN,
    suspect: !isCacheWarmer && noReferrer && noSession && hostingASN
  };
}
__name(getSuspicionFlags, "getSuspicionFlags");
async function getAndMarkUniqueImagesPerMinute(ctx, { ipHash, canonicalImageId }) {
  const cache = caches.default;
  const minuteBucket = Math.floor(Date.now() / 6e4);
  const safeIp = encodeURIComponent(String(ipHash || "noip"));
  const safeId = encodeURIComponent(String(canonicalImageId || "noid"));
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
          new Response("1", {
            headers: { "Cache-Control": "public, max-age=70" }
          })
        )
      );
    }
  } catch (e) {
    console.error("Rate-limit marker error:", e);
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
            headers: { "Cache-Control": "public, max-age=70" }
          })
        )
      );
    }
  } catch (e) {
    console.error("Rate-limit counter error:", e);
  }
  return { uniquePerMinute: count, isNewUnique };
}
__name(getAndMarkUniqueImagesPerMinute, "getAndMarkUniqueImagesPerMinute");
async function handleImageRequest(request, ctx, env) {
  const url = new URL(request.url);
  const route = parseImageRoute(url.pathname);
  if (!route) {
    return new Response("Invalid image route", {
      status: 400,
      headers: { "Cache-Control": "no-store" }
    });
  }
  if (route.canonicalImageId === GHOST_IMAGE_ID) {
    return new Response(TRANSPARENT_PIXEL_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Robots-Tag": "noai, noimageai",
        "X-Ghost-Image": "true"
      }
    });
  }
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  const ipHash = hashIP(ip);
  if (env?.DB && ipHash) {
    try {
      const isBlocked = await isIPBlocked(env, ipHash);
      if (isBlocked) {
        return new Response("Blocked", {
          status: 403,
          headers: { "Cache-Control": "no-store" }
        });
      }
    } catch (e) {
      console.error("Bot check error:", e);
    }
  }
  const canonicalUrl = new URL(request.url);
  canonicalUrl.pathname = `/img/${route.canonicalImageId}/${route.size}`;
  const canonicalRequest = canonicalUrl.pathname === url.pathname ? request : new Request(canonicalUrl.toString(), request);
  const frictionTest = getFrictionTestOverride(request, env);
  const frictionDebug = {
    enabled: Boolean(frictionTest?.debug),
    asn: frictionTest?.asn ?? request.cf?.asn,
    discoveryBypass: false,
    suspect: false,
    uniquePerMinute: null,
    delayMs: null,
    action: "none"
  };
  try {
    if (request.method === "GET") {
      const ua = request.headers.get("User-Agent") || "";
      const discoveryBypass = isDiscoveryBotUA(ua);
      const effectiveAsn = frictionTest?.asn ?? request.cf?.asn;
      const flags = getSuspicionFlags({ request, asn: effectiveAsn, ua });
      const protectSizes = /* @__PURE__ */ new Set(["l", "xl", "src"]);
      const shouldProtectSize = protectSizes.has(String(route.size || "").toLowerCase());
      frictionDebug.discoveryBypass = discoveryBypass;
      frictionDebug.suspect = Boolean(flags?.suspect);
      if (shouldProtectSize && !discoveryBypass && flags.suspect) {
        const { uniquePerMinute } = await getAndMarkUniqueImagesPerMinute(ctx, {
          ipHash,
          canonicalImageId: route.canonicalImageId
        });
        frictionDebug.uniquePerMinute = uniquePerMinute;
        const frictionAction = uniquePerMinute >= 40 ? "429" : "delay";
        frictionDebug.action = frictionAction;
        if (env?.DB) {
          ctx.waitUntil(
            logArtView2(
              env,
              "harvester_friction",
              route.canonicalImageId,
              request,
              null,
              "proxy",
              null,
              route.size,
              "direct",
              1,
              frictionAction,
              route.assetSource
            )
          );
        }
        if (uniquePerMinute >= 40) {
          return new Response("Too Many Requests", {
            status: 429,
            headers: {
              "Cache-Control": "no-store",
              "Retry-After": "60"
            }
          });
        }
        let delayMs = 650;
        if (uniquePerMinute >= 10) delayMs = 1100;
        if (uniquePerMinute >= 20) delayMs = 1600;
        frictionDebug.delayMs = delayMs;
        await sleep(delayMs);
      }
    }
  } catch (e) {
    console.error("Selective friction error:", e);
  }
  try {
    const cached = await caches.default.match(canonicalRequest);
    if (cached) {
      const upgraded = ensureNoAIHeaders(cached);
      try {
        if (upgraded && upgraded !== cached && upgraded.status === 200) {
          ctx.waitUntil(caches.default.put(canonicalRequest, upgraded.clone()));
        }
      } catch (e) {
        console.error("Cache refresh error:", e);
      }
      if (env?.DB) {
        const ua = request.headers.get("User-Agent") || "";
        const uaLower = ua.toLowerCase();
        const isCacheWarmer = uaLower.includes("k4-cache-warmer");
        if (!isCacheWarmer && route.size === "l") {
          const cookieHeader = request.headers.get("Cookie") || "";
          const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
          const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;
          let sessionId = null;
          const sidCookieMatch = cookieHeader.match(/k4_sid=([^;]+)/);
          if (sidCookieMatch) {
            try {
              sessionId = decodeURIComponent(sidCookieMatch[1]);
            } catch {
              sessionId = sidCookieMatch[1];
            }
          }
          const referer = request.headers.get("Referer") || "";
          let refererUrl = null;
          try {
            refererUrl = referer ? new URL(referer) : null;
          } catch {
            refererUrl = null;
          }
          const refererHost = (refererUrl?.hostname || "").toLowerCase();
          const refererPath = refererUrl?.pathname || "";
          const isInternal = refererHost === "localhost" || refererHost === "127.0.0.1" || refererHost.endsWith("k4studios.com");
          const isImagePageReferer = /\/(Galleries|Other)\/.*\/i-[a-zA-Z0-9-]+\/?$/.test(refererPath);
          const normalizedRefererPath = (refererPath || "").replace(/\/+$/, "");
          const isSameImagePageReferer = normalizedRefererPath.endsWith("/" + route.canonicalImageId);
          if (isInternal && isImagePageReferer && isSameImagePageReferer && visitorId) {
            ctx.waitUntil(logArtView2(env, "chapter_exposure", route.canonicalImageId, request, sessionId, "proxy", visitorId, "l", "internal", null, null, route.assetSource));
          } else if (!isInternal && referer) {
            ctx.waitUntil(logArtView2(env, "external_image", route.canonicalImageId, request, sessionId, "proxy", visitorId, "l", "external", null, null, route.assetSource));
          } else if (!referer) {
            ctx.waitUntil(logArtView2(env, "direct_image", route.canonicalImageId, request, sessionId, "proxy", visitorId, "l", "direct", null, null, route.assetSource));
          }
          if (isVerifiedSearchBot(ua)) {
            ctx.waitUntil(logVerifiedBot2(env, route.canonicalImageId, request));
          }
        }
      }
      return withFrictionDebugHeaders(upgraded, frictionDebug);
    }
  } catch (e) {
    console.error("Cache lookup error:", e);
  }
  try {
    const manifest = await getManifest(ctx);
    const smugMugUrl = resolveImageUrl(manifest, route.canonicalImageId, route.size);
    if (!smugMugUrl) {
      return new Response("Image not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" }
      });
    }
    if (env?.DB) {
      const ua = request.headers.get("User-Agent") || "";
      const uaLower = ua.toLowerCase();
      const isCacheWarmer = uaLower.includes("k4-cache-warmer");
      const cookieHeader = request.headers.get("Cookie") || "";
      const vidCookieMatch = cookieHeader.match(/k4_vid=([^;]+)/);
      const visitorId = vidCookieMatch ? vidCookieMatch[1] : null;
      let sessionId = null;
      const sidCookieMatch = cookieHeader.match(/k4_sid=([^;]+)/);
      if (sidCookieMatch) {
        try {
          sessionId = decodeURIComponent(sidCookieMatch[1]);
        } catch {
          sessionId = sidCookieMatch[1];
        }
      }
      if (!isCacheWarmer && route.size === "l") {
        const referer = request.headers.get("Referer") || "";
        let refererUrl = null;
        try {
          refererUrl = referer ? new URL(referer) : null;
        } catch {
          refererUrl = null;
        }
        const refererHost = (refererUrl?.hostname || "").toLowerCase();
        const refererPath = refererUrl?.pathname || "";
        const isInternal = refererHost === "localhost" || refererHost === "127.0.0.1" || refererHost.endsWith("k4studios.com");
        const isImagePageReferer = /\/(Galleries|Other)\/.*\/i-[a-zA-Z0-9-]+\/?$/.test(refererPath);
        const normalizedRefererPath = (refererPath || "").replace(/\/+$/, "");
        const canonicalId = route.canonicalImageId;
        const assetSource = route.assetSource;
        const isSameImagePageReferer = normalizedRefererPath.endsWith("/" + canonicalId);
        if (isInternal && isImagePageReferer && isSameImagePageReferer && visitorId) {
          ctx.waitUntil(logArtView2(env, "chapter_exposure", canonicalId, request, sessionId, "proxy", visitorId, "l", "internal", null, null, assetSource));
        } else if (!isInternal && referer) {
          ctx.waitUntil(logArtView2(env, "external_image", canonicalId, request, sessionId, "proxy", visitorId, "l", "external", null, null, assetSource));
        } else if (!referer) {
          ctx.waitUntil(logArtView2(env, "direct_image", canonicalId, request, sessionId, "proxy", visitorId, "l", "direct", null, null, assetSource));
        }
      }
      if (isVerifiedSearchBot(ua)) {
        ctx.waitUntil(logVerifiedBot2(env, route.canonicalImageId, request));
      }
    }
    const response = await proxyImage(smugMugUrl, canonicalRequest);
    try {
      if (response?.status === 200) {
        ctx.waitUntil(caches.default.put(canonicalRequest, response.clone()));
      }
    } catch (e) {
      console.error("Cache put error:", e);
    }
    return withFrictionDebugHeaders(response, frictionDebug);
  } catch (err) {
    console.error("Image proxy error:", err);
    return new Response("Internal error", {
      status: 500,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
__name(handleImageRequest, "handleImageRequest");
function isImagePageRoute(pathname) {
  return /\/(Galleries|galleries|Other|other|Photography-Galleries)\/.*\/i-[a-zA-Z0-9-]+\/?$/.test(pathname);
}
__name(isImagePageRoute, "isImagePageRoute");
function extractImageId(pathname) {
  const match = pathname.match(/(i-[a-zA-Z0-9-]+)\/?$/);
  return match ? match[1] : null;
}
__name(extractImageId, "extractImageId");
function getParentGallery(pathname) {
  return pathname.replace(/\/i-[a-zA-Z0-9-]+\/?$/, "");
}
__name(getParentGallery, "getParentGallery");
async function handleImagePagePolicy(request, pathname, ctx, env) {
  const imageId = extractImageId(pathname);
  if (!imageId) return null;
  if (String(imageId).toLowerCase() === GHOST_IMAGE_ID.toLowerCase()) {
    return new Response("Gone", {
      status: 410,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }
  let search = "";
  try {
    search = new URL(request.url).search || "";
  } catch (_) {
    search = "";
  }
  try {
    const [manifest, imageIdMap] = await Promise.all([
      getManifest(ctx),
      getImageIdMap(ctx)
    ]);
    const knownGalleries = getKnownGallerySetFromImageIdMap(imageIdMap);
    const isBrowser = looksLikeBrowser(request);
    const isSearch = isSearchBot(request);
    if (manifest[imageId]) {
      const validPathsRaw = imageIdMap ? imageIdMap[imageId] : null;
      const requestedGalleryPath = getParentGallery(pathname);
      if (validPathsRaw) {
        const validPaths = Array.isArray(validPathsRaw) ? validPathsRaw : [validPathsRaw];
        const requestedLower = requestedGalleryPath.toLowerCase();
        const matchedPath = validPaths.find((p) => (p || "").toLowerCase() === requestedLower);
        if (!matchedPath) {
          const requestedPrefixLower = `${requestedLower}/`;
          const isMissingLeafProbe = validPaths.some((p) => {
            const pl = String(p || "").toLowerCase();
            return pl.length > requestedLower.length && pl.startsWith(requestedPrefixLower);
          });
          if (isMissingLeafProbe) {
            return new Response("Not Found", {
              status: 404,
              headers: {
                "Cache-Control": "public, max-age=86400",
                "X-Robots-Tag": "noindex, nofollow"
              }
            });
          }
          const canonicalUrl = `https://www.k4studios.com${validPaths[0]}/${imageId}${search}`;
          ctx.waitUntil(logEdgeEvent2(env, "301", pathname, imageId, isSearch, request));
          return Response.redirect(canonicalUrl, 301);
        }
        if (matchedPath !== requestedGalleryPath) {
          const canonicalUrl = `https://www.k4studios.com${matchedPath}/${imageId}${search}`;
          ctx.waitUntil(logEdgeEvent2(env, "301", pathname, imageId, isSearch, request));
          return Response.redirect(canonicalUrl, 301);
        }
      }
      return null;
    }
    const parentGallery = getParentGallery(pathname);
    const isKnownGallery = knownGalleries.has(String(parentGallery || "").toLowerCase());
    if (isSearch || !isBrowser || !isKnownGallery) {
      ctx.waitUntil(logEdgeEvent2(env, "410", pathname, imageId, isSearch, request));
      return new Response("Gone", {
        status: 410,
        headers: {
          "X-Robots-Tag": "noindex",
          "Cache-Control": "public, max-age=86400"
          // 1 day
        }
      });
    }
    ctx.waitUntil(logEdgeEvent2(env, "302", pathname, imageId, false, request));
    return Response.redirect(`https://www.k4studios.com${parentGallery}${search}`, 302);
  } catch (err) {
    console.error("Image page policy error:", err);
    return null;
  }
}
__name(handleImagePagePolicy, "handleImagePagePolicy");
async function handleGatewayRequest(request, env) {
  const url = new URL(request.url);
  const ua = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept") || "";
  if (ALWAYS_ALLOWED.includes(url.pathname) || request.method === "HEAD" || request.method === "OPTIONS") {
    console.log("PROXY TARGET (always-allowed):", request.url);
    return fetch(request);
  }
  if (ALLOWED_BOTS.test(ua)) {
    console.log("PROXY TARGET (allowed-bot):", request.url);
    return fetch(request);
  }
  const isHTML = accept.includes("text/html");
  if (isHTML) {
    const blockedCountries = (env.BLOCKED_COUNTRIES || "CN,RU,IR,KP").split(",").map((c) => c.trim().toUpperCase());
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
    const cookies = request.headers.get("cookie") || "";
    const hasEntryRefCookie = cookies.includes("k4_entry_ref=");
    const isTopLevelNav = request.headers.get("Sec-Fetch-Dest") === "document" && request.headers.get("Sec-Fetch-Mode") === "navigate";
    if (!hasEntryRefCookie && isTopLevelNav) {
      const edgeReferer = request.headers.get("referer") || "";
      const cookieValue = edgeReferer ? encodeURIComponent(edgeReferer) : "direct";
      console.log("Edge referrer capture:", { raw: edgeReferer, cookieValue });
      console.log("PROXY TARGET (cookie-set):", request.url);
      const originResponse = await fetch(request);
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
__name(handleGatewayRequest, "handleGatewayRequest");
var OUR_DOMAINS = ["k4studios.com", "www.k4studios.com"];
var MAX_RANK = 50;
function escapeHtml(s = "") {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
__name(escapeHtml, "escapeHtml");
async function fetchSerpFromDataForSEO(keyword, env) {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error("DataForSEO credentials not configured");
  }
  const auth = btoa(`${login}:${password}`);
  const payload = [{
    keyword,
    location_name: "United States",
    language_name: "English",
    depth: 50
  }];
  const response = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/regular", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`DataForSEO API error: ${response.status}`);
  }
  return response.json();
}
__name(fetchSerpFromDataForSEO, "fetchSerpFromDataForSEO");
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
    if (!task || task.status_code !== 2e4) {
      console.error("DataForSEO task failed:", task?.status_message);
      return result;
    }
    const items = task.result?.[0]?.items || [];
    let rank = 0;
    for (const item of items) {
      if (item.type === "organic") {
        rank++;
        const url = item.url || "";
        const domain = item.domain || "";
        result.organicResults.push({ rank, url, domain, title: item.title || "" });
        if (rank <= 3) {
          result.top3Urls.push({ rank, url, domain });
        }
        if (OUR_DOMAINS.some((d) => domain.includes(d))) {
          result.allRankings.push({ rank, url, title: item.title || "" });
          if (!result.ourRank) {
            result.ourRank = rank;
            result.ourUrl = url;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error parsing SERP response:", err);
  }
  return result;
}
__name(parseSerpResponse, "parseSerpResponse");
async function runSerpCheck(env) {
  if (!env.DB) {
    throw new Error("Database not configured");
  }
  const keywords = await env.DB.prepare(
    "SELECT keyword FROM serp_keywords WHERE enabled = 1 ORDER BY keyword ASC"
  ).all();
  if (!keywords.results?.length) {
    return { checked: 0, message: "No keywords to check" };
  }
  const checkedAt = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  let checked = 0;
  const errors = [];
  for (const kw of keywords.results) {
    try {
      const existing = await env.DB.prepare(
        "SELECT id FROM serp_results WHERE keyword = ? AND engine = ? AND checked_at = ?"
      ).bind(kw.keyword, "google", checkedAt).first();
      if (existing) continue;
      const response = await fetchSerpFromDataForSEO(kw.keyword, env);
      const parsed = parseSerpResponse(response);
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        kw.keyword,
        "google",
        checkedAt,
        parsed.ourRank,
        parsed.ourUrl,
        JSON.stringify(parsed.allRankings),
        JSON.stringify(parsed.top3Urls),
        JSON.stringify(parsed.organicResults.slice(0, 10))
      ).run();
      checked++;
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      errors.push(`${kw.keyword}: ${err.message}`);
      console.error(`SERP check failed for ${kw.keyword}:`, err);
    }
  }
  return { checked, errors, checkedAt };
}
__name(runSerpCheck, "runSerpCheck");
async function handleSerpDashboard(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  if (!env.DB) {
    return new Response("Database not configured", { status: 500 });
  }
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  try {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const keywords = await env.DB.prepare(
      "SELECT * FROM serp_keywords WHERE enabled = 1 ORDER BY keyword ASC"
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
    const yesterday = /* @__PURE__ */ new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const previousResults = await env.DB.prepare(
      "SELECT keyword, our_rank FROM serp_results WHERE engine = ? AND checked_at = ?"
    ).bind("google", yesterdayStr).all();
    const prevMap = /* @__PURE__ */ new Map();
    for (const r of previousResults.results || []) {
      prevMap.set(r.keyword, r.our_rank);
    }
    const trendData = await env.DB.prepare(`
      SELECT keyword, checked_at, our_rank 
      FROM serp_results 
      WHERE engine = 'google' AND checked_at >= ?
      ORDER BY keyword, checked_at
    `).bind(cutoffStr).all();
    const trendByKeyword = {};
    for (const r of trendData.results || []) {
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
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    console.error("SERP dashboard error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
__name(handleSerpDashboard, "handleSerpDashboard");
async function handleSerpFetch(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  try {
    const result = await runSerpCheck(env);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleSerpFetch, "handleSerpFetch");
async function handleSerpKeyword(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  try {
    const body = await request.json();
    const { action, keyword, priority } = body;
    if (action === "add" && keyword) {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing) VALUES (?, ?, 1, 1, 0)"
      ).bind(keyword.toLowerCase().trim(), priority || 5).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (action === "delete" && keyword) {
      await env.DB.prepare("DELETE FROM serp_keywords WHERE keyword = ?").bind(keyword).run();
      await env.DB.prepare("DELETE FROM serp_results WHERE keyword = ?").bind(keyword).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleSerpKeyword, "handleSerpKeyword");
async function handleSerpLaunch(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  if (!env.DB) {
    return new Response("Database not configured", { status: 500 });
  }
  try {
    const keywords = await env.DB.prepare(
      "SELECT keyword FROM serp_keywords WHERE enabled = 1 ORDER BY keyword ASC"
    ).all();
    const kwList = keywords.results || [];
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const todayRanks = await env.DB.prepare(`
      SELECT keyword, engine, our_rank FROM serp_results 
      WHERE checked_at = ?
    `).bind(today).all();
    const todayMap = {};
    for (const r of todayRanks.results || []) {
      if (!todayMap[r.keyword]) todayMap[r.keyword] = {};
      todayMap[r.keyword][r.engine] = r.our_rank;
    }
    const keywordCards = kwList.map((kw, idx) => {
      const encoded = encodeURIComponent(kw.keyword);
      const safeKw = escapeHtml(kw.keyword);
      const todayData = todayMap[kw.keyword] || {};
      const gVal = todayData.google || "";
      const gaiVal = todayData.google_ai || "";
      const bVal = todayData.bing || "";
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
              <button onclick="logRank(this, ${idx}, '${safeKw}')" class="btn-log${hasLogged ? " logged" : ""}">\u{1F4BE} Save</button>
              ${hasLogged ? '<span class="saved-date">Saved today</span>' : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");
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
    \u{1F680} SERP Launch Pad
    <a href="/__k4serp" target="_blank">\u{1F4CA} Dashboard</a>
  </h1>
  <p class="subtitle">Search each keyword, then log your rank (saves to dashboard)</p>
  
  ${keywordCards || '<div class="empty">No keywords configured. Add some in the dashboard.</div>'}
  
  <div class="tip">
    <strong>\u{1F4A1} Tip:</strong> Open this page in incognito first (Ctrl+Shift+N in Chrome, Ctrl+Shift+P in Edge/Firefox), 
    then click the search buttons - tabs will inherit incognito mode. Enter your rank (or leave blank if not found).
  </div>
  
  <script>
    function openGoogle(q) {
      window.open('https://www.google.com/search?q=' + q, '_blank');
    }
    
    function openBing(q) {
      window.open('https://www.bing.com/search?q=' + q, '_blank');
    }
    
    async function logRank(btn, idx, keyword) {
      const gRank = document.getElementById('g-' + idx).value || null;
      const gaiRank = document.getElementById('gai-' + idx).value || null;
      const bRank = document.getElementById('b-' + idx).value || null;
      
      if (!gRank && !gaiRank && !bRank) {
        alert('Enter at least one rank');
        return;
      }
      
      btn.disabled = true;
      btn.textContent = 'Saving\u2026';
      
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
          btn.textContent = '\u{1F4BE} Save';
          btn.classList.remove('saved');
          btn.disabled = false;
        }, 1200);
      } catch (e) {
        btn.textContent = 'Error';
        setTimeout(() => {
          btn.textContent = '\u{1F4BE} Save';
          btn.disabled = false;
        }, 2000);
      }
    }
  <\/script>
</body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    console.error("SERP launch error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
__name(handleSerpLaunch, "handleSerpLaunch");
async function handleSerpLog(request, env) {
  const authResponse = checkSerpAuth(request, env);
  if (authResponse) return authResponse;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { keyword, google, google_ai, bing, bing_ai } = body;
    if (!keyword) {
      return new Response(JSON.stringify({ error: "Keyword required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const checkedAt = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (google !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'google', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, google).run();
    }
    if (google_ai !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'google_ai', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, google_ai).run();
    }
    if (bing !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'bing', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, bing).run();
    }
    if (bing_ai !== null) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO serp_results 
        (keyword, engine, checked_at, our_rank, our_url, all_rankings, top_3_urls, full_serp_json)
        VALUES (?, 'bing_ai', ?, ?, '', '[]', '[]', '{}')
      `).bind(keyword, checkedAt, bing_ai).run();
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("SERP log error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleSerpLog, "handleSerpLog");
function checkSerpAuth(request, env) {
  const auth = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  if (auth !== expected) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="K4 SERP Tracker"' }
    });
  }
  return null;
}
__name(checkSerpAuth, "checkSerpAuth");
function renderSerpDashboard({ days, keywords, latestResults, previousMap, trendByKeyword }) {
  const byKeywordEngine = {};
  for (const r of latestResults) {
    if (!byKeywordEngine[r.keyword]) byKeywordEngine[r.keyword] = {};
    byKeywordEngine[r.keyword][r.engine] = r;
  }
  const getValidRank = /* @__PURE__ */ __name((rank) => {
    const n = Number(rank);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }, "getValidRank");
  const ranksByEngine = /* @__PURE__ */ __name((engine) => latestResults.filter((r) => r.engine === engine).map((r) => getValidRank(r.our_rank)).filter(Boolean), "ranksByEngine");
  const avg = /* @__PURE__ */ __name((nums) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null, "avg");
  const googleRanks = ranksByEngine("google");
  const googleAiRanks = ranksByEngine("google_ai");
  const bingRanks = ranksByEngine("bing");
  const avgGoogle = avg(googleRanks);
  const avgGoogleAi = avg(googleAiRanks);
  const avgBing = avg(bingRanks);
  const lastCheck = latestResults.reduce((max, r) => !max || r.checked_at > max ? r.checked_at : max, null);
  const rankedGoogleCount = googleRanks.length;
  const rankedGoogleAiCount = googleAiRanks.length;
  const rankedBingCount = bingRanks.length;
  const keywordRows = keywords.map((kw) => {
    const engines = byKeywordEngine[kw.keyword] || {};
    const googleResult = engines.google;
    const googleAiResult = engines.google_ai;
    const bingResult = engines.bing;
    const gRank = googleResult?.our_rank;
    const gaiRank = googleAiResult?.our_rank;
    const bRank = bingResult?.our_rank;
    const prevRank = previousMap.get(kw.keyword);
    const change = gRank && prevRank ? prevRank - gRank : null;
    const changeIcon = change === null ? "" : change > 0 ? `<span style="color:#10b981">\u25B2${change}</span>` : change < 0 ? `<span style="color:#ef4444">\u25BC${Math.abs(change)}</span>` : '<span style="color:#888">\u2014</span>';
    const trend = trendByKeyword[kw.keyword] || [];
    const recentTrend = trend.slice(-14);
    const sparkline = recentTrend.map((t) => {
      const v = getValidRank(t.rank) ?? MAX_RANK;
      return Math.min(MAX_RANK, Math.max(1, v));
    });
    const validRecent = recentTrend.map((t) => getValidRank(t.rank)).filter(Boolean);
    const trendPoints = validRecent.length;
    const trendStart = trendPoints ? validRecent[0] : null;
    const trendEnd = trendPoints ? validRecent[validRecent.length - 1] : null;
    let trendPct = null;
    if (trendStart && trendEnd && trendStart > 0 && trendStart !== trendEnd) {
      trendPct = (trendStart - trendEnd) / trendStart * 100;
    }
    const trendBadge = (() => {
      if (!trendPoints) return '<span style="color:#666">n=0</span>';
      if (trendPct === null) return `<span style="color:#666">n=${trendPoints}</span>`;
      const isBetter = trendPct > 0;
      const color = isBetter ? "#10b981" : "#ef4444";
      const arrow = isBetter ? "\u25B2" : "\u25BC";
      return `<span style="color:${color}; font-weight:600">${arrow}${Math.abs(trendPct).toFixed(1)}% <span style="color:#666;font-weight:400">(n=${trendPoints})</span></span>`;
    })();
    const rankCell = /* @__PURE__ */ __name((rank) => {
      if (!rank) return '<td class="rank-cell">-</td>';
      const cls = rank <= 3 ? "rank-top3" : rank <= 10 ? "rank-top10" : "";
      return `<td class="rank-cell ${cls}">${rank}</td>`;
    }, "rankCell");
    return `
      <tr>
        <td style="font-weight:500">${escapeHtml(kw.keyword)}</td>
        <td class="rank-cell ${gRank && gRank <= 3 ? "rank-top3" : gRank && gRank <= 10 ? "rank-top10" : ""}">
          ${gRank || "-"} ${changeIcon}
        </td>
        ${rankCell(gaiRank)}
        ${rankCell(bRank)}
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${sparkline.length > 1 ? `
              <svg class="sparkline" viewBox="0 0 70 20" preserveAspectRatio="none">
                <polyline fill="none" stroke="#4a9eff" stroke-width="1.5" points="${sparkline.map((v, i) => `${i * (70 / Math.max(sparkline.length - 1, 1))},${(v - 1) / (MAX_RANK - 1) * 20}`).join(" ")}"/>
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
          >\u2715</button>
        </td>
      </tr>
    `;
  }).join("");
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
    \u{1F50D} K4 SERP Tracker 
    <a href="/__k4serp/launch">\u{1F680} Launch Pad</a>
    <a href="/__k4stats">? Analytics</a>
  </h1>
  
  <div class="controls">
    <button class="primary" onclick="fetchNow()">Fetch Now</button>
    <a href="?days=7">7 Days</a>
    <a href="?days=30">30 Days</a>
    <a href="?days=90">90 Days</a>
    <span class="last-check">Last: ${lastCheck || "Never"}</span>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="value">${keywords.length}</div>
      <div class="label">Keywords</div>
    </div>
    <div class="stat ${avgGoogle && avgGoogle <= 10 ? "good" : ""}">
      <div class="value">${avgGoogle ? avgGoogle.toFixed(1) : "-"}</div>
      <div class="label">Avg Google (n=${rankedGoogleCount})</div>
    </div>
    <div class="stat ${avgGoogleAi && avgGoogleAi <= 10 ? "good" : ""}">
      <div class="value">${avgGoogleAi ? avgGoogleAi.toFixed(1) : "-"}</div>
      <div class="label">Avg G-AI (n=${rankedGoogleAiCount})</div>
    </div>
    <div class="stat ${avgBing && avgBing <= 10 ? "good" : ""}">
      <div class="value">${avgBing ? avgBing.toFixed(1) : "-"}</div>
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
        <th>14-Day Trend <span style="font-weight:400;color:#666">(\u2193 rank is better)</span></th>
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
    async function fetchNow() {
      const btn = document.querySelector('.controls button.primary');
      if (!btn) return;
      const prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Fetching\u2026';
      try {
        const res = await fetch('/__k4serp/fetch', {
          method: 'POST',
          credentials: 'include'
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
  <\/script>
</body>
</html>`;
}
__name(renderSerpDashboard, "renderSerpDashboard");
var k4_image_proxy_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const imageIdAtEnd = /\/(i-[a-zA-Z0-9-]+)\/?$/.test(path);
    const isLegacyNamespace = path === "/Photography-Galleries" || path.startsWith("/Photography-Galleries/");
    const isKnownNamespace = isLegacyNamespace || path.startsWith("/Galleries/") || path.startsWith("/Other/") || path.startsWith("/galleries/") || path.startsWith("/other/");
    if (imageIdAtEnd && !isKnownNamespace) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=86400",
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }
    if (/^\/(?:Galleries|galleries)\/[^/]+\/i-[a-zA-Z0-9-]+\/?$/.test(path)) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=86400",
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }
    if (path.length > 1 && path.endsWith("/")) {
      url.pathname = path.replace(/\/+$/g, "");
      return Response.redirect(url.toString(), 301);
    }
    const { visitorId, isNew: visitorIdIsNew } = getOrCreateVisitorId(request);
    if (url.pathname.startsWith("/track") && request.cf?.botManagement?.verifiedBot) {
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/track") {
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
    if (url.pathname.startsWith("/__k4stats")) {
      if (env.ANALYTICS_ENABLED === "true" && env.ANALYTICS) {
        return env.ANALYTICS.fetch(request);
      }
      if (url.pathname === "/__k4stats") {
        return handleDashboardRequest2(request, env, ctx);
      }
      return new Response("Analytics delegation required", { status: 503 });
    }
    if (url.pathname === "/__k4serp") {
      return handleSerpDashboard(request, env);
    }
    if (url.pathname === "/__k4serp/launch") {
      return handleSerpLaunch(request, env);
    }
    if (url.pathname === "/__k4serp/log" && request.method === "POST") {
      return handleSerpLog(request, env);
    }
    if (url.pathname === "/__k4serp/fetch" && request.method === "POST") {
      return handleSerpFetch(request, env);
    }
    if (url.pathname === "/__k4serp/keyword" && request.method === "POST") {
      return handleSerpKeyword(request, env);
    }
    if (url.pathname === "/__k4track/event") {
      if (env.ANALYTICS_ENABLED === "true" && env.ANALYTICS) {
        return env.ANALYTICS.fetch(request);
      }
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
      return new Response("Method not allowed", { status: 405 });
    }
    if (isImagePageRoute(url.pathname)) {
      const policyResponse = await handleImagePagePolicy(request, url.pathname, ctx, env);
      if (policyResponse) return addVisitorIdCookie(policyResponse, visitorId, visitorIdIsNew, request);
      const imageId = extractImageId(url.pathname);
      if (imageId && env?.DB) {
        ctx.waitUntil(logArtView2(env, "image_page", imageId, request, null, "proxy", visitorId));
        if (visitorIdIsNew) {
          ctx.waitUntil(logArtView2(env, "external_image_page", imageId, request, null, "proxy", visitorId));
        }
      }
      const response = await fetch(request);
      return addVisitorIdCookie(response, visitorId, visitorIdIsNew, request);
    }
    if ((url.pathname.startsWith("/Galleries/") || url.pathname.startsWith("/Other/") || url.pathname.startsWith("/galleries/") || url.pathname.startsWith("/other/")) && !url.pathname.includes("/i-")) {
      const response = await fetch(request);
      return addVisitorIdCookie(response, visitorId, visitorIdIsNew, request);
    }
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
export {
  k4_image_proxy_default as default
};
//# sourceMappingURL=k4-image-proxy.js.map

------formdata-undici-008560647731--
