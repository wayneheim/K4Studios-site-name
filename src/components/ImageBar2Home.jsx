import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar2.css";
import { slides as homeSlides } from "../data/home/carousel.ts";

export default function ImageBar2Home() {
  const trackRef = useRef(null);
  const [show, setShow] = useState(false);
  const [fullSize, setFullSize] = useState(false);
  // Duplicate slides for infinite scroll effect - done in React state, not DOM manipulation
  const [duplicated, setDuplicated] = useState(false);

  useEffect(() => {
    // Mark as duplicated on client (this triggers re-render with doubled slides)
    if (homeSlides.length > 0) {
      setDuplicated(true);
    }

    // Appear *almost instantly* (30ms after mount)
    const fadeTimer = setTimeout(() => setShow(true), 30);

    // Scale up after hero animation is done
    const scaleTimer = setTimeout(() => setFullSize(true), 1950); // adjust as needed

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(scaleTimer);
    };
  }, []);

  if (!homeSlides.length) return null;

  // Double the slides for infinite scroll effect (only after hydration)
  const displaySlides = duplicated ? [...homeSlides, ...homeSlides] : homeSlides;

  return (
    <section
      className={
        "carousel carousel-fade" +
        (show ? " carousel-fadein" : "") +
        (fullSize ? " carousel-fullsize" : "")
      }
      aria-label="Fine-Art Photography Carousel"
      role="region"
      itemScope
      itemType="https://schema.org/ImageGallery"
    >
      <meta itemProp="name" content="Fine Art Gallery Carousel" />
      <meta itemProp="creator" content="K4 Studios" />
      <div className="carousel-track" ref={trackRef}>
        {displaySlides.map((s, i) => {
          const isDuplicate = duplicated && i >= homeSlides.length;
          return (
          <figure
            className="carousel-slide"
            key={`slide-${i}`}
            itemScope
            itemType="https://schema.org/ImageObject"
            aria-hidden={isDuplicate ? "true" : undefined}
          >
            <a href={s.href} title={isDuplicate ? undefined : s.alt} aria-label={isDuplicate ? undefined : s.alt} tabIndex={isDuplicate ? -1 : undefined}>
              <img
                src={s.srcS || s.src || s.srcM || s.srcL}
                alt={isDuplicate ? "" : s.alt}
                itemProp="contentUrl"
                loading={s.loading}
                fetchpriority={s.fetchpriority}
                width={s.width}
                height={s.height}
                decoding={s.loading === 'lazy' ? 'async' : 'auto'}
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
