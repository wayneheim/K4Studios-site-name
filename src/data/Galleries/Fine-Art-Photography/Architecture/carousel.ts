// carousel.ts for Fine Art Architecture (single gallery, not by-theme)

const modules = import.meta.glob(
  '@/data/Galleries/Fine-Art-Photography/Architecture/Gallery/Gallery.mjs',
  { eager: true }
);

let galleryData = [];
for (const filePath in modules) {
  const mod = modules[filePath];
  const data = mod.galleryData || (mod.default && mod.default.galleryData);
  if (Array.isArray(data)) {
    galleryData = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
    break;
  }
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

// Helper: Convert image to slide object
function toSlide(img) {
  return {
    href: `/Galleries/Fine-Art-Photography/Architecture/${img.id}`,
    src: img.src || img.url || '',
    alt: img.alt || img.title || '',
    description: img.description || ''
  };
}

// Build the slides from the single gallery (up to maxSlides)
export const slides = (() => {
  const pool = buildRankedPool(galleryData);
  const maxSlides = 10;
  return pool.slice(0, maxSlides).map(toSlide);
})();
