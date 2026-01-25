// Generates image-sitemap-cowboy.xml with <image:image> tags for Google Image Search
// This is the "accelerator" - bypasses crawl throttling by declaring images directly to Google
// Usage: node scripts/generate-image-sitemap.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://www.k4studios.com';
const LICENSE_URL = 'https://www.k4studios.com/About/License';

// Gallery data sources for Cowboy section
const COWBOY_GALLERIES = [
  {
    dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs',
    urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color',
    name: 'Color'
  },
  {
    dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs',
    urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White',
    name: 'Black-White'
  },
  {
    dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs',
    urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color',
    name: 'NA-Color'
  }
];

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate <url> entry with nested <image:image> for a gallery image
 */
function generateUrlEntry(image, urlBase) {
  // Skip ghost/placeholder images
  if (image.visibility === 'ghost' || image.id === 'i-k4studios') {
    return null;
  }

  // Skip images without a valid SmugMug src
  if (!image.src || !image.src.includes('smugmug.com')) {
    return null;
  }

  const pageUrl = `${SITE_URL}${urlBase}/${image.id}`;
  const imageUrl = image.srcXL || image.srcL || image.src;
  
  // Build caption from description, truncate if too long
  let caption = image.description || image.title;
  if (caption && caption.length > 1000) {
    caption = caption.substring(0, 997) + '...';
  }

  // Use title as image title
  const title = image.title || image.alt || 'Western Cowboy Portrait';

  return `  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
      <image:caption>${escapeXml(caption)}</image:caption>
      <image:license>${LICENSE_URL}</image:license>
    </image:image>
  </url>`;
}

/**
 * Generate full image sitemap XML
 */
function generateImageSitemap(entries) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;
  const footer = `</urlset>
`;

  return header + entries.join('\n') + '\n' + footer;
}

async function main() {
  console.log('🖼️  Generating Cowboy Image Sitemap...\n');

  const allEntries = [];
  const stats = {};

  for (const gallery of COWBOY_GALLERIES) {
    const dataPath = path.resolve(__dirname, gallery.dataPath);
    
    try {
      // Dynamic import of gallery data
      const module = await import(`file://${dataPath}`);
      const galleryData = module.galleryData;

      if (!Array.isArray(galleryData)) {
        console.warn(`⚠️  ${gallery.name}: galleryData is not an array`);
        continue;
      }

      let count = 0;
      for (const image of galleryData) {
        const entry = generateUrlEntry(image, gallery.urlBase);
        if (entry) {
          allEntries.push(entry);
          count++;
        }
      }

      stats[gallery.name] = count;
      console.log(`✅ ${gallery.name}: ${count} images`);
    } catch (err) {
      console.error(`❌ ${gallery.name}: ${err.message}`);
    }
  }

  console.log(`\n📊 Total: ${allEntries.length} images`);

  // Generate XML
  const xml = generateImageSitemap(allEntries);

  // Write to public folder (served directly)
  const publicOutPath = path.resolve(__dirname, '..', 'public', 'image-sitemap-cowboy.xml');
  await writeFile(publicOutPath, xml, 'utf8');
  console.log(`\n📁 Written to: public/image-sitemap-cowboy.xml`);

  // Also write to dist folder if it exists (for immediate availability)
  try {
    const distOutPath = path.resolve(__dirname, '..', 'dist', 'image-sitemap-cowboy.xml');
    await writeFile(distOutPath, xml, 'utf8');
    console.log(`📁 Written to: dist/image-sitemap-cowboy.xml`);
  } catch {
    // dist folder may not exist yet
  }

  // Summary
  console.log('\n🎯 Next steps:');
  console.log('   1. Verify robots.txt includes: Sitemap: https://www.k4studios.com/image-sitemap-cowboy.xml');
  console.log('   2. Submit to Google Search Console');
  console.log('   3. Deploy and verify at https://www.k4studios.com/image-sitemap-cowboy.xml');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
