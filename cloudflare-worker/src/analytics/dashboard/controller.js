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
  getBotIntelligence
} from '../queries.js';

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
    yesterday, days, selectedDate, galleryFilter, excludeIp, viewerIp,
    hideBots, hideChardon
  } = filters;

  // Query 1 + 1b: Summary stats + new vs returning
  const { summary, returningVisitors, newVisitors } = await getDashboardStats(env, {
    dateClause, galleryClause, ipClause, botClause, chardonClause, priorPeriodClause
  });

  const { events, entries } = await getEventBreakdown(env, {
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

  const pages = await getTopPages(env, {
    dateClause, ipClause, botClause, chardonClause
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

  const { edgeEvents, edgeSummary } = await getEdgeEvents(env, { yesterday, days });

  const { artViewsSummary, artViewsByType, topArtViews } = await getArtViews(env, {
    dateClause, ipClause, botClause, chardonClause, artIpClause
  });

  const botIntelligence = await getBotIntelligence(env);

  // Assemble the exact data shape renderDashboard() expects
  const dashboardData = {
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

  // Render and return HTML string
  return renderDashboard(dashboardData);
}
