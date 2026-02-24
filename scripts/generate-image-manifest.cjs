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

// Files to exclude from manifest generation (stale/duplicate data)
const EXCLUDED_FILES = ['MasterGalleryData.mjs'];

const SIZE_RANK = Object.freeze({
  TI: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  UNKNOWN: 0
});

const DESIRED_RANK_BY_KEY = Object.freeze({
  s: SIZE_RANK.S,
  m: SIZE_RANK.M,
  l: SIZE_RANK.L,
  xl: SIZE_RANK.XL,
  src: SIZE_RANK.XL
});

function detectUrlSizeRank(url) {
  if (!url) return SIZE_RANK.UNKNOWN;
  try {
    // Prefer path segment when present
    const segMatch = String(url).match(/\/(Ti|S|M|L|XL)\//);
    if (segMatch) return SIZE_RANK[String(segMatch[1]).toUpperCase()] ?? SIZE_RANK.UNKNOWN;

    // Fallback to suffix (rare)
    const suffixMatch = String(url).match(/-(Ti|S|M|L|XL)\.(?:jpe?g|png|webp|gif|avif)(?:\?.*)?$/i);
    if (suffixMatch) return SIZE_RANK[String(suffixMatch[1]).toUpperCase()] ?? SIZE_RANK.UNKNOWN;
  } catch {
    // ignore
  }
  return SIZE_RANK.UNKNOWN;
}

function pickPreferredUrl(existingUrl, candidateUrl, desiredRank) {
  if (!candidateUrl) return existingUrl;
  if (!existingUrl) return candidateUrl;

  const existingRank = detectUrlSizeRank(existingUrl);
  const candidateRank = detectUrlSizeRank(candidateUrl);

  // If we can't determine sizes, avoid churn.
  if (existingRank === SIZE_RANK.UNKNOWN && candidateRank === SIZE_RANK.UNKNOWN) return existingUrl;
  if (existingRank === SIZE_RANK.UNKNOWN) return candidateUrl;
  if (candidateRank === SIZE_RANK.UNKNOWN) return existingUrl;

  const existingIsBigEnough = existingRank >= desiredRank;
  const candidateIsBigEnough = candidateRank >= desiredRank;

  // Prefer any option that meets/exceeds desired size.
  if (existingIsBigEnough && !candidateIsBigEnough) return existingUrl;
  if (!existingIsBigEnough && candidateIsBigEnough) return candidateUrl;

  // If both meet/exceed desired size, choose the closest-to-desired (smallest that is still >= desired).
  if (existingIsBigEnough && candidateIsBigEnough) {
    const existingDiff = existingRank - desiredRank;
    const candidateDiff = candidateRank - desiredRank;
    if (candidateDiff < existingDiff) return candidateUrl;
    if (existingDiff < candidateDiff) return existingUrl;
    // Tie-breaker: keep existing
    return existingUrl;
  }

  // If neither meets desired, choose the largest available.
  if (candidateRank > existingRank) return candidateUrl;
  return existingUrl;
}

function mergeUrlsByQuality(existing = {}, incoming = {}) {
  const merged = { ...existing };
  for (const key of ['s', 'm', 'l', 'xl', 'src']) {
    if (!incoming[key]) continue;
    const desiredRank = DESIRED_RANK_BY_KEY[key] ?? SIZE_RANK.UNKNOWN;
    merged[key] = pickPreferredUrl(merged[key], incoming[key], desiredRank);
  }

  // Ensure `src` is the best available overall (used as last-resort fallback in the worker).
  const bestOverall = ['xl', 'l', 'm', 's', 'src']
    .map(k => merged[k])
    .filter(Boolean)
    .sort((a, b) => detectUrlSizeRank(b) - detectUrlSizeRank(a))[0];

  if (bestOverall) merged.src = bestOverall;
  return merged;
}

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
      if (EXCLUDED_FILES.includes(entry.name)) {
        continue;
      }
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
  
  // Find all image IDs and their positions
  const idMatches = [...content.matchAll(/"id"\s*:\s*"(i-[^"]+)"/g)];
  
  for (let i = 0; i < idMatches.length; i++) {
    const idMatch = idMatches[i];
    const id = idMatch[1];
    if (id === 'i-k4studios') continue;
    
    const idPos = idMatch.index;
    
    // Find the OPENING brace before this id
    let braceCount = 0;
    let objStart = idPos;
    for (let j = idPos; j >= 0; j--) {
      if (content[j] === '}') braceCount++;
      if (content[j] === '{') {
        if (braceCount === 0) {
          objStart = j;
          break;
        }
        braceCount--;
      }
    }
    
    // Find the CLOSING brace after this id (matching the opening)
    braceCount = 1;
    let objEnd = content.length;
    for (let j = objStart + 1; j < content.length; j++) {
      if (content[j] === '{') braceCount++;
      if (content[j] === '}') {
        braceCount--;
        if (braceCount === 0) {
          objEnd = j + 1;
          break;
        }
      }
    }
    
    // Extract ONLY this object's content - no bleeding into other entries!
    const context = content.substring(objStart, objEnd);
    
    // Extract src URLs from this object only
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
          manifest[id] = mergeUrlsByQuality(manifest[id], urls);
        } else {
          manifest[id] = mergeUrlsByQuality({}, urls);
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
