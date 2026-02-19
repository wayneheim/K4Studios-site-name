var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/shared/constants.js
var ALLOWED_BOTS = /(googlebot|google-inspectiontool|adsbot-google|googleother|apis-google|bingbot|bingpreview|msnbot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|ahrefssiteaudit|semrushbot|screaming\s*frog|sitebulb|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot|slackbot|discordbot|telegrambot|uptimerobot|uptime[- ]?kuma)/i;
var BLOCKED_BOTS = /(python|curl|scrapy|spider(?!.*google)|httpclient|axios|wget|postman|libwww-perl|powershell|java\/|node-fetch|okhttp)/i;
var BLOCKED_IP_PREFIXES = [
  "45.148.10.",
  // NL scraper - systematic image harvester (identified 2026-02-13)
  "146.59.19.",
  // PL datacenter - no referrer bot pattern
  "135.181.213.",
  // FI datacenter - no referrer bot pattern
  "51.81.32.",
  // US datacenter - no referrer bot pattern
  "51.81.210.",
  // US datacenter - no referrer bot pattern
  "51.38.125.",
  // DE datacenter - no referrer bot pattern
  "51.68.143.",
  // PL datacenter - no referrer bot pattern
  "57.129.15.",
  // DE datacenter - no referrer bot pattern
  "57.128.197.",
  // PL datacenter - no referrer bot pattern
  "216.244.66."
  // DotBot crawler
];
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
function isBlockedIP(ip) {
  if (!ip) return false;
  return BLOCKED_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}
__name(isBlockedIP, "isBlockedIP");
function isDatacenterIP(ip) {
  if (!ip) return false;
  return DATACENTER_PREFIXES.some((prefix) => ip.startsWith(prefix));
}
__name(isDatacenterIP, "isDatacenterIP");
function hashIP(ip) {
  if (!ip) return "unknown";
  const parts = ip.split(".");
  if (parts.length < 3) return ip.slice(0, 8);
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}
__name(hashIP, "hashIP");
function classifyUA(ua) {
  if (!ua) return "unknown";
  const lower = ua.toLowerCase();
  if (BLOCKED_BOTS.test(lower)) return "bot";
  if (ALLOWED_BOTS.test(lower)) return "bot";
  return "human";
}
__name(classifyUA, "classifyUA");

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
  if (["NL", "FI", "PL", "RU", "CN"].includes(stats.country) && !stats.has_referrer) {
    score += 1;
    rules.push("suspicious_origin");
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

// src/analytics/storage.js
async function updateBotIntelligence(env) {
  if (!env?.DB) return;
  try {
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
          ROUND(100.0 * SUM(CASE WHEN type IN ('gallery', 'gallery_view') THEN 1 ELSE 0 END) / COUNT(*), 1) as gallery_pct,
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
      const isDatacenter = DATACENTER_PREFIXES.some((p) => stats.ip_hash.startsWith(p.replace(".x", ".")));
      let { score, rules, riskLevel } = calculateRiskScore({
        ...stats,
        is_datacenter: isDatacenter,
        is_verified_bot: false
        // Can't verify from hash alone
      });
      if (stats.is_flagged_bot) {
        score += 2;
        rules.push("auto_flagged_bot");
      }
      let status = "watching";
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
          status = CASE WHEN suspected_bots.status IN ('blocked', 'verified') THEN suspected_bots.status ELSE excluded.status END
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
    console.error("Bot intelligence update error:", e);
    return 0;
  }
}
__name(updateBotIntelligence, "updateBotIntelligence");
async function logArtView(env, type, targetId, request, sessionId = null) {
  try {
    if (isSyntheticTraffic(request)) return;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
    if (isBlockedIP(ip)) return;
    const ua = request.headers.get("User-Agent") || "";
    const uaClass = classifyUA(ua);
    if (uaClass === "bot") return;
    const ipHash = hashIP(ip);
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const referrer = request.headers.get("Referer") || null;
    const isBot = isDatacenterIP(ip) && !referrer ? 1 : 0;
    const dedupScope = sessionId ? `sid-${sessionId}` : (/* @__PURE__ */ new Date()).toISOString().slice(0, 13);
    const dedupKey = `${ipHash}:${targetId}:${type}:${dedupScope}`;
    await env.DB.prepare(`
      INSERT OR IGNORE INTO art_views (type, target_id, ip_hash, ua_class, country, region, city, referrer, dedup_key, is_bot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(type, targetId, ipHash, uaClass, country, region, city, referrer, dedupKey, isBot).run();
  } catch (e) {
    console.error("Art view logging error:", e);
  }
}
__name(logArtView, "logArtView");

// src/analytics/queries.js
async function getDashboardStats(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause, priorPeriodClause } = filters;
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
  const returningQuery = `
    SELECT COUNT(DISTINCT e.ip) as returning_visitors
    FROM events e
    WHERE ${dateClause.replace(/created_at/g, "e.created_at")} ${ipClause.replace(/ip/g, "e.ip")} ${botClause.replace(/ip/g, "e.ip").replace(/city/g, "e.city").replace(/device/g, "e.device")} ${chardonClause.replace(/city/g, "e.city")}
      AND e.ip IN (
        SELECT DISTINCT ip FROM events 
        WHERE ${priorPeriodClause}
      )
  `;
  const returningResult = await env.DB.prepare(returningQuery).first();
  const returningVisitors = returningResult?.returning_visitors || 0;
  const newVisitors = (summary?.unique_visitors || 0) - returningVisitors;
  return { summary, returningVisitors, newVisitors };
}
__name(getDashboardStats, "getDashboardStats");
async function getEventBreakdown(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;
  const eventsQuery = `
    SELECT event, COUNT(*) as count 
    FROM events 
    WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
    GROUP BY event 
    ORDER BY count DESC
  `;
  const events = await env.DB.prepare(eventsQuery).all();
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
  return { events, entries };
}
__name(getEventBreakdown, "getEventBreakdown");
async function getGalleryPerformance(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;
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
  const galleries = {
    results: (galleriesRaw.results || []).map((g) => {
      const fullPath = g.gallery_id;
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
      return { ...g, gallery_id: displayName, gallery_type };
    })
  };
  return galleries;
}
__name(getGalleryPerformance, "getGalleryPerformance");
async function getReferrers(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;
  const referrerQuery = `
    SELECT referrer, COUNT(DISTINCT session_id) as sessions
    FROM events 
    WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
    GROUP BY referrer 
    ORDER BY sessions DESC
  `;
  const referrers = await env.DB.prepare(referrerQuery).all();
  return referrers;
}
__name(getReferrers, "getReferrers");
async function getGeography(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;
  const datacenterCityFilter = `AND city NOT IN ('Ashburn', 'Moses Lake', 'Leesburg', 'Dublin', 'Prineville', 'Forest City', 'Clonee', 'Council Bluffs', 'The Dalles', 'Boardman')`;
  const geoQuery = `
    SELECT country, region, city, COUNT(DISTINCT ip) as visitors
    FROM events 
    WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause} ${datacenterCityFilter}
    GROUP BY country, region, city 
    ORDER BY visitors DESC
    LIMIT 25
  `;
  const geo = await env.DB.prepare(geoQuery).all();
  return geo;
}
__name(getGeography, "getGeography");
async function getDailyTrend(env, filters) {
  const { rangeDateClause, galleryClause, ipClause, botClause, chardonClause } = filters;
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
  return trend;
}
__name(getDailyTrend, "getDailyTrend");
async function getSessionMetrics(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;
  const deviceQuery = `
    SELECT device, COUNT(DISTINCT session_id) as sessions
    FROM events 
    WHERE ${dateClause} ${galleryClause} ${ipClause} ${botClause} ${chardonClause}
    GROUP BY device 
    ORDER BY sessions DESC
  `;
  const devices = await env.DB.prepare(deviceQuery).all();
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
  const bounceRate = bounceResult?.total_sessions > 0 ? Math.round(100 * bounceResult.bounce_sessions / bounceResult.total_sessions) : 0;
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
  const avgDurationFormatted = avgDurationSecs >= 60 ? `${Math.floor(avgDurationSecs / 60)}m ${Math.round(avgDurationSecs % 60)}s` : `${Math.round(avgDurationSecs)}s`;
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
  const peakHours = (peakHoursResult.results || []).map((h) => {
    const hour24 = h.hour;
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? "pm" : "am";
    return { hour: `${hour12}${ampm}`, sessions: h.sessions };
  });
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
  return { devices, bounceRate, avgDurationSecs, avgDurationFormatted, peakHours, deviceEngagement };
}
__name(getSessionMetrics, "getSessionMetrics");
async function getTopPages(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;
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
  return pages;
}
__name(getTopPages, "getTopPages");
async function getTopImages(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;
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
  return { images, uniqueImagesViewed, totalImageSessions, totalImageViews };
}
__name(getTopImages, "getTopImages");
async function getEntryAnalysis(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;
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
    console.log("image page diagnostics query failed:", e.message);
  }
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
  const entryRefCounts = {};
  entryRefSummary.forEach((r) => {
    entryRefCounts[r.ref_source] = r.visitors;
  });
  return { entryPages, imagePageViewsFromEvents, imageEntrySessionsFromEvents, entryRefCounts };
}
__name(getEntryAnalysis, "getEntryAnalysis");
async function getEngagementDepth(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;
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
  const cowboyQuery = `
    SELECT COUNT(DISTINCT session_id) as jumps
    FROM events 
    WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause} AND event = 'cowboy_jump'
  `;
  const cowboyResult = await env.DB.prepare(cowboyQuery).first();
  const cowboyJumps = cowboyResult?.jumps || 0;
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
    WHERE ${dateClause.replace(/created_at/g, "e.created_at")} ${ipClause.replace(/ip/g, "e.ip")} ${botClause.replace(/ip/g, "e.ip").replace(/city/g, "e.city").replace(/device/g, "e.device")} ${chardonClause.replace(/city/g, "e.city")}
    GROUP BY e.session_id
    ORDER BY depth_score DESC
    LIMIT 15
  `;
  const depthResults = await env.DB.prepare(depthQuery).all();
  const topDepthSessions = depthResults.results || [];
  const engagementScores = topDepthSessions.map((s) => s.depth_score).filter((s) => s > 0);
  const minEngagement = engagementScores.length > 0 ? Math.min(...engagementScores) : 0;
  const maxEngagement = engagementScores.length > 0 ? Math.max(...engagementScores) : 0;
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
  return { themesClicked, cowboyJumps, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, botSessions, botPct };
}
__name(getEngagementDepth, "getEngagementDepth");
async function getExitAnalysis(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;
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
  const exitByCategory = {};
  exitSummary.forEach((e) => {
    exitByCategory[e.exit_category] = e.exits;
  });
  return { exitPages, exitSummary, exitByCategory };
}
__name(getExitAnalysis, "getExitAnalysis");
async function getEdgeEvents(env, filters) {
  const { yesterday, days } = filters;
  const edgeDateClause = yesterday ? `date(created_at, '-5 hours') = date('now', '-5 hours', '-1 day')` : days === 1 ? `date(created_at, '-5 hours') = date('now', '-5 hours')` : `created_at > datetime('now', '-5 hours', '-${days} days')`;
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
    console.log("edge_events query failed:", e.message);
  }
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
    console.log("edge_events summary failed:", e.message);
  }
  return { edgeEvents, edgeSummary };
}
__name(getEdgeEvents, "getEdgeEvents");
async function getArtViews(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause, artIpClause } = filters;
  const artDateClause = dateClause;
  let artViewsSummary = { xl_zooms: 0, slideshow_starts: 0, external_images: 0, image_pages: 0, chapter_views: 0, galleries: 0, total: 0, unique_viewers: 0, onsite_viewers: 0 };
  let artViewsByType = [];
  let topArtViews = [];
  try {
    const botFilterClause = "AND (is_bot = 0 OR is_bot IS NULL)";
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
    let pollutedExternalCount = 0;
    for (const row of artViewsByType) {
      if (row.type === "xl_zoom") artViewsSummary.xl_zooms = row.views;
      if (row.type === "slideshow_start") artViewsSummary.slideshow_starts = row.views;
      if (row.type === "image") artViewsSummary.xl_zooms += row.views;
      if (row.type === "image_page") artViewsSummary.image_pages = row.views;
      if (row.type === "chapter_view") artViewsSummary.chapter_views = row.views;
      if (row.type === "gallery_view") artViewsSummary.galleries = row.views;
      if (row.type === "external_image") pollutedExternalCount = row.views;
    }
    const cleanExternalQuery = `
      SELECT COUNT(*) as views
      FROM art_views
      WHERE ${artDateClause} ${botFilterClause} ${artIpClause} AND type = 'external_image'
        AND referrer IS NOT NULL AND referrer != ''
        AND referrer NOT LIKE '%k4studios%' AND referrer NOT LIKE '%localhost%'
    `;
    const cleanExternalResult = await env.DB.prepare(cleanExternalQuery).first();
    artViewsSummary.external_images = cleanExternalResult?.views || 0;
    artViewsSummary.total = (artViewsSummary.chapter_views || 0) + artViewsSummary.external_images;
    const uniqueViewersQuery = `
      SELECT COUNT(DISTINCT ip_hash) as unique_viewers
      FROM art_views
      WHERE ${artDateClause} AND (is_bot = 0 OR is_bot IS NULL) ${artIpClause}
        AND type IN ('chapter_view', 'external_image')
        AND (type != 'external_image' OR referrer IS NULL OR (referrer NOT LIKE '%k4studios%' AND referrer NOT LIKE '%localhost%'))
    `;
    const uniqueViewersResult = await env.DB.prepare(uniqueViewersQuery).first();
    artViewsSummary.unique_viewers = uniqueViewersResult?.unique_viewers || 0;
    const onsiteViewersQuery = `
      SELECT COUNT(DISTINCT ip_hash) as onsite_viewers
      FROM art_views
      WHERE ${artDateClause} AND (is_bot = 0 OR is_bot IS NULL) ${artIpClause} AND type = 'chapter_view'
    `;
    const onsiteViewersResult = await env.DB.prepare(onsiteViewersQuery).first();
    artViewsSummary.onsite_viewers = onsiteViewersResult?.onsite_viewers || 0;
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
    `;
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
      WHERE ${artDateClause} AND type = 'gallery_view' ${botFilterClause} ${artIpClause}
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
    const noRefExternalQuery = `
      SELECT COUNT(*) as views, COUNT(DISTINCT ip_hash) as unique_viewers
      FROM art_views
      WHERE ${artDateClause} ${botFilterClause} ${artIpClause} AND type = 'external_image'
        AND (referrer IS NULL OR referrer = '')
    `;
    const noRefResult = await env.DB.prepare(noRefExternalQuery).first();
    artViewsSummary.noRefExternalViews = noRefResult?.views || 0;
    artViewsSummary.noRefExternalViewers = noRefResult?.unique_viewers || 0;
    const artDcCityFilter = `AND city NOT IN ('Ashburn', 'Moses Lake', 'Leesburg', 'Dublin', 'Prineville', 'Forest City', 'Clonee', 'Council Bluffs', 'The Dalles', 'Boardman')`;
    const onsiteGeoQuery = `
      SELECT 
        country, region, city,
        COUNT(*) as views,
        COUNT(DISTINCT ip_hash) as unique_viewers
      FROM art_views
      WHERE ${artDateClause} ${botFilterClause} ${artIpClause} ${artDcCityFilter}
        AND type IN ('chapter_view', 'gallery_view')
      GROUP BY country, region, city
      ORDER BY unique_viewers DESC, views DESC
      LIMIT 20
    `;
    const onsiteGeoResult = await env.DB.prepare(onsiteGeoQuery).all();
    artViewsSummary.geography = onsiteGeoResult.results || [];
    const externalGeoQuery = `
      SELECT 
        country, region, city,
        COUNT(*) as views,
        COUNT(DISTINCT ip_hash) as unique_viewers
      FROM art_views
      WHERE ${artDateClause} ${botFilterClause} ${artIpClause}
        AND type = 'external_image'
        AND referrer NOT LIKE '%k4studios%' AND referrer NOT LIKE '%localhost%'
      GROUP BY country, region, city
      ORDER BY unique_viewers DESC, views DESC
      LIMIT 15
    `;
    const externalGeoResult = await env.DB.prepare(externalGeoQuery).all();
    artViewsSummary.externalGeography = externalGeoResult.results || [];
  } catch (e) {
    console.log("art_views query failed (table may not exist):", e.message);
  }
  try {
    const beaconChapterViews = artViewsSummary?.chapter_views || 0;
    const beaconXLZooms = artViewsSummary?.xl_zooms || 0;
    const chapterViewsEventsQuery = `
      SELECT COUNT(*) as views
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'chapter_view'
        AND (page_path LIKE '/Galleries/%' OR page_path LIKE '/Other/%')
    `;
    const chapterViewsEventsResult = await env.DB.prepare(chapterViewsEventsQuery).first();
    const chapterViewsEvents = chapterViewsEventsResult?.views || 0;
    const topChaptersEventsQuery = `
      SELECT 
        image_id,
        MIN(page_path) as page_url,
        COUNT(*) as views,
        COUNT(DISTINCT ip) as unique_viewers
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'chapter_view'
        AND image_id IS NOT NULL
        AND (page_path LIKE '/Galleries/%' OR page_path LIKE '/Other/%')
      GROUP BY image_id
      ORDER BY views DESC
    `;
    const topChaptersEventsResult = await env.DB.prepare(topChaptersEventsQuery).all();
    const topChaptersEvents = (topChaptersEventsResult.results || []).map((r) => ({
      type: "chapter_view",
      target_id: r.image_id,
      page_url: r.page_url || null,
      views: r.views || 0,
      unique_viewers: r.unique_viewers || 0
    }));
    const xlZoomsEventsQuery = `
      SELECT COUNT(*) as views
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'zoom_open'
        AND (page_path LIKE '/Galleries/%' OR page_path LIKE '/Other/%')
    `;
    const xlZoomsEventsResult = await env.DB.prepare(xlZoomsEventsQuery).first();
    const xlZoomsEvents = xlZoomsEventsResult?.views || 0;
    const topXLZoomsEventsQuery = `
      SELECT 
        image_id,
        MIN(page_path) as page_url,
        COUNT(*) as views,
        COUNT(DISTINCT ip) as unique_viewers
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'zoom_open'
        AND image_id IS NOT NULL
        AND (page_path LIKE '/Galleries/%' OR page_path LIKE '/Other/%')
      GROUP BY image_id
      Order BY views DESC
    `;
    const topXLZoomsEventsResult = await env.DB.prepare(topXLZoomsEventsQuery).all();
    const topXLZoomsEvents = (topXLZoomsEventsResult.results || []).map((r) => ({
      type: "xl_zoom",
      target_id: r.image_id,
      page_url: r.page_url || null,
      views: r.views || 0,
      unique_viewers: r.unique_viewers || 0
    }));
    if (!topArtViews || Array.isArray(topArtViews)) {
      topArtViews = { chapters: [], xlZooms: [], external: [], galleries: [] };
    }
    artViewsSummary.chapter_views_beacon = beaconChapterViews;
    artViewsSummary.xl_zooms_beacon = beaconXLZooms;
    artViewsSummary.chapter_views = chapterViewsEvents;
    artViewsSummary.xl_zooms = xlZoomsEvents;
    if (topChaptersEvents.length > 0) topArtViews.chapters = topChaptersEvents;
    if (topXLZoomsEvents.length > 0) topArtViews.xlZooms = topXLZoomsEvents;
    const galleryCountQuery = `
      SELECT COUNT(DISTINCT gallery_id) as gallery_count
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'chapter_view'
        AND gallery_id IS NOT NULL
    `;
    const galleryCountResult = await env.DB.prepare(galleryCountQuery).first();
    artViewsSummary.galleries = galleryCountResult?.gallery_count || 0;
    const topGalleriesEventsQuery = `
      SELECT 
        gallery_id,
        MIN(page_path) as sample_path,
        COUNT(DISTINCT image_id) as images_viewed,
        COUNT(*) as views,
        COUNT(DISTINCT ip) as unique_viewers
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
        AND event = 'chapter_view'
        AND gallery_id IS NOT NULL
      GROUP BY gallery_id
      ORDER BY views DESC
    `;
    const topGalleriesEventsResult = await env.DB.prepare(topGalleriesEventsQuery).all();
    const topGalleriesEvents = (topGalleriesEventsResult.results || []).map((r) => {
      const galleryUrl = r.sample_path ? r.sample_path.replace(/\/i-[a-zA-Z0-9_-]+\/?$/, "") : null;
      return {
        type: "gallery_view",
        target_id: r.gallery_id,
        gallery_url: galleryUrl,
        views: r.views || 0,
        unique_viewers: r.unique_viewers || 0,
        images_viewed: r.images_viewed || 0
      };
    });
    if (topGalleriesEvents.length > 0) topArtViews.galleries = topGalleriesEvents;
    artViewsSummary.total = (artViewsSummary.chapter_views || 0) + (artViewsSummary.external_images || 0);
  } catch (e) {
    console.log("on-site art view events query failed:", e.message);
  }
  return { artViewsSummary, artViewsByType, topArtViews };
}
__name(getArtViews, "getArtViews");
async function getBotIntelligence(env) {
  let botIntelligence = { suspects: [], blocked: [], verified: [], stats: { total: 0, risk3: 0, risk4: 0, blocked: 0, verified: 0 } };
  try {
    await updateBotIntelligence(env);
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
        WHERE type IN ('image_page', 'gallery_view') 
        GROUP BY ip_hash
      ) pg ON sb.ip_hash = pg.ip_hash
      WHERE sb.is_verified_bot = 1 AND sb.status = 'verified'
      ORDER BY sb.total_requests DESC
      LIMIT 20
    `;
    const verifiedResult = await env.DB.prepare(verifiedQuery).all();
    botIntelligence.verified = verifiedResult.results || [];
    botIntelligence.stats.verified = botIntelligence.verified.reduce((sum, v) => sum + v.total_requests, 0);
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
    console.log("bot_intelligence query failed:", e.message);
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
    entries,
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
    botIntelligence
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
  };
}
__name(buildDashboardData, "buildDashboardData");

// src/analytics/dashboard/renderer.js
function renderDashboard({ days, yesterday, selectedDate, galleryFilter, excludeIp, viewerIp, summary, newVisitors, returningVisitors, cowboyJumps, events, entries, galleries, referrers, geo, trend, devices, pages, images, uniqueImagesViewed, totalImageSessions, totalImageViews, themesClicked, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, exitPages, exitSummary, exitByCategory, botPct, botSessions, hideBots, hideChardon, edgeEvents, edgeSummary, entryPages, entryRefCounts, imagePageViewsFromEvents, imageEntrySessionsFromEvents, bounceRate, avgDurationFormatted, peakHours, deviceEngagement, artViewsSummary, artViewsByType, topArtViews, botIntelligence }) {
  const s = summary || {};
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
    // zoom_open is intentionally omitted: redundant with the XL Zooms metric above
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
  const maxPageSessions = Math.max(...pages.map((p) => p.sessions), 1);
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
    .trend-bar { flex: 1; min-width: 25px; max-width: 70px; background: linear-gradient(180deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px 4px 0 0; position: relative; cursor: pointer; transition: all 0.2s; }
    .trend-bar:hover { opacity: 0.8; }
    .trend-bar.selected { background: linear-gradient(180deg, #10b981 0%, #059669 100%); box-shadow: 0 0 12px rgba(16, 185, 129, 0.5); }
    .trend-bar.selected .trend-bar-value { color: #10b981; font-weight: bold; }
    .trend-bar.selected .trend-bar-label { color: #10b981; font-weight: bold; }
    .trend-bar-label { position: absolute; bottom: -26px; left: 50%; transform: translateX(-50%); font-size: 13px; color: #888; white-space: nowrap; }
    .data-change-marker { color: #f59e0b; font-size: 14px; font-weight: bold; cursor: help; position: relative; top: -1px; margin-left: 1px; }
    .trend-bar-value { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: 14px; color: #aaa; font-weight: 500; }
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
  <h1>K4 Analytics <a href="/__k4serp" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none;margin-left:20px">\u{1F4CA} SERP</a> <a href="/__k4serp/launch" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none">\u{1F680} Launch Pad</a></h1>
  
  <div class="controls">
    <a href="?days=1${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 1 && !yesterday ? "active" : ""}">Today*</a>
    <a href="?yesterday=1${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${yesterday ? "active" : ""}">Yesterday*</a>
    <a href="?days=7${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 7 && !yesterday ? "active" : ""}">7 Days</a>
    <a href="?days=30${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 30 && !yesterday ? "active" : ""}">30 Days</a>
    <a href="?days=90${excludeIp ? "&excludeIp=" + excludeIp : ""}${hideBots ? "&hideBots=1" : ""}${hideChardon ? "&hideChardon=1" : ""}" class="${days === 90 && !yesterday ? "active" : ""}">3 Months</a>
    ${selectedDate ? `<span style="background:#059669;padding:4px 10px;border-radius:4px;color:#fff;font-size:13px;">\u{1F4C5} ${selectedDate}</span>` : ""}
    <div class="ip-filter">
      ${excludeIp ? `<span class="ip-badge">Excluding: ${excludeIp}</span><a href="${showAllUrl}">Show All IPs</a>` : `<a href="${excludeMeUrl}" class="exclude-active">Exclude My IP</a>`}
      ${hideBots ? `<a href="${showBotsUrl}" class="bot-filter active">\u{1F916} Bots Hidden</a>` : `<a href="${hideBotsUrl}" class="bot-filter">\u{1F916} Hide Bots</a>`}
      ${hideChardon ? `<a href="${showChardonUrl}" class="bot-filter active">\u{1F3E0} Team Hidden</a>` : `<a href="${hideChardonUrl}" class="bot-filter">\u{1F3E0} Hide Team</a>`}
    </div>
    <a href="/__k4stats/export?days=${days}${yesterday ? "&yesterday=1" : ""}${hideBots ? "&hideBots=1" : ""}" class="export-btn" style="margin-left: auto; background: #2d4a2d; padding: 5px 12px; border-radius: 4px; color: #4ade80;">\u{1F4E5} Export CSV</a>
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
    const maxSessions = Math.max(...trend.map((t) => t.sessions), 1);
    return trend.map((t) => {
      const height = Math.max(t.sessions / maxSessions * 100, 2);
      const dateLabel = t.day.slice(5);
      const isDataChangeDate = t.day === "2026-02-14";
      const isSelected = selectedDate === t.day;
      return `
            <div class="trend-bar${isSelected ? " selected" : ""}" data-visitors="${t.visitors}" data-sessions="${t.sessions}" data-day="${t.day}" style="height: ${height}%" title="${t.day}: ${t.sessions} sessions, ${t.visitors} unique IPs">
              <span class="trend-bar-value">${t.sessions}</span>
              <span class="trend-bar-label">${dateLabel}${isDataChangeDate ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ""}</span>
            </div>
          `;
    }).join("");
  })()}
    </div>
  </div>
  <script>
    (function() {
      const visitorsLink = document.getElementById('toggle-visitors');
      const sessionsLink = document.getElementById('toggle-sessions');
      const chartTitle = document.getElementById('chart-title');
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
  <\/script>
  ` : trend.length === 1 ? `
  <div class="trend-chart">
    <h3>Engaged Sessions</h3>
    <div class="trend-bars" style="justify-content: center;">
      <div class="trend-bar" style="height: 100%; width: 80px;" title="${trend[0].day}: ${trend[0].sessions} sessions, ${trend[0].visitors} unique IPs">
        <span class="trend-bar-value">${trend[0].sessions}</span>
        <span class="trend-bar-label">${trend[0].day.slice(5)}${trend[0].day === "2026-02-14" ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ""}</span>
      </div>
    </div>
  </div>
  ` : ""}

  <h2>Pulse</h2>
  <div class="pulse">
    <div class="pulse-stat">
      <span class="value">${s.unique_visitors || 0}</span>
      <span class="label">JS Visitors <span class="info-icon">i</span></span>
      <div class="tooltip">Unique IPs with JS events (Layer C). Only counts visitors whose browser loaded JavaScript and triggered events. Does NOT include image-only viewers \u2014 see Art Views below for complete picture.</div>
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
      <span class="label">Avg/Sess <span class="info-icon">i</span></span>
      <div class="tooltip">Average events per session. Higher = more engaged visitors exploring galleries and images.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#22d3ee;">\u23F1\uFE0F ${avgDurationFormatted}</span>
      <span class="label">Avg Time <span class="info-icon">i</span></span>
      <div class="tooltip">Average session duration (first to last event). Only counts sessions with 2+ events. For art browsing, 2+ min is good engagement.</div>
    </div>
    ${peakHours.length > 0 ? `<div class="pulse-stat">
      <span class="value" style="color:#f472b6;">\u{1F550} ${peakHours.map((h) => h.hour).join(", ")}</span>
      <span class="label">Peak <span class="info-icon">i</span></span>
      <div class="tooltip">Busiest hours (EST): ${peakHours.map((h) => `${h.hour} (${h.sessions} sessions)`).join(", ")}. Useful for social media posting timing.</div>
    </div>` : ""}
    <div class="pulse-stat">
      <span class="value" style="color:#10b981">${s.pct_navigated || 0}%</span>
      <span class="label">Nav <span class="info-icon">i</span></span>
      <div class="tooltip">% of sessions that used navigation (next/prev arrows). Shows gallery exploration intent.</div>
    </div>
  </div>

  <div class="pulse-row">
    ${cowboyJumps > 0 ? `<div class="pulse-stat highlight">
      <span class="value">\u{1F920} ${cowboyJumps}</span>
      <span class="label">Cowboy Jump <span class="info-icon">i</span></span>
      <div class="tooltip">Sessions that used the cowboy easter egg navigation. Fun engagement metric!</div>
    </div>` : ""}
    <div class="pulse-stat" style="background: ${bounceRate > 60 ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" : bounceRate > 40 ? "linear-gradient(135deg, #c2410c 0%, #9a3412 100%)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)"};">
      <span class="value" style="color: #fff;">${bounceRate}%</span>
      <span class="label" style="color: ${bounceRate > 40 ? "#fed7aa" : "#a7f3d0"};">Bounce <span class="info-icon" style="background: rgba(255,255,255,0.2); color: ${bounceRate > 40 ? "#fed7aa" : "#a7f3d0"};">i</span></span>
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
      <span class="value" style="color: #fff;">\u{1F916} ${botPct}%</span>
      <span class="label" style="color: #d1d5db;">Bots <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #d1d5db;">i</span></span>
      <div class="tooltip">Estimated bot traffic (${botSessions}/${totalSessions} sessions). Detected by: AWS/datacenter IPs, Ashburn city, unknown device. Not filtered from other stats.</div>
    </div>` : ""}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">\u{1F464} ${artViewsSummary?.unique_viewers || 0}</span>
      <span class="label" style="color: #a7f3d0;">Art Viewers <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Unique IPs that viewed your art. Chapter viewers (JS-verified on-site): ${artViewsSummary?.onsite_viewers || 0}. External embeds: ${Math.max(0, (artViewsSummary?.unique_viewers || 0) - (artViewsSummary?.onsite_viewers || 0))}. Server-side page loads: ${artViewsSummary?.image_pages || 0} unique IPs.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
      <span class="value" style="color: #fff;">\u{1F464} ${artViewsSummary?.total || 0}</span>
      <span class="label" style="color: #ddd6fe;">Image Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">JS-verified image views (human only). Chapter browsing (${artViewsSummary?.chapter_views || 0}) + External embeds (${artViewsSummary?.external_images || 0}). Server-side page loads: ${artViewsSummary?.image_pages || 0}.</div>
    </div>
  </div>

  <!-- Art Views Section (Multi-Layer Art Attention Tracking) -->
  <h2 style="margin-top: 20px; margin-bottom: 8px;">\u{1F3A8} Art Views <span style="font-size: 12px; color: #888; font-weight: normal;">(Chapters: JS-verified | External: Server-Side)</span></h2>
  <p style="color: #888; margin: 0 0 10px 0; font-size: 12px;">
    <strong style="color: #10b981;">Human art viewers (cleaned)</strong> \u2014 bots, scrapers, and datacenter traffic excluded. 
    <span class="section-tip" style="display: inline;"><span class="info-icon">i</span><div class="tooltip">Chapters &amp; XL Zooms: counted from JS events (same-origin /track beacon). Galleries: derived from chapter views (every chapter has a gallery_id, so galleries browsed = distinct gallery_ids from chapter data). External embeds: server-side /img/ proxy logs. Bot exclusion: datacenter IPs without referrer, known scraper UAs.</div></span>
  </p>
  ${topArtViews?.chapters?.length > 0 || topArtViews?.xlZooms?.length > 0 || topArtViews?.galleries?.length > 0 ? `
  <div class="art-views-grid">
      <!-- Chapters Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #a78bfa; display: flex; align-items: center; justify-content: space-between;">
          <span>\u{1F4D6} Chapters</span>
          <span style="background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Chapters = explicit chapter interface views (events.event='chapter_view', same-origin /track). Beacon (workers.dev) is shown for debugging only: ${artViewsSummary?.chapter_views_beacon || 0}. First-party sanity: image page views=${imagePageViewsFromEvents}, image entry sessions=${imageEntrySessionsFromEvents}.">${artViewsSummary?.chapter_views || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.chapters || []).map((a, i) => {
    const imageId = a.target_id.startsWith("i-") ? a.target_id : null;
    const linkUrl = a.page_url ? "https://k4studios.com" + a.page_url : imageId ? "https://k4studios.com/art/" + imageId : "#";
    return '<a href="' + linkUrl + `" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(167, 139, 250, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #a78bfa; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='rgba(167,139,250,0.25)'" onmouseout="this.style.background='rgba(167,139,250,0.1)'">` + (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? "eager" : "lazy") + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">\u{1F50D}</span>') + '<div style="flex: 1; min-width: 0;"><div style="color: #a78bfa; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div><div style="display: flex; gap: 8px; margin-top: 2px;"><span style="font-size: 12px; font-weight: bold; color: #a78bfa;">' + a.views + ' views</span><span style="font-size: 11px; color: #888;">' + a.unique_viewers + " \u{1F464}</span></div></div></a>";
  }).join("") || '<p style="color: #555; font-size: 10px;">No chapters yet</p>'}
        </div>
      </div>
      <!-- XL Zooms Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #06b6d4; display: flex; align-items: center; justify-content: space-between;">
          <span>\u{1F50D} XL Zooms</span>
          <span style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Zoom button clicks">${artViewsSummary?.xl_zooms || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.xlZooms || []).map((a, i) => {
    const imageId = a.target_id.startsWith("i-") ? a.target_id : null;
    const linkUrl = a.page_url ? "https://k4studios.com" + a.page_url : imageId ? "https://k4studios.com/art/" + imageId : "#";
    return '<a href="' + linkUrl + `" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(6, 182, 212, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #06b6d4; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='rgba(6,182,212,0.25)'" onmouseout="this.style.background='rgba(6,182,212,0.1)'">` + (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? "eager" : "lazy") + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">\u{1F4D6}</span>') + '<div style="flex: 1; min-width: 0;"><div style="color: #06b6d4; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div><div style="display: flex; gap: 8px; margin-top: 2px;"><span style="font-size: 12px; font-weight: bold; color: #06b6d4;">' + a.views + ' views</span><span style="font-size: 11px; color: #888;">' + a.unique_viewers + " \u{1F464}</span></div></div></a>";
  }).join("") || '<p style="color: #555; font-size: 10px;">No XL zooms yet</p>'}
        </div>
      </div>
      <!-- Galleries Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #c4b5fd; display: flex; align-items: center; justify-content: space-between;">
          <span>\u{1F4C1} Galleries</span>
          <span style="background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%); color: #1f2937; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Galleries browsed (derived from JS-verified chapter views)">${artViewsSummary?.galleries || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.galleries || []).map((a, i) => {
    const linkUrl = a.gallery_url ? "https://k4studios.com" + a.gallery_url : "#";
    return '<a href="' + linkUrl + `" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(196, 181, 253, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #c4b5fd; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='rgba(196,181,253,0.25)'" onmouseout="this.style.background='rgba(196,181,253,0.1)'"><span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 24px;">\u{1F4C1}</span><div style="flex: 1; min-width: 0;"><div style="color: #c4b5fd; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;" title="` + a.target_id + '">' + a.target_id + '</div><div style="display: flex; gap: 8px; margin-top: 2px;"><span style="font-size: 12px; font-weight: bold; color: #c4b5fd;">' + (a.images_viewed || 0) + ' imgs</span><span style="font-size: 11px; color: #888;">' + a.views + ' views</span><span style="font-size: 11px; color: #888;">' + a.unique_viewers + " \u{1F464}</span></div></div></a>";
  }).join("") || '<p style="color: #555; font-size: 10px;">No galleries yet</p>'}
        </div>
      </div>
    </div>
    <p style="font-size: 10px; color: #555; margin-top: 8px;">Chapters &amp; Zooms: JS-verified | Galleries: derived from chapter views | External: server-side proxy</p>
  </div>
  ` : ""}
  
  <!-- External Traffic - 3-Column: Top Images | Displays | Visitors -->
  ${artViewsSummary?.externalDisplays?.length > 0 || topArtViews?.external?.length > 0 || Object.keys(entryRefCounts).length > 0 ? `
  <div class="section" style="margin-top: 10px; max-width: 1780px; margin-left: auto; margin-right: auto; max-height: none;">
    <h3>\u{1F310} External Traffic <span style="font-size: 11px; color: #888; font-weight: normal;">(off-site engagement)</span> <span style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; margin-left: 8px;">${artViewsSummary?.external_images || 0} embeds</span></h3>
    <div class="external-grid">
      <!-- Left: Top External Images -->
      <div>
        <div style="font-size: 11px; color: #f97316; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">\u{1F3C6} Top Images</div>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews?.external || []).map((a, i) => {
    const imageId = a.target_id.startsWith("i-") ? a.target_id : null;
    const sourceIcons = { onsite: "\u{1F3E0}", google: "\u{1F50D}", bing: "\u{1F171}\uFE0F", pinterest: "\u{1F4CC}", facebook: "\u{1F4D8}", twitter: "\u{1F426}", duckduckgo: "\u{1F986}", unattributed: "\u{1F310}", other: "\u{1F310}", direct: "\u2753" };
    const sourceColors = { onsite: "#10b981", google: "#4285f4", bing: "#00809d", pinterest: "#e60023", facebook: "#1877f2", twitter: "#1da1f2", duckduckgo: "#de5833", unattributed: "#f97316", other: "#f97316", direct: "#6b7280" };
    const srcIcon = sourceIcons[a.top_source] || "\u{1F310}";
    const srcColor = sourceColors[a.top_source] || "#f97316";
    return '<a href="https://k4studios.com/art/' + a.target_id + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: ' + srcColor + "18; border-radius: 6px; padding: 4px; border-left: 3px solid " + srcColor + `; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='` + srcColor + `35'" onmouseout="this.style.background='` + srcColor + `18'">` + (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? "eager" : "lazy") + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">' + srcIcon + "</span>") + '<div style="flex: 1; min-width: 0;"><div style="color: ' + srcColor + '; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div><div style="display: flex; gap: 8px; margin-top: 2px; align-items: center;"><span style="font-size: 14px;">' + srcIcon + '</span><span style="font-size: 12px; font-weight: bold; color: ' + srcColor + ';">' + a.views + ' views</span><span style="font-size: 11px; color: #888;">' + a.unique_viewers + " \u{1F464}</span></div></div></a>";
  }).join("") || '<p style="color: #555; font-size: 10px;">No external embeds yet</p>'}
        </div>
      </div>
      <!-- Center: Image Displays -->
      <div>
        <div style="font-size: 11px; color: #f97316; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">\u{1F4E4} By Source</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(artViewsSummary.externalDisplays || []).map((r) => {
    const icons = { "Google Images": "\u{1F50D}", "Google Search": "\u{1F50D}", "Bing Images": "\u{1F171}\uFE0F", "Bing Search": "\u{1F171}\uFE0F", "Pinterest": "\u{1F4CC}", "Facebook": "\u{1F4D8}", "Twitter/X": "\u{1F426}", "Instagram": "\u{1F4F7}", "LinkedIn": "\u{1F4BC}", "DuckDuckGo": "\u{1F986}", "Direct / No Referrer": "\u{1F517}", "Yandex": "\u{1F1F7}\u{1F1FA}", "Baidu": "\u{1F1E8}\u{1F1F3}" };
    const icon = icons[r.source] || "\u{1F310}";
    let displayName = r.source;
    if (!icons[r.source] && r.source.startsWith("http")) {
      try {
        displayName = new URL(r.source).hostname;
      } catch (e) {
      }
    }
    return '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px;"><span style="font-size: 14px;">' + icon + '</span><span style="color: #ccc; font-size: 11px; flex: 1;" title="' + r.source + '">' + displayName + '</span><span style="color: #f97316; font-size: 11px; font-weight: bold;">' + r.views.toLocaleString() + "</span></div>";
  }).join("") || '<p style="color:#666; font-size: 10px;">No external displays</p>'}
          ${artViewsSummary.noRefExternalViews > 0 ? '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px; border-left: 2px solid #ef4444; margin-top: 4px;" title="Image requests with no referrer header. Could be email clients, privacy browsers, or someone embedding your images with referrer stripped."><span style="font-size: 14px;">\u26A0\uFE0F</span><span style="color: #ef4444; font-size: 11px; flex: 1;">Unknown Source</span><span style="color: #ef4444; font-size: 11px; font-weight: bold;">' + artViewsSummary.noRefExternalViews.toLocaleString() + "</span></div>" : ""}
        </div>
      </div>
      <!-- Right: Visitors to Site (from events table - JS tracking) -->
      <div>
        <div style="font-size: 11px; color: #22c55e; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">\u{1F4E5} Visitors to Site</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(() => {
    const confirmed = [
      { key: "direct", label: "Direct / Typed URL", icon: "\u{1F517}" },
      { key: "google_search", label: "Google Search", icon: "\u{1F50D}" },
      { key: "google_images", label: "Google Images", icon: "\u{1F5BC}\uFE0F" },
      { key: "bing_search", label: "Bing Search", icon: "\u{1F171}\uFE0F" },
      { key: "bing_images", label: "Bing Images", icon: "\u{1F5BC}\uFE0F" },
      { key: "pinterest", label: "Pinterest", icon: "\u{1F4CC}" },
      { key: "facebook", label: "Facebook", icon: "\u{1F4D8}" },
      { key: "twitter", label: "Twitter/X", icon: "\u{1F426}" },
      { key: "chatgpt", label: "ChatGPT", icon: "\u{1F916}" },
      { key: "instagram", label: "Instagram", icon: "\u{1F4F7}" },
      { key: "linkedin", label: "LinkedIn", icon: "\u{1F4BC}" },
      { key: "duckduckgo", label: "DuckDuckGo", icon: "\u{1F986}" }
    ];
    const confirmedItems = confirmed.filter((s2) => entryRefCounts[s2.key]).sort((a, b) => (entryRefCounts[b.key] || 0) - (entryRefCounts[a.key] || 0)).map((s2) => '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px;"><span style="font-size: 14px;">' + s2.icon + '</span><span style="color: #ccc; font-size: 11px; flex: 1;">' + s2.label + '</span><span style="color: #22c55e; font-size: 11px; font-weight: bold;">' + entryRefCounts[s2.key] + "</span></div>");
    const unattributed = entryRefCounts["unattributed"] || 0;
    const unattributedItem = unattributed ? '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px; border-left: 2px solid #6b7280;" title="Privacy-suppressed referrers (mobile, in-app browsers, HTTPS). This is normal modern web behavior."><span style="font-size: 14px;">\u{1F512}</span><span style="color: #888; font-size: 11px; flex: 1;">Unattributed</span><span style="color: #6b7280; font-size: 11px; font-weight: bold;">' + unattributed + "</span></div>" : "";
    const all = confirmedItems.join("") + unattributedItem;
    return all || '<p style="color:#666; font-size: 10px;">No external visitors yet</p>';
  })()}
        </div>
        <p style="font-size: 9px; color: #555; margin-top: 6px;">\u{1F512} = privacy-suppressed (mobile, in-app, HTTPS)</p>
      </div>
    </div>
  </div>
  ` : ""}

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

    <!-- Viewer Geography -->
    <div class="section">
      <div class="section-header">
        <h3>\u{1F5FA}\uFE0F Viewer Geography</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">On-site = JS-verified humans browsing galleries/images. External = where hotlinked images are served (CDN edge geo, approximate).</div></span>
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
    const onsiteGeo = (artViewsSummary?.geography || []).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
      country: g.country,
      count: g.unique_viewers
    }));
    const siteGeo = (geo || []).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
      country: g.country,
      count: g.visitors
    }));
    const mergedOnsite = {};
    [...onsiteGeo, ...siteGeo].forEach((g) => {
      if (!mergedOnsite[g.label]) mergedOnsite[g.label] = { ...g };
      else mergedOnsite[g.label].count = Math.max(mergedOnsite[g.label].count, g.count);
    });
    const onsiteRows = Object.values(mergedOnsite).sort((a, b) => b.count - a.count).slice(0, 12);
    const onsiteMax = Math.max(...onsiteRows.map((g) => g.count), 1);
    const extGeo = (artViewsSummary?.externalGeography || []).map((g) => ({
      label: [g.city, g.region, g.country].filter(Boolean).join(", "),
      country: g.country,
      count: g.unique_viewers
    }));
    const extMax = Math.max(...extGeo.map((g) => g.count), 1);
    let html = "";
    html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #d1d5db;">\u{1F464} On-Site Visitors</div>';
    if (onsiteRows.length > 0) {
      html += '<div style="padding-right: 6px; margin-bottom: 12px;">' + renderGeoRows(onsiteRows, onsiteMax, countryColor) + "</div>";
    } else {
      html += '<p style="color:#666; margin-bottom: 12px;">No on-site data yet</p>';
    }
    html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #9ca3af;">\u{1F310} External Reach <span style="font-weight: normal; font-size: 10px; opacity: 0.7;">(hotlinked images)</span></div>';
    if (extGeo.length > 0) {
      html += '<div style="padding-right: 6px;">' + renderGeoRows(extGeo, extMax, (c) => "#6b7280") + "</div>";
    } else {
      html += '<p style="color:#666">No external data yet</p>';
    }
    return html;
  })()}
    </div>

    <div class="section">
      <div class="section-header">
        <h3>Devices</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Sessions and engagement by device. Engage Lvl shows how deeply each platform's users interact.</div></span>
      </div>
      <table>
        <tr><th>Platform</th><th>Sessions</th><th>Engage Lvl</th></tr>
        ${deviceEngagement.map((d) => {
    const icons = { ios: "\u{1F4F1}", android: "\u{1F916}", mac: "\u{1F34E}", windows: "\u{1FA9F}", linux: "\u{1F427}", unknown: "\u2753" };
    const labels = { ios: "iOS", android: "Android", mac: "Mac", windows: "Windows", linux: "Linux", unknown: "Unknown" };
    const engageColor = d.avg_depth >= 15 ? "#10b981" : d.avg_depth >= 8 ? "#f59e0b" : "#888";
    return `<tr><td>${icons[d.device] || "?"} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
  }).join("")}
        ${deviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ""}
      </table>
    </div>

    <div class="section">
      <div class="section-header" style="margin-bottom: ${edgeEvents.length === 0 && edgeSummary.length === 0 ? "0" : "12px"};">
        <h3 style="display: inline;">\u{1F9ED} Index Health</h3>
        ${edgeEvents.length === 0 && edgeSummary.length === 0 ? '<span style="color:#666; margin-left: 12px;">No edge events yet</span>' : ""}
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Edge events: 301 redirects (canonical fixes), 410 Gone (removed content), 404 fallbacks. Healthy sites show these tapering over time.</div></span>
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
      "410": "#f59e0b",
      "404": "#ef4444"
    };
    const typeLabels = {
      smart404_redirect: "301",
      smart404_gone: "410",
      smart404_fallback: "404",
      smart404_homepage: "Home",
      "301": "301",
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
      "410": "#f59e0b",
      "404": "#ef4444"
    };
    const eventLabels2 = {
      smart404_redirect: "301",
      smart404_gone: "410",
      smart404_fallback: "404",
      smart404_homepage: "Home",
      "301": "301",
      "410": "410",
      "404": "404"
    };
    const color = eventColors[e.event_type] || "#888";
    const label = eventLabels2[e.event_type] || e.event_type;
    const shortPath = e.path && e.path.length > 40 ? "..." + e.path.slice(-37) : e.path || "unknown";
    const botIcon = e.is_bot ? "\u{1F916}" : "\u{1F464}";
    return `
          <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #333; gap: 8px;">
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
      <h3>Top 10 Pages</h3>
      ${pages.length === 0 ? '<p style="color:#666">No data yet</p>' : pages.map((p) => {
    const shortPath = p.page_path.length > 28 ? "..." + p.page_path.slice(-25) : p.page_path;
    return `
          <div class="bar-row">
            <a class="bar-label" href="https://www.k4studios.com${p.page_path}" target="_blank" title="${p.page_path}" style="color: #4a9eff; text-decoration: none;">${shortPath}</a>
            <div class="bar-container">
              <div class="bar" style="width: ${(p.sessions / maxPageSessions * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${p.sessions}</span>
          </div>
        `;
  }).join("")}
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
      <h3>Gallery-Chapter Entry Points</h3>
      <table>
        <tr><th>Source</th><th>Sessions</th></tr>
        ${entries.map((e) => `<tr><td>${formatEventName(e.entry_source)}</td><td>${e.sessions}</td></tr>`).join("")}
        ${entries.length === 0 ? '<tr><td colspan="2">No data yet</td></tr>' : ""}
      </table>
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
  </div>

  <!-- Bot Intelligence Section -->
  <div style="max-width: 1780px; margin: 0 auto;">
  <h2 style="margin-top: 30px;">\u{1F6E1}\uFE0F Bot Intelligence <span style="font-size: 12px; color: #888; font-weight: normal;">(Threat Classification)</span></h2>
  <p style="color: #888; margin: -10px 0 15px 0; font-size: 12px;">
    Risk accumulates over time. Level 3 = high risk (review recommended). Level 4 = block candidate.
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
      <span class="value" style="color: #fff;">\u{1F7E3} ${botIntelligence?.stats?.risk4 || 0}</span>
      <span class="label" style="color: #f5d0fe;">Block Candidates <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #f5d0fe;">i</span></span>
      <div class="tooltip"><strong>Risk score 8+.</strong> Likely malicious/abusive behavior. Review in High Risk Watchlist and consider blocking. Escalates from High Risk when: persistent multi-day scraping, extreme velocity, or multiple red flags combine.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
      <span class="value" style="color: #fff;"><span style="text-shadow: 0 0 2px #000, 0 0 4px #000;">?</span> ${botIntelligence?.blocked?.filter((b) => b.is_active)?.length || 0}</span>
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
      "openai": "\u{1F916}",
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

    <!-- Suspected Bots (Risk 2+) -->
    <div class="section">
      <h3>\u{1F3AF} High-Risk Watchlist</h3>
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
          ${(botIntelligence?.suspects || []).filter((s2) => s2.risk_level >= 2 && s2.status !== "blocked").map((s2) => {
    const riskColors = { 1: "#10b981", 2: "#fbbf24", 3: "#f97316", 4: "#ef4444" };
    const riskIcons = { 1: "\u{1F7E2}", 2: "\u{1F7E1}", 3: "\u{1F7E0}", 4: "\u{1F534}" };
    const rules = JSON.parse(s2.rules_triggered || "[]");
    const rulesShort = rules.slice(0, 2).map((r) => r.replace(/_/g, " ").slice(0, 12)).join(", ");
    const isBlocked = s2.status === "blocked";
    const riskColor = riskColors[s2.risk_level];
    const riskIcon = riskIcons[s2.risk_level];
    const rowStyle = isBlocked ? "opacity: 0.5;" : "";
    const reqColor = s2.total_requests > 100 ? "#ef4444" : "#888";
    const daysColor = s2.days_seen > 2 ? "#f97316" : "#888";
    const actionHtml = isBlocked ? '<span style="color: #666;">Blocked</span>' : `<button onclick="blockIP('` + s2.ip_hash + `')" style="background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">Block</button>`;
    return '<tr style="border-bottom: 1px solid #333; ' + rowStyle + '"><td style="padding: 6px 4px;"><span style="background: ' + riskColor + "22; color: " + riskColor + '; padding: 2px 6px; border-radius: 8px; font-weight: bold;">' + riskIcon + " " + s2.risk_level + '</span></td><td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">' + s2.ip_hash + '<span style="color: #666; margin-left: 4px;">' + (s2.country || "") + '</span></td><td style="padding: 6px 4px; text-align: right; font-weight: bold; color: ' + reqColor + ';">' + s2.total_requests + '</td><td style="padding: 6px 4px; color: #888; font-size: 10px;" title="' + rules.join(", ") + '">' + rulesShort + (rules.length > 2 ? "..." : "") + '</td><td style="padding: 6px 4px; text-align: center;"><span style="color: ' + daysColor + ';">' + s2.days_seen + '</span></td><td style="padding: 6px 4px; text-align: center;">' + actionHtml + "</td></tr>";
  }).join("")}
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
  </div>
  </div>

  <p style="margin-top: 30px; color: #666; font-size: 12px; max-width: 1780px; margin-left: auto; margin-right: auto;">
    Generated ${(/* @__PURE__ */ new Date()).toISOString()} \u2014 ${periodLabel}
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
  const { events, entries } = await getEventBreakdown(env, {
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
    dateClause,
    ipClause,
    botClause,
    chardonClause
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
  const { artViewsSummary, artViewsByType, topArtViews } = await getArtViews(env, {
    dateClause,
    ipClause,
    botClause,
    chardonClause,
    artIpClause
  });
  const botIntelligence = await getBotIntelligence(env);
  const queryResults = {
    summary,
    returningVisitors,
    newVisitors,
    events,
    entries,
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
    botIntelligence
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
      rangeDateClause = `date(created_at, '-5 hours') = date('now', '-5 hours', '-1 day')`;
    } else if (days === 1) {
      rangeDateClause = `date(created_at, '-5 hours') = date('now', '-5 hours')`;
    } else {
      rangeDateClause = `created_at > datetime('now', '-5 hours', '-${days} days')`;
    }
    const dateClause = selectedDate ? `date(created_at, '-5 hours') = '${selectedDate}'` : rangeDateClause;
    const galleryClause = galleryFilter ? `AND gallery_id = '${galleryFilter}'` : "";
    const ipClause = excludeIp ? `AND (ip IS NULL OR ip != '${excludeIp}')` : "";
    const excludeIpHash = excludeIp && excludeIp !== "unknown" ? hashIP(excludeIp) : null;
    const viewerIpHash = viewerIp && viewerIp !== "unknown" ? hashIP(viewerIp) : null;
    const artIpParts = [];
    if (excludeIpHash && excludeIpHash !== "unknown") artIpParts.push(`ip_hash != '${excludeIpHash}'`);
    if (hideBots) artIpParts.push(`NOT (ip_hash LIKE '3.%' OR ip_hash LIKE '17.%' OR ip_hash LIKE '18.%' OR ip_hash LIKE '40.77.%' OR ip_hash LIKE '52.%' OR ip_hash LIKE '54.%' OR ip_hash LIKE '65.55.%')`);
    if (hideChardon && viewerIpHash && !excludeIpHash) artIpParts.push(`ip_hash != '${viewerIpHash}'`);
    if (hideChardon) artIpParts.push(`(referrer IS NULL OR referrer NOT LIKE '%localhost%')`);
    const artIpClause = artIpParts.length > 0 ? "AND " + artIpParts.join(" AND ") : "";
    const botClause = hideBots ? `AND NOT (ip LIKE '3.%' OR ip LIKE '17.%' OR ip LIKE '18.%' OR ip LIKE '40.77.%' OR ip LIKE '52.%' OR ip LIKE '54.%' OR ip LIKE '65.55.%' OR city = 'Ashburn' OR device = 'unknown')` : "";
    const chardonClause = hideChardon ? `AND city != 'Chardon'` : "";
    const priorPeriodClause = selectedDate ? `date(created_at, '-5 hours') < '${selectedDate}'` : yesterday ? `created_at < datetime('now', '-5 hours', '-1 day', 'start of day')` : `created_at < datetime('now', '-5 hours', '-${days} days')`;
    const html = await handleDashboardRequest(env, {
      dateClause,
      galleryClause,
      ipClause,
      botClause,
      chardonClause,
      priorPeriodClause,
      rangeDateClause,
      artIpClause,
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
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(
      (resolve) => setTimeout(() => resolve("timeout"), ms)
    )
  ]);
}
__name(withTimeout, "withTimeout");
async function logArtView2(...args) {
  try {
    return await withTimeout(logArtView(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logArtView]:", err?.message || err);
  }
}
__name(logArtView2, "logArtView");
async function handleTrackRequest(request, env, ctx) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (isSyntheticTraffic(request)) {
    return new Response(null, { status: 204 });
  }
  try {
    const body = await request.json();
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
    if (!event) {
      return new Response("Missing event", { status: 400 });
    }
    const legacyPaths = ["/Photoshootsandevents/", "/Photography-Galleries/", "/Scheduled-Shoots/", "/Is-Winter/"];
    if (page_path && legacyPaths.some((p) => page_path.startsWith(p))) {
      return new Response(JSON.stringify({ ok: true, filtered: "legacy_path" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || null;
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/k4_entry_ref=([^;]+)/);
    const edgeReferrer = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const bestReferrer = edgeReferrer || clientReferrer;
    const referrer = bestReferrer || "unknown";
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
      clientReferrer,
      // Store raw referrer for debugging
      event_ts_ms,
      // Client timestamp (ms since epoch)
      event_order
      // Event sequence within session
    ).run();
    if (event === "chapter_view") {
      const targetId = image_id || (typeof page_path === "string" ? page_path.match(/\/(i-[a-zA-Z0-9_-]+)\/?$/)?.[1] || null : null);
      if (targetId) {
        ctx.waitUntil(logArtView2(env, "chapter_view", targetId, request, session_id));
      }
    }
    if (event === "gallery_view") {
      const targetId = gallery_id || (typeof page_path === "string" ? page_path.replace(/^\/Galleries\//, "").replace(/^\/Other\//, "").replace(/\/$/, "") : null);
      if (targetId) {
        ctx.waitUntil(logArtView2(env, "gallery_view", targetId, request, session_id));
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
__name(handleTrackRequest, "handleTrackRequest");
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
__name(handleTrackOptions, "handleTrackOptions");

// src/analytics/admin.js
function withAdminNoCacheHeaders2(baseHeaders = {}) {
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Vary", "Authorization");
  return headers;
}
__name(withAdminNoCacheHeaders2, "withAdminNoCacheHeaders");
function checkAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  const expected = "Basic " + btoa("k4admin:" + (env.ANALYTICS_PASSWORD || "k4analytics2024"));
  return authHeader === expected;
}
__name(checkAuth, "checkAuth");
async function handleExportCSV(request, env) {
  if (!checkAuth(request, env)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: withAdminNoCacheHeaders2({
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
    const headers = ["created_at", "session_id", "event", "gallery_id", "image_id", "page_path", "referrer", "device", "country", "region", "city", "theme"];
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
    const filename = `k4-analytics-${yesterday ? "yesterday" : days + "days"}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: withAdminNoCacheHeaders2({
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`
      })
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(`Export error: ${err.message}`, {
      status: 500,
      headers: withAdminNoCacheHeaders2({ "Content-Type": "text/plain; charset=utf-8" })
    });
  }
}
__name(handleExportCSV, "handleExportCSV");
async function handleBlockIP(request, env) {
  try {
    const { ip_hash, reason } = await request.json();
    if (!ip_hash) {
      return new Response(JSON.stringify({ error: "ip_hash required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const suspectInfo = await env.DB.prepare(`
      SELECT risk_level, risk_score, rules_triggered, total_requests 
      FROM suspected_bots WHERE ip_hash = ?
    `).bind(ip_hash).first();
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
      suspectInfo?.rules_triggered || "[]",
      suspectInfo?.total_requests || 0,
      reason || "Manual block from dashboard"
    ).run();
    await env.DB.prepare(`
      UPDATE suspected_bots SET status = 'blocked', updated_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();
    return new Response(JSON.stringify({ success: true, ip_hash }), {
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
async function handleUnblockIP(request, env) {
  try {
    const { ip_hash } = await request.json();
    if (!ip_hash) {
      return new Response(JSON.stringify({ error: "ip_hash required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    await env.DB.prepare(`
      UPDATE blocked_ips 
      SET is_active = 0, unblocked_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();
    await env.DB.prepare(`
      UPDATE suspected_bots SET status = 'watching', updated_at = datetime('now')
      WHERE ip_hash = ?
    `).bind(ip_hash).run();
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

// src/analytics/worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/track") && request.cf?.botManagement?.verifiedBot) {
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/__k4stats") {
      return handleDashboardRequest2(request, env, ctx);
    }
    if (url.pathname === "/__k4stats/export") {
      return handleExportCSV(request, env);
    }
    if (url.pathname === "/__k4stats/block" && request.method === "POST") {
      return handleBlockIP(request, env);
    }
    if (url.pathname === "/__k4stats/unblock" && request.method === "POST") {
      return handleUnblockIP(request, env);
    }
    if (url.pathname === "/__k4stats/refresh-bots" && request.method === "POST") {
      return handleRefreshBots(request, env);
    }
    if (url.pathname === "/track") {
      if (request.method === "OPTIONS") {
        return handleTrackOptions();
      }
      return handleTrackRequest(request, env, ctx);
    }
    return fetch(request);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
