import { useEffect, useState, useMemo } from "react";
import { warmImage } from "../utils/warmImage";

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
export default function LandingRightImages({ heading = "", images = [], displayCount }) {
  // Client-side: pick random subset from pool on mount
  const [displayImages, setDisplayImages] = useState([]);
  
  useEffect(() => {
    const count = displayCount || images.length;
    const shuffled = shuffleArray(images);
    setDisplayImages(shuffled.slice(0, count));
  }, [images, displayCount]);
  
  // Warm first 3 displayed images on mount (above fold)
  useEffect(() => {
    displayImages.slice(0, 3).forEach(img => {
      const imageId = img.id || extractIdFromHref(img.href);
      if (imageId) warmImage(imageId, 's');
    });
  }, [displayImages]);

  return (
    <aside className="sidebar-thumbnails" data-dynamic-sidebar>
      <div className="thumb-heading-wrapper">
        <h3 className="thumb-heading">{heading}</h3>
      </div>

      {displayImages.map(({ href, id, alt, title }, index) => {
        // Get ID from prop or extract from href
        const imageId = id || extractIdFromHref(href);
        const imageSrc = imageId ? getProxySrc(imageId, 's') : '';
        
        return (
          <a href={href} key={href || id} data-sidebar-index={index} style={index > 0 ? { visibility: 'hidden' } : {}}>
            <img
              src={imageSrc}
              alt={alt}
              title={title}
              className="thumb-img"
              loading="lazy"
              decoding="async"
            />
          </a>
        );
      })}

      <style jsx>{`
        .sidebar-thumbnails {
          width: 100%;
          max-width: 260px;
          margin-left: auto;
          margin-right: 1rem;
          text-align: center;
        }

        .thumb-heading-wrapper {
          width: 100%;
          margin-bottom: 1.25rem;
        }

        .thumb-heading {
          font-family: 'Glegoo', serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: #3e2c1c;
          margin-top: 3rem;
          margin-bottom: -15px;
        }

        .thumb-img {
          display: inline-block;
          width: 100%;
          max-width: 260px;
          margin: 2.25rem auto;
          border-radius: 8px;
          box-shadow: 0 7px 16px rgba(0, 0, 0, 0.18);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          will-change: transform, box-shadow;
          backface-visibility: hidden;
        }

        .thumb-img:hover {
          transform: scale(1.025);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
        }

        @media (max-width: 768px) {

         .thumb-heading {
         margin-top: -50px;
         margin-bottom: 10px;
      }
          .sidebar-thumbnails {
            margin: 0 auto;
          }

        .thumb-img-stack {
        display: block;
        margin-top: 2rem;
        }

  .thumb-img {
      display: block;
   }
        }
      `}</style>

      {/* Vanilla JS for dynamic spacing - runs without React hydration */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          function calcSidebarSpacing() {
            var textCol = document.querySelector('.text-column');
            var sidebar = document.querySelector('[data-dynamic-sidebar]');
            if (!textCol || !sidebar) return;
            
            var links = sidebar.querySelectorAll('a[data-sidebar-index]');
            if (links.length <= 1) return;
            
            var imgs = sidebar.querySelectorAll('.thumb-img');
            var allLoaded = Array.from(imgs).every(function(img) { return img.complete; });
            if (!allLoaded) {
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
              links.forEach(function(link) { link.style.visibility = 'visible'; });
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
    </aside>
  );
}
