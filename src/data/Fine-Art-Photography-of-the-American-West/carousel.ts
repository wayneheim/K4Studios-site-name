// --- Carousel: Fine Art Photography of the American West ---
// Blend frontier portraiture with American West landscapes for the umbrella page.
import { galleryData as cowboyColor } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBW } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as cowboyNA } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';
import { galleryData as landscapeWest } from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs';
import { galleryData as themeMountains } from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs';

const gallerySources = [
  { data: cowboyColor, path: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color' },
  { data: cowboyBW, path: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White' },
  { data: cowboyNA, path: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color' },
  { data: landscapeWest, path: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery' },
  { data: themeMountains, path: '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains' },
];

function buildRankedPool(images: any[]) {
  const ratings = [5, 4, 3];
  let pool: any[] = [];
  ratings.forEach(r => {
    pool.push(...images.filter(img => img.rating === r).sort(() => Math.random() - 0.5));
  });
  pool.push(...images.filter(img => !ratings.includes(img.rating)).sort(() => Math.random() - 0.5));
  return pool;
}

function toSlide(img: any, path: string, idx: number, loading = 'lazy') {
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

const pools = gallerySources.map(({ data, path }) => {
  const visible = (data || []).filter((img: any) => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  return { images: buildRankedPool(visible), path };
}).filter(pool => pool.images.length > 0);

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

  while (picks.length < n) {
    const poolIdx = Math.floor(Math.random() * poolsArr.length);
    const imgIdx = Math.floor(Math.random() * poolsArr[poolIdx].images.length);
    picks.push({ img: poolsArr[poolIdx].images[imgIdx], path: poolsArr[poolIdx].path });
  }

  return picks;
}

const picks = pickRandomFromPools(pools, 8);
const slidesArr = picks.map((pick, idx) => toSlide(pick.img, pick.path, idx));

const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  loading: idx === 0 ? 'eager' : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };