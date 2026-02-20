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
    const referer = request.headers.get("Referer") || null;
    const country = request.cf?.country || null;
    const region = request.cf?.region || null;
    const city = request.cf?.city || null;
    const cfAsn = request.cf?.asn || null;
    
    const {
      sessionId = null,
      source = 'proxy',
      page = null,
      deltaMs = null,
      visitorId = null,
      imgSize = null,
      refType = null,
      inferred = null,
      inferredFrom = null
    } = extras;

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
      { name: 'img_size', value: imgSize },
      { name: 'ref_type', value: refType },
      { name: 'inferred', value: inferred },
      { name: 'inferred_from', value: inferredFrom }
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
async function logArtView(env, type, targetId, request, sessionId = null, source = 'js', visitorId = null, imgSize = null, refType = null, inferred = null, inferredFrom = null) {
  const page = request.headers.get("Referer") || null;
  await logRawEvent(env, type, targetId, request, { sessionId, source, page, visitorId, imgSize, refType, inferred, inferredFrom });
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
  await logRawEvent(env, eventType, imageId || path, request, { source: 'edge', visitorId });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPRECATED — These functions are no longer used in V2
// Bot intelligence is computed via VIEWs, not stored
// ═══════════════════════════════════════════════════════════════════════════

async function updateBotIntelligence(env) {
  // V2: No longer needed - classification is query-time via classified_events VIEW
  return 0;
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
