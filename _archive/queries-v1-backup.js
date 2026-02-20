// Analytics Read Layer
// Phase 3 — Dashboard Queries Only
//
// All analytics DB reads flow through this module.
// No formatting. No transforms. Raw DB responses only.
// Worker must never query DB directly — all reads go through queries.js.
//
// ═══════════════════════════════════════════════════════════════════════════
// SINGLE POPULATION DOCTRINE
// ═══════════════════════════════════════════════════════════════════════════
// Every metric on the dashboard MUST derive from the SAME filtered human population.
// The `human_population` VIEW is the ONLY definition of "human".
// All queries MUST JOIN to human_population. No exceptions.
// Rule: Humans cause events. Events never define humans.
// ═══════════════════════════════════════════════════════════════════════════

import { updateBotIntelligence } from './storage.js';

// ═══════════════════════════════════════════════════════════════════════════
// GUARD: Enforce human_population JOIN in all analytics queries
// ═══════════════════════════════════════════════════════════════════════════
function requireHumanJoin(query, context = 'unknown') {
  if (!query.includes('human_population')) {
    throw new Error(`Analytics query missing human filter [${context}]`);
  }
  return query;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD SUMMARY — Query 1 + 1b
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get dashboard summary stats for a given date/filter window.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause - SQL WHERE clause for date range
 * @param {string} filters.galleryClause - SQL AND clause for gallery filter (or "")
 * @param {string} filters.ipClause - SQL AND clause for IP exclusion (or "")
 * @param {string} filters.botClause - SQL AND clause for bot exclusion (or "")
 * @param {string} filters.chardonClause - SQL AND clause for Chardon exclusion (or "")
 * @param {string} filters.priorPeriodClause - SQL WHERE clause for prior-period returning visitor check
 * @returns {object} { summary, returningVisitors, newVisitors }
 */
export async function getDashboardStats(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause, priorPeriodClause } = filters;

  // ═══════════════════════════════════════════════════════════════════════════
  // HUMAN VISITOR COUNT — Direct from human_population (source of truth)
  // ═══════════════════════════════════════════════════════════════════════════
  const humanCountQuery = requireHumanJoin(`
    SELECT COUNT(*) as unique_visitors FROM human_population
  `, 'getDashboardStats.humanCount');
  const humanCountResult = await env.DB.prepare(humanCountQuery).first();
  const uniqueVisitors = humanCountResult?.unique_visitors || 0;

  // If NO humans, return zeros - don't query events at all
  if (uniqueVisitors === 0) {
    return {
      summary: { sessions: 0, unique_visitors: 0, total_events: 0, avg_events_per_session: 0, pct_navigated: 0, collector_notes_opens: 0 },
      returningVisitors: 0,
      newVisitors: 0
    };
  }

  // Query 1: Session/event stats — FROM human_population → JOIN events
  const summaryQuery = requireHumanJoin(`
    SELECT 
      COUNT(DISTINCT e.session_id) as sessions,
      ${uniqueVisitors} as unique_visitors,
      COUNT(*) as total_events,
      ROUND(1.0 * COUNT(*) / NULLIF(COUNT(DISTINCT e.session_id), 0), 1) as avg_events_per_session,
      ROUND(100.0 * COUNT(DISTINCT CASE WHEN e.event IN ('nav_next', 'nav_prev') THEN e.session_id END) / 
        NULLIF(COUNT(DISTINCT e.session_id), 0), 1) as pct_navigated,
      COUNT(CASE WHEN e.event = 'collector_notes_open' THEN 1 END) as collector_notes_opens
    FROM human_population hp
    JOIN events e ON e.ip_hash = hp.ip_hash
    WHERE ${dateClause.replace(/created_at/g, 'e.created_at')} ${galleryClause.replace(/page_path/g, 'e.page_path')}
  `, 'getDashboardStats.summary');
  const summary = await env.DB.prepare(summaryQuery).first();

  // Query 1b: New vs returning visitors — FROM human_population → JOIN events
  const returningQuery = requireHumanJoin(`
    SELECT COUNT(DISTINCT hp.ip_hash) as returning_visitors
    FROM human_population hp
    JOIN events e ON e.ip_hash = hp.ip_hash
    WHERE ${dateClause.replace(/created_at/g, 'e.created_at')}
      AND hp.ip_hash IN (
        SELECT DISTINCT hp2.ip_hash 
        FROM human_population hp2
        JOIN events e2 ON e2.ip_hash = hp2.ip_hash
        WHERE ${priorPeriodClause.replace(/created_at/g, 'e2.created_at')}
      )
  `, 'getDashboardStats.returning');
  const returningResult = await env.DB.prepare(returningQuery).first();
  const returningVisitors = returningResult?.returning_visitors || 0;
  const newVisitors = uniqueVisitors - returningVisitors;

  return { summary, returningVisitors, newVisitors };
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT BREAKDOWN — Query 2 + Query 3
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get event type counts and entry effectiveness stats.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause
 * @param {string} filters.galleryClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} { events, entries }
 */
export async function getEventBreakdown(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;

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

  return { events, entries };
}

// ═══════════════════════════════════════════════════════════════════════════
// GALLERY PERFORMANCE — Query 4
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get gallery performance stats with display-name post-processing.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} { results: Array<{ gallery_id, gallery_type, sessions, zoom_pct, avg_events }> }
 */
export async function getGalleryPerformance(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;

  // Query 4: Gallery performance - derive gallery from page_path for image pages
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

  return galleries;
}

// ═══════════════════════════════════════════════════════════════════════════
// REFERRERS — Query 5
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get referrer breakdown by session count.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause
 * @param {string} filters.galleryClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} D1 result with .results array
 */
export async function getReferrers(env, filters) {
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

// ═══════════════════════════════════════════════════════════════════════════
// GEOGRAPHY — Query 6
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get unique visitors by geographic location.
 * Always excludes datacenter cities regardless of hideBots toggle.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause
 * @param {string} filters.galleryClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} D1 result with .results array of { country, region, city, visitors }
 */
export async function getGeography(env, filters) {
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

// ═══════════════════════════════════════════════════════════════════════════
// DAILY TREND — Query 7
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get daily trend data for chart (visitors, sessions, events per day).
 * Uses rangeDateClause for full-range coverage.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.rangeDateClause - SQL WHERE clause for date range (range-based, not single-day)
 * @param {string} filters.galleryClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} D1 result with .results array of { day, visitors, sessions, events }
 */
export async function getDailyTrend(env, filters) {
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

// ═══════════════════════════════════════════════════════════════════════════
// SESSION METRICS — Query 8, 8b, 8c, 8d, 8e
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get device breakdown, bounce rate, session duration, peak hours,
 * and device engagement metrics.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause
 * @param {string} filters.galleryClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} { devices, bounceRate, avgDurationSecs, avgDurationFormatted, peakHours, deviceEngagement }
 */
export async function getSessionMetrics(env, filters) {
  const { dateClause, galleryClause, ipClause, botClause, chardonClause } = filters;

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

  // Query 8d: Peak Hours (highest AM hour + highest PM hour, EST-adjusted)
  const peakHoursQuery = `
    WITH hourly AS (
      SELECT
        CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) AS hour,
        COUNT(DISTINCT session_id) AS sessions
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
      GROUP BY hour
    ),
    am_peak AS (
      SELECT hour, sessions FROM hourly WHERE hour < 12 ORDER BY sessions DESC LIMIT 1
    ),
    pm_peak AS (
      SELECT hour, sessions FROM hourly WHERE hour >= 12 ORDER BY sessions DESC LIMIT 1
    )
    SELECT
      (SELECT hour FROM am_peak) AS am_hour,
      (SELECT sessions FROM am_peak) AS am_sessions,
      (SELECT hour FROM pm_peak) AS pm_hour,
      (SELECT sessions FROM pm_peak) AS pm_sessions
  `;
  const peakHoursResult = await env.DB.prepare(peakHoursQuery).first();
  
  // Format hour to 12h with a/p suffix
  function formatHour(h) {
    if (h === null || h === undefined) return null;
    const hour = Number(h);
    const suffix = hour >= 12 ? 'p' : 'a';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}${suffix}`;
  }
  
  const peakHours = [];
  if (peakHoursResult?.am_hour !== null && peakHoursResult?.am_hour !== undefined) {
    peakHours.push({ hour: formatHour(peakHoursResult.am_hour), sessions: peakHoursResult.am_sessions || 0, period: 'AM' });
  }
  if (peakHoursResult?.pm_hour !== null && peakHoursResult?.pm_hour !== undefined) {
    peakHours.push({ hour: formatHour(peakHoursResult.pm_hour), sessions: peakHoursResult.pm_sessions || 0, period: 'PM' });
  }

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

  return { devices, bounceRate, avgDurationSecs, avgDurationFormatted, peakHours, deviceEngagement };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP PAGES — Query 9
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get top non-image pages by session count.
 * Excludes image pages (/i-) and legacy SmugMug paths.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} D1 result with .results array of { page_path, sessions, events }
 */
export async function getTopPages(env, filters) {
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

// ═══════════════════════════════════════════════════════════════════════════
// TOP IMAGES — Query 10 + 10b
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get most popular images and aggregate image page stats.
 *
 * @param {object} env - Worker environment (must have env.DB)
 * @param {object} filters - Query filter clauses
 * @param {string} filters.dateClause
 * @param {string} filters.ipClause
 * @param {string} filters.botClause
 * @param {string} filters.chardonClause
 * @returns {object} { images, uniqueImagesViewed, totalImageSessions, totalImageViews }
 */
export async function getTopImages(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;

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

  return { images, uniqueImagesViewed, totalImageSessions, totalImageViews };
}

/**
 * Group A: Entry Analysis
 * Q12b: Top entry pages with referrer classification
 * Q12c: Image page views diagnostic
 * Q12d: Image entry sessions diagnostic
 * EntryRefSummary: Referrer summary (visitors by source)
 */
export async function getEntryAnalysis(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;

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

  return { entryPages, imagePageViewsFromEvents, imageEntrySessionsFromEvents, entryRefCounts };
}

/**
 * Group B: Engagement Depth
 * Q11: Top themes clicked
 * Q12: Cowboy jump count
 * Q13: Session depth scores (weighted, with bot detection)
 * Q13b: Average depth score
 * Q14: Deep session %
 * Q14b: Bot traffic estimate
 */
export async function getEngagementDepth(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;

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

  // Query 12: Cowboy Jump count (raw clicks, not distinct sessions)
  const cowboyQuery = `
    SELECT COUNT(*) as jumps
    FROM events 
    WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause} AND event = 'cowboy_jump'
  `;
  const cowboyResult = await env.DB.prepare(cowboyQuery).first();
  const cowboyJumps = cowboyResult?.jumps || 0;

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
  
  // Query 13a: True min/max engagement across ALL sessions (not sampled)
  const engagementRangeQuery = `
    WITH session_depth AS (
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
        ) AS depth_score
      FROM events
      WHERE ${dateClause} ${ipClause} ${botClause} ${chardonClause}
      GROUP BY session_id
    )
    SELECT
      MIN(depth_score) AS min_depth,
      MAX(depth_score) AS max_depth
    FROM session_depth
  `;
  const engagementRange = await env.DB.prepare(engagementRangeQuery).first();
  const minEngagement = engagementRange?.min_depth ?? 0;
  const maxEngagement = engagementRange?.max_depth ?? 0;

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

  return { themesClicked, cowboyJumps, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, botSessions, botPct };
}

/**
 * Group C: Exit Analysis
 * Q15: Exit pages (where do people leave?)
 * Q15b: Exit summary by page category
 */
export async function getExitAnalysis(env, filters) {
  const { dateClause, ipClause, botClause, chardonClause } = filters;

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

  return { exitPages, exitSummary, exitByCategory };
}

/**
 * Group D: Edge Events
 * Q16: Edge events (301/410/404 from edge_events table)
 * Q16b: Edge events summary by type
 */
export async function getEdgeEvents(env, filters) {
  const { yesterday, days } = filters;

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

  return { edgeEvents, edgeSummary };
}

/**
 * Group E: Art Views (Layer B + Events overrides)
 * All queries JOIN from human_population (canonical human definition).
 * Pattern: FROM human_population hp JOIN <table> ON <table>.ip_hash = hp.ip_hash
 */
export async function getArtViews(env, filters) {
  const { dateClause } = filters;
  const artDateClause = dateClause;

  let artViewsSummary = { xl_zooms: 0, slideshow_starts: 0, external_images: 0, image_pages: 0, chapter_views: 0, galleries: 0, total: 0, unique_viewers: 0, onsite_viewers: 0 };
  let artViewsByType = [];
  let topArtViews = [];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE POPULATION DOCTRINE: human_population VIEW is the ONLY source of truth
  // If humans = 0, ALL downstream engagement = 0. Enforced via early exit.
  // ═══════════════════════════════════════════════════════════════════════════
  
  try {
    // First: Get human count from canonical human_population VIEW
    const humanCountQuery = requireHumanJoin(`
      SELECT COUNT(*) as human_count FROM human_population
    `, 'getArtViews.humanCount');
    const humanCountResult = await env.DB.prepare(humanCountQuery).first();
    const humanCount = humanCountResult?.human_count || 0;
    artViewsSummary.unique_viewers = humanCount;
    artViewsSummary.onsite_viewers = humanCount;
    
    // If NO humans, everything is 0 - early exit
    if (humanCount === 0) {
      return { 
        artViewsSummary: { ...artViewsSummary, total: 0 }, 
        artViewsByType: [], 
        topArtViews: { chapters: [], xlZooms: [], external: [], galleries: [] }, 
        viewerDepth: { avgScore: 0, highDepthCount: 0, totalViewers: 0, distribution: [] },
        suppressionStats: { suppressedToday: 0, activeSuppressedIPs: 0 }
      };
    }
    
    // Summary by type - FROM human_population → JOIN art_views
    const artViewsSummaryQuery = requireHumanJoin(`
      SELECT 
        av.type,
        COUNT(*) as views,
        COUNT(DISTINCT av.target_id) as unique_targets,
        COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')}
      GROUP BY av.type
    `, 'getArtViews.summaryByType');
    const artViewsSummaryResult = await env.DB.prepare(artViewsSummaryQuery).all();
    artViewsByType = artViewsSummaryResult.results || [];
    
    // Calculate totals from owned events only
    for (const row of artViewsByType) {
      if (row.type === 'xl_zoom') artViewsSummary.xl_zooms = row.views;
      if (row.type === 'slideshow_start') artViewsSummary.slideshow_starts = row.views;
      if (row.type === 'image') artViewsSummary.xl_zooms += row.views;
      if (row.type === 'image_page') artViewsSummary.image_pages = row.views;
      if (row.type === 'chapter_view') artViewsSummary.chapter_views = row.views;
      if (row.type === 'gallery_view') artViewsSummary.galleries = row.views;
    }
    
    // Clean external count - FROM human_population → JOIN art_views
    const cleanExternalQuery = requireHumanJoin(`
      SELECT COUNT(*) as views
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} AND av.type = 'external_image'
        AND av.referrer IS NOT NULL AND av.referrer != ''
        AND av.referrer NOT LIKE '%k4studios%' AND av.referrer NOT LIKE '%localhost%'
    `, 'getArtViews.cleanExternal');
    const cleanExternalResult = await env.DB.prepare(cleanExternalQuery).first();
    artViewsSummary.external_images = cleanExternalResult?.views || 0;
    
    artViewsSummary.total = (artViewsSummary.chapter_views || 0) + artViewsSummary.external_images;
    
    // Top chapters - FROM human_population → JOIN art_views
    const topChaptersQuery = requireHumanJoin(`
      SELECT 
        'chapter_view' as type,
        av.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} AND av.type = 'chapter_view'
      GROUP BY av.target_id
      ORDER BY views DESC
    `, 'getArtViews.topChapters');
    
    // Top zooms - FROM human_population → JOIN art_views
    const topXLZoomsQuery = requireHumanJoin(`
      SELECT 
        'xl_zoom' as type,
        av.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} AND (av.type = 'xl_zoom' OR av.type = 'image')
      GROUP BY av.target_id
      ORDER BY views DESC
    `, 'getArtViews.topXLZooms');
    
    // Top external - FROM human_population → JOIN art_views
    const topExternalQuery = requireHumanJoin(`
      SELECT 
        'external_image' as type,
        av.target_id,
        CASE 
          WHEN av.referrer LIKE '%google.%' THEN 'google'
          WHEN av.referrer LIKE '%bing.%' THEN 'bing'
          WHEN av.referrer LIKE '%pinterest.%' THEN 'pinterest'
          WHEN av.referrer LIKE '%facebook.%' OR av.referrer LIKE '%fb.%' THEN 'facebook'
          WHEN av.referrer LIKE '%twitter.%' OR av.referrer LIKE '%t.co/%' OR av.referrer LIKE '%x.com%' THEN 'twitter'
          WHEN av.referrer LIKE '%chatgpt.com%' OR av.referrer LIKE '%chat.openai.com%' THEN 'chatgpt'
          WHEN av.referrer LIKE '%duckduckgo.%' THEN 'duckduckgo'
          ELSE 'unattributed'
        END as top_source,
        COUNT(*) as views,
        COUNT(*) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} AND av.type = 'external_image'
        AND av.referrer IS NOT NULL AND av.referrer != ''
        AND av.referrer NOT LIKE '%k4studios%' AND av.referrer NOT LIKE '%localhost%'
      GROUP BY av.target_id, top_source
      ORDER BY views DESC
      LIMIT 15
    `, 'getArtViews.topExternal');
    
    // Top galleries - FROM human_population → JOIN art_views
    const topGalleriesQuery = requireHumanJoin(`
      SELECT 
        'gallery_view' as type,
        av.target_id,
        COUNT(*) as views,
        COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} AND av.type = 'gallery_view'
      GROUP BY av.target_id
      ORDER BY views DESC
      LIMIT 15
    `, 'getArtViews.topGalleries');
    
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
    
    // Art View External Displays - FROM human_population → JOIN art_views
    const artExternalDisplayQuery = requireHumanJoin(`
      SELECT 
        CASE 
          WHEN av.referrer LIKE '%images.google.%' OR av.referrer LIKE '%google.%/imgres%' THEN 'Google Images'
          WHEN av.referrer LIKE '%google.%' THEN 'Google Search'
          WHEN av.referrer LIKE '%bing.%/images%' THEN 'Bing Images'
          WHEN av.referrer LIKE '%bing.%' THEN 'Bing Search'
          WHEN av.referrer LIKE '%pinterest.%' THEN 'Pinterest'
          WHEN av.referrer LIKE '%facebook.%' OR av.referrer LIKE '%fb.%' THEN 'Facebook'
          WHEN av.referrer LIKE '%twitter.%' OR av.referrer LIKE '%t.co/%' OR av.referrer LIKE '%x.com%' THEN 'Twitter/X'
          WHEN av.referrer LIKE '%chatgpt.com%' OR av.referrer LIKE '%chat.openai.com%' THEN 'ChatGPT'
          WHEN av.referrer LIKE '%instagram.%' THEN 'Instagram'
          WHEN av.referrer LIKE '%linkedin.%' THEN 'LinkedIn'
          WHEN av.referrer LIKE '%duckduckgo.%' THEN 'DuckDuckGo'
          WHEN av.referrer LIKE '%yandex.%' THEN 'Yandex'
          WHEN av.referrer LIKE '%baidu.%' THEN 'Baidu'
          ELSE av.referrer
        END as source,
        COUNT(*) as views,
        COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} AND av.type = 'external_image'
        AND av.referrer IS NOT NULL AND av.referrer != ''
        AND av.referrer NOT LIKE '%k4studios%' AND av.referrer NOT LIKE '%localhost%'
      GROUP BY source
      ORDER BY views DESC
    `, 'getArtViews.externalDisplays');
    const artExternalDisplayResult = await env.DB.prepare(artExternalDisplayQuery).all();
    artViewsSummary.externalDisplays = artExternalDisplayResult.results || [];
    
    // Count external with no referrer - FROM human_population → JOIN art_views
    const noRefExternalQuery = requireHumanJoin(`
      SELECT COUNT(*) as views, COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} AND av.type = 'external_image'
        AND (av.referrer IS NULL OR av.referrer = '')
    `, 'getArtViews.noRefExternal');
    const noRefResult = await env.DB.prepare(noRefExternalQuery).first();
    artViewsSummary.noRefExternalViews = noRefResult?.views || 0;
    artViewsSummary.noRefExternalViewers = noRefResult?.unique_viewers || 0;
    
    const artDcCityFilter = `AND av.city NOT IN ('Ashburn', 'Moses Lake', 'Leesburg', 'Dublin', 'Prineville', 'Forest City', 'Clonee', 'Council Bluffs', 'The Dalles', 'Boardman')`;
    
    // On-site Geography - FROM human_population → JOIN art_views
    const onsiteGeoQuery = requireHumanJoin(`
      SELECT 
        av.country, av.region, av.city,
        COUNT(*) as views,
        COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')} ${artDcCityFilter}
        AND av.type IN ('chapter_view', 'gallery_view')
      GROUP BY av.country, av.region, av.city
      ORDER BY unique_viewers DESC, views DESC
      LIMIT 20
    `, 'getArtViews.onsiteGeo');
    const onsiteGeoResult = await env.DB.prepare(onsiteGeoQuery).all();
    artViewsSummary.geography = onsiteGeoResult.results || [];

    // External Geography - FROM human_population → JOIN art_views
    const externalGeoQuery = requireHumanJoin(`
      SELECT 
        av.country, av.region, av.city,
        COUNT(*) as views,
        COUNT(DISTINCT av.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN art_views av ON av.ip_hash = hp.ip_hash
      WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')}
        AND av.type = 'external_image'
        AND av.referrer NOT LIKE '%k4studios%' AND av.referrer NOT LIKE '%localhost%'
      GROUP BY av.country, av.region, av.city
      ORDER BY unique_viewers DESC, views DESC
      LIMIT 15
    `, 'getArtViews.externalGeo');
    const externalGeoResult = await env.DB.prepare(externalGeoQuery).all();
    artViewsSummary.externalGeography = externalGeoResult.results || [];
  } catch (e) {
    console.log('art_views query failed (table may not exist):', e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ON-SITE EVENTS (JS-verified) — FROM human_population → JOIN events
  // chapter_view and zoom_open events from browser JS
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const beaconChapterViews = artViewsSummary?.chapter_views || 0;
    const beaconXLZooms = artViewsSummary?.xl_zooms || 0;

    // Chapter views from events - FROM human_population → JOIN events
    const chapterViewsEventsQuery = requireHumanJoin(`
      SELECT COUNT(*) as views
      FROM human_population hp
      JOIN events e ON e.ip_hash = hp.ip_hash
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')}
        AND e.event = 'chapter_view'
        AND (e.page_path LIKE '/Galleries/%' OR e.page_path LIKE '/Other/%')
    `, 'getArtViews.chapterViewsEvents');
    const chapterViewsEventsResult = await env.DB.prepare(chapterViewsEventsQuery).first();
    const chapterViewsEvents = chapterViewsEventsResult?.views || 0;

    // Top chapters from events - FROM human_population → JOIN events
    const topChaptersEventsQuery = requireHumanJoin(`
      SELECT 
        e.image_id,
        MIN(e.page_path) as page_url,
        COUNT(*) as views,
        COUNT(DISTINCT e.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN events e ON e.ip_hash = hp.ip_hash
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')}
        AND e.event = 'chapter_view'
        AND e.image_id IS NOT NULL
        AND (e.page_path LIKE '/Galleries/%' OR e.page_path LIKE '/Other/%')
      GROUP BY e.image_id
      ORDER BY views DESC
    `, 'getArtViews.topChaptersEvents');
    const topChaptersEventsResult = await env.DB.prepare(topChaptersEventsQuery).all();
    const topChaptersEvents = (topChaptersEventsResult.results || []).map((r) => ({
      type: 'chapter_view',
      target_id: r.image_id,
      page_url: r.page_url || null,
      views: r.views || 0,
      unique_viewers: r.unique_viewers || 0
    }));

    // XL zooms from events - FROM human_population → JOIN events
    const xlZoomsEventsQuery = requireHumanJoin(`
      SELECT COUNT(*) as views
      FROM human_population hp
      JOIN events e ON e.ip_hash = hp.ip_hash
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')}
        AND e.event = 'zoom_open'
        AND (e.page_path LIKE '/Galleries/%' OR e.page_path LIKE '/Other/%')
    `, 'getArtViews.xlZoomsEvents');
    const xlZoomsEventsResult = await env.DB.prepare(xlZoomsEventsQuery).first();
    const xlZoomsEvents = xlZoomsEventsResult?.views || 0;

    // Top XL zooms from events - FROM human_population → JOIN events
    const topXLZoomsEventsQuery = requireHumanJoin(`
      SELECT 
        e.image_id,
        MIN(e.page_path) as page_url,
        COUNT(*) as views,
        COUNT(DISTINCT e.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN events e ON e.ip_hash = hp.ip_hash
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')}
        AND e.event = 'zoom_open'
        AND e.image_id IS NOT NULL
        AND (e.page_path LIKE '/Galleries/%' OR e.page_path LIKE '/Other/%')
      GROUP BY e.image_id
      ORDER BY views DESC
    `, 'getArtViews.topXLZoomsEvents');
    const topXLZoomsEventsResult = await env.DB.prepare(topXLZoomsEventsQuery).all();
    const topXLZoomsEvents = (topXLZoomsEventsResult.results || []).map((r) => ({
      type: 'xl_zoom',
      target_id: r.image_id,
      page_url: r.page_url || null,
      views: r.views || 0,
      unique_viewers: r.unique_viewers || 0
    }));

    // Normalize shape
    if (!topArtViews || Array.isArray(topArtViews)) {
      topArtViews = { chapters: [], xlZooms: [], external: [], galleries: [] };
    }

    // Store beacon values for debugging, use JS-verified events for on-site numbers
    artViewsSummary.chapter_views_beacon = beaconChapterViews;
    artViewsSummary.xl_zooms_beacon = beaconXLZooms;
    artViewsSummary.chapter_views = chapterViewsEvents;
    artViewsSummary.xl_zooms = xlZoomsEvents;

    if (topChaptersEvents.length > 0) topArtViews.chapters = topChaptersEvents;
    if (topXLZoomsEvents.length > 0) topArtViews.xlZooms = topXLZoomsEvents;

    // Gallery counts from events - FROM human_population → JOIN events
    const galleryCountQuery = requireHumanJoin(`
      SELECT COUNT(DISTINCT e.gallery_id) as gallery_count
      FROM human_population hp
      JOIN events e ON e.ip_hash = hp.ip_hash
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')}
        AND e.event = 'chapter_view'
        AND e.gallery_id IS NOT NULL
    `, 'getArtViews.galleryCount');
    const galleryCountResult = await env.DB.prepare(galleryCountQuery).first();
    artViewsSummary.galleries = galleryCountResult?.gallery_count || 0;

    // Top galleries from events - FROM human_population → JOIN events
    const topGalleriesEventsQuery = requireHumanJoin(`
      SELECT 
        e.gallery_id,
        MIN(e.page_path) as sample_path,
        COUNT(DISTINCT e.image_id) as images_viewed,
        COUNT(*) as views,
        COUNT(DISTINCT e.ip_hash) as unique_viewers
      FROM human_population hp
      JOIN events e ON e.ip_hash = hp.ip_hash
      WHERE ${dateClause.replace(/created_at/g, 'e.created_at')}
        AND e.event = 'chapter_view'
        AND e.gallery_id IS NOT NULL
      GROUP BY e.gallery_id
      ORDER BY views DESC
    `, 'getArtViews.topGalleriesEvents');
    const topGalleriesEventsResult = await env.DB.prepare(topGalleriesEventsQuery).all();
    const topGalleriesEvents = (topGalleriesEventsResult.results || []).map((r) => {
      const galleryUrl = r.sample_path ? r.sample_path.replace(/\/i-[a-zA-Z0-9_-]+\/?$/, '') : null;
      return {
        type: 'gallery_view',
        target_id: r.gallery_id,
        gallery_url: galleryUrl,
        views: r.views || 0,
        unique_viewers: r.unique_viewers || 0,
        images_viewed: r.images_viewed || 0
      };
    });
    if (topGalleriesEvents.length > 0) topArtViews.galleries = topGalleriesEvents;

    // Recompute total (chapter views + clean external embeds)
    artViewsSummary.total = (artViewsSummary.chapter_views || 0) + (artViewsSummary.external_images || 0);
  } catch (e) {
    console.log('on-site art view events query failed:', e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWER DEPTH SCORE (VDS) — FROM human_population → JOIN art_views
  // ═══════════════════════════════════════════════════════════════════════════
  let viewerDepth = { avgScore: 0, highDepthCount: 0, totalViewers: 0, distribution: [] };
  try {
    const depthQuery = requireHumanJoin(`
      WITH viewer_scores AS (
        SELECT 
          av.ip_hash,
          SUM(
            CASE
              WHEN av.type = 'gallery_view' THEN 1
              WHEN av.type = 'chapter_view' THEN 2
              WHEN av.type = 'xl_zoom' THEN 5
              ELSE 0
            END
          ) AS depth_score,
          COUNT(*) as total_events,
          COUNT(DISTINCT av.target_id) as unique_targets
        FROM human_population hp
        JOIN art_views av ON av.ip_hash = hp.ip_hash
        WHERE ${artDateClause.replace(/created_at/g, 'av.created_at')}
        GROUP BY av.ip_hash
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
    `, 'getArtViews.viewerDepth');
    const depthResult = await env.DB.prepare(depthQuery).first();
    if (depthResult) {
      viewerDepth.totalViewers = depthResult.total_viewers || 0;
      viewerDepth.avgScore = depthResult.avg_score || 0;
      viewerDepth.highDepthCount = depthResult.high_depth_count || 0;
      viewerDepth.maxScore = depthResult.max_score || 0;
      viewerDepth.distribution = [
        { label: 'Collectors (20+)', count: depthResult.high_depth_count || 0 },
        { label: 'Engaged (10-19)', count: depthResult.engaged_count || 0 },
        { label: 'Curious (3-9)', count: depthResult.curious_count || 0 },
        { label: 'Casual (<3)', count: depthResult.casual_count || 0 }
      ];
    }
  } catch (e) {
    console.log('viewer depth query failed:', e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPRESSION STATS — Visibility into filtered noise (no human JOIN needed)
  // ═══════════════════════════════════════════════════════════════════════════
  let suppressionStats = { suppressedToday: 0, activeSuppressedIPs: 0 };
  try {
    const suppressedEventsQuery = `
      SELECT COUNT(*) as suppressed_today
      FROM art_views
      WHERE created_at >= date('now')
        AND ip_hash IN (SELECT ip_hash FROM suppressed_ips WHERE expires_at IS NULL OR expires_at > datetime('now'))
    `;
    const suppressedEventsResult = await env.DB.prepare(suppressedEventsQuery).first();
    suppressionStats.suppressedToday = suppressedEventsResult?.suppressed_today || 0;

    const activeSuppressedQuery = `
      SELECT COUNT(*) as active_count FROM suppressed_ips
      WHERE expires_at IS NULL OR expires_at > datetime('now')
    `;
    const activeSuppressedResult = await env.DB.prepare(activeSuppressedQuery).first();
    suppressionStats.activeSuppressedIPs = activeSuppressedResult?.active_count || 0;
  } catch (e) {
    console.log('suppression stats query failed:', e.message);
  }

  return { artViewsSummary, artViewsByType, topArtViews, viewerDepth, suppressionStats };
}

/**
 * Group F: Bot Intelligence
 * Q18.1: Suspected bots (risk 2+)
 * Q18.2: Verified bots (with art_views JOINs)
 * Q18.3: Blocked IPs
 * Also calls updateBotIntelligence to refresh risk scores before querying.
 */
export async function getBotIntelligence(env) {
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
    
    // Calculate stats (exclude blocked from watching/high-risk/candidates counts)
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

  return botIntelligence;
}
