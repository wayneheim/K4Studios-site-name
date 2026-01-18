/**
 * Build-time script to generate an image ID → gallery path map.
 * 
 * This is used by:
 * 1. The 404.astro page (SSR) to redirect broken image URLs with proper 301
 * 2. The smart-404 serverless function as a fallback
 * 
 * Usage: node scripts/generate-image-id-map.cjs
 * Output: 
 *   - src/data/imageIdMap.json (for Astro SSR)
 *   - netlify/functions/imageIdMap.json (for serverless function)
 */

const fs = require('fs');
const path = require('path');

const MASTER_DATA_PATH = path.join(__dirname, '../src/data/galleryMaps/MasterGalleryData.mjs');
const OUTPUT_PATH_FUNCTIONS = path.join(__dirname, '../netlify/functions/imageIdMap.json');
const OUTPUT_PATH_SRC = path.join(__dirname, '../src/data/imageIdMap.json');

async function generateImageIdMap() {
  console.log('📍 Generating image ID map for smart-404...');
  
  // Dynamic import of ES module
  const masterData = await import('file://' + MASTER_DATA_PATH);
  const galleryDataMap = masterData.galleryDataMap;
  
  // Build id → first gallery path map
  const imageIdMap = {};
  let imageCount = 0;
  let duplicateCount = 0;
  
  for (const [galleryPath, images] of Object.entries(galleryDataMap)) {
    for (const img of images) {
      if (!img.id) continue;
      
      // Normalize gallery path to URL format
      const urlPath = galleryPath.startsWith('/') ? galleryPath : '/' + galleryPath;
      
      if (!imageIdMap[img.id]) {
        // First occurrence - store the gallery path
        imageIdMap[img.id] = urlPath;
        imageCount++;
      } else {
        // Duplicate - already have this ID mapped
        duplicateCount++;
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
  console.log(`   - ${imageCount} unique image IDs`);
  console.log(`   - ${duplicateCount} duplicates (using first occurrence)`);
  console.log(`   - File size: ${fileSizeKB} KB`);
  console.log(`   - Written to: src/data/ and netlify/functions/`);
}

generateImageIdMap().catch(err => {
  console.error('❌ Error generating image ID map:', err);
  process.exit(1);
});
