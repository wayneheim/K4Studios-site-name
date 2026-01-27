/**
 * fix-all-mjs-smugmug.cjs
 * 
 * This script finds ALL .mjs files with SmugMug URLs in src properties
 * and replaces them with proxy URLs using the image ID extracted from the URL.
 */

const fs = require('fs');
const path = require('path');

const PROXY_BASE = 'https://k4-image-proxy.wayneheim.workers.dev/img';

// Find all .mjs files recursively
function findMjsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findMjsFiles(fullPath, files);
    } else if (entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract SmugMug image ID from URL
function extractSmugMugId(url) {
  // Pattern: /i-XXXXXX/ where XXXXXX is alphanumeric
  const match = url.match(/\/(i-[A-Za-z0-9]+)\//);
  return match ? match[1] : null;
}

// Process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = 0;

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
      // Replace with proxy URL - use 'l' size for gallery images
      const proxyUrl = `${PROXY_BASE}/${imageId}/l`;
      const replacement = `${prefix}${quote}${proxyUrl}${quote}`;
      replacements.push({
        original: fullMatch,
        replacement,
        imageId
      });
    }
  }
  
  // Apply replacements
  for (const r of replacements) {
    content = content.replace(r.original, r.replacement);
    changes++;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${changes} URLs fixed`);
  }
  
  return { modified, changeCount: changes };
}

// Main
const srcDir = path.join(__dirname, '..', 'src');
console.log('🔍 Scanning for .mjs files with SmugMug URLs...\n');

const files = findMjsFiles(srcDir);
console.log(`Found ${files.length} .mjs files\n`);

let totalModified = 0;
let totalChanges = 0;

for (const file of files) {
  // Check if file contains smugmug before processing
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('photos.smugmug.com')) {
    const result = processFile(file);
    if (result.modified) {
      totalModified++;
      totalChanges += result.changeCount;
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Summary: ${totalModified} files modified, ${totalChanges} SmugMug URLs replaced`);
console.log('='.repeat(60));
