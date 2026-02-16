/**
 * purgeGalleryCache.cjs
 * 
 * Netlify function to purge CF cache for a specific gallery's images.
 * Called from Gallery Editor Pro when user clicks "Refresh Image Cache".
 * 
 * POST body: { galleryPath: "/Galleries/..." }
 * 
 * Requires environment variables:
 *   CF_ZONE_ID - Cloudflare zone ID
 *   CF_API_TOKEN - Cloudflare API token with cache purge permissions
 */

const fs = require('fs');
const path = require('path');

const SIZES = ['s', 'm', 'l', 'xl'];
const BASE_URL = 'https://k4studios.com';

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Parse body
  let galleryPath;
  try {
    const body = JSON.parse(event.body || '{}');
    galleryPath = body.galleryPath;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!galleryPath || !galleryPath.startsWith('/')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'galleryPath required' }) };
  }

  // Check env vars
  const ZONE_ID = process.env.CF_ZONE_ID;
  const API_TOKEN = process.env.CF_API_TOKEN;

  if (!ZONE_ID || !API_TOKEN) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Server missing CF_ZONE_ID or CF_API_TOKEN' }) 
    };
  }

  // Load gallery data to get image IDs
  // galleryPath: /Galleries/Painterly.../Color → /src/data/Galleries/Painterly.../Color.mjs
  // Try direct file first, then nested pattern
  let imageIds = [];
  
  try {
    // Convert URL path to data file path patterns
    const dataPathDirect = path.join(process.cwd(), 'src', 'data', galleryPath + '.mjs');
    const lastSegment = galleryPath.split('/').pop();
    const dataPathNested = path.join(process.cwd(), 'src', 'data', galleryPath, lastSegment + '.mjs');
    
    let content = '';
    if (fs.existsSync(dataPathDirect)) {
      content = fs.readFileSync(dataPathDirect, 'utf8');
    } else if (fs.existsSync(dataPathNested)) {
      content = fs.readFileSync(dataPathNested, 'utf8');
    } else {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ 
          error: 'Gallery data file not found',
          tried: [dataPathDirect, dataPathNested]
        }) 
      };
    }

    // Extract image IDs
    const matches = [...content.matchAll(/"id"\s*:\s*"(i-[a-zA-Z0-9-]+)"/g)];
    imageIds = matches
      .map(m => m[1])
      .filter(id => id !== 'i-k4studios');

  } catch (err) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to load gallery data', message: err.message }) 
    };
  }

  if (!imageIds.length) {
    return { statusCode: 200, body: JSON.stringify({ purged: 0, message: 'No images found in gallery' }) };
  }

  // Build URLs for all sizes
  const urlsToPurge = [];
  for (const id of imageIds) {
    for (const size of SIZES) {
      urlsToPurge.push(`${BASE_URL}/img/${id}/${size}`);
    }
  }

  // Purge via CF API (max 30 URLs per request)
  const BATCH_SIZE = 30;
  let purged = 0;
  const errors = [];

  for (let i = 0; i < urlsToPurge.length; i += BATCH_SIZE) {
    const batch = urlsToPurge.slice(i, i + BATCH_SIZE);
    
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: batch }),
      });
      
      const data = await res.json();
      if (data.success) {
        purged += batch.length;
      } else {
        errors.push({ batch: i / BATCH_SIZE + 1, errors: data.errors });
      }
    } catch (err) {
      errors.push({ batch: i / BATCH_SIZE + 1, error: err.message });
    }
  }

  // Optionally re-warm the cache (first 12 images at s and l)
  const warmCount = Math.min(12, imageIds.length);
  let warmed = 0;
  
  // Small delay for purge to propagate
  await new Promise(r => setTimeout(r, 1000));
  
  const warmPromises = [];
  for (let i = 0; i < warmCount; i++) {
    const id = imageIds[i];
    warmPromises.push(
      fetch(`${BASE_URL}/img/${id}/s`, { headers: { 'User-Agent': 'K4-Cache-Warmer/1.0' } })
        .then(r => r.ok && warmed++)
        .catch(() => {})
    );
    warmPromises.push(
      fetch(`${BASE_URL}/img/${id}/l`, { headers: { 'User-Agent': 'K4-Cache-Warmer/1.0' } })
        .then(r => r.ok && warmed++)
        .catch(() => {})
    );
  }
  await Promise.all(warmPromises);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      images: imageIds.length,
      purged,
      warmed,
      errors: errors.length ? errors : undefined
    })
  };
};
