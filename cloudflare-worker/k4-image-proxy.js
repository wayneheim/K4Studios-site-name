/**
 * K4 Studios Image Proxy Worker
 * 
 * Routes: /img/{id}/{size}
 * 
 * Responsibilities:
 * - Fetch + cache image-manifest.json from origin
 * - Resolve image ID → SmugMug URL with size fallback
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
const MANIFEST_CACHE_TTL = 3600; // 1 hour in seconds

// Size fallback chains
const SIZE_FALLBACK = {
  xl: ['xl', 'l', 'm', 's', 'src'],
  l:  ['l', 'm', 's', 'xl', 'src'],
  m:  ['m', 's', 'l', 'src'],
  s:  ['s', 'm', 'src'],
  src: ['src', 's', 'm', 'l', 'xl']
};

// Bot detection patterns - only Bing gets special treatment
const BING_BOT_PATTERN = /bingbot|msnbot|bingpreview/i;

// Maximum size Bing is allowed to receive
const BING_MAX_SIZE = 'm';

// ============================================================================
// MANIFEST CACHE
// ============================================================================

let manifestCache = null;
let manifestCacheTime = 0;

/**
 * Fetch and cache the image manifest
 * Uses in-memory cache with TTL, falls back to edge cache
 */
async function getManifest(ctx) {
  const now = Date.now();
  
  // Check in-memory cache first
  if (manifestCache && (now - manifestCacheTime) < (MANIFEST_CACHE_TTL * 1000)) {
    return manifestCache;
  }
  
  // Try edge cache
  const cache = caches.default;
  const cacheKey = new Request(MANIFEST_URL);
  
  let response = await cache.match(cacheKey);
  
  if (!response) {
    // Fetch from origin
    response = await fetch(MANIFEST_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'K4-Image-Proxy-Worker/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }
    
    // Clone for caching
    const responseToCache = new Response(response.clone().body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${MANIFEST_CACHE_TTL}`
      }
    });
    
    // Store in edge cache (don't await, fire and forget)
    ctx.waitUntil(cache.put(cacheKey, responseToCache));
  }
  
  // Parse and store in memory cache
  manifestCache = await response.json();
  manifestCacheTime = now;
  
  return manifestCache;
}

// ============================================================================
// BOT DETECTION
// ============================================================================

/**
 * Check if request is from Bing bot
 */
function isBingBot(request) {
  const ua = request.headers.get('User-Agent') || '';
  return BING_BOT_PATTERN.test(ua);
}

/**
 * Cap size for Bing bots
 */
function capSizeForBot(requestedSize, isBing) {
  if (!isBing) return requestedSize;
  
  // Bing only gets m or smaller
  const allowedSizes = ['s', 'm', 'src'];
  if (allowedSizes.includes(requestedSize)) {
    return requestedSize;
  }
  
  // Downgrade xl/l to m
  return BING_MAX_SIZE;
}

// ============================================================================
// URL RESOLUTION
// ============================================================================

/**
 * Resolve image ID + size to SmugMug URL
 * Returns null if image not found or no valid URL
 */
function resolveImageUrl(manifest, imageId, requestedSize) {
  const imageData = manifest[imageId];
  
  if (!imageData) {
    return null;
  }
  
  // Get fallback chain for requested size
  const fallbackChain = SIZE_FALLBACK[requestedSize] || SIZE_FALLBACK.m;
  
  // Try each size in fallback order
  for (const size of fallbackChain) {
    if (imageData[size]) {
      return imageData[size];
    }
  }
  
  return null;
}

// ============================================================================
// IMAGE PROXY
// ============================================================================

/**
 * Fetch image from SmugMug and return bytes
 */
async function proxyImage(smugMugUrl, request) {
  const imageResponse = await fetch(smugMugUrl, {
    headers: {
      // Pass through accept headers for format negotiation
      'Accept': request.headers.get('Accept') || 'image/*',
      // Identify ourselves to SmugMug
      'User-Agent': 'K4-Image-Proxy-Worker/1.0',
      // Pass referer if present (SmugMug may check this)
      ...(request.headers.get('Referer') && { 'Referer': request.headers.get('Referer') })
    }
  });
  
  if (!imageResponse.ok) {
    // Don't cache failures from SmugMug
    return new Response('Image not found', { 
      status: imageResponse.status,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
  
  // Return image with aggressive caching
  // Images are immutable (URL contains content hash)
  return new Response(imageResponse.body, {
    status: 200,
    headers: {
      'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
      'Content-Length': imageResponse.headers.get('Content-Length'),
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      // Don't leak origin
      'X-Proxy-Origin': 'k4studios'
    }
  });
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

/**
 * Parse /img/{id}/{size} route
 * STRICT validation to prevent cache poisoning
 */
function parseImageRoute(pathname) {
  // Strict pattern: /img/i-XXXXXX/size (no trailing slash)
  const match = pathname.match(/^\/img\/(i-[a-zA-Z0-9]+)\/(s|m|l|xl|src)$/);
  
  if (!match) {
    return null;
  }
  
  return {
    imageId: match[1],
    size: match[2]
  };
}

/**
 * Main request handler
 */
async function handleRequest(request, ctx) {
  const url = new URL(request.url);
  
  // Only handle /img/* routes
  if (!url.pathname.startsWith('/img/')) {
    return new Response('Not Found', { status: 404 });
  }
  
  // Parse route with STRICT validation
  const route = parseImageRoute(url.pathname);
  
  if (!route) {
    // CRITICAL: no-store prevents caching invalid requests
    return new Response('Invalid image route. Use /img/{id}/{size}', { 
      status: 400,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
  
  try {
    // Get manifest
    const manifest = await getManifest(ctx);
    
    // Check if Bing bot and cap size if needed
    const isBing = isBingBot(request);
    const effectiveSize = capSizeForBot(route.size, isBing);
    
    // Resolve to SmugMug URL
    const smugMugUrl = resolveImageUrl(manifest, route.imageId, effectiveSize);
    
    if (!smugMugUrl) {
      // CRITICAL: no-store prevents caching 404s for valid-format but missing images
      return new Response('Image not found', { 
        status: 404,
        headers: { 'Cache-Control': 'no-store' }
      });
    }
    
    // Fetch and return image
    return await proxyImage(smugMugUrl, request);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Fail closed - never redirect to SmugMug, don't cache errors
    return new Response('Internal error', { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}

// ============================================================================
// WORKER ENTRY POINT
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, ctx);
  }
};
