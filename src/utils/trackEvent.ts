/**
 * Event Tracking Utility
 * 
 * Fire-and-forget tracking for user intent (button clicks).
 * Tracks actual engagement, not image loads which can be inflated by preloading.
 * 
 * Events:
 *   xl_zoom        - User clicked zoom button to see full-size image
 *   slideshow_start - User clicked slideshow button to start auto-play
 *   chapter_view   - User navigated to a chapter image (proves human via JS)
 */

type EventType = 'xl_zoom' | 'slideshow_start' | 'chapter_view';

function getGlobalFiredMap(): Record<string, 1> {
  if (typeof window === 'undefined') return {};
  const w = window as any;
  if (!w.__k4_artview_fired) w.__k4_artview_fired = {};
  return w.__k4_artview_fired as Record<string, 1>;
}

export function trackEvent(type: EventType, imageId: string | undefined | null) {
  // SSR guard
  if (typeof window === 'undefined') return;
  
  // Validate
  if (!type || !imageId) return;
  if (!/^i-[a-zA-Z0-9_-]+$/.test(imageId)) return;
  
  // Dedup within session (same event + image = fire once)
  const key = `${type}:${imageId}`;
  const fired = getGlobalFiredMap();
  if (fired[key]) return;
  fired[key] = 1;
  
  // Fire and forget - send to same-origin endpoint which proxies to CF worker
  // Same-origin ensures k4_vid cookie is sent for visitor tracking
  const TRACK_URL = '/__k4track/event';
  const payload = JSON.stringify({ type, imageId });
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(TRACK_URL, payload);
  } else {
    // Fallback for older browsers
    fetch(TRACK_URL, {
      method: 'POST',
      body: payload,
      keepalive: true,
      credentials: 'same-origin'
    }).catch(() => {}); // Ignore errors
  }
}
