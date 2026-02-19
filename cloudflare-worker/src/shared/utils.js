// Shared utility functions extracted from k4-image-proxy.js
// Phase 1 Step 1 - Zero logic changes

import { BLOCKED_IP_PREFIXES, DATACENTER_PREFIXES, ALLOWED_BOTS, BLOCKED_BOTS, VERIFIED_BOTS } from './constants.js';

/**
 * Check if IP is in blocked list
 */
export function isBlockedIP(ip) {
  if (!ip) return false;
  return BLOCKED_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
}

/**
 * Check if IP is from a known datacenter
 */
export function isDatacenterIP(ip) {
  if (!ip) return false;
  return DATACENTER_PREFIXES.some(prefix => ip.startsWith(prefix));
}

/**
 * Get verified bot name from UA, or null if not a verified bot
 */
export function getVerifiedBotName(ua) {
  if (!ua) return null;
  for (const bot of VERIFIED_BOTS) {
    if (bot.pattern.test(ua)) return bot.name;
  }
  return null;
}

/**
 * Check if UA belongs to a verified search bot
 */
export function isVerifiedSearchBot(ua) {
  return getVerifiedBotName(ua) !== null;
}

/**
 * Hash IP for privacy - simple but effective
 */
export function hashIP(ip) {
  if (!ip) return 'unknown';
  // Simple hash: take first 3 octets + day for daily uniqueness
  const parts = ip.split('.');
  if (parts.length < 3) return ip.slice(0, 8);
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}

/**
 * Classify UA as human or unknown (not trying to detect all bots here)
 */
export function classifyUA(ua) {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  // Only mark as 'bot' if obviously a bot
  if (BLOCKED_BOTS.test(lower)) return 'bot';
  if (ALLOWED_BOTS.test(lower)) return 'bot';
  return 'human';
}

