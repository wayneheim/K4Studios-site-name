// carousel.ts

import { galleryData as colorGallery } from './Color.mjs';
import { galleryData as bwGallery } from './Black-White.mjs';

// Universal image filter: skips 'i-k4studios' and all 'ghost' images
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
  let pool = [
    ...getByRating(5).sort(() => Math.random() - 0.5),
    ...getByRating(4).sort(() => Math.random() - 0.5),
    ...getByRating(3).sort(() => Math.random() - 0.5),
    ...images.filter(img => ![5,4,3].includes(img.rating)).sort(() => Math.random() - 0.5),
  ];
  return pool;
}

function toSlide(img, galleryPath) {
  return {
    href: `${galleryPath}/${img.id}`,
    src: img.src || img.url || '',
    alt: img.alt || img.title || '',
    description: img.description || '',
  };
}

const colorPath = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color";
const bwPath    = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White";

// Build pools using the universal filter
const colorPool = buildRankedPool(filterGalleryImages(colorGallery));
const bwPool    = buildRankedPool(filterGalleryImages(bwGallery));

// Alternate-pull up to 10 images (adjust as needed)
const slides = [];
const maxSlides = 10;
let ci = 0, bi = 0;
while (slides.length < maxSlides && (ci < colorPool.length || bi < bwPool.length)) {
  if (ci < colorPool.length) {
    slides.push(toSlide(colorPool[ci++], colorPath));
  }
  if (slides.length >= maxSlides) break;
  if (bi < bwPool.length) {
    slides.push(toSlide(bwPool[bi++], bwPath));
  }
}

// Export
export { slides };
