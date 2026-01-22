/**
 * Update GalleryShell files with SEO improvements:
 * 1. Add ImageDetailsWidget import
 * 2. Add sitemapMatches import
 * 3. Add keywords to meta object
 * 4. Add sisterLink variable
 * 5. Wrap image pages in main/article
 * 6. Add ImageDetailsWidget component before Footer
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'src', 'components');

// Files to update (those missing ImageDetailsWidget)
const filesToUpdate = [
  'GalleryShell-Misc-Pets-Traditional.astro',
  'GalleryShell-Misc-Portraits.astro',
  'GalleryShell-Misc-Reenactments-Traditional.astro',
  'GalleryShell-Misc-Wildlife-Traditional.astro',
  'GalleryShell-Portraits-Black-White-Traditional.astro',
  'GalleryShell-Portraits-Color-Traditional.astro',
  'GalleryShell-Portraits-Reenactors-Traditional.astro',
  'GalleryShell-Transportation-Boats-Traditional.astro',
  'GalleryShell-Transportation-Cars-Traditional.astro',
  'GalleryShell-Transportation-Cars.astro',
  'GalleryShell-Transportation-Military-Traditional.astro',
  'GalleryShell-Transportation-Planes-Traditional.astro',
  'GalleryShell-Transportation-Trains-Black-White.astro',
  'GalleryShell-Transportation-Trains-Color.astro',
  'GalleryShell-Transportation-Trains-Traditional.astro',
];

function updateFile(filename) {
  const filePath = path.join(componentsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filename}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 1. Add ImageDetailsWidget import after Footer import
  if (!content.includes('ImageDetailsWidget')) {
    content = content.replace(
      /import Footer from "@\/components\/Footer\.astro";/,
      `import Footer from "@/components/Footer.astro";
import ImageDetailsWidget from "@/components/ImageDetailsWidget.jsx";`
    );
    modified = true;
    console.log(`  ✅ Added ImageDetailsWidget import`);
  }
  
  // 2. Add sitemapMatches import if missing
  if (!content.includes('sitemapMatches')) {
    content = content.replace(
      /import { getStructuredData } from "@\/components\/utils\/getStructuredData\.ts";/,
      `import { getStructuredData } from "@/components/utils/getStructuredData.ts";
import { sitemapMatches } from "@/data/sitemapMatches.ts";`
    );
    modified = true;
    console.log(`  ✅ Added sitemapMatches import`);
  }
  
  // 3. Add keywords to meta object if missing
  if (!content.includes('keywords: currentImage')) {
    content = content.replace(
      /const meta = \{\n\s+description: pageDescription,\n\s+ogTitle:/,
      `const meta = {
  description: pageDescription,
  keywords: currentImage?.keywords 
    ? (Array.isArray(currentImage.keywords) ? currentImage.keywords.join(', ') : currentImage.keywords)
    : undefined,
  ogTitle:`
    );
    modified = true;
    console.log(`  ✅ Added keywords to meta`);
  }
  
  // 4. Add sisterLink variable before the closing ---
  if (!content.includes('sisterLink')) {
    content = content.replace(
      /const skipIntro = isImagePage \|\| isDirectGridView;\n---/,
      `const skipIntro = isImagePage || isDirectGridView;

/** ---------------------------------------------------------------
 * Sister/Related Images Link for SEO internal linking
 * --------------------------------------------------------------- */
const currentImageId = currentImage?.id || initialImageId;
let sisterLink = sitemapMatches.find(m => m.a.includes(currentImageId))?.b || null;
---`
    );
    modified = true;
    console.log(`  ✅ Added sisterLink variable`);
  }
  
  // 5. Wrap skipIntro chapter section in main/article if not already wrapped
  if (content.includes('{skipIntro && (\n      <div id="chapter-section"') && !content.includes('<main>')) {
    content = content.replace(
      /\{skipIntro && \(\n\s+<div id="chapter-section" class="section-visible" style="display:block;">\n\s+<ChapterViewer client:load initialImageId=\{initialImageId \|\| "i-k4studios"\} \/>\n\s+<\/div>\n\s+\)\}/,
      `{/* H1 is now in ImageDetailsWidget - no duplicate needed here */}
  
  {/* Image pages: main content */}
  {skipIntro && (
    <main>
      <article>
        <div id="gallery-content" class="flex-grow relative overflow-hidden">
          <div id="chapter-section" class="section-visible" style="display:block;">
            <ChapterViewer client:load initialImageId={initialImageId || "i-k4studios"} />
          </div>
        </div>
      </article>
    </main>
  )}`
    );
    modified = true;
    console.log(`  ✅ Added main/article wrapper`);
  }
  
  // 6. Add ImageDetailsWidget component before Footer
  if (!content.includes('<ImageDetailsWidget')) {
    content = content.replace(
      /<div class="h-12 md:h-20"><\/div>\n\n\s+<Footer/,
      `<div class="h-12 md:h-20"></div>

  {/* ImageDetailsWidget - SSR SEO content with H1 */}
  {skipIntro && currentImage && (
    <ImageDetailsWidget 
      client:load
      image={{
        title: fixMojibake(currentImage.title || currentImage.alt),
        description: fixMojibake(currentImage.description),
        notes: currentImage.notes ? fixMojibake(currentImage.notes) : null,
        src: currentImage.src,
        alt: currentImage.alt
      }}
      imageId={currentImage.id}
      galleryTitle={fixMojibake(usedEntranceData.title)}
      sisterLink={sisterLink}
      exitPath={previewPath}
    />
  )}

  <Footer`
    );
    modified = true;
    console.log(`  ✅ Added ImageDetailsWidget component`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filename}\n`);
    return true;
  } else {
    console.log(`⏭️ No changes needed: ${filename}\n`);
    return false;
  }
}

console.log('🚀 Updating GalleryShell files with SEO improvements...\n');

let updated = 0;
let skipped = 0;

for (const file of filesToUpdate) {
  console.log(`Processing: ${file}`);
  if (updateFile(file)) {
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\n📊 Summary: ${updated} updated, ${skipped} skipped`);
