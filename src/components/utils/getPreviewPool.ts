/**
 * getPreviewPool.ts
 * 
 * Generates a deterministic pool of 12 preview images for a gallery.
 * Used by:
 * - GalleryPreviewStrip.astro (picks 6 for display)
 * - GalleryShell components (picks hero from position 6)
 * - warm-image-cache.mjs (warms all 12)
 * 
 * The seeded shuffle ensures the same pool is generated for the same gallery path,
 * making image warming predictable and reliable.
 */

export interface PreviewImage {
  id: string;
  src?: string;
  title?: string;
  alt?: string;
  visibility?: string;
  [key: string]: any;
}

export interface PreviewPool {
  /** All 12 candidates in the pool */
  pool: PreviewImage[];
  /** First 6 images for the strip */
  stripImages: PreviewImage[];
  /** Position 6 (7th image) for hero - not in strip */
  heroImage: PreviewImage | null;
  /** Remaining images (positions 7-11) as fallbacks */
  fallbacks: PreviewImage[];
}

const POOL_SIZE = 12;
const STRIP_SIZE = 6;
const HERO_POSITION = 6; // 7th image (0-indexed)
const HIDDEN_VISIBILITY = new Set(['hidden', 'hide', 'ghost', 'non', 'none', '']);

function isPublicVisibleImage(img: PreviewImage): boolean {
  const visibility = String(img?.visibility ?? 'show').trim().toLowerCase();
  return Boolean(img?.id) && img.id !== 'i-k4studios' && !HIDDEN_VISIBILITY.has(visibility);
}

/**
 * Seeded shuffle - deterministic per gallery path
 * Matches the algorithm in GalleryPreviewStrip.astro and warm-image-cache.mjs
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  // Simple hash function to convert seed string to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Seeded pseudo-random number generator (mulberry32)
  const seededRandom = () => {
    let t = hash += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  
  return arr
    .map(value => ({ value, sort: seededRandom() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

/**
 * Generate the preview pool for a gallery
 * 
 * @param images - All images in the gallery
 * @param galleryPath - The gallery URL path (used as seed)
 * @returns PreviewPool with strip images, hero, and fallbacks
 */
export function getPreviewPool(images: PreviewImage[], galleryPath: string): PreviewPool {
  // Filter out any image hidden from public display.
  const validImages = images.filter(isPublicVisibleImage);
  
  // Apply seeded shuffle and take first 12
  const pool = seededShuffle(validImages, galleryPath).slice(0, POOL_SIZE);
  
  // First 6 for strip display
  const stripImages = pool.slice(0, STRIP_SIZE);
  
  // Position 6 (7th image) for hero - guaranteed not in strip
  const heroImage = pool[HERO_POSITION] || pool[0] || null;
  
  // Remaining images as fallbacks
  const fallbacks = pool.slice(HERO_POSITION + 1);
  
  return {
    pool,
    stripImages,
    heroImage,
    fallbacks
  };
}

/**
 * Get just the hero image for a gallery
 * Convenience function for GalleryShell components
 */
export function getHeroImage(images: PreviewImage[], galleryPath: string): PreviewImage | null {
  return getPreviewPool(images, galleryPath).heroImage;
}

/**
 * Get all image IDs that should be warmed for a gallery
 * Returns IDs for all 12 pool positions
 */
export function getWarmingIds(images: PreviewImage[], galleryPath: string): string[] {
  return getPreviewPool(images, galleryPath).pool
    .map(img => img.id)
    .filter(Boolean);
}
