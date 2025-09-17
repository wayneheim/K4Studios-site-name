import { siteNav } from '../../../siteNav';

// Helper: Recursively find all gallery-source nodes under a given href
function findGallerySources(node, baseHref) {
  let out = [];
  if (Array.isArray(node)) {
    for (const n of node) out = out.concat(findGallerySources(n, baseHref));
    return out;
  }
  if (node.type === 'gallery-source' && node.href.startsWith(baseHref)) return [node];
  if (node.children) return findGallerySources(node.children, baseHref);
  return [];
}

const LANDSCAPES_HREF = '/Galleries/Painterly-Fine-Art-Photography/Landscapes';
const gallerySources = findGallerySources(siteNav, LANDSCAPES_HREF);

// Import all gallery .mjs files for these sources
const allModules = import.meta.glob('@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/**/*.mjs', { eager: true });

// Helper: Get gallery data from module
function getGalleryData(mod) {
  return mod.galleryData || (mod.default && mod.default.galleryData) || [];
}

// Helper: Shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper: Convert image to slide object, with loading, width, height, and custom css class
function toSlide(img, path, idx, loading = "lazy") {
  // Use srcM, then srcS, then src, then url as fallback
  let src = img.srcM || img.srcS || img.src || img.url || '';
  // If src ends with 'L.jpg' and srcS exists, use srcS instead
  if (src && src.endsWith('L.jpg') && img.srcS) {
    src = img.srcS;
  }
  return {
    href: `${path}/${img.id}`,
    src,
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    loading,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1} fade-in`
  };
}

// Helper: Convert file path to public gallery route (for slide links)
function filePathToHref(filePath) {
  return filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
}

// Collect visible images from each gallery-source
const galleryImages = [];
const galleryPaths = [];
for (const source of gallerySources) {
  // Find the corresponding .mjs file (match the actual key in allModules)
  const mjsPath = `/src/data${source.href}.mjs`;
  const mod = allModules[mjsPath] || allModules[`.${mjsPath}`];
  if (!mod) continue;
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  const visible = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) continue;
  galleryImages.push(shuffle([...visible]));
  galleryPaths.push(source.href);
}

// Number of slides to show
const SLIDE_COUNT = 8;
let slidesArr = [];
let usedIds = new Set();
while (slidesArr.length < SLIDE_COUNT && galleryImages.length > 0) {
  let addedThisRound = false;
  for (let g = 0; g < galleryImages.length && slidesArr.length < SLIDE_COUNT; g++) {
    const images = galleryImages[g];
    const path = galleryPaths[g];
    // Find the first unused image in this gallery
    const img = images.find(image => !usedIds.has(image.id));
    if (img) {
      slidesArr.push(toSlide(img, path, slidesArr.length));
      usedIds.add(img.id);
      addedThisRound = true;
    }
  }
  if (!addedThisRound) break;
}
// If not enough images, start over and allow repeats
while (slidesArr.length < SLIDE_COUNT && galleryImages.length > 0) {
  for (let g = 0; g < galleryImages.length && slidesArr.length < SLIDE_COUNT; g++) {
    const images = galleryImages[g];
    const path = galleryPaths[g];
    const idx = (slidesArr.length - usedIds.size) % images.length;
    slidesArr.push(toSlide(images[idx], path, slidesArr.length));
  }
}

// Set loading: 'eager' for the first image, 'lazy' for the rest
const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  loading: idx === 0 ? 'eager' : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
