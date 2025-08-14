// carousel.ts for WWII Machines (normalized paths)

import { galleryData as colorGallery } from './Color.mjs';
import { galleryData as bwGallery } from './Black-White.mjs';

// --- Universal filter for visible images ---
function filterGalleryImages(images) {
  return images.filter(
    img => img.id !== 'i-k4studios' && (!img.visibility || img.visibility !== 'ghost')
  );
}

// Prioritize by rating, then shuffle
function buildRankedPool(images) {
  const getByRating = (r) => images.filter(img => (img.rating || 0) === r);
  let pool = [
    ...getByRating(5).sort(() => Math.random() - 0.5),
    ...getByRating(4).sort(() => Math.random() - 0.5),
    ...getByRating(3).sort(() => Math.random() - 0.5),
    ...images.filter(img => ![5,4,3].includes(img.rating)).sort(() => Math.random() - 0.5),
  ];
  return pool;
}

function toSlide(img, galleryPath) {
  // Trim any accidental trailing slash on path and leading slash on id, then join
  const cleanPath = galleryPath.replace(/\/$/, '');
  const cleanId = (img.id || '').replace(/^\//, '');
  return {
    href: `${cleanPath}/${cleanId}`,
    src: img.src || img.url || '',
    alt: img.alt || img.title || '',
    description: img.description || '',
  };
}

// Dynamic gallery slug from file path (e.g., 'Machines')
const __fileUrl = (import.meta && import.meta.url) || '';
let gallerySlug = 'Machines';
try {
  const parts = __fileUrl.split(/[/\\]/);
  const wwiiIdx = parts.lastIndexOf('WWII');
  if (wwiiIdx !== -1 && wwiiIdx + 1 < parts.length) {
    const candidate = parts[wwiiIdx + 1];
    if (candidate && !candidate.endsWith('.ts') && !candidate.endsWith('.js')) {
      gallerySlug = candidate;
    }
  }
} catch(_) { /* fallback remains 'Machines' */ }
const baseWWIIPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII';
const colorPath = `${baseWWIIPath}/${gallerySlug}/Color`;
const bwPath    = `${baseWWIIPath}/${gallerySlug}/Black-White`;

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
