/**
 * Generate Gallery Prefetch Map
 * 
 * Creates a lightweight JSON map of gallery paths → first 9 image IDs
 * Used for pre-warming images on theme/gallery click before navigation.
 * 
 * Output: public/galleryPrefetchMap.json
 */

const fs = require('fs');
const path = require('path');

const masterPath = path.resolve(__dirname, '../src/data/galleryMaps/MasterGalleryData.mjs');
const outputPath = path.resolve(__dirname, '../public/galleryPrefetchMap.json');

console.log('🔥 Generating gallery prefetch map...\n');

// Read and parse MasterGalleryData
const masterContent = fs.readFileSync(masterPath, 'utf-8');

// Extract galleryDataMap object
const mapMatch = masterContent.match(/export const galleryDataMap\s*=\s*(\{[\s\S]*?\n\};)/);
if (!mapMatch) {
  console.error('❌ Could not parse galleryDataMap from MasterGalleryData.mjs');
  process.exit(1);
}

// Use Function constructor to evaluate (safer than eval)
let galleryDataMap;
try {
  galleryDataMap = new Function(`return ${mapMatch[1].replace(/\};$/, '}')}`)();
} catch (e) {
  console.error('❌ Failed to parse galleryDataMap:', e.message);
  process.exit(1);
}

// Build prefetch map: path → first 9 image IDs (for 's' size warming)
const prefetchMap = {};
let totalGalleries = 0;
let totalImages = 0;

for (const [galleryPath, images] of Object.entries(galleryDataMap)) {
  if (!Array.isArray(images) || images.length === 0) continue;
  
  // Skip Archive
  if (galleryPath.includes('/Other/Archive')) continue;
  
  // Get first 9 visible images
  const visibleImages = images.filter((img) => {
    const visibility = String(img?.visibility ?? '').trim().toLowerCase();
    return visibility === 'show' || visibility === 'normal';
  });
  const first9 = visibleImages.slice(0, 9).map(img => img.id);
  
  if (first9.length > 0) {
    prefetchMap[galleryPath] = first9;
    totalGalleries++;
    totalImages += first9.length;
  }
}

// Write output
fs.writeFileSync(outputPath, JSON.stringify(prefetchMap, null, 2));

console.log(`✅ Generated ${outputPath}`);
console.log(`   ${totalGalleries} galleries`);
console.log(`   ${totalImages} total image IDs (avg ${(totalImages / totalGalleries).toFixed(1)} per gallery)`);
