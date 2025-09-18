
// --- Carousel: Random Alternating Images from Painterly & Traditional ---
// Import all gallery .mjs files from both painterly and traditional sections
const allModules = import.meta.glob('@/data/Galleries/**/*.mjs', { eager: true });

// Helper: Get gallery data from module
function getGalleryData(mod) {
  return mod.galleryData || (mod.default && mod.default.galleryData) || [];
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
  // Robust src fallback logic
  let src = img.srcM || img.srcS || img.srcL || img.src || img.url || '';
  // If srcS ends with -L.jpg, use srcS as override (for legacy/fallback)
  if (img.srcS && img.srcS.endsWith('-L.jpg')) {
    src = img.srcS;
  }
  return {
    href: `${path}/${img.id}`,
    src,
    alt: img.alt || img.title || '',
    description: img.description || ''
  };
}

// Only use painterly galleries under the Facing History section
const painterlyPools = [];
for (const filePath in allModules) {
  const mod = allModules[filePath];
  const data = getGalleryData(mod);
  if (!Array.isArray(data) || data.length === 0) continue;
  // Filter out ghost and placeholder images
  const visible = data.filter(img => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) continue;
  // Only include if path is under Painterly-Fine-Art-Photography/Facing-History
  if (filePath.includes('/Painterly-Fine-Art-Photography/Facing-History/')) {
    painterlyPools.push({ images: buildRankedPool(visible), path: filePathToHref(filePath) });
  }
}

// Helper: Convert file path to public gallery route (for slide links)
function filePathToHref(filePath) {
  // e.g. '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs'
  //   => '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color'
  return filePath
    .replace(/^.*Galleries/, '/Galleries')
    .replace(/\.mjs$/, '')
    .replace(/\\/g, '/');
}

// Helper: Randomly pick N images from different pools (one per pool, if possible)
function pickRandomFromPools(pools, n) {
  const picks = [];
  const usedPools = new Set();
  while (picks.length < n && usedPools.size < pools.length) {
    // Pick a random pool not yet used
    const available = pools.filter((_, i) => !usedPools.has(i));
    if (available.length === 0) break;
    const poolIdx = Math.floor(Math.random() * available.length);
    const realIdx = pools.indexOf(available[poolIdx]);
    if (pools[realIdx].images.length === 0) continue;
    // Pick a random image from this pool
    const imgIdx = Math.floor(Math.random() * pools[realIdx].images.length);
    picks.push({ img: pools[realIdx].images[imgIdx], path: pools[realIdx].path });
    usedPools.add(realIdx);
  }
  return picks;
}


// Pick 8 random painterly images from different galleries (one per pool if possible)
const painterlyPicks = pickRandomFromPools(painterlyPools, 8);
const slidesArr = painterlyPicks.map(pick => toSlide(pick.img, pick.path));

export const slides = slidesArr;

