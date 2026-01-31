/**
 * Build-time script to generate an image ID → gallery path map.
 * 
 * This is used by:
 * 1. The 404.astro page (SSR) to redirect broken image URLs with proper 301
 * 2. The smart-404 serverless function as a fallback
 * 
 * IMPORTANT: Hidden images (visibility: "hidden", "non", "none", "") are SKIPPED.
 * This ensures 301 redirects point to VISIBLE locations only.
 * When an image is hidden, it should be copied to Archive.mjs with visibility: "show"
 * so the 301 redirector finds the Archive as the canonical location.
 * 
 * Usage: node scripts/generate-image-id-map.cjs
 * Output: 
 *   - src/data/imageIdMap.json (for Astro SSR - visible images only)
 *   - netlify/functions/imageIdMap.json (for serverless function)
 */

const fs = require('fs');
const path = require('path');

const MASTER_DATA_PATH = path.join(__dirname, '../src/data/galleryMaps/MasterGalleryData.mjs');
const OUTPUT_PATH_FUNCTIONS = path.join(__dirname, '../netlify/functions/imageIdMap.json');
const OUTPUT_PATH_SRC = path.join(__dirname, '../src/data/imageIdMap.json');

// Values that mean "hidden" (not including "ghost" which is different)
const HIDDEN_VISIBILITY = ['hidden', 'non', 'none', ''];

function isHidden(visibility) {
  const val = (visibility || 'show').toLowerCase().trim();
  return HIDDEN_VISIBILITY.includes(val);
}

async function generateImageIdMap() {
  console.log('📍 Generating image ID map for smart-404...');
  console.log('   (Skipping hidden images - they should be in Archive)');
  
  // Dynamic import of ES module
  const masterData = await import('file://' + MASTER_DATA_PATH);
  const galleryDataMap = masterData.galleryDataMap;
  
  // Build id → array of ALL VISIBLE gallery paths
  // An image can legitimately exist in multiple galleries (e.g., Fine-Art and Painterly versions)
  const imageIdMap = {};
  let imageCount = 0;
  let additionalPaths = 0;
  let hiddenCount = 0;
  
  for (const [galleryPath, images] of Object.entries(galleryDataMap)) {
    for (const img of images) {
      if (!img.id) continue;
      
      // Skip hidden images - they should be in Archive.mjs with visibility: show
      if (isHidden(img.visibility)) {
        hiddenCount++;
        continue;
      }
      
      // Normalize gallery path to URL format
      const urlPath = galleryPath.startsWith('/') ? galleryPath : '/' + galleryPath;
      
      if (!imageIdMap[img.id]) {
        // First visible occurrence - store as array
        imageIdMap[img.id] = [urlPath];
        imageCount++;
      } else {
        // Additional gallery - add to array if not already present
        if (!imageIdMap[img.id].includes(urlPath)) {
          imageIdMap[img.id].push(urlPath);
          additionalPaths++;
        }
      }
    }
  }
  
  // Write the map to both locations
  const jsonContent = JSON.stringify(imageIdMap, null, 0); // Minified for size
  
  fs.mkdirSync(path.dirname(OUTPUT_PATH_FUNCTIONS), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH_FUNCTIONS, jsonContent);
  
  fs.mkdirSync(path.dirname(OUTPUT_PATH_SRC), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH_SRC, jsonContent);
  
  const fileSizeKB = (fs.statSync(OUTPUT_PATH_SRC).size / 1024).toFixed(1);
  
  console.log(`✅ Generated imageIdMap.json:`);
  console.log(`   - ${imageCount} unique VISIBLE image IDs`);
  console.log(`   - ${hiddenCount} hidden images skipped`);
  console.log(`   - ${additionalPaths} additional gallery paths (images in multiple galleries)`);
  console.log(`   - File size: ${fileSizeKB} KB`);
  console.log(`   - Written to: src/data/ and netlify/functions/`);
}

generateImageIdMap().catch(err => {
  console.error('❌ Error generating image ID map:', err);
  process.exit(1);
});
