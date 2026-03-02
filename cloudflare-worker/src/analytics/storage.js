// Analytics V2 Storage Layer — Raw Event Logging
// 
// ARCHITECTURE PRINCIPLE:
// - Database = dumb log (no filtering, no classification)
// - Meaning = query-time (VIEWs handle classification)
// - Truth is preserved; interpretation is deferred
//
// Every event writes to raw_events. Period.
// No bot detection. No suppression. No timing flags.
// Classification happens via classified_events VIEW.

import { hashIP } from '../shared/index.js';
import { DATACENTER_PREFIXES } from '../shared/constants.js';
import { calculateRiskScore } from './classifier.js';
import { getVerifiedBotName } from '../shared/utils.js';

function detectOGPlatform(request) {
  const ua = (request?.headers?.get('user-agent') || '').toLowerCase();

  if (ua.includes('facebookexternalhit')) return 'facebook';
  if (ua.includes('facebot')) return 'facebook';

  if (ua.includes('linkedinbot')) return 'linkedin';

  if (ua.includes('discordbot')) return 'discord';

  if (ua.includes('slackbot')) return 'slack';

  if (ua.includes('twitterbot')) return 'twitter';
  if (ua.includes('xbot')) return 'twitter';

  if (ua.includes('whatsapp')) return 'whatsapp';

  // Apple + privacy proxies usually hide identity
  if (ua.includes('applebot')) return 'apple';

  return 'unknown';
}

function riskLevelFromScore(score) {
  const s = Number(score || 0);
  if (s >= 8) return 4;
  if (s >= 5) return 3;
  if (s >= 2) return 2;
  return 1;
}

function isLevel4BlockCandidate({
  score,
  rules,
  totalRequests,
  daysSeen,
  requestsPerHour,
  maxVelocity,
  maxSessionEps
}) {
  const s = Number(score || 0);
  if (s < 8) return false;

  const total = Number(totalRequests || 0);
  // Guardrail: don't label as "block candidate" on tiny samples.
  if (total < 30) return false;

  const r = new Set(Array.isArray(rules) ? rules : []);

  const hasHardSignal = r.has('cookie_churn') || r.has('inhuman_session_speed') || r.has('high_velocity');
  const isPersistent = Number(daysSeen || 1) >= 2;
  const isExtremeVolume = Number(requestsPerHour || 0) >= 120 || total >= 120;
  const isNoRefHighVolume = r.has('no_referrer_high_volume') && (Number(requestsPerHour || 0) >= 60 || total >= 60);
  const isVeryFast = Number(maxVelocity || 0) >= 5 || Number(maxSessionEps || 0) >= 10;

  return hasHardSignal || isPersistent || isExtremeVolume || isNoRefHighVolume || isVeryFast;
}

// ═══════════════════════════════════════════════════════════════════════════
// RAW EVENT LOGGING — The ONLY write function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log a raw event - fires async, never blocks response
 * NO filtering. NO classification. Just raw facts.
 * 
 * @param {object} env - Worker env with DB binding
 * @param {string} eventType - 'chapter', 'zoom', 'gallery', 'external', 'edge_redirect', etc.
 * @param {string} targetId - image ID, gallery ID, or path
 * @param {Request} request - The incoming request
 * @param {object} extras - Optional: { sessionId, source, page, visitorId }
 */
async function logRawEvent(env, eventType, targetId, request, extras = {}) {
  try {
    if (!env?.DB) return;
    
    const ip = request.headers.get("CF-Connecting-IP") || 
               request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || 
               'unknown';
    
    const ipHash = hashIP(ip);
    const ua = request.headers.get("User-Agent") || '';
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const cfAsn = request.cf?.asn || null;
    
    const {
      sessionId = null,
      source = 'proxy',
      page = null,
      refererOverride = null,
      deltaMs = null,
      visitorId = null,
      sourceLayer = null,
      imgSize = null,
      refType = null,
      inferred = null,
      inferredFrom = null,
      assetSource = null,
      ogPlatform: ogPlatformFromExtras = null
    } = extras;

    let ogPlatform = ogPlatformFromExtras;

    // Only compute OG platform when we're already in an OG-tagged population.
    // This keeps normal traffic fast and preserves existing analytics semantics.
    if ((ogPlatform === null || ogPlatform === undefined) && assetSource === 'og') {
      ogPlatform = detectOGPlatform(request);
    }

    const referer = refererOverride !== null && refererOverride !== undefined
      ? refererOverride
      : (request.headers.get("Referer") || null);

    const baseColumns = [
      'ip',
      'ip_hash',
      'event_type',
      'target_id',
      'page',
      'session_id',
      'ua',
      'referer',
      'source',
      'country',
      'region',
      'city',
      'delta_ms',
      'cf_asn',
      'visitor_id'
    ];
    const baseValues = [
      ip,
      ipHash,
      eventType,
      targetId,
      page,
      sessionId,
      ua,
      referer,
      source,
      country,
      region,
      city,
      deltaMs,
      cfAsn,
      visitorId
    ];

    // Optional columns: only included when non-null.
    // If the column doesn't exist in D1 yet, we detect and retry without it.
    const optional = [
      { name: 'source_layer', value: sourceLayer },
      { name: 'img_size', value: imgSize },
      { name: 'ref_type', value: refType },
      { name: 'inferred', value: inferred },
      { name: 'inferred_from', value: inferredFrom },
      { name: 'asset_source', value: assetSource },
      { name: 'og_platform', value: ogPlatform }
    ].filter(o => o.value !== null && o.value !== undefined);

    const missingColumnRegex = /no such column:\s*([a-zA-Z0-9_]+)/i;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const columns = baseColumns.concat(optional.map(o => o.name));
        const values = baseValues.concat(optional.map(o => o.value));
        const placeholders = columns.map(() => '?').join(', ');

        await env.DB.prepare(
          `INSERT INTO raw_events (${columns.join(', ')}) VALUES (${placeholders})`
        )
          .bind(...values)
          .run();

        return;
      } catch (e) {
        const msg = String(e?.message || e);
        const isMissingColumn = msg.includes('no such column') || msg.includes('has no column');
        if (!isMissingColumn) throw e;

        const match = msg.match(missingColumnRegex);
        const missing = match?.[1] || null;
        if (!missing) {
          // Unknown missing-column shape — drop all optional columns and try one last time.
          optional.length = 0;
          continue;
        }

        const idx = optional.findIndex(o => o.name === missing);
        if (idx >= 0) {
          optional.splice(idx, 1);
          continue;
        }

        // Missing a base column? Nothing we can do.
        throw e;
      }
    }
  } catch (e) {
    // Never let logging break the response
    console.error('Raw event logging error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPERS (all call logRawEvent internally)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log art view (chapter, zoom, gallery, external)
 * @param {object} env - Worker env with DB binding
 * @param {string} type - Event type
 * @param {string} targetId - Target ID
 * @param {Request} request - The request
 * @param {string|null} sessionId - Session ID
 * @param {string} source - Source (js, proxy, edge)
 * @param {string|null} visitorId - Cookie-based visitor ID (k4_vid)
 */
async function logArtView(env, type, targetId, request, sessionId = null, source = 'js', visitorId = null, imgSize = null, refType = null, inferred = null, inferredFrom = null, assetSource = null) {
  const page = request.headers.get("Referer") || null;
  await logRawEvent(env, type, targetId, request, { sessionId, source, page, visitorId, imgSize, refType, inferred, inferredFrom, assetSource });
}

/**
 * Log edge event (redirects, errors)
 * @param {object} env - Worker env
 * @param {string} eventType - Event type
 * @param {string} path - Request path
 * @param {string|null} imageId - Image ID
 * @param {boolean} isBot - Deprecated (classification is query-time now)
 * @param {Request} request - The request
 * @param {string|null} visitorId - Cookie-based visitor ID (k4_vid)
 */
async function logEdgeEvent(env, eventType, path, imageId, isBot, request, visitorId = null) {
  await logRawEvent(env, eventType, path, request, { source: 'edge', visitorId, inferredFrom: imageId || null });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPRECATED — These functions are no longer used in V2
// Bot intelligence is computed via VIEWs, not stored
// ═══════════════════════════════════════════════════════════════════════════

async function updateBotIntelligence(env) {
  if (!env?.DB) return 0;

  try {
    // Compute per-ip_hash behavior stats from the last 7 days.
    // We use classified_events for the `is_bot` flag (ASN + UA heuristics).
    const aggregateQuery = `
      WITH base AS (
        SELECT
          ip_hash,
          ts,
          country,
          referer,
          ua,
          event_type,
          target_id,
          page,
          source,
          session_id,
          visitor_id,
          is_bot
        FROM classified_events
        WHERE ts > datetime('now', '-7 days')
          AND ip_hash IS NOT NULL
          AND ip_hash != ''
      ),
      session_stats AS (
        SELECT
          ip_hash,
          session_id,
          COUNT(*) as session_events,
          (JULIANDAY(MAX(ts)) - JULIANDAY(MIN(ts))) * 86400.0 as session_seconds
        FROM base
        WHERE session_id IS NOT NULL
          AND session_id != ''
          AND source = 'js'
        GROUP BY ip_hash, session_id
      ),
      session_speed AS (
        SELECT
          ip_hash,
          MAX(
            session_events / CASE
              WHEN session_seconds IS NULL OR session_seconds < 1 THEN 1
              ELSE session_seconds
            END
          ) as max_session_eps
        FROM session_stats
        GROUP BY ip_hash
      ),
      ip_stats AS (
        SELECT
          ip_hash,
          COUNT(*) as total_requests,
          COUNT(DISTINCT visitor_id) as distinct_visitors,
          COUNT(DISTINCT date(ts)) as days_seen,
          MIN(ts) as first_seen,
          MAX(ts) as last_seen,
          MAX(country) as country,
          SUM(CASE WHEN referer IS NOT NULL AND referer != '' THEN 1 ELSE 0 END) > 0 as has_referrer,
          ROUND(
            100.0 * SUM(
              CASE
                WHEN event_type IN (
                  'image_page',
                  'external_image_page',
                  'chapter_exposure',
                  'external_image',
                  'direct_image'
                ) THEN 1
                ELSE 0
              END
            ) / COUNT(*),
            1
          ) as image_page_pct,
          ROUND(
            100.0 * SUM(CASE WHEN event_type IN ('gallery', 'gallery_view') THEN 1 ELSE 0 END) / COUNT(*),
            1
          ) as gallery_pct,
          MAX(CASE WHEN event_type = 'verified_bot' THEN 1 ELSE 0 END) as is_verified_bot,
          MAX(is_bot) as is_flagged_bot
        FROM base
        GROUP BY ip_hash
        HAVING COUNT(*) >= 5
            OR MAX(is_bot) = 1
            OR COUNT(DISTINCT visitor_id) >= 10
      ),
      per_hour AS (
        SELECT ip_hash, MAX(cnt) as max_per_hour
        FROM (
          SELECT ip_hash, strftime('%Y-%m-%d %H', ts) as hour_bucket, COUNT(*) as cnt
          FROM base
          GROUP BY ip_hash, hour_bucket
        )
        GROUP BY ip_hash
      ),
      per_minute AS (
        SELECT ip_hash, MAX(cnt) as max_per_minute
        FROM (
          SELECT ip_hash, strftime('%Y-%m-%d %H:%M', ts) as minute_bucket, COUNT(*) as cnt
          FROM base
          GROUP BY ip_hash, minute_bucket
        )
        GROUP BY ip_hash
      )
      SELECT
        s.*,
        COALESCE(h.max_per_hour, 0) as max_per_hour,
        COALESCE(m.max_per_minute, 0) as max_per_minute,
        COALESCE(ss.max_session_eps, 0) as max_session_eps
      FROM ip_stats s
      LEFT JOIN per_hour h USING (ip_hash)
      LEFT JOIN per_minute m USING (ip_hash)
      LEFT JOIN session_speed ss USING (ip_hash)
      ORDER BY total_requests DESC
      LIMIT 100
    `;

    const statsResult = await env.DB.prepare(aggregateQuery).all();
    const ipStats = statsResult.results || [];

    let upserted = 0;
    for (const stats of ipStats) {
      const isDatacenter = DATACENTER_PREFIXES.some((p) => String(stats.ip_hash || '').startsWith(p));

      // Use max hourly bucket as our volume signal, and peak minute bucket for velocity.
      const requestsPerHour = Number(stats.max_per_hour || 0);
      const maxVelocity = Number(stats.max_per_minute || 0) / 60.0;

      // Determine verified bot name (only when we logged a verified_bot event).
      let botName = null;
      if (stats.is_verified_bot) {
        try {
          const uaRow = await env.DB.prepare(
            `SELECT ua FROM raw_events WHERE ip_hash = ? AND event_type = 'verified_bot' ORDER BY ts DESC LIMIT 1`
          ).bind(stats.ip_hash).first();
          botName = getVerifiedBotName(uaRow?.ua || '') || 'verified_bot';
        } catch {
          botName = 'verified_bot';
        }
      }

      const { score: baseScore, rules: baseRules, riskLevel: baseRiskLevel } = calculateRiskScore({
        total_requests: Number(stats.total_requests || 0),
        distinct_visitors: Number(stats.distinct_visitors || 0),
        days_seen: Number(stats.days_seen || 1),
        max_velocity: maxVelocity,
        max_session_eps: Number(stats.max_session_eps || 0),
        requests_per_hour: requestsPerHour,
        image_page_pct: Number(stats.image_page_pct || 0),
        gallery_pct: Number(stats.gallery_pct || 0),
        has_referrer: Boolean(stats.has_referrer),
        is_datacenter: isDatacenter,
        is_verified_bot: Boolean(stats.is_verified_bot),
        country: stats.country || null
      });

      let score = baseScore;
      const rules = [...baseRules];
      if (stats.is_flagged_bot) {
        score += 2;
        rules.push('auto_flagged_bot');
      }

      // Important: `auto_flagged_bot` increases confidence; ensure risk_level reflects it.
      // (Previously risk_score could rise above the risk_level boundary without promotion.)
      let riskLevel = Math.max(baseRiskLevel, riskLevelFromScore(score));

      // Tighten Level 4: it should mean "Wayne, seriously consider blocking".
      // If a row hits score>=8 via mixed heuristics but lacks enough evidence, keep it at Level 3.
      if (riskLevel >= 4) {
        const ok = isLevel4BlockCandidate({
          score,
          rules,
          totalRequests: Number(stats.total_requests || 0),
          daysSeen: Number(stats.days_seen || 1),
          requestsPerHour,
          maxVelocity,
          maxSessionEps: Number(stats.max_session_eps || 0)
        });
        if (!ok) riskLevel = 3;
      }

      const status = stats.is_verified_bot ? 'verified' : 'watching';

      await env.DB.prepare(`
        INSERT INTO suspected_bots (
          ip_hash,
          risk_level,
          risk_score,
          rules_triggered,
          first_seen,
          last_seen,
          days_seen,
          total_requests,
          max_velocity,
          image_page_pct,
          has_referrer,
          is_datacenter,
          is_verified_bot,
          bot_name,
          country,
          status,
          updated_at,
          classifier_version
        )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 3)
        ON CONFLICT(ip_hash) DO UPDATE SET
          risk_level = excluded.risk_level,
          risk_score = excluded.risk_score,
          rules_triggered = excluded.rules_triggered,
          last_seen = excluded.last_seen,
          days_seen = excluded.days_seen,
          total_requests = excluded.total_requests,
          max_velocity = excluded.max_velocity,
          image_page_pct = excluded.image_page_pct,
          has_referrer = excluded.has_referrer,
          is_datacenter = excluded.is_datacenter,
          is_verified_bot = excluded.is_verified_bot,
          bot_name = COALESCE(excluded.bot_name, suspected_bots.bot_name),
          country = COALESCE(excluded.country, suspected_bots.country),
          updated_at = datetime('now'),
          status = CASE
            WHEN suspected_bots.status IN ('blocked', 'verified') THEN suspected_bots.status
            ELSE excluded.status
          END,
          classifier_version = 3
      `).bind(
        stats.ip_hash,
        riskLevel,
        score,
        JSON.stringify(rules),
        stats.first_seen,
        stats.last_seen,
        Number(stats.days_seen || 1),
        Number(stats.total_requests || 0),
        maxVelocity,
        Number(stats.image_page_pct || 0),
        stats.has_referrer ? 1 : 0,
        isDatacenter ? 1 : 0,
        stats.is_verified_bot ? 1 : 0,
        botName,
        stats.country,
        status
      ).run();

      upserted++;
    }

    return upserted;
  } catch (e) {
    console.error('Bot intelligence update error:', e);
    return 0;
  }
}

async function logVerifiedBot(env, imageId, request) {
  // V2: Just log as regular event, classification happens at query time
  await logRawEvent(env, 'verified_bot', imageId, request, { source: 'edge' });
}

export {
  logRawEvent,
  logArtView,
  logEdgeEvent,
  updateBotIntelligence,
  logVerifiedBot
};
