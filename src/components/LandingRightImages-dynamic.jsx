import { useEffect, useRef, useState } from 'react';
import { getSemanticImageUrl } from "../utils/imageProxy.js";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getGalleryPathFromImageHref = (href = "") => String(href || "").replace(/\/i-[a-zA-Z0-9-]+\/?$/, "");

// Extract image ID from href like "/Galleries/.../i-abc123"
const extractIdFromHref = (href) => {
  const match = href?.match(/\/(i-[a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
};

/**
 * LandingRightImages-dynamic.jsx
 * 
 * Test version that dynamically distributes sidebar images
 * to span the full height of the text column.
 * 
 * Strategy:
 * 1. Measure the height of the text-column on mount/resize
 * 2. Calculate spacing between images to fill that height
 * 3. Use CSS custom properties or inline styles for the gaps
 */
export default function LandingRightImagesDynamic({ 
  heading = "", 
  images = [],
  textColumnSelector = ".text-column" // CSS selector for the text column to match height
}) {
  const containerRef = useRef(null);
  const [dynamicGap, setDynamicGap] = useState(36); // default gap in px (2.25rem)
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const calculateSpacing = () => {
      const textColumn = document.querySelector(textColumnSelector);
      const container = containerRef.current;
      
      if (!textColumn || !container || images.length === 0) {
        setIsReady(true);
        return;
      }

      // Get the text column height
      const textHeight = textColumn.offsetHeight;
      
      // Get all images in the container
      const imgs = container.querySelectorAll('.thumb-img');
      if (imgs.length === 0) {
        setIsReady(true);
        return;
      }

      // Wait for images to load to get accurate heights
      const imagePromises = Array.from(imgs).map(img => {
        if (img.complete) return Promise.resolve(img.offsetHeight);
        return new Promise(resolve => {
          img.onload = () => resolve(img.offsetHeight);
          img.onerror = () => resolve(img.offsetHeight);
        });
      });

      Promise.all(imagePromises).then(heights => {
        // Calculate total image height
        const totalImageHeight = heights.reduce((sum, h) => sum + h, 0);
        
        // Get heading height + its margins (approx 80px for heading area)
        const headingArea = 80;
        
        // First image gets the default margin from heading (36px = 2.25rem)
        const firstImageGap = 36;
        
        // Available space for gaps BETWEEN images (not before first)
        // Subtract: heading area, first image gap, all images, some bottom buffer
        const availableSpace = textHeight - headingArea - firstImageGap - totalImageHeight - 50;
        
        // Number of gaps between images (not including first)
        const numGaps = images.length - 1;
        
        if (availableSpace > 0 && numGaps > 0) {
          const calculatedGap = Math.max(availableSpace / numGaps, 36); // minimum 36px, no max
          setDynamicGap(calculatedGap);
        }
        
        setIsReady(true);
      });
    };

    // Initial calculation after a short delay for layout
    const timeoutId = setTimeout(calculateSpacing, 100);
    
    // Recalculate on resize
    window.addEventListener('resize', calculateSpacing);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateSpacing);
    };
  }, [images, textColumnSelector]);

  return (
    <aside 
      className="sidebar-thumbnails-dynamic" 
      ref={containerRef}
      style={{ 
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
    >
      <div className="thumb-heading-wrapper">
        <h3 className="thumb-heading">{heading}</h3>
      </div>

      {images.map(({ href, id, alt, title, galleryPath }, index) => {
        const imageId = id || extractIdFromHref(href);
        const imageSrc = imageId ? getSemanticImageUrl({ id: imageId, title, alt }, { galleryPath: galleryPath || getGalleryPathFromImageHref(href) }, 's') : '';
        
        return (
          <div 
            key={href} 
            className="thumb-spacer"
            style={{ 
              // First image: use default margin. Others: use calculated gap
              marginTop: index === 0 ? '2.25rem' : `${dynamicGap}px` 
            }}
          >
            <a href={href}>
              <img
                src={imageSrc}
                alt={alt}
                title={title}
                className="thumb-img"
                loading="lazy"
                decoding="async"
              />
            </a>
          </div>
        );
      })}

      <style jsx>{`
        .sidebar-thumbnails-dynamic {
          width: 100%;
          max-width: 260px;
          margin-left: auto;
          margin-right: 1rem;
          text-align: center;
        }

        .thumb-heading-wrapper {
          width: 100%;
          margin-bottom: 0;
        }

        .thumb-heading {
          font-family: 'Glegoo', serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: #3e2c1c;
          margin-top: 3rem;
          margin-bottom: 0;
        }

        .thumb-spacer {
          display: block;
          width: 100%;
        }

        .thumb-img {
          display: inline-block;
          width: 100%;
          max-width: 260px;
          border-radius: 8px;
          box-shadow: 0 7px 16px rgba(0, 0, 0, 0.18);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
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
          .sidebar-thumbnails-dynamic {
            margin: 0 auto;
          }
          .thumb-spacer {
            margin-top: 2.25rem !important;
          }
        }
      `}</style>
    </aside>
  );
}
