// Analytics classification functions extracted from k4-image-proxy.js
// Phase 1 Step 3 - Zero logic changes

// Search bots for IMAGE PAGE 410 policy (narrower, intentionally)
export const SEARCH_BOT_PATTERN =
  /(googlebot|google-inspectiontool|googleother|bingbot|bingpreview|msnbot|duckduckbot|yandex|baiduspider|slurp|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot)/i;

/**
 * Calculate risk score for an IP based on behavior patterns
 * Returns: { score: number, rules: string[], riskLevel: 1|2|3|4 }
 *
 * Risk levels:
 * 1 = Verified/Safe (search bots)
 * 2 = Suspicious but non-aggressive (watching)
 * 3 = High-confidence scraper (review recommended)
 * 4 = Malicious/Abusive (block candidate)
 */
export function calculateRiskScore(stats) {
  let score = 0;
  const rules = [];
  
  // Verified bot = Risk 1, always safe
  if (stats.is_verified_bot) {
    return { score: 0, rules: ['verified_bot'], riskLevel: 1 };
  }
  
  // Velocity: >3 requests/second sustained
  if (stats.max_velocity > 3) {
    score += 3;
    rules.push('high_velocity');
  }
  
  // Volume: >50 requests/hour
  if (stats.requests_per_hour > 50) {
    score += 2;
    rules.push('high_volume');
  }
  
  // No branching: 100% image_page, 0% gallery
  if (stats.image_page_pct > 95 && stats.gallery_pct < 1) {
    score += 3;
    rules.push('no_branching');
  }
  
  // No referrer + high volume
  if (!stats.has_referrer && stats.total_requests > 20) {
    score += 2;
    rules.push('no_referrer_high_volume');
  }
  
  // Datacenter IP
  if (stats.is_datacenter) {
    score += 1;
    rules.push('datacenter_ip');
  }
  
  // Multi-day presence (persistent scraper)
  if (stats.days_seen > 2) {
    score += Math.min(stats.days_seen - 1, 3);
    rules.push('multi_day');
  }
  
  // Suspicious country patterns (known bot havens + no referrer)
  if (['NL', 'FI', 'PL', 'RU', 'CN'].includes(stats.country) && !stats.has_referrer) {
    score += 1;
    rules.push('suspicious_origin');
  }
  
  // Determine risk level
  let riskLevel;
  if (score >= 8) {
    riskLevel = 4; // Malicious
  } else if (score >= 5) {
    riskLevel = 3; // High-confidence scraper
  } else if (score >= 2) {
    riskLevel = 2; // Suspicious
  } else {
    riskLevel = 1; // Safe (low activity human)
  }
  
  return { score, rules, riskLevel };
}

/**
 * Normalize a referrer URL into a canonical category name
 * Pure string classification - no side effects
 */
export function normalizeReferrer(referer) {
  if (!referer) return "unknown";
  const lower = referer.toLowerCase();
  
  // Handle already-normalized values (from cookie)
  if (lower === "google" || lower === "bing" || lower === "facebook" || 
      lower === "instagram" || lower === "twitter" || lower === "pinterest" || 
      lower === "linkedin" || lower === "internal" || lower === "direct" || 
      lower === "unknown" || lower === "other" || lower === "chatgpt") {
    return lower;
  }
  
  // Normalize full URLs
  if (lower.includes("google.") || lower.includes("google/")) return "google";
  if (lower.includes("bing.")) return "bing";
  if (lower.includes("facebook.") || lower.includes("fb.")) return "facebook";
  if (lower.includes("instagram.")) return "instagram";
  if (lower.includes("twitter.") || lower.includes("x.com") || lower.includes("t.co/")) return "twitter";
  if (lower.includes("chatgpt.com") || lower.includes("chat.openai.com")) return "chatgpt";
  if (lower.includes("pinterest.")) return "pinterest";
  if (lower.includes("linkedin.")) return "linkedin";
  if (lower.includes("k4studios.com")) return "internal";
  return "other";
}

/**
 * Check if request is from a search bot (for image page 410 policy)
 * Uses narrower SEARCH_BOT_PATTERN, not the broad ALLOWED_BOTS
 */
export function isSearchBot(request) {
  const ua = request.headers.get("User-Agent") || "";
  return SEARCH_BOT_PATTERN.test(ua);
}
