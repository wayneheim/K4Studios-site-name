/**
 * Migration script: Move availableSeries from .mjs files to seriesRegistry.json
 * 
 * This script:
 * 1. Scans all .mjs gallery files for images with availableSeries
 * 2. Registers each image in seriesRegistry.json (if not already there)
 * 3. Removes availableSeries from the .mjs files
 * 
 * Run with: node scripts/migrate-mjs-to-registry.cjs
 * Add --dry-run to preview changes without modifying files
 */

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const galleriesDir = path.join(__dirname, '..', 'src', 'data', 'Galleries');
const registryPath = path.join(__dirname, '..', 'src', 'data', 'seriesRegistry.json');

// Load existing registry
let registry = { images: {}, series: {} };
if (fs.existsSync(registryPath)) {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

// Track stats
const stats = {
  filesScanned: 0,
  imagesFound: 0,
  alreadyInRegistry: 0,
  newlyRegistered: 0,
  filesModified: 0,
};

// Recursively find all .mjs files
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

// Extract gallery path from file path
function getGalleryPath(filePath) {
  const rel = path.relative(path.join(__dirname, '..', 'src', 'data'), filePath);
  return rel.replace(/\\/g, '/').replace(/\.mjs$/, '');
}

// Process a single .mjs file
function processMjsFile(filePath) {
  stats.filesScanned++;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has availableSeries
  if (!content.includes('availableSeries')) {
    return false;
  }
  
  const galleryPath = getGalleryPath(filePath);
  console.log(`\n📁 Processing: ${galleryPath}`);
  
  // Parse the file to find images with availableSeries
  // Handle both quoted "availableSeries" and unquoted availableSeries keys
  // Look for patterns like "id": "i-xxxxx" followed by availableSeries: [...]
  const imagePattern = /"id":\s*"(i-[^"]+)"[^}]*?(?:"availableSeries"|availableSeries):\s*\[([\s\S]*?)\]/g;
  let match;
  const imagesToRegister = [];
  
  while ((match = imagePattern.exec(content)) !== null) {
    const imageId = match[1];
    const tiersRaw = match[2];
    
    // Parse tiers from the array content
    // Foundation, Chronicle, Legend all go to registry (Sketch is always available)
    const tiers = [];
    const tierMatches = tiersRaw.matchAll(/"([^"]+)"/g);
    for (const tm of tierMatches) {
      const tier = tm[1].toLowerCase();
      if (tier === 'foundation' || tier === 'chronicle' || tier === 'legend') {
        tiers.push(tier);
      }
    }
    
    if (tiers.length > 0) {
      stats.imagesFound++;
      imagesToRegister.push({ imageId, tiers, galleryPath });
      
      if (registry.images[imageId]) {
        stats.alreadyInRegistry++;
        console.log(`  ⏭️  ${imageId} - already in registry (${tiers.join(', ')})`);
      } else {
        stats.newlyRegistered++;
        console.log(`  ✅ ${imageId} - registering (${tiers.join(', ')})`);
      }
    }
  }
  
  // Register images to registry
  for (const { imageId, tiers, galleryPath } of imagesToRegister) {
    if (!registry.images[imageId]) {
      // Create new series ID
      const seriesId = `series-${imageId}`;
      registry.images[imageId] = seriesId;
      registry.series[seriesId] = {
        primaryImageId: imageId,
        linkedCount: 1,
        tiers: tiers,
        occurrences: [{ gallery: galleryPath, imageId }]
      };
    } else {
      // Update existing series with this gallery occurrence
      const seriesId = registry.images[imageId];
      const series = registry.series[seriesId];
      if (series) {
        // Add occurrence if not already present
        const hasOccurrence = series.occurrences?.some(o => o.gallery === galleryPath);
        if (!hasOccurrence) {
          series.occurrences = series.occurrences || [];
          series.occurrences.push({ gallery: galleryPath, imageId });
          series.linkedCount = series.occurrences.length;
        }
        // Merge tiers
        for (const tier of tiers) {
          if (!series.tiers.includes(tier)) {
            series.tiers.push(tier);
          }
        }
      }
    }
  }
  
  // Remove availableSeries from the .mjs file content
  if (imagesToRegister.length > 0) {
    // Remove the availableSeries property lines
    let newContent = content;
    
    // Pattern to match both quoted "availableSeries": [...] and unquoted availableSeries: [...]
    // (with optional trailing comma and newline)
    const removePatternQuoted = /\s*"availableSeries":\s*\[[^\]]*\],?\s*\n?/g;
    const removePatternUnquoted = /\s*availableSeries:\s*\[[^\]]*\],?\s*\n?/g;
    newContent = newContent.replace(removePatternQuoted, '\n');
    newContent = newContent.replace(removePatternUnquoted, '\n');
    
    // Clean up any double newlines
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (newContent !== content) {
      stats.filesModified++;
      if (!isDryRun) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`  📝 Removed availableSeries from file`);
      } else {
        console.log(`  📝 Would remove availableSeries from file (dry-run)`);
      }
      return true;
    }
  }
  
  return false;
}

// Main
console.log('🚀 Migration: Move availableSeries from .mjs to seriesRegistry.json');
console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}`);
console.log('');

const mjsFiles = findMjsFiles(galleriesDir);
console.log(`Found ${mjsFiles.length} .mjs files to scan`);

for (const file of mjsFiles) {
  processMjsFile(file);
}

// Save updated registry
if (!isDryRun && stats.newlyRegistered > 0) {
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`\n💾 Saved updated seriesRegistry.json`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Migration Summary:');
console.log(`   Files scanned: ${stats.filesScanned}`);
console.log(`   Images with availableSeries: ${stats.imagesFound}`);
console.log(`   Already in registry: ${stats.alreadyInRegistry}`);
console.log(`   Newly registered: ${stats.newlyRegistered}`);
console.log(`   Files modified: ${stats.filesModified}`);

if (isDryRun) {
  console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
}
