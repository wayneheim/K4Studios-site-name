/**
 * Lightweight image proxy helpers for hydrated client code.
 *
 * This module intentionally has no semantic-data imports. Use imageProxy.js
 * when SSR/build code needs semantic filenames.
 */

const VALID_SIZES = ['s', 'm', 'l', 'xl', 'src'];

const configuredImageBase = import.meta.env?.PUBLIC_IMAGE_PROXY_ORIGIN;
const IMAGE_BASE =
  typeof configuredImageBase === 'string' && configuredImageBase.trim().length > 0
    ? configuredImageBase.trim().replace(/\/$/, '')
    : '';

export function extractImageId(url) {
  if (!url || typeof url !== 'string') return null;

  if (/^i-[a-zA-Z0-9]+$/.test(url)) return url;

  const smugMugMatch = url.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (smugMugMatch) return smugMugMatch[1];

  const proxyMatch = url.match(/\/img\/(?:OG-|TW-|PN-|SD-)?(i-[a-zA-Z0-9-]+)\/[^/?#]+(?:\.jpe?g)?/i);
  if (proxyMatch) return proxyMatch[1];

  return null;
}

export function getProxySrc(imageId, size = 'm') {
  if (!imageId) return '';
  const safeSize = VALID_SIZES.includes(size) ? size : 'm';
  return `${IMAGE_BASE}/img/${imageId}/${safeSize}.jpg`;
}

export function getLegacyImageUrl(imageId, size = 'm') {
  return getProxySrc(imageId, size);
}

export function normalizeImageSrc(src, size = 'm') {
  if (!src || typeof src !== 'string') return '';

  if (src.startsWith('/img/')) {
    const imageId = extractImageId(src);
    return imageId ? getProxySrc(imageId, size) : src;
  }

  if (src.startsWith('/images/')) return src;

  const imageId = extractImageId(src);
  return imageId ? getProxySrc(imageId, size) : src;
}

export function getProxySrcset(imageId, options = {}) {
  if (!imageId) return undefined;

  const { includeXL = false } = options;
  const sources = [
    `${getProxySrc(imageId, 's')} 400w`,
    `${getProxySrc(imageId, 'm')} 600w`,
    `${getProxySrc(imageId, 'l')} 1024w`,
  ];

  if (includeXL) {
    sources.push(`${getProxySrc(imageId, 'l')} 1600w`);
  }

  return sources.join(', ');
}

export function getBestProxySrc(imageId, preferredSize = 'l') {
  return getProxySrc(imageId, preferredSize);
}

export function getCarouselProxySrcset(imageId) {
  if (!imageId) return undefined;
  return [
    `${getProxySrc(imageId, 'm')} 600w`,
    `${getProxySrc(imageId, 'l')} 1024w`,
  ].join(', ');
}

export function getGridProxySrc(imageId) {
  return getProxySrc(imageId, 'm');
}
