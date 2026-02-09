// carousel.ts for Painterly Landscapes → By-Theme

// Import all gallery mjs modules for By-Theme from data directory
const modules = import.meta.glob('@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/*/*.mjs', { eager: true });

// Collect gallery datasets and URL paths
const galleryDatas = [];
const galleryPaths = [];

for (const filePath in modules) {
  const mod = modules[filePath];
  const data = mod.galleryData || (mod.default && mod.default.galleryData);
  if (!Array.isArray(data)) continue;
  // Filter out ghost and placeholder images
  const visible = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) continue;
  // Extract theme folder name from file path
  const match = filePath.match(/By-Theme\/([^/]+)\//);
  const theme = match ? match[1] : '';
  galleryDatas.push(visible);
  galleryPaths.push(`/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/${theme}`);
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
function toSlide(img, path) {
  return {
    href: `${path}/${img.id}`,
    src: img.src || img.url || '',
    alt: img.alt || img.title || '',
    description: img.description || ''
  };
}

// Build alternating slides across all theme pools up to maxSlides
export const slides = (() => {
  const pools = galleryDatas.map(data => buildRankedPool(data));
  const pointers = pools.map(() => 0);
  const result = [];
  const maxSlides = 10;

  while (result.length < maxSlides && pointers.some((ptr, i) => ptr < pools[i].length)) {
    for (let i = 0; i < pools.length && result.length < maxSlides; i++) {
      const pool = pools[i];
      const idx = pointers[i]++;
      if (idx < pool.length) {
        result.push(toSlide(pool[idx], galleryPaths[i]));
      }
    }
  }

  return result;
})();
