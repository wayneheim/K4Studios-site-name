// scripts/generateMasterGalleryData.cjs

const fs   = require('fs');
const path = require('path');
const { siteNav } = require('../data/siteNav.js');

// ---- CONFIG ----
const ROOT_DIR        = path.resolve(__dirname, '../data/Galleries');
const OUTPUT_FILE_TS  = path.resolve(__dirname, '../data/galleryMaps/MasterGalleryData.ts');
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
    const rel  = href.replace(/^\/Galleries\//, '').replace(/\/$/, '');
    const file = path.join(ROOT_DIR, rel + '.mjs');
    if (!fs.existsSync(file)) continue;

    let raw;
    try {
      const mod = await import('file://' + file);
      raw = mod.galleryData || mod.default || [];
    } catch (e) {
      console.error(`Failed loading ${file}:`, e);
      continue;
    }
    // filter out your studio watermark & cap
    const filtered = raw.filter(img => img.id !== 'i-k4studios');
    const curated  = pullTopN(filtered);

    // map down to minimal shape
    galleryDataMap[href] = curated.map(img => ({
      id:       img.id,
      src:      img.src,
      rating:   img.rating,
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
