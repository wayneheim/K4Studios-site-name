/**
 * fix-500-redirects.cjs
 * 
 * Fixes all [id].astro files to redirect to gallery base instead of throwing 500 errors
 * when an image ID is not found.
 * 
 * Run: node scripts/fix-500-redirects.cjs
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');

// Find all [id].astro files
function findIdAstroFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findIdAstroFiles(fullPath, files);
    } else if (entry.name === '[id].astro') {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract gallery base path from the file's directory
function getGalleryBasePath(filePath) {
  // Get the relative path from src/pages
  const relativePath = path.relative(path.join(__dirname, '..', 'src', 'pages'), filePath);
  // Remove the [id].astro filename and convert to URL path
  const dirPath = path.dirname(relativePath);
  // Convert Windows backslashes to forward slashes
  return '/' + dirPath.replace(/\\/g, '/');
}

// Fix a single file
function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const galleryBase = getGalleryBasePath(filePath);
  
  // Check if already fixed (has redirect instead of throw)
  if (content.includes('Astro.redirect(') && content.includes('imageData')) {
    console.log(`  SKIP: ${path.relative(PAGES_DIR, filePath)} (already fixed)`);
    return false;
  }
  
  // Pattern 1: if (!imageData) throw new Error(...)
  const throwPattern = /if\s*\(\s*!imageData\s*\)\s*throw\s+new\s+Error\s*\([^)]+\)\s*;?/g;
  
  if (!throwPattern.test(content)) {
    console.log(`  SKIP: ${path.relative(PAGES_DIR, filePath)} (no matching pattern)`);
    return false;
  }
  
  // Reset regex lastIndex
  throwPattern.lastIndex = 0;
  
  // Replace with graceful redirect
  const newContent = content.replace(throwPattern, 
    `// Gracefully handle missing images - redirect to gallery landing instead of 500
if (!imageData) {
  return Astro.redirect("${galleryBase}", 302);
}`
  );
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`  FIXED: ${path.relative(PAGES_DIR, filePath)} → ${galleryBase}`);
  return true;
}

// Main
console.log('Fixing 500 errors in [id].astro files...\n');

const files = findIdAstroFiles(PAGES_DIR);
console.log(`Found ${files.length} [id].astro files\n`);

let fixed = 0;
let skipped = 0;

for (const file of files) {
  if (fixFile(file)) {
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`\n✅ Done: ${fixed} files fixed, ${skipped} skipped`);
