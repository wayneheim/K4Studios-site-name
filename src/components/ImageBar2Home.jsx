import { useEffect, useRef } from "react";
import "../styles/ImageBar2.css";
import { slides as homeSlides } from "../data/home/carousel.ts";

export default function ImageBar2Home() {
  const trackRef = useRef(null);

  // Duplicate slides for infinite scroll effect
  useEffect(() => {
    if (
      trackRef.current &&
      homeSlides.length > 0 &&
      trackRef.current.children.length === homeSlides.length
    ) {
      trackRef.current.innerHTML += trackRef.current.innerHTML;
    }
  }, []);

  if (!homeSlides.length) return null;

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
        {homeSlides.map((s, i) => (
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
