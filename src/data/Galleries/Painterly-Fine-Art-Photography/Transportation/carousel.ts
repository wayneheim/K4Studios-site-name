// --- Carousel: Images from Painterly Transportation Section Only ---
// Import all gallery .mjs files from the Transportation branch only
const allModules = import.meta.glob('@/data/Galleries/Painterly-Fine-Art-Photography/Transportation/*.mjs', { eager: true });

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
  return {
    href: `${path}/${img.id}`,
    src: img.srcM || img.src || img.url || '', // Use srcM for carousel, fallback to src
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    loading,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1} fade-in`
  };
}

// Collect visible images from each gallery
const galleryImages = [];
const galleryPaths = [];
for (const filePath in allModules) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  const visible = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) continue;
  galleryImages.push(shuffle([...visible])); // shuffle images in each gallery
  galleryPaths.push(filePathToHref(filePath));
}

// Helper: Convert file path to public gallery route (for slide links)
function filePathToHref(filePath) {
  return filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
}

// Number of slides to show
const SLIDE_COUNT = 8;
let slidesArr = [];
let usedIds = new Set();
let round = 0;
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
  // If no new images were added in this round, break to avoid infinite loop
  if (!addedThisRound) break;
}
// If not enough images, start over and allow repeats
while (slidesArr.length < SLIDE_COUNT && galleryImages.length > 0) {
  for (let g = 0; g < galleryImages.length && slidesArr.length < SLIDE_COUNT; g++) {
    const images = galleryImages[g];
    const path = galleryPaths[g];
    // Pick next image, even if already used
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
