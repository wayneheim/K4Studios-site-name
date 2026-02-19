// Phase 1 Step 5 — Analytics Collector (Orchestration Boundary)
//
// This module is the SOLE analytics import for the worker.
// Worker → collector.js → { classifier.js, storage.js }
//
// The worker never directly imports from classifier.js or storage.js.
// All analytics operations flow through this single boundary.
//
// This creates the blast-radius firewall:
// - If classifier logic changes → only collector.js + classifier.js touched
// - If storage schema changes → only collector.js + storage.js touched
// - Worker call sites remain stable

import {
  calculateRiskScore,
  normalizeReferrer,
  isSearchBot,
  SEARCH_BOT_PATTERN
} from './classifier.js';

import {
  updateBotIntelligence,
  logEdgeEvent,
  logArtView,
  logVerifiedBot
} from './storage.js';

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS — stable API surface for the worker
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Classifiers
  calculateRiskScore,
  normalizeReferrer,
  isSearchBot,
  SEARCH_BOT_PATTERN,

  // Storage writers
  updateBotIntelligence,
  logEdgeEvent,
  logArtView,
  logVerifiedBot
};
