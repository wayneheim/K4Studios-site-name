/**
 * Patches all [id].astro files to add smart 404 redirect logic
 * that checks imageIdMap before falling back to gallery landing page.
 * 
 * Changes:
 * 1. Adds `export const prerender = false;` for full SSR
 * 2. Removes getStaticPaths (not needed with prerender = false)
 * 3. Adds imageIdMap import
 * 4. Checks visibility === 'hidden' (archived images stay in gallery but hidden)
 * 5. Redirects hidden images to their new location via imageIdMap
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all [id].astro files
const files = glob.sync('src/pages/**/**/[[]id[]].astro', { 
  cwd: process.cwd(),
  absolute: true 
});

console.log(`Found ${files.length} [id].astro files to patch`);

let patched = 0;
let skipped = 0;
let failed = 0;

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(process.cwd(), filePath);
    
    // Skip if already has the correct hidden check
    if (content.includes("visibility === 'hidden'")) {
      console.log(`SKIP (already has hidden check): ${relPath}`);
      skipped++;
      return;
    }
    
    // Check if file has the isBadId pattern we need to patch
    if (!content.includes('isBadId')) {
      console.log(`SKIP (no isBadId): ${relPath}`);
      skipped++;
      return;
    }
    
    let modified = false;
    
    // 1. Add prerender = false after opening ---
    if (!content.includes('prerender = false')) {
      content = content.replace(/^---\s*\n/, '---\nexport const prerender = false;\n\n');
      modified = true;
    }
    
    // 2. Remove getStaticPaths block
    const getStaticPathsPattern = /\nexport async function getStaticPaths\(\) \{[\s\S]*?\}\s*\n/;
    if (getStaticPathsPattern.test(content)) {
      content = content.replace(getStaticPathsPattern, '\n');
      modified = true;
    }
    
    // 3. Add imageIdMap import if not present
    if (!content.includes('imageIdMap')) {
      // Find a good place to insert - after the last import before const { id }
      content = content.replace(
        /(import [^;]+;\s*\n)(\s*const \{ id \})/,
        "$1import imageIdMap from '@/data/imageIdMap.json';\n\n$2"
      );
      modified = true;
    }
    
    // 4. Update the isBadId logic to check for hidden visibility
    // Old pattern: const isBadId = !imageData && (id && ...
    // New pattern: check for hidden visibility too
    const oldIsBadIdPattern = /const isBadId = !imageData && \(id && \(id\.startsWith\('i-'\) \|\| id === 'i'\)\);/;
    const newIsBadIdBlock = `// Check if image is missing OR hidden (archived images stay in gallery with visibility: "hidden")
const isHidden = imageData?.visibility === 'hidden' || imageData?.visibility === 'hide';
const isBadId = (!imageData || isHidden) && (id && (id.startsWith('i-') || id === 'i'));`;
    
    if (oldIsBadIdPattern.test(content)) {
      content = content.replace(oldIsBadIdPattern, newIsBadIdBlock);
      modified = true;
    }
    
    // 5. Make sure smart 404 redirect logic exists
    if (!content.includes('correctGalleryPath') && content.includes('isBadId')) {
      // Replace the old if (isBadId) block with new one
      const oldIfBlock = /if \(isBadId\) \{\s*\n\s*let cleanUrl = Astro\.url\.pathname\.replace\([^)]+\);\s*\n\s*cleanUrl = cleanUrl\.replace\([^)]+\);\s*\n\s*if \(typeof window !== "undefined"\) \{\s*\n\s*window\.location\.replace\(cleanUrl\);\s*\n\s*\} else \{\s*\n\s*return Astro\.redirect\(cleanUrl, 302\);\s*\n\s*\}\s*\n\}/;
      
      const newIfBlock = `if (isBadId) {
  // Smart 404: Check if image exists in another gallery (e.g., Archive)
  const correctGalleryPath = (imageIdMap as Record<string, string>)[id];
  if (correctGalleryPath) {
    // Image found elsewhere - 301 redirect to preserve SEO
    return Astro.redirect(\`\${correctGalleryPath}/\${id}\`, 301);
  }
  // Not found anywhere - fall back to gallery landing page
  let cleanUrl = Astro.url.pathname.replace(/\\/i[^/]*\\/?$/, '');
  cleanUrl = cleanUrl.replace(/\\/+$/, '');
  if (typeof window !== "undefined") {
    window.location.replace(cleanUrl);
  } else {
    return Astro.redirect(cleanUrl, 302);
  }
}`;

      if (oldIfBlock.test(content)) {
        content = content.replace(oldIfBlock, newIfBlock);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`PATCHED: ${relPath}`);
      patched++;
    } else {
      console.log(`SKIP (no changes needed): ${relPath}`);
      skipped++;
    }
    
  } catch (err) {
    console.error(`ERROR: ${filePath} - ${err.message}`);
    failed++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Patched: ${patched}`);
console.log(`Skipped: ${skipped}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${files.length}`);
