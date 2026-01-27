/**
 * Image Proxy URL Utilities
 * 
 * Converts image IDs to /img/{id}/{size} proxy URLs.
 * This ensures SmugMug URLs never appear in rendered HTML.
 * 
 * Usage:
 *   import { getProxySrc, getProxySrcset } from '@/utils/imageProxy.js';
 *   
 *   <img src={getProxySrc(image.id, 'm')} />
 *   <img src={getProxySrc(image.id, 'xl')} srcset={getProxySrcset(image.id)} />
 */

const VALID_SIZES = ['s', 'm', 'l', 'xl', 'src'];

/**
 * Generate a proxy URL for an image
 * @param {string} imageId - The image ID (e.g., "i-abc123")
 * @param {string} size - Size: 's', 'm', 'l', 'xl', or 'src'
 * @returns {string} Proxy URL like "/img/i-abc123/m"
 */
export function getProxySrc(imageId, size = 'm') {
  if (!imageId) return '';
  const safeSize = VALID_SIZES.includes(size) ? size : 'm';
  return `/img/${imageId}/${safeSize}`;
}

/**
 * Generate a srcset string using proxy URLs
 * @param {string} imageId - The image ID
 * @param {object} options - Optional config
 * @param {boolean} options.includeXL - Include XL size (default: true)
 * @returns {string} srcset string like "/img/i-abc123/s 400w, /img/i-abc123/m 600w, ..."
 */
export function getProxySrcset(imageId, options = {}) {
  if (!imageId) return undefined;
  
  const { includeXL = true } = options;
  
  const sources = [
    `${getProxySrc(imageId, 's')} 400w`,
    `${getProxySrc(imageId, 'm')} 600w`,
    `${getProxySrc(imageId, 'l')} 1024w`,
  ];
  
  if (includeXL) {
    sources.push(`${getProxySrc(imageId, 'xl')} 1600w`);
  }
  
  return sources.join(', ');
}

/**
 * Get the best proxy URL for an image based on preferred size order
 * Falls back through sizes if primary isn't available
 * @param {string} imageId - The image ID
 * @param {string} preferredSize - Primary size to request
 * @returns {string} Proxy URL
 */
export function getBestProxySrc(imageId, preferredSize = 'xl') {
  // The Worker handles size fallback, so we just request what we want
  return getProxySrc(imageId, preferredSize);
}

/**
 * Carousel-specific proxy srcset (M for mobile, L for desktop)
 * No XL needed - carousel max height is 390px desktop, 200px mobile
 */
export function getCarouselProxySrcset(imageId) {
  if (!imageId) return undefined;
  return [
    `${getProxySrc(imageId, 'm')} 600w`,
    `${getProxySrc(imageId, 'l')} 1024w`,
  ].join(', ');
}

/**
 * Grid-specific proxy src (smaller sizes for thumbnails)
 */
export function getGridProxySrc(imageId, colCount = 3) {
  // M size (~600px) is sufficient for all grid layouts
  return getProxySrc(imageId, 'm');
}
