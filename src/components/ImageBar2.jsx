import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar2.css";
import { buildContextualAlt, getPageContext } from "../utils/buildContextualAlt";
import { getProxySrc, getCarouselProxySrcset } from "@/utils/imageProxy.js";
import { warmImage } from "../utils/warmImage";

/**
 * Carousel image sizing:
 * - Desktop (390px height): Use L (1024px)
 * - Mobile (200px height): Use M (600px)
 * 
 * We use srcset + sizes so browser picks the right one automatically.
 * All URLs go through /img/{id}/{size} proxy to hide SmugMug URLs.
 */
function getCarouselSrc(s) {
  // Use proxy URL - request L size for desktop, Worker handles fallback
  if (s.id) {
    return getProxySrc(s.id, 'l');
  }
  // Fallback for old carousel data without id (shouldn't happen)
  return s.srcL || s.srcM || s.srcXL || s.src || '';
}

function getCarouselSrcset(s) {
  // Use proxy srcset if we have an image ID
  if (s.id) {
    return getCarouselProxySrcset(s.id);
  }
  // Fallback for old carousel data without sized sources
  if (!s.srcM && !s.srcL) {
    return undefined;
  }
  // Legacy fallback - M and L only (no XL needed for carousel)
  const sources = [];
  if (s.srcM) sources.push(`${s.srcM} 600w`);
  if (s.srcL) sources.push(`${s.srcL} 1024w`);
  return sources.length > 0 ? sources.join(', ') : undefined;
}

// Carousel sizes: mobile gets M, desktop gets L
// 768px breakpoint matches our CSS media query
const CAROUSEL_SIZES = "(max-width: 768px) 600px, 1024px";

// Glob import: grabs all carousel slide data files from Galleries, Other, and top-level landing pages
// rename to cap
const allCarousels = import.meta.glob([
  "../data/Galleries/**/carousel.ts",
  "../data/Other/**/carousel.ts",
  "../data/Cowboy-Fine-Art-Photography/carousel.ts",
  "../data/Painterly-Western-Photography/carousel.ts",
  "../data/Western-Fine-Art-Photography/carousel.ts",
  "../data/Western-Black-and-White-Photography/carousel.ts",
  "../data/Western-Cowboy-Photography/carousel.ts",
  "../data/Western-Wall-Art/carousel.ts",
  "../data/Pictorialist-Photography/carousel.ts"
], { eager: true });

export default function ImageBar2({ slides, pageContext: propPageContext }) {
  const trackRef = useRef(null);
  const [finalSlides, setFinalSlides] = useState(slides ?? []);
  // Duplicate slides for infinite scroll effect - done in React state, not DOM manipulation
  const [duplicated, setDuplicated] = useState(false);
  // Resolved page context (from prop or auto-detected from path)
  const [resolvedContext, setResolvedContext] = useState(propPageContext);

  // First effect: match current path to a carousel file and load slides
  useEffect(() => {
    const currentPath = window.location.pathname.replace(/\/$/, '').toLowerCase(); // normalize: no trailing slash, lowercase
    
    // Auto-resolve page context if not passed as prop
    if (!propPageContext) {
      const autoContext = getPageContext(currentPath);
      if (autoContext) {
        setResolvedContext(autoContext);
      }
    }
    
    if (!slides || slides.length === 0) {

      const matchKey = Object.keys(allCarousels).find((key) => {
        // Convert file path to URL path
        const urlPath = key
          .replace("../data/Galleries", "/Galleries")
          .replace("../data/Other", "/Other")
          .replace("../data/", "/")  // Handle top-level landing pages like Painterly-Western-Photography
          .replace("/carousel.ts", "")
          .toLowerCase(); // normalize to lowercase for comparison
        return urlPath === currentPath;
      });

      if (matchKey) {
        const mod = allCarousels[matchKey];
        if ("slides" in mod) {
          setFinalSlides(mod.slides);
        } else {
          console.warn("No 'slides' export found in:", matchKey);
        }
      } else {
        console.warn("No matching carousel file found for path:", currentPath);
      }
    }
  }, [slides]);

  // Second effect: mark slides as duplicated for infinite scroll effect
  useEffect(() => {
    if (finalSlides.length > 0) {
      setDuplicated(true);
    }
  }, [finalSlides]);

  // Warm first 4 carousel images immediately (3 visible + 1 buffer)
  // Rest warm during idle time
  useEffect(() => {
    if (!finalSlides.length) return;
    
    // Immediately warm first 4 (visible on load)
    finalSlides.slice(0, 4).forEach(slide => {
      if (slide.id) warmImage(slide.id, 'm');
    });
    
    // Warm remainder during idle time
    const warmRest = () => {
      finalSlides.slice(4).forEach(slide => {
        if (slide.id) warmImage(slide.id, 'm');
      });
    };
    
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(warmRest);
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(warmRest, 200);
      return () => clearTimeout(timer);
    }
  }, [finalSlides]);

  if (!finalSlides.length) return null;

  // Double the slides for infinite scroll effect (only after hydration)
  const displaySlides = duplicated ? [...finalSlides, ...finalSlides] : finalSlides;

  return (
    <section
      className="carousel"
      aria-label="Fine-Art Photography Carousel"
      role="region"
      itemScope
      itemType="https://schema.org/ImageGallery"
    >
      <meta itemProp="name" content="Fine Art Gallery Carousel" />
      <meta itemProp="creator" content="K4 Studios" />

      <div className="carousel-track" ref={trackRef}>
        {displaySlides.map((s, i) => {
          // Determine if this is a duplicated slide (for infinite scroll effect)
          const originalIndex = i % finalSlides.length;
          const isDuplicate = duplicated && i >= finalSlides.length;
          
          // Build contextual alt text with Tier A (hero/carousel) and semantic sufficiency check
          // Duplicated slides get empty alt + aria-hidden to reduce keyword density
          // Pass description as fallback for bad alt detection/rewriting
          const contextualAlt = buildContextualAlt(s.alt, resolvedContext, {
            index: originalIndex,
            tier: 'A',
            isDecorativeDuplicate: isDuplicate,
            fallbackDescription: s.description
          });
          
          return (
            <figure
              className="carousel-slide"
              key={`slide-${i}`}
              itemScope
              itemType="https://schema.org/ImageObject"
              {...(isDuplicate ? { 'aria-hidden': 'true' } : {})}
            >
              <a href={s.href} title={isDuplicate ? undefined : contextualAlt} aria-label={isDuplicate ? undefined : contextualAlt}>
                <img 
                  src={getCarouselSrc(s)} 
                  srcSet={getCarouselSrcset(s)}
                  sizes={CAROUSEL_SIZES}
                  alt={contextualAlt} 
                  loading="lazy" 
                  itemProp="contentUrl"
                />
              </a>
              <figcaption itemProp="description">{s.description}</figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
