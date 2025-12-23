/**
 * Restore availableSeries from backup .mjs file to seriesRegistry.json
 * This parses the backup file and adds missing entries to the registry
 */
const fs = require("fs");
const path = require("path");

const BACKUP_FILE = path.join(__dirname, "backup-cowboy-color.mjs");
const REGISTRY_PATH = path.join(__dirname, "../src/data/seriesRegistry.json");

// Read backup file as text
const backupContent = fs.readFileSync(BACKUP_FILE, "utf8");

// Parse images using a state machine approach
const imagesWithSeries = [];

// Split by object boundaries - each image starts with "  {"
const imageBlocks = backupContent.split(/\n  \{/).slice(1); // Skip first empty part

console.log(`Found ${imageBlocks.length} image blocks`);

for (const block of imageBlocks) {
  // Extract id - format: id: String.raw`i-xxxxx`,
  const idMatch = block.match(/id:\s*String\.raw`([^`]+)`/);
  if (!idMatch) continue;
  const id = idMatch[1];
  
  // Skip ghost image
  if (id === "i-k4studios") continue;
  
  // Extract availableSeries - format: availableSeries: ["foundation","chronicle"],
  const seriesMatch = block.match(/availableSeries:\s*\[([^\]]*)\]/);
  if (!seriesMatch) continue;
  
  const tierStr = seriesMatch[1];
  const tiers = tierStr
    .split(",")
    .map(s => s.trim().replace(/["']/g, ""))
    .filter(s => s && ["chronicle", "legend", "foundation"].includes(s));
  
  if (tiers.length === 0) continue;
  
  // Extract title - format: title: String.raw`...`,
  const titleMatch = block.match(/title:\s*String\.raw`([^`]*)`/);
  const title = titleMatch ? titleMatch[1] : "";
  
  // Extract src - format: src: String.raw`...`,
  const srcMatch = block.match(/(?:srcXL|src):\s*String\.raw`([^`]+)`/);
  const src = srcMatch ? srcMatch[1] : "";
  
  imagesWithSeries.push({ id, tiers, title, src });
}

console.log(`Found ${imagesWithSeries.length} images with availableSeries`);
console.log(`Chronicle: ${imagesWithSeries.filter(i => i.tiers.includes("chronicle")).length}`);
console.log(`Legend: ${imagesWithSeries.filter(i => i.tiers.includes("legend")).length}`);

// Load existing registry
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));

let added = 0;
let updated = 0;
let skipped = 0;

for (const img of imagesWithSeries) {
  const existingSeriesId = registry.images[img.id];
  
  if (existingSeriesId) {
    // Check if we need to update tiers
    const existing = registry.series[existingSeriesId];
    if (existing) {
      const existingTiers = existing.tiers || [];
      const newTiers = [...new Set([...existingTiers, ...img.tiers])];
      if (newTiers.length > existingTiers.length) {
        existing.tiers = newTiers;
        updated++;
        console.log(`Updated ${img.id}: ${existingTiers.join(",")} -> ${newTiers.join(",")}`);
      } else {
        skipped++;
      }
    }
  } else {
    // New entry
    const seriesId = `series-${img.id}`;
    registry.images[img.id] = seriesId;
    registry.series[seriesId] = {
      primaryImageId: img.id,
      linkedCount: 1,
      tiers: img.tiers,
      src: img.src || "",
      title: img.title || "",
      createdAt: new Date().toISOString(),
      occurrences: [
        {
          galleryPath: "Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
          file: "Painterly-Fine-Art-Photography\\Facing-History\\Western-Cowboy-Portraits\\Color.mjs"
        }
      ]
    };
    added++;
  }
}

// Update meta
registry._meta.lastUpdated = new Date().toISOString();
registry._meta.restoredFromBackup = new Date().toISOString();
registry._meta.totalImages = Object.keys(registry.images).length;

// Count multi-gallery
let multiCount = 0;
for (const s of Object.values(registry.series)) {
  if (s.linkedCount > 1) multiCount++;
}
registry._meta.multiGalleryImages = multiCount;

// Write back
fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

console.log("\n=== Summary ===");
console.log(`Added: ${added}`);
console.log(`Updated: ${updated}`);
console.log(`Skipped (already complete): ${skipped}`);
console.log(`Total images in registry: ${Object.keys(registry.images).length}`);
