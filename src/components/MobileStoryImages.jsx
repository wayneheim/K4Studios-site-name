import { useEffect, useMemo } from "react";
import { warmImage } from "../utils/warmImage";
import { getSemanticImageUrl } from "../utils/imageProxy.js";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
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

const resolveImageHref = (match) => {
  if (match?.href) {
    return match.href;
  }

  const galleryBase = match?.galleryPath || "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color";
  const imageId = match?.id || '';

  if (!imageId) {
    return galleryBase;
  }

  return `${galleryBase}/i-${imageId.replace(/^i-/, "")}`;
};

const getMobileImageSrc = (image, size = "s") =>
  image?.id ? getSemanticImageUrl(image, { galleryPath: image.galleryPath || getGalleryPathFromImageHref(resolveImageHref(image)) }, size) : "";

const getImageAltText = (image) => {
  if (image?.alt && String(image.alt).trim()) return String(image.alt).trim();
  if (image?.title && String(image.title).trim()) return String(image.title).trim();
  if (image?.description && String(image.description).trim()) {
    return String(image.description).replace(/\s+/g, " ").trim();
  }
  return "Fine art photography by Wayne Heim";
};

/**
 * MobileStoryImages - Inline images for mobile with client-side rotation
 * 
 * Props:
 * - images: Full pool of available images (pass more than needed for variety)
 * - displayCount: Number of images to insert (default: based on story blocks)
 */
export default function MobileStoryImages({ images = [], displayCount }) {
  // Shuffle pool once on mount for this page load
  const shuffledImages = useMemo(() => shuffleArray(images), [images]);
  
  // Warm first few mobile images immediately on mobile
  useEffect(() => {
    if (window.innerWidth > 768) return;
    
    // Warm first 3 images that will be inserted
    const maxToWarm = Math.min(3, displayCount || shuffledImages.length);
    shuffledImages.slice(0, maxToWarm).forEach(img => {
      if (img?.id) {
        warmImage(img.id, 's');
      }
    });
  }, [shuffledImages, displayCount]);
  
  useEffect(() => {
    if (window.innerWidth > 768) {
      return;
    }

    const tryInsertImages = () => {
      const storyBlocks = document.querySelectorAll(".story-block");
      if (!storyBlocks.length || !shuffledImages.length) {
        return setTimeout(tryInsertImages, 300);
      }

      let insertedCount = 0;
      const maxToInsert = displayCount || shuffledImages.length;

      storyBlocks.forEach((block, index) => {
        const h3 = block.querySelector("h3");
        if (!h3 || index === 0 || insertedCount >= maxToInsert || !shuffledImages[insertedCount]) return;

        const match = shuffledImages[insertedCount];
        insertedCount++;

        const container = document.createElement("div");
        container.className = "mobile-inline-img-wrapper mobile-only";

        const link = document.createElement("a");
        link.href = resolveImageHref(match);
        link.style.display = "block";
        link.addEventListener('click', (event) => {
          handleTrackedNavigation(event, link.href, () => {
            trackHomeImageNavigation(link.href, match.id || null, 'home_story_image_click');
          });
        });

        const img = document.createElement("img");
        img.src = match.id ? getMobileImageSrc(match, 's') : (match.srcS || match.srcM || match.srcL || match.src);
        img.alt = getImageAltText(match);
        img.className = "mobile-inline-img";
        img.width = 280;  // Explicit dimensions to prevent CLS
        img.height = 350; // Approximate aspect ratio for portrait images
        img.loading = "lazy";
        img.decoding = "async";

        const caption = document.createElement("div");
        caption.className = "mobile-caption";
        caption.textContent = match.title || "";

        link.appendChild(img);
        container.appendChild(link);
        container.appendChild(caption);

        h3.parentNode?.insertBefore(container, h3);
      });
    };

    tryInsertImages();
  }, [shuffledImages, displayCount]);

  return (
    <>
      <style jsx global>{`
        .mobile-inline-img-wrapper {
          text-align: center;
          margin: 1.75rem auto 2.25rem;
          max-width: 280px;
        }

        .mobile-inline-img {
          width: 100%;
          height: auto;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: block;
          contain: layout;
        }

        .mobile-inline-img:hover {
          transform: scale(1.025);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
        }

        .mobile-caption {
          font-family: 'Glegoo', serif;
          font-size: 0.95rem;
          color: #4c3a2e;
          margin-top: 0.5rem;
          padding: 0 0.25rem;
          line-height: 1.4;
          opacity: 0.95;
        }
      `}</style>
    </>
  );
}
