/**
 * Convert all [id].astro files from SSR to static
 * 
 * Changes:
 * 1. prerender = false → prerender = true
 * 2. Add getStaticPaths() export
 * 3. Remove SSR imports (imageIdMap, isBot, cleanRedirect)
 * 4. Remove the if(isBadId) block
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '../src/pages');

// Find all [id].astro files
function findIdFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findIdFiles(fullPath, files);
    } else if (entry.name === '[id].astro') {
      files.push(fullPath);
    }
  }
  return files;
}

function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already converted
  if (content.includes('export const prerender = true')) {
    console.log(`SKIP (already static): ${filePath}`);
    return false;
  }
  
  // 1. Change prerender to true
  content = content.replace('export const prerender = false;', `/**
 * Static Image Detail Page
 * 
 * All bot detection, 410s, and redirects are handled by the Cloudflare Worker.
 * This page is purely static — generated at build time for each valid image.
 */
export const prerender = true;`);

  // 2. Remove SSR imports
  content = content.replace(/import imageIdMap from ['"]@\/data\/imageIdMap\.json['"];\n?/g, '');
  content = content.replace(/import \{ isBot \} from ['"]@\/utils\/isBot['"];\n?/g, '');
  content = content.replace(/import \{ cleanRedirect \} from ['"]@\/utils\/cleanRedirect['"];\n?/g, '');

  // 3. Find the galleryData import to use in getStaticPaths
  const galleryDataMatch = content.match(/import \{ galleryData \} from ['"]([^'"]+)['"]/);
  if (!galleryDataMatch) {
    console.log(`ERROR: No galleryData import found in ${filePath}`);
    return false;
  }

  // 4. Add getStaticPaths after the imports (before the first const)
  const getStaticPathsCode = `
// Generate static paths for all visible images at build time
export async function getStaticPaths() {
  return galleryData
    .filter(img => img.visibility !== 'hidden' && img.visibility !== 'hide')
    .map(img => ({ params: { id: img.id } }));
}
`;

  // Find where to insert getStaticPaths (after last import, before first const)
  // Look for the pattern after all imports
  const insertPoint = content.indexOf('\nconst { id }');
  if (insertPoint === -1) {
    console.log(`ERROR: Could not find insertion point in ${filePath}`);
    return false;
  }
  
  content = content.slice(0, insertPoint) + getStaticPathsCode + content.slice(insertPoint);

  // 5. Remove the SSR logic block (the if(isBadId) block and related code)
  // This is the tricky part - need to remove from "// Check if image is missing" to the closing brace before the next section
  
  // Pattern 1: Remove the isHidden, userAgent, isBadId declarations and if block
  const ssrBlockPattern = /\/\/ Check if image is missing.*?(?=\/\/ Ensure absolute URL|function makeAbsoluteUrl|\nconst imgUrl)/s;
  content = content.replace(ssrBlockPattern, '');
  
  // Pattern 2: If there's still leftover SSR code, try alternative patterns
  content = content.replace(/const isHidden = imageData\?\.visibility.*?\n/g, '');
  content = content.replace(/const userAgent = Astro\.request\.headers\.get\('user-agent'\);\n?/g, '');
  content = content.replace(/const isBadId = .*?;\n?/g, '');
  
  // Remove the entire if(isBadId) block if still present
  const ifBadIdPattern = /if \(isBadId\) \{[\s\S]*?^\}/m;
  content = content.replace(ifBadIdPattern, '');

  // Clean up any double blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`CONVERTED: ${filePath}`);
  return true;
}

// Main
const files = findIdFiles(pagesDir);
console.log(`Found ${files.length} [id].astro files\n`);

let converted = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  try {
    if (convertFile(file)) {
      converted++;
    } else {
      skipped++;
    }
  } catch (err) {
    console.log(`ERROR processing ${file}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone: ${converted} converted, ${skipped} skipped, ${errors} errors`);
