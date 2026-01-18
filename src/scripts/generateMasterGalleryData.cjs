// scripts/generateMasterGalleryData.cjs

const fs   = require('fs');
const path = require('path');
const { siteNav } = require('../data/siteNav.js');

// ---- CONFIG ----
const ROOT_DIR        = path.resolve(__dirname, '../data/Galleries');
const OTHER_DIR       = path.resolve(__dirname, '../data/Other');
const OUTPUT_FILE_TS  = path.resolve(__dirname, '../data/galleryMaps/MasterGalleryData.mjs');
const PER_GALLERY_LIMIT = 20;

// ---- HELPERS ----
function walkNavForGalleries(node) {
  if (Array.isArray(node)) return node.flatMap(walkNavForGalleries);
  let out = [];
  if (node.type === 'gallery-source') out.push(node.href);
  if (node.children) out = out.concat(node.children.flatMap(walkNavForGalleries));
  return out;
}

function pullTopN(images, limit = PER_GALLERY_LIMIT) {
  const buckets = [
    images.filter(i => i.rating === 5),
    images.filter(i => i.rating === 4),
    images.filter(i => i.rating === 3),
    images.filter(i => i.rating === undefined),
    images.filter(i => i.rating !== undefined && i.rating < 3),
  ];
  const out = [];
  for (const bucket of buckets) {
    const need = limit - out.length;
    if (need <= 0) break;
    out.push(...bucket.slice(0, need));
  }
  return out;
}

// ---- MAIN BUILD ----
async function build() {
  // 1) Gather every gallery href
  const galleryHrefs = walkNavForGalleries(siteNav);

  // 2) Import & curate each gallery
  const galleryDataMap = {};

  for (const href of galleryHrefs) {
    // Only process leaf galleries (no children in siteNav)
    const navNode = findNavNodeByHref(siteNav, href);
    if (navNode && navNode.children && navNode.children.length > 0) {
      // Skip parent nodes
      continue;
    }
    
    // Determine which root directory to use based on path
    let fileToUse = null;
    
    if (href.startsWith('/Galleries/')) {
      // Standard Galleries path
      const rel = href.replace(/^\/Galleries\//, '');
      const flatFile   = path.join(ROOT_DIR, ...rel.split('/')) + '.mjs';
      const nestedFile = path.join(ROOT_DIR, ...rel.split('/'), rel.split('/').slice(-1)[0] + '.mjs');
      
      if (fs.existsSync(flatFile)) {
        fileToUse = flatFile;
      } else if (fs.existsSync(nestedFile)) {
        fileToUse = nestedFile;
      }
    } else if (href.startsWith('/Other/')) {
      // Other path (includes Archive)
      const rel = href.replace(/^\/Other\//, '');
      const flatFile   = path.join(OTHER_DIR, ...rel.split('/')) + '.mjs';
      const nestedFile = path.join(OTHER_DIR, ...rel.split('/'), rel.split('/').slice(-1)[0] + '.mjs');
      
      if (fs.existsSync(flatFile)) {
        fileToUse = flatFile;
      } else if (fs.existsSync(nestedFile)) {
        fileToUse = nestedFile;
      }
    }

    if (!fileToUse) {
      continue;
    }
// Helper to find a nav node by href
function findNavNodeByHref(node, href) {
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findNavNodeByHref(n, href);
      if (found) return found;
    }
    return null;
  }
  if (node.href === href) return node;
  if (node.children) {
    for (const ch of node.children) {
      const found = findNavNodeByHref(ch, href);
      if (found) return found;
    }
  }
  return null;
}

    let raw;
    try {
      const mod = await import('file://' + fileToUse);
      raw = mod.galleryData || mod.default || [];
    } catch (e) {
      console.error(`Failed loading ${fileToUse}:`, e);
      continue;
    }
    // filter out your studio watermark & cap
    const filtered = raw.filter(img => img.id !== 'i-k4studios');
    const curated  = filtered;

    // Always use the original href as the key, regardless of file location
    galleryDataMap[href] = curated.map(img => ({
      id:       img.id,
      srcS:     img.srcS || '',
      srcM:     img.srcM || '',
      srcL:     img.srcL || '',
      srcXL:    img.srcXL || '',
      src:      img.srcS || img.srcM || img.srcL || img.srcXL || img.src || '',
      rating:   img.rating,
      visibility: img.visibility || 'show', // Track visibility for smart-404 filtering
      galleries: [ href.replace(/^\//, '') ]
    }));
  }

  // 3) Build section→galleries by prefix matching
  const allGalleryKeys = Object.keys(galleryDataMap);
  function walkSections(node, out = []) {
    if (Array.isArray(node)) return node.flatMap(n => walkSections(n, out));
    if (node.href) out.push(node.href);
    if (node.children) node.children.forEach(ch => walkSections(ch, out));
    return out;
  }
  const allSections = Array.from(new Set(walkSections(siteNav)));
  const sectionGalleries = {};
  for (const sec of allSections) {
    const kids = allGalleryKeys.filter(g => g.startsWith(sec + '/'));
    if (kids.length) sectionGalleries[sec] = kids;
  }

  // 4) Flatten minimal allImages
  const allImages = Object.values(galleryDataMap).flat();

  // 5) Emit TS module
  const lines = [
    `// Auto-generated master gallery data (minimal)`,
    `export const galleryDataMap   = ${JSON.stringify(galleryDataMap, null, 2)};`,
    ``,
    `export const sectionGalleries = ${JSON.stringify(sectionGalleries, null, 2)};`,
    ``,
    `export const allImages        = ${JSON.stringify(allImages, null, 2)};`,
    ``
  ];
  fs.mkdirSync(path.dirname(OUTPUT_FILE_TS), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE_TS, lines.join('\n'));

  console.log(`✅ ${path.relative(process.cwd(), OUTPUT_FILE_TS)} written: `
    + `${allGalleryKeys.length} galleries, ${allImages.length} images.`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
