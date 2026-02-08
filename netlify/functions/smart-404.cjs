/**
 * Smart 404 Handler for Image Pages
 * 
 * This serverless function handles 404s for image pages (/Galleries/.../i-xxxxx).
 * It looks up the image ID in a pre-built map and either:
 * 1. Redirects to the correct gallery if the image moved (301)
 * 2. For NOT FOUND images:
 *    - Bots get 410 Gone (removes ghost URLs from index)
 *    - Humans get 302 redirect to gallery landing (good UX)
 * 
 * This function ONLY runs on actual 404s, not on every page load.
 */

const imageIdMap = require('./imageIdMap.json');

// Build case-insensitive lookup map
const imageIdMapLower = {};
for (const [key, value] of Object.entries(imageIdMap)) {
  imageIdMapLower[key.toLowerCase()] = { path: value, originalId: key };
}

// Detect search engine bots by User-Agent
function isBot(userAgent) {
  if (!userAgent) return false;
  const botPattern = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|msnbot|ahrefsbot|semrushbot|petalbot/i;
  return botPattern.test(userAgent);
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
  const isBotRequest = isBot(userAgent);
  
  // Get path from query string (passed by _redirects) or from event.path
  const queryPath = event.queryStringParameters?.path || '';
  const eventPath = event.path || '';
  const requestedPath = queryPath || eventPath;
  
  // Also get the image ID directly from query params if available
  const queryId = event.queryStringParameters?.id || '';
  
  console.log(`[smart-404] Event path: ${eventPath}`);
  console.log(`[smart-404] Query path: ${queryPath}`);
  console.log(`[smart-404] Query id: ${queryId}`);
  console.log(`[smart-404] Using path: ${requestedPath}`);
  
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
    const redirectUrl = `${correctGalleryPath}/${canonicalImageId}`;
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
    // Bot: Return 410 Gone to remove ghost URL from index
    console.log(`[smart-404] Bot detected, returning 410 Gone for: ${imageId}`);
    
    return {
      statusCode: 410,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day (safer than 1 year)
        'X-Smart-404': 'gone-bot'
      },
      body: '<!DOCTYPE html><html><head><title>Gone</title></head><body><h1>410 Gone</h1><p>This image has been permanently removed.</p></body></html>'
    };
  }
  
  // Human: Redirect to gallery landing page for good UX
  if (galleryLandingPath && galleryLandingPath !== requestedPath) {
    console.log(`[smart-404] Human visitor, redirecting to gallery: ${galleryLandingPath}`);
    
    return {
      statusCode: 302,
      headers: {
        'Location': galleryLandingPath,
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
      'Location': '/',
      'Cache-Control': 'no-cache',
      'X-Smart-404': 'homepage-fallback'
    },
    body: ''
  };
};
