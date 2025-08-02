// carousel.ts for Machines

import { galleryData as colorGallery } from './Color.mjs';
import { galleryData as bwGallery } from './Black-White.mjs';

// --- Universal filter for visible images ---
function filterGalleryImages(images) {
  return images.filter(
    img => img.id !== 'i-k4studios' && img.visibility !== 'ghost'
  );
}

// Prioritize by rating, then shuffle
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

const colorPath = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color";
const bwPath    = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White";

// --- Filter images before building pools ---
const colorPool = buildRankedPool(filterGalleryImages(colorGallery));
const bwPool    = buildRankedPool(filterGalleryImages(bwGallery));

// Alternate-pull up to 10 images (change maxSlides if needed)
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

export { slides };
