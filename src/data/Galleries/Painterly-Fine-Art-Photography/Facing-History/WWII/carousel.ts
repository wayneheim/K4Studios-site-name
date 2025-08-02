// carousel.ts for WWII Landing Page (real gallery path version)

// @ts-ignore
const modules   = import.meta.glob('./**/Color.mjs', { eager: true });
// @ts-ignore
const bwModules = import.meta.glob('./**/Black-White.mjs', { eager: true });

// Collect images WITH their gallery path!
let allColor = [];
for (const path in modules) {
  const gallery = modules[path]?.galleryData || modules[path]?.default || [];
  const galleryPath = path
    .replace(/^\.\//, '')                      // Remove './'
    .replace(/\/Color\.mjs$/, '')              // Remove '/Color.mjs'
    .replace(/\/Black-White\.mjs$/, '');       // (for robustness)
  allColor = allColor.concat(
    gallery.map(img => ({ ...img, galleryPath }))
  );
}

let allBW = [];
for (const path in bwModules) {
  const gallery = bwModules[path]?.galleryData || bwModules[path]?.default || [];
  const galleryPath = path
    .replace(/^\.\//, '')
    .replace(/\/Black-White\.mjs$/, '');
  allBW = allBW.concat(
    gallery.map(img => ({ ...img, galleryPath }))
  );
}

// --- Universal filter for visible images ---
function filterGalleryImages(images) {
  return images.filter(
    img =>
      img.id !== 'i-k4studios' &&
      (!img.visibility || img.visibility !== 'ghost')
  );
}

// Build a pool of images prioritized by rating, then shuffle each
function buildRankedPool(images) {
  const getByRating = (r) => images.filter(img => img.rating === r);
  return [
    ...getByRating(5).sort(() => Math.random() - 0.5),
    ...getByRating(4).sort(() => Math.random() - 0.5),
    ...getByRating(3).sort(() => Math.random() - 0.5),
    ...images.filter(img => ![5, 4, 3].includes(img.rating)).sort(() => Math.random() - 0.5),
  ];
}

// Real gallery path in href! (and prefix i- to match your URLs)
function toSlide(img) {
  return {
    href: `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/${img.galleryPath}/${img.id}`,
    src: img.src || img.url || '',
    alt: img.alt || img.title || '',
    description: img.description || '',
  };
}

// Filter, build, alternate
const colorPool = buildRankedPool(filterGalleryImages(allColor));
const bwPool    = buildRankedPool(filterGalleryImages(allBW));

const slides = [];
const maxSlides = 10;
let ci = 0, bi = 0;
while (slides.length < maxSlides && (ci < colorPool.length || bi < bwPool.length)) {
  if (ci < colorPool.length) slides.push(toSlide(colorPool[ci++]));
  if (slides.length >= maxSlides) break;
  if (bi < bwPool.length) slides.push(toSlide(bwPool[bi++]));
}

export { slides };
