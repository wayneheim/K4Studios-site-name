import { useEffect, useRef, useState, useMemo } from "react";
import "../styles/ImageBar2.css";
import { slides as homeSlides } from "../data/home/carousel.ts";

const FADE_IN_DELAY_MS = 120;    // was 30 — slow it slightly
const SCALE_UP_DELAY_MS = 2500;  // was 1950 — match your earlier cinematic timing

export default function ImageBar2Home() {
  const trackRef = useRef(null);
  const [show, setShow] = useState(false);
  const [fullSize, setFullSize] = useState(false);

  // Render the sequence twice for seamless loop — keeps everything in React
  const doubledSlides = useMemo(() => [...homeSlides, ...homeSlides], []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setShow(true), FADE_IN_DELAY_MS);
    const scaleTimer = setTimeout(() => setFullSize(true), SCALE_UP_DELAY_MS);
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
        {doubledSlides.map((s, i) => {
          // Only the *first real slide* should be LCP/eager.
          const isHero = i === 0;
          const { srcSet, sizes, width, height } = s;

          return (
            <figure
              className="carousel-slide"
              key={`${s.href || s.src}-${i}`}
              itemScope
              itemType="https://schema.org/ImageObject"
            >
              <a href={s.href} title={s.alt} aria-label={s.alt}>
                <img
                  src={s.src}
                  {...(srcSet ? { srcSet } : {})}
                  {...(sizes ? { sizes } : { sizes: "(min-width: 1024px) 900px, 90vw" })}
                  loading={isHero ? "eager" : "lazy"}
                  fetchpriority={isHero ? "high" : "auto"}
                  decoding="async"
                  alt={s.alt}
                  itemProp="contentUrl"
                  // Prefer real dimensions if you have them; otherwise let the image
                  // maintain natural aspect ratio with width:100% / height:auto.
                  {...(width && height ? { width, height } : {})}
                  className="carousel-img"
                />
              </a>
              {s.description ? (
                <figcaption itemProp="description">{s.description}</figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>

      <style jsx>{`
        .carousel-fade {
          margin-top: 5px;
          opacity: 0;
          transform: scale(0.85);
          transition:
            opacity 0.35s cubic-bezier(.33,1,.68,1),
            transform 1.82s cubic-bezier(.38,1,.74,.96) 2.5s; /* keep the 2.5s delay */
          will-change: opacity, transform;
        }
        .carousel-fadein { opacity: 1; }
        .carousel-fullsize { transform: scale(1); }

        /* Ensure images are NOT zoomed/cropped by default */
        .carousel-img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain; /* was 'cover' — this avoids crop/zoom */
        }

        /* If your slide container enforces a fixed height somewhere in CSS,
           consider removing it or switching to min-height so images can size naturally. */

        @media (max-width: 768px) {
          .carousel-fade { margin-top: -15px !important; }
        }
      `}</style>
    </section>
  );
}
