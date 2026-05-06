import { useEffect, useState, useMemo } from "react";
import { warmImage } from "../utils/warmImage";
import { getSemanticImageUrl } from "../utils/imageProxy.js";
import "../styles/landing-right-images.css";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getSidebarImageSrc = (image, imageId, size = "s") =>
  imageId ? getSemanticImageUrl({ ...image, id: imageId }, { galleryPath: image.galleryPath || getGalleryPathFromImageHref(image.href) }, size) : "";

// Extract image ID from href like "/Galleries/.../i-abc123"
const extractIdFromHref = (href) => {
  const match = href?.match(/\/(i-[a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
};

const getGalleryPathFromImageHref = (href = "") => String(href || "").replace(/\/i-[a-zA-Z0-9-]+\/?$/, "");

// Fisher-Yates shuffle
const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getStoryTeaser = (story, wordCount = 6) => {
  if (!story) return "";

  const words = String(story)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!words.length) return "";
  if (words.length <= wordCount) return words.join(" ");
  return `${words.slice(0, wordCount).join(" ")}...`;
};

const getImageAltText = ({ alt, title, description }) => {
  if (alt && String(alt).trim()) return String(alt).trim();
  if (title && String(title).trim()) return String(title).trim();
  if (description && String(description).trim()) {
    return String(description).replace(/\s+/g, " ").trim();
  }
  return "Fine art image by Wayne Heim";
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
 * - showTitles: Whether to display image titles/captions below thumbnails
 * 
 * On each page load, picks a random subset from the pool for display.
 */
export default function LandingRightImages({ heading = "", images = [], displayCount, dynamicSpacing = true, showTitles = false }) {
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

      {displayImages.map(({ href, id, alt, title, story, description, galleryPath }, index) => {
        // Get ID from prop or extract from href
        const imageId = id || extractIdFromHref(href);
        const imageSrc = getSidebarImageSrc({ href, id, alt, title, story, description, galleryPath }, imageId, 's');
        const caption = title || alt || '';
        const hoverText = showTitles ? getStoryTeaser(story) || undefined : title;
        const imageAlt = getImageAltText({ alt, title, description });
        
        return (
          <a
            href={href}
            key={href || id}
            className={showTitles ? "thumb-card thumb-card-with-caption" : "thumb-card"}
            data-sidebar-index={index}
            onClick={(event) => handleTrackedNavigation(event, href, () => trackHomeImageNavigation(href, imageId, 'home_sidebar_image_click'))}
            style={dynamicSpacing && index > 0 ? { visibility: 'hidden' } : undefined}
          >
            <img
              src={imageSrc}
              alt={imageAlt}
              title={hoverText}
              className="thumb-img"
              loading="eager"
              decoding="async"
              onLoad={(e) => e.target.classList.add('loaded')}
            />
            {showTitles && caption && (
              <span className="thumb-caption">{caption}</span>
            )}
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
              
              var cards = sidebar.querySelectorAll('a[data-sidebar-index]');
              if (cards.length <= 1) return;
              
              var imgs = sidebar.querySelectorAll('.thumb-img');
              var allLoaded = Array.from(imgs).every(function(img) { return img.complete; });
              
              if (!allLoaded && attempts < maxAttempts) {
                attempts++;
                setTimeout(calcSidebarSpacing, 100);
                return;
              }
              
              var textHeight = textCol.offsetHeight;
              var totalCardHeight = Array.from(cards).reduce(function(sum, card) { return sum + card.offsetHeight; }, 0);
              var headingArea = 80;
              var firstGap = 36;
              var bottomBuffer = 750;
              var available = textHeight - headingArea - firstGap - totalCardHeight - bottomBuffer;
              var numGaps = cards.length - 1;
              
              if (available > 0 && numGaps > 0) {
                var gap = Math.max(available / numGaps, 36);
                cards.forEach(function(link, i) {
                  if (i > 0) {
                    link.style.display = 'block';
                    link.style.marginTop = gap + 'px';
                    link.style.visibility = 'visible';
                  }
                });
              } else {
                cards.forEach(function(link) {
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
