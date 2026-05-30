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
 *   <img src={getProxySrc(image.id, 'l')} srcset={getProxySrcset(image.id)} />
 *   <img src={normalizeImageSrc(anyUrl)} /> // Handles SmugMug URLs, IDs, or local paths
 */

import { getImageSlugPhraseForPath } from '../data/semantic/K4-Sem.ts';
import imageFilenameSlugs from '../data/imageFilenameSlugs.json';
import imageIdMap from '../data/imageIdMap.json';

export const USE_SEMANTIC_IMAGE_URLS = true;

const VALID_SIZES = ['s', 'm', 'l', 'xl', 'src'];
const DEFAULT_IMAGE_SLUG_PHRASE = 'k4-fine-art-photography';
const PLACEHOLDER_IMAGE_TITLES = new Set([
  'untitled',
  'untitled photo',
  'untitled image',
  'image',
  'photo',
]);
const PLACEHOLDER_IMAGE_SLUGS = new Set([
  'untitled',
  'untitled-photo',
  'untitled-image',
  'image',
  'photo',
]);

// Keep runtime source first-party by default. Local/dev environments can set
// PUBLIC_IMAGE_PROXY_ORIGIN when they need to target a direct proxy origin.
const configuredImageBase = import.meta.env?.PUBLIC_IMAGE_PROXY_ORIGIN;
const IMAGE_BASE =
  typeof configuredImageBase === 'string' && configuredImageBase.trim().length > 0
    ? configuredImageBase.trim().replace(/\/$/, '')
    : '';

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
  
  // Proxy URL pattern: /img/i-XXXXXX/size.jpg or /img/i-XXXXXX/semantic-slug.jpg
  const proxyMatch = url.match(/\/img\/(?:OG-|TW-|PN-|SD-)?(i-[a-zA-Z0-9-]+)\/[^/?#]+(?:\.jpe?g)?/i);
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
      return getSemanticImageUrl(proxyMatch[1], {}, size);
    }
    return src;
  }
  
  // Local static image - keep as-is
  if (src.startsWith('/images/')) return src;
  
  // Try to extract an image ID
  const imageId = extractImageId(src);
  if (imageId) {
    return getSemanticImageUrl(imageId, {}, size);
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

export function getLegacyImageUrl(imageId, size = 'm') {
  return getProxySrc(imageId, size);
}

export function slugifyImageSegment(value, fallback = 'image') {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return slug || fallback;
}

function getMeaningfulImageSlug(image, registrySlug = '') {
  if (image && typeof image === 'object' && image.filenameSlug) {
    return image.filenameSlug;
  }

  if (!image || typeof image !== 'object') return '';
  if (registrySlug && !PLACEHOLDER_IMAGE_SLUGS.has(String(registrySlug).toLowerCase())) {
    return registrySlug;
  }

  const title = String(image.title || image.name || '').trim();
  if (!title || PLACEHOLDER_IMAGE_TITLES.has(title.toLowerCase())) return '';
  return slugifyImageSegment(title, '');
}

function getFallbackPhraseFromGalleryPath(galleryPath) {
  const normalizedPath = normalizeGalleryPath(galleryPath);
  const parts = normalizedPath.split('/').filter(Boolean);
  const meaningfulPart = [...parts]
    .reverse()
    .find((part) => !/^(gallery|color|black-white|na-color|na-black-white)$/i.test(part));

  return meaningfulPart
    ? slugifyImageSegment(meaningfulPart, DEFAULT_IMAGE_SLUG_PHRASE)
    : DEFAULT_IMAGE_SLUG_PHRASE;
}

function normalizeGalleryPath(value) {
  let raw = String(value || '').trim().replace(/\\/g, '/');
  if (!raw) return '';
  try {
    raw = new URL(raw, 'https://www.k4studios.com').pathname;
  } catch {
    // Keep normalizing local data paths below.
  }

  raw = raw
    .replace(/^\/?src\/data\/Galleries\//i, '/Galleries/')
    .replace(/^\/?src\/data\//i, '/')
    .replace(/\.mjs$/i, '')
    .replace(/\/+$/, '');

  if (/^\/?K4-Select-Series\//i.test(raw)) raw = `/Other/${raw.replace(/^\/+/, '')}`;
  if (/^Galleries\//i.test(raw)) raw = `/${raw}`;

  return raw;
}

function parseSemanticArgs(sizeOrOptions, maybeOptions) {
  if (typeof sizeOrOptions === 'string') {
    return {
      size: sizeOrOptions,
      options: maybeOptions || {},
    };
  }

  return {
    size: sizeOrOptions?.size || 'l',
    options: sizeOrOptions || {},
  };
}

function getInferredGalleryPathForImageId(imageId) {
  const paths = imageIdMap?.[imageId];
  return Array.isArray(paths) && paths.length > 0 ? paths[0] : '';
}

export function getSemanticImageUrl(image, galleryContext = {}, sizeOrOptions = {}, maybeOptions = {}) {
  const imageId = typeof image === 'string' ? image : image?.id;
  if (!imageId) return '';

  const { size, options } = parseSemanticArgs(sizeOrOptions, maybeOptions);
  const safeSize = VALID_SIZES.includes(size) ? size : 'l';

  const {
    absolute = false,
    origin = 'https://www.k4studios.com',
    useSemantic = USE_SEMANTIC_IMAGE_URLS,
  } = options;

  if (!useSemantic || safeSize === 'xl' || safeSize === 'src') {
    const legacyUrl = getProxySrc(imageId, safeSize);
    return absolute ? new URL(legacyUrl, origin).toString() : legacyUrl;
  }

  const galleryPath = normalizeGalleryPath(
    galleryContext?.galleryPath ||
      galleryContext?.path ||
      galleryContext?.urlBase ||
      getInferredGalleryPathForImageId(imageId) ||
      ''
  );

  const titleSlug = slugifyImageSegment(
    getMeaningfulImageSlug(image, imageFilenameSlugs[imageId]) ||
      imageFilenameSlugs[imageId],
    String(imageId).replace(/^i-/i, '') || 'image'
  );
  const phrase = slugifyImageSegment(
    galleryContext?.imageSlugPhrase ||
      getImageSlugPhraseForPath(galleryPath) ||
      getFallbackPhraseFromGalleryPath(galleryPath),
    DEFAULT_IMAGE_SLUG_PHRASE
  );
  const filename = `${titleSlug}-${phrase}.jpg`;
  const sizeSegment = safeSize === 'l' ? '' : `/${safeSize}`;
  const semanticUrl = `${IMAGE_BASE}/img/${imageId}${sizeSegment}/${filename}`;

  return absolute ? new URL(semanticUrl, origin).toString() : semanticUrl;
}

export function getSemanticImageSrcset(image, galleryContext = {}, options = {}) {
  if (!image) return undefined;

  return [
    `${getSemanticImageUrl(image, galleryContext, 's', options)} 400w`,
    `${getSemanticImageUrl(image, galleryContext, 'm', options)} 600w`,
    `${getSemanticImageUrl(image, galleryContext, 'l', options)} 1024w`,
  ].join(', ');
}

/**
 * Generate a srcset string using proxy URLs
 * @param {string} imageId - The image ID
 * @param {object} options - Optional config
 * @param {boolean} options.includeXL - Include the largest public slot (default: false)
 * @returns {string} srcset string like "/img/i-abc123/s 400w, /img/i-abc123/m 600w, ..."
 */
export function getProxySrcset(imageId, options = {}) {
  if (!imageId) return undefined;
  
  const { includeXL = false } = options;
  
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
export function getBestProxySrc(imageId, preferredSize = 'l') {
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
