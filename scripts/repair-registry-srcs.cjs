/**
 * Repair script: Add missing src and title to seriesRegistry entries
 * 
 * This script:
 * 1. Finds registry entries missing src or title
 * 2. Looks up the image in the gallery .mjs files
 * 3. Updates the registry with the missing data
 * 
 * Run with: node scripts/repair-registry-srcs.cjs
 * Add --dry-run to preview changes without modifying files
 */

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const galleriesDir = path.join(__dirname, '..', 'src', 'data', 'Galleries');
const registryPath = path.join(__dirname, '..', 'src', 'data', 'seriesRegistry.json');

// Load registry
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Build a map of imageId -> {src, title} from all gallery files
const imageDataMap = new Map();

function findMjsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMjsFiles(fullPath, files);
    } else if (entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log('🔍 Scanning gallery files for image data...');
const mjsFiles = findMjsFiles(galleriesDir);

for (const file of mjsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Try to dynamically import the module and parse it
  // For now, use regex to find objects with id fields
  
  // Extract the array content between the [ and ]
  const arrayMatch = content.match(/export\s+const\s+\w+\s*=\s*\[([\s\S]*)\];?\s*$/);
  if (!arrayMatch) continue;
  
  // Find all image objects by looking for { ... } patterns with id fields
  // Split by objects - find each object block
  const arrayContent = arrayMatch[1];
  
  // Match each image ID and its surrounding content
  // Use a simpler approach: find each "id": "i-xxx" and extract the whole object
  const lines = content.split('\n');
  let currentId = null;
  let currentSrc = null;
  let currentSrcXL = null;
  let currentSrcL = null;
  let currentTitle = null;
  
  for (const line of lines) {
    // Check for id
    const idMatch = line.match(/["']?id["']?\s*:\s*["'](i-[^"']+)["']/);
    if (idMatch) {
      // Save previous entry if we have one
      if (currentId && (currentSrc || currentSrcXL || currentSrcL || currentTitle)) {
        imageDataMap.set(currentId, {
          src: currentSrcXL || currentSrcL || currentSrc,
          title: currentTitle
        });
      }
      currentId = idMatch[1];
      currentSrc = null;
      currentSrcXL = null;
      currentSrcL = null;
      currentTitle = null;
    }
    
    // Check for src fields (handle URLs with special chars)
    const srcXLMatch = line.match(/["']?srcXL["']?\s*:\s*["'](.+?)["']\s*,?\s*$/);
    if (srcXLMatch) currentSrcXL = srcXLMatch[1];
    
    const srcLMatch = line.match(/["']?srcL["']?\s*:\s*["'](.+?)["']\s*,?\s*$/);
    if (srcLMatch) currentSrcL = srcLMatch[1];
    
    const srcMatch = line.match(/["']?src["']?\s*:\s*["'](https?:\/\/.+?)["']\s*,?\s*$/);
    if (srcMatch && !currentSrc) currentSrc = srcMatch[1];
    
    // Check for title
    const titleMatch = line.match(/["']?title["']?\s*:\s*["'](.+?)["']\s*,?\s*$/);
    if (titleMatch) currentTitle = titleMatch[1];
  }
  
  // Don't forget the last entry
  if (currentId && (currentSrc || currentSrcXL || currentSrcL || currentTitle)) {
    imageDataMap.set(currentId, {
      src: currentSrcXL || currentSrcL || currentSrc,
      title: currentTitle
    });
  }
}

console.log(`Found data for ${imageDataMap.size} images\n`);

// Find and repair entries missing src or title
let repaired = 0;
let alreadyComplete = 0;
let notFound = 0;

for (const [seriesId, series] of Object.entries(registry.series)) {
  const imageId = series.primaryImageId;
  const needsSrc = !series.src;
  const needsTitle = !series.title;
  
  if (!needsSrc && !needsTitle) {
    alreadyComplete++;
    continue;
  }
  
  const data = imageDataMap.get(imageId);
  if (!data) {
    console.log(`❌ ${imageId} - not found in any gallery file`);
    notFound++;
    continue;
  }
  
  if (needsSrc && data.src) {
    series.src = data.src;
  }
  if (needsTitle && data.title) {
    series.title = data.title;
  }
  
  if ((needsSrc && data.src) || (needsTitle && data.title)) {
    repaired++;
    console.log(`✅ ${imageId} - repaired (src: ${!!data.src}, title: ${!!data.title})`);
  }
}

// Save updated registry
if (!isDryRun && repaired > 0) {
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`\n💾 Saved updated seriesRegistry.json`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Repair Summary:');
console.log(`   Already complete: ${alreadyComplete}`);
console.log(`   Repaired: ${repaired}`);
console.log(`   Not found: ${notFound}`);

if (isDryRun) {
  console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
}
