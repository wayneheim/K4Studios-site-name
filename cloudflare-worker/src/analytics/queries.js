// Analytics V2 Read Layer — Dashboard Queries
//
// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE: SINGLE POPULATION DOCTRINE (Cookie-Based)
// ═══════════════════════════════════════════════════════════════════════════
// 
// 1. human_population VIEW = the ONLY definition of "human" (by visitor_id / k4_vid cookie)
// 2. classified_events VIEW = raw_events + is_bot flag (computed, not stored)
// 3. ALL queries: FROM human_population hp JOIN classified_events e ON e.visitor_id = hp.visitor_id
// 4. If humans = 0, ALL metrics = 0. Guaranteed by JOIN.
//
// Rule: Humans cause events. Events never define humans.
// 1 cookie (k4_vid) = 1 human. IP addresses are irrelevant.
// ═══════════════════════════════════════════════════════════════════════════

// ── 3-Axis Classification ──────────────────────────────────────────────
// Axis 1: population_type  — WHO caused the event
//   Determined by event source, NOT by referer.
//   human            → JS-verified (has k4_vid cookie, event from collector.js)
//   external_non_js  → proxy-logged external_image_page (no JS ever executed)
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
  let host;
  try { host = new URL(referer).hostname.toLowerCase(); } catch(e) {
    const r = referer.toLowerCase();
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

// ═══════════════════════════════════════════════════════════════════════════
// CORE METRICS — The only queries that matter
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get human count - THE canonical count
 */
export async function getHumanCount(env, dateClause = '') {
  const query = dateClause 
    ? `SELECT COUNT(DISTINCT visitor_id) as count FROM classified_events WHERE is_bot = 0 AND visitor_id IS NOT NULL AND ${dateClause}`
    : `SELECT COUNT(*) as count FROM human_population`;
  const result = await env.DB.prepare(query).first();
  return result?.count || 0;
}

/**
 * Get all dashboard stats - V2 simplified
 */
export async function getArtViews(env, filters) {
  const { dateClause } = filters;
  
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
    // Summary by event type - FROM human_population → JOIN classified_events
    const summaryQuery = `
      SELECT 
        e.event_type,
        COUNT(*) as views,
        COUNT(DISTINCT e.target_id) as unique_targets,
        COUNT(DISTINCT e.visitor_id) as unique_viewers
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.event_type
    `;
    const summaryResult = await env.DB.prepare(summaryQuery).all();
    
    for (const row of (summaryResult.results || [])) {
      if (row.event_type === 'chapter' || row.event_type === 'chapter_view') {
        artViewsSummary.chapter_views = row.views;
      }
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
    
    artViewsSummary.total = artViewsSummary.chapter_views + artViewsSummary.external_images;
  } catch (e) {
    console.log('Summary query failed:', e.message);
  }
  
  // Top chapters - FROM human_population → JOIN classified_events
  let topChapters = [];
  try {
    const topChaptersQuery = `
      SELECT 
        e.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT e.visitor_id) as unique_viewers,
        GROUP_CONCAT(DISTINCT e.country) as countries,
        (
          SELECT e2.country
          FROM classified_events e2
          JOIN human_population hp2 ON e2.visitor_id = hp2.visitor_id
          WHERE e2.target_id = e.target_id
            AND e2.event_type IN ('chapter', 'chapter_view')
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
            AND e2.event_type IN ('chapter', 'chapter_view')
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
            AND e2.event_type IN ('chapter', 'chapter_view')
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type IN ('chapter', 'chapter_view')
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(topChaptersQuery).all();
    topChapters = (result.results || []).map(r => ({
      type: 'chapter_view',
      target_id: r.target_id,
      views: r.views,
      unique_viewers: r.unique_viewers,
      countries: r.countries,
      geo: { country: r.geo_country, region: r.geo_region, city: r.geo_city }
    }));
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
      LIMIT 20
    `;
    const result = await env.DB.prepare(topZoomsQuery).all();
    topZooms = (result.results || []).map(r => ({
      type: 'xl_zoom',
      target_id: r.target_id,
      views: r.views,
      unique_viewers: r.unique_viewers,
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
        COUNT(DISTINCT e.visitor_id) as unique_viewers
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type IN ('gallery', 'gallery_view')
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 15
    `;
    const result = await env.DB.prepare(topGalleriesQuery).all();
    topGalleries = (result.results || []).map(r => ({
      type: 'gallery_view',
      target_id: r.target_id,
      views: r.views,
      unique_viewers: r.unique_viewers
    }));
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
              WHEN e.event_type IN ('chapter', 'chapter_view') THEN 2
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
    const botCountQuery = `
      SELECT COUNT(*) as bot_events, COUNT(DISTINCT visitor_id) as bot_visitors
      FROM classified_events 
      WHERE is_bot = 1 AND ts > datetime('now', '-1 day')
    `;
    const botResult = await env.DB.prepare(botCountQuery).first();
    suppressionStats.suppressedToday = botResult?.bot_events || 0;
    suppressionStats.activeSuppressedIPs = botResult?.bot_visitors || 0;
  } catch (e) {
    console.log('Bot count query failed:', e.message);
  }
  
  // Top external image page accesses (no JS = not human engagement)
  let externalImageAccess = [];
  try {
    const externalQuery = `
      SELECT 
        e.target_id,
        COUNT(*) as hits,
        e.referer,
        e.country,
        (
          SELECT e2.country
          FROM classified_events e2
          WHERE e2.target_id = e.target_id
            AND e2.event_type = 'external_image_page'
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
            AND e2.event_type = 'external_image_page'
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
            AND e2.event_type = 'external_image_page'
            AND ${dateClause.replace(/\bts\b/g, 'e2.ts') || 'e2.ts > datetime("now", "-1 day")'}
            AND e2.country IS NOT NULL
          GROUP BY e2.country, e2.region, e2.city
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as geo_city
      FROM classified_events e
      WHERE e.event_type = 'external_image_page'
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id, e.referer
      ORDER BY hits DESC
      LIMIT 30
    `;
    const result = await env.DB.prepare(externalQuery).all();
    const accessPriority = { external_referral: 0, direct: 1, internal_navigation: 2, unknown: 3 };
    externalImageAccess = (result.results || []).map(r => {
      const accessType = getAccessType(r.referer);
      const referrerSource = accessType === 'external_referral'
        ? (getReferrerSource(r.referer) || 'Other')
        : accessType === 'direct' ? 'Direct'
        : accessType === 'internal_navigation' ? 'Internal'
        : 'Unknown';
      let refererHost = null;
      if (r.referer) {
        try { refererHost = new URL(r.referer).hostname; } catch(e) {}
      }
      return {
        target_id: r.target_id,
        hits: r.hits,
        access_type: accessType,
        referrer_source: referrerSource,
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
      WHERE e.event_type = 'external_image_page'
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
        COUNT(*) as hits
      FROM classified_events e
      WHERE e.event_type = 'external_image_page'
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
    const srcQuery = `
      SELECT 
        e.referer,
        COUNT(*) as hits
      FROM classified_events e
      WHERE e.event_type = 'external_image_page'
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
      ORDER BY hits DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(srcQuery).all();
    // Classify each row and aggregate by referrer_source (ALL access types)
    const sourceMap = {};
    for (const r of (result.results || [])) {
      const accessType = getAccessType(r.referer);
      const source = accessType === 'external_referral'
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
        COUNT(DISTINCT e.visitor_id) as unique_viewers,
        e.referer
      FROM classified_events e
      WHERE e.event_type = 'external_image_page'
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.target_id
      ORDER BY views DESC
      LIMIT 20
    `;
    const result = await env.DB.prepare(extImgQuery).all();
    topExternal = (result.results || []).map(r => {
      const at = getAccessType(r.referer);
      const src = at === 'external_referral' ? classifyForEntryRef(r.referer) : (at === 'direct' ? 'direct' : 'unattributed');
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
    const dispQuery = `
      SELECT 
        e.referer,
        COUNT(*) as views
      FROM classified_events e
      WHERE e.event_type = 'external_image_page'
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
      ORDER BY views DESC
      LIMIT 30
    `;
    const result = await env.DB.prepare(dispQuery).all();
    const sourceMap = {};
    for (const r of (result.results || [])) {
      if (!r.referer) {
        noRefExternalViews += r.views;
        continue;
      }
      const at = getAccessType(r.referer);
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

  // ── V1-compat: entryRefCounts (all external_image_page by entry source key) ──
  let entryRefCountsObj = {};
  try {
    const entryQuery = `
      SELECT 
        e.referer,
        COUNT(*) as cnt
      FROM classified_events e
      WHERE e.event_type = 'external_image_page'
        AND ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
      GROUP BY e.referer
    `;
    const result = await env.DB.prepare(entryQuery).all();
    for (const r of (result.results || [])) {
      const key = classifyForEntryRef(r.referer);
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
        COUNT(DISTINCT e.visitor_id) as unique_viewers
      FROM classified_events e
      WHERE e.event_type = 'external_image_page'
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
      imageMap[id] = { image_id: id, badges: [], chapter_views: 0, xl_zooms: 0, unverified_views: 0, external_views: 0, countries: new Set(), sources: [], geo: null, geo_priority: 99 };
    }
    return imageMap[id];
  }
  for (const c of topChapters) {
    const img = ensureImage(c.target_id);
    if (!img.badges.includes('C')) img.badges.push('C');
    img.chapter_views = c.views;
    setGeoIfBetter(img, c.geo, 0); // verified
    if (c.countries) c.countries.split(',').forEach(co => co && img.countries.add(co.trim()));
  }
  for (const z of topZooms) {
    const img = ensureImage(z.target_id);
    img.xl_zooms = z.views;
    setGeoIfBetter(img, z.geo, 0); // verified
  }
  for (const ext of externalImageAccess) {
    const img = ensureImage(ext.target_id);
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
    if (ext.referrer_source && ext.referrer_source !== 'Direct' && ext.referrer_source !== 'Internal' && ext.referrer_source !== 'Unknown') {
      img.sources.push(ext.referrer_source);
    } else if (ext.access_type === 'direct') {
      if (!img.sources.includes('Direct')) img.sources.push('Direct');
    } else if (ext.access_type === 'internal_navigation') {
      if (!img.sources.includes('Internal')) img.sources.push('Internal');
    }
  }
  const imageAccessOverview = Object.values(imageMap).map(img => ({
    image_id: img.image_id,
    badges: img.badges,
    chapter_views: img.chapter_views,
    xl_zooms: img.xl_zooms,
    unverified_views: img.unverified_views,
    external_views: img.external_views,
    geo: img.geo,
    countries: Array.from(img.countries).filter(Boolean),
    sources: [...new Set(img.sources)],
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
  
  // Get event count for humans
  let totalEvents = 0;
  try {
    const eventsQuery = `
      SELECT COUNT(*) as count
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
    `;
    const result = await env.DB.prepare(eventsQuery).first();
    totalEvents = result?.count || 0;
  } catch (e) {
    console.log('Events count failed:', e.message);
  }
  
  return {
    summary: {
      unique_visitors: humanCount,
      sessions: humanCount, // In V2, sessions ≈ unique visitors for now
      total_events: totalEvents,
      avg_events_per_session: humanCount > 0 ? Math.round(totalEvents / humanCount * 10) / 10 : 0,
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
  return { events: { results: [] }, entries: { results: [] } };
}

export async function getGalleryPerformance(env, filters) {
  return { results: [] };
}

export async function getReferrers(env, filters) {
  return { results: [] };
}

export async function getGeography(env, filters) {
  try {
    const { dateClause } = filters;
    const geoQuery = `
      SELECT 
        e.country, e.region, e.city,
        COUNT(DISTINCT e.visitor_id) as visitors
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE ${dateClause.replace(/\bts\b/g, 'e.ts') || 'e.ts > datetime("now", "-1 day")'}
        AND e.country IS NOT NULL
      GROUP BY e.country, e.region, e.city
      ORDER BY visitors DESC
      LIMIT 20
    `;
    return await env.DB.prepare(geoQuery).all();
  } catch (e) {
    console.log('Geography query failed:', e.message);
    return { results: [] };
  }
}

export async function getDailyTrend(env, filters) {
  return { results: [] };
}

export async function getSessionMetrics(env, filters) {
  return {
    devices: { results: [] },
    bounceRate: 0,
    avgDurationSecs: 0,
    avgDurationFormatted: '0s',
    peakHours: [],
    deviceEngagement: []
  };
}

export async function getTopPages(env, filters) {
  return { results: [] };
}

export async function getTopImages(env, filters) {
  return { images: { results: [] }, uniqueImagesViewed: 0, totalImageSessions: 0, totalImageViews: 0 };
}

export async function getEntryAnalysis(env, filters) {
  return {
    entryPages: { results: [] },
    imagePageViewsFromEvents: 0,
    imageEntrySessionsFromEvents: 0,
    entryRefCounts: { results: [] }
  };
}

export async function getEngagementDepth(env, filters) {
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

export async function getExitAnalysis(env, filters) {
  return {
    exitPages: { results: [] },
    exitSummary: {},
    exitByCategory: []
  };
}

export async function getEdgeEvents(env, filters) {
  return { edgeEvents: { results: [] }, edgeSummary: [] };
}

export async function getBotIntelligence(env) {
  // V2: Bot info comes from classified_events VIEW
  let botIntelligence = {
    suspects: [],
    blocked: [],
    verified: [],
    stats: { total: 0, risk3: 0, risk4: 0, blocked: 0, verified: 0 }
  };
  
  try {
    const botQuery = `
      SELECT 
        visitor_id,
        COUNT(*) as total_requests,
        MAX(country) as country,
        MAX(ts) as last_seen
      FROM classified_events
      WHERE is_bot = 1 AND ts > datetime('now', '-7 days')
      GROUP BY visitor_id
      ORDER BY total_requests DESC
      LIMIT 50
    `;
    const result = await env.DB.prepare(botQuery).all();
    botIntelligence.suspects = (result.results || []).map(r => ({
      visitor_id: r.visitor_id,
      total_requests: r.total_requests,
      country: r.country,
      last_seen: r.last_seen,
      risk_level: 2,
      status: 'watching'
    }));
    botIntelligence.stats.total = botIntelligence.suspects.length;
  } catch (e) {
    console.log('Bot intelligence query failed:', e.message);
  }
  
  return botIntelligence;
}

// Export updateBotIntelligence as no-op for compatibility
export async function updateBotIntelligence(env) {
  return 0;
}
