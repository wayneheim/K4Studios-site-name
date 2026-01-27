/**
 * normalize-landingstones.cjs
 * 
 * One-time migration script to:
 * 1. Add explicit imageId fields to all tombstone entries
 * 2. Convert thumb URLs to proxy format (/img/{id}/s)
 * 3. Report any entries that cannot be normalized (hard fail)
 * 
 * This eliminates regex parsing entropy from the warming pipeline.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Extract image ID from any URL format
function extractImageId(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Already a proxy URL: /img/i-XXXXX/s
  const proxyMatch = url.match(/\/img\/(i-[a-zA-Z0-9-]+)\//);
  if (proxyMatch) return proxyMatch[1];
  
  // SmugMug URL with image ID anywhere in path: /i-XXXXX/
  const smugMatch = url.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (smugMatch) return smugMatch[1];
  
  // Local static image - no ID to extract
  if (url.startsWith('/images/')) return null;
  
  return null;
}

// Scan directory recursively for landingstones.ts files
function findLandingstoneFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findLandingstoneFiles(fullPath, files);
    } else if (entry.name === 'landingstones.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Process a single landingstones.ts file
function processFile(filePath) {
  const relPath = path.relative(DATA_DIR, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const issues = [];
  
  // Find all thumb entries that are SmugMug URLs (not already proxy URLs)
  // Pattern: thumb: "https://photos.smugmug.com/..." or thumb:\n  "https://..."
  const smugMugThumbPattern = /thumb:\s*\n?\s*["'`](https:\/\/photos\.smugmug\.com\/[^"'`]+)["'`]/g;
  
  let match;
  const replacements = [];
  
  while ((match = smugMugThumbPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const smugMugUrl = match[1];
    const imageId = extractImageId(smugMugUrl);
    
    if (!imageId) {
      issues.push({
        file: relPath,
        url: smugMugUrl,
        error: 'Could not extract image ID from SmugMug URL'
      });
      continue;
    }
    
    // Build replacement with imageId field and proxy thumb
    const proxyUrl = `/img/${imageId}/s`;
    const replacement = `imageId: "${imageId}",\n      thumb: "${proxyUrl}"`;
    
    replacements.push({
      original: fullMatch,
      replacement: replacement,
      imageId: imageId
    });
  }
  
  // Apply replacements in reverse order to preserve positions
  for (const r of replacements.reverse()) {
    content = content.replace(r.original, r.replacement);
    modified = true;
  }
  
  // Also check for thumbs arrays with SmugMug URLs
  const thumbsArrayPattern = /thumbs:\s*\[\s*\n?([\s\S]*?)\]/g;
  
  while ((match = thumbsArrayPattern.exec(content)) !== null) {
    const arrayContent = match[1];
    const smugUrls = arrayContent.match(/["'`](https:\/\/photos\.smugmug\.com\/[^"'`]+)["'`]/g);
    
    if (smugUrls) {
      for (const urlMatch of smugUrls) {
        const url = urlMatch.slice(1, -1); // Remove quotes
        const imageId = extractImageId(url);
        
        if (!imageId) {
          issues.push({
            file: relPath,
            url: url,
            error: 'Could not extract image ID from SmugMug URL in thumbs array'
          });
          continue;
        }
        
        const proxyUrl = `/img/${imageId}/s`;
        content = content.replace(urlMatch, `"${proxyUrl}"`);
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${relPath}`);
  }
  
  return { modified, issues };
}

// Main
function main() {
  console.log('🔧 Normalizing landingstones.ts files...\n');
  
  const files = findLandingstoneFiles(DATA_DIR);
  console.log(`Found ${files.length} landingstones.ts files\n`);
  
  let totalModified = 0;
  const allIssues = [];
  
  for (const file of files) {
    const result = processFile(file);
    if (result.modified) totalModified++;
    allIssues.push(...result.issues);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${totalModified}`);
  
  if (allIssues.length > 0) {
    console.log(`\n❌ ISSUES FOUND (${allIssues.length}):`);
    for (const issue of allIssues) {
      console.log(`   ${issue.file}:`);
      console.log(`     URL: ${issue.url.substring(0, 80)}...`);
      console.log(`     Error: ${issue.error}`);
    }
    process.exit(1);
  } else {
    console.log(`\n✅ All entries normalized successfully!`);
  }
}

main();
