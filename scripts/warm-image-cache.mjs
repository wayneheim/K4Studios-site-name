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
 * - Gallery preview pool (12 images per gallery, seeded shuffle)
 *   - All 12 at 's' size (client picks 6 for variety)
 *   - Hero (first in pool) also at 'l' for click-through
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
  // Scan ALL landingstones.ts files in the data directory
  // PRIORITY: Use explicit imageId field first, fallback to regex extraction
  const stones = [];
  const failures = [];
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  
  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name === 'landingstones.ts') {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relPath = path.relative(dataDir, fullPath);
            
            // PRIMARY: Extract explicit imageId fields (canonical source of truth)
            const imageIdMatches = [...content.matchAll(/imageId:\s*['"`](i-[a-zA-Z0-9-]+)['"`]/g)];
            for (const m of imageIdMatches) {
              stones.push({ id: m[1], source: relPath, method: 'imageId' });
            }
            
            // FALLBACK: Extract from thumb URLs (for entries not yet normalized)
            const thumbMatches = [...content.matchAll(/thumb:\s*['"`]([^'"`]+)['"`]/g)];
            for (const m of thumbMatches) {
              const thumbUrl = m[1];
              // Skip if this is a local static image
              if (thumbUrl.startsWith('/images/')) continue;
              
              const id = extractImageId(thumbUrl);
              if (id) {
                // Check if we already have this ID from imageId field
                if (!stones.some(s => s.id === id && s.source === relPath)) {
                  stones.push({ id, source: relPath, method: 'thumb-regex' });
                }
              } else if (!thumbUrl.startsWith('/images/')) {
                // HARD FAIL: thumb URL exists but ID cannot be extracted
                failures.push({ file: relPath, url: thumbUrl });
              }
            }
            
            // Also check thumbs arrays
            const thumbsArrayMatches = [...content.matchAll(/["'`](\/img\/i-[a-zA-Z0-9-]+\/s)["'`]/g)];
            for (const m of thumbsArrayMatches) {
              const id = extractImageId(m[1]);
              if (id && !stones.some(s => s.id === id && s.source === relPath)) {
                stones.push({ id, source: relPath, method: 'thumbs-array' });
              }
            }
          } catch (err) {
            console.warn(`⚠️ Error reading ${fullPath}: ${err.message}`);
          }
        }
      }
    } catch {}
  }
  
  scanDir(dataDir);
  
  // Report failures - these are silent bugs that must be fixed
  if (failures.length > 0) {
    console.error('\n❌ CRITICAL: Failed to extract image IDs from these entries:');
    for (const f of failures) {
      console.error(`   ${f.file}: ${f.url.substring(0, 60)}...`);
    }
    console.error('\n   Run: node scripts/normalize-landingstones.cjs to fix\n');
  }
  
  return { stones, failures };
}

async function loadGalleryPreviewImages() {
  // Load the 12 images that form each gallery's preview pool
  // Uses seeded shuffle matching GalleryPreviewStrip.astro
  // First image in each pool = hero, warmed at 'l'
  const images = [];
  
  // AUTO-DISCOVER all gallery .mjs files instead of hardcoding
  const galleriesDir = path.join(__dirname, '..', 'src', 'data', 'Galleries');
  const galleryPaths = [];
  
  function scanForGalleries(dir, relativePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          scanForGalleries(fullPath, relPath);
        } else if (entry.name.endsWith('.mjs') && !entry.name.startsWith('_')) {
          // Skip non-gallery files like index.mjs, utils.mjs etc
          const content = fs.readFileSync(fullPath, 'utf8');
          // Only include if it exports galleryData with image objects
          if (content.includes('export const galleryData') && content.includes('"id"')) {
            galleryPaths.push(`Galleries/${relPath}`);
          }
        }
      }
    } catch {}
  }
  
  scanForGalleries(galleriesDir);
  console.log(`   Found ${galleryPaths.length} gallery data files`);
  
  const POOL_SIZE = 12; // Match GalleryPreviewStrip.astro
  
  // Seeded shuffle matching GalleryPreviewStrip.astro
  function seededShuffle(arr, seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    
    const seededRandom = () => {
      let t = hash += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    
    return arr
      .map(value => ({ value, sort: seededRandom() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }
  
  for (const relPath of galleryPaths) {
    const fullPath = path.join(__dirname, '..', 'src', 'data', relPath);
    if (!fs.existsSync(fullPath)) continue;
    
    // Convert mjs path to URL path for seed (matching GalleryPreviewStrip logic)
    const urlPath = '/' + relPath.replace('.mjs', '').replace(/\\/g, '/');
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Extract all image IDs (skip i-k4studios placeholder and ghost images)
      const idMatches = [...content.matchAll(/"id"\s*:\s*"(i-[a-zA-Z0-9-]+)"/g)];
      const allIds = idMatches
        .map(m => m[1])
        .filter(id => id !== 'i-k4studios');
      
      // Apply same seeded shuffle as GalleryPreviewStrip, take pool of 12
      const shuffled = seededShuffle(allIds, urlPath);
      const poolIds = shuffled.slice(0, POOL_SIZE);
      
      for (let i = 0; i < poolIds.length; i++) {
        images.push({ 
          id: poolIds[i], 
          source: relPath, 
          position: i,
          isHero: i === 0 // First in pool is the hero image
        });
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
    process.exit(0);
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
  const { stones, failures } = await loadLandingStones();
  
  // Count by extraction method for visibility
  const byImageId = stones.filter(s => s.method === 'imageId').length;
  const byRegex = stones.filter(s => s.method === 'thumb-regex').length;
  const byArray = stones.filter(s => s.method === 'thumbs-array').length;
  
  for (const stone of stones) {
    urlsToWarm.add(buildWarmUrl(stone.id, 's'));
  }
  console.log(`   Added ${stones.length} tombstone images (${byImageId} via imageId, ${byRegex} via regex, ${byArray} via array)`);
  
  if (failures.length > 0) {
    console.log(`   ⚠️  ${failures.length} entries could not be parsed - run normalize-landingstones.cjs`);
  }
  
  // 3. Gallery preview pools (12 candidates at 's', hero at 'l')
  // Client picks 6 from the warm pool for variety
  console.log('🖼️  Loading gallery preview images...');
  const previewImages = await loadGalleryPreviewImages();
  for (const img of previewImages) {
    urlsToWarm.add(buildWarmUrl(img.id, 's'));  // All 12 in pool at thumbnail size
    if (img.isHero) {
      urlsToWarm.add(buildWarmUrl(img.id, 'l'));  // Hero image also at viewer size
    }
  }
  console.log(`   Added ${previewImages.length} preview pool images (${previewImages.filter(i => i.isHero).length} heroes at 'l')`);
  
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
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Cache warm failed:', err);
  process.exit(1);
});
