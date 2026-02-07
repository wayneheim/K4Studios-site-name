/**
 * K4 Analytics - Client-side tracking helper
 * 
 * Sends events to /track endpoint on Cloudflare Worker
 * Uses sendBeacon for reliable delivery even on page unload
 */

// Session ID persists for the browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('k4_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('k4_session_id', sessionId);
  }
  return sessionId;
}

interface TrackContext {
  galleryId?: string | null;
  imageId?: string | null;
  pageType?: 'landing' | 'gallery' | 'image' | 'other';
}

/**
 * Track a user interaction event
 * 
 * @param event - Event name (e.g., 'nav_next', 'zoom_open', 'cowboy_jump')
 * @param context - Optional context about the gallery/image/page
 * 
 * Event names:
 * - Entry: cowboy_jump, gallery_hero_click, gallery_explore_click, gallery_preview_click
 * - Navigation: nav_next, nav_prev
 * - Actions: grid_open, zoom_open, more_info_open, collector_notes_open
 * - Other: sister_image_click, slideshow_start, guide_open
 */
export function trackEvent(event: string, context: TrackContext = {}): void {
  // Skip if SSR
  if (typeof window === 'undefined') return;
  
  // Skip if user has Do Not Track enabled (respect privacy)
  if (navigator.doNotTrack === '1') return;

  const payload = JSON.stringify({
    session_id: getSessionId(),
    event,
    gallery_id: context.galleryId || null,
    image_id: context.imageId || null,
    page_type: context.pageType || null
  });

  // Use sendBeacon for reliable delivery
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/track', payload);
  } else {
    // Fallback to fetch for older browsers
    fetch('/track', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(() => {
      // Silently fail - analytics should never break the site
    });
  }
}

/**
 * Helper to extract gallery ID from URL path
 * e.g., /Galleries/Painterly-Fine-Art-Photography/Facing-History -> Facing-History
 */
export function getGalleryIdFromPath(path?: string): string | null {
  const p = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  const parts = p.split('/').filter(Boolean);
  
  // If ends with image ID (i-xxx), gallery is second to last
  const lastPart = parts[parts.length - 1];
  if (lastPart?.startsWith('i-')) {
    return parts[parts.length - 2] || null;
  }
  
  // Otherwise, last part is gallery
  return parts[parts.length - 1] || null;
}

/**
 * Helper to extract image ID from URL path
 * e.g., /Galleries/.../Facing-History/i-2rXwHbt -> i-2rXwHbt
 */
export function getImageIdFromPath(path?: string): string | null {
  const p = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  const match = p.match(/(i-[a-zA-Z0-9-]+)\/?$/);
  return match ? match[1] : null;
}
