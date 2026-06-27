// --- Carousel: Images from Painterly Miscellaneous Section Only ---
// Import all gallery .mjs files from the Miscellaneous branch only
const allModules = import.meta.glob('@/data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/*.mjs', { eager: true });

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
  // Robust src fallback logic: desktop order (srcM, srcS, srcL, src)
  let src = img.srcM || img.srcS || img.srcL || img.src || '';
  // If srcS ends with -L.jpg, use srcS as override (for legacy/fallback)
  if (img.srcS && img.srcS.endsWith('-L.jpg')) {
    src = img.srcS;
  }
  return {
    href: `${path}/${img.id}`,
    id: img.id,
    src,
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    loading,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1} fade-in`
  };
}

// Collect all visible images from the Miscellaneous gallery
let allImages = [];
let galleryPath = '';
for (const filePath in allModules) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  const visible = data.filter(img => img.id !== 'i-k4studios' && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(img.visibility ?? 'show').trim().toLowerCase()));
  if (visible.length === 0) continue;
  allImages = allImages.concat(visible);
  if (!galleryPath) galleryPath = filePathToHref(filePath); // Use the first found path
}

// Helper: Convert file path to public gallery route (for slide links)
function filePathToHref(filePath) {
  return filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
}

// Shuffle images
allImages = shuffle(allImages);

// Number of slides to show
const SLIDE_COUNT = 8;
let slidesArr = [];
if (allImages.length > 0) {
  // If fewer images than needed, repeat as necessary
  while (slidesArr.length < SLIDE_COUNT) {
    for (let i = 0; i < allImages.length && slidesArr.length < SLIDE_COUNT; i++) {
      slidesArr.push(toSlide(allImages[i], galleryPath, slidesArr.length));
    }
  }
}

// Set loading: 'eager' for the first image, 'lazy' for the rest
const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  loading: idx === 0 ? 'eager' : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
