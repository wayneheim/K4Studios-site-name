/**
 * generate-image-manifest.cjs
 * 
 * Extracts all image IDs and their SmugMug URLs from .mjs gallery files.
 * Outputs a consolidated manifest for the Cloudflare Worker proxy.
 * 
 * DOES NOT modify source .mjs files - extract only.
 * 
 * Output format:
 * {
 *   "i-ncFcHDM": {
 *     "s": "https://photos.smugmug.com/.../S/...-S.jpg",
 *     "m": "https://photos.smugmug.com/.../L/...-L.jpg",
 *     "l": "https://photos.smugmug.com/.../XL/...-XL.jpg",
 *     "xl": "https://photos.smugmug.com/.../XL/...-XL.jpg",
 *     "src": "https://photos.smugmug.com/.../XL/...-XL.jpg"
 *   }
 * }
 * 
 * Usage: node scripts/generate-image-manifest.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'image-manifest.json');

// Pattern to detect backup/copy files (e.g., Color-copy.mjs, file-bak.mjs, file copy.mjs)
const BACKUP_PATTERN = /[-_\s](copy|bak|backup|old)(\d*|[-_\s].*)?\.mjs$/i;

// Recursively find all .mjs files (excluding backups)
function findMjsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, backups, etc.
      if (!['node_modules', 'backups', '.git'].includes(entry.name)) {
        findMjsFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.mjs')) {
      // Skip backup/copy files
      if (BACKUP_PATTERN.test(entry.name)) {
        continue;
      }
      files.push(fullPath);
    }
  }
  return files;
}

// Extract image objects from .mjs file content using regex
// We don't eval - we just extract id + src fields directly
function extractImagesFromContent(content) {
  const images = [];
  
  // Match individual image objects with their id and src fields
  // Pattern: find each object block that has an "id" field
  const objectPattern = /\{\s*"id"\s*:\s*"([^"]+)"[^}]*?"src"\s*:\s*"([^"]*)"[^}]*?(?:"srcXL"\s*:\s*"([^"]*)")?[^}]*?(?:"srcL"\s*:\s*"([^"]*)")?[^}]*?(?:"srcM"\s*:\s*"([^"]*)")?[^}]*?(?:"srcS"\s*:\s*"([^"]*)")?/g;
  
  // Simpler approach: extract each field individually per image block
  // Split by image ID pattern
  const idMatches = [...content.matchAll(/"id"\s*:\s*"(i-[^"]+)"/g)];
  
  for (const idMatch of idMatches) {
    const id = idMatch[1];
    if (id === 'i-k4studios') continue;
    
    // Find the context around this ID (the object it belongs to)
    const idPos = idMatch.index;
    // Look for the enclosing object - find previous { and next }
    const searchStart = Math.max(0, idPos - 100);
    const searchEnd = Math.min(content.length, idPos + 5000);
    const context = content.substring(searchStart, searchEnd);
    
    // Extract src URLs from context
    const srcMatch = context.match(/"src"\s*:\s*"(https:\/\/photos\.smugmug\.com[^"]*)"/);
    const srcSMatch = context.match(/"srcS"\s*:\s*"(https:\/\/photos\.smugmug\.com[^"]*)"/);
    const srcMMatch = context.match(/"srcM"\s*:\s*"(https:\/\/photos\.smugmug\.com[^"]*)"/);
    const srcLMatch = context.match(/"srcL"\s*:\s*"(https:\/\/photos\.smugmug\.com[^"]*)"/);
    const srcXLMatch = context.match(/"srcXL"\s*:\s*"(https:\/\/photos\.smugmug\.com[^"]*)"/);
    
    const urls = {};
    if (srcSMatch) urls.s = srcSMatch[1];
    if (srcMMatch) urls.m = srcMMatch[1];
    if (srcLMatch) urls.l = srcLMatch[1];
    if (srcXLMatch) urls.xl = srcXLMatch[1];
    if (srcMatch) urls.src = srcMatch[1];
    
    if (Object.keys(urls).length > 0) {
      images.push({ id, urls });
    }
  }
  
  return images;
}

// Main execution
async function main() {
  console.log('🔍 Scanning for .mjs gallery files...');
  
  const mjsFiles = findMjsFiles(DATA_DIR);
  console.log(`   Found ${mjsFiles.length} .mjs files (excluding backups/copies)`);
  
  const manifest = {};
  let imageCount = 0;
  let urlCount = 0;
  let skippedFiles = 0;
  
  for (const filePath of mjsFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const images = extractImagesFromContent(content);
      
      if (images.length === 0) {
        skippedFiles++;
        continue;
      }
      
      for (const { id, urls } of images) {
        // Merge with existing (in case same image appears in multiple galleries)
        if (manifest[id]) {
          manifest[id] = { ...manifest[id], ...urls };
        } else {
          manifest[id] = urls;
          imageCount++;
        }
        urlCount += Object.keys(urls).length;
      }
    } catch (e) {
      console.warn(`   ⚠️ Error processing ${path.basename(filePath)}: ${e.message}`);
    }
  }
  
  // Write manifest
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
  
  const fileSizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  
  console.log('');
  console.log('✅ Manifest generated successfully!');
  console.log(`   📁 Output: ${OUTPUT_FILE}`);
  console.log(`   🖼️  Images: ${imageCount.toLocaleString()}`);
  console.log(`   🔗 URLs: ${urlCount.toLocaleString()}`);
  console.log(`   📦 Size: ${fileSizeKB} KB`);
  console.log(`   ⏭️  Skipped: ${skippedFiles} files (no images found)`);
}

main().catch(console.error);
