/**
 * Cleanup script: Remove orphaned entries from seriesRegistry
 * 
 * This script:
 * 1. Scans all gallery .mjs files for image IDs
 * 2. Removes registry entries for images that no longer exist
 * 
 * Run with: node scripts/cleanup-orphan-registry.cjs
 * Add --dry-run to preview changes without modifying files
 */

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const galleriesDir = path.join(__dirname, '..', 'src', 'data', 'Galleries');
const registryPath = path.join(__dirname, '..', 'src', 'data', 'seriesRegistry.json');

// Load registry
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Build a set of all image IDs that exist in gallery files
const existingImageIds = new Set();

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

console.log('🔍 Scanning gallery files for image IDs...');
const mjsFiles = findMjsFiles(galleriesDir);

for (const file of mjsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Match image IDs
  const idPattern = /["']?id["']?\s*:\s*["'](i-[^"']+)["']/g;
  let idMatch;
  
  while ((idMatch = idPattern.exec(content)) !== null) {
    existingImageIds.add(idMatch[1]);
  }
}

console.log(`Found ${existingImageIds.size} image IDs in gallery files\n`);

// Find and remove orphaned entries
const orphanedIds = [];

for (const imageId of Object.keys(registry.images)) {
  if (!existingImageIds.has(imageId)) {
    orphanedIds.push(imageId);
  }
}

console.log(`Found ${orphanedIds.length} orphaned registry entries:\n`);

for (const imageId of orphanedIds) {
  const seriesId = registry.images[imageId];
  const series = registry.series[seriesId];
  console.log(`  ❌ ${imageId} (tiers: ${series?.tiers?.join(', ') || 'unknown'})`);
  
  if (!isDryRun) {
    delete registry.images[imageId];
    delete registry.series[seriesId];
  }
}

// Save updated registry
if (!isDryRun && orphanedIds.length > 0) {
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`\n💾 Saved updated seriesRegistry.json`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Cleanup Summary:');
console.log(`   Total images in galleries: ${existingImageIds.size}`);
console.log(`   Orphaned entries removed: ${orphanedIds.length}`);
console.log(`   Remaining registry entries: ${Object.keys(registry.images).length}`);

if (isDryRun) {
  console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
}
