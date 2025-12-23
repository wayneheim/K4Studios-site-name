// scripts/migrate-series-registry.cjs
// Scans existing galleries and populates seriesRegistry.json
// Auto-links images with same SmugMug ID appearing in multiple galleries

const fs = require("fs");
const path = require("path");

const GALLERIES_ROOT = path.join(__dirname, "../src/data/Galleries");
const REGISTRY_PATH = path.join(__dirname, "../src/data/seriesRegistry.json");

// Generate a unique series ID
function generateSeriesId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "s-";
  for (let i = 0; i < 7; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Find all .mjs gallery files recursively
function findGalleryFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findGalleryFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract image data from a .mjs file
function extractImagesFromMjs(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const images = [];
  
  const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const matches = content.match(objectPattern);
  
  if (!matches) return images;
  
  for (const match of matches) {
    const idMatch = match.match(/"id":\s*"([^"]+)"/);
    if (!idMatch) continue;
    
    const id = idMatch[1];
    if (id === "i-k4studios") continue;
    
    // Get src for thumbnail
    const srcMatch = match.match(/"src":\s*"([^"]+)"/);
    const src = srcMatch ? srcMatch[1] : "";
    
    // Get title
    const titleMatch = match.match(/"title":\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : "";
    
    const seriesMatch = match.match(/availableSeries:\s*\[([^\]]*)\]/);
    if (!seriesMatch) continue;
    
    const seriesStr = seriesMatch[1];
    const series = seriesStr.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) || [];
    
    const limitedTiers = series.filter(t => ["chronicle", "legend"].includes(t));
    if (limitedTiers.length > 0) {
      const relPath = path.relative(GALLERIES_ROOT, filePath);
      const galleryPath = relPath.replace(/\.mjs$/, "").replace(/\\/g, "/");
      images.push({ id, tiers: limitedTiers, file: relPath, galleryPath, src, title });
    }
  }
  
  return images;
}

async function main() {
  console.log("Scanning galleries for Chronicle/Legend assignments...\n");
  
  // Start fresh
  const registry = {
    _meta: { version: "1.0" },
    images: {},
    series: {}
  };
  
  const galleryFiles = findGalleryFiles(GALLERIES_ROOT);
  console.log(`Found ${galleryFiles.length} gallery files\n`);
  
  // First pass: collect all images and group by ID
  const imageOccurrences = new Map(); // imageId -> array of occurrences
  
  for (const file of galleryFiles) {
    const images = extractImagesFromMjs(file);
    for (const img of images) {
      if (!imageOccurrences.has(img.id)) {
        imageOccurrences.set(img.id, []);
      }
      imageOccurrences.get(img.id).push({
        tiers: img.tiers,
        file: img.file,
        galleryPath: img.galleryPath,
        src: img.src,
        title: img.title
      });
    }
  }
  
  console.log(`Found ${imageOccurrences.size} unique image IDs with limited edition tiers\n`);
  
  // Second pass: create series entries, auto-linking duplicates
  let singletons = 0;
  let autoLinked = 0;
  
  for (const [imageId, occurrences] of imageOccurrences) {
    const seriesId = generateSeriesId();
    
    // Merge all tiers from all occurrences
    const allTiers = [...new Set(occurrences.flatMap(o => o.tiers))];
    
    // Use first occurrence for thumbnail/title
    const primary = occurrences[0];
    
    // Register the image
    registry.images[imageId] = seriesId;
    
    // Create series entry with occurrence info
    registry.series[seriesId] = {
      primaryImageId: imageId,
      linkedCount: occurrences.length,
      tiers: allTiers,
      src: primary.src,
      title: primary.title,
      createdAt: new Date().toISOString(),
      occurrences: occurrences.map(o => ({
        galleryPath: o.galleryPath,
        file: o.file
      }))
    };
    
    if (occurrences.length > 1) {
      autoLinked++;
      console.log(`[MULTI] ${imageId} "${primary.title}" appears in ${occurrences.length} galleries:`);
      occurrences.forEach(o => console.log(`        - ${o.galleryPath}`));
    } else {
      singletons++;
    }
  }
  
  // Update metadata
  registry._meta.lastUpdated = new Date().toISOString();
  registry._meta.migrationRun = new Date().toISOString();
  registry._meta.totalImages = imageOccurrences.size;
  registry._meta.multiGalleryImages = autoLinked;
  
  // Write registry
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  
  console.log("\n=== Summary ===");
  console.log(`Total unique images with Chronicle/Legend: ${imageOccurrences.size}`);
  console.log(`Single gallery images: ${singletons}`);
  console.log(`Multi-gallery images (auto-linked): ${autoLinked}`);
  console.log(`\nRegistry saved to: ${REGISTRY_PATH}`);
}

main().catch(console.error);
