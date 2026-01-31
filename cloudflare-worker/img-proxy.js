/**
 * K4 Studios Image Proxy Worker
 * 
 * Routes: 
 *   /img/{id}/{size} - Proxy images from SmugMug
 *   /Galleries/.../i-* - Image page policy (bot detection, redirects)
 *   /Other/.../i-* - Image page policy (bot detection, redirects)
 * 
 * Responsibilities:
 * - Fetch + cache image-manifest.json from origin
 * - Resolve image ID to SmugMug URL with size fallback
 * - Apply bot logic (Bing capped at srcM)
 * - Fetch from SmugMug and return bytes
 * - Handle 404 policy for image pages (410 for bots, redirect for humans)
 * - Never redirect to SmugMug, never leak origin
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

// General bot pattern for image page policy
const BOT_UA_PATTERN = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|msnbot|facebookexternalhit|twitterbot|linkedinbot|applebot/i;

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
// IMAGE PAGE POLICY (for static image detail pages)
// ============================================================================

/**
 * Check if this is a search engine bot
 */
function isSearchBot(request) {
  const ua = request.headers.get('User-Agent') || '';
  return BOT_UA_PATTERN.test(ua);
}

/**
 * Check if URL is an image detail page
 * Matches: /Galleries/.../i-XXXXX or /Other/.../i-XXXXX
 */
function isImagePageRoute(pathname) {
  return /\/(Galleries|Other)\/.*\/i-[a-zA-Z0-9]+\/?$/.test(pathname);
}

/**
 * Extract image ID from page URL
 */
function extractImageId(pathname) {
  const match = pathname.match(/(i-[a-zA-Z0-9]+)\/?$/);
  return match ? match[1] : null;
}

/**
 * Get parent gallery path (strip the /i-XXXXX from end)
 */
function getParentGallery(pathname) {
  return pathname.replace(/\/i-[a-zA-Z0-9]+\/?$/, '');
}

/**
 * Handle image page policy
 * - If image exists in manifest → pass through to origin (static page)
 * - If image doesn't exist + bot → 410 Gone
 * - If image doesn't exist + human → 302 redirect to parent gallery
 */
async function handleImagePagePolicy(request, pathname, ctx) {
  const imageId = extractImageId(pathname);
  
  if (!imageId) {
    // Not a valid image page URL, pass through
    return null;
  }
  
  try {
    const manifest = await getManifest(ctx);
    
    // Check if image exists in manifest
    if (manifest[imageId]) {
      // Image exists → let it pass through to static page
      return null;
    }
    
    // Image doesn't exist → apply policy
    const parentGallery = getParentGallery(pathname);
    
    if (isSearchBot(request)) {
      // Bots get 410 Gone so they de-index the URL
      return new Response('Gone', {
        status: 410,
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'public, max-age=86400' // Cache 410 for 1 day
        }
      });
    } else {
      // Humans get redirected to parent gallery
      return Response.redirect(`https://www.k4studios.com${parentGallery}`, 302);
    }
    
  } catch (error) {
    console.error('Image page policy error:', error);
    // On error, pass through to origin
    return null;
  }
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

/**
 * Parse /img/{id}/{size} route
 */
function parseImageRoute(pathname) {
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
  
  // Check for image page routes first (Galleries/Other with /i-XXXXX)
  if (isImagePageRoute(url.pathname)) {
    const policyResponse = await handleImagePagePolicy(request, url.pathname, ctx);
    if (policyResponse) {
      // Policy returned a response (410 or redirect)
      return policyResponse;
    }
    // Policy returned null → pass through to origin for static page
    return fetch(request);
  }
  
  // Only handle /img/* routes for image proxying
  if (!url.pathname.startsWith('/img/')) {
    return new Response('Not Found', { status: 404 });
  }
  
  // Parse route
  const route = parseImageRoute(url.pathname);
  
  if (!route) {
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
      return new Response('Image not found', { 
        status: 404,
        headers: { 'Cache-Control': 'max-age=60' } // Short cache for 404s
      });
    }
    
    // Fetch and return image
    return await proxyImage(smugMugUrl, request);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Fail closed - never redirect to SmugMug
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
