/**
 * Smart 404 Handler for Image Pages
 * 
 * This serverless function handles 404s for image pages (/Galleries/.../i-xxxxx).
 * It looks up the image ID in a pre-built map and either:
 * 1. Redirects to the correct gallery if the image moved (301) — same for all UAs
 * 2. Returns the branded 404 page if the image ID is unknown — same for all UAs
 *
 * Bots (Bingbot, Googlebot, etc.) and humans receive IDENTICAL behavior.
 * Gating is UA-agnostic (session + rate based).
 * 
 * This function ONLY runs on actual 404s, not on every page load.
 */

let _imageIdMapLower = null;
let _knownGalleryPathsLower = null;
let _branded404Html = null;
let _branded404FetchedAt = 0;
const BRANDED_404_CACHE_TTL_MS = 300000;

const SPECIAL_IMAGE_IDS = new Set(['i-k4studios']);
const IMAGE_ID_STRICT_REGEX = /^i-[A-Za-z0-9]{6,10}$/;
const LEGACY_RECOVERY_PREFIXES = [
  '/photography-galleries/painterly-photography',
  '/photography-galleries/traditional-photos'
];
const EDGE_EVENT_ENDPOINT = 'https://edge.k4studios.com/edge-event';

function isStrictImageId(id) {
  if (!id) return false;
  if (SPECIAL_IMAGE_IDS.has(String(id).toLowerCase())) return true;
  return IMAGE_ID_STRICT_REGEX.test(String(id));
}

function normalizePath(path) {
  if (!path) return '';
  const trimmed = String(path).trim();
  if (!trimmed) return '';
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, '') : trimmed;
}

function getParentGalleryPath(pathname) {
  let normalized = normalizePath(pathname);

  // Legacy SmugMug image links may append a single-letter suffix
  // (commonly "/A") after the image id. Normalize to canonical image form
  // before deriving the parent gallery path.
  normalized = normalized.replace(/\/([iI]-[A-Za-z0-9-]+)\/[A-Z]\/?$/, '/$1');

  return normalized.replace(/\/[iI]-[A-Za-z0-9-]+\/?$/, '');
}

function getImageIdMapLower() {
  if (_imageIdMapLower) return _imageIdMapLower;
  const imageIdMap = require('./imageIdMap.json');
  const lower = {};
  for (const [key, value] of Object.entries(imageIdMap)) {
    lower[key.toLowerCase()] = { path: value, originalId: key };
  }
  _imageIdMapLower = lower;
  return _imageIdMapLower;
}

function getKnownGalleryPathsLower() {
  if (_knownGalleryPathsLower) return _knownGalleryPathsLower;

  const imageIdMapLower = getImageIdMapLower();
  const paths = new Set();

  for (const value of Object.values(imageIdMapLower)) {
    const pathValue = value?.path;
    if (!pathValue) continue;

    if (Array.isArray(pathValue)) {
      for (const p of pathValue) {
        const n = normalizePath(p).toLowerCase();
        if (n) paths.add(n);
      }
    } else {
      const n = normalizePath(pathValue).toLowerCase();
      if (n) paths.add(n);
    }
  }

  _knownGalleryPathsLower = paths;
  return _knownGalleryPathsLower;
}

function isSuspiciousPath(pathname) {
  const p = String(pathname || '').toLowerCase();
  // Keep minimal + high-signal: these are almost always exploit/scraper probes.
  return p.includes('/hack/');
}

function hasValidSessionCookie(headers) {
  const cookie = headers?.cookie || headers?.Cookie || '';
  if (!cookie) return false;
  return /(?:^|;\s*)k4_sid=/.test(cookie) || /(?:^|;\s*)k4_vid=/.test(cookie);
}

function getClientIp(headers) {
  const h = headers || {};
  const direct = h['x-nf-client-connection-ip'] || h['X-NF-Client-Connection-IP'];
  if (direct) return String(direct);
  const xff = h['x-forwarded-for'] || h['X-Forwarded-For'];
  if (xff) return String(xff).split(',')[0].trim();
  return '';
}

function getOriginFromEvent(event) {
  const headers = event?.headers || {};
  const host = headers['x-forwarded-host'] || headers['X-Forwarded-Host'] || headers.host || headers.Host;
  const proto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || 'https';
  if (host) return `${proto}://${host}`;
  return 'https://www.k4studios.com';
}

async function getBranded404Html(event) {
  const now = Date.now();
  if (_branded404Html && (now - _branded404FetchedAt) < BRANDED_404_CACHE_TTL_MS) {
    return _branded404Html;
  }

  const origin = getOriginFromEvent(event);
  const url = `${origin}/404.html`;
  try {
    const resp = await fetch(url, { method: 'GET' });
    if (resp && (resp.ok || resp.status === 404)) {
      const html = await resp.text();
      if (html && html.trim()) {
        _branded404Html = html;
        _branded404FetchedAt = now;
        return _branded404Html;
      }
    }
  } catch (e) {
    console.log(`[smart-404] branded 404 fetch failed: ${e?.message || e}`);
  }

  return '<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>404 Not Found</h1></body></html>';
}

async function createBranded404Response(event, reason, maxAge = 86400) {
  const html = await getBranded404Html(event);
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}`,
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Smart-404': reason
    },
    body: html
  };
}

async function logSmart404EdgeEvent({ outcome, path, imageId, reason }) {
  try {
    const payload = {
      event_type: `smart404_${String(outcome || 'unknown').toLowerCase()}`,
      path: String(path || ''),
      image_id: imageId || null,
      reason: reason || null
    };

    const postOnce = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      try {
        const res = await fetch(EDGE_EVENT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    };

    // Retry once for transient network/edge hiccups.
    const ok = await postOnce();
    if (!ok) await postOnce();
  } catch {
    // Never let telemetry interfere with request handling.
  }
}

// Best-effort, in-memory rate limiter (per warm function instance).
// Not perfect, but it helps reduce brute-force oracle behavior.
const _ipBuckets = new Map();
let _bucketOps = 0;
function isHighRateIp(ip) {
  if (!ip) return false;
  const WINDOW_MS = 60_000;
  const MAX_REQ = 30;
  const now = Date.now();
  let b = _ipBuckets.get(ip);
  if (!b || (now - b.windowStart) > WINDOW_MS) {
    b = { windowStart: now, count: 0 };
  }
  b.count += 1;
  _ipBuckets.set(ip, b);

  // Lazy prune to avoid unbounded growth
  _bucketOps += 1;
  if (_bucketOps % 200 === 0) {
    for (const [k, v] of _ipBuckets.entries()) {
      if ((now - v.windowStart) > (5 * WINDOW_MS)) _ipBuckets.delete(k);
    }
  }

  return b.count > MAX_REQ;
}

// NOTE: Edge event logging (301/410/404) is now handled directly in the 
// Cloudflare Worker via logEdgeEvent(). Netlify functions cannot reliably
// track edge events because:
// 1. Many requests never reach Netlify (Worker responds first)
// 2. Redirects/410s terminate before tracking can complete
// 3. Bots, prefetches, HEAD requests get missed
// See: Quill's architectural guidance from 2026-02-08

exports.handler = async (event) => {
  // Get path from query string (passed by _redirects) or from event.path
  const queryPath = event.queryStringParameters?.path || '';
  const eventPath = event.path || '';
  const requestedPathRaw = queryPath || eventPath;
  const requestedPath = (requestedPathRaw && requestedPathRaw.length > 1)
    ? requestedPathRaw.replace(/\/+$/g, '')
    : requestedPathRaw;
  
  // Also get the image ID directly from query params if available
  const queryId = event.queryStringParameters?.id || '';

  // Preserve any extra query params across redirects (e.g. ?k4debug=1)
  // The redirect rule always provides id/path; anything else should pass through.
  const passthroughQuery = (() => {
    try {
      const qp = event.queryStringParameters || {};
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(qp)) {
        if (k === 'id' || k === 'path') continue;
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const vv of v) {
            if (vv !== undefined && vv !== null && String(vv) !== '') params.append(k, String(vv));
          }
        } else {
          if (String(v) !== '') params.set(k, String(v));
        }
      }
      const s = params.toString();
      return s ? `?${s}` : '';
    } catch {
      return '';
    }
  })();
  
  console.log(`[smart-404] Event path: ${eventPath}`);
  console.log(`[smart-404] Query path: ${queryPath}`);
  console.log(`[smart-404] Query id: ${queryId}`);
  console.log(`[smart-404] Using path: ${requestedPath}`);

  // Don't help exploit probes discover real URLs.
  if (isSuspiciousPath(requestedPath)) {
    console.log(`[smart-404] Suspicious path blocked (410): ${requestedPath}`);
    await logSmart404EdgeEvent({
      outcome: 'blocked_suspicious',
      path: requestedPath,
      imageId: queryId || null,
      reason: 'blocked-suspicious'
    });
    return {
      statusCode: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Smart-404': 'blocked-suspicious'
      },
      body: 'Gone'
    };
  }

  // Quill/Apollo-13: locked door unless proven on-site human session.
  // Avoid using smart-404 as an oracle for brute-force ID probing.
  const hasSession = hasValidSessionCookie(event.headers);
  const clientIp = getClientIp(event.headers);
  const highRate = isHighRateIp(clientIp);

  // Narrow no-session recovery exceptions for legacy crawl debt only:
  // Allow only two approved legacy base prefixes.
  const requestedLower = String(requestedPath || '').toLowerCase();
  const isAllowedLegacyRecoveryPath = LEGACY_RECOVERY_PREFIXES.some(prefix =>
    requestedLower === prefix || requestedLower.startsWith(`${prefix}/`)
  );
  const allowNoSessionRecovery = isAllowedLegacyRecoveryPath;

  // Lock out: high-rate sources always; no-session traffic except narrow
  // legacy-recovery exceptions above.
  if (highRate || (!hasSession && !allowNoSessionRecovery)) {
    if (!hasSession && !allowNoSessionRecovery) console.log('[smart-404] Locked: no session');
    if (highRate) console.log(`[smart-404] Locked: high rate from ${clientIp}`);
    await logSmart404EdgeEvent({
      outcome: 'locked',
      path: requestedPath,
      imageId: queryId || null,
      reason: highRate ? 'high-rate' : 'no-session'
    });
    return createBranded404Response(event, 'locked', 600);
  }
  
  // Extract image ID from path or use query param
  let imageId = queryId;
  if (!imageId) {
    // Looser regex - finds i-xxxxx even if URL isn't perfectly end-anchored
    const imageIdMatch = requestedPath.match(/\/(i-[a-zA-Z0-9]+)(?:\/|$)/);
    imageId = imageIdMatch ? imageIdMatch[1] : '';
  }
  // Ensure imageId has the i- prefix
  if (imageId && !imageId.startsWith('i-')) {
    imageId = 'i-' + imageId;
  }

  // Non-image legacy requests: canonicalize old namespace to /Galleries/*.
  // This keeps old gallery URLs consolidating without forcing image lookup.
  if (!imageId) {
    if (/^\/Photography-Galleries\//.test(requestedPath || '')) {
      const canonicalPath = String(requestedPath || '').replace(/^\/Photography-Galleries\//, '/Galleries/');
      const redirectUrl = `${canonicalPath}${passthroughQuery}`;
      console.log(`[smart-404] Legacy non-image path -> ${redirectUrl}`);
      await logSmart404EdgeEvent({
        outcome: 'legacy_gallery_canonicalized',
        path: requestedPath,
        imageId: null,
        reason: 'legacy-gallery-canonicalized'
      });
      return {
        statusCode: 301,
        headers: {
          'Location': redirectUrl,
          'Cache-Control': 'public, max-age=31536000',
          'X-Smart-404': 'legacy-gallery-canonicalized'
        },
        body: ''
      };
    }

    console.log(`[smart-404] No image ID found, passing to 404`);
    await logSmart404EdgeEvent({
      outcome: 'no_image_id',
      path: requestedPath,
      imageId: null,
      reason: 'no-image-id'
    });
    return createBranded404Response(event, 'no-image-id');
  }

  // Fast-fail junk IDs before any map lookup
  if (!isStrictImageId(imageId)) {
    console.log(`[smart-404] Invalid image ID shape: ${imageId}`);
    await logSmart404EdgeEvent({
      outcome: 'invalid_id_format',
      path: requestedPath,
      imageId,
      reason: 'invalid-id-format'
    });
    return createBranded404Response(event, 'invalid-id-format');
  }

  // Validate parent gallery path before ID lookup
  const parentGalleryPath = getParentGalleryPath(requestedPath);
  const knownGalleryPaths = getKnownGalleryPathsLower();
  const parentGalleryLower = String(parentGalleryPath || '').toLowerCase();
  const hasKnownGalleryExact = knownGalleryPaths.has(parentGalleryLower);
  const hasKnownGalleryLeaf = knownGalleryPaths.has(`${parentGalleryLower}/gallery`);
  if (!isAllowedLegacyRecoveryPath && !(hasKnownGalleryExact || hasKnownGalleryLeaf)) {
    console.log(`[smart-404] Unknown gallery path: ${parentGalleryPath}`);
    await logSmart404EdgeEvent({
      outcome: 'invalid_gallery_path',
      path: requestedPath,
      imageId,
      reason: 'invalid-gallery-path'
    });
    return createBranded404Response(event, 'invalid-gallery-path');
  }
  
  console.log(`[smart-404] Looking up image ID: ${imageId}`);
  
  // Look up the image in our map (case-insensitive)
  const imageIdMapLower = getImageIdMapLower();
  const lookup = imageIdMapLower[imageId.toLowerCase()];
  // path is an array of gallery paths - prefer one that matches current gallery context
  const pathArray = lookup?.path;
  const canonicalImageId = lookup?.originalId || imageId;
  
  // Determine the best gallery path based on context
  let correctGalleryPath = null;
  if (Array.isArray(pathArray) && pathArray.length > 0) {
    // Extract gallery context from the requested URL
    // e.g., "/Galleries/Painterly-Fine-Art-Photography/..." or "/Galleries/Fine-Art-Photography/..."
    const requestedPathLower = requestedPath.toLowerCase();
    
    // Try to find a path that matches the current gallery context
    // Priority 1: Match by gallery type in URL
    let matchingPath = pathArray.find(p => {
      const pLower = p.toLowerCase();
      // Check if both are in the same top-level gallery
      if (requestedPathLower.includes('/painterly-fine-art-photography/') && 
          pLower.includes('/painterly-fine-art-photography/')) {
        return true;
      }
      if (requestedPathLower.includes('/fine-art-photography/') && 
          !requestedPathLower.includes('/painterly-fine-art-photography/') &&
          pLower.includes('/fine-art-photography/') &&
          !pLower.includes('/painterly-fine-art-photography/')) {
        return true;
      }
      return false;
    });
    
    // Priority 2: If no match by gallery type, prefer Painterly galleries (higher priority)
    if (!matchingPath) {
      matchingPath = pathArray.find(p => p.toLowerCase().includes('/painterly-fine-art-photography/'));
    }
    
    correctGalleryPath = matchingPath || pathArray[0];
    console.log(`[smart-404] Multiple paths available: ${JSON.stringify(pathArray)}, selected: ${correctGalleryPath}`);
  } else {
    correctGalleryPath = pathArray;
  }
  
  if (correctGalleryPath) {
    // Found the image - redirect with canonical case
    const redirectUrl = `${correctGalleryPath}/${canonicalImageId}${passthroughQuery}`;
    console.log(`[smart-404] Found! Redirecting to: ${redirectUrl}`);
    await logSmart404EdgeEvent({
      outcome: 'image_relocated',
      path: requestedPath,
      imageId: canonicalImageId,
      reason: 'image-relocated'
    });
    
    return {
      statusCode: 301,
      headers: {
        'Location': redirectUrl,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'X-Smart-404': 'image-relocated'
      },
      body: ''
    };
  }
  
  // Image ID shape and gallery path are valid, but ID is unknown.
  // Deterministic crawl-safe response for all UAs.
  console.log(`[smart-404] Unknown image ID (deterministic 404): ${imageId}`);
  await logSmart404EdgeEvent({
    outcome: 'notfound',
    path: requestedPath,
    imageId,
    reason: 'notfound'
  });
  return createBranded404Response(event, 'notfound');
};
