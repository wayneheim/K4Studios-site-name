// Analytics module barrel export
export {
  SEARCH_BOT_PATTERN,
  calculateRiskScore,
  normalizeReferrer,
  isSearchBot,
} from './classifier.js';

export {
  updateBotIntelligence,
  logEdgeEvent,
  logArtView,
  logVerifiedBot,
} from './storage.js';
