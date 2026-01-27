/**
 * warm-image-cache.mjs
 * 
 * Pre-warms Cloudflare edge cache for critical front-door images.
 * Runs after deploy, throttled to once every 6 hours unless --force.
 * 
 * Usage:
 *   node scripts/warm-image-cache.mjs          # Respects 6-hour throttle
 *   node scripts/warm-image-cache.mjs --force  # Bypass throttle
 * 
 * What it warms:
 * - Homepage carousel images (first 10)
 * - Section tombstone images
 * - Gallery preview strip (first 6) for Painterly galleries
 * - Hero images for landing pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// CONFIGURATION
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WARM_INTERVAL_HOURS = 6;
const LAST_WARM_PATH = path.join(__dirname, '.image-warm-last.json');
const MANIFEST_URL = 'https://k4studios.com/image-manifest.json';
const CAROUSEL_POOLS_PATH = path.join(__dirname, '..', 'public', 'carouselPools.json');
const BASE_URL = 'https://k4studios.com';

// Concurrency control
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 500;

// ============================================================================
// THROTTLE CHECK
// ============================================================================

function shouldRun(forceRun) {
  if (forceRun) {
    console.log('🔓 --force flag detected, bypassing throttle');
    return true;
  }

  if (!fs.existsSync(LAST_WARM_PATH)) {
    return true;
  }

  try {
    const data = JSON.parse(fs.readFileSync(LAST_WARM_PATH, 'utf8'));
    const lastWarm = data.lastWarm || 0;
    const hoursSince = (Date.now() - lastWarm) / (1000 * 60 * 60);

    if (hoursSince < WARM_INTERVAL_HOURS) {
      console.log(`⏳ Skipping image warm: Only ${hoursSince.toFixed(2)} hours since last warm.`);
      console.log(`   Interval is ${WARM_INTERVAL_HOURS} hours. Use --force to override.`);
      return false;
    }
  } catch {
    // If file is corrupted, proceed with warming
  }

  return true;
}

function updateLastWarmTime() {
  fs.writeFileSync(LAST_WARM_PATH, JSON.stringify({ lastWarm: Date.now() }));
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractImageId(src) {
  if (!src) return null;
  
  // Already a proxy URL: /img/i-XXXXX/s
  const proxyMatch = src.match(/\/img\/(i-[a-zA-Z0-9-]+)\//);
  if (proxyMatch) return proxyMatch[1];
  
  // SmugMug URL with image ID
  const smugMatch = src.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (smugMatch) return smugMatch[1];
  
  return null;
}

function buildWarmUrl(imageId, size) {
  return `${BASE_URL}/img/${imageId}/${size}`;
}

// ============================================================================
// DATA LOADERS
// ============================================================================

async function loadCarouselPools() {
  try {
    const content = fs.readFileSync(CAROUSEL_POOLS_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.warn('⚠️ Could not load carouselPools.json:', err.message);
    return { pools: {} };
  }
}

async function loadLandingStones() {
  // Import the landing tombstone data
  const stones = [];
  
  try {
    // Home landing
    const homePath = path.join(__dirname, '..', 'src', 'data', 'home', 'landingstones.ts');
    if (fs.existsSync(homePath)) {
      const content = fs.readFileSync(homePath, 'utf8');
      const thumbMatches = [...content.matchAll(/thumb:\s*['"`]([^'"`]+)['"`]/g)];
      for (const m of thumbMatches) {
        const id = extractImageId(m[1]);
        if (id) stones.push({ id, source: 'home' });
      }
    }
  } catch {}
  
  try {
    // Galleries landing
    const galPath = path.join(__dirname, '..', 'src', 'data', 'Galleries', 'landingstones.ts');
    if (fs.existsSync(galPath)) {
      const content = fs.readFileSync(galPath, 'utf8');
      const thumbMatches = [...content.matchAll(/thumb:\s*['"`]([^'"`]+)['"`]/g)];
      for (const m of thumbMatches) {
        const id = extractImageId(m[1]);
        if (id) stones.push({ id, source: 'galleries' });
      }
    }
  } catch {}
  
  try {
    // Painterly landing
    const paintPath = path.join(__dirname, '..', 'src', 'data', 'Galleries', 'Painterly-Fine-Art-Photography', 'landingstones.ts');
    if (fs.existsSync(paintPath)) {
      const content = fs.readFileSync(paintPath, 'utf8');
      const thumbMatches = [...content.matchAll(/thumb:\s*['"`]([^'"`]+)['"`]/g)];
      for (const m of thumbMatches) {
        const id = extractImageId(m[1]);
        if (id) stones.push({ id, source: 'painterly' });
      }
    }
  } catch {}
  
  return stones;
}

async function loadGalleryPreviewImages() {
  // Load first 6 images from each major Painterly gallery for preview strip warming
  const images = [];
  
  const galleryPaths = [
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs',
    'Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs',
  ];
  
  for (const relPath of galleryPaths) {
    const fullPath = path.join(__dirname, '..', 'src', 'data', relPath);
    if (!fs.existsSync(fullPath)) continue;
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Extract image IDs - find first 6 real images (skip i-k4studios placeholder)
      const idMatches = [...content.matchAll(/"id"\s*:\s*"(i-[a-zA-Z0-9-]+)"/g)];
      let count = 0;
      for (const m of idMatches) {
        if (m[1] === 'i-k4studios') continue;
        if (count >= 6) break;
        images.push({ id: m[1], source: relPath, position: count });
        count++;
      }
    } catch {}
  }
  
  return images;
}

// ============================================================================
// WARMING LOGIC
// ============================================================================

async function warmUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'K4-Cache-Warmer/1.0',
        'Accept': 'image/*'
      }
    });
    return { url, status: res.status, ok: res.ok };
  } catch (err) {
    return { url, status: 0, ok: false, error: err.message };
  }
}

async function warmBatch(urls) {
  const results = await Promise.all(urls.map(u => warmUrl(u)));
  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const forceRun = process.argv.includes('--force');
  
  if (!shouldRun(forceRun)) {
    return;
  }
  
  console.log('🔥 Starting image cache warm...\n');
  
  const urlsToWarm = new Set();
  
  // 1. Carousel images (first 10 from each pool, at 'm' size for ImageBar)
  console.log('📸 Loading carousel pools...');
  const carouselData = await loadCarouselPools();
  let carouselCount = 0;
  
  for (const [poolName, images] of Object.entries(carouselData.pools || {})) {
    const poolImages = images.slice(0, 10);
    for (const img of poolImages) {
      const id = img.id || extractImageId(img.src || img.srcM);
      if (id) {
        urlsToWarm.add(buildWarmUrl(id, 'm'));  // Carousel uses 'm' size
        carouselCount++;
      }
    }
  }
  console.log(`   Added ${carouselCount} carousel images`);
  
  // 2. Tombstone thumbnails (at 's' size)
  console.log('🪦 Loading tombstone thumbnails...');
  const stones = await loadLandingStones();
  for (const stone of stones) {
    urlsToWarm.add(buildWarmUrl(stone.id, 's'));
  }
  console.log(`   Added ${stones.length} tombstone images`);
  
  // 3. Gallery preview strips (first 6 at 's' for display, 'l' for click-through)
  console.log('🖼️  Loading gallery preview images...');
  const previewImages = await loadGalleryPreviewImages();
  for (const img of previewImages) {
    urlsToWarm.add(buildWarmUrl(img.id, 's'));  // Preview strip display
    if (img.position === 0) {
      urlsToWarm.add(buildWarmUrl(img.id, 'l'));  // First image also at 'l' for viewer
    }
  }
  console.log(`   Added ${previewImages.length} preview strip images`);
  
  // Convert to array and warm in batches
  const allUrls = [...urlsToWarm];
  console.log(`\n🚀 Warming ${allUrls.length} unique URLs in batches of ${BATCH_SIZE}...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
    const batch = allUrls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allUrls.length / BATCH_SIZE);
    
    process.stdout.write(`   Batch ${batchNum}/${totalBatches}... `);
    
    const results = await warmBatch(batch);
    const batchSuccess = results.filter(r => r.ok).length;
    const batchFail = results.filter(r => !r.ok).length;
    
    successCount += batchSuccess;
    failCount += batchFail;
    
    console.log(`✓ ${batchSuccess} ok, ${batchFail} failed`);
    
    // Log any failures
    for (const r of results.filter(r => !r.ok)) {
      console.log(`      ❌ ${r.url} → ${r.status} ${r.error || ''}`);
    }
    
    if (i + BATCH_SIZE < allUrls.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }
  
  // Update last warm time
  updateLastWarmTime();
  
  console.log(`\n✅ Cache warm complete!`);
  console.log(`   Success: ${successCount} | Failed: ${failCount}`);
  console.log(`   Next warm allowed in ${WARM_INTERVAL_HOURS} hours (or use --force)`);
}

main().catch(err => {
  console.error('❌ Cache warm failed:', err);
  process.exit(1);
});
