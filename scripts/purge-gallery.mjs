/**
 * purge-gallery.mjs
 * 
 * Purge CF cache for a specific gallery's images, then optionally re-warm.
 * Use this after editing images in SmugMug (same IDs, updated content).
 * 
 * Usage:
 *   node scripts/purge-gallery.mjs "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"
 *   node scripts/purge-gallery.mjs "/Galleries/.../Color" --warm   # Purge + re-warm
 *   node scripts/purge-gallery.mjs "/Galleries/.../Color" --dry    # Show what would be purged
 * 
 * Requires CF_ZONE_ID and CF_API_TOKEN environment variables.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZONE_ID = process.env.CF_ZONE_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const BASE_URL = 'https://k4studios.com';
const SIZES = ['s', 'm', 'l', 'xl'];

// ============================================================================
// PARSE ARGS
// ============================================================================

const args = process.argv.slice(2);
const galleryPath = args.find(a => a.startsWith('/'));
const dryRun = args.includes('--dry');
const reWarm = args.includes('--warm');

if (!galleryPath) {
  console.log(`
Usage: node scripts/purge-gallery.mjs <gallery-path> [options]

Options:
  --dry    Show what would be purged without actually purging
  --warm   Re-warm the cache after purging

Examples:
  node scripts/purge-gallery.mjs "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"
  node scripts/purge-gallery.mjs "/Galleries/.../Civil-War-Portraits/Black-White" --warm
  node scripts/purge-gallery.mjs "/Galleries/.../WWII/Portraits/Color" --dry
`);
  process.exit(1);
}

if (!dryRun && (!ZONE_ID || !API_TOKEN)) {
  console.error('❌ Missing CF_ZONE_ID or CF_API_TOKEN environment variables');
  console.error('   Set these in your environment or .env file');
  process.exit(1);
}

// ============================================================================
// LOAD GALLERY DATA
// ============================================================================

function loadGalleryImages(galleryPath) {
  // Convert URL path to data file path
  // /Galleries/Painterly.../Color → src/data/Galleries/Painterly.../Color.mjs
  const dataPath = path.join(__dirname, '..', 'src', 'data', galleryPath + '.mjs');
  
  if (!fs.existsSync(dataPath)) {
    // Try nested pattern: .../Color/Color.mjs
    const lastSegment = galleryPath.split('/').pop();
    const nestedPath = path.join(__dirname, '..', 'src', 'data', galleryPath, lastSegment + '.mjs');
    
    if (fs.existsSync(nestedPath)) {
      return extractImageIds(nestedPath);
    }
    
    console.error(`❌ Gallery data file not found:`);
    console.error(`   Tried: ${dataPath}`);
    console.error(`   Tried: ${nestedPath}`);
    process.exit(1);
  }
  
  return extractImageIds(dataPath);
}

function extractImageIds(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...content.matchAll(/"id"\s*:\s*"(i-[a-zA-Z0-9-]+)"/g)];
  return matches
    .map(m => m[1])
    .filter(id => id !== 'i-k4studios'); // Exclude placeholder
}

// ============================================================================
// PURGE LOGIC
// ============================================================================

async function purgeUrls(urls) {
  // CF API allows up to 30 URLs per request
  const BATCH_SIZE = 30;
  let purged = 0;
  
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    
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
      process.stdout.write(`   Purged ${purged}/${urls.length} URLs\r`);
    } else {
      console.error(`\n❌ Purge batch failed:`, data.errors);
    }
    
    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < urls.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  console.log(`\n✅ Purged ${purged} URLs`);
  return purged;
}

// ============================================================================
// WARM LOGIC
// ============================================================================

async function warmUrls(urls) {
  const BATCH_SIZE = 10;
  let warmed = 0;
  
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'K4-Cache-Warmer/1.0' }
        });
        if (res.ok) warmed++;
      } catch {}
    }));
    
    process.stdout.write(`   Warmed ${warmed}/${urls.length} URLs\r`);
    
    // Delay between batches
    if (i + BATCH_SIZE < urls.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  console.log(`\n✅ Warmed ${warmed} URLs`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`\n🔍 Loading gallery: ${galleryPath}\n`);
  
  const imageIds = loadGalleryImages(galleryPath);
  console.log(`   Found ${imageIds.length} images`);
  
  // Build URLs for all sizes
  const urlsToPurge = [];
  for (const id of imageIds) {
    for (const size of SIZES) {
      urlsToPurge.push(`${BASE_URL}/img/${id}/${size}`);
    }
  }
  
  console.log(`   ${urlsToPurge.length} URLs to purge (${imageIds.length} images × ${SIZES.length} sizes)\n`);
  
  if (dryRun) {
    console.log('📋 DRY RUN - Would purge:');
    // Show first 10 as sample
    urlsToPurge.slice(0, 10).forEach(u => console.log(`   ${u}`));
    if (urlsToPurge.length > 10) {
      console.log(`   ... and ${urlsToPurge.length - 10} more`);
    }
    return;
  }
  
  // Purge
  console.log('🗑️  Purging CF cache...');
  await purgeUrls(urlsToPurge);
  
  // Optionally re-warm
  if (reWarm) {
    // Small delay to let purge propagate
    console.log('\n⏳ Waiting 2s for purge to propagate...');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\n🔥 Re-warming cache...');
    // Warm 's' and 'l' sizes (most commonly used)
    const urlsToWarm = [];
    for (const id of imageIds) {
      urlsToWarm.push(`${BASE_URL}/img/${id}/s.jpg`);
      urlsToWarm.push(`${BASE_URL}/img/${id}/l.jpg`);
    }
    await warmUrls(urlsToWarm);
  }
  
  console.log('\n✨ Done!\n');
}

main().catch(err => {
  console.error('🔥 Error:', err.message);
  process.exit(1);
});
