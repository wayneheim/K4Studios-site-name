/**
 * Smart 404 Handler for Image Pages
 * 
 * This serverless function handles 404s for image pages (/Galleries/.../i-xxxxx).
 * It looks up the image ID in a pre-built map and either:
 * 1. Redirects to the correct gallery if the image moved (301)
 * 2. Redirects to the gallery landing page if not found (301)
 * 
 * This function ONLY runs on actual 404s, not on every page load.
 */

const imageIdMap = require('./imageIdMap.json');

exports.handler = async (event) => {
  const requestedPath = event.queryStringParameters?.path || event.path || '';
  
  console.log(`[smart-404] Handling: ${requestedPath}`);
  
  // Extract image ID from path (e.g., /Galleries/.../Color/i-zswx22S)
  const imageIdMatch = requestedPath.match(/\/(i-[a-zA-Z0-9]+)\/?$/);
  
  if (!imageIdMatch) {
    // Not an image page request - pass through to normal 404
    console.log(`[smart-404] No image ID found, passing to 404`);
    return {
      statusCode: 404,
      body: 'Not Found'
    };
  }
  
  const imageId = imageIdMatch[1];
  console.log(`[smart-404] Looking up image ID: ${imageId}`);
  
  // Look up the image in our map
  const correctGalleryPath = imageIdMap[imageId];
  
  if (correctGalleryPath) {
    // Found the image in a different gallery - redirect there
    const redirectUrl = `${correctGalleryPath}/${imageId}`;
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
  
  // Image not found anywhere - redirect to gallery landing page
  // Strip the /i-xxxxx part from the URL
  const galleryLandingPath = requestedPath.replace(/\/i-[a-zA-Z0-9]+\/?$/, '');
  
  if (galleryLandingPath && galleryLandingPath !== requestedPath) {
    console.log(`[smart-404] Image not found, redirecting to gallery: ${galleryLandingPath}`);
    
    return {
      statusCode: 301,
      headers: {
        'Location': galleryLandingPath,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day (image might be added later)
        'X-Smart-404': 'gallery-fallback'
      },
      body: ''
    };
  }
  
  // Fallback to homepage if we can't determine a gallery
  console.log(`[smart-404] No gallery path, redirecting to homepage`);
  return {
    statusCode: 301,
    headers: {
      'Location': '/',
      'Cache-Control': 'public, max-age=3600',
      'X-Smart-404': 'homepage-fallback'
    },
    body: ''
  };
};
