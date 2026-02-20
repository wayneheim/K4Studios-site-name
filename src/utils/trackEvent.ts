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

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let sessionId = sessionStorage.getItem('k4_session_id');
    if (!sessionId) {
      sessionId = (crypto as any)?.randomUUID?.() || String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      sessionStorage.setItem('k4_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return null;
  }
}

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

  function send(typeToSend: string) {
    // Dedup within session (same event + image = fire once)
    const key = `${typeToSend}:${imageId}`;
    const fired = getGlobalFiredMap();
    if (fired[key]) return;
    fired[key] = 1;

    // Fire and forget - send to same-origin endpoint which proxies to CF worker
    // Same-origin ensures k4_vid cookie is sent for visitor tracking
    const TRACK_URL = '/__k4track/event';
    const payload = JSON.stringify({ type: typeToSend, imageId, session_id: getSessionId() });

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

  send(type);
}
