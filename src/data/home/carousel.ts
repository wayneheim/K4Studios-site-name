// carousel.ts universal interleaved homepage pooler (Painterly vs Traditional)

// Import all painterly and traditional gallery data (children included)
const painterlyModules = import.meta.glob('@/data/Galleries/Painterly-Fine-Art-Photography/*/*.mjs', { eager: true });
const traditionalModules = import.meta.glob('@/data/Galleries/Fine-Art-Photography/*/*.mjs', { eager: true });

function extractGallery(filePath, mod, sectionType) {
  const data = mod.galleryData || (mod.default && mod.default.galleryData);
  if (!Array.isArray(data)) return null;
  // Filter out ghost and placeholder images
  const visible = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) return null;
  // Build section/gallery label
  const match = filePath.match(/Fine-Art-Photography\/([^/]+)\//) || filePath.match(/Painterly-Fine-Art-Photography\/([^/]+)\//);
  const section = match ? match[1] : sectionType;
  // Path for gallery (case sensitive)
  const basePath = filePath
    .replace(/^.*\/data/, '')
    .replace(/\.mjs$/, '')
    .replace(/\/galleryData$/i, '');
  return {
    section,
    images: visible,
    galleryPath: basePath
  };
}

// Build painterly and traditional pools
const painterlyPools = Object.entries(painterlyModules)
  .map(([filePath, mod]) => extractGallery(filePath, mod, 'painterly'))
  .filter(Boolean);

const traditionalPools = Object.entries(traditionalModules)
  .map(([filePath, mod]) => extractGallery(filePath, mod, 'traditional'))
  .filter(Boolean);

// Helper: Build ranked pool for a gallery, highest rated first, then random
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

// Build universal alternating carousel
export const slides = (() => {
  // Build one image per child gallery (prioritized and randomized), shuffle galleries
  function pullOnePerGallery(pools) {
    // Shuffle galleries
    const galleryOrder = pools.slice().sort(() => Math.random() - 0.5);
    const picks = [];
    for (const gallery of galleryOrder) {
      const ranked = buildRankedPool(gallery.images);
      if (ranked.length) {
        picks.push({
          ...toSlide(ranked[0], gallery.galleryPath)
        });
      }
    }
    return picks;
  }

  const painterlyPicks = pullOnePerGallery(painterlyPools);
  const traditionalPicks = pullOnePerGallery(traditionalPools);

  // Alternate between painterly/traditional pools
  const maxSlides = 10;
  const result = [];
  let p = 0, t = 0, i = 0;
  while (result.length < maxSlides && (p < painterlyPicks.length || t < traditionalPicks.length)) {
    if (i % 2 === 0 && p < painterlyPicks.length) {
      result.push(painterlyPicks[p++]);
    } else if (i % 2 === 1 && t < traditionalPicks.length) {
      result.push(traditionalPicks[t++]);
    } else if (p < painterlyPicks.length) {
      result.push(painterlyPicks[p++]);
    } else if (t < traditionalPicks.length) {
      result.push(traditionalPicks[t++]);
    }
    i++;
  }

  // Add loading attribute
  return result.map((slide, idx) => ({
    ...slide,
    loading: idx === 0 ? 'eager' : 'lazy'
  }));
})();
