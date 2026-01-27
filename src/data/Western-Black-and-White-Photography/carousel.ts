// --- Carousel: Images from Black & White Western gallery ONLY ---
import { galleryData as cowboyBW } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';

// Define gallery source with path
const gallerySources = [
  { data: cowboyBW, path: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White' },
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

// Helper: Convert image to slide object, with loading, width, height, and custom css class
function toSlide(img: any, path: string, idx: number, loading = "lazy") {
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

// Build pool from B/W gallery only
const bwPool = gallerySources.map(({ data, path }) => {
  const visible = (data || []).filter((img: any) => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  return { images: buildRankedPool(visible), path };
}).filter(pool => pool.images.length > 0);

// Helper: Randomly pick N images from the pool
function pickRandomFromPool(pool: { images: any[]; path: string }[], n: number) {
  const picks: { img: any; path: string }[] = [];
  if (pool.length === 0 || pool[0].images.length === 0) return picks;
  
  const source = pool[0];
  const shuffled = [...source.images].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(n, shuffled.length); i++) {
    picks.push({ img: shuffled[i], path: source.path });
  }
  return picks;
}

// Pick 8 images from the B/W Western gallery
const bwPicks = pickRandomFromPool(bwPool, 8);
const slidesArr = bwPicks.map((pick, idx) => toSlide(pick.img, pick.path, idx));

// Set loading: 'eager' for the first image, 'lazy' for the rest
const slides = slidesArr.map((slide, idx) => ({
  ...slide,
  loading: idx === 0 ? 'eager' : 'lazy',
  className: slide.className + (idx === 0 ? ' loaded' : '')
}));

export { slides };
