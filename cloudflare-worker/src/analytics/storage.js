// Analytics storage layer - D1 write operations
// Phase 1 Step 4 extraction - Zero logic changes
//
// Every function accepts `env` explicitly. No hidden bindings.

import {
  isSyntheticTraffic,
  isBlockedIP,
  classifyUA,
  hashIP,
  isDatacenterIP,
  DATACENTER_PREFIXES
} from '../shared/index.js';

import { calculateRiskScore } from './classifier.js';

// ═══════════════════════════════════════════════════════════════════════════
// BOT INTELLIGENCE — batch D1 read+write (periodic maintenance)
// ═══════════════════════════════════════════════════════════════════════════

async function updateBotIntelligence(env) {
  if (!env?.DB) return;
  
  try {
    // Aggregate suspicious activity from art_views (last 7 days)
    // Also aggregate IPs that were auto-flagged as bots
    const aggregateQuery = `
      WITH ip_stats AS (
        SELECT 
          ip_hash,
          COUNT(*) as total_requests,
          COUNT(DISTINCT date(created_at)) as days_seen,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen,
          MAX(country) as country,
          SUM(CASE WHEN referrer IS NOT NULL AND referrer != '' THEN 1 ELSE 0 END) > 0 as has_referrer,
          ROUND(100.0 * SUM(CASE WHEN type = 'image_page' THEN 1 ELSE 0 END) / COUNT(*), 1) as image_page_pct,
          ROUND(100.0 * SUM(CASE WHEN type IN ('gallery', 'gallery_view') THEN 1 ELSE 0 END) / COUNT(*), 1) as gallery_pct,
          ROUND(COUNT(*) * 1.0 / (JULIANDAY(MAX(created_at)) - JULIANDAY(MIN(created_at)) + 0.001) / 24, 1) as requests_per_hour,
          MAX(is_bot) as is_flagged_bot
        FROM art_views
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY ip_hash
        HAVING COUNT(*) >= 5 OR MAX(is_bot) = 1
      )
      SELECT * FROM ip_stats
      ORDER BY total_requests DESC
      LIMIT 100
    `;
    
    const statsResult = await env.DB.prepare(aggregateQuery).all();
    const ipStats = statsResult.results || [];
    
    for (const stats of ipStats) {
      // Check if datacenter IP
      const isDatacenter = DATACENTER_PREFIXES.some(p => stats.ip_hash.startsWith(p.replace('.x', '.')));
      
      // Calculate risk (boost if auto-flagged as bot)
      let { score, rules, riskLevel } = calculateRiskScore({
        ...stats,
        is_datacenter: isDatacenter,
        is_verified_bot: false, // Can't verify from hash alone
      });
      
      // If auto-flagged as bot (datacenter + no referrer), add a modest boost
      // NOT auto-elevated to risk 3 anymore — the +30 score was nuclear
      // (malicious threshold is 8) and caused mass false-positive throttling.
      // Now just a +2 signal that combines with other rules normally.
      if (stats.is_flagged_bot) {
        score += 2;
        rules.push('auto_flagged_bot');
      }
      
      // Determine status: WATCHING by default, never auto-throttle.
      // Throttling/blocking is manual-only via the dashboard.
      // Auto-throttle was causing mass false positives (171 IPs throttled,
      // including owner's IP and verified Facebook crawler).
      let status = 'watching';
      
      // Upsert into suspected_bots (preserve blocked status)
      await env.DB.prepare(`
        INSERT INTO suspected_bots (ip_hash, risk_level, risk_score, rules_triggered, first_seen, last_seen, days_seen, total_requests, image_page_pct, has_referrer, is_datacenter, country, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(ip_hash) DO UPDATE SET
          risk_level = excluded.risk_level,
          risk_score = excluded.risk_score,
          rules_triggered = excluded.rules_triggered,
          last_seen = excluded.last_seen,
          days_seen = excluded.days_seen,
          total_requests = excluded.total_requests,
          image_page_pct = excluded.image_page_pct,
          has_referrer = excluded.has_referrer,
          updated_at = datetime('now'),
          status = CASE WHEN suspected_bots.status IN ('blocked', 'verified') THEN suspected_bots.status ELSE excluded.status END
      `).bind(
        stats.ip_hash,
        riskLevel,
        score,
        JSON.stringify(rules),
        stats.first_seen,
        stats.last_seen,
        stats.days_seen,
        stats.total_requests,
        stats.image_page_pct,
        stats.has_referrer ? 1 : 0,
        isDatacenter ? 1 : 0,
        stats.country,
        status
      ).run();
    }
    
    return ipStats.length;
  } catch (e) {
    console.error('Bot intelligence update error:', e);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE EVENT LOGGING — fire-and-forget D1 write
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log edge event directly to D1 (fire and forget via waitUntil)
 * This is the correct place to log 301/410/302 events - at the edge.
 */
async function logEdgeEvent(env, eventType, path, imageId, isBot, request) {
  try {
    const referrer = request.headers.get("Referer") || null;
    const country = request.cf?.country || null;
    
    await env.DB.prepare(`
      INSERT INTO edge_events (event_type, path, image_id, is_bot, referrer, country)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(eventType, path, imageId, isBot ? 1 : 0, referrer, country).run();
  } catch (e) {
    // Never let logging break the response
    console.error('Edge event logging error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ART VIEW LOGGING — deduped D1 write
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log an art view - fires async, never blocks response
 * Deduplication: one view per IP per target per hour
 */
async function logArtView(env, type, targetId, request, sessionId = null) {
  try {
    // Use shared ingestion gate - one function, all paths
    if (isSyntheticTraffic(request)) return;
    
    const ip = request.headers.get("CF-Connecting-IP") || 
               request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || 
               'unknown';
    
    // Hard block known scrapers - don't even log them
    if (isBlockedIP(ip)) return;
    
    const ua = request.headers.get("User-Agent") || '';
    const uaClass = classifyUA(ua);
    
    // Skip obvious bots for this layer - they're counted in Cloudflare
    if (uaClass === 'bot') return;
    
    const ipHash = hashIP(ip);
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const referrer = request.headers.get("Referer") || null;
    
    // Bot detection: only flag if datacenter IP + no referrer
    // REMOVED: (isOnsiteType && !referrer) — was flagging 69-81% of real
    // gallery/image_page views as bots. Many legitimate users visit without
    // Referer headers: direct links, emails, bookmarks, privacy browsers.
    // This false positive was cascading into auto_flagged_bot ? throttling.
    const isBot = (isDatacenterIP(ip) && !referrer) ? 1 : 0;
    
    // Dedup strategy:
    // - JS-verified calls pass session_id → dedup per session (same image in same session = 1 view)
    // - Server-side calls (no session_id) → dedup per hour (fallback for non-JS safety net)
    // Session-scoped dedup fixes the "phone swipe" problem: revisiting an image after
    // grid browsing within the same clock hour was silently dropped by hourly dedup.
    const dedupScope = sessionId ? `sid-${sessionId}` : new Date().toISOString().slice(0, 13);
    const dedupKey = `${ipHash}:${targetId}:${type}:${dedupScope}`;
    
    await env.DB.prepare(`
      INSERT OR IGNORE INTO art_views (type, target_id, ip_hash, ua_class, country, region, city, referrer, dedup_key, is_bot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(type, targetId, ipHash, uaClass, country, region, city, referrer, dedupKey, isBot).run();
  } catch (e) {
    // Never let logging break the response
    console.error('Art view logging error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFIED BOT LOGGING — D1 upsert
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log verified search bot activity (Googlebot, Bingbot, etc.)
 * This is GOOD - it means search engines are indexing your images!
 */
async function logVerifiedBot(env, imageId, request) {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || 'unknown';
    const ipHash = hashIP(ip);
    const ua = request.headers.get("User-Agent") || '';
    const country = request.cf?.country || null;
    
    // Extract bot name from user agent
    let botName = 'unknown';
    if (/googlebot/i.test(ua)) botName = 'googlebot';
    else if (/bingbot/i.test(ua)) botName = 'bingbot';
    else if (/applebot/i.test(ua)) botName = 'applebot';
    else if (/yandexbot/i.test(ua)) botName = 'yandexbot';
    else if (/duckduckbot/i.test(ua)) botName = 'duckduckbot';
    else if (/baiduspider/i.test(ua)) botName = 'baidu';
    else if (/facebookexternalhit/i.test(ua)) botName = 'facebook';
    else if (/twitterbot/i.test(ua)) botName = 'twitter';
    else if (/pinterestbot/i.test(ua)) botName = 'pinterest';
    
    // Upsert into suspected_bots with verified flag
    await env.DB.prepare(`
      INSERT INTO suspected_bots (ip_hash, risk_level, risk_score, rules_triggered, first_seen, last_seen, days_seen, total_requests, is_verified_bot, bot_name, country, status, updated_at)
      VALUES (?, 0, 0, '[]', datetime('now'), datetime('now'), 1, 1, 1, ?, ?, 'verified', datetime('now'))
      ON CONFLICT(ip_hash) DO UPDATE SET
        last_seen = datetime('now'),
        total_requests = total_requests + 1,
        is_verified_bot = 1,
        bot_name = excluded.bot_name,
        status = 'verified',
        updated_at = datetime('now')
    `).bind(ipHash, botName, country).run();
  } catch (e) {
    console.error('Verified bot logging error:', e);
  }
}

export {
  updateBotIntelligence,
  logEdgeEvent,
  logArtView,
  logVerifiedBot
};
