// --- Carousel: Images from Historical Western Art galleries ---
// Pulls from multiple cowboy/western galleries to represent historical western themes
import { galleryData as cowboyColor } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBW } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as cowboyNA } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';

// Define gallery sources with their paths
const gallerySources = [
  { data: cowboyColor, path: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color' },
  { data: cowboyBW, path: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White' },
  { data: cowboyNA, path: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color' },
];

// Helper: Build a pool prioritized by rating (5 → 4 → 3 → others), randomized per rating
function buildRankedPool(images: any[]) {
  const ratings = [5, 4, 3];
  let pool: any[] = [];
  ratings.forEach(r => {
    pool.push(...images.filter(img => img.rating === r).sort(() => Math.random() - 0.5));
  });
  pool.push(...images.filter(img => !ratings.includes(img.rating)).sort(() => Math.random() - 0.5));
  return pool;
}

// Helper: Convert image to slide object
function toSlide(img: any, path: string, idx: number, loading = "lazy") {
  let src = img.srcM || img.srcS || img.srcL || img.src || '';
  if (img.srcS && img.srcS.endsWith('-L.jpg')) {
    src = img.srcS;
  }
  return {
    href: `${path}/${img.id}`,
    id: img.id,
    src,
    srcS: img.srcS || '',
    srcM: img.srcM || '',
    srcL: img.srcL || '',
    srcXL: img.srcXL || img.src || '',
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    loading,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1} fade-in`
  };
}

// Build pools from the galleries
const pools = gallerySources.map(({ data, path }) => {
  const visible = (data || []).filter((img: any) => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  return { images: buildRankedPool(visible), path };
}).filter(pool => pool.images.length > 0);

// Helper: Randomly pick N images from different pools (one per pool, if possible)
function pickRandomFromPools(poolsArr: { images: any[]; path: string }[], n: number) {
  const picks: { img: any; path: string }[] = [];
  const usedPools = new Set<number>();
  while (picks.length < n && usedPools.size < poolsArr.length) {
    const available = poolsArr.filter((_, i) => !usedPools.has(i));
    if (available.length === 0) break;
    const poolIdx = Math.floor(Math.random() * available.length);
    const realIdx = poolsArr.indexOf(available[poolIdx]);
    if (poolsArr[realIdx].images.length === 0) continue;
    const imgIdx = Math.floor(Math.random() * poolsArr[realIdx].images.length);
    picks.push({ img: poolsArr[realIdx].images[imgIdx], path: poolsArr[realIdx].path });
    usedPools.add(realIdx);
  }
  // If we need more and have used all pools, cycle through again
  while (picks.length < n) {
    const poolIdx = Math.floor(Math.random() * poolsArr.length);
    const imgIdx = Math.floor(Math.random() * poolsArr[poolIdx].images.length);
    picks.push({ img: poolsArr[poolIdx].images[imgIdx], path: poolsArr[poolIdx].path });
  }
  return picks;
}

// Pick 8 images for the carousel
const picks = pickRandomFromPools(pools, 8);
const slidesArr = picks.map((pick, idx) => toSlide(pick.img, pick.path, idx));

// Set loading: 'eager' for the first image, 'lazy' for the rest
const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  loading: idx === 0 ? 'eager' : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
