/**
 * Generate stable image filename slugs.
 *
 * Existing descriptive entries are intentionally never overwritten. The first
 * recorded title becomes the public filename stem, so later title edits do not
 * churn image URLs in search indexes.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../src/data/imageFilenameSlugs.json');
const SOURCE_ROOTS = [
  path.join(__dirname, '../src/data'),
  path.join(__dirname, '../public/data'),
];
const GHOST_IMAGE_ID = 'i-k4studios';
const PLACEHOLDER_TITLE_SLUGS = new Set([
  'untitled',
  'untitled-photo',
  'untitled-image',
  'image',
  'photo',
]);

function slugify(value, fallback = 'image') {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return slug || fallback;
}

function readExistingRegistry() {
  if (!fs.existsSync(OUTPUT_PATH)) return {};

  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to parse ${OUTPUT_PATH}: ${error.message}`);
  }
}

function sortObjectByKey(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
  );
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (/\.(mjs|js|cjs|ts|json)$/i.test(entry.name)) {
      out.push(fullPath);
    }
  }

  return out;
}

function unescapeStringLiteral(value) {
  return String(value || '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .trim();
}

function isIdFallback(imageId, slug) {
  return String(slug || '').toLowerCase() === slugify(imageId.replace(/^i-/i, ''), 'image');
}

function isPlaceholderSlug(slug) {
  return PLACEHOLDER_TITLE_SLUGS.has(String(slug || '').toLowerCase());
}

function collectTitleSlugsFromSource() {
  const titleById = {};
  const files = SOURCE_ROOTS.flatMap((root) => walkFiles(root)).sort();
  const objectPattern = /[{,]\s*["']?id["']?\s*:\s*["'](i-[A-Za-z0-9-]+)["'][\s\S]{0,1800}?["']?title["']?\s*:\s*["']((?:\\.|[^"'\\])+)["']/g;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
    if (/src\/data\/imageFilenameSlugs\.json$/i.test(relativePath)) continue;
    if (/src\/data\/galleryMaps\/MasterGalleryData\.mjs$/i.test(relativePath)) continue;

    const source = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = objectPattern.exec(source))) {
      const imageId = match[1];
      if (imageId.toLowerCase() === GHOST_IMAGE_ID) continue;
      if (titleById[imageId]) continue;

      const title = unescapeStringLiteral(match[2]);
      if (!title) continue;
      const slug = slugify(title, imageId.replace(/^i-/i, '') || 'image');
      if (isPlaceholderSlug(slug)) continue;
      if (titleById[imageId] && !isPlaceholderSlug(titleById[imageId])) continue;
      titleById[imageId] = slug;
    }
  }

  return titleById;
}

function generateImageFilenameSlugs() {
  console.log('Generating stable image filename slugs...');

  const existing = readExistingRegistry();
  const next = { ...existing };
  const sourceSlugs = collectTitleSlugsFromSource();

  let added = 0;
  let preserved = 0;
  let repairedIdFallbacks = 0;
  let repairedPlaceholders = 0;

  for (const [imageId, slug] of Object.entries(sourceSlugs)) {
    if (next[imageId]) {
      if (isIdFallback(imageId, next[imageId]) && slug !== next[imageId]) {
        next[imageId] = slug;
        repairedIdFallbacks++;
      } else if (isPlaceholderSlug(next[imageId]) && !isPlaceholderSlug(slug) && slug !== next[imageId]) {
        next[imageId] = slug;
        repairedPlaceholders++;
      } else {
        preserved++;
      }
      continue;
    }

    next[imageId] = slug;
    added++;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortObjectByKey(next), null, 2) + '\n');

  console.log(`Stable image filename slugs complete:`);
  console.log(`- ${Object.keys(sourceSlugs).length} titled image IDs found`);
  console.log(`- ${preserved} existing slugs preserved`);
  console.log(`- ${repairedIdFallbacks} ID fallback slugs repaired`);
  console.log(`- ${repairedPlaceholders} placeholder slugs repaired`);
  console.log(`- ${added} new slugs added`);
  console.log(`- Written to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

try {
  generateImageFilenameSlugs();
} catch (error) {
  console.error('Failed to generate image filename slugs:', error);
  process.exit(1);
}
