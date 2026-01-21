/**
 * Fix double BaseLayout nesting in [id].astro files
 * 
 * Problem: [id].astro files wrap GalleryShell in BaseLayout, but GalleryShell
 * also wraps in BaseLayout, causing duplicate <base href>, <html>, <head>, etc.
 * 
 * Solution: Remove BaseLayout wrapper and unused code from [id].astro files
 * since GalleryShell already handles BaseLayout internally.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all [id].astro files
const idAstroFiles = glob.sync('src/pages/**/\\[id\\].astro', { 
  cwd: process.cwd(),
  absolute: true 
});

console.log(`Found ${idAstroFiles.length} [id].astro files to check\n`);

let fixedCount = 0;
let skippedCount = 0;

for (const filePath of idAstroFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already fixed (no BaseLayout wrapper in template)
  if (!content.includes('<BaseLayout meta={meta}>') && 
      !content.includes('<BaseLayout meta={meta} >')) {
    console.log(`✓ Already fixed: ${path.relative(process.cwd(), filePath)}`);
    skippedCount++;
    continue;
  }
  
  // Check if it uses GalleryShell
  if (!content.includes('GalleryShell')) {
    console.log(`⏭ Skipping (no GalleryShell): ${path.relative(process.cwd(), filePath)}`);
    skippedCount++;
    continue;
  }
  
  // Extract the key parts we need to keep
  const importMatch = content.match(/import GalleryShell from ['"]([^'"]+)['"]/);
  const entranceDataMatch = content.match(/import \{ entranceData as (\w+) \} from ['"]([^'"]+)['"]/);
  const galleryDataMatch = content.match(/import \{ galleryData \} from ['"]([^'"]+)['"]/);
  const getStaticPathsMatch = content.match(/export async function getStaticPaths\(\) \{[\s\S]*?^\}/m);
  const idParamMatch = content.match(/const \{ id \} = Astro\.params;/);
  
  // Extract the GalleryShell component name and props
  const shellMatch = content.match(/<GalleryShell\s*([\s\S]*?)\/>/);
  const breadcrumbMatch = content.match(/breadcrumb=\{(\w+)\.breadcrumb\}/);
  const entranceDataPropMatch = content.match(/entranceData=\{(\w+)\}/);
  
  if (!importMatch || !entranceDataMatch || !galleryDataMatch) {
    console.log(`⚠ Could not parse: ${path.relative(process.cwd(), filePath)}`);
    skippedCount++;
    continue;
  }
  
  const galleryShellPath = importMatch[1];
  const entranceDataName = entranceDataMatch[1];
  const entranceDataPath = entranceDataMatch[2];
  const galleryDataPath = galleryDataMatch[1];
  
  // Build the fixed content
  const fixedContent = `---
import GalleryShell from '${galleryShellPath}';
import { entranceData as ${entranceDataName} } from "${entranceDataPath}";
import { galleryData } from '${galleryDataPath}';

export async function getStaticPaths() {
  return galleryData.map(img => ({
    params: { id: img.id },
  }));
}

const { id } = Astro.params;
const imageData = galleryData.find(img => img.id === id);

const isBadId = !imageData && (id && (id.startsWith('i-') || id === 'i'));
if (isBadId) {
  let cleanUrl = Astro.url.pathname.replace(/\\/i[^/]*\\/?$/, '');
  cleanUrl = cleanUrl.replace(/\\/+$/, '');
  if (typeof window !== "undefined") {
    window.location.replace(cleanUrl);
  } else {
    return Astro.redirect(cleanUrl, 302);
  }
}
---

<GalleryShell 
  breadcrumb={${entranceDataName}.breadcrumb} 
  entranceData={${entranceDataName}}
  initialImageId={id}
/>
`;

  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
  fixedCount++;
}

console.log(`\n========================================`);
console.log(`Fixed: ${fixedCount} files`);
console.log(`Skipped: ${skippedCount} files`);
console.log(`========================================`);
