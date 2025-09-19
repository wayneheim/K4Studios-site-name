// --- Carousel: Static Cowboy Hero Image, Random Alternating Rest ---

const allModules = import.meta.glob('@/data/Galleries/**/*.mjs', { eager: true });
import { normalizeImage } from '@/components/utils/normalizeImage';

// ---- 1. CHOOSE YOUR STATIC HERO IMAGE ----
// Use the image ID you want as your fixed cowboy hero (replace with any you like)
const STATIC_COWBOY_ID = 'i-ncFcHDM'; // <-- CHANGE this to any single ID you want

// ---- 2. Find the cowboy hero image ----
let staticCowboyImg = null;
let staticCowboyPath = '';
for (const filePath in allModules) {
  if (filePath.includes('Western-Cowboy-Portraits')) {
    const gallery = allModules[filePath].galleryData || allModules[filePath].default?.galleryData || [];
    const img = gallery.find(img => img.id === STATIC_COWBOY_ID);
    if (img) {
      staticCowboyImg = img;
      staticCowboyPath = filePathToHref(filePath);
      break;
    }
  }
}
if (!staticCowboyImg) throw new Error('Static cowboy hero image not found!');

// ---- 3. Responsive src selector (uses srcS for mobile, srcM for desktop, with fallback) ----
function selectResponsiveSrc(img) {
  const isMobile =
    typeof window !== 'undefined'
      ? window.innerWidth <= 700
      : false; // SSR fallback: treat as desktop if unknown
  if (isMobile) {
    return img.srcS || img.srcM || img.srcL || img.src || '';
  } else {
    return img.srcM || img.srcS || img.srcL || img.src || '';
  }
}

// ---- 4. filePath to gallery href ----
function filePathToHref(filePath) {
  return filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
}

// ---- 5. Slide builder ----
function toSlide(rawImg, path, idx) {
  const img = normalizeImage({ ...rawImg });
  return {
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
const staticCowboySlide = toSlide(staticCowboyImg, staticCowboyPath, 0);

// ---- 6. Pool logic for randomized slides ----
function getGalleryData(mod) {
  return mod.galleryData || (mod.default && mod.default.galleryData) || [];
}
function buildRankedPool(images) {
  const ratings = [5, 4, 3];
  let pool = [];
  ratings.forEach(r => {
    pool.push(...images.filter(img => img.rating === r).sort(() => Math.random() - 0.5));
  });
  pool.push(...images.filter(img => !ratings.includes(img.rating)).sort(() => Math.random() - 0.5));
  return pool;
}
function pickRandomFromPools(pools, n) {
  const picks = [];
  const usedPools = new Set();
  while (picks.length < n && usedPools.size < pools.length) {
    const available = pools.filter((_, i) => !usedPools.has(i));
    if (available.length === 0) break;
    const poolIdx = Math.floor(Math.random() * available.length);
    const realIdx = pools.indexOf(available[poolIdx]);
    if (pools[realIdx].images.length === 0) continue;
    // Do NOT allow the static cowboy hero to repeat
    const imgPool = pools[realIdx].images.filter(img => img.id !== STATIC_COWBOY_ID);
    if (imgPool.length === 0) { usedPools.add(realIdx); continue; }
    const imgIdx = Math.floor(Math.random() * imgPool.length);
    picks.push({ img: imgPool[imgIdx], path: pools[realIdx].path });
    usedPools.add(realIdx);
  }
  return picks;
}

// ---- 7. Build randomized pools (excluding cowboy hero from rest) ----
const painterlyPools = [];
const traditionalPools = [];
for (const filePath in allModules) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  // Filter out ghost, hero, and placeholder images
  const visible = data.filter(img =>
    img.id !== 'i-k4studios' &&
    img.visibility !== 'ghost' &&
    img.id !== STATIC_COWBOY_ID
  );
  if (visible.length === 0) continue;
  if (filePath.includes('/Painterly-Fine-Art-Photography/')) {
    painterlyPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  } else if (filePath.includes('/Fine-Art-Photography/')) {
    traditionalPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  }
}

// ---- 8. Pick 3 from each, alternate painterly/traditional, shuffle order ----
const painterlyPicks = pickRandomFromPools(painterlyPools, 3);
const traditionalPicks = pickRandomFromPools(traditionalPools, 3);
const slidesArr = [];
for (let i = 0; i < 4; i++) {
  if (painterlyPicks[i]) slidesArr.push({ ...toSlide(painterlyPicks[i].img, painterlyPicks[i].path, slidesArr.length) });
  if (traditionalPicks[i]) slidesArr.push({ ...toSlide(traditionalPicks[i].img, traditionalPicks[i].path, slidesArr.length) });
}

// ---- 9. Compose slides: hero is always first ----
const allSlidesArr = [staticCowboySlide, ...slidesArr];

// ---- 10. Set fetchpriority: 'high' and no loading attr for the first image, 'lazy' for the rest ----
const slides = allSlidesArr.map((slide, idx) => ({
  ...slide,
  fetchpriority: idx === 0 ? 'high' : undefined,
  loading: idx === 0 ? undefined : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
