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

const CANONICAL_TRACKED_EVENTS = new Set([
  'xl_zoom',
  'browse_all_click',
  'order_clicked',
  'collector_notes_open',
  'cowboy_jump',
  'picture_shows_jump',
  'exit_to_gallery',
  'gallery_explore_click',
  'gallery_preview_click',
  'guide_open',
  'guide_close',
  'guide_done',
  'guide_click_outside',
  'gallery_hero_click',
  'more_info_open',
  'nav_next',
  'nav_prev',
  'order_submitted',
  'series_info',
  'sister_image_click',
  'slideshow_start',
  'story_slider_click',
  'theme_click',
  'all_list_click',
  'grid_open',
  'grid_image_click',
  'grid_show_more',
  'slideshow_nav_prev',
  'slideshow_nav_next',
  'story_audio_toggle',
  'grid_show_previous',
  'scroll_25',
  'scroll_50',
  'scroll_75',
  'scroll_100',
  'page_view',
  'session_exit'
]);

const PIXEL_LAYER_TO_CANONICAL_EVENT = {
  cowboy_jump_pixel_v1: 'cowboy_jump',
  picture_shows_jump_pixel_v1: 'picture_shows_jump',
  more_info_open_pixel_v1: 'more_info_open',
  order_clicked_pixel_v1: 'order_clicked',
  order_submitted_pixel_v1: 'order_submitted',
  series_info_pixel_v1: 'series_info',
  sister_image_click_pixel_v1: 'sister_image_click',
  slideshow_start_pixel_v1: 'slideshow_start',
  grid_open_pixel_v1: 'grid_open',
  grid_image_click_pixel_v1: 'grid_image_click',
  grid_show_more_pixel_v1: 'grid_show_more',
  grid_show_previous_pixel_v1: 'grid_show_previous'
};

function normalizeCanonicalEventType(eventType, source, sourceLayer) {
  if (source === 'js') {
    return CANONICAL_TRACKED_EVENTS.has(eventType) ? eventType : null;
  }

  if (source === 'pixel') {
    if (eventType === 'page_pixel') return 'page_pixel';
    if (eventType === 'action_pixel' && sourceLayer) {
      return PIXEL_LAYER_TO_CANONICAL_EVENT[sourceLayer] || null;
    }
  }

  return null;
}

function buildCanonicalEventRecord({
  eventType,
  targetId,
  source,
  sourceLayer,
  sessionId,
  visitorId,
  ip,
  ipHash,
  page,
  ua,
  referer,
  country,
  region,
  city,
  cfAsn,
  timestamp = new Date()
}) {
  const canonicalEventType = normalizeCanonicalEventType(eventType, source, sourceLayer);
  if (!canonicalEventType) return null;

  const eventDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const safeDate = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate;
  const epochSeconds = Math.floor(safeDate.getTime() / 1000);
  const isoMinute = safeDate.toISOString().slice(0, 16);
  const pageKey = page || ((typeof targetId === 'string' && targetId.startsWith('/')) ? targetId : '') || '';
  const targetKey = targetId || '';
  const sessionKey = sessionId || visitorId || `anon:${ipHash || ip || 'unknown'}|${isoMinute}`;
  const timeBucket = Math.floor(epochSeconds / 5);
  const dedupeKey = [canonicalEventType, sessionKey, pageKey, targetKey, timeBucket].join('::');
  const hasJs = source === 'js' ? 1 : 0;
  const hasPixel = source === 'pixel' ? 1 : 0;

  return {
    dedupeKey,
    ts: safeDate.toISOString(),
    eventType: canonicalEventType,
    targetId: targetKey || null,
    page: pageKey || null,
    sessionId: sessionId || null,
    sessionKey,
    ip,
    ipHash,
    ua,
    referer,
    source: hasJs ? 'js' : 'pixel',
    country,
    region,
    city,
    cfAsn,
    visitorId: visitorId || null,
    hasJs,
    hasPixel
  };
}

async function upsertCanonicalEvent(env, record) {
  if (!env?.DB || !record) return;

  const sql = `
    INSERT INTO canonical_events (
      dedupe_key,
      ts,
      last_seen,
      event_type,
      target_id,
      page,
      session_id,
      session_key,
      ip,
      ip_hash,
      ua,
      referer,
      source,
      country,
      region,
      city,
      cf_asn,
      visitor_id,
      has_js,
      has_pixel
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(dedupe_key) DO UPDATE SET
      last_seen = excluded.last_seen,
      has_js = MAX(canonical_events.has_js, excluded.has_js),
      has_pixel = MAX(canonical_events.has_pixel, excluded.has_pixel),
      source = CASE
        WHEN MAX(canonical_events.has_js, excluded.has_js) = 1
          AND MAX(canonical_events.has_pixel, excluded.has_pixel) = 1 THEN 'mixed'
        WHEN MAX(canonical_events.has_js, excluded.has_js) = 1 THEN 'js'
        ELSE 'pixel'
      END,
      visitor_id = COALESCE(canonical_events.visitor_id, excluded.visitor_id),
      session_id = COALESCE(canonical_events.session_id, excluded.session_id),
      page = CASE
        WHEN COALESCE(canonical_events.page, '') != '' THEN canonical_events.page
        ELSE excluded.page
      END,
      target_id = CASE
        WHEN COALESCE(canonical_events.target_id, '') != '' THEN canonical_events.target_id
        ELSE excluded.target_id
      END,
      referer = COALESCE(canonical_events.referer, excluded.referer)
  `;

  try {
    await env.DB.prepare(sql).bind(
      record.dedupeKey,
      record.ts,
      record.ts,
      record.eventType,
      record.targetId,
      record.page,
      record.sessionId,
      record.sessionKey,
      record.ip,
      record.ipHash,
      record.ua,
      record.referer,
      record.source,
      record.country,
      record.region,
      record.city,
      record.cfAsn,
      record.visitorId,
      record.hasJs,
      record.hasPixel
    ).run();
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('no such table') && msg.includes('canonical_events')) {
      return;
    }
    throw e;
  }
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
      pageKey = null,
      refererOverride = null,
      deltaMs = null,
      visitorId = null,
      sourceLayer = null,
      imgSize = null,
      refType = null,
      inferred = null,
      inferredFrom = null,
      assetSource = null,
      ogPlatform: ogPlatformFromExtras = null,
      entryReferrer = null,
      documentReferrer = null,
      previousPage = null,
      utmSource = null,
      utmMedium = null,
      utmCampaign = null,
      utmContent = null,
      utmTerm = null,
      navigationType = null,
      pageInstanceId = null,
      engagedMs = null
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
    const eventTimestamp = new Date();

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
      { name: 'page_key', value: pageKey },
      { name: 'img_size', value: imgSize },
      { name: 'ref_type', value: refType },
      { name: 'inferred', value: inferred },
      { name: 'inferred_from', value: inferredFrom },
      { name: 'asset_source', value: assetSource },
      { name: 'og_platform', value: ogPlatform },
      { name: 'entry_referrer', value: entryReferrer },
      { name: 'document_referrer', value: documentReferrer },
      { name: 'previous_page', value: previousPage },
      { name: 'utm_source', value: utmSource },
      { name: 'utm_medium', value: utmMedium },
      { name: 'utm_campaign', value: utmCampaign },
      { name: 'utm_content', value: utmContent },
      { name: 'utm_term', value: utmTerm },
      { name: 'navigation_type', value: navigationType },
      { name: 'page_instance_id', value: pageInstanceId },
      { name: 'engaged_ms', value: engagedMs }
    ].filter(o => o.value !== null && o.value !== undefined);

    const missingColumnRegex = /no such column:\s*([a-zA-Z0-9_]+)/i;
    const maxAttempts = optional.length + 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const columns = baseColumns.concat(optional.map(o => o.name));
        const values = baseValues.concat(optional.map(o => o.value));
        const placeholders = columns.map(() => '?').join(', ');

        await env.DB.prepare(
          `INSERT INTO raw_events (${columns.join(', ')}) VALUES (${placeholders})`
        )
          .bind(...values)
          .run();

        await upsertCanonicalEvent(env, buildCanonicalEventRecord({
          eventType,
          targetId,
          source,
          sourceLayer,
          sessionId,
          visitorId,
          ip,
          ipHash,
          page,
          ua,
          referer,
          country,
          region,
          city,
          cfAsn,
          timestamp: eventTimestamp
        }));

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
          SUM(CASE
            WHEN source = 'edge'
              AND event_type = '404'
              AND target_id IS NOT NULL
              AND target_id LIKE '%/i-%'
            THEN 1
            ELSE 0
          END) as malformed_404_probes,
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
        malformed_404_probes: Number(stats.malformed_404_probes || 0),
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
            WHEN excluded.is_verified_bot = 1 THEN 'verified'
            WHEN suspected_bots.status = 'blocked' THEN 'blocked'
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
