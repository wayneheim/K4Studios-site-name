import { useEffect, useRef, useState, useCallback } from "react";
import "../styles/ImageBar2.css";
import { buildContextualAlt, getPageContext } from "../utils/buildContextualAlt";
import { getProxySrc, getCarouselProxySrcset } from "@/utils/imageProxy.js";
import { warmImage } from "../utils/warmImage";

/**
 * Carousel image sizing:
 * - Desktop (390px height): Use M (600px) - faster loading
 * - Mobile (200px height): Use M (600px)
 * 
 * We use srcset + sizes so browser picks the right one automatically.
 * All URLs go through /img/{id}/{size} proxy to hide SmugMug URLs.
 */
function getCarouselSrc(s) {
  // Use proxy URL - request M size for faster loading
  if (s.id) {
    return getProxySrc(s.id, 'm');
  }
  // Fallback for old carousel data without id (shouldn't happen)
  return s.srcM || s.srcL || s.srcXL || s.src || '';
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
  "../data/Fine-Art-Photography-of-the-American-West/carousel.ts",
  "../data/Painterly-Western-Photography/carousel.ts",
  "../data/Western-Fine-Art-Photography/carousel.ts",
  "../data/Western-Black-and-White-Photography/carousel.ts",
  "../data/Western-Cowboy-Photography/carousel.ts",
  "../data/Western-Wall-Art/carousel.ts",
  "../data/Pictorialist-Photography/carousel.ts",
  "../data/Historical-Western-Art/carousel.ts"
], { eager: true });

/**
 * @param {{ slides?: any[]; pageContext?: any; showTrim?: boolean }} props
 */
export default function ImageBar2({ slides = [], pageContext: propPageContext = null, showTrim = true } = {}) {
  const trackRef = useRef(null);
  const [finalSlides, setFinalSlides] = useState(slides ?? []);
  // Duplicate slides for infinite scroll effect - done in React state, not DOM manipulation
  const [duplicated, setDuplicated] = useState(false);
  // Resolved page context (from prop or auto-detected from path)
  const [resolvedContext, setResolvedContext] = useState(propPageContext);
  // Track which images have loaded (by index)
  const [loadedImages, setLoadedImages] = useState({});
  // Carousel ready to reveal (enough images loaded)
  const [carouselReady, setCarouselReady] = useState(false);

  const handleImageLoad = useCallback((index) => {
    setLoadedImages(prev => ({ ...prev, [index]: true }));
  }, []);

  // Count how many of the first set (non-duplicate) images are loaded
  const loadedCount = Object.keys(loadedImages).filter(k => parseInt(k) < finalSlides.length).length;
  
  // Wait for first 5 images (visible viewport) to load before wipe reveal
  useEffect(() => {
    const threshold = Math.min(5, finalSlides.length);
    if (loadedCount >= threshold && !carouselReady) {
      setCarouselReady(true);
    }
  }, [loadedCount, finalSlides.length, carouselReady]);

  // Failsafe: reveal carousel after 4 seconds even if images slow
  useEffect(() => {
    if (carouselReady || !finalSlides.length) return;
    const timer = setTimeout(() => {
      if (!carouselReady) setCarouselReady(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [finalSlides.length, carouselReady]);

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
  // Also only reveal once duplicated to avoid track width shift
  useEffect(() => {
    if (finalSlides.length > 0 && !duplicated) {
      setDuplicated(true);
    }
  }, [finalSlides, duplicated]);

  // Warm all carousel images immediately for faster loading
  useEffect(() => {
    if (!finalSlides.length) return;
    
    // Warm all images at once - curtain wipe buys time
    finalSlides.forEach(slide => {
      if (slide.id) warmImage(slide.id, 'm');
    });
  }, [finalSlides]);

  if (!finalSlides.length || !duplicated) return null;

  // Double the slides for infinite scroll effect
  const displaySlides = [...finalSlides, ...finalSlides];

  return (
    <section
      className={`carousel ${carouselReady ? 'carousel-ready' : ''}`}
      aria-label="Fine-Art Photography Carousel"
      role="region"
      itemScope
      itemType="https://schema.org/ImageGallery"
    >
      {/* Wipe curtain - slides right to reveal carousel */}
      <div className="carousel-curtain" aria-hidden="true" />
      {showTrim && <div className="carousel-trim carousel-trim--top" aria-hidden="true" />}
      {showTrim && <div className="carousel-trim carousel-trim--bottom" aria-hidden="true" />}
      
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
            fallbackTitle: s.title,
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
                  loading={!isDuplicate ? "eager" : "lazy"}
                  itemProp="contentUrl"
                  onLoad={() => handleImageLoad(i)}
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
