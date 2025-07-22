// generatePainterlyMasterData.cjs

const fs = require('fs');
const path = require('path');
const { siteNav } = require('../data/siteNav.js');

// ---- CONFIG ----
const SECTION_PATH = '/Galleries/Painterly-Fine-Art-Photography';
const ROOT_DIR = path.resolve(__dirname, '../data/Galleries');
const OUTPUT_FILE = path.resolve(__dirname, '../data/galleryMaps/PainterlyMasterData.mjs');

// ---- UTILITIES ----
function walkNavTreeForGalleries(node) {
  let out = [];
  if (Array.isArray(node)) {
    for (const n of node) out = out.concat(walkNavTreeForGalleries(n));
    return out;
  }
  if (node.type === 'gallery-source') return [node.href];
  if (node.children) return node.children.flatMap(walkNavTreeForGalleries);
  return [];
}

function findNodeByHref(tree, href) {
  for (const node of tree) {
    if (node.href === href) return node;
    if (node.children) {
      const found = findNodeByHref(node.children, href);
      if (found) return found;
    }
  }
  return null;
}

function pullTop10(images, limit = 10) {
  const fives = images.filter(i => i.rating === 5);
  const fours = images.filter(i => i.rating === 4);
  const threes = images.filter(i => i.rating === 3);
  const unrated = images.filter(i => i.rating === undefined);
  const others = images.filter(i => i.rating !== undefined && i.rating < 3);

  const output = [];
  for (const group of [fives, fours, threes, unrated, others]) {
    const need = limit - output.length;
    if (need <= 0) break;
    output.push(...group.slice(0, need));
  }
  return output.slice(0, limit);
}

// ---- MAIN ----
async function build() {
  const root = findNodeByHref(siteNav, SECTION_PATH);
  if (!root) throw new Error('Section not found in siteNav');

  const galleryHrefs = walkNavTreeForGalleries(root);
  const galleryDataMap = {};

  for (const href of galleryHrefs) {
    const relPath = href.replace(/^\/Galleries/, '').replace(/\/$/, '');
    const fullPath = path.join(ROOT_DIR, relPath + '.mjs');

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Skipping missing file: ${fullPath}`);
      continue;
    }

    try {
      const mod = await import('file://' + fullPath);
      const galleryData = mod.galleryData || mod.default || [];

      // ✅ Overwrite galleries field with the actual path this image is being pulled from
      const curated = pullTop10(galleryData).map((img) => ({
        ...img,
        galleries: [href.replace(/^\/+/, '')],
      }));

      galleryDataMap[href] = curated;
    } catch (err) {
      console.error(`❌ Failed to load ${fullPath}:`, err);
    }
  }

  const output = `// Auto-generated master image list for Painterly\nexport const galleryDataMap = ${JSON.stringify(galleryDataMap, null, 2)};\n\nexport const allImages = Object.values(galleryDataMap).flat();\n`;

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log('✅ PainterlyMasterData.mjs written successfully.');
}

build().catch(console.error);
