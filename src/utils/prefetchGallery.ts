/**
 * Gallery Pre-warm Utility
 * 
 * Pre-warms the first 9 images of a gallery before navigation.
 * Used to make gallery pages feel instant when clicking from nav.
 * 
 * Usage:
 *   import { prefetchGallery } from '../utils/prefetchGallery';
 *   
 *   // In click handler:
 *   prefetchGallery('/Galleries/...path');
 */

import { warmImage } from './warmImage';

// Lazy-loaded prefetch map (fetched once on first use)
let prefetchMap: Record<string, string[]> | null = null;
let prefetchPromise: Promise<void> | null = null;

async function ensurePrefetchMap(): Promise<Record<string, string[]>> {
  if (prefetchMap) return prefetchMap;
  
  if (!prefetchPromise) {
    prefetchPromise = fetch('/galleryPrefetchMap.json')
      .then(res => res.json())
      .then(data => { prefetchMap = data; })
      .catch(() => { prefetchMap = {}; });
  }
  
  await prefetchPromise;
  return prefetchMap || {};
}

/**
 * Pre-warm gallery images for a given path
 * @param galleryPath - The href path (e.g., '/Galleries/Painterly.../Color')
 * @returns Promise that resolves after warming is triggered (not loaded)
 */
export async function prefetchGallery(galleryPath: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const map = await ensurePrefetchMap();
  const imageIds = map[galleryPath];
  
  if (!imageIds || imageIds.length === 0) return;
  
  // Warm first 9 at 's' size (grid thumbnails - what user sees first)
  for (const id of imageIds) {
    warmImage(id, 's');
  }
}

/**
 * Handle nav link click with pre-warming
 * Warms images, waits briefly, then navigates
 * 
 * @param href - The gallery href to navigate to
 * @param delay - Optional delay in ms before navigating (default: 150)
 */
export function handleGalleryNavClick(href: string, delay: number = 150): void {
  if (typeof window === 'undefined') return;
  
  // Start warming immediately
  prefetchGallery(href);
  
  // Navigate after short delay to give warming a head start
  setTimeout(() => {
    window.location.href = href;
  }, delay);
}
