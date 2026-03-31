// Analytics V2 Read Layer — Dashboard Queries
//
// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE: SINGLE POPULATION DOCTRINE (Cookie-Based)
// ═══════════════════════════════════════════════════════════════════════════
// 
// 2. classified_events VIEW = raw_events + is_bot flag (computed, not stored)
// 3. Most queries: FROM human_population hp JOIN classified_events e ON e.visitor_id = hp.visitor_id
//    (Some leaderboard / truth panels like Top Pages compute directly from classified_events.)
// 4. If humans = 0, most human-only metrics = 0. Guaranteed by JOIN.
//
// Rule: Humans cause events. Events never define humans.
// 1 cookie (k4_vid) = 1 human. IP addresses are irrelevant.
// ═══════════════════════════════════════════════════════════════════════════

// Internal synthetic agent (cache warmer) should never count in analytics.
// We exclude it at ingestion in the image proxy, but also exclude it at query-time
// so any historical rows don’t pollute dashboards.
const notCacheWarmer = (alias) => `LOWER(COALESCE(${alias}.ua, '')) NOT LIKE '%k4-cache-warmer%'`;

// ── 3-Axis Classification ──────────────────────────────────────────────
// Axis 1: population_type  — WHO caused the event
//   Determined by event source, NOT by referer.
//   human            → JS-verified (has k4_vid cookie, event from collector.js)
//   external_non_js  → proxy-logged L-size fetches (external_image/direct_image)
//   bot              → classified_events.is_bot = 1
//
// Axis 2: access_type — HOW the request arrived
function getAccessType(referer) {
  if (!referer) return 'direct';
  let host;
  try { host = new URL(referer).hostname.toLowerCase(); } catch(e) {
    return 'unknown';
  }
  if (host.endsWith('k4studios.com')) return 'internal_navigation';
  return 'external_referral';
}

// Axis 3: referrer_source — WHERE FROM (only meaningful when access_type = 'external_referral')
function getReferrerSource(referer) {
  if (!referer) return null;
  const r = referer.toLowerCase().trim();
  if (r === 'direct' || r === '' || r === 'null') return 'Direct'; // explicit direct visits
  let host;
  try { host = new URL(referer).hostname.toLowerCase(); } catch(e) {
    if (r.includes('google')) return 'Google Search';
    if (r.includes('bing')) return 'Bing';
    return 'Other';
  }
  if (host.endsWith('k4studios.com')) return null; // internal — no external source
  if (host.includes('googleusercontent')) return 'Google Images';
  if (host.includes('google')) return 'Google Search';
  if (host.includes('bing')) return 'Bing';
  if (host === 't.co' || host.includes('twitter') || host.includes('x.com')) return 'Twitter/X';
  if (host.includes('facebook') || host.includes('fb.com')) return 'Facebook';
  if (host.includes('pinterest')) return 'Pinterest';
  if (host.includes('duckduckgo')) return 'DuckDuckGo';
  if (host.includes('yandex')) return 'Yandex';
  if (host.includes('baidu')) return 'Baidu';
  if (host.includes('chatgpt') || host.includes('openai')) return 'ChatGPT';
  return host; // fallback to raw hostname
}

function getAssetSourceLabel(assetSource) {
  if (!assetSource) return null;
  const s = String(assetSource).trim().toLowerCase();
  if (!s) return null;
  if (s === 'og') return 'Open Graph';
  if (s === 'tw') return 'Twitter/X';
  if (s === 'pn') return 'Pinterest';
  if (s === 'sd') return 'Structured Data';
  return null;
}

function formatOGPlatformLabel(ogPlatform) {
  const p = String(ogPlatform || '').trim().toLowerCase();
  if (!p) return null;
  const map = {
    facebook: 'Facebook',
    discord: 'Discord',
    slack: 'Slack',
    linkedin: 'LinkedIn',
    twitter: 'Twitter',
    whatsapp: 'WhatsApp',
    apple: 'Apple',
    unknown: 'Unknown'
  };
  if (map[p]) return map[p];
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function formatAssetSourceLabel(assetSourceLabel, ogPlatform) {
  if (!assetSourceLabel) return null;
  if (assetSourceLabel !== 'Open Graph') return assetSourceLabel;
  const plat = formatOGPlatformLabel(ogPlatform);
  if (!plat) return 'Open Graph';
  return `Open Graph (${plat})`;
}

// Entry referrer classification — returns snake_case keys matching renderer's entryRefCounts
function classifyForEntryRef(referer) {
  if (!referer) return 'direct';
  let host;
  try { host = new URL(referer).hostname.toLowerCase(); } catch(e) {
    return 'unattributed';
  }
  if (host.endsWith('k4studios.com')) return 'unattributed';
  if (host.includes('googleusercontent') || host.includes('images.google')) return 'google_images';
  if (host.includes('google')) return 'google_search';
  if (host.includes('bing')) return 'bing_search';
  if (host === 't.co' || host.includes('twitter') || host.includes('x.com')) return 'twitter';
  if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
  if (host.includes('pinterest')) return 'pinterest';
  if (host.includes('duckduckgo')) return 'duckduckgo';
  if (host.includes('chatgpt') || host.includes('openai')) return 'chatgpt';
  if (host.includes('instagram')) return 'instagram';
  if (host.includes('linkedin')) return 'linkedin';
  return 'unattributed';
}

// ── Canonical image URL helper (used to avoid /art/i-... smart-404 function hits) ──
const IMAGE_ID_MAP_URL = 'https://k4studios.com/imageIdMap.json';
const IMAGE_ID_MAP_TTL_MS = 60 * 60 * 1000;
let _imageIdMapCache = null;
let _imageIdMapCacheTime = 0;

async function getImageIdMapCached() {
  const now = Date.now();
  if (_imageIdMapCache && (now - _imageIdMapCacheTime) < IMAGE_ID_MAP_TTL_MS) {
    return _imageIdMapCache;
  }
  try {
    const res = await fetch(IMAGE_ID_MAP_URL, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('imageIdMap fetch failed: ' + res.status);
    const data = await res.json();
    if (data && typeof data === 'object') {
      _imageIdMapCache = data;
      _imageIdMapCacheTime = now;
      return _imageIdMapCache;
    }
  } catch (e) {
    // Keep last good cache if present.
    console.log('imageIdMap fetch failed:', e?.message || e);
  }
  return _imageIdMapCache;
}

function getCanonicalGalleryPathForImageId(imageIdMap, imageId) {
  if (!imageIdMap || !imageId) return null;
  const raw = imageIdMap[imageId];
  const path = Array.isArray(raw) ? raw[0] : raw;
  if (!path || typeof path !== 'string') return null;
  return String(path).replace(/\/+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE METRICS — The only queries that matter
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get human count - THE canonical count
 */
export async function getHumanCount(env, dateClause = '') {
  // JS proof-of-life gate:
  // A visitor_id alone is NOT proof of a human (we set cookies server-side on HTML).
  // To avoid cookie-only bots (e.g., SG/Helsinki scraping) polluting "human" counts,
  // require that the visitor_id has produced at least one JS beacon at any point.
  const jsProof = `EXISTS (
    SELECT 1 FROM classified_events j
    WHERE j.visitor_id = e.visitor_id
      AND j.source = 'js'
      AND j.visitor_id IS NOT NULL
      AND j.visitor_id != ''
  )`;

  const query = dateClause
    ? `
      SELECT COUNT(DISTINCT e.visitor_id) as count
      FROM classified_events e
      WHERE e.is_bot = 0
        AND e.visitor_id IS NOT NULL
        AND e.visitor_id != ''
        AND ${jsProof}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts')}
    `
    : `
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

/**
 * Get all dashboard stats - V2 simplified
 */
export async function getArtViews(env, filters) {
  const { dateClause, baseDateClause, hideBotsPredicate, hideBots } = filters;
  
  // Many external-image panels intentionally include non-JS traffic (missing visitor_id),
  // but when "Hide Bots" is enabled we should still suppress anything already classified
  // as a bot in classified_events.
  const notBotWhenHide = (alias) => (hideBots ? `AND COALESCE(${alias}.is_bot, 0) = 0` : '');
  
  // Start with human count - the foundation
  const humanCount = await getHumanCount(env, dateClause);
  
  // If no humans, return zeros immediately
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
    // Summary counts:
    // - Human-only: xl_zoom, gallery_view
    // - External embeds: external_image/direct_image (no visitor_id cookie required)
    const summaryQuery = `
      SELECT 'xl_zoom' as event_type, COUNT(*) as views
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type = 'xl_zoom'
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}

      UNION ALL

      SELECT 'gallery_view' as event_type, COUNT(*) as views
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type IN ('gallery', 'gallery_view')
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}

      UNION ALL

      SELECT 'external_image' as event_type, COUNT(*) as views
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
    `;
    const summaryResult = await env.DB.prepare(summaryQuery).all();
    
    for (const row of (summaryResult.results || [])) {
      if (row.event_type === 'xl_zoom') {
        artViewsSummary.xl_zooms = row.views;
      }
      if (row.event_type === 'gallery' || row.event_type === 'gallery_view') {
        artViewsSummary.galleries = row.views;
      }
      if (row.event_type === 'external' || row.event_type === 'external_image') {
        artViewsSummary.external_images = row.views;
      }
    }

    // Chapters (canonical):
    // - Count chapter exposures from both proxy truth ('chapter_exposure') and JS beacons ('chapter_view')
    // - Dedup per (visitor_id, target_id, session_id)
    // - Back-compat: if session_id is missing, dedup per day as a safe fallback
    try {
      const chapterViewsQuery = `
        SELECT COUNT(*) as chapter_views
        FROM (
          SELECT e.visitor_id, e.target_id, COALESCE(e.session_id, 'd:' || date(e.ts)) as session_bucket
          FROM human_population hp
          JOIN classified_events e ON e.visitor_id = hp.visitor_id
          WHERE e.event_type IN ('chapter_exposure', 'chapter_view')
            AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
          GROUP BY e.visitor_id, e.target_id, session_bucket
        )
      `;
      const chapterViewsResult = await env.DB.prepare(chapterViewsQuery).first();
      artViewsSummary.chapter_views = chapterViewsResult?.chapter_views || 0;
    } catch (e) {
      console.log('Chapter views query failed:', e.message);
    }
    
    artViewsSummary.total = artViewsSummary.chapter_views + artViewsSummary.external_images;
  } catch (e) {
    console.log('Summary query failed:', e.message);
  }

  // Harvester friction counts (delay vs 429) — uses raw_events directly (no bot filter)
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
    console.log('Harvester friction query failed:', e.message);
  }

  // Top chapters - FROM human_population → JOIN classified_events
  let topChapters = [];
  try {
    const topChaptersQuery = `
      WITH ranked AS (
        SELECT
          e.visitor_id as visitor_id,
          e.target_id as target_id,
          e.event_type as event_type,
          e.ts as ts,
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
          AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      ),
      chapter_pairs AS (
        SELECT visitor_id, target_id, event_type, ts, session_bucket, device, country, region, city, page, referer
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
        MAX(cp.ts) as last_seen,
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
    topChapters = (result.results || []).map(r => {
      const referrerSource = getReferrerSource(r.best_referer);
      return {
        type: 'chapter_exposure',
        target_id: r.target_id,
        views: r.views,
        unique_viewers: r.unique_viewers,
        has_js_view: r.has_js_view === 1,
        last_seen: r.last_seen || null,
        devices: (r.device_types || '').split(',').map(s => (s || '').trim()).filter(Boolean),
        countries: r.countries,
        url: r.best_page || null,
        geo: { country: r.geo_country, region: r.geo_region, city: r.geo_city },
        referrer_source: referrerSource
      };
    });
  } catch (e) {
    console.log('Top chapters query failed:', e.message);
  }
  
  // Top zooms - FROM human_population → JOIN classified_events
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
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type = 'xl_zoom'
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 2000
    `;
    const result = await env.DB.prepare(topZoomsQuery).all();
    topZooms = (result.results || []).map(r => ({
      type: 'xl_zoom',
      target_id: r.target_id,
      views: r.views,
      unique_viewers: r.unique_viewers,
      last_seen: r.last_seen || null,
      devices: (r.device_types || '').split(',').map(s => (s || '').trim()).filter(Boolean),
      url: r.best_page || null,
      geo: { country: r.geo_country, region: r.geo_region, city: r.geo_city }
    }));
  } catch (e) {
    console.log('Top zooms query failed:', e.message);
  }
  
  // Top galleries - FROM human_population → JOIN classified_events
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
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 50
    `;
    const result = await env.DB.prepare(topGalleriesQuery).all();
    const rawGalleries = (result.results || []).map(r => ({
      type: 'gallery_view',
      target_id: r.target_id,
      views: r.views,
      unique_viewers: r.unique_viewers,
      devices: (r.device_types || '').split(',').map(s => (s || '').trim()).filter(Boolean)
    }));
    
    // NO MERGE: gallery_id is now canonical at ingestion
    // Just derive a short display_name for UI (last 2 segments) without changing identity
    const getDisplayName = (path) => {
      const parts = String(path || '').split('/').filter(Boolean);
      return parts.slice(-2).join('/') || path;
    };
    
    topGalleries = rawGalleries.map(g => ({
      ...g,
      display_name: getDisplayName(g.target_id)
    }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);
  } catch (e) {
    console.log('Top galleries query failed:', e.message);
  }
  
  // Viewer depth score - FROM human_population → JOIN classified_events
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
        WHERE ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
          { label: 'Collectors (20+)', count: depthResult.high_depth_count || 0 },
          { label: 'Engaged (10-19)', count: depthResult.engaged_count || 0 },
          { label: 'Curious (3-9)', count: depthResult.curious_count || 0 },
          { label: 'Casual (<3)', count: depthResult.casual_count || 0 }
        ]
      };
    }
  } catch (e) {
    console.log('Depth query failed:', e.message);
  }
  
  // Bot count for suppression stats (not filtered out, just counted)
  let suppressionStats = { suppressedToday: 0, activeSuppressedIPs: 0 };
  try {
    if (hideBots && baseDateClause && hideBotsPredicate) {
      // When Hide Bots is ON, show how many would have been excluded by the Hide Bots rule.
      // Use visitor_id population to keep this comparable to other "human" panels.
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
      // Default: show legacy "verified bot" classification counts for the same time window.
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
    console.log('Bot count query failed:', e.message);
  }
  
  // Top external/direct L-size image fetches (no JS required)
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id, e.referer
      ORDER BY hits DESC
      LIMIT 2000
    `;

    let result;
    try {
      result = await env.DB.prepare(externalQueryWithRefTypeAndAssetSource).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('no such column') && msg.includes('asset_source')) {
        result = await env.DB.prepare(externalQueryWithRefType).all();
      } else if (msg.includes('no such column') && msg.includes('ref_type')) {
        result = await env.DB.prepare(externalQueryLegacy).all();
      } else {
        throw e;
      }
    }
    const accessPriority = { external_referral: 0, direct: 1, internal_navigation: 2, unknown: 3 };
    externalImageAccess = (result.results || []).map(r => {
      const assetSourceLabel = formatAssetSourceLabel(getAssetSourceLabel(r.asset_source), r.og_platform);
      const accessType = r.ref_type
        ? (r.ref_type === 'direct' ? 'direct'
          : r.ref_type === 'external' ? 'external_referral'
          : r.ref_type === 'internal' ? 'internal_navigation'
          : 'unknown')
        : getAccessType(r.referer);
      const referrerSource = accessType === 'external_referral'
        ? (getReferrerSource(r.referer) || 'Other')
        : accessType === 'direct' ? 'No Referrer'
        : accessType === 'internal_navigation' ? 'Internal'
        : 'Unknown';
      let refererHost = null;
      if (r.referer) {
        try { refererHost = new URL(r.referer).hostname; } catch(e) {}
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
        geo: { country: r.geo_country, region: r.geo_region, city: r.geo_city }
      };
    }).sort((a, b) => b.hits - a.hits || (accessPriority[a.access_type] ?? 9) - (accessPriority[b.access_type] ?? 9));
  } catch (e) {
    console.log('External image access query failed:', e.message);
  }

  // External image access total count
  let externalImageAccessTotal = 0;
  try {
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
    `;
    const result = await env.DB.prepare(totalQuery).first();
    externalImageAccessTotal = result?.total || 0;
  } catch (e) {
    console.log('External image access total query failed:', e.message);
  }

  // External reach geography (non-JS traffic — separate from human Viewer Geography)
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND e.country IS NOT NULL
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.country, e.city, e.region
      ORDER BY hits DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(geoQuery).all();
    externalReachGeo = (result.results || []).map(r => ({
      country: r.country,
      city: r.city,
      region: r.region,
      hits: r.hits
    }));
  } catch (e) {
    console.log('External reach geo query failed:', e.message);
  }

  // External reach by source (referrer classification)
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
      ORDER BY hits DESC
      LIMIT 20
    `;

    let result;
    try {
      result = await env.DB.prepare(srcQueryWithRefTypeAndAssetSource).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('no such column') && msg.includes('asset_source')) {
        result = await env.DB.prepare(srcQueryWithRefType).all();
      } else if (msg.includes('no such column') && msg.includes('ref_type')) {
        result = await env.DB.prepare(srcQueryLegacy).all();
      } else {
        throw e;
      }
    }
    // Classify each row and aggregate by referrer_source (ALL access types)
    const sourceMap = {};
    for (const r of (result.results || [])) {
      const assetLabel = formatAssetSourceLabel(getAssetSourceLabel(r.asset_source), r.og_platform);

      const accessType = r.ref_type
        ? (r.ref_type === 'direct' ? 'direct'
          : r.ref_type === 'external' ? 'external_referral'
          : r.ref_type === 'internal' ? 'internal_navigation'
          : 'unknown')
        : getAccessType(r.referer);

      // If the request was explicitly tagged by the proxy (OG/TW/PN/SD prefix),
      // treat that as the source label for reach attribution.
      const source = assetLabel
        ? assetLabel
        : accessType === 'external_referral'
          ? (getReferrerSource(r.referer) || 'Other')
          : accessType === 'direct' ? 'Direct'
          : accessType === 'internal_navigation' ? 'Internal'
          : 'Unknown';

      sourceMap[source] = (sourceMap[source] || 0) + r.hits;
    }
    externalReachSources = Object.entries(sourceMap)
      .map(([source, hits]) => ({ source, hits }))
      .sort((a, b) => b.hits - a.hits);
  } catch (e) {
    console.log('External reach sources query failed:', e.message);
  }

  // ── V1-compat: Top External Images (external_referral only) ──
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
            AND ${notCacheWarmer('e2')}
            ${notBotWhenHide('e2')}
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.referer IS NOT NULL
          GROUP BY e2.referer
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as top_referer
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(extImgQuery).all();
    topExternal = (result.results || []).map(r => {
      const at = getAccessType(r.top_referer);
      const src = at === 'external_referral' ? classifyForEntryRef(r.top_referer) : (at === 'direct' ? 'direct' : 'unattributed');
      return {
        target_id: r.target_id,
        views: r.views,
        unique_viewers: r.unique_viewers,
        top_source: src
      };
    });
  } catch (e) {
    console.log('Top external images query failed:', e.message);
  }

  // ── V1-compat: externalDisplays (source breakdown) ──
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
      ORDER BY views DESC
      LIMIT 30
    `;

    let result;
    try {
      result = await env.DB.prepare(dispQueryWithRefType).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('no such column') && msg.includes('ref_type')) {
        result = await env.DB.prepare(dispQueryLegacy).all();
      } else {
        throw e;
      }
    }
    const sourceMap = {};
    for (const r of (result.results || [])) {
      if (r.ref_type === 'direct' || !r.referer) {
        noRefExternalViews += r.views;
        continue;
      }
      const at = r.ref_type
        ? (r.ref_type === 'direct' ? 'direct'
          : r.ref_type === 'external' ? 'external_referral'
          : r.ref_type === 'internal' ? 'internal_navigation'
          : 'unknown')
        : getAccessType(r.referer);
      if (at === 'internal_navigation') continue; // skip internal
      const source = getReferrerSource(r.referer) || 'Other';
      sourceMap[source] = (sourceMap[source] || 0) + r.views;
    }
    externalDisplays = Object.entries(sourceMap)
      .map(([source, views]) => ({ source, views }))
      .sort((a, b) => b.views - a.views);
  } catch (e) {
    console.log('External displays query failed:', e.message);
  }

  // ── V1-compat: entryRefCounts (all external/direct L-size fetches by entry source key) ──
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer, e.ref_type
    `;

    const entryQueryLegacy = `
      SELECT 
        e.referer,
        COUNT(*) as cnt
      FROM classified_events e
      WHERE e.event_type IN ('external_image', 'direct_image')
        AND (e.visitor_id IS NULL OR e.visitor_id = '')
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
    `;

    let result;
    try {
      result = await env.DB.prepare(entryQueryWithRefType).all();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('no such column') && msg.includes('ref_type')) {
        result = await env.DB.prepare(entryQueryLegacy).all();
      } else {
        throw e;
      }
    }
    for (const r of (result.results || [])) {
      const key = r.ref_type === 'direct'
        ? 'direct'
        : r.ref_type === 'internal'
          ? 'unattributed'
          : classifyForEntryRef(r.referer);
      entryRefCountsObj[key] = (entryRefCountsObj[key] || 0) + r.cnt;
    }
  } catch (e) {
    console.log('Entry ref counts query failed:', e.message);
  }

  // ── V1-compat: externalGeography ──
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
        AND ${notCacheWarmer('e')}
        ${notBotWhenHide('e')}
        AND e.ip_hash IS NOT NULL
        AND e.ip_hash != ''
        AND e.country IS NOT NULL
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.country, e.city, e.region
      ORDER BY unique_viewers DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(extGeoQuery).all();
    externalGeography = (result.results || []).map(r => ({
      country: r.country,
      city: r.city,
      region: r.region,
      unique_viewers: r.unique_viewers
    }));
  } catch (e) {
    console.log('External geography query failed:', e.message);
  }

  // Attach V1-compat fields to artViewsSummary
  artViewsSummary.externalDisplays = externalDisplays;
  artViewsSummary.noRefExternalViews = noRefExternalViews;
  artViewsSummary.externalGeography = externalGeography;

  // ── Build unified Image Access Overview (merge chapters + zooms + unverified/external) ──
  const imageMap = {};
  function setLastSeenIfLater(img, ts) {
    if (!ts) return;
    const t = String(ts).trim();
    if (!t) return;
    if (!img.last_seen || t > img.last_seen) img.last_seen = t;
  }
  function normalizeGeo(g) {
    if (!g) return null;
    const country = (g.country || '').toString().trim() || null;
    const region = (g.region || '').toString().trim() || null;
    const city = (g.city || '').toString().trim() || null;
    if (!country && !region && !city) return null;
    return { country, region, city };
  }
  function setGeoIfBetter(img, geo, priority) {
    const g = normalizeGeo(geo);
    if (!g) return;
    if ((img.geo_priority ?? 99) <= priority) return;
    img.geo = g;
    img.geo_priority = priority;
  }
  function ensureImage(id) {
    if (!imageMap[id]) {
      imageMap[id] = { image_id: id, badges: [], chapter_views: 0, xl_zooms: 0, unverified_views: 0, external_views: 0, countries: new Set(), sources: [], geo: null, geo_priority: 99, devices: new Set(), url: null, url_priority: 99, last_seen: null };
    }
    return imageMap[id];
  }
  function normalizeUrl(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    return s;
  }
  function setUrlIfBetter(img, url, priority) {
    const u = normalizeUrl(url);
    if (!u) return;
    if ((img.url_priority ?? 99) <= priority) return;
    img.url = u;
    img.url_priority = priority;
  }
  for (const c of topChapters) {
    const img = ensureImage(c.target_id);
    // "C" = JS-verified chapter_view, "I" = proxy-only chapter_exposure (image loaded, no JS)
    const badge = c.has_js_view ? 'C' : 'I';
    if (!img.badges.includes(badge)) img.badges.push(badge);
    img.chapter_views = c.views;
    setLastSeenIfLater(img, c.last_seen);
    // Only set verified geo/sources for JS-verified events
    if (c.has_js_view) {
      setGeoIfBetter(img, c.geo, 0); // verified
      setUrlIfBetter(img, c.url, 0);
      if (c.countries) c.countries.split(',').forEach(co => co && img.countries.add(co.trim()));
      if (Array.isArray(c.devices)) c.devices.forEach(d => d && img.devices.add(String(d).toLowerCase()));
      // For chapter views (JS-verified), Direct IS a valid source - means real visitor typed URL
      if (c.referrer_source && c.referrer_source !== 'Internal' && c.referrer_source !== 'Unknown') {
        if (!img.sources.includes(c.referrer_source)) img.sources.push(c.referrer_source);
      }
    } else {
      // Proxy-only: use external geo priority (2)
      setGeoIfBetter(img, c.geo, 2);
      setUrlIfBetter(img, c.url, 2);
    }
  }
  for (const z of topZooms) {
    const img = ensureImage(z.target_id);
    img.xl_zooms = z.views;
    setLastSeenIfLater(img, z.last_seen);
    setGeoIfBetter(img, z.geo, 0); // verified
    setUrlIfBetter(img, z.url, 1);
    if (Array.isArray(z.devices)) z.devices.forEach(d => d && img.devices.add(String(d).toLowerCase()));
  }
  for (const ext of externalImageAccess) {
    const img = ensureImage(ext.target_id);
    setLastSeenIfLater(img, ext.last_seen);
    if (ext.access_type === 'external_referral') {
      if (!img.badges.includes('E')) img.badges.push('E');
      img.external_views += ext.hits;
      setGeoIfBetter(img, ext.geo, 2); // external
    } else {
      if (!img.badges.includes('U')) img.badges.push('U');
      img.unverified_views += ext.hits;
      setGeoIfBetter(img, ext.geo, 1); // unverified
    }
    if (ext.country) img.countries.add(ext.country);
    if (ext.asset_source_label) {
      img.sources.push(ext.asset_source_label);
    }
    if (ext.access_type === 'external_referral') {
      if (ext.referrer_source && ext.referrer_source !== 'Unknown') {
        img.sources.push(ext.referrer_source);
      }
    } else if (ext.access_type === 'direct') {
      if (!img.sources.includes('No Referrer')) img.sources.push('No Referrer');
    } else if (ext.access_type === 'internal_navigation') {
      if (!img.sources.includes('Internal')) img.sources.push('Internal');
    }
  }

  // Backfill canonical URLs for image-only/unverified rows.
  // Without this, the renderer falls back to `/art/i-...`, which triggers Netlify smart-404.
  try {
    const imageIdMap = await getImageIdMapCached();
    if (imageIdMap) {
      for (const img of Object.values(imageMap)) {
        if (img?.image_id && !img.url) {
          const galleryPath = getCanonicalGalleryPathForImageId(imageIdMap, img.image_id);
          if (galleryPath) {
            const canonicalUrl = 'https://k4studios.com' + galleryPath + '/' + img.image_id + '/';
            setUrlIfBetter(img, canonicalUrl, 9);
          }
        }
      }
    }
  } catch (e) {
    console.log('Canonical URL backfill failed:', e?.message || e);
  }

  const imageAccessOverview = Object.values(imageMap).map(img => ({
    image_id: img.image_id,
    badges: img.badges,
    chapter_views: img.chapter_views,
    xl_zooms: img.xl_zooms,
    unverified_views: img.unverified_views,
    external_views: img.external_views,
    last_seen: img.last_seen,
    geo: img.geo,
    countries: Array.from(img.countries).filter(Boolean),
    sources: [...new Set(img.sources)],
    devices: Array.from(img.devices).filter(Boolean),
    url: img.url,
    total: img.chapter_views + img.xl_zooms + img.unverified_views + img.external_views
  })).sort((a, b) => {
    const ta = a.last_seen || '';
    const tb = b.last_seen || '';
    if (ta !== tb) return tb.localeCompare(ta);
    return (b.total - a.total);
  });

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

/**
 * Get dashboard stats for header - V2 simplified
 */
export async function getDashboardStats(env, filters) {
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
  
  // Count distinct engaged sessions (client session_id) for humans.
  // This is the closest thing to "real humans" in the dashboard sense:
  // - JS beaconed (source='js')
  // - page_view (session-scoped)
  // - non-bot
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
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
    `;
    const result = await env.DB.prepare(sessionsQuery).first();
    sessionCount = result?.sessions || 0;
  } catch (e) {
    console.log('Sessions count failed:', e.message);
  }

  // Get JS event count for humans (engagement beacons)
  let totalEvents = 0;
  try {
    const eventsQuery = `
      SELECT COUNT(*) as count
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
    console.log('Events count failed:', e.message);
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

// ═══════════════════════════════════════════════════════════════════════════
// STUB FUNCTIONS — Required by existing dashboard but simplified for V2
// ═══════════════════════════════════════════════════════════════════════════

export async function getEventBreakdown(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;

    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region')
      .replace(/\breferer\b/g, 'e.referer');

    // Legacy filter sometimes includes `device = 'unknown'`, but V2 does not persist
    // a device column on events (device is derived at query-time elsewhere).
    // Strip the device predicate so the query remains valid.
    const safeBotClause = (botClause || '')
      .replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, ' ')
      .replace(/\bdevice\s*=\s*'unknown'\b/gi, '1=1');

    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';

    // Keep in sync with the canonical list in dashboard renderer.
    // (Not including xl_zoom: it is handled separately.)
    const trackedEvents = [
      'browse_all_click',
      'order_clicked',
      'collector_notes_open',
      'cowboy_jump',
      'exit_to_gallery',
      'gallery_explore_click',
      'gallery_preview_click',
      'guide_open',
      'guide_close',
      'guide_done',
      'guide_click_outside',
      'gallery_hero_click',
      'more_info_open',
      'nav_next',
      'nav_prev',
      'order_submitted',
      'series_info',
      'sister_image_click',
      'slideshow_start',
      'story_slider_click',
      'theme_click',
      'all_list_click',
      'grid_open',
      'grid_image_click',
      'grid_show_more',
      'grid_show_previous',
      'scroll_25',
      'scroll_50',
      'scroll_75',
      'scroll_100',
      'page_view',
      'session_exit'
    ];
    const trackedListSql = trackedEvents.map(e => `'${e}'`).join(', ');

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
    console.log('Event breakdown query failed:', e.message);
    return { events: { results: [] } };
  }
}

export async function getGalleryPerformance(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;

    const qualify = (clause, alias) => (clause || '')
      .replace(/\bts\b/g, `${alias}.ts`)
      .replace(/\bip\b/g, `${alias}.ip`)
      .replace(/\bcity\b/g, `${alias}.city`)
      .replace(/\bcountry\b/g, `${alias}.country`)
      .replace(/\bregion\b/g, `${alias}.region`);

    const safeBotClause = (botClause || '')
      .replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, ' ')
      .replace(/\bdevice\s*=\s*'unknown'\b/gi, '1=1');

    const whereE = qualify(dateClause, 'e') || 'e.ts > datetime("now", "-1 day")';
    const whereE2 = qualify(dateClause, 'e2') || 'e2.ts > datetime("now", "-1 day")';

    // Derive gallery base path from the page_view path.
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
          ${qualify(ipClause, 'e')}
          ${qualify(safeBotClause, 'e')}
          ${qualify(chardonClause, 'e')}
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
          ${qualify(ipClause, 'e')}
          ${qualify(safeBotClause, 'e')}
          ${qualify(chardonClause, 'e')}
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
        ${qualify(ipClause, 'e2')}
        ${qualify(safeBotClause, 'e2')}
        ${qualify(chardonClause, 'e2')}
      GROUP BY sg.base_path
      ORDER BY sessions DESC
      LIMIT 15
    `;

    const galleriesRaw = await env.DB.prepare(galleryQuery).all();
    const rows = galleriesRaw?.results || [];

    const results = rows.map(r => {
      const fullPath = String(r.gallery_id || '');
      const parts = fullPath.split('/').filter(Boolean);
      const displayName = parts.slice(-2).join(' › ').replace(/-/g, ' ');

      let gallery_type = 'other';
      if (fullPath.includes('/Painterly-Fine-Art-Photography/')) {
        gallery_type = 'painterly';
      } else if (fullPath.includes('/Fine-Art-Photography/')) {
        gallery_type = 'traditional';
      } else if (fullPath.includes('/Engrained/') || fullPath.includes('/Archive/')) {
        gallery_type = 'select';
      }

      return {
        gallery_id: displayName || fullPath || 'Unknown',
        gallery_type,
        sessions: r.sessions || 0,
        zoom_pct: r.zoom_pct || 0,
        avg_events: r.avg_events || 0
      };
    });

    return { results };
  } catch (e) {
    console.log('Gallery performance query failed:', e.message);
    return { results: [] };
  }
}

export async function getReferrers(env, filters) {
  return { results: [] };
}

export async function getGeography(env, filters) {
  try {
    const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;

    // Qualify column references for the join (same pattern as other queries)
    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bgallery_id\b/g, 'e.gallery_id')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region');

    const where = dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")';

    // Use distinct in-range visitors and their canonical human_population geo.
    // This avoids expensive per-visitor window scans while keeping totals aligned.
    const geoQuery = `
      WITH in_range_visitors AS (
        SELECT DISTINCT e.visitor_id
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          AND e.source = 'js'
          AND COALESCE(e.is_bot, 0) = 0
          AND e.visitor_id IS NOT NULL
          AND e.visitor_id != ''
          ${qualify(galleryClause)}
          ${qualify(ipClause)}
          ${qualify(botClause)}
          ${qualify(chardonClause)}
      ),
      visitor_home AS (
        SELECT
          irv.visitor_id,
          hp.country,
          hp.region,
          hp.city
        FROM in_range_visitors irv
        JOIN human_population hp ON hp.visitor_id = irv.visitor_id
        WHERE hp.country IS NOT NULL
      ),
      art_visitors AS (
        SELECT DISTINCT e.visitor_id
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          AND e.source = 'js'
          AND COALESCE(e.is_bot, 0) = 0
          AND e.visitor_id IS NOT NULL
          AND e.visitor_id != ''
          AND e.event_type IN ('chapter_view', 'xl_zoom', 'gallery_view')
          ${qualify(galleryClause)}
          ${qualify(ipClause)}
          ${qualify(botClause)}
          ${qualify(chardonClause)}
      )
      SELECT
        vh.country,
        vh.region,
        vh.city,
        COUNT(*) AS visitors,
        SUM(CASE WHEN av.visitor_id IS NOT NULL THEN 1 ELSE 0 END) AS art_viewers
      FROM visitor_home vh
      LEFT JOIN art_visitors av ON av.visitor_id = vh.visitor_id
      GROUP BY vh.country, vh.region, vh.city
      ORDER BY visitors DESC, vh.country, vh.region, vh.city
      LIMIT 20
    `;
    return await env.DB.prepare(geoQuery).all();
  } catch (e) {
    console.log('Geography query failed:', e.message);
    return { results: [] };
  }
}

// Period-level unique visitor totals (NOT summed daily counts)
export async function getPeriodTotals(env, filters) {
  try {
    const { dateClause, botClause, chardonClause } = filters;
    
    // Qualify column references for the join
    const qualifyBot = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region');
    
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
      WHERE ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
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
    console.log('Period totals query failed:', e.message);
    return { total_visitors: 0, total_art_viewers: 0 };
  }
}

export async function getDailyTrend(env, filters) {
  try {
    const { rangeDateClause, galleryClause, ipClause, botClause, chardonClause } = filters;

    // The dashboard builds filter snippets assuming a single table with columns
    // like ts, ip, city, device, gallery_id. This query uses an aliased join,
    // so we qualify those column references to the classified_events side.
    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bgallery_id\b/g, 'e.gallery_id')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bdevice\b/g, 'e.device')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region');

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

    // Daily trend (for chart): human visitors + sessions per Eastern calendar day.
    // Visitor = any JS-verified human who visited the site (any event type).
    // Sessions are client session ids; NULL sessions are naturally excluded by COUNT(DISTINCT).
    // Art viewers = visitors who viewed actual art (chapter_view, xl_zoom, gallery_view).
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
    console.log('Daily trend query failed:', e.message);
    return { results: [] };
  }
}

export async function getSessionMetrics(env, filters) {
  try {
    const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;

    // dateClause is built in dashboard/route.js and may include columns like ip/city/referer.
    // Qualify those to the classified_events alias so JOIN queries don't become ambiguous.
    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bgallery_id\b/g, 'e.gallery_id')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region')
      .replace(/\breferer\b/g, 'e.referer')
      .replace(/\bua\b/g, 'e.ua')
      .replace(/\bis_bot\b/g, 'COALESCE(e.is_bot, 0)');

    const where = [
      qualify(dateClause) || 'e.ts > datetime("now", "-1 day")',
      qualify(galleryClause),
      qualify(ipClause),
      qualify(botClause),
      qualify(chardonClause),
    ].filter(Boolean).join('\n        ');

    // Session key fallback: if session_id is missing, bucket by visitor+Eastern day.
    // This prevents Pulse metrics from collapsing to 0 when some beacons omit session_id.
    const sessionKey = `COALESCE(NULLIF(e.session_id, ''), e.visitor_id || ':' || date(e.ts, '-5 hours'))`;

    // Devices must aggregate at the human/session layer (human_population),
    // then be scoped to the time range via JOIN on classified_events.
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

    // Bounce rate: session_id is client-provided (sessionStorage). Some intent beacons omit session_id.
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
    const bounceRate = bounceResult?.total_sessions > 0
      ? Math.round(100 * (bounceResult.bounce_sessions || 0) / bounceResult.total_sessions)
      : 0;

    // Avg session duration: time between first and last event per session.
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
    const avgDurationFormatted = avgDurationSecs >= 60
      ? `${Math.floor(avgDurationSecs / 60)}m ${Math.round(avgDurationSecs % 60)}s`
      : `${Math.round(avgDurationSecs)}s`;

    // Peak hours: compute busiest AM + PM hours (Eastern offset to match dashboard date filters).
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
    const pickTop = (rows) => rows.sort((a, b) => (b.sessions || 0) - (a.sessions || 0))[0] || null;
    const topAm = pickTop(hourRows.filter(r => (r.hour ?? 0) < 12));
    const topPm = pickTop(hourRows.filter(r => (r.hour ?? 0) >= 12));
    const formatHour = (hour24) => {
      const h = Number(hour24) || 0;
      const hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
      const ampm = h >= 12 ? 'pm' : 'am';
      return `${hour12}${ampm}`;
    };
    const peakHours = [
      ...(topAm ? [{ period: 'AM', hour: formatHour(topAm.hour), sessions: topAm.sessions }] : []),
      ...(topPm ? [{ period: 'PM', hour: formatHour(topPm.hour), sessions: topPm.sessions }] : [])
    ];

    // Device engagement: average depth score per human, grouped by device_type.
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
    console.log('Session metrics query failed:', e.message);
    return {
      devices: { results: [] },
      bounceRate: 0,
      avgDurationSecs: 0,
      avgDurationFormatted: '0s',
      peakHours: [],
      deviceEngagement: []
    };
  }
}

export async function getTopPages(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;

    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region')
      .replace(/\breferer\b/g, 'e.referer');

    const safeBotClause = (botClause || '')
      .replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, ' ')
      .replace(/\bdevice\s*=\s*'unknown'\b/gi, '1=1');

    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';

    const pagesQuery = `
      WITH filtered_events AS (
        SELECT
          COALESCE(
            NULLIF(e.session_id, ''),
            NULLIF(e.session_id_v2, ''),
            NULLIF(e.visitor_id, ''),
            'anon:' || COALESCE(NULLIF(e.ip_hash, ''), NULLIF(e.ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:', e.ts) || printf('%02d', (CAST(strftime('%M', e.ts) AS INTEGER) / 30) * 30)
          ) AS session_key,
          CASE
            WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
            ELSE '/' || COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
          END AS page_path,
          e.ts,
          CASE
            WHEN e.event_type IN ('page_pixel', 'edge_page') THEN 'P'
            ELSE 'J'
          END AS source_kind
        FROM classified_events e
        WHERE ${where}
          ${qualify(ipClause)}
          ${qualify(safeBotClause)}
          ${qualify(chardonClause)}
          AND ${notCacheWarmer('e')}
          AND COALESCE(e.is_bot, 0) = 0
          AND (
            e.event_type IN ('page_pixel', 'edge_page')
            OR (e.event_type = 'page_view' AND e.source = 'js')
          )
          AND COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')) IS NOT NULL
          AND LOWER(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))) NOT LIKE 'http%'
          AND LOWER(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))) NOT LIKE '/http%'
          AND LOWER(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))) NOT LIKE '%://%'
          AND NOT (
            COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')) LIKE '/i-%'
            AND COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')) NOT LIKE '/i-%/%'
          )
      ),
      not_found_hits AS (
        SELECT DISTINCT
          COALESCE(
            NULLIF(e.session_id, ''),
            NULLIF(e.session_id_v2, ''),
            NULLIF(e.visitor_id, ''),
            'anon:' || COALESCE(NULLIF(e.ip_hash, ''), NULLIF(e.ip, ''), 'unknown') || '|' || strftime('%Y-%m-%dT%H:', e.ts) || printf('%02d', (CAST(strftime('%M', e.ts) AS INTEGER) / 30) * 30)
          ) AS session_key,
          CASE
            WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
            ELSE '/' || COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
          END AS page_path
        FROM classified_events e
        WHERE ${where}
          ${qualify(ipClause)}
          ${qualify(safeBotClause)}
          ${qualify(chardonClause)}
          AND ${notCacheWarmer('e')}
          AND COALESCE(e.is_bot, 0) = 0
          AND e.event_type IN ('404', '410', 'smart404_redirect', 'smart404_gone', 'smart404_fallback', 'smart404_homepage')
          AND COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')) IS NOT NULL
      )
      SELECT
        fe.page_path,
        COUNT(*) AS views,
        COUNT(*) AS events,
        COUNT(DISTINCT fe.session_key) AS sessions,
        COUNT(DISTINCT CASE WHEN fe.source_kind = 'P' THEN fe.session_key END) AS pixel_sessions,
        COUNT(DISTINCT CASE WHEN fe.source_kind = 'J' THEN fe.session_key END) AS js_sessions
      FROM filtered_events fe
      WHERE NOT EXISTS (
        SELECT 1
        FROM not_found_hits nf
        WHERE nf.session_key = fe.session_key
          AND nf.page_path = fe.page_path
      )
      GROUP BY fe.page_path
      ORDER BY views DESC, sessions DESC, fe.page_path ASC
      LIMIT 25
    `;

    return await env.DB.prepare(pagesQuery).all();
  } catch (e) {
    console.log('Top pages query failed:', e.message, e.stack);
    return { results: [] };
  }
}

export async function getTopImages(env, filters) {
  return { images: { results: [] }, uniqueImagesViewed: 0, totalImageSessions: 0, totalImageViews: 0 };
}

export async function getEntryAnalysis(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;

    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region')
      .replace(/\breferer\b/g, 'e.referer');

    const safeBotClause = (botClause || '')
      .replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, ' ')
      .replace(/\bdevice\s*=\s*'unknown'\b/gi, '1=1');

    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';

    const entryPagesQuery = `
      WITH js_page_events AS (
        SELECT
          e.visitor_id AS visitor_key,
          CASE
            WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
            ELSE '/' || COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
          END AS page_path,
          e.referer AS referrer,
          e.ua AS ua,
          e.ts
        FROM human_population hp
        JOIN classified_events e ON e.visitor_id = hp.visitor_id
        WHERE ${where}
          ${qualify(ipClause)}
          ${qualify(safeBotClause)}
          ${qualify(chardonClause)}
          AND ${notCacheWarmer('e')}
          AND COALESCE(e.is_bot, 0) = 0
          AND e.source = 'js'
          AND e.event_type = 'page_view'
          AND e.visitor_id IS NOT NULL
          AND e.visitor_id != ''
          AND COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')) IS NOT NULL
          AND LOWER(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))) NOT LIKE 'http%'
          AND LOWER(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))) NOT LIKE '/http%'
          AND LOWER(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))) NOT LIKE '%://%'
      ),
      first_hits AS (
        SELECT
          visitor_key,
          page_path,
          referrer,
          ua,
          ROW_NUMBER() OVER (PARTITION BY visitor_key ORDER BY ts ASC) AS rn
        FROM js_page_events
      ),
      not_found_hits AS (
        SELECT DISTINCT
          e.visitor_id AS visitor_key,
          CASE
            WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
            ELSE '/' || COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, ''))
          END AS page_path
        FROM classified_events e
        WHERE ${where}
          ${qualify(ipClause)}
          ${qualify(safeBotClause)}
          ${qualify(chardonClause)}
          AND ${notCacheWarmer('e')}
          AND COALESCE(e.is_bot, 0) = 0
          AND e.source = 'js'
          AND e.visitor_id IS NOT NULL
          AND e.visitor_id != ''
          AND e.event_type IN ('404', '410', 'smart404_redirect', 'smart404_gone', 'smart404_fallback', 'smart404_homepage')
          AND COALESCE(NULLIF(e.page, ''), NULLIF(e.target_id, '')) IS NOT NULL
      )
      SELECT
        page_path,
        'J' AS source_kind,
        CASE
          WHEN (referrer IS NULL OR referrer = '' OR referrer = 'unknown' OR referrer = 'direct')
            AND LOWER(COALESCE(ua, '')) LIKE '%pinterest%'
            THEN 'pinterest'
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
        COUNT(*) AS sessions
      FROM first_hits
      WHERE rn = 1
        AND NOT EXISTS (
          SELECT 1
          FROM not_found_hits nf
          WHERE nf.visitor_key = first_hits.visitor_key
            AND nf.page_path = first_hits.page_path
        )
      GROUP BY page_path, ref_source
      ORDER BY sessions DESC, page_path ASC
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
          AND ${notCacheWarmer('e')}
          AND COALESCE(e.is_bot,0) = 0
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
            AND ${notCacheWarmer('e')}
            AND COALESCE(e.is_bot,0) = 0
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
      console.log('Entry diagnostics query failed:', e.message);
    }

    return {
      entryPages,
      imagePageViewsFromEvents,
      imageEntrySessionsFromEvents,
      entryRefCounts: { results: [] }
    };
  } catch (e) {
    console.log('Entry analysis query failed:', e.message);
    return {
      entryPages: { results: [] },
      imagePageViewsFromEvents: 0,
      imageEntrySessionsFromEvents: 0,
      entryRefCounts: { results: [] }
    };
  }
}

export async function getEngagementDepth(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;

    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region')
      .replace(/\breferer\b/g, 'e.referer');

    const safeBotClause = (botClause || '')
      .replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, ' ')
      .replace(/\bdevice\s*=\s*'unknown'\b/gi, '1=1');

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

    // Top 10 themes clicked (theme label stored in target_id)
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
      console.log('Themes clicked query failed:', e.message);
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
    console.log('Engagement depth query failed:', e.message);
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

export async function getExitAnalysis(env, filters) {
  try {
    const { dateClause, ipClause, botClause, chardonClause } = filters;

    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region')
      .replace(/\breferer\b/g, 'e.referer');

    const safeBotClause = (botClause || '')
      .replace(/\s+OR\s+device\s*=\s*'unknown'\s*/gi, ' ')
      .replace(/\bdevice\s*=\s*'unknown'\b/gi, '1=1');

    const where = qualify(dateClause) || 'e.ts > datetime("now", "-1 day")';

    // Find the last page_view per session (human JS sessions only)
    const exitPagesQuery = `
      WITH last_pages AS (
        SELECT
          e.session_id,
          CASE
            WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), e.target_id)
            ELSE '/' || COALESCE(NULLIF(e.page, ''), e.target_id)
          END AS page_path,
          ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.ts DESC) AS rn
        FROM classified_events e
        WHERE ${where}
          ${qualify(ipClause)}
          ${qualify(safeBotClause)}
          ${qualify(chardonClause)}
          AND e.source = 'pixel'
          AND e.event_type = 'page_pixel'
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

    const isLandingPage = (path) => {
      // A simple, stable heuristic: single-segment pages (e.g. /Western-Wall-Art/)
      // are treated as landing/marketing pages.
      if (!path || typeof path !== 'string') return false;
      if (path === '/' || path === '') return false;
      if (path.startsWith('/Galleries/') || path.startsWith('/Other/')) return false;
      if (path.startsWith('/Blog/') || path.startsWith('/blog/')) return false;
      if (path.startsWith('/Photoshootsandevents/') || path.startsWith('/Photography-Galleries/') || path.startsWith('/Scheduled-Shoots/')) return false;
      return /^\/[^\/]+\/?$/.test(path);
    };

    for (const r of rows) {
      const path = String(r.page_path || '');
      const sessions = Number(r.sessions || 0);
      if (!sessions) continue;

      if (path === '/' || path === '') {
        exitByCategory.home += sessions;
      } else if (path.includes('/i-')) {
        exitByCategory.images += sessions;
      } else if (path.startsWith('/Galleries/') || path.startsWith('/Other/')) {
        exitByCategory.gallery += sessions;
      } else if (path.startsWith('/Blog/') || path.startsWith('/blog/')) {
        exitByCategory.blog += sessions;
      } else if (path.startsWith('/Photoshootsandevents/') || path.startsWith('/Photography-Galleries/') || path.startsWith('/Scheduled-Shoots/')) {
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
    console.log('Exit analysis query failed:', e.message);
    return { exitPages: { results: [] }, exitSummary: {}, exitByCategory: {} };
  }
}

export async function getEdgeEvents(env, filters) {
  try {
    const { dateClause, yesterday, days, hideBots, ipClause, botClause, chardonClause } = filters || {};
    const d = Math.max(1, Math.min(parseInt(days || '1', 10) || 1, 31));
    const qualify = (clause) => (clause || '')
      .replace(/\bts\b/g, 'e.ts')
      .replace(/\bip\b/g, 'e.ip')
      .replace(/\bcity\b/g, 'e.city')
      .replace(/\bcountry\b/g, 'e.country')
      .replace(/\bregion\b/g, 'e.region');
    const notBotWhenHide = hideBots ? `AND COALESCE(e.is_bot, 0) = 0` : '';
    const notProbeNoiseWhenHide = hideBots
      ? `AND NOT (
          e.target_id LIKE '/Galleries/%/i-%'
          AND INSTR(e.target_id, '/i-') > 0
          AND EXISTS (
            SELECT 1
            FROM probe_noise_families pnf
            WHERE pnf.path_prefix = SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1)
          )
        )`
      : '';

    const dateWhere = dateClause
      ? `${String(dateClause).replace(/\bts\b/g, 'e.ts')}`
      : (yesterday
        ? `date(e.ts, '-5 hours') = date('now', '-5 hours', '-1 day')`
        : `e.ts > datetime('now', '-${d} day')`);

    const eventsQuery = `
      WITH probe_noise_families AS (
        SELECT
          SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1) as path_prefix
        FROM classified_events e
        WHERE ${dateWhere}
          AND e.source = 'edge'
          AND e.event_type = '404'
          AND e.target_id LIKE '/Galleries/%/i-%'
          AND INSTR(e.target_id, '/i-') > 0
        GROUP BY path_prefix
        HAVING COUNT(DISTINCT e.ip_hash) >= 10
      )
      SELECT
        e.event_type,
        e.target_id as path,
        COUNT(*) as hits,
        SUM(CASE WHEN COALESCE(e.is_bot, 0) = 1 THEN 1 ELSE 0 END) as bot_hits,
        SUM(CASE WHEN COALESCE(e.is_bot, 0) = 0 THEN 1 ELSE 0 END) as human_hits,
        CASE
          WHEN e.target_id LIKE '/Galleries/%/i-%'
            AND INSTR(e.target_id, '/i-') > 0
            AND EXISTS (
              SELECT 1
              FROM probe_noise_families pnf
              WHERE pnf.path_prefix = SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1)
            ) THEN 1
          ELSE 0
        END as is_probe_noise,
        CASE
          WHEN e.event_type IN ('301', 'smart404_redirect')
            AND SUM(CASE WHEN COALESCE(e.is_bot, 0) = 0 THEN 1 ELSE 0 END) > 0
            AND SUM(CASE WHEN COALESCE(e.is_bot, 0) = 1 THEN 1 ELSE 0 END) = 0
            AND NOT (
              e.target_id LIKE '/Galleries/%/i-%'
              AND INSTR(e.target_id, '/i-') > 0
              AND EXISTS (
                SELECT 1
                FROM probe_noise_families pnf
                WHERE pnf.path_prefix = SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1)
              )
            ) THEN 1
          ELSE 0
        END as likely_human_301,
        CASE
          WHEN (
            e.target_id LIKE '/Galleries/%/i-%'
            AND INSTR(e.target_id, '/i-') > 0
            AND EXISTS (
              SELECT 1
              FROM probe_noise_families pnf
              WHERE pnf.path_prefix = SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1)
            )
          ) THEN 'probe'
          WHEN SUM(CASE WHEN COALESCE(e.is_bot, 0) = 1 THEN 1 ELSE 0 END) > 0
            AND SUM(CASE WHEN COALESCE(e.is_bot, 0) = 0 THEN 1 ELSE 0 END) > 0 THEN 'mixed'
          WHEN SUM(CASE WHEN COALESCE(e.is_bot, 0) = 1 THEN 1 ELSE 0 END) > 0 THEN 'bot'
          ELSE 'human'
        END as bot_state
      FROM classified_events e
      WHERE ${dateWhere}
        AND e.source = 'edge'
        ${qualify(ipClause)}
        ${qualify(botClause)}
        ${qualify(chardonClause)}
        ${notBotWhenHide}
        ${notProbeNoiseWhenHide}
        AND e.event_type IN ('301','302','404','410','smart404_redirect','smart404_gone','smart404_fallback','smart404_homepage')
      GROUP BY e.event_type, e.target_id
      ORDER BY hits DESC
      LIMIT 60
    `;
    const edgeEvents = await env.DB.prepare(eventsQuery).all();

    const summaryQuery = `
      WITH probe_noise_families AS (
        SELECT
          SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1) as path_prefix
        FROM classified_events e
        WHERE ${dateWhere}
          AND e.source = 'edge'
          AND e.event_type = '404'
          AND e.target_id LIKE '/Galleries/%/i-%'
          AND INSTR(e.target_id, '/i-') > 0
        GROUP BY path_prefix
        HAVING COUNT(DISTINCT e.ip_hash) >= 10
      )
      SELECT
        e.event_type,
        COUNT(*) as total,
        SUM(CASE WHEN e.is_bot = 1 THEN 1 ELSE 0 END) as bot_hits,
        SUM(CASE WHEN e.is_bot = 1 THEN 0 ELSE 1 END) as human_hits
      FROM classified_events e
      WHERE ${dateWhere}
        AND e.source = 'edge'
        ${qualify(ipClause)}
        ${qualify(botClause)}
        ${qualify(chardonClause)}
        ${notBotWhenHide}
        ${notProbeNoiseWhenHide}
        AND e.event_type IN ('301','302','404','410','smart404_redirect','smart404_gone','smart404_fallback','smart404_homepage')
      GROUP BY e.event_type
      ORDER BY total DESC
    `;
    const edgeSummaryResult = await env.DB.prepare(summaryQuery).all();
    const edgeSummary = edgeSummaryResult?.results || [];

    let edgeSuppression = { hidden_total: 0, hidden_bot: 0, hidden_probe_noise: 0 };
    if (hideBots) {
      const suppressionQuery = `
        WITH probe_noise_families AS (
          SELECT
            SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1) as path_prefix
          FROM classified_events e
          WHERE ${dateWhere}
            AND e.source = 'edge'
            AND e.event_type = '404'
            AND e.target_id LIKE '/Galleries/%/i-%'
            AND INSTR(e.target_id, '/i-') > 0
          GROUP BY path_prefix
          HAVING COUNT(DISTINCT e.ip_hash) >= 10
        )
        SELECT
          COUNT(*) as hidden_total,
          SUM(CASE WHEN COALESCE(e.is_bot, 0) = 1 THEN 1 ELSE 0 END) as hidden_bot,
          SUM(CASE
            WHEN (
              e.target_id LIKE '/Galleries/%/i-%'
              AND INSTR(e.target_id, '/i-') > 0
              AND EXISTS (
                SELECT 1
                FROM probe_noise_families pnf
                WHERE pnf.path_prefix = SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1)
              )
            ) THEN 1 ELSE 0 END
          ) as hidden_probe_noise
        FROM classified_events e
        WHERE ${dateWhere}
          AND e.source = 'edge'
          ${qualify(ipClause)}
          ${qualify(botClause)}
          ${qualify(chardonClause)}
          AND e.event_type IN ('301','302','404','410','smart404_redirect','smart404_gone','smart404_fallback','smart404_homepage')
          AND (
            COALESCE(e.is_bot, 0) = 1
            OR (
              e.target_id LIKE '/Galleries/%/i-%'
              AND INSTR(e.target_id, '/i-') > 0
              AND EXISTS (
                SELECT 1
                FROM probe_noise_families pnf
                WHERE pnf.path_prefix = SUBSTR(e.target_id, 1, INSTR(e.target_id, '/i-') - 1)
              )
            )
          )
      `;
      edgeSuppression = (await env.DB.prepare(suppressionQuery).first()) || edgeSuppression;
    }

    return { edgeEvents, edgeSummary, edgeSuppression };
  } catch (e) {
    console.log('Edge events query failed:', e.message);
    return { edgeEvents: { results: [] }, edgeSummary: [], edgeSuppression: { hidden_total: 0, hidden_bot: 0, hidden_probe_noise: 0 } };
  }
}

export async function getBotIntelligence(env) {
  const botIntelligence = {
    suspects: [],
    blocked: [],
    verified: [],
    stats: { total: 0, risk3: 0, risk4: 0, verified: 0, verified_bots: 0 },
  };

  try {
    const SUSPECTS_LIMIT = 500;
    const VERIFIED_LIMIT = 20;

    // Primary suspects list (excludes verified bots; blocked are still included in the table)
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
        AND status NOT IN ('blocked', 'verified')
      ORDER BY risk_level DESC, risk_score DESC, total_requests DESC
      LIMIT ${SUSPECTS_LIMIT}
    `;

    const suspectsResult = await env.DB.prepare(suspectsQuery).all();
    botIntelligence.suspects = suspectsResult?.results || [];

    // Fallback if table is empty/corrupt (keeps UI usable)
    if (
      !Array.isArray(botIntelligence.suspects) ||
      botIntelligence.suspects.length === 0 ||
      botIntelligence.suspects.some((s) => !s?.ip_hash)
    ) {
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
        rules_triggered: JSON.stringify(r.is_flagged_bot ? ['auto_flagged_bot'] : []),
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
        status: 'watching',
      }));
    }

    // Totals for pills (not limited by the top-N table)
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
      console.log('Bot intelligence totals query failed:', e.message);
    }

    // Enrich suspects with friction/velocity metrics for the dashboard recommendation.
    try {
      const frictionStatsQuery = `
        WITH suspects AS (
          SELECT ip_hash
          FROM suspected_bots
          WHERE risk_level >= 2
            AND is_verified_bot = 0
            AND status NOT IN ('blocked', 'verified')
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
              COUNT(DISTINCT image_id) AS unique_images_per_minute
            FROM raw_events
            WHERE image_id IS NOT NULL
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
        )

        SELECT
          s.ip_hash,
          COALESCE(f24.friction_429_24h, 0) AS friction_429_24h,
          COALESCE(f24.friction_delay_24h, 0) AS friction_delay_24h,
          COALESCE(fm.friction_429_max_day_7d, 0) AS friction_429_max_day_7d,
          COALESCE(v.peak_unique_images_per_minute_24h, 0) AS peak_unique_images_per_minute_24h,
          COALESCE(dip.max_friction_delay_10m_24h, 0) AS max_friction_delay_10m_24h,
          COALESCE(dasn.max_friction_delay_10m_asn_24h, 0) AS max_friction_delay_10m_asn_24h
        FROM suspects s
        LEFT JOIN friction_24h f24 ON f24.ip_hash = s.ip_hash
        LEFT JOIN friction_429_max fm ON fm.ip_hash = s.ip_hash
        LEFT JOIN velocity v ON v.ip_hash = s.ip_hash
        LEFT JOIN delay_burst_ip dip ON dip.ip_hash = s.ip_hash
        LEFT JOIN ip_asn ia ON ia.ip_hash = s.ip_hash
        LEFT JOIN delay_burst_asn dasn ON dasn.cf_asn = ia.cf_asn_last24h
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
      }
    } catch (e) {
      console.log('Friction stats enrichment failed:', e.message);
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
      console.log('Verified bots total query failed:', e.message);
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
    console.log('Bot intelligence query failed:', e.message);
  }

  return botIntelligence;
}

export async function getBlockRecommendedCount(env) {
  try {
    const query = `
      WITH suspects AS (
        SELECT ip_hash, total_requests, days_seen, bot_name
        FROM suspected_bots
        WHERE is_verified_bot = 0
          AND risk_level >= 4
          AND status NOT IN ('blocked', 'verified')
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%bing%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%msnbot%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%adidxbot%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%google%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%applebot%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%duckduckbot%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%yandex%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%baidu%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%ahrefs%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%semrush%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%barkrowler%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%mj12%'
          AND LOWER(COALESCE(bot_name, '')) NOT LIKE '%dotbot%'
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
        SELECT ip_hash, MAX(count_429) AS friction_429_max_day_7d
        FROM friction_429_by_day
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
            COUNT(DISTINCT image_id) AS unique_images_per_minute
          FROM raw_events
          WHERE image_id IS NOT NULL
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
        SELECT ip_hash, MAX(cf_asn) AS cf_asn_last24h
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
      enriched AS (
        SELECT
          s.ip_hash,
          s.total_requests,
          s.days_seen,
          COALESCE(fm.friction_429_max_day_7d, 0) AS friction_429_max_day_7d,
          COALESCE(v.peak_unique_images_per_minute_24h, 0) AS peak_unique_images_per_minute_24h,
          COALESCE(dip.max_friction_delay_10m_24h, 0) AS max_friction_delay_10m_24h,
          COALESCE(dasn.max_friction_delay_10m_asn_24h, 0) AS max_friction_delay_10m_asn_24h
        FROM suspects s
        LEFT JOIN friction_429_max fm ON fm.ip_hash = s.ip_hash
        LEFT JOIN velocity v ON v.ip_hash = s.ip_hash
        LEFT JOIN delay_burst_ip dip ON dip.ip_hash = s.ip_hash
        LEFT JOIN ip_asn ia ON ia.ip_hash = s.ip_hash
        LEFT JOIN delay_burst_asn dasn ON dasn.cf_asn = ia.cf_asn_last24h
      )
      SELECT COUNT(*) AS block_recommended
      FROM enriched
      WHERE friction_429_max_day_7d >= 10
         OR peak_unique_images_per_minute_24h >= 20
         OR max_friction_delay_10m_24h >= 40
         OR max_friction_delay_10m_asn_24h >= 40
         OR (total_requests >= 200 AND days_seen >= 3)
    `;
    const row = await env.DB.prepare(query).first();
    return row?.block_recommended || 0;
  } catch (e) {
    console.log('Block recommended count query failed:', e.message);
    return 0;
  }
}
