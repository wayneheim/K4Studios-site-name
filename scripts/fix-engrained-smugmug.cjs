/**
 * fix-gallery-mjs-src.cjs
 * 
 * This script finds gallery .mjs files that have SmugMug URLs in src properties
 * and replaces them with proxy URLs using the id field from the same object.
 * 
 * For gallery data files, the src should use the id field that's already present:
 * - Current: "src": "https://photos.smugmug.com/.../i-xqbdC8P/..."
 * - Fixed: Uses the "id": "i-xqbdC8P" with getProxySrc at runtime
 * 
 * Since these are JS modules, we'll add an import and replace src with a getter.
 * Actually, simpler: just clear the src field and let the component use id.
 */

const fs = require('fs');
const path = require('path');

const PROXY_BASE = 'https://k4-image-proxy.wayneheim.workers.dev/img';

// Extract SmugMug image ID from URL
function extractSmugMugId(url) {
  // Pattern: /i-XXXXXX/ where XXXXXX is alphanumeric
  const match = url.match(/\/(i-[A-Za-z0-9]+)\//);
  return match ? match[1] : null;
}

// Process Engrained-Series.mjs file specifically
function processEngrainedFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  // Find SmugMug URLs in "src" properties
  // Match: "src": "https://photos.smugmug.com/..."
  const smugmugSrcPattern = /("src"\s*:\s*)(["'])(https:\/\/photos\.smugmug\.com\/[^"']+)\2/g;
  
  let match;
  const replacements = [];
  
  while ((match = smugmugSrcPattern.exec(content)) !== null) {
    const prefix = match[1];
    const quote = match[2];
    const url = match[3];
    const fullMatch = match[0];
    
    const imageId = extractSmugMugId(url);
    if (imageId) {
      // Replace with proxy URL
      const proxyUrl = `${PROXY_BASE}/${imageId}/l`;
      const replacement = `${prefix}${quote}${proxyUrl}${quote}`;
      replacements.push({
        original: fullMatch,
        replacement,
        imageId,
        url: url.substring(0, 60) + '...'
      });
    }
  }
  
  // Apply replacements
  for (const r of replacements) {
    content = content.replace(r.original, r.replacement);
    changes.push(`  ${r.imageId}`);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\n✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    console.log(`   ${changes.length} SmugMug URLs replaced with proxy URLs`);
  }
  
  return { modified, changeCount: changes.length };
}

// Process carousel.ts file in Engrained folder
function processCarouselFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  // Find SmugMug URLs in src properties
  const smugmugSrcPattern = /(src\s*:\s*)(["'])(https:\/\/photos\.smugmug\.com\/[^"']+)\2/g;
  
  let match;
  const replacements = [];
  
  while ((match = smugmugSrcPattern.exec(content)) !== null) {
    const prefix = match[1];
    const quote = match[2];
    const url = match[3];
    const fullMatch = match[0];
    
    const imageId = extractSmugMugId(url);
    if (imageId) {
      // Replace with proxy URL
      const proxyUrl = `${PROXY_BASE}/${imageId}/m`;
      const replacement = `${prefix}${quote}${proxyUrl}${quote}`;
      replacements.push({
        original: fullMatch,
        replacement,
        imageId,
        url: url.substring(0, 60) + '...'
      });
    }
  }
  
  // Apply replacements
  for (const r of replacements) {
    content = content.replace(r.original, r.replacement);
    changes.push(`  ${r.imageId}`);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\n✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    console.log(`   ${changes.length} SmugMug URLs replaced with proxy URLs`);
  }
  
  return { modified, changeCount: changes.length };
}

// Main
console.log('🔍 Fixing SmugMug URLs in Engrained gallery files...\n');

const engrainedDir = path.join(__dirname, '..', 'src', 'data', 'Other', 'K4-Select-Series', 'Engrained');

// Fix Engrained-Series.mjs
const mjsPath = path.join(engrainedDir, 'Engrained-Series.mjs');
if (fs.existsSync(mjsPath)) {
  const result = processEngrainedFile(mjsPath);
  console.log(`   Total: ${result.changeCount} URLs fixed in Engrained-Series.mjs`);
}

// Fix carousel.ts
const carouselPath = path.join(engrainedDir, 'carousel.ts');
if (fs.existsSync(carouselPath)) {
  const result = processCarouselFile(carouselPath);
  console.log(`   Total: ${result.changeCount} URLs fixed in carousel.ts`);
}

console.log('\n✅ Done!');
