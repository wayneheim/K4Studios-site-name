// --- Carousel: Deterministic Hero from 3 Cowboy Images (always srcS), Dynamic Rest Responsive ---

const allModules = import.meta.glob('@/data/Galleries/**/*.mjs', { eager: true });
import { normalizeImage } from '@/components/utils/normalizeImage';

// CRITICAL: Sort file paths to ensure consistent order on server and client
const sortedFilePaths = Object.keys(allModules).sort();

// Your 3 hero cowboy image IDs (webp sources)
const staticLcpIds = ['i-ncFcHDM', 'i-KtmPcCf', 'i-rqk5Kdk'];

// Map hero IDs to their .webp image paths in /public/images
const heroWebpSrcs = {
  'i-ncFcHDM': '/images/i-ncFcHDM.webp',
  'i-KtmPcCf': '/images/i-KtmPcCf.webp',
  'i-rqk5Kdk': '/images/i-rqk5Kdk.webp',
};

// --- Find all hero matches, collecting their file path and img object ---
const heroCandidates = [];
for (const filePath of sortedFilePaths) {
  if (filePath.includes('Western-Cowboy-Portraits')) {
    const gallery = allModules[filePath].galleryData || allModules[filePath].default?.galleryData || [];
    for (const heroId of staticLcpIds) {
      const heroImg = gallery.find(img => img.id === heroId);
      if (heroImg) heroCandidates.push({ img: heroImg, filePath });
    }
  }
}
if (heroCandidates.length === 0) throw new Error('No Cowboy hero images found!');

// --- Pick FIRST hero (deterministic to avoid hydration mismatch) ---
const heroIdx = 0;
const { img: staticCowboyImg, filePath: staticCowboyFilePath } = heroCandidates[heroIdx];


// --- Always use .webp for hero, fallback to srcS if not found ---
function selectStaticHeroSrc(img) {
  if (heroWebpSrcs[img.id]) return heroWebpSrcs[img.id];
  return img.srcS || img.srcM || img.srcL || img.src || '';
}

function filePathToHref(filePath) {
  let url = filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
  // Remove duplicate theme/filename if present (e.g., /Color/Color/)
  const parts = url.split('/').filter(Boolean);
  if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop();
    url = '/' + parts.join('/');
  }
  return url;
}

// --- toSlide for regular slides ---
function toSlide(rawImg, path, idx) {
  const img = normalizeImage({ ...rawImg });
  // Prevent duplicate slug in href (e.g., /Sunsets/Sunsets/i-xxxx)
  let cleanPath = path;
  const pathParts = path.split('/').filter(Boolean);
  if (pathParts.length > 1 && pathParts[pathParts.length - 1] === pathParts[pathParts.length - 2]) {
    // Remove duplicate last segment
    pathParts.pop();
    cleanPath = '/' + pathParts.join('/');
  }
  return {
    id: img.id,
    href: `${cleanPath}/${img.id}`,
    src: selectResponsiveSrc(img), // responsive for all others!
    srcS: img.srcS,
    srcM: img.srcM,
    srcL: img.srcL,
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width,
    height: img.height,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1}`
  };
}

// --- Responsive src for regular slides ---
function selectResponsiveSrc(img) {
  // Always prefer srcS, fallback to srcM, srcL, src
  let src = img.srcS || img.srcM || img.srcL || img.src || '';
  // Special case: if srcS is actually a large image (ends with -L.jpg), still use it
  if (img.srcS && img.srcS.endsWith('-L.jpg')) {
    src = img.srcS;
  }
  return src;
}

// --- Build pools (excluding all hero candidates) ---
function getGalleryData(mod) {
  return mod.galleryData || (mod.default && mod.default.galleryData) || [];
}
function buildRankedPool(images) {
  const ratings = [5, 4, 3];
  let pool = [];
  // Randomize within each rating tier
  ratings.forEach(r => {
    pool.push(...images.filter(img => img.rating === r).sort(() => Math.random() - 0.5));
  });
  pool.push(...images.filter(img => !ratings.includes(img.rating)).sort(() => Math.random() - 0.5));
  return pool;
}
function pickFromPools(pools, n) {
  const picks = [];
  const usedPools = new Set();
  // Pick randomly from available pools
  while (picks.length < n && usedPools.size < pools.length) {
    const available = pools.filter((_, i) => !usedPools.has(i));
    if (available.length === 0) break;
    const poolIdx = Math.floor(Math.random() * available.length);
    const realIdx = pools.indexOf(available[poolIdx]);
    if (pools[realIdx].images.length === 0) { usedPools.add(realIdx); continue; }
    const imgIdx = Math.floor(Math.random() * pools[realIdx].images.length);
    const chosen = pools[realIdx].images[imgIdx];
    if (staticLcpIds.includes(chosen.id)) continue; // exclude any hero IDs from random
    picks.push({ img: chosen, path: pools[realIdx].path });
    usedPools.add(realIdx);
  }
  return picks;
}

const painterlyPools = [];
const traditionalPools = [];
// Use sorted file paths for deterministic order
for (const filePath of sortedFilePaths) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  const visible = data.filter(img =>
    img.id !== 'i-k4studios' &&
    img.visibility !== 'ghost' &&
    !staticLcpIds.includes(img.id)
  );
  if (visible.length === 0) continue;
  if (filePath.includes('/Painterly-Fine-Art-Photography/')) {
    painterlyPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  } else if (filePath.includes('/Fine-Art-Photography/')) {
    traditionalPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  }
}

// --- Pick from pools deterministically ---
const painterlyPicks = pickFromPools(painterlyPools, 3);
const traditionalPicks = pickFromPools(traditionalPools, 3);
const slidesArr = [];
for (let i = 0; i < 4; i++) {
  if (painterlyPicks[i]) slidesArr.push({ ...toSlide(painterlyPicks[i].img, painterlyPicks[i].path, slidesArr.length) });
  if (traditionalPicks[i]) slidesArr.push({ ...toSlide(traditionalPicks[i].img, traditionalPicks[i].path, slidesArr.length) });
}

// --- Hero slide: *ALWAYS* srcS for hero, even on desktop ---
const staticCowboySlide = {
  ...normalizeImage({ ...staticCowboyImg }),
  id: staticCowboyImg.id,
  href: `${filePathToHref(staticCowboyFilePath)}/${staticCowboyImg.id}`,
  src: selectStaticHeroSrc(staticCowboyImg),     // <--- ALWAYS .webp if available
  srcS: heroWebpSrcs[staticCowboyImg.id] || staticCowboyImg.srcS,
  srcM: staticCowboyImg.srcM,
  srcL: staticCowboyImg.srcL,
  alt: staticCowboyImg.alt || staticCowboyImg.title || '',
  description: staticCowboyImg.description || '',
  width: staticCowboyImg.width,
  height: staticCowboyImg.height,
  className: `k4-home-carousel-img k4-home-carousel-img--1`
};

// --- Combine hero + rest ---
const allSlidesArr = [staticCowboySlide, ...slidesArr];

// --- Set priorities and export ---
const slides = allSlidesArr.map((slide, idx) => ({
  ...slide,
  fetchpriority: idx === 0 ? 'high' : undefined,
  loading: idx === 0 ? undefined : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
