/**
 * Build-time script to generate carousel image pools for the homepage.
 * 
 * This script walks the gallery structure defined in siteNav.ts, reads all
 * .mjs gallery files, and generates a static JSON file with image pools.
 * 
 * The pools are organized by category and use round-robin selection from
 * sub-galleries to ensure diversity.
 * 
 * Usage: node scripts/generate-carousel-pools.cjs
 * Output: public/carouselPools.json
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Hero image IDs that are always available (pre-optimized .webp versions)
const HERO_IDS = ['i-ncFcHDM', 'i-KtmPcCf', 'i-rqk5Kdk'];
const HIDDEN_VISIBILITY = new Set(['hidden', 'hide', 'ghost', 'non', 'none', '']);
const HERO_WEBP_SRCS = {
  'i-ncFcHDM': '/images/i-ncFcHDM.webp',
  'i-KtmPcCf': '/images/i-KtmPcCf.webp',
  'i-rqk5Kdk': '/images/i-rqk5Kdk.webp'
};

function isPublicVisibleImage(img) {
  if (!img || img.id === 'i-k4studios') return false;
  const visibility = String(img.visibility ?? 'show').trim().toLowerCase();
  return !HIDDEN_VISIBILITY.has(visibility);
}

const WESTERN_POOL_PATHS = [
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West'
];

const WESTERN_HREF_PRIORITY = [
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans'
];

// Max images per pool (to keep JSON file size reasonable)
const MAX_IMAGES_PER_POOL = 20;
const imageIdMapPath = path.join(__dirname, '..', 'public', 'imageIdMap.json');
const imageIdMap = fs.existsSync(imageIdMapPath)
  ? JSON.parse(fs.readFileSync(imageIdMapPath, 'utf-8'))
  : {};

/**
 * Parse siteNav.ts and extract the siteNav array
 */
function parseSiteNav() {
  const siteNavPath = path.join(__dirname, '..', 'src', 'data', 'siteNav.ts');
  const content = fs.readFileSync(siteNavPath, 'utf-8');
  
  // Extract the array after "export const siteNav = "
  const match = content.match(/export\s+const\s+siteNav\s*=\s*(\[[\s\S]*)/);
  if (!match) throw new Error('Could not parse siteNav.ts');
  
  // Find the end of the array (matching bracket)
  let depth = 0;
  let endIdx = 0;
  for (let i = 0; i < match[1].length; i++) {
    if (match[1][i] === '[') depth++;
    if (match[1][i] === ']') depth--;
    if (depth === 0) {
      endIdx = i + 1;
      break;
    }
  }
  
  const arrayStr = match[1].slice(0, endIdx);
  const sandbox = {};
  vm.createContext(sandbox);
  return vm.runInContext(`(${arrayStr})`, sandbox);
}

/**
 * Recursively find all gallery-source nodes under a given path
 */
function findGallerySourcesUnderPath(nodes, targetPath) {
  const sources = [];
  
  function walk(node) {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    
    // If this is a gallery-source and its href starts with the target path
    if (node.type === 'gallery-source' && node.href && node.href.startsWith(targetPath)) {
      sources.push(node);
    }
    
    // Always recurse into children
    if (node.children) {
      walk(node.children);
    }
  }
  
  walk(nodes);
  return sources;
}

/**
 * Find gallery sources matching specific collection paths
 */
function findGallerySourcesByCollection(siteNav, collectionPaths) {
  const sources = [];
  
  for (const collPath of collectionPaths) {
    const found = findGallerySourcesUnderPath(siteNav, collPath);
    sources.push(...found);
  }
  
  return sources;
}

/**
 * Read a .mjs file and extract galleryData
 */
function readGalleryMjs(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`    File not found: ${path.basename(filePath)}`);
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse the galleryData export
    const match = content.match(/export\s+const\s+galleryData\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
      console.warn(`    No galleryData in: ${path.basename(filePath)}`);
      return [];
    }
    
    const sandbox = {};
    vm.createContext(sandbox);
    return vm.runInContext(`(${match[1]})`, sandbox);
  } catch (err) {
    console.error(`    Error reading ${path.basename(filePath)}: ${err.message}`);
    return [];
  }
}

/**
 * Convert gallery href to file path (like getSideImages does)
 */
function hrefToFilePath(href) {
  // /Galleries/... -> src/data/Galleries/....mjs
  return path.join(__dirname, '..', 'src', 'data', href + '.mjs');
}

/**
 * Generate proxy URL for an image
 * Uses /img/{id}/{size} pattern to hide SmugMug origin
 */
function getProxyUrl(imageId, size) {
  return `/img/${imageId}/${size}`;
}

function isWesternGalleryHref(href) {
  return typeof href === 'string' && WESTERN_POOL_PATHS.some(prefix => href.startsWith(prefix));
}

function getMappedGalleryHrefs(imageId) {
  const hrefs = imageIdMap[imageId];
  return Array.isArray(hrefs) ? hrefs.filter(Boolean) : [];
}

function pickPreferredWesternHref(hrefs) {
  for (const preferredPrefix of WESTERN_HREF_PRIORITY) {
    const match = hrefs.find(href => href.startsWith(preferredPrefix));
    if (match) return match;
  }

  return hrefs[0] || null;
}

function resolveGalleryHref(imageId, sourceGalleryHref) {
  const mappedHrefs = getMappedGalleryHrefs(imageId);

  if (mappedHrefs.length === 0 || mappedHrefs.includes(sourceGalleryHref)) {
    return sourceGalleryHref;
  }

  if (isWesternGalleryHref(sourceGalleryHref) || mappedHrefs.some(isWesternGalleryHref)) {
    return pickPreferredWesternHref(mappedHrefs) || sourceGalleryHref;
  }

  return mappedHrefs[0] || sourceGalleryHref;
}

/**
 * Normalize an image for carousel use
 * IMPORTANT: Uses proxy URLs, never raw SmugMug URLs
 */
function normalizeImage(img, galleryHref) {
  // Keep the full gallery path including database name (Color, Black-White, etc.)
  const resolvedGalleryHref = resolveGalleryHref(img.id, galleryHref);

  return {
    id: img.id,
    title: img.title || '',
    galleryPath: resolvedGalleryHref,
    // All src fields now use proxy URLs
    src: getProxyUrl(img.id, 's'),
    srcS: getProxyUrl(img.id, 's'),
    srcM: getProxyUrl(img.id, 'm'),
    srcL: getProxyUrl(img.id, 'l'),
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || 0,
    height: img.height || 0,
    rating: img.rating || 0,
    href: `${resolvedGalleryHref}/${img.id}`
  };
}

/**
 * Build a pool from gallery sources using round-robin selection
 */
function buildPoolRoundRobin(sources, maxImages, excludeIds = new Set()) {
  const pool = [];
  
  // Filter out Archive galleries - they shouldn't appear in carousels
  const filteredSources = sources.filter(source => !source.href.startsWith('/Other/Archive'));
  
  // Load all galleries
  const galleries = filteredSources.map(source => {
    const filePath = hrefToFilePath(source.href);
    const images = readGalleryMjs(filePath)
      .filter(img => 
        isPublicVisibleImage(img) &&
        !excludeIds.has(img.id)
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)); // Higher ratings first
    
    return { href: source.href, label: source.label, images, index: 0 };
  }).filter(g => g.images.length > 0);
  
  if (galleries.length === 0) return pool;
  
  console.log(`    Found ${galleries.length} galleries with images`);
  
  // Round-robin: pull 1 from each gallery, repeat
  let galleryIdx = 0;
  let rounds = 0;
  const usedIds = new Set(excludeIds);
  
  while (pool.length < maxImages) {
    const gallery = galleries[galleryIdx];
    
    // Find next unused image from this gallery
    while (gallery.index < gallery.images.length) {
      const img = gallery.images[gallery.index];
      gallery.index++;
      
      if (!usedIds.has(img.id)) {
        usedIds.add(img.id);
        pool.push(normalizeImage(img, gallery.href));
        break;
      }
    }
    
    // Move to next gallery
    galleryIdx = (galleryIdx + 1) % galleries.length;
    
    // Check if we've completed a full round
    if (galleryIdx === 0) {
      rounds++;
      if (galleries.every(g => g.index >= g.images.length)) break;
    }
    
    if (rounds > 10) break;
  }
  
  return pool;
}

/**
 * Main function
 */
function main() {
  console.log('🎠 Generating carousel pools...\n');
  
  // Parse siteNav
  console.log('Parsing siteNav.ts...');
  const siteNav = parseSiteNav();
  console.log('  ✓ Parsed successfully\n');
  
  const usedIds = new Set();
  const pools = {};
  
  // Define collection paths for each pool category
  const POOL_DEFINITIONS = {
    westernCowboy: WESTERN_POOL_PATHS,
    civilWar: [
      '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits'
    ],
    wwii: [
      '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII'
    ],
    roaring20s: [
      '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits'
    ],
    painterlyLandscapes: [
      '/Galleries/Painterly-Fine-Art-Photography/Landscapes'
    ],
    painterlyTransportation: [
      '/Galleries/Painterly-Fine-Art-Photography/Transportation'
    ],
    traditionalLandscapes: [
      '/Galleries/Fine-Art-Photography/Landscapes'
    ],
    traditionalTransportation: [
      '/Galleries/Fine-Art-Photography/Transportation'
    ],
    traditionalOther: [
      '/Galleries/Fine-Art-Photography/Architecture',
      '/Galleries/Fine-Art-Photography/Rural-Americana',
      '/Galleries/Fine-Art-Photography/Wildlife'
    ]
  };
  
  // Build each pool
  for (const [poolName, collectionPaths] of Object.entries(POOL_DEFINITIONS)) {
    console.log(`Building ${poolName} pool...`);
    
    const sources = findGallerySourcesByCollection(siteNav, collectionPaths);
    console.log(`  Found ${sources.length} gallery-source entries`);
    
    pools[poolName] = buildPoolRoundRobin(sources, MAX_IMAGES_PER_POOL, usedIds);
    
    // Mark used IDs so other pools don't duplicate
    pools[poolName].forEach(img => usedIds.add(img.id));
    
    console.log(`  → ${pools[poolName].length} images in pool\n`);
  }
  
  // Add hero metadata
  const output = {
    generated: new Date().toISOString(),
    heroIds: HERO_IDS,
    heroWebpSrcs: HERO_WEBP_SRCS,
    pools
  };
  
  // Write to public folder
  const outputPath = path.join(__dirname, '..', 'public', 'carouselPools.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`✅ Generated ${outputPath}`);
  
  // Summary
  const totalImages = Object.values(pools).reduce((sum, pool) => sum + pool.length, 0);
  console.log(`   Total images across all pools: ${totalImages}`);
}

main();
