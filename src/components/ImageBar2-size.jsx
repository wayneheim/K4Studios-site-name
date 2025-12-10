import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar3.css";

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

      const matchKey = Object.keys(allCarousels).find((key) =>
        key
          .replace("../data/Galleries", "/Galleries")
          .replace("../data/Other", "/Other")
          .replace("/carousel.ts", "") === currentPath
      );

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
        {displaySlides.map((s, i) => (
          <figure
            className="carousel-slide"
            key={`slide-${i}`}
            itemScope
            itemType="https://schema.org/ImageObject"
          >
            <a href={s.href} title={s.alt} aria-label={s.alt}>
              <img
                src={s.srcS || s.srcM || s.srcL || s.src}
                alt={s.alt}
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
        ))}
      </div>
    </section>
  );
}
