/**
 * Smart 404 Handler for Image Pages
 * 
 * This serverless function handles 404s for image pages (/Galleries/.../i-xxxxx).
 * It looks up the image ID in a pre-built map and either:
 * 1. Redirects to the correct gallery if the image moved (301)
 * 2. For NOT FOUND images:
 *    - Bots get 404 Not Found (never-existed IDs, not permanent deletions)
 *    - Humans get 302 redirect to gallery landing (good UX)
 * 
 * This function ONLY runs on actual 404s, not on every page load.
 */

let _imageIdMapLower = null;
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

// Detect search engine crawlers by User-Agent (allowed)
function isSearchCrawler(userAgent) {
  if (!userAgent) return false;
  // Intentionally narrow: keep link equity for major search engines.
  // Do NOT include SEO tools/scrapers here (Ahrefs/Semrush/etc).
  const crawlerPattern = /googlebot|bingbot|duckduckbot|slurp|yandex|baiduspider|msnbot|applebot/i;
  return crawlerPattern.test(userAgent);
}

// Known non-search scrapers / automation clients (locked out)
function isBlockedBotUa(userAgent) {
  if (!userAgent) return false;
  const p = /ahrefsbot|semrushbot|petalbot|mj12bot|dotbot|seznambot|serpstatbot|dataforseo|python-requests|aiohttp|curl|wget|go-http-client/i;
  return p.test(userAgent);
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

// Best-effort, in-memory rate limiter (per warm function instance).
// Not perfect, but it helps reduce brute-force oracle behavior.
const _ipBuckets = new Map();
let _bucketOps = 0;
function isHighRateIp(ip, opts = {}) {
  if (!ip) return false;
  const WINDOW_MS = 60_000;
  const MAX_REQ = opts.isCrawler ? 60 : 25;
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
  // Get User-Agent for bot detection
  const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || '';
  const isCrawler = isSearchCrawler(userAgent);
  const isBlockedUa = isBlockedBotUa(userAgent);
  const isBotRequest = isCrawler;
  
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
  const highRate = isHighRateIp(clientIp, { isCrawler });

  // Hard lockout: known scrapers/automation clients.
  if (isBlockedUa) {
    console.log('[smart-404] Locked: blocked UA');
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Smart-404': 'locked'
      },
      body: 'Not Found'
    };
  }

  // Allow: on-site humans (session cookie) OR major search crawlers.
  // Lock out: no-session unknowns (bulk probes) and high-rate sources.
  if (!(hasSession || isCrawler) || highRate) {
    if (!hasSession && !isCrawler) console.log('[smart-404] Locked: no session and not a crawler');
    if (highRate) console.log(`[smart-404] Locked: high rate from ${clientIp}`);
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Smart-404': 'locked'
      },
      body: 'Not Found'
    };
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
  
  if (!imageId) {
    // Not an image page request - pass through to normal 404
    console.log(`[smart-404] No image ID found, passing to 404`);
    return {
      statusCode: 404,
      body: 'Not Found'
    };
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
  
  // Image not found anywhere
  // Bots get 410 Gone (kills ghost URLs), humans get redirect to gallery
  const galleryLandingPath = requestedPath.replace(/\/i-[a-zA-Z0-9]+\/?$/, '');
  
  if (isBotRequest) {
    // Bot: Return 404 Not Found — these IDs never existed (probe/stale traffic).
    // 410 was poisoning Bing crawl trust by signaling permanent deletion at scale.
    // 410 is now reserved for explicit legacy _redirects rules only.
    console.log(`[smart-404] Bot detected, returning 404 for unknown: ${imageId}`);
    
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex',
        'X-Smart-404': 'notfound-bot'
      },
      body: '<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>404 Not Found</h1><p>This image does not exist.</p></body></html>'
    };
  }
  
  // Human: Redirect to gallery landing page for good UX
  if (galleryLandingPath && galleryLandingPath !== requestedPath) {
    console.log(`[smart-404] Human visitor, redirecting to gallery: ${galleryLandingPath}`);
    
    return {
      statusCode: 302,
      headers: {
        'Location': `${galleryLandingPath}${passthroughQuery}`,
        'Cache-Control': 'no-cache', // Don't cache redirects for humans
        'X-Smart-404': 'gallery-fallback-human'
      },
      body: ''
    };
  }
  
  // Fallback to homepage if we can't determine a gallery
  console.log(`[smart-404] No gallery path, redirecting to homepage`);
  
  return {
    statusCode: 302,
    headers: {
      'Location': `/${passthroughQuery}`,
      'Cache-Control': 'no-cache',
      'X-Smart-404': 'homepage-fallback'
    },
    body: ''
  };
};
