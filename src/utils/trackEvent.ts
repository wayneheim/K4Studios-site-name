/**
 * Event Tracking Utility
 * 
 * Fire-and-forget tracking for user intent (button clicks).
 * Tracks actual engagement, not image loads which can be inflated by preloading.
 * 
 * Events:
 *   xl_zoom        - User clicked zoom button to see full-size image
 *   slideshow_start - User clicked slideshow button to start auto-play
 */

type EventType = 'xl_zoom' | 'slideshow_start';

// Dedup within session to prevent double-fires
const fired = new Set<string>();

export function trackEvent(type: EventType, imageId: string | undefined | null) {
  // SSR guard
  if (typeof window === 'undefined') return;
  
  // Validate
  if (!type || !imageId) return;
  if (!/^i-[a-zA-Z0-9]+$/.test(imageId)) return;
  
  // Dedup within session (same event + image = fire once)
  const key = `${type}:${imageId}`;
  if (fired.has(key)) return;
  fired.add(key);
  
  // Fire and forget - use sendBeacon for reliability
  const payload = JSON.stringify({ type, imageId });
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/__k4track/event', payload);
  } else {
    // Fallback for older browsers
    fetch('/__k4track/event', {
      method: 'POST',
      body: payload,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {}); // Ignore errors
  }
}
