// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD SCHEMA (Phase 4 — assembles dashboardData from raw query results)
// Pure data shape builder: normalizes query outputs into the exact structure
// that renderDashboard() expects. NO SQL, NO env, NO HTML, NO fetch/D1.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assembles the exact data shape that renderDashboard() expects
 * from raw query results + request-level filter params.
 *
 * @param {object} queryResults - Raw outputs from all dashboard queries
 * @param {object} filterParams - Request-level params passed through to renderer:
 *   { days, yesterday, selectedDate, galleryFilter, excludeIp, viewerIp,
 *     hideBots, hideChardon }
 * @returns {object} dashboardData — ready for renderDashboard()
 */
export function buildDashboardData(queryResults, filterParams) {
  const {
    summary, returningVisitors, newVisitors,
    events,
    galleries,
    referrers,
    geo,
    trend,
    devices, bounceRate, avgDurationFormatted, peakHours, deviceEngagement,
    pages,
    images, uniqueImagesViewed, totalImageSessions, totalImageViews,
    themesClicked, cowboyJumps, topDepthSessions, minEngagement, maxEngagement,
    avgDepthScore, deepSessionPct, deepSessions, totalSessions, botSessions, botPct,
    entryPages, imagePageViewsFromEvents, imageEntrySessionsFromEvents, entryRefCounts,
    exitPages, exitSummary, exitByCategory,
    edgeEvents, edgeSummary,
    artViewsSummary, artViewsByType, topArtViews, externalImageAccess, externalImageAccessTotal, externalReachGeo, externalReachSources, entryRefCountsObj, imageAccessOverview, viewerDepth, suppressionStats,
    botIntelligence,
    periodTotals
  } = queryResults;

  const {
    days, yesterday, selectedDate, galleryFilter,
    excludeIp, viewerIp, hideBots, hideChardon
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
    pages: Array.isArray(pages) ? pages : (pages?.results || []),
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
