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
 * Everything derives from human_population → classified_events JOIN
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
      if (row.event_type === 'zoom' || row.event_type === 'xl_zoom' || row.event_type === 'zoom_open') {
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
        COUNT(DISTINCT e.visitor_id) as unique_viewers
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
      unique_viewers: r.unique_viewers
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
        COUNT(DISTINCT e.visitor_id) as unique_viewers
      FROM human_population hp
      JOIN classified_events e ON e.visitor_id = hp.visitor_id
      WHERE e.event_type IN ('zoom', 'xl_zoom', 'zoom_open')
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
      unique_viewers: r.unique_viewers
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
              WHEN e.event_type IN ('zoom', 'xl_zoom', 'zoom_open') THEN 5
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
  
  return {
    artViewsSummary,
    artViewsByType: [],
    topArtViews: {
      chapters: topChapters,
      xlZooms: topZooms,
      external: [],
      galleries: topGalleries
    },
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
