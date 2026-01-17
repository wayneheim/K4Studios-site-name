/**
 * Build-time script to generate an image ID → gallery path map.
 * 
 * This is used by the smart-404 serverless function to redirect
 * broken image URLs to the correct gallery location.
 * 
 * Usage: node scripts/generate-image-id-map.cjs
 * Output: netlify/functions/imageIdMap.json
 */

const fs = require('fs');
const path = require('path');

const MASTER_DATA_PATH = path.join(__dirname, '../src/data/galleryMaps/MasterGalleryData.mjs');
const OUTPUT_PATH = path.join(__dirname, '../netlify/functions/imageIdMap.json');

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
  
  // Write the map
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(imageIdMap, null, 0)); // Minified for size
  
  const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  
  console.log(`✅ Generated imageIdMap.json:`);
  console.log(`   - ${imageCount} unique image IDs`);
  console.log(`   - ${duplicateCount} duplicates (using first occurrence)`);
  console.log(`   - File size: ${fileSizeKB} KB`);
}

generateImageIdMap().catch(err => {
  console.error('❌ Error generating image ID map:', err);
  process.exit(1);
});
