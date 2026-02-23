// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD CONTROLLER (Phase 4 — orchestrates all dashboard queries)
// Accepts env + pre-built filters, returns assembled dashboardData object.
// NO HTML, NO request parsing — pure data orchestration.
// ═══════════════════════════════════════════════════════════════════════════
import {
  getDashboardStats,
  getEventBreakdown,
  getGalleryPerformance,
  getReferrers,
  getGeography,
  getDailyTrend,
  getSessionMetrics,
  getTopPages,
  getTopImages,
  getEntryAnalysis,
  getEngagementDepth,
  getExitAnalysis,
  getEdgeEvents,
  getArtViews,
  getBotIntelligence,
  getPeriodTotals
} from '../queries.js';

import { buildDashboardData } from './schema.js';
import { renderDashboard } from './renderer.js';

/**
 * Calls all dashboard query functions and assembles the result into
 * the exact data shape that renderDashboard() expects.
 *
 * @param {object} env - Cloudflare Worker env bindings (DB, etc.)
 * @param {object} filters - Pre-built filter clauses + request params:
 *   { dateClause, galleryClause, ipClause, botClause, chardonClause,
 *     priorPeriodClause, rangeDateClause, artIpClause,
 *     yesterday, days, selectedDate, galleryFilter, excludeIp, viewerIp,
 *     hideBots, hideChardon }
 * @returns {object} dashboardData — ready for renderDashboard()
 */
export async function handleDashboardRequest(env, filters) {
  const {
    dateClause, galleryClause, ipClause, botClause, chardonClause,
    priorPeriodClause, rangeDateClause, artIpClause,
    baseDateClause, truthDateClause, hideBotsPredicate,
    yesterday, days, selectedDate, galleryFilter, excludeIp, viewerIp,
    hideBots, hideChardon, authHeader
  } = filters;

  // Query 1 + 1b: Summary stats + new vs returning
  const { summary, returningVisitors, newVisitors } = await getDashboardStats(env, {
    dateClause, galleryClause, ipClause, botClause, chardonClause, priorPeriodClause
  });

  const { events } = await getEventBreakdown(env, {
    dateClause, galleryClause, ipClause, botClause, chardonClause
  });

  const galleries = await getGalleryPerformance(env, {
    dateClause, ipClause, botClause, chardonClause
  });

  const referrers = await getReferrers(env, {
    dateClause, galleryClause, ipClause, botClause, chardonClause
  });

  const geo = await getGeography(env, {
    dateClause, galleryClause, ipClause, botClause, chardonClause
  });

  const trend = await getDailyTrend(env, {
    rangeDateClause, galleryClause, ipClause, botClause, chardonClause
  });

  const { devices, bounceRate, avgDurationSecs, avgDurationFormatted, peakHours, deviceEngagement } = await getSessionMetrics(env, {
    dateClause, galleryClause, ipClause, botClause, chardonClause
  });

  // Top Pages is a leaderboard: it should not be rewritten by UI filter state.
  // Use the truth-only date clause (time/range only), and ignore presentation filters.
  const pages = await getTopPages(env, {
    dateClause: truthDateClause || dateClause,
    ipClause: '',
    botClause: '',
    chardonClause: ''
  });

  const { images, uniqueImagesViewed, totalImageSessions, totalImageViews } = await getTopImages(env, {
    dateClause, ipClause, botClause, chardonClause
  });

  const { themesClicked, cowboyJumps, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, botSessions, botPct } = await getEngagementDepth(env, {
    dateClause, ipClause, botClause, chardonClause
  });

  const { entryPages, imagePageViewsFromEvents, imageEntrySessionsFromEvents, entryRefCounts } = await getEntryAnalysis(env, {
    dateClause, ipClause, botClause, chardonClause
  });

  const { exitPages, exitSummary, exitByCategory } = await getExitAnalysis(env, {
    dateClause, ipClause, botClause, chardonClause
  });

  const { edgeEvents, edgeSummary } = await getEdgeEvents(env, { dateClause, yesterday, days });

  const { artViewsSummary, artViewsByType, topArtViews, externalImageAccess, externalImageAccessTotal, externalReachGeo, externalReachSources, entryRefCountsObj, imageAccessOverview, viewerDepth, suppressionStats } = await getArtViews(env, {
    dateClause, ipClause, botClause, chardonClause, artIpClause,
    baseDateClause, hideBotsPredicate, hideBots
  });

  const botIntelligence = await getBotIntelligence(env);

  // Get period-level unique totals (not summed daily) - use rangeDateClause for full period
  const periodTotals = await getPeriodTotals(env, { dateClause: rangeDateClause, botClause, chardonClause });

  // Collect raw query results for schema assembly
  const queryResults = {
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
  };

  // Assemble data shape then render
  const dashboardData = buildDashboardData(queryResults, {
    days, yesterday, selectedDate, galleryFilter,
    excludeIp, viewerIp, hideBots, hideChardon, authHeader
  });

  // Render and return HTML string
  return renderDashboard(dashboardData);
}
