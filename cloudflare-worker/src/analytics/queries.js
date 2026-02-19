// Analytics Read Layer
// Phase 3 — Dashboard Queries Only
//
// All analytics DB reads flow through this module.
// No formatting. No transforms. Raw DB responses only.
// Worker must never query DB directly — all reads go through queries.js.

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

  // Query 12: Cowboy Jump count (separate from galleries)
  const cowboyQuery = `
    SELECT COUNT(DISTINCT session_id) as jumps
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

  return { themesClicked, cowboyJumps, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, botSessions, botPct };
}
