#!/usr/bin/env node
/**
 * migrate-edition-to-registry.cjs
 * 
 * Migrates edition state data (P/S counts) from editionState.json into seriesRegistry.json
 * This consolidates all series data into a single source of truth.
 * 
 * Run: node scripts/migrate-edition-to-registry.cjs
 */

const fs = require("fs");
const path = require("path");

const EDITION_STATE_PATH = path.join(__dirname, "../src/data/editionState.json");
const REGISTRY_PATH = path.join(__dirname, "../src/data/seriesRegistry.json");
const BACKUP_EDITION_PATH = path.join(__dirname, "../src/data/editionState.backup.json");
const BACKUP_REGISTRY_PATH = path.join(__dirname, "../src/data/seriesRegistry.backup.json");

function main() {
  console.log("=== Edition State to Series Registry Migration ===\n");
  
  // Read both files
  if (!fs.existsSync(EDITION_STATE_PATH)) {
    console.log("❌ editionState.json not found. Nothing to migrate.");
    return;
  }
  
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.log("❌ seriesRegistry.json not found. Cannot migrate.");
    return;
  }
  
  const editionState = JSON.parse(fs.readFileSync(EDITION_STATE_PATH, "utf8"));
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  
  // Create backups
  console.log("📦 Creating backups...");
  fs.writeFileSync(BACKUP_EDITION_PATH, JSON.stringify(editionState, null, 2));
  fs.writeFileSync(BACKUP_REGISTRY_PATH, JSON.stringify(registry, null, 2));
  console.log(`   ✓ Backed up editionState.json to ${BACKUP_EDITION_PATH}`);
  console.log(`   ✓ Backed up seriesRegistry.json to ${BACKUP_REGISTRY_PATH}\n`);
  
  // Parse edition state entries
  // Keys are like "i-ncFcHDM:chronicle" or "s-ABC123:legend"
  const entries = Object.entries(editionState).filter(([key]) => !key.startsWith("_"));
  console.log(`📊 Found ${entries.length} edition state entries to migrate.\n`);
  
  let migrated = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (const [key, data] of entries) {
    const [imageOrSeriesId, tier] = key.split(":");
    
    if (!tier || !["chronicle", "legend", "engrained"].includes(tier)) {
      console.log(`   ⏭️  Skipping ${key} - not a limited tier`);
      skipped++;
      continue;
    }
    
    // Find the series in registry
    let seriesId = null;
    
    // Check if it's already a series ID
    if (imageOrSeriesId.startsWith("s-") && registry.series[imageOrSeriesId]) {
      seriesId = imageOrSeriesId;
    } else {
      // Look up by image ID
      for (const [mapKey, sId] of Object.entries(registry.images)) {
        if (mapKey.startsWith(imageOrSeriesId + ":")) {
          seriesId = sId;
          break;
        }
      }
    }
    
    if (!seriesId || !registry.series[seriesId]) {
      console.log(`   ⚠️  ${key} - series not found in registry`);
      notFound++;
      continue;
    }
    
    const series = registry.series[seriesId];
    
    // Initialize editionData if needed
    if (!series.editionData) {
      series.editionData = {};
    }
    
    // Migrate the data
    series.editionData[tier] = {
      soldBySize: data.soldBySize || {},
      printedBySize: data.printedBySize || {},
      sold: data.sold || 0,
      printed: data.printed || 0,
      released: data.released || false,
      firstReleaseDate: data.firstReleaseDate || null
    };
    
    console.log(`   ✓ Migrated ${key} -> ${seriesId}`);
    migrated++;
  }
  
  // Update registry metadata
  registry._meta = registry._meta || {};
  registry._meta.lastUpdated = new Date().toISOString();
  registry._meta.editionDataMigrated = new Date().toISOString();
  
  // Write updated registry
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  
  console.log("\n=== Migration Complete ===");
  console.log(`   ✓ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  console.log(`\n📝 seriesRegistry.json has been updated.`);
  console.log(`   Backups saved with .backup.json extension.`);
  console.log(`\n💡 You can now delete editionState.json if everything looks correct.`);
}

main();
