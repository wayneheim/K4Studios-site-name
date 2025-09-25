// --- Carousel: Images from Traditional Section Only ---
// Import all gallery .mjs files from the traditional section
const allModules = import.meta.glob('@/data/Galleries/**/*.mjs', { eager: true });

// Helper: Get gallery data from module
function getGalleryData(mod) {
  return mod.galleryData || (mod.default && mod.default.galleryData) || [];
}

// Helper: Build a pool prioritized by rating (5 → 4 → 3 → others), randomized per rating
function buildRankedPool(images) {
  const ratings = [5, 4, 3];
  let pool = [];
  ratings.forEach(r => {
    pool.push(...images.filter(img => img.rating === r).sort(() => Math.random() - 0.5));
  });
  pool.push(...images.filter(img => !ratings.includes(img.rating)).sort(() => Math.random() - 0.5));
  return pool;
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
    src,
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    loading,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1} fade-in` // add nth-child as a class for stagger support and fade-in effect
  };
}

// Categorize modules by traditional section only
const traditionalPools = [];
for (const filePath in allModules) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  // Filter out ghost and placeholder images
  const visible = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) continue;
  // Include only traditional section
  if (filePath.includes('/Fine-Art-Photography/')) {
    traditionalPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  }
}

// Helper: Convert file path to public gallery route (for slide links)
function filePathToHref(filePath) {
  let url = filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
  // Remove duplicate theme/filename if present (e.g., /Color/Color/)
  const parts = url.split('/');
  if (parts.length > 3 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.splice(parts.length - 2, 1); // Remove the duplicate
    url = parts.join('/');
  }
  return url;
}

// Helper: Randomly pick N images from different pools (one per pool, if possible)
function pickRandomFromPools(pools, n) {
  const picks = [];
  const usedPools = new Set();
  while (picks.length < n && usedPools.size < pools.length) {
    // Pick a random pool not yet used
    const available = pools.filter((_, i) => !usedPools.has(i));
    if (available.length === 0) break;
    const poolIdx = Math.floor(Math.random() * available.length);
    const realIdx = pools.indexOf(available[poolIdx]);
    if (pools[realIdx].images.length === 0) continue;
    // Pick a random image from this pool
    const imgIdx = Math.floor(Math.random() * pools[realIdx].images.length);
    picks.push({ img: pools[realIdx].images[imgIdx], path: pools[realIdx].path });
    usedPools.add(realIdx);
  }
  return picks;
}

// Pick 8 images from traditional section
const traditionalPicks = pickRandomFromPools(traditionalPools, 8);
const slidesArr = traditionalPicks.map((pick, idx) => toSlide(pick.img, pick.path, idx));

// Set loading: 'eager' for the first image, 'lazy' for the rest
const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  loading: idx === 0 ? 'eager' : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '') // Optionally add 'loaded' for the first image
}));

export { slides };
