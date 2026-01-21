/**
 * Add canonicalUrl parameter to all [id].astro image page files
 * This ensures each image page explicitly sets its canonical URL
 */

const fs = require('fs');
const path = require('path');

const galleriesDir = path.join(__dirname, '../src/pages/Galleries');

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

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has canonicalUrl in getImageMeta call
  if (content.includes('canonicalUrl') && content.includes('getImageMeta')) {
    console.log(`⏭️  Already updated: ${filePath}`);
    return false;
  }
  
  // Pattern: const meta = getImageMeta(id, [...], parentMeta);
  // Replace with: const meta = getImageMeta(id, [...], parentMeta, canonicalUrl);
  
  // First, add the canonicalUrl definition before getImageMeta call
  const getImageMetaPattern = /const meta = getImageMeta\(([^)]+)\);/;
  const match = content.match(getImageMetaPattern);
  
  if (!match) {
    console.log(`⚠️  No getImageMeta found: ${filePath}`);
    return false;
  }
  
  // Check if canonicalUrl is already defined
  if (!content.includes('const canonicalUrl = ')) {
    // Add canonicalUrl definition before the getImageMeta line
    const canonicalDef = `const canonicalUrl = \`https://www.k4studios.com\${Astro.url.pathname.replace(/\\/$/, '')}\`;\n`;
    content = content.replace(
      getImageMetaPattern,
      canonicalDef + match[0]
    );
  }
  
  // Now update the getImageMeta call to include canonicalUrl as 4th param
  // Match: getImageMeta(id, [{ images: galleryData, meta: parentMeta }], parentMeta)
  content = content.replace(
    /getImageMeta\(id, \[\{ images: galleryData, meta: parentMeta \}\], parentMeta\)/g,
    'getImageMeta(id, [{ images: galleryData, meta: parentMeta }], parentMeta, canonicalUrl)'
  );
  
  // Also handle variations
  content = content.replace(
    /getImageMeta\(id, \[\{ images: galleryData, meta: parentMeta \}\], parentMeta,\s*\)/g,
    'getImageMeta(id, [{ images: galleryData, meta: parentMeta }], parentMeta, canonicalUrl)'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Updated: ${filePath}`);
  return true;
}

// Main
const files = findIdAstroFiles(galleriesDir);
console.log(`Found ${files.length} [id].astro files\n`);

let updated = 0;
for (const file of files) {
  if (processFile(file)) {
    updated++;
  }
}

console.log(`\n✅ Updated ${updated} files`);
