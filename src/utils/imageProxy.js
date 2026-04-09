/**
 * Image Proxy URL Utilities
 * 
 * Converts image IDs to /img/{id}/{size} proxy URLs.
 * This ensures SmugMug URLs never appear in rendered HTML.
 * 
 * Uses relative /img/ paths by default.
 * Development can opt into a direct proxy origin via PUBLIC_IMAGE_PROXY_ORIGIN.
 * 
 * Usage:
 *   import { getProxySrc, getProxySrcset, normalizeImageSrc } from '@/utils/imageProxy.js';
 *   
 *   <img src={getProxySrc(image.id, 'm')} />
 *   <img src={getProxySrc(image.id, 'xl')} srcset={getProxySrcset(image.id)} />
 *   <img src={normalizeImageSrc(anyUrl)} /> // Handles SmugMug URLs, IDs, or local paths
 */

const VALID_SIZES = ['s', 'm', 'l', 'xl', 'src'];

// Keep runtime source first-party by default. Local/dev environments can set
// PUBLIC_IMAGE_PROXY_ORIGIN when they need to target a direct proxy origin.
const IMAGE_BASE = import.meta.env?.PUBLIC_IMAGE_PROXY_ORIGIN || '';

/**
 * Extract image ID from various URL formats
 * @param {string} url - SmugMug URL, proxy URL, or image ID
 * @returns {string|null} Image ID like "i-abc123" or null
 */
export function extractImageId(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Already just an ID
  if (/^i-[a-zA-Z0-9]+$/.test(url)) return url;
  
  // SmugMug URL pattern: /i-XXXXXX/
  const smugMugMatch = url.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (smugMugMatch) return smugMugMatch[1];
  
  // Proxy URL pattern: /img/i-XXXXXX/size
  const proxyMatch = url.match(/\/img\/(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)(?:\.jpe?g)?/i);
  if (proxyMatch) return proxyMatch[1];
  
  return null;
}

/**
 * Normalize any image source to proper format
 * - SmugMug URLs → proxy URLs (/img/{id}/{size})
 * - Absolute proxy URLs → relative proxy URLs
 * - Local paths (/images/...) → unchanged
 * - Image IDs → proxy URLs
 * 
 * @param {string} src - Any image source
 * @param {string} size - Size for proxy URLs (default: 'm')
 * @returns {string} Normalized URL
 */
export function normalizeImageSrc(src, size = 'm') {
  if (!src || typeof src !== 'string') return '';
  
  // Already a relative proxy URL - extract ID and rebuild with requested size
  if (src.startsWith('/img/')) {
    const proxyMatch = src.match(/\/img\/(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)(?:\.jpe?g)?/i);
    if (proxyMatch) {
      return getProxySrc(proxyMatch[1], size);
    }
    return src;
  }
  
  // Local static image - keep as-is
  if (src.startsWith('/images/')) return src;
  
  // Try to extract an image ID
  const imageId = extractImageId(src);
  if (imageId) {
    return getProxySrc(imageId, size);
  }
  
  // Unknown format - return as-is (might be external or placeholder)
  return src;
}

/**
 * Generate a proxy URL for an image
 * @param {string} imageId - The image ID (e.g., "i-abc123")
 * @param {string} size - Size: 's', 'm', 'l', 'xl', or 'src'
 * @returns {string} Proxy URL like "/img/i-abc123/m.jpg" (or full worker URL in dev)
 */
export function getProxySrc(imageId, size = 'm') {
  if (!imageId) return '';
  const safeSize = VALID_SIZES.includes(size) ? size : 'm';
  return `${IMAGE_BASE}/img/${imageId}/${safeSize}.jpg`;
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
  
  // XL removed from srcset - only accessible via explicit JS interaction (zoom/slideshow)
  // This ensures browsers never auto-request XL, keeping it firmly in "intentional" land
  if (includeXL) {
    sources.push(`${getProxySrc(imageId, 'l')} 1600w`);
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
