/**
 * Smart 404 Lookup - Returns redirect URL for moved images
 * 
 * This is a lightweight function called by 404.astro to check
 * if an image ID exists in another gallery location.
 */

const imageIdMap = require('./imageIdMap.json');

exports.handler = async (event) => {
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
