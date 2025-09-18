// --- Carousel: Random Alternating Images from Painterly & Traditional ---
// Import all gallery .mjs files from both painterly and traditional sections
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

// Helper: Select responsive src for mobile/desktop
function selectResponsiveSrc(img) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
  let src = '';
  if (isMobile) {
    src = img.srcS || img.srcM || img.srcL || img.src || '';
  } else {
    src = img.srcM || img.srcS || img.srcL || img.src || '';
  }
  // If srcS ends with -L.jpg, use srcS as override (for legacy/fallback)
  if (img.srcS && img.srcS.endsWith('-L.jpg')) {
    src = img.srcS;
  }
  return src;
}

// Helper: Convert image to slide object, with loading, width, height, and custom css class
function toSlide(img, path, idx) {
  return {
    href: `${path}/${img.id}`,
    src: selectResponsiveSrc(img),
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1}`
  };
}

// Categorize modules by painterly/traditional using path
const painterlyPools = [];
const traditionalPools = [];
for (const filePath in allModules) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  // Filter out ghost and placeholder images
  const visible = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) continue;
  // Determine type by path
  if (filePath.includes('/Painterly-Fine-Art-Photography/')) {
    painterlyPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  } else if (filePath.includes('/Fine-Art-Photography/')) {
    traditionalPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  }
}

// Helper: Convert file path to public gallery route (for slide links)
function filePathToHref(filePath) {
  return filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
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

// Pick 4 from each, alternate painterly/traditional, shuffle order
const painterlyPicks = pickRandomFromPools(painterlyPools, 4);
const traditionalPicks = pickRandomFromPools(traditionalPools, 4);
const slidesArr = [];
for (let i = 0; i < 4; i++) {
  if (painterlyPicks[i]) slidesArr.push({ ...toSlide(painterlyPicks[i].img, painterlyPicks[i].path, slidesArr.length) });
  if (traditionalPicks[i]) slidesArr.push({ ...toSlide(traditionalPicks[i].img, traditionalPicks[i].path, slidesArr.length) });
}

// Set fetchpriority: 'high' and no loading attr for the first image, 'lazy' for the rest
const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  fetchpriority: idx === 0 ? 'high' : undefined,
  loading: idx === 0 ? undefined : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
