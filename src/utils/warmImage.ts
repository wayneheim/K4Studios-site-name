/**
 * Image Warming Utility
 * 
 * Fire-and-forget image pre-warming for the Cloudflare Worker proxy.
 * SSR-safe, no awaits, no error handling, no logging.
 * 
 * Canonical size mapping (do not drift):
 *   s  → grids / dense thumbs only
 *   m  → preview strip, sideboard, ImageBar
 *   l  → primary viewer image (most important path)
 *   xl → slideshow + zoom only
 * 
 * Do NOT warm xl anywhere except slideshow contexts.
 * 
 * CRITICAL: Invalid warm requests poison Cloudflare cache with 400s.
 * All IDs and sizes MUST be validated before warming.
 */

const warmed = new Set<string>();

// Valid image ID pattern: i- followed by alphanumeric chars
const VALID_ID_PATTERN = /^i-[a-zA-Z0-9]+$/;
const VALID_SIZES = ['s', 'm', 'l', 'xl'];

export function warmImage(
  imageId: string,
  size: 's' | 'm' | 'l' | 'xl' = 'l'
) {
  // SSR guard
  if (typeof window === 'undefined') return;
  
  // HARD validation - invalid warm = cache poison
  if (!imageId || typeof imageId !== 'string') return;
  if (!size || !VALID_SIZES.includes(size)) return;
  
  // Validate ID format strictly - must be i-XXXXXXX
  const trimmedId = imageId.trim();
  if (!VALID_ID_PATTERN.test(trimmedId)) return;

  const key = `${trimmedId}:${size}`;
  if (warmed.has(key)) return;
  warmed.add(key);

  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = `/img/${trimmedId}/${size}`;
}
