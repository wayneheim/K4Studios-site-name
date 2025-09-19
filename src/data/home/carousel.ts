// --- Carousel: Robust Random Hero from 3 Cowboy Images, Dynamic Rest ---

const allModules = import.meta.glob('@/data/Galleries/**/*.mjs', { eager: true });
import { normalizeImage } from '@/components/utils/normalizeImage';

const staticLcpIds = ['i-ncFcHDM', 'i-KtmPcCf', 'i-rqk5Kdk'];

// --- Find all hero matches (any Cowboy subfolder), and their real gallery path
const heroCandidates = [];
for (const filePath in allModules) {
  if (filePath.includes('Western-Cowboy-Portraits')) {
    const gallery = allModules[filePath].galleryData || allModules[filePath].default?.galleryData || [];
    for (const heroId of staticLcpIds) {
      const heroImg = gallery.find(img => img.id === heroId);
      if (heroImg) heroCandidates.push({ img: heroImg, filePath });
    }
  }
}
if (heroCandidates.length === 0) throw new Error('No Cowboy hero images found!');

// --- Pick one at random for LCP/hero ---
const heroIdx = Math.floor(Math.random() * heroCandidates.length);
const { img: staticCowboyImg, filePath: staticCowboyFilePath } = heroCandidates[heroIdx];
const staticCowboyId = staticCowboyImg.id;

// --- Responsive src selector (as requested) ---
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
function filePathToHref(filePath) {
  return filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
}
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
    width: img.width,
    height: img.height,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1}`
  };
}
const staticCowboySlide = toSlide(staticCowboyImg, filePathToHref(staticCowboyFilePath), 0);

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
    if (pools[realIdx].images.length === 0) { usedPools.add(realIdx); continue; }
    const imgIdx = Math.floor(Math.random() * pools[realIdx].images.length);
    const chosen = pools[realIdx].images[imgIdx];
    if (staticLcpIds.includes(chosen.id)) continue;
    picks.push({ img: chosen, path: pools[realIdx].path });
    usedPools.add(realIdx);
  }
  return picks;
}

// --- Build pools (excluding all hero candidates) ---
const painterlyPools = [];
const traditionalPools = [];
for (const filePath in allModules) {
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

// --- Pick from pools as usual ---
const painterlyPicks = pickRandomFromPools(painterlyPools, 3);
const traditionalPicks = pickRandomFromPools(traditionalPools, 3);
const slidesArr = [];
for (let i = 0; i < 4; i++) {
  if (painterlyPicks[i]) slidesArr.push({ ...toSlide(painterlyPicks[i].img, painterlyPicks[i].path, slidesArr.length) });
  if (traditionalPicks[i]) slidesArr.push({ ...toSlide(traditionalPicks[i].img, traditionalPicks[i].path, slidesArr.length) });
}

const allSlidesArr = [staticCowboySlide, ...slidesArr];
const slides = allSlidesArr.map((slide, idx) => ({
  ...slide,
  fetchpriority: idx === 0 ? 'high' : undefined,
  loading: idx === 0 ? undefined : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
