/**
 * Script to update all [id].astro files with bot detection for 410 Gone responses.
 * 
 * Changes:
 * 1. Adds import for isBot utility
 * 2. Detects bot requests by user-agent
 * 3. Returns 410 Gone for bots when image not found (instead of 302 redirect)
 * 4. Preserves 302 redirect for human visitors
 */

const fs = require('fs');
const path = require('path');

// All [id].astro files that need updating
const files = [
  "src/pages/Galleries/Fine-Art-Photography/Architecture/Gallery/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Iceland/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/South/Gallery/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Black-White/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Color/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Miscellaneous/Pets/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Portraits/Black-White/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Portraits/Color/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Portraits/Reenactors/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Transportation/Boats/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Transportation/Cars/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Transportation/Military/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Transportation/Planes/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Transportation/Trains/[id].astro",
  "src/pages/Galleries/Fine-Art-Photography/Transportation/Trains-Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White/[id].astro",
  "src/pages/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color/[id].astro",
  "src/pages/Other/Archive/[id].astro",
  "src/pages/Other/K4-Select-Series/Engrained/Engrained-Series/[id].astro"
];

const rootDir = path.resolve(__dirname, '..');

let successCount = 0;
let failCount = 0;

for (const relPath of files) {
  const filePath = path.join(rootDir, relPath);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already updated
    if (content.includes('isBot')) {
      console.log(`SKIP: ${relPath} (already has isBot)`);
      continue;
    }
    
    // 1. Add isBot import after imageIdMap import
    if (content.includes("import imageIdMap from '@/data/imageIdMap.json'")) {
      content = content.replace(
        "import imageIdMap from '@/data/imageIdMap.json';",
        "import imageIdMap from '@/data/imageIdMap.json';\nimport { isBot } from '@/utils/isBot';"
      );
    } else {
      // Some files might have slightly different import structure
      console.log(`WARN: ${relPath} - imageIdMap import not found in expected form`);
    }
    
    // 2. Add user-agent detection before isBadId check
    // Find the line with "const isBadId" and add userAgent detection before it
    const isBadIdPattern = /const isBadId = \(!imageData/;
    if (isBadIdPattern.test(content)) {
      content = content.replace(
        isBadIdPattern,
        "const userAgent = Astro.request.headers.get('user-agent');\nconst isBadId = (!imageData"
      );
    }
    
    // 3. Replace the "Not found anywhere" block with bot-aware version
    // Old pattern:
    //   // Not found anywhere - fall back to gallery landing page
    //   let cleanUrl = Astro.url.pathname.replace(/\/i[^/]*\/?$/, '');
    //   cleanUrl = cleanUrl.replace(/\/+$/, '');
    //   if (typeof window !== "undefined") {
    //     window.location.replace(cleanUrl);
    //   } else {
    //     return Astro.redirect(cleanUrl, 302);
    //   }
    const oldFallbackPattern = /\/\/ Not found anywhere - fall back to gallery landing page\s+let cleanUrl = Astro\.url\.pathname\.replace\(\/\\\/i\[\^\/\]\*\\\/\?\$\/, ''\);\s+cleanUrl = cleanUrl\.replace\(\/\\\/\+\$\/, ''\);\s+if \(typeof window !== "undefined"\) \{\s+window\.location\.replace\(cleanUrl\);\s+\} else \{\s+return Astro\.redirect\(cleanUrl, 302\);\s+\}/g;
    
    const newFallback = `// Not found anywhere - return proper status
    if (isBot(userAgent)) {
      // Bots get 410 Gone so they can de-index the URL
      return new Response('Gone', { status: 410, headers: { 'X-Robots-Tag': 'noindex' } });
    }
    // Humans get redirected to gallery landing for better UX
    let cleanUrl = Astro.url.pathname.replace(/\\/i[^/]*\\/?$/, '');
    cleanUrl = cleanUrl.replace(/\\/+$/, '');
    return Astro.redirect(cleanUrl, 302);`;
    
    if (oldFallbackPattern.test(content)) {
      content = content.replace(oldFallbackPattern, newFallback);
    } else {
      console.log(`WARN: ${relPath} - fallback pattern not matched`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`OK: ${relPath}`);
    successCount++;
    
  } catch (err) {
    console.error(`FAIL: ${relPath} - ${err.message}`);
    failCount++;
  }
}

console.log(`\nDone! Success: ${successCount}, Failed: ${failCount}`);
