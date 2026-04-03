import { useEffect, useState, useMemo } from "react";
import { warmImage } from "../utils/warmImage";
import "../styles/landing-right-images.css";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getProxySrc = (id, size = "s") => `/img/${id}/${size}`;

// Extract image ID from href like "/Galleries/.../i-abc123"
const extractIdFromHref = (href) => {
  const match = href?.match(/\/(i-[a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
};

// Fisher-Yates shuffle
const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const trackHomeImageNavigation = (href, imageId, sourceLayer) => {
  if (typeof window === 'undefined' || typeof window.k4ShouldSuppressAnalytics === 'function' && window.k4ShouldSuppressAnalytics()) {
    return;
  }

  const galleryId = href ? href.replace(/\/i-[^/]+$/, '') : null;

  if (typeof window.k4track === 'function') {
    window.k4track('gallery_preview_click', {
      galleryId,
      imageId,
      pageType: 'landing',
      sourceLayer
    });
  }

  if (typeof window.k4emitActionPixel === 'function') {
    window.k4emitActionPixel('gallery_preview_click', imageId, {
      galleryId,
      pageType: 'landing',
      sourceLayer
    });
  }
};

const shouldBypassTrackedNavigation = (event) => !event || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const handleTrackedNavigation = (event, href, tracker) => {
  if (!href || typeof window === 'undefined') return;

  if (shouldBypassTrackedNavigation(event)) {
    tracker();
    return;
  }

  event.preventDefault();
  tracker();
  window.setTimeout(() => {
    window.location.assign(href);
  }, 80);
};

/**
 * LandingRightImages - Sidebar image thumbnails with client-side rotation
 * 
 * Props:
 * - images: Full pool of available images (pass more than needed for variety)
 * - displayCount: Number of images to actually show (default: images.length)
 * - heading: Section heading text
 * 
 * On each page load, picks a random subset from the pool for display.
 */
export default function LandingRightImages({ heading = "", images = [], displayCount, dynamicSpacing = true }) {
  // Client-side: pick random subset from pool on mount
  const [displayImages, setDisplayImages] = useState([]);
  
  useEffect(() => {
    const count = displayCount || images.length;
    const shuffled = shuffleArray(images);
    setDisplayImages(shuffled.slice(0, count));
  }, [images, displayCount]);
  
  // Warm all displayed images on mount (sidebar only shows ~5)
  useEffect(() => {
    displayImages.forEach(img => {
      const imageId = img.id || extractIdFromHref(img.href);
      if (imageId) warmImage(imageId, 's');
    });
  }, [displayImages]);

  return (
    <aside className="sidebar-thumbnails" data-dynamic-sidebar={dynamicSpacing ? true : undefined}>
      <div className="thumb-heading-wrapper">
        <h3 className="thumb-heading">{heading}</h3>
      </div>

      {displayImages.map(({ href, id, alt, title }, index) => {
        // Get ID from prop or extract from href
        const imageId = id || extractIdFromHref(href);
        const imageSrc = imageId ? getProxySrc(imageId, 's') : '';
        
        return (
          <a
            href={href}
            key={href || id}
            data-sidebar-index={index}
            onClick={(event) => handleTrackedNavigation(event, href, () => trackHomeImageNavigation(href, imageId, 'home_sidebar_image_click'))}
            style={dynamicSpacing && index > 0 ? { visibility: 'hidden' } : undefined}
          >
            <img
              src={imageSrc}
              alt={alt}
              title={title}
              className="thumb-img"
              loading="eager"
              decoding="async"
              onLoad={(e) => e.target.classList.add('loaded')}
            />
          </a>
        );
      })}

      {dynamicSpacing && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var attempts = 0;
            var maxAttempts = 30; // 3 seconds max wait
            
            function calcSidebarSpacing() {
              var textCol = document.querySelector('.text-column');
              var sidebar = document.querySelector('[data-dynamic-sidebar]');
              if (!textCol || !sidebar) return;
              
              var links = sidebar.querySelectorAll('a[data-sidebar-index]');
              if (links.length <= 1) return;
              
              var imgs = sidebar.querySelectorAll('.thumb-img');
              var allLoaded = Array.from(imgs).every(function(img) { return img.complete; });
              
              if (!allLoaded && attempts < maxAttempts) {
                attempts++;
                setTimeout(calcSidebarSpacing, 100);
                return;
              }
              
              var textHeight = textCol.offsetHeight;
              var totalImgHeight = Array.from(imgs).reduce(function(sum, img) { return sum + img.offsetHeight; }, 0);
              var headingArea = 80;
              var firstGap = 36;
              var bottomBuffer = 750;
              var available = textHeight - headingArea - firstGap - totalImgHeight - bottomBuffer;
              var numGaps = links.length - 1;
              
              if (available > 0 && numGaps > 0) {
                var gap = Math.max(available / numGaps, 36);
                links.forEach(function(link, i) {
                  if (i > 0) {
                    link.style.display = 'block';
                    link.style.marginTop = gap + 'px';
                    link.style.visibility = 'visible';
                  }
                });
              } else {
                links.forEach(function(link) {
                  link.style.visibility = 'visible';
                });
              }
            }
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', function() { setTimeout(calcSidebarSpacing, 150); });
            } else {
              setTimeout(calcSidebarSpacing, 150);
            }
            window.addEventListener('resize', calcSidebarSpacing);
          })();
        `}} />
      )}
    </aside>
  );
}
