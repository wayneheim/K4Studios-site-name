import { useState, useEffect } from 'react';
import { buildContextualAlt, getPageContext } from '../utils/buildContextualAlt';
import { warmImage } from '../utils/warmImage';
import '../styles/tombstone-nav.css';

const TRACK_ENDPOINT = 'https://edge.k4studios.com/__k4e';

/**
 * Normalize any thumb URL to a proper proxy URL
            if (typeof window !== 'undefined' && typeof window.k4ShouldSuppressAnalytics === 'function' && window.k4ShouldSuppressAnalytics()) {
              return;
            }

 * Handles:
 * - SmugMug URLs: extracts ID → /img/{id}/s
 * - Absolute proxy URLs: converts to relative /img/{id}/s  
 * - Already relative /img/... URLs: forces to 's' size
 * - Local static images (/images/...): returns as-is
 */
function normalizeThumbUrl(url) {
  if (!url) return '';
  
  // Already a relative proxy URL - force to 's' size for thumbnails
  if (url.startsWith('/img/')) {
    const proxyMatch = url.match(/\/img\/(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)/);
    if (proxyMatch) return `/img/${proxyMatch[1]}/s.jpg`;
    return url;
  }
  
  // Local static image - keep as-is
  if (url.startsWith('/images/')) return url;
  
  // Extract image ID from SmugMug URL pattern: /i-XXXXXX/
  const smugMugMatch = url.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (smugMugMatch) {
    return `/img/${smugMugMatch[1]}/s.jpg`;
  }
  
  // Absolute proxy URL - convert to relative with 's' size
  const proxyMatch = url.match(/\/img\/(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)/);
  if (proxyMatch) {
    return `/img/${proxyMatch[1]}/s.jpg`;
  }
  
  // Unknown format - return as-is (might be external or placeholder)
  return url;
}

/**
 * @param {{ items?: any[]; title?: any; subtitle?: any; pageContext?: any }} props
 */
export default function TombstoneNav({
  items = [],
  title = null,
  subtitle = null,
  pageContext: propPageContext = null,
} = {}) {
  const gridClass = `tile-grid${items.length === 2 ? ' two-tiles' : ''}`;

  // Client-side random thumb selection from thumbs array
  const [selectedThumbs, setSelectedThumbs] = useState(() => 
    items.map(item => normalizeThumbUrl(item.thumbs?.[0] || item.thumb || ''))
  );
  
  // Resolved page context (from prop or auto-detected from path)
  const [resolvedContext, setResolvedContext] = useState(propPageContext);

  // Wheelhouse focus: which era to center and highlight (from ?focus= URL param)
  const [focusKey, setFocusKey] = useState(null);
  const [hoveredNonFocusIndex, setHoveredNonFocusIndex] = useState(null);

  useEffect(() => {
    // Auto-resolve page context if not passed as prop
    if (!propPageContext) {
      const currentPath = window.location.pathname;
      const autoContext = getPageContext(currentPath);
      if (autoContext) {
        setResolvedContext(autoContext);
      }
    }

    // Read ?focus= parameter for wheelhouse mode
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('focus');
    if (focus) setFocusKey(focus);
    
    // On mount, pick random thumbs from the thumbs array if available
    setSelectedThumbs(items.map(item => {
      let thumb;
      if (item.thumbs && item.thumbs.length > 0) {
        thumb = item.thumbs[Math.floor(Math.random() * item.thumbs.length)];
      } else {
        thumb = item.thumb || '';
      }
      return normalizeThumbUrl(thumb);
    }));
  }, [items, propPageContext]);

  // Warm tombstone thumbs immediately after selection
  useEffect(() => {
    if (!selectedThumbs.length) return;
    
    selectedThumbs.forEach(thumbUrl => {
      // Extract ID from /img/{id}/s URL
      const match = thumbUrl.match(/\/img\/(i-[^/]+)/);
      if (match) {
        warmImage(match[1], 's'); // Display size
        warmImage(match[1], 'l'); // Click-through hero
      }
    });
  }, [selectedThumbs]);

  // ── Wheelhouse focus: compute visual order to center the focused tile ──
  const focusIndex = focusKey ? items.findIndex(item => item.focusKey === focusKey) : -1;
  const orderValues = (() => {
    if (focusIndex < 0) return new Array(items.length).fill(0);
    const n = items.length;
    const center = Math.floor(n / 2);
    const others = [];
    for (let i = 0; i < n; i++) {
      if (i !== focusIndex) others.push(i);
    }
    const visual = [...others.slice(0, center), focusIndex, ...others.slice(center)];
    const orders = new Array(n).fill(0);
    visual.forEach((idx, pos) => { orders[idx] = pos; });
    return orders;
  })();

  return (
    <div className={`tombstone-nav${focusIndex >= 0 ? ' has-focus-mode' : ''}`}>
      {title && <h2 className="western-title">{title}</h2>}
      {subtitle && <p className="subhead">{subtitle}</p>}

      <div className="tombstone-divider" />

      <div className={`${gridClass}${focusIndex >= 0 ? ' has-focus' : ''}`}>
        {items.map((item, index) => {
          // Build contextual alt text with Tier B (navigation) - functional alt only, no enrichment
          const contextualAlt = buildContextualAlt(item.title, resolvedContext, { index, tier: 'B' });
          const isFocused = focusIndex >= 0 && index === focusIndex;
          const isDimmed = focusIndex >= 0 && index !== focusIndex;
          const isMutedByHover = isFocused && hoveredNonFocusIndex !== null;
          
          // Track ALL tombstone clicks for analytics
          const handleClick = () => {
            if (typeof window !== 'undefined' && typeof window.k4track === 'function') {
              window.k4track('gallery_explore_click', {
                galleryId: item.trackingId || sanitizedTitle,
                pageType: 'landing'
              });
              return;
            }

            // Track via Cloudflare D1
            const sidMatch = document.cookie.match(/(?:^|;\s*)k4_sid=([^;]+)/);
            const cookieSid = sidMatch ? decodeURIComponent(sidMatch[1]) : '';
            const sessionId = cookieSid || sessionStorage.getItem('k4_session_id') || crypto.randomUUID();
            sessionStorage.setItem('k4_session_id', sessionId);
            const cookieDomainAttr = window.location.hostname.toLowerCase().endsWith('k4studios.com')
              ? '; Domain=.k4studios.com'
              : '';
            document.cookie = `k4_sid=${encodeURIComponent(sessionId)}; Path=/; SameSite=Lax; Secure${cookieDomainAttr}`;
            
            const sanitizedTitle = (item.title || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
            const payload = JSON.stringify({
              session_id: sessionId,
              event: 'gallery_explore_click',
              gallery_id: item.trackingId || sanitizedTitle,
              page_type: 'landing'
            });
            
            // Use sendBeacon for reliable delivery during navigation
            const sendViaFetch = () => {
              fetch(TRACK_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true,
                cache: 'no-store',
                mode: 'cors',
                credentials: 'include'
              }).catch(() => {});
            };

            if (navigator.sendBeacon) {
              const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
              const ok = navigator.sendBeacon(TRACK_ENDPOINT, blob);
              if (ok) return;
            }

            sendViaFetch();
          };
          
          // Animation delay: use visual position when focused, DOM index otherwise
          const visualPos = focusIndex >= 0 ? orderValues[index] : index;

          return (
            <a 
              key={item.title} 
              href={item.href} 
              className={`tile${item.mobileOnly ? ' mobile-only-tile' : ''}${isFocused ? ' is-focused' : ''}${isDimmed ? ' is-dimmed' : ''}${isMutedByHover ? ' is-muted-by-hover' : ''}`}
              title={contextualAlt}
              onClick={handleClick}
              onMouseEnter={() => {
                if (focusIndex >= 0 && index !== focusIndex) {
                  setHoveredNonFocusIndex(index);
                }
              }}
              onMouseLeave={() => {
                if (hoveredNonFocusIndex !== null) {
                  setHoveredNonFocusIndex(null);
                }
              }}
              style={focusIndex >= 0 ? { order: orderValues[index] } : undefined}
            >
              <div
                className="tombstone-card tombstone-animate"
                style={{ animationDelay: `${1.05 + visualPos * 0.1}s` }}
              >
                <img
                  src={selectedThumbs[index]}
                  alt={contextualAlt}
                  loading="lazy"
                  width="140"
                  height="160"
                  className="tombstone-img"
                />
              </div>
              <p
                className="tombstone-title fade-in-up pop-effect"
                style={{
                  animationDelay: `${1.27 + visualPos * 0.2}s, ${2.8 + visualPos * 0.42}s`,
                }}
              >
                {item.title}
              </p>
            </a>
          );
        })}
      </div>

    </div>
  );
}
