// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS NAMESPACE BARREL (Phase 4 — single public entry point)
// All analytics imports from the worker go through this file.
// Internal structure (queries, schema, renderer, controller) stays hidden.
// ═══════════════════════════════════════════════════════════════════════════

// Dashboard route — full request lifecycle
export { handleDashboardRequest } from './dashboard/route.js';

// Collector — classifiers + guarded storage writers + track handler
export {
  isSearchBot,
  calculateRiskScore,
  normalizeReferrer,
  SEARCH_BOT_PATTERN,
  logEdgeEvent,
  logArtView,
  logVerifiedBot,
  updateBotIntelligence,
  handleTrackRequest,
  handleTrackOptions
} from './collector.js';

// Admin API — /__k4stats sub-path endpoints
export {
  handleExportCSV,
  handleBlockIP,
  handleUnblockIP,
  handleRefreshBots
} from './admin.js';
