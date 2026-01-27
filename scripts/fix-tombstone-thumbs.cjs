/**
 * fix-tombstone-thumbs.cjs
 * 
 * This script finds all landingstones.ts files that have SmugMug URLs in thumb properties
 * and replaces them with proxy URLs using the extracted image ID.
 * 
 * SmugMug URL pattern: https://photos.smugmug.com/.../i-XXXXXX/...
 * Proxy URL pattern: https://k4-image-proxy.wayneheim.workers.dev/img/i-XXXXXX/s
 */

const fs = require('fs');
const path = require('path');

const PROXY_BASE = 'https://k4-image-proxy.wayneheim.workers.dev/img';

// Find all landingstones.ts files
function findLandingstonesFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findLandingstonesFiles(fullPath, files);
    } else if (entry.name === 'landingstones.ts') {
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
  let changes = [];

  // Find SmugMug URLs in thumb properties (not commented out)
  // Match: thumb: 'https://photos.smugmug.com/...'
  // or: thumb: "https://photos.smugmug.com/..."
  // Also match array items like: "https://photos.smugmug.com/..."
  const smugmugUrlPattern = /(['"])(https:\/\/photos\.smugmug\.com\/[^'"]+)\1/g;
  
  let match;
  const replacements = [];
  
  while ((match = smugmugUrlPattern.exec(content)) !== null) {
    const quote = match[1];
    const url = match[2];
    const fullMatch = match[0];
    
    // Skip if the line is commented out
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const linePrefix = content.substring(lineStart, match.index);
    if (linePrefix.includes('//')) {
      continue;
    }
    
    const imageId = extractSmugMugId(url);
    if (imageId) {
      const proxyUrl = `${PROXY_BASE}/${imageId}/s`;
      const replacement = `${quote}${proxyUrl}${quote}`;
      replacements.push({
        original: fullMatch,
        replacement,
        imageId,
        url
      });
    }
  }
  
  // Apply replacements (in reverse order to preserve indices)
  for (const r of replacements.reverse()) {
    content = content.replace(r.original, r.replacement);
    changes.push(`  ${r.imageId}: ${r.url.substring(0, 60)}...`);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\n✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    console.log(`   ${changes.length} SmugMug URLs replaced:`);
    changes.reverse().forEach(c => console.log(c));
  }
  
  return { modified, changeCount: changes.length };
}

// Main
const srcDir = path.join(__dirname, '..', 'src', 'data');
console.log('🔍 Scanning for landingstones.ts files with SmugMug URLs...\n');

const files = findLandingstonesFiles(srcDir);
console.log(`Found ${files.length} landingstones.ts files\n`);

let totalModified = 0;
let totalChanges = 0;

for (const file of files) {
  const result = processFile(file);
  if (result.modified) {
    totalModified++;
    totalChanges += result.changeCount;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Summary: ${totalModified} files modified, ${totalChanges} SmugMug URLs replaced`);
console.log('='.repeat(60));
