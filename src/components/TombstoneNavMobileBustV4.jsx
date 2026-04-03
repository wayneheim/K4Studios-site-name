import { useState, useEffect } from 'react';
import { buildContextualAlt, getPageContext } from '../utils/buildContextualAlt';
import { warmImage } from '../utils/warmImage';

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
    if (proxyMatch) return `/img/${proxyMatch[1]}/s`;
    return url;
  }
  
  // Local static image - keep as-is
  if (url.startsWith('/images/')) return url;
  
  // Extract image ID from SmugMug URL pattern: /i-XXXXXX/
  const smugMugMatch = url.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (smugMugMatch) {
    return `/img/${smugMugMatch[1]}/s`;
  }
  
  // Absolute proxy URL - convert to relative with 's' size
  const proxyMatch = url.match(/\/img\/(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)/);
  if (proxyMatch) {
    return `/img/${proxyMatch[1]}/s`;
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
    <section className={`tombstone-nav${focusIndex >= 0 ? ' has-focus-mode' : ''}`}>
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

      <style jsx>{`
        @media (max-width: 640px) {
          .tombstone-nav {
            transform: scale(0.87);
            transform-origin: top center;
            padding: 0.5rem 1rem 1rem !important;
            margin-bottom: -4.5rem;
            margin-top: -5pt;
          }

          .tombstone-nav.has-focus-mode {
            transform: none;
            padding: 0.35rem 0.35rem 0.7rem !important;
            margin-bottom: -1.25rem;
            margin-top: 0;
          }
        }

        .tombstone-title {
          font-family: 'Glegoo', serif;
          font-size: 0.85rem;
          font-weight: 800;
          color: #3e2c1c;
          text-align: center;
          margin-top: 0.5rem;
        }

        .fade-in-up {
          opacity: 0;
          transform: translateY(-20px);
          animation-name: fadeSlideUp;
          animation-duration: 0.9s;
          animation-timing-function: ease;
          animation-fill-mode: forwards;
          animation-delay: 0.6s;
        }

        .fade-in-up.pop-effect {
          animation-name: fadeSlideUp, pop-highlight;
          animation-duration: 0.9s, 0.7s;
          animation-timing-function: ease, ease;
          animation-fill-mode: forwards, forwards;
          animation-delay: 0.6s, 1.8s;
        }

        @keyframes fadeSlideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pop-highlight {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.15);
          }
          60% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }

        .tombstone-nav {
          text-align: center;
          padding: 2rem 1rem;
          font-family: 'Glegoo', serif;
        }

        .tombstone-nav h2 {
          font-size: 1.8rem;
          color: #3e2c1c;
          margin-bottom: 0.3rem;
        }

        .tombstone-nav .subhead {
          font-size: 1rem;
          color: #555;
          margin-bottom: 2rem;
        }

        .tile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1.25rem;
          max-width: 900px;
          margin: 0 auto;
          min-height: 180px; /* Reserve height to prevent CLS */
        }

        .tile-grid.two-tiles {
          max-width: 450px;
        }

        .tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          width: 100%;
          max-width: 150px;
          margin: 0 auto;
          transition: transform 0.3s ease;
          min-height: 160px; /* Reserve height for tile + title */
        }

        .tile:hover .tombstone-card {
          box-shadow:
            0 6px 16px rgba(0, 0, 0, 0.2),
            0 0 0 2px rgba(189, 162, 124, 0.3);
          transform: scale(1.01);
        }

        .tombstone-card {
          aspect-ratio: 3.5 / 4;
          border-radius: 0% 0% 25% 25% / 0% 0% 20% 20%;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #bda27c;
          box-shadow:
            inset 0 -1px 1px rgba(255, 255, 255, 0.6),
            inset 0 1px 2px rgba(0, 0, 0, 0.08),
            0 8px 20px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 250px;
        }

        .tombstone-divider {
          width: 100%;
          max-width: 780px;
          height: 3px;
          background-color: rgb(167, 154, 142);
          margin: 0.25rem auto 1.5rem;
          opacity: 0.85;
        }

        .tombstone-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 15%;
          aspect-ratio: 3.5 / 4;
        }

        .tile p {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          font-weight: 800;
          color: #3e2c1c;
          text-align: center;
        }

        @media (min-width: 768px) {
          /* Reserve space for tombstone grid to prevent CLS */
          .tile-grid {
            gap: 2rem;
            min-height: 200px; /* Reserve minimum height for tiles on desktop */
          }

          .tile {
            min-height: 180px; /* Reserve height for tile + title on desktop */
          }
          
          /* Hide mobile-only tiles on desktop */
          .mobile-only-tile {
            display: none;
          }
        }
        
        /* Show mobile-only tiles on mobile */
        @media (max-width: 767px) {
          .mobile-only-tile {
            display: flex;
          }
        }

        .tombstone-animate {
          opacity: 0;
          animation-name: dropIn;
          animation-duration: 0.8s;
          animation-fill-mode: forwards;
          animation-timing-function: ease-out;
        }

        @keyframes dropIn {
          0% {
            opacity: 0;
            transform: translateY(-40px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .tile-grid .tile {
          transition: transform 0.4s ease-out, filter 0.4s ease-out;
        }

        
   @media (hover: hover) and (pointer: fine) {
    .tile-grid:hover .tile {
      transform: scale(0.9);
      filter: grayscale(100%) brightness(0.68);
    }

    .tile-grid:hover .tile:hover {
      transform: scale(1.05);
      filter: none;
      z-index: 1;
    }
  }

        /* ── Wheelhouse focus mode ── */
        .tile-grid.has-focus .tile.is-focused {
          transform: scale(1.1) translateY(-14px);
          filter: none;
          z-index: 3;
        }

        .tile-grid.has-focus .tile.is-focused .tombstone-card {
          border-color: #b8943e;
          box-shadow:
            0 14px 30px rgba(0, 0, 0, 0.28),
            0 0 0 3px rgba(184, 148, 62, 0.48);
        }

        .tile-grid.has-focus .tile.is-dimmed {
          filter: grayscale(82%) brightness(0.62);
          transform: scale(0.84) translateY(6px);
        }

        @media (hover: hover) and (pointer: fine) {
          .tile-grid.has-focus:hover .tile.is-focused {
            transform: scale(1.08) translateY(-12px);
            filter: none;
            z-index: 3;
          }

          .tile-grid.has-focus:hover .tile.is-focused.is-muted-by-hover {
            transform: scale(1.08) translateY(-12px);
            filter: grayscale(88%) brightness(0.56);
            z-index: 3;
          }

          .tile-grid.has-focus:hover .tile.is-dimmed {
            transform: scale(0.82) translateY(8px);
            filter: grayscale(88%) brightness(0.56);
          }

          .tile-grid.has-focus:hover .tile.is-dimmed:hover {
            transform: scale(1.02) translateY(-2px);
            filter: none;
            z-index: 2;
          }
        }

        @media (max-width: 767px) {
          .tombstone-divider {
            margin: 0.25rem auto 0.45rem;
          }

          .tile-grid.has-focus {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            width: 100%;
            max-width: none;
            gap: 0.72rem 0.62rem;
            min-height: auto;
          }

          .tile-grid.has-focus .tile {
            max-width: none;
            width: 100%;
          }

          .tile-grid.has-focus .tile.is-focused {
            order: -1 !important;
            grid-column: 1 / -1;
            justify-self: center;
            transform: scale(1.0) translateY(-11px);
            z-index: 3;
          }

          .tile-grid.has-focus .tile.is-focused .tombstone-card {
            max-width: 154px;
          }

          .tile-grid.has-focus .tile.is-dimmed {
            transform: translateY(2px);
            filter: grayscale(32%) brightness(0.92);
          }

          .tile-grid.has-focus .tile.is-dimmed .tombstone-card {
            max-width: 112px;
          }

          .tile-grid.has-focus .tile.is-dimmed .tombstone-title {
            font-size: 0.8rem;
            line-height: 1.12;
            margin-top: 0.3rem;
          }

          .tile-grid.has-focus .tile.is-focused {
            transform: scale(1.0) translateY(-11px);
          }
        }

        
      `}</style>
    </section>
  );
}
