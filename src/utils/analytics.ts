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

// Event order counter - increments per session to track event sequence
function getNextEventOrder(): number {
  if (typeof window === 'undefined') return 0;
  
  const current = parseInt(sessionStorage.getItem('k4_event_order') || '0', 10);
  const next = current + 1;
  sessionStorage.setItem('k4_event_order', next.toString());
  return next;
}

// Read the entry referrer from the edge-set cookie (k4_entry_ref)
// The Cloudflare Worker sets this cookie on the first HTML request
// using the true Referer header before SPA navigation can lose it
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Get the entry referrer - prefer the edge-captured cookie, fallback to sessionStorage
function getEntryReferrer(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check sessionStorage first (already cached this session)
  let entryReferrer = sessionStorage.getItem('k4_entry_referrer');
  if (entryReferrer !== null) {
    return entryReferrer || null;
  }
  
  // Read from edge-set cookie (most reliable source)
  const cookieRef = getCookie('k4_entry_ref');
  if (cookieRef) {
    // Already normalized by the worker (e.g., "google", "direct", "bing")
    sessionStorage.setItem('k4_entry_referrer', cookieRef);
    return cookieRef;
  }
  
  // Fallback: use document.referrer (less reliable but better than nothing)
  entryReferrer = document.referrer || '';
  sessionStorage.setItem('k4_entry_referrer', entryReferrer);
  return entryReferrer || null;
}

interface TrackContext {
  galleryId?: string | null;
  imageId?: string | null;
  pageType?: 'landing' | 'gallery' | 'image' | 'other';
  theme?: string | null;
}

function shouldSkipDuplicateEvent(event: string, context: TrackContext, pagePath: string): boolean {
  // Only dedupe events where accidental double-firing is common.
  // Example: `chapter_view` can be emitted both globally (BaseLayout) and
  // inside the chapter UI during the same navigation.
  if (event !== 'chapter_view' && event !== 'zoom_open') return false;

  const imageId = context.imageId || getImageIdFromPath(pagePath);
  if (!imageId) return false;

  const key = `k4_dedupe_${event}_${imageId}`;
  const now = Date.now();
  const last = parseInt(sessionStorage.getItem(key) || '0', 10);

  // Ignore repeats within a short window (same image, same session)
  const DEDUPE_WINDOW_MS = event === 'zoom_open' ? 1500 : 3000;
  if (last && now - last < DEDUPE_WINDOW_MS) return true;

  sessionStorage.setItem(key, String(now));
  return false;
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

  // Use the ORIGINAL entry referrer for the session (not current document.referrer)
  const entryReferrer = getEntryReferrer();

  // Capture current page path
  const pagePath = window.location.pathname;

  // Robust defaults: infer context from URL if caller didn't pass it.
  const inferredImageId = context.imageId ?? getImageIdFromPath(pagePath);
  const inferredGalleryId = context.galleryId ?? getGalleryIdFromPath(pagePath);
  const inferredPageType: TrackContext['pageType'] = context.pageType ?? (
    inferredImageId ? 'image'
      : inferredGalleryId ? 'gallery'
        : (pagePath === '/' || pagePath === '') ? 'landing'
          : 'other'
  );

  // Prevent accidental double-counting
  if (shouldSkipDuplicateEvent(event, context, pagePath)) return;

  const payload = JSON.stringify({
    session_id: getSessionId(),
    event,
    gallery_id: inferredGalleryId || null,
    image_id: inferredImageId || null,
    page_type: inferredPageType || null,
    theme: context.theme || null,
    referrer: entryReferrer,
    page_path: pagePath,
    event_ts_ms: Date.now(),        // Client timestamp for timing analysis
    event_order: getNextEventOrder() // Event sequence within session
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

// Expose trackEvent globally for use in Astro components via onclick
if (typeof window !== 'undefined') {
  (window as any).k4track = trackEvent;
}

/**
 * Track a page view - call this on page load to record all page visits
 * Also initializes scroll depth tracking and updates page context for session exit
 */
export function trackPageView(): void {
  trackEvent('page_view');

  // Update page context for session exit tracking
  updatePageContext();
  
  // Initialize scroll depth tracking (main site pages only; excludes galleries/images)
  initScrollDepthTracking();
}

// ==========================================
// SESSION EXIT TRACKING
// ==========================================
// Track where users leave the site (which page ends their session)

// Store current page context for session exit
let currentPageContext: {
  pageType: 'image' | 'gallery' | 'landing' | 'other';
  galleryId: string | null;
  imageId: string | null;
  pagePath: string;
} | null = null;

let sessionExitFired = false;

/**
 * Update the current page context - call this on navigation
 */
export function updatePageContext(): void {
  if (typeof window === 'undefined') return;
  
  const path = window.location.pathname;
  const imageId = getImageIdFromPath(path);
  const galleryId = getGalleryIdFromPath(path);
  
  let pageType: 'image' | 'gallery' | 'landing' | 'other' = 'other';
  if (imageId) {
    pageType = 'image';
  } else if (path.includes('/Galleries/') || path.includes('/Other/')) {
    pageType = 'gallery';
  } else if (path === '/' || path === '') {
    pageType = 'landing';
  }
  
  currentPageContext = {
    pageType,
    galleryId,
    imageId,
    pagePath: path
  };
}

/**
 * Fire session exit event - called on page unload
 */
function fireSessionExit(): void {
  if (sessionExitFired || !currentPageContext) return;
  sessionExitFired = true;
  
  const payload = JSON.stringify({
    session_id: getSessionId(),
    event: 'session_exit',
    gallery_id: currentPageContext.galleryId,
    image_id: currentPageContext.imageId,
    page_type: currentPageContext.pageType,
    page_path: currentPageContext.pagePath,
    event_ts_ms: Date.now(),
    event_order: getNextEventOrder()
  });
  
  // Use sendBeacon for reliable delivery on page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/track', payload);
  }
}

// Set up session exit listeners
if (typeof window !== 'undefined') {
  // Update context on initial load
  updatePageContext();
  
  // Fire on visibility change (tab close, navigate away)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      fireSessionExit();
    }
  });
  
  // Fallback for older browsers
  window.addEventListener('pagehide', fireSessionExit);
}

// ==========================================
// SCROLL DEPTH TRACKING (MAIN PAGES ONLY)
// ==========================================

const scrollThresholdsFired = new Set<number>();
let activeScrollListener: (() => void) | null = null;

/**
 * Initialize scroll depth tracking for main site pages.
 * Excludes gallery pages and image pages (the art viewer has its own interaction signals).
 */
export function initScrollDepthTracking(): void {
  if (typeof window === 'undefined') return;

  // Remove any prior listener (SPA navigation can call this multiple times)
  if (activeScrollListener) {
    window.removeEventListener('scroll', activeScrollListener);
    activeScrollListener = null;
  }

  const path = window.location.pathname;

  // Exclude art viewer pages
  const imageId = getImageIdFromPath(path);
  if (imageId) return;

  // Exclude chapter/gallery pages
  const galleryId = getGalleryIdFromPath(path);
  if (galleryId) return;

  const pageType: TrackContext['pageType'] = (path === '/' || path === '') ? 'landing' : 'other';
  const thresholds = [25, 50, 75, 100];
  
  // Reset for new page
  scrollThresholdsFired.clear();
  
  const checkScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (docHeight <= 0) return;
    
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    for (const threshold of thresholds) {
      if (scrollPercent >= threshold && !scrollThresholdsFired.has(threshold)) {
        scrollThresholdsFired.add(threshold);
        trackEvent(`scroll_${threshold}`, {
          pageType,
          imageId: null,
          galleryId: null
        });
      }
    }
  };
  
  // Use passive listener for performance
  activeScrollListener = checkScroll;
  window.addEventListener('scroll', activeScrollListener, { passive: true });
  
  // Check initial scroll position
  checkScroll();
}

/**
 * Helper to extract gallery ID from URL path
 * Returns parent/child format for disambiguation (e.g., "Western-Cowboy-Portraits/Color")
 * Only returns value for actual gallery/image paths under /Galleries/ or /Other/
 */
export function getGalleryIdFromPath(path?: string): string | null {
  const p = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  
  // Only track galleries under /Galleries/ or /Other/ (but not /Other/Print-Options etc)
  const isGalleryPath = p.includes('/Galleries/') || 
    (p.includes('/Other/') && (p.includes('/Engrained') || p.includes('/Archive')));
  
  if (!isGalleryPath) return null;
  
  const parts = p.split('/').filter(Boolean);
  
  // If ends with image ID (i-xxx), use 2 segments before the image
  const lastPart = parts[parts.length - 1];
  if (lastPart?.startsWith('i-')) {
    // e.g., /Galleries/.../Western-Cowboy-Portraits/Color/i-xxx -> Western-Cowboy-Portraits/Color
    if (parts.length >= 3) {
      return `${parts[parts.length - 3]}/${parts[parts.length - 2]}`;
    }
    return parts[parts.length - 2] || null;
  }
  
  // For gallery pages, return last 2 segments for context
  // e.g., /Galleries/.../Western-Cowboy-Portraits/Color -> Western-Cowboy-Portraits/Color
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  
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
