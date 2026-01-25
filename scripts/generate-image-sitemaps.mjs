// Generates per-section image sitemaps with a master sitemap index
// This is the professional pattern for large sites - allows GSC tracking per section
// Usage: node scripts/generate-image-sitemaps.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://www.k4studios.com';
const LICENSE_URL = 'https://www.k4studios.com/About/License';
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

/**
 * SECTION DEFINITIONS
 * Each section becomes its own image sitemap for GSC tracking
 * Grouped by logical parent categories
 */
const SECTIONS = [
  // =============================================
  // PAINTERLY FINE ART - FACING HISTORY
  // =============================================
  {
    name: 'cowboy',
    displayName: 'Western Cowboy Portraits',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color'
      }
    ]
  },
  {
    name: 'wwii',
    displayName: 'WWII Photography',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White'
      }
    ]
  },
  {
    name: 'civilwar',
    displayName: 'Civil War Portraits',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White'
      }
    ]
  },
  {
    name: 'roaring20s',
    displayName: 'Roaring 20s Portraits',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White'
      }
    ]
  },

  // =============================================
  // PAINTERLY FINE ART - LANDSCAPES
  // =============================================
  {
    name: 'landscapes-painterly',
    displayName: 'Painterly Landscapes',
    galleries: [
      // By Location
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Iceland.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Iceland'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery'
      },
      // By Theme
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Gallery.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Gallery.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Gallery.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Gallery'
      }
    ]
  },

  // =============================================
  // PAINTERLY FINE ART - MISCELLANEOUS & TRANSPORT
  // =============================================
  {
    name: 'painterly-misc',
    displayName: 'Painterly Miscellaneous',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color'
      },
      {
        dataPath: '../src/data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White.mjs',
        urlBase: '/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White'
      }
    ]
  },

  // =============================================
  // FINE ART PHOTOGRAPHY (Traditional)
  // =============================================
  {
    name: 'portraits',
    displayName: 'Fine Art Portraits',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Portraits/Color.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Portraits/Color'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Portraits/Black-White.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Portraits/Black-White'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Portraits/Reenactors.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Portraits/Reenactors'
      }
    ]
  },
  {
    name: 'landscapes-traditional',
    displayName: 'Fine Art Landscapes',
    galleries: [
      // By Location - International
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Iceland.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Iceland'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland'
      },
      // By Location - US
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/South/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/South/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery'
      },
      // By Theme
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Color/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Color/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Black-White/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Black-White/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Gallery'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water'
      }
    ]
  },
  {
    name: 'transportation',
    displayName: 'Transportation',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Transportation/Boats.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Transportation/Boats'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Transportation/Cars.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Transportation/Cars'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Transportation/Military.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Transportation/Military'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Transportation/Planes.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Transportation/Planes'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Transportation/Trains.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Transportation/Trains'
      }
    ]
  },
  {
    name: 'miscellaneous',
    displayName: 'Miscellaneous',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Miscellaneous/Pets.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Miscellaneous/Pets'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments'
      },
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife'
      }
    ]
  },
  {
    name: 'architecture',
    displayName: 'Architecture',
    galleries: [
      {
        dataPath: '../src/data/Galleries/Fine-Art-Photography/Architecture/Gallery.mjs',
        urlBase: '/Galleries/Fine-Art-Photography/Architecture/Gallery'
      }
    ]
  },

  // =============================================
  // SPECIAL COLLECTIONS
  // =============================================
  {
    name: 'engrained',
    displayName: 'Engrained Series',
    galleries: [
      {
        dataPath: '../src/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs',
        urlBase: '/Other/K4-Select-Series/Engrained'
      }
    ]
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
  
  // Build rich caption from description + story + notes
  // Combine all available text fields for maximum semantic value
  const captionParts = [];
  
  // Primary: description
  if (image.description && image.description.trim()) {
    captionParts.push(image.description.trim());
  }
  
  // Secondary: story (if different from description)
  if (image.story && image.story.trim()) {
    const storyTrimmed = image.story.trim();
    // Only add if meaningfully different from description
    if (!image.description || !image.description.includes(storyTrimmed.substring(0, 50))) {
      captionParts.push(storyTrimmed);
    }
  }
  
  // Tertiary: notes (collector context, historical references, art criticism)
  if (image.notes && image.notes.trim()) {
    captionParts.push(image.notes.trim());
  }
  
  // Join with paragraph separator, truncate if too long
  let caption = captionParts.join(' ') || image.title || 'Fine Art Photograph by Wayne Heim';
  if (caption.length > 2000) {
    caption = caption.substring(0, 1997) + '...';
  }

  // Use title as image title
  const title = image.title || image.alt || 'Fine Art Photograph';

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

/**
 * Generate sitemap index XML
 */
function generateSitemapIndex(sitemaps) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  const footer = `</sitemapindex>
`;

  const now = new Date().toISOString();
  const entries = sitemaps.map(s => `  <sitemap>
    <loc>${SITE_URL}/${s.filename}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`);

  return header + entries.join('\n') + '\n' + footer;
}

/**
 * Process a single section
 */
async function processSection(section) {
  const entries = [];
  const galleryCounts = {};

  for (const gallery of section.galleries) {
    const dataPath = path.resolve(__dirname, gallery.dataPath);
    
    try {
      const module = await import(`file://${dataPath}`);
      const galleryData = module.galleryData;

      if (!Array.isArray(galleryData)) {
        console.warn(`  ⚠️  ${gallery.urlBase}: galleryData is not an array`);
        continue;
      }

      let count = 0;
      for (const image of galleryData) {
        const entry = generateUrlEntry(image, gallery.urlBase);
        if (entry) {
          entries.push(entry);
          count++;
        }
      }

      galleryCounts[gallery.urlBase] = count;
    } catch (err) {
      // File doesn't exist or other error - skip silently for optional galleries
      if (!err.message.includes('Cannot find module')) {
        console.warn(`  ⚠️  ${gallery.urlBase}: ${err.message}`);
      }
    }
  }

  return { entries, galleryCounts };
}

async function main() {
  console.log('🖼️  Generating Per-Section Image Sitemaps...\n');

  const sitemapIndex = [];
  const globalStats = {
    totalImages: 0,
    sections: {}
  };

  for (const section of SECTIONS) {
    console.log(`📂 ${section.displayName} (${section.name})`);
    
    const { entries, galleryCounts } = await processSection(section);
    
    if (entries.length === 0) {
      console.log(`   ⏭️  Skipped (no valid images)\n`);
      continue;
    }

    // Generate sitemap file
    const filename = `image-sitemap-${section.name}.xml`;
    const xml = generateImageSitemap(entries);
    const outPath = path.join(PUBLIC_DIR, filename);
    await writeFile(outPath, xml, 'utf8');

    // Track for index
    sitemapIndex.push({ filename, count: entries.length });
    globalStats.totalImages += entries.length;
    globalStats.sections[section.name] = {
      displayName: section.displayName,
      count: entries.length,
      galleries: galleryCounts
    };

    // Log gallery breakdown
    for (const [galleryPath, count] of Object.entries(galleryCounts)) {
      const shortPath = galleryPath.split('/').slice(-2).join('/');
      console.log(`   📷 ${shortPath}: ${count}`);
    }
    console.log(`   ✅ Total: ${entries.length} → ${filename}\n`);
  }

  // Generate sitemap index
  const indexXml = generateSitemapIndex(sitemapIndex);
  const indexPath = path.join(PUBLIC_DIR, 'image-sitemap-index.xml');
  await writeFile(indexPath, indexXml, 'utf8');

  console.log('═══════════════════════════════════════════════');
  console.log(`📊 SUMMARY`);
  console.log('═══════════════════════════════════════════════');
  console.log(`Total images: ${globalStats.totalImages}`);
  console.log(`Sitemaps generated: ${sitemapIndex.length}`);
  console.log(`Index file: image-sitemap-index.xml`);
  console.log('');
  
  for (const sitemap of sitemapIndex) {
    console.log(`  ${sitemap.filename}: ${sitemap.count} images`);
  }

  console.log('\n🎯 Next steps:');
  console.log('   1. Update robots.txt with: Sitemap: https://www.k4studios.com/image-sitemap-index.xml');
  console.log('   2. Submit image-sitemap-index.xml to Google Search Console');
  console.log('   3. Or submit individual sitemaps for per-section tracking');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
