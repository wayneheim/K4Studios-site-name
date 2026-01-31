/**
 * IMPORTANT:
 * This site is static-first.
 * When output: 'server' is used (required by Netlify),
 * ALL public pages MUST explicitly set:
 *
 *   export const prerender = true;
 *
 * Leaving a page undecorated will cause EVERY request
 * to invoke a Netlify Function and exhaust limits.
 * Do not remove prerender flags without architectural review.
 *
 * This script adds `export const prerender = true;` to all .astro pages
 * that don't already have a prerender declaration.
 *
 * EXCLUDES:
 * - [id].astro and [slug].astro dynamic routes (keep SSR)
 * - admin/ folder (excluded from production builds)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');

// Find all .astro files
const allAstroFiles = glob.sync('**/*.astro', { cwd: PAGES_DIR });

let added = 0;
let skippedDynamic = 0;
let skippedAdmin = 0;
let skippedAlreadyHas = 0;
let errors = [];

for (const file of allAstroFiles) {
  const fullPath = path.join(PAGES_DIR, file);
  const relativePath = file;
  
  // Skip admin pages
  if (relativePath.startsWith('admin/') || relativePath.startsWith('admin\\')) {
    skippedAdmin++;
    console.log(`⏭️  SKIP (admin): ${relativePath}`);
    continue;
  }
  
  // Skip dynamic routes like [id].astro, [slug].astro
  const basename = path.basename(file);
  if (basename.match(/^\[.+\]\.astro$/)) {
    skippedDynamic++;
    console.log(`⏭️  SKIP (dynamic): ${relativePath}`);
    continue;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Check if already has prerender declaration
    if (content.includes('export const prerender')) {
      skippedAlreadyHas++;
      console.log(`✅ ALREADY HAS: ${relativePath}`);
      continue;
    }
    
    // Find the frontmatter section (between --- markers)
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    
    if (frontmatterMatch) {
      // Insert prerender = true at the start of frontmatter
      const frontmatterStart = content.indexOf('---') + 3;
      const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
      
      // Insert after the opening ---
      const before = content.slice(0, frontmatterStart);
      const after = content.slice(frontmatterStart);
      
      content = before + lineEnding + 'export const prerender = true;' + after;
      
      fs.writeFileSync(fullPath, content, 'utf-8');
      added++;
      console.log(`✨ ADDED: ${relativePath}`);
    } else {
      // No frontmatter - add one at the top
      const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
      content = '---' + lineEnding + 'export const prerender = true;' + lineEnding + '---' + lineEnding + lineEnding + content;
      
      fs.writeFileSync(fullPath, content, 'utf-8');
      added++;
      console.log(`✨ ADDED (new frontmatter): ${relativePath}`);
    }
  } catch (err) {
    errors.push({ file: relativePath, error: err.message });
    console.error(`❌ ERROR: ${relativePath} - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`✨ Added prerender = true:  ${added}`);
console.log(`✅ Already had prerender:   ${skippedAlreadyHas}`);
console.log(`⏭️  Skipped (dynamic [id]):  ${skippedDynamic}`);
console.log(`⏭️  Skipped (admin):         ${skippedAdmin}`);
console.log(`❌ Errors:                  ${errors.length}`);
console.log('='.repeat(60));

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
}
