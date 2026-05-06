import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar3.css";
import { getSemanticImageUrl } from "../utils/imageProxy.js";

const getImageAltText = (slide) => {
  if (slide?.alt && String(slide.alt).trim()) return String(slide.alt).trim();
  if (slide?.title && String(slide.title).trim()) return String(slide.title).trim();
  if (slide?.description && String(slide.description).trim()) {
    return String(slide.description).replace(/\s+/g, " ").trim();
  }
  return "Fine art image by Wayne Heim";
};

const getGalleryPathFromImageHref = (href = "") => String(href || "").replace(/\/i-[a-zA-Z0-9-]+\/?$/, "");

function getCarouselSrc(slide) {
  if (slide?.id) {
    return getSemanticImageUrl(slide, { galleryPath: slide.galleryPath || getGalleryPathFromImageHref(slide.href) }, 'm');
  }

  return slide?.srcS || slide?.srcM || slide?.srcL || slide?.src || '';
}

// Glob import: grabs all carousel slide data files from both Galleries and Other
const allCarousels = import.meta.glob([
  "../data/Galleries/**/carousel.ts",
  "../data/Other/**/carousel.ts"
], { eager: true });

export default function ImageBar2({ slides }) {
  const trackRef = useRef(null);
  const [finalSlides, setFinalSlides] = useState(slides ?? []);
  // Duplicate slides for infinite scroll effect - done in React state, not DOM manipulation
  const [duplicated, setDuplicated] = useState(false);

  // First effect: match current path to a carousel file and load slides
  useEffect(() => {
    if (!slides || slides.length === 0) {
      const currentPath = window.location.pathname;
      // Case-insensitive match to handle Linux (case-sensitive) vs Windows (case-insensitive)
      const currentPathLower = currentPath.toLowerCase().replace(/\/$/, "");

      const matchKey = Object.keys(allCarousels).find((key) => {
        const keyPath = key
          .replace("../data/Galleries", "/Galleries")
          .replace("../data/Other", "/Other")
          .replace("/carousel.ts", "")
          .toLowerCase();
        return keyPath === currentPathLower;
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
          const imageAlt = getImageAltText(s);
          return (
          <figure
            className="carousel-slide"
            key={`slide-${i}`}
            itemScope
            itemType="https://schema.org/ImageObject"
          >
            <a href={s.href} title={imageAlt} aria-label={imageAlt}>
              <img
                src={getCarouselSrc(s)}
                alt={imageAlt}
                // Use fetchpriority for first image, loading="lazy" for the rest
                {...(typeof s.fetchpriority === "string"
                  ? { fetchpriority: s.fetchpriority }
                  : i === 0
                  ? { fetchpriority: "high" }
                  : {})}
                {...(typeof s.loading === "string"
                  ? { loading: s.loading }
                  : i !== 0
                  ? { loading: "lazy" }
                  : {})}
                itemProp="contentUrl"
                style={{ height: '390px', minHeight: '390px', width: 'auto', display: 'block' }}
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
