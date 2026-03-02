/**
 * K4 Analytics - Client-side tracking helper
 * 
 * Sends events to tracking endpoint on Cloudflare Worker
 * Uses sendBeacon for reliable delivery even on page unload
 */

const TRACK_ENDPOINT = '/__k4e';

let inMemorySessionId: string | null = null;

function safeRandomId(): string {
  try {
    const c = (globalThis as any)?.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isK4Debug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('k4debug');
  } catch {
    return false;
  }
}

function resolveEndpointUrl(pathname: string): string {
  if (typeof window === 'undefined') return pathname;
  try {
    return new URL(pathname, window.location.href).href;
  } catch {
    return pathname;
  }
}

function getBuildId(): string | null {
  if (typeof window === 'undefined') return null;
  // Optional: allow build ID injection via global.
  const w = window as any;
  return typeof w.__K4_BUILD_ID === 'string' ? w.__K4_BUILD_ID : null;
}

// Session ID persists for the browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  // Prefer sessionStorage (best for session continuity), but never crash if unavailable.
  try {
    let sessionId = sessionStorage.getItem('k4_session_id');
    if (!sessionId) {
      sessionId = safeRandomId();
      sessionStorage.setItem('k4_session_id', sessionId);
    }
    return sessionId;
  } catch {
    // Fallback: keep stable ID for this JS runtime.
    if (!inMemorySessionId) inMemorySessionId = safeRandomId();
    return inMemorySessionId;
  }
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

type ClarityFn = (...args: any[]) => void;

function getClarity(): ClarityFn | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  const c = w.clarity;
  return typeof c === 'function' ? (c as ClarityFn) : null;
}

function syncClarityIdentity(): void {
  // Best-effort only: never throw and never block event delivery.
  try {
    const clarity = getClarity();
    if (!clarity) return;

    const sessionId = getSessionId();
    if (!sessionId) return;

    const key = `k4_clarity_identified_${sessionId}`;
    try {
      if (sessionStorage.getItem(key) === '1') return;
    } catch {
      // ignore
    }

    // k4_vid is minted server-side and set as a cookie; it may not exist
    // until after the first /__k4e request completes.
    const visitorId = getCookie('k4_vid');
    const userId = visitorId || sessionId;

    // Clarity API: identify(userId, sessionId, pageId?)
    clarity('identify', userId, sessionId, window.location.pathname);
    // Also attach as custom properties for easy filtering.
    clarity('set', 'k4_session_id', sessionId);
    if (visitorId) clarity('set', 'k4_vid', visitorId);

    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

// Get the entry referrer - always prefer the edge-set cookie (worker updates it
// on every top-level navigation), fall back to sessionStorage only when the
// cookie has expired or is missing.
function getEntryReferrer(): string | null {
  if (typeof window === 'undefined') return null;

  // Cookie is the source of truth — the worker rewrites it on each top-level
  // navigation (bookmark → "direct", external → encoded URL, internal → no-op).
  const cookieRef = getCookie('k4_entry_ref');
  if (cookieRef) {
    // Sync sessionStorage so it survives cookie expiry within the same tab
    sessionStorage.setItem('k4_entry_referrer', cookieRef);
    return cookieRef;
  }

  // Cookie absent (expired / not yet set) — use cached sessionStorage value
  const cached = sessionStorage.getItem('k4_entry_referrer');
  if (cached !== null) {
    return cached || null;
  }

  // Last resort: document.referrer (least reliable)
  const entryReferrer = document.referrer || '';
  sessionStorage.setItem('k4_entry_referrer', entryReferrer);
  return entryReferrer || null;
}

interface TrackContext {
  galleryId?: string | null;
  imageId?: string | null;
  sourceLayer?: string | null;
  pageType?: 'landing' | 'gallery' | 'image' | 'other';
  theme?: string | null;
  trigger?: string | null;
}

interface ActionPixelContext {
  galleryId?: string | null;
  sourceLayer?: string | null;
  pageType?: 'landing' | 'gallery' | 'image' | 'other';
  theme?: string | null;
  trigger?: string | null;
  pixelType?: 'action' | 'image' | 'page';
}

const PIXEL_ENDPOINT = '/_state';
const DEFAULT_PIXEL_LAYER_BY_ACTION: Record<string, string> = {
  chapter_view: 'sister_pixel_v1',
  xl_zoom: 'zoom_pixel_v1',
  zoom_open: 'zoom_pixel_v1',
  grid_open: 'grid_open_pixel_v1',
  theme_grid_open: 'theme_grid_open_pixel_v1',
  grid_image_click: 'grid_image_click_pixel_v1',
  theme_grid_image_click: 'theme_grid_image_click_pixel_v1',
  grid_show_more: 'grid_show_more_pixel_v1',
  grid_show_previous: 'grid_show_previous_pixel_v1',
  cowboy_jump: 'cowboy_jump_pixel_v1',
  order_clicked: 'order_clicked_pixel_v1',
  order_submitted: 'order_submitted_pixel_v1',
  series_info: 'series_info_pixel_v1',
  more_info_open: 'more_info_open_pixel_v1',
  sister_image_click: 'sister_image_click_pixel_v1',
  slideshow_start: 'slideshow_start_pixel_v1',
  slideshow_nav_prev: 'slideshow_nav_prev_pixel_v1',
  slideshow_nav_next: 'slideshow_nav_next_pixel_v1',
  browse_all_open: 'browse_all_open_pixel_v1',
  browse_all_image_click: 'browse_all_image_click_pixel_v1',
  gallery_hero_click: 'gallery_hero_click_pixel_v1',
  gallery_preview_click: 'gallery_preview_click_pixel_v1',
  gallery_explore_click: 'gallery_explore_click_pixel_v1',
  gallery_landing_view: 'gallery_landing_view_pixel_v1',
  exit_to_gallery: 'exit_to_gallery_pixel_v1',
  site_content_view: 'site_content_view_pixel_v1',
  scroll_25: 'scroll_25_pixel_v1',
  scroll_50: 'scroll_50_pixel_v1',
  scroll_75: 'scroll_75_pixel_v1',
  scroll_100: 'scroll_100_pixel_v1',
  collector_notes_open: 'collector_notes_open_pixel_v1',
  guide_open: 'guide_open_pixel_v1',
  guide_close: 'guide_close_pixel_v1',
  guide_done: 'guide_done_pixel_v1',
  guide_click_outside: 'guide_click_outside_pixel_v1',
};

const inflightActionPixels: HTMLImageElement[] = [];
const recentTrackEventTs = new Map<string, number>();
const recentActionPixelTs = new Map<string, number>();
const TRACK_EVENT_DEDUPE_WINDOW_MS = 2500;
const ACTION_PIXEL_DEDUPE_WINDOW_MS = 2500;
const EVENT_SAMPLE_RATES: Record<string, number> = {
  site_content_view: 0.5
};

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shouldSampleOutEvent(event: string, key: string): boolean {
  const rate = EVENT_SAMPLE_RATES[event];
  if (typeof rate !== 'number' || rate >= 1) return false;
  if (rate <= 0) return true;
  const bucket = stableHash(`${event}|${key}`) / 4294967295;
  return bucket > rate;
}

function shouldDropBurstDuplicate(
  memory: Map<string, number>,
  key: string,
  ttlMs: number
): boolean {
  const now = Date.now();
  const last = memory.get(key) || 0;
  if (now - last < ttlMs) return true;

  memory.set(key, now);

  if (memory.size > 500) {
    const cutoff = now - ttlMs * 4;
    for (const [existingKey, timestamp] of memory.entries()) {
      if (timestamp < cutoff) memory.delete(existingKey);
    }
  }

  return false;
}

type SendOutcome = {
  send_method: 'sendBeacon' | 'fetch';
  fetch_keepalive?: boolean;
  fetch_cache?: 'no-store' | 'default';
  endpoint_resolved_url: string;
  attempted: boolean;
  beacon_ok?: boolean;
  response_status?: number;
  redirected?: boolean;
  response_url?: string;
};

function sendTrackingPayload(payloadJson: string, debugLabel?: string): void {
  if (typeof window === 'undefined') return;

  const debug = isK4Debug();
  const endpointResolved = resolveEndpointUrl(TRACK_ENDPOINT);

  const logDebug = (outcome: SendOutcome) => {
    if (!debug) return;
    // Intentionally console-only; avoids perturbing event delivery.
    console.log('[k4] delivery', {
      label: debugLabel || null,
      host: window.location.host,
      href: window.location.href,
      referrer: document.referrer || null,
      ...outcome
    });
  };

  // Prefer sendBeacon for unload-safe delivery.
  if (navigator.sendBeacon) {
    const blob = new Blob([payloadJson], { type: 'application/json' });
    const ok = navigator.sendBeacon(TRACK_ENDPOINT, blob);
    logDebug({
      send_method: 'sendBeacon',
      endpoint_resolved_url: endpointResolved,
      attempted: true,
      beacon_ok: ok
    });
    return;
  }

  // Fetch fallback (keepalive + no-store)
  fetch(TRACK_ENDPOINT, {
    method: 'POST',
    body: payloadJson,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    cache: 'no-store',
    credentials: 'same-origin'
  })
    .then((res) => {
      logDebug({
        send_method: 'fetch',
        fetch_keepalive: true,
        fetch_cache: 'no-store',
        endpoint_resolved_url: endpointResolved,
        attempted: true,
        response_status: res.status,
        redirected: res.redirected,
        response_url: res.url
      });
    })
    .catch(() => {
      logDebug({
        send_method: 'fetch',
        fetch_keepalive: true,
        fetch_cache: 'no-store',
        endpoint_resolved_url: endpointResolved,
        attempted: true
      });
    });
}

function shouldSkipDuplicateEvent(event: string, context: TrackContext, pagePath: string): boolean {
  // Only dedupe events where accidental double-firing is common.
  // chapter_view: dedupe for the ENTIRE session (same image = 1 view per session)
  // gallery_view: dedupe for the ENTIRE session (same gallery = 1 view per session)
  if (event !== 'chapter_view' && event !== 'gallery_view') return false;

  // gallery_view dedupes on galleryId; chapter_view dedupes on imageId
  const dedupId = event === 'gallery_view'
    ? (context.galleryId || getGalleryIdFromPath(pagePath))
    : (context.imageId || getImageIdFromPath(pagePath));
  if (!dedupId) return false;

  const key = `k4_dedupe_${event}_${dedupId}`;
  const now = Date.now();
  const last = parseInt(sessionStorage.getItem(key) || '0', 10);

  if (event === 'chapter_view' || event === 'gallery_view') {
    // Session-scoped: once viewed, don't log it again this session
    if (last) return true;
    sessionStorage.setItem(key, String(now));
    return false;
  }

  sessionStorage.setItem(key, String(now));
  return false;
}

/**
 * Track a user interaction event
 * 
 * @param event - Event name (e.g., 'nav_next', 'grid_open', 'cowboy_jump')
 * @param context - Optional context about the gallery/image/page
 * 
 * Event names:
 * - Entry: cowboy_jump, gallery_hero_click, gallery_explore_click, gallery_preview_click
 * - Navigation: nav_next, nav_prev
 * - Actions: grid_open, more_info_open, collector_notes_open
 * - Other: sister_image_click, slideshow_start, guide_open
 */
export function trackEvent(event: string, context: TrackContext = {}): void {
  // Skip if SSR
  if (typeof window === 'undefined') return;

  try {

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

  const sampleKey = [
    getSessionId(),
    inferredImageId || '',
    inferredGalleryId || '',
    inferredPageType || '',
    pagePath
  ].join('|');

  if (shouldSampleOutEvent(event, sampleKey)) {
    return;
  }

  const burstKey = [
    event,
    inferredImageId || '',
    inferredGalleryId || '',
    inferredPageType || '',
    context.trigger || '',
    pagePath
  ].join('|');

  if (shouldDropBurstDuplicate(recentTrackEventTs, burstKey, TRACK_EVENT_DEDUPE_WINDOW_MS)) {
    return;
  }

  const payload = JSON.stringify({
    session_id: getSessionId(),
    event,
    gallery_id: inferredGalleryId || null,
    image_id: inferredImageId || null,
    source_layer: context.sourceLayer || null,
    page_type: inferredPageType || null,
    theme: context.theme || null,
    trigger: context.trigger || null,
    referrer: entryReferrer,
    page_path: pagePath,
    host: (typeof window !== 'undefined') ? window.location.host : null,
    document_referrer: (typeof document !== 'undefined') ? (document.referrer || null) : null,
    build: getBuildId(),
    event_ts_ms: Date.now(),        // Client timestamp for timing analysis
    event_order: getNextEventOrder() // Event sequence within session
  });

  sendTrackingPayload(payload, event);

  } catch (e) {
    if (isK4Debug()) {
      console.error('[k4] trackEvent failed', {
        event,
        href: (typeof window !== 'undefined') ? window.location.href : null,
        message: (e as any)?.message || String(e)
      });
    }
  }
}

export function emitActionPixel(action: string, imageId: string | null = null, context: ActionPixelContext = {}): void {
  if (typeof window === 'undefined') return;

  try {
    const pagePath = window.location.pathname;
    const inferredImageId = imageId ?? getImageIdFromPath(pagePath);
    const inferredGalleryId = context.galleryId ?? getGalleryIdFromPath(pagePath);
    if (!inferredImageId && (inferredGalleryId === '/' || inferredGalleryId === '')) {
      return;
    }
    const inferredPageType: ActionPixelContext['pageType'] = context.pageType ?? (
      inferredImageId ? 'image'
        : inferredGalleryId ? 'gallery'
          : (pagePath === '/' || pagePath === '') ? 'landing'
            : 'other'
    );

    const pixelType = context.pixelType || 'action';
    const layer = context.sourceLayer || DEFAULT_PIXEL_LAYER_BY_ACTION[action] || `${action}_pixel_v1`;
    const params = new URLSearchParams({
      t: pixelType,
      e: action,
      v: String(Date.now())
    });
    const sid = getSessionId();
    if (sid) params.set('sid', sid);
    if (window.location.pathname) params.set('path', window.location.pathname);

    if (inferredImageId) params.set('id', inferredImageId);
    if (inferredGalleryId) params.set('g', inferredGalleryId);
    if (inferredPageType) params.set('pt', inferredPageType);
    if (layer) params.set('sl', layer);
    if (context.theme) params.set('th', String(context.theme));
    if (context.trigger) params.set('tr', String(context.trigger));

    const sampleKey = [
      getSessionId(),
      inferredImageId || '',
      inferredGalleryId || '',
      inferredPageType || '',
      layer || '',
      context.trigger || '',
      pixelType,
      window.location.pathname
    ].join('|');

    if (shouldSampleOutEvent(action, sampleKey)) {
      return;
    }

    const burstKey = [
      action,
      inferredImageId || '',
      inferredGalleryId || '',
      inferredPageType || '',
      layer || '',
      context.trigger || '',
      pixelType
    ].join('|');

    if (shouldDropBurstDuplicate(recentActionPixelTs, burstKey, ACTION_PIXEL_DEDUPE_WINDOW_MS)) {
      return;
    }

    const img = new Image();
    img.referrerPolicy = 'same-origin';
    inflightActionPixels.push(img);
    img.onload = img.onerror = () => {
      const idx = inflightActionPixels.indexOf(img);
      if (idx >= 0) inflightActionPixels.splice(idx, 1);
    };
    img.src = `${PIXEL_ENDPOINT}?${params.toString()}`;
  } catch (e) {
    if (isK4Debug()) {
      console.error('[k4] emitActionPixel failed', {
        action,
        href: (typeof window !== 'undefined') ? window.location.href : null,
        message: (e as any)?.message || String(e)
      });
    }
  }
}

// Expose trackEvent globally for use in Astro components via onclick
if (typeof window !== 'undefined') {
  (window as any).k4track = trackEvent;
  (window as any).k4emitActionPixel = emitActionPixel;
}

/**
 * Track a page view - call this on page load to record all page visits
 * Also initializes scroll depth tracking and updates page context for session exit
 */
export function trackPageView(): void {
  const debug = isK4Debug();
  if (debug) {
    console.log('[k4] bootstrap', {
      href: window.location.href,
      host: window.location.host,
      ts: Date.now(),
      build: getBuildId(),
      endpoint: resolveEndpointUrl(TRACK_ENDPOINT)
    });
    // Debug-only server beacon proving bootstrap executed.
    trackEvent('k4_debug_bootstrap', { pageType: 'other', trigger: 'bootstrap' });
  }

  // Best-effort correlation: tag Clarity with our IDs.
  // If k4_vid doesn't exist yet, we'll retry after the first beacon.
  syncClarityIdentity();

  trackEvent('page_view');

  // Retry once shortly after first beacon so k4_vid cookie
  // (minted server-side on /__k4e) can be picked up.
  setTimeout(syncClarityIdentity, 1500);
  // Clarity itself is loaded after window load + 2s, so also
  // retry later to ensure the API exists.
  setTimeout(syncClarityIdentity, 4500);
  setTimeout(syncClarityIdentity, 9000);

  // Fire derived view beacons based on the current URL.
  // This is important because parts of the site navigate via history.pushState
  // and do not reload, so view events must be tied to URL changes.
  trackDerivedViewsFromLocation();
  emitPagePixel('page_load');
  emitSiteContentPagePixel('page_load');

  // Update page context for session exit tracking
  updatePageContext();

  // Install SPA navigation hooks once (pushState/replaceState/popstate)
  // so page/image views track even without full reload.
  installNavigationTracking();

  // Pre-nav click capture for image links (covers full-nav and fast transitions)
  installPreNavImageLinkTracking();
  
  // Initialize scroll depth tracking (main site pages only; excludes galleries/images)
  initScrollDepthTracking();
}

// ==========================================
// SPA NAVIGATION TRACKING
// ==========================================

let navTrackingInstalled = false;
let lastTrackedPath: string | null = null;
let lastPagePixelPath: string | null = null;

function trackDerivedViewsFromLocation(): void {
  if (typeof window === 'undefined') return;
  // CRITICAL GUARDRAIL: prevent duplicate fires when UI state changes
  // cause minor history updates or navigation hooks to re-run.
  if (lastTrackedPath === location.pathname) return;
  lastTrackedPath = location.pathname;

  const path = window.location.pathname;

  const imageId = getImageIdFromPath(path);
  if (imageId) {
    trackEvent('chapter_view', { imageId, pageType: 'image', trigger: 'derived_location' });
    if (isK4Debug()) {
      trackEvent('k4_debug_chapter_emit', { imageId, pageType: 'image', trigger: 'derived_location' });
    }
    return;
  }

  const galleryId = getGalleryIdFromPath(path);
  if (galleryId) {
    trackEvent('gallery_view', { galleryId, pageType: 'gallery' });
    emitActionPixel('gallery_landing_view', null, {
      galleryId,
      pageType: 'gallery',
      sourceLayer: 'gallery_landing_view_pixel_v1',
      trigger: 'derived_location'
    });
  }
}

function emitPagePixel(trigger: string): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (lastPagePixelPath === path) return;
  lastPagePixelPath = path;

  const imageId = getImageIdFromPath(path);
  const galleryId = getGalleryIdFromPath(path);
  const pageType: ActionPixelContext['pageType'] = imageId
    ? 'image'
    : galleryId
      ? 'gallery'
      : (path === '/' || path === '')
        ? 'landing'
        : 'other';

  emitActionPixel('page_view', imageId, {
    galleryId,
    pageType,
    pixelType: 'page',
    sourceLayer: 'page_pixel_v1',
    trigger
  });
}

function installNavigationTracking(): void {
  if (typeof window === 'undefined') return;
  if (navTrackingInstalled) return;
  navTrackingInstalled = true;

  const onNav = (trigger: TrackContext['trigger']) => {
    // CRITICAL GUARDRAIL: do not re-track if path did not change
    if (lastTrackedPath === location.pathname) return;
    // Treat SPA navigation like a page view for context + view beacons.
    trackEvent('page_view', { trigger });
    trackDerivedViewsFromLocation();
    emitPagePixel(trigger || 'nav');
    emitSiteContentPagePixel(trigger || 'nav');
    updatePageContext();
    initScrollDepthTracking();
  };

  // back/forward
  window.addEventListener('popstate', () => onNav('popstate'));

  // patch pushState/replaceState
  const historyObj = window.history as History & {
    __k4Patched?: 1;
    __k4PushState?: History['pushState'];
    __k4ReplaceState?: History['replaceState'];
  };
  if (!historyObj.__k4Patched) {
    historyObj.__k4Patched = 1;
    historyObj.__k4PushState = historyObj.pushState;
    historyObj.__k4ReplaceState = historyObj.replaceState;

    historyObj.pushState = function (...args) {
      const ret = (historyObj.__k4PushState as any)!.apply(this, args as any);
      queueMicrotask(() => onNav('pushstate'));
      return ret;
    };
    historyObj.replaceState = function (...args) {
      const ret = (historyObj.__k4ReplaceState as any)!.apply(this, args as any);
      queueMicrotask(() => onNav('replacestate'));
      return ret;
    };
  }
}

// ==========================================
// PRE-NAV IMAGE LINK TRACKING
// ==========================================

let preNavClickInstalled = false;

function installPreNavImageLinkTracking(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (preNavClickInstalled) return;
  preNavClickInstalled = true;

  document.addEventListener(
    'click',
    (e) => {
      try {
        // Only left-click without modifiers.
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const target = e.target as Element | null;
        const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!a) return;
        if (a.target && a.target !== '_self') return;
        if (a.hasAttribute('download')) return;

        const href = a.getAttribute('href');
        if (!href) return;

        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const imageId = getImageIdFromPath(url.pathname);
        if (!imageId) return;

        // Emit before navigation completes (protects against unload drops).
        trackEvent('chapter_view', { imageId, pageType: 'image', trigger: 'internal_link_click' });
        if (isK4Debug()) {
          trackEvent('k4_debug_chapter_emit', { imageId, pageType: 'image', trigger: 'internal_link_click' });
        }
      } catch {
        // never break navigation
      }
    },
    true
  );
}

function emitSiteContentPagePixel(trigger: string): void {
  if (typeof window === 'undefined') return;

  const path = window.location.pathname;
  const imageId = getImageIdFromPath(path);
  const galleryId = getGalleryIdFromPath(path);

  if (imageId || galleryId) return;

  emitActionPixel('site_content_view', null, {
    sourceLayer: 'site_content_view_pixel_v1',
    pageType: path === '/' ? 'landing' : 'other',
    pixelType: 'page',
    trigger
  });
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
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(TRACK_ENDPOINT, blob);
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
        emitActionPixel(`scroll_${threshold}`, null, {
          pageType,
          sourceLayer: `scroll_${threshold}_pixel_v1`,
          trigger: 'scroll_depth'
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
 * Returns FULL canonical gallery path after /Galleries/ or /Other/
 * e.g., "Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color"
 * This ensures a single identity for each gallery across all tracking paths.
 */
export function getGalleryIdFromPath(path?: string): string | null {
  const p = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  
  // Only track galleries under /Galleries/ or /Other/ (but not /Other/Print-Options etc)
  const isGalleryPath = p.includes('/Galleries/') || 
    (p.includes('/Other/') && (p.includes('/Engrained') || p.includes('/Archive')));
  
  if (!isGalleryPath) return null;
  
  // Strip the image ID suffix if present (e.g., /i-xxx at end)
  let normalized = p.replace(/\/i-[a-zA-Z0-9_-]+\/?$/, '');
  
  // Strip trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Return FULL path after /Galleries/ or /Other/
  // e.g., /Galleries/Painterly-Fine-Art-Photography/.../Color -> Painterly-Fine-Art-Photography/.../Color
  if (normalized.includes('/Galleries/')) {
    return normalized.split('/Galleries/')[1] || null;
  }
  if (normalized.includes('/Other/')) {
    return normalized.split('/Other/')[1] || null;
  }
  
  return null;
}

/**
 * Helper to extract image ID from URL path
 * e.g., /Galleries/.../Facing-History/i-2rXwHbt -> i-2rXwHbt
 */
export function getImageIdFromPath(path?: string): string | null {
  const p = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  const match = p.match(/(i-[a-zA-Z0-9_-]+)\/?$/);
  return match ? match[1] : null;
}
