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
 */

const warmed = new Set<string>();

export function warmImage(
  imageId: string,
  size: 's' | 'm' | 'l' | 'xl' = 'l'
) {
  // Guard against malformed calls that could poison browser cache
  if (!imageId || !size) return;
  if (typeof window === 'undefined') return;

  const key = `${imageId}:${size}`;
  if (warmed.has(key)) return;
  warmed.add(key);

  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = `/img/${imageId}/${size}`;
}
