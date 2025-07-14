import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar2.css";

// Glob import: grabs all carousel slide data files from both Galleries and Other
// rename to cap
const allCarousels = import.meta.glob([
  "../data/Galleries/**/carousel.ts",
  "../data/Other/**/carousel.ts"
], { eager: true });

export default function ImageBar2({ slides }) {
  const trackRef = useRef(null);
  const [finalSlides, setFinalSlides] = useState(slides ?? []);

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

  // Second effect: duplicate slides for infinite scroll effect
  useEffect(() => {
    if (
      trackRef.current &&
      finalSlides.length > 0 &&
      trackRef.current.children.length === finalSlides.length
    ) {
      trackRef.current.innerHTML += trackRef.current.innerHTML;
    }
  }, [finalSlides]);

  if (!finalSlides.length) return null;

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
        {finalSlides.map((s, i) => (
          <figure
            className="carousel-slide"
            key={i}
            itemScope
            itemType="https://schema.org/ImageObject"
          >
            <a href={s.href} title={s.alt} aria-label={s.alt}>
              <img src={s.src} alt={s.alt} loading="lazy" itemProp="contentUrl" />
            </a>
            <figcaption itemProp="description">{s.description}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
