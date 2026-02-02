/**
 * K4 Studios Image Proxy Worker
 *
 * Routes: /img/{id}/{size}
 *
 * Responsibilities:
 * - Fetch + cache image-manifest.json from origin
 * - Resolve image ID ΓåÆ SmugMug URL with size fallback
 * - Apply bot logic (Bing capped at srcM)
 * - Fetch from SmugMug and return bytes
 * - Never redirect, never leak origin
 *
 * CRITICAL: 400/404 responses use no-store to prevent cache poisoning
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const MANIFEST_URL = 'https://k4studios.com/image-manifest.json';
const MANIFEST_CACHE_TTL = 3600; // 1 hour

const SIZE_FALLBACK = {
  xl: ['xl', 'l', 'm', 's', 'src'],
  l:  ['l', 'm', 's', 'xl', 'src'],
  m:  ['m', 'l', 's'],  // Never fall back to XL for grid thumbnails
  s:  ['s', 'm', 'src'],
  src:['src', 's', 'm', 'l', 'xl']
};

// REMOVED: Bing size capping - causes "cloaking" detection
// Bing expects same URL = same bytes. UA-based size changes break trust.
// const BING_BOT_PATTERN = /bingbot|msnbot|bingpreview/i;
// const BING_MAX_SIZE = 'm';

// ============================================================================
// MANIFEST CACHE
// ============================================================================

let manifestCache = null;
let manifestCacheTime = 0;

async function getManifest(ctx) {
  const now = Date.now();

  if (manifestCache && (now - manifestCacheTime) < MANIFEST_CACHE_TTL * 1000) {
    return manifestCache;
  }

  const cache = caches.default;
  const cacheKey = new Request(MANIFEST_URL);

  let response = await cache.match(cacheKey);

  if (!response) {
    response = await fetch(MANIFEST_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'K4-Image-Proxy-Worker/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Manifest fetch failed: ${response.status}`);
    }

    const responseToCache = new Response(response.clone().body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${MANIFEST_CACHE_TTL}`
      }
    });

    ctx.waitUntil(cache.put(cacheKey, responseToCache));
  }

  manifestCache = await response.json();
  manifestCacheTime = now;

  return manifestCache;
}

// ============================================================================
// BOT DETECTION ΓÇö DISABLED
// ============================================================================
// Removed: UA-based size capping caused Bing to distrust image URLs.
// Same URL must always return same bytes.

// function isBingBot(request) {
//   const ua = request.headers.get('User-Agent') || '';
//   return BING_BOT_PATTERN.test(ua);
// }

// function capSizeForBot(requestedSize, isBing) {
//   if (!isBing) return requestedSize;
//   if (['s', 'm', 'src'].includes(requestedSize)) return requestedSize;
//   return BING_MAX_SIZE;
// }

// ============================================================================
// URL RESOLUTION
// ============================================================================

function resolveImageUrl(manifest, imageId, requestedSize) {
  const imageData = manifest[imageId];
  if (!imageData) return null;

  const fallbackChain = SIZE_FALLBACK[requestedSize] || SIZE_FALLBACK.m;

  for (const size of fallbackChain) {
    if (imageData[size]) return imageData[size];
  }

  return null;
}

// ============================================================================
// IMAGE PROXY
// ============================================================================

async function proxyImage(smugMugUrl, request, size) {
  const imageResponse = await fetch(smugMugUrl, {
    headers: {
      'Accept': request.headers.get('Accept') || 'image/*',
      'User-Agent': 'K4-Image-Proxy-Worker/1.0',
      ...(request.headers.get('Referer') && {
        'Referer': request.headers.get('Referer')
      })
    }
  });

  if (!imageResponse.ok) {
    return new Response('Image not found', {
      status: imageResponse.status,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  // Build response headers
  const headers = {
    'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Proxy-Origin': 'k4studios'
  };

  // XL images: tell bots not to index (belt-and-suspenders protection)
  if (size === 'xl') {
    headers['X-Robots-Tag'] = 'noindex, noimageindex';
  }

  return new Response(imageResponse.body, {
    status: 200,
    headers
  });
}

// ============================================================================
// ROUTE PARSING (FIXED)
// ============================================================================

function parseImageRoute(pathname) {
  /**
   * Accept:
   *   /img/i-XXXXX/m
   *   /img/i-XXXX-YYY/l
   *   /img/i-XXXXX/xl/
   *
   * Reject:
   *   missing size
   *   unknown size
   *   random paths
   */
  const match = pathname.match(
    /^\/img\/(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)\/?$/
  );

  if (!match) return null;

  return {
    imageId: match[1],
    size: match[2]
  };
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

async function handleRequest(request, ctx) {
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/img/')) {
    return new Response('Not Found', { status: 404 });
  }

  const route = parseImageRoute(url.pathname);

  if (!route) {
    return new Response('Invalid image route', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  try {
    const manifest = await getManifest(ctx);

    // Serve exactly what was requested - no UA-based modification
    const smugMugUrl = resolveImageUrl(
      manifest,
      route.imageId,
      route.size
    );

    if (!smugMugUrl) {
      return new Response('Image not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    return await proxyImage(smugMugUrl, request, route.size);

  } catch (error) {
    console.error('Image proxy error:', error);

    return new Response('Internal error', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, ctx);
  }
};
