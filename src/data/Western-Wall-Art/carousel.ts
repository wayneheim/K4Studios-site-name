// --- Carousel: Images for Western Wall Art hub ---
// Mix of cowboy portraits and western landscapes - all print-worthy wall art
import { getOrderedWesternGalleryPaths } from '@/data/carousel/westernRouting.ts';
import { westernLandingGalleryDataMap } from '@/data/carousel/westernLandingContent.ts';
import { galleryData as landscapeWest } from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs';
import { galleryData as themeMountains } from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs';

const preferredWesternPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';

// Define gallery sources with their paths
const westernGallerySources = getOrderedWesternGalleryPaths(preferredWesternPath).map((path) => ({
  data: westernLandingGalleryDataMap[path] || [],
  path,
}));

const gallerySources = [
  ...westernGallerySources,
  { data: landscapeWest, path: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery' },
  { data: themeMountains, path: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains' },
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
  return {
    href: `${path}/${img.id}`,
    id: img.id,
    src: img.src || '',
    srcS: img.srcS || '',
    srcM: img.srcM || '',
    srcL: img.srcL || '',
    alt: img.alt || img.title || '',
    description: img.description || '',
    width: img.width || undefined,
    height: img.height || undefined,
    loading,
    className: `k4-home-carousel-img k4-home-carousel-img--${idx + 1} fade-in`
  };
}

// Build pools from the western galleries
const westernPools = gallerySources.map(({ data, path }) => {
  const visible = (data || []).filter((img: any) => img.id !== 'i-k4studios' && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(img.visibility ?? 'show').trim().toLowerCase()));
  return { images: buildRankedPool(visible), path };
}).filter(pool => pool.images.length > 0);

// Helper: Randomly pick N images from different pools (one per pool, if possible)
function pickRandomFromPools(pools: { images: any[]; path: string }[], n: number) {
  const picks: { img: any; path: string }[] = [];
  const usedPools = new Set<number>();
  while (picks.length < n && usedPools.size < pools.length) {
    const available = pools.filter((_, i) => !usedPools.has(i));
    if (available.length === 0) break;
    const poolIdx = Math.floor(Math.random() * available.length);
    const realIdx = pools.indexOf(available[poolIdx]);
    if (pools[realIdx].images.length === 0) continue;
    const imgIdx = Math.floor(Math.random() * pools[realIdx].images.length);
    picks.push({ img: pools[realIdx].images[imgIdx], path: pools[realIdx].path });
    usedPools.add(realIdx);
  }
  // If we need more and have used all pools, cycle through again
  while (picks.length < n) {
    const poolIdx = Math.floor(Math.random() * pools.length);
    const imgIdx = Math.floor(Math.random() * pools[poolIdx].images.length);
    picks.push({ img: pools[poolIdx].images[imgIdx], path: pools[poolIdx].path });
  }
  return picks;
}

// Pick 8 images for the wall art carousel
const wallArtPicks = pickRandomFromPools(westernPools, 8);
const slidesArr = wallArtPicks.map((pick, idx) => toSlide(pick.img, pick.path, idx));

// Set loading: 'eager' for the first image, 'lazy' for the rest
const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  loading: idx === 0 ? 'eager' : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
