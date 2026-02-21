/**
 * Smart 404 Lookup - Returns redirect URL for moved images
 * 
 * This is a lightweight function called by 404.astro to check
 * if an image ID exists in another gallery location.
 */

let _imageIdMap = null;
function getImageIdMap() {
  if (_imageIdMap) return _imageIdMap;
  _imageIdMap = require('./imageIdMap.json');
  return _imageIdMap;
}

function isBlockedBotUa(userAgent) {
  if (!userAgent) return false;
  const p = /ahrefsbot|semrushbot|petalbot|mj12bot|dotbot|seznambot|serpstatbot|dataforseo|python-requests|aiohttp|curl|wget|go-http-client/i;
  return p.test(userAgent);
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

const _ipBuckets = new Map();
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
  return b.count > MAX_REQ;
}

exports.handler = async (event) => {
  const userAgent = event.headers?.['user-agent'] || event.headers?.['User-Agent'] || '';
  const hasSession = hasValidSessionCookie(event.headers);
  const highRate = isHighRateIp(getClientIp(event.headers));

  // Quill/Apollo-13: don't act as an oracle unless proven human session.
  if (!hasSession || isBlockedBotUa(userAgent) || highRate) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
        'X-Robots-Tag': 'noindex, nofollow'
      },
      body: JSON.stringify({ error: 'Not Found' })
    };
  }

  const imageId = event.queryStringParameters?.id || '';
  
  if (!imageId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'No image ID provided' })
    };
  }
  
  // Ensure imageId has the i- prefix
  const normalizedId = imageId.startsWith('i-') ? imageId : 'i-' + imageId;
  
  console.log(`[smart-404-lookup] Looking up: ${normalizedId}`);
  
  const imageIdMap = getImageIdMap();
  const galleryPath = imageIdMap[normalizedId];
  
  if (galleryPath) {
    const redirectUrl = `${galleryPath}/${normalizedId}`;
    console.log(`[smart-404-lookup] Found: ${redirectUrl}`);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify({ 
        found: true,
        redirectUrl: redirectUrl
      })
    };
  }
  
  console.log(`[smart-404-lookup] Not found: ${normalizedId}`);
  
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    },
    body: JSON.stringify({ 
      found: false,
      redirectUrl: null
    })
  };
};
