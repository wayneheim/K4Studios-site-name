import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar2.css";
import { slides as homeSlides } from "../data/home/carousel.ts";

export default function ImageBar2Home() {
  const trackRef = useRef(null);
  const [show, setShow] = useState(false);
  const [fullSize, setFullSize] = useState(false);

  useEffect(() => {
    if (
      trackRef.current &&
      homeSlides.length > 0 &&
      trackRef.current.children.length === homeSlides.length
    ) {
      // If you want seamless infinite scroll, it’s cleaner to render the array twice
      // instead of innerHTML duplication, but keeping your current approach for now:
      trackRef.current.innerHTML += trackRef.current.innerHTML;
    }

    const fadeTimer = setTimeout(() => setShow(true), 30);      // quick fade-in
    const scaleTimer = setTimeout(() => setFullSize(true), 1950); // scale after hero anim
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(scaleTimer);
    };
  }, []);

  if (!homeSlides.length) return null;

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
        {homeSlides.map((s, i) => {
          const isHero = i === 0; // first slide = LCP candidate
          // Optional fields from your data (use if present)
          const { srcSet, sizes, width, height, aspectRatio } = s;

          return (
            <figure
              className="carousel-slide"
              key={i}
              itemScope
              itemType="https://schema.org/ImageObject"
            >
              <a href={s.href} title={s.alt} aria-label={s.alt}>
                <img
                  src={s.src}
                  // If you have responsive sources, pass them through:
                  {...(srcSet ? { srcSet } : {})}
                  {...(sizes ? { sizes } : { sizes: "(min-width: 1024px) 900px, 90vw" })}
                  // LCP hero is eager + high priority; others lazy:
                  loading={isHero ? "eager" : "lazy"}
                  fetchpriority={isHero ? "high" : "auto"}
                  decoding="async"
                  alt={s.alt}
                  itemProp="contentUrl"
                  // Prevent CLS: prefer real width/height if you have them
                  {...(width && height
                    ? { width, height, style: { objectFit: "cover" } }
                    : { style: { aspectRatio: aspectRatio || "16 / 9", objectFit: "cover" } })}
                />
              </a>
              <figcaption itemProp="description">{s.description}</figcaption>
            </figure>
          );
        })}
      </div>

      {/* Keep your animation helpers */}
      <style jsx>{`
        .carousel-fade {
          margin-top: 5px;
          opacity: 0;
          transform: scale(0.85);
          transition:
            opacity 0.18s cubic-bezier(.33,1,.68,1),
            transform 1.82s cubic-bezier(.38,1,.74,.96) 2.5s;
          will-change: opacity, transform;
        }
        .carousel-fadein { opacity: 1; }
        .carousel-fullsize { transform: scale(1); }
        @media (max-width: 768px) {
          .carousel-fade { margin-top: -15px !important; }
        }
      `}</style>
    </section>
  );
}
