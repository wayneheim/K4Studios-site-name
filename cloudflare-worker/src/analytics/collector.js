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
  updateBotIntelligence as _updateBotIntelligence,
  logEdgeEvent as _logEdgeEvent,
  logArtView as _logArtView,
  logVerifiedBot as _logVerifiedBot
} from './storage.js';

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS — stable API surface for the worker
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Classifiers (pure — no guard needed)
  calculateRiskScore,
  normalizeReferrer,
  isSearchBot,
  SEARCH_BOT_PATTERN
};

// ═══════════════════════════════════════════════════════════════════════════
// TIME BUDGET — Phase 2 Step 3 execution safety limit
//
// Prevents analytics from consuming excessive edge CPU under DB slowdown.
// Resolves silently on timeout — no rejection, no branching.
// ═══════════════════════════════════════════════════════════════════════════

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve =>
      setTimeout(() => resolve("timeout"), ms)
    )
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDED STORAGE WRITERS — Phase 2 Step 2 failure isolation
//
// Every storage function is wrapped so rejected promises inside
// ctx.waitUntil() never surface as unhandled-promise warnings.
// Zero logic changes — only try/catch containment at the boundary.
// ═══════════════════════════════════════════════════════════════════════════

export async function logEdgeEvent(...args) {
  try {
    return await withTimeout(_logEdgeEvent(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logEdgeEvent]:", err?.message || err);
  }
}

export async function logArtView(...args) {
  try {
    return await withTimeout(_logArtView(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logArtView]:", err?.message || err);
  }
}

export async function logVerifiedBot(...args) {
  try {
    return await withTimeout(_logVerifiedBot(...args), 1500);
  } catch (err) {
    console.error("analytics failure [logVerifiedBot]:", err?.message || err);
  }
}

export async function updateBotIntelligence(...args) {
  try {
    return await withTimeout(_updateBotIntelligence(...args), 1500);
  } catch (err) {
    console.error("analytics failure [updateBotIntelligence]:", err?.message || err);
  }
}
