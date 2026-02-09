// --- Carousel: Static Cowboy Hero, Random Alternating for Rest ---

// Import all gallery .mjs files from both painterly and traditional sections
const allModules = import.meta.glob('@/data/Galleries/**/*.mjs', { eager: true });
import { normalizeImage } from '@/components/utils/normalizeImage';

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
function toSlide(rawImg, path, idx) {
  const img = normalizeImage({ ...rawImg });
  return {
    id: img.id,
    href: `${path}/${img.id}`,
    src: selectResponsiveSrc(img),
    srcS: img.srcS,
    srcM: img.srcM,
    srcL: img.srcL,
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1}`
  };
}

// --- 1. Find and prepare the static Cowboy image for hero/LCP ---
let staticCowboySlide = null;

// Look for Cowboy Color gallery and that ID
for (const filePath in allModules) {
  if (filePath.includes('Western-Cowboy-Portraits/Color')) {
    const gallery = getGalleryData(allModules[filePath]);
    // Try to find the requested image ID
    const staticImg = gallery.find(img => img.id === 'i-ncFcHDM');
    if (staticImg) {
      staticCowboySlide = toSlide(staticImg, filePathToHref(filePath), 0);
      break;
    }
  }
}
if (!staticCowboySlide) {
  throw new Error("Static Cowboy LCP image (i-ncFcHDM) not found in Cowboy Color gallery!");
}

// --- 2. Build pools as before (Painterly & Traditional), but EXCLUDE the static image ---
const painterlyPools = [];
const traditionalPools = [];
for (const filePath in allModules) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  // Filter out ghost/placeholder and the static Cowboy image
  const visible = data.filter(
    img => img.id !== 'i-k4studios' && img.visibility !== 'ghost' && img.id !== 'i-ncFcHDM'
  );
  if (visible.length === 0) continue;
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

// --- 3. Pick 3 from each, alternate painterly/traditional, shuffle order ---
const painterlyPicks = pickRandomFromPools(painterlyPools, 3);
const traditionalPicks = pickRandomFromPools(traditionalPools, 3);
const slidesArr = [];
for (let i = 0; i < 4; i++) {
  if (painterlyPicks[i]) slidesArr.push({ ...toSlide(painterlyPicks[i].img, painterlyPicks[i].path, slidesArr.length) });
  if (traditionalPicks[i]) slidesArr.push({ ...toSlide(traditionalPicks[i].img, traditionalPicks[i].path, slidesArr.length) });
}

// --- 4. Prepend the static Cowboy slide as the first slide ---
const allSlidesArr = [staticCowboySlide, ...slidesArr];

// --- 5. Set fetchpriority: 'high' and no loading attr for the first image, 'lazy' for the rest ---
const slides = allSlidesArr.map((slide, idx) => ({
  ...slide,
  fetchpriority: idx === 0 ? 'high' : undefined,
  loading: idx === 0 ? undefined : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
