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
      trackRef.current.innerHTML += trackRef.current.innerHTML;
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
      <style jsx>{`
        .carousel-fade {
        margin-top: 5px;
          opacity: 0;
          transform: scale(0.85);
          transition:
            opacity 0.18s cubic-bezier(.33,1,.68,1),
            transform 1.82s cubic-bezier(.38,1,.74,.96)2.5s;
          will-change: opacity, transform;
        }
        .carousel-fadein {
          opacity: 1;
        }
        .carousel-fullsize {
          transform: scale(1);
        }
      `}</style>
    </section>
  );
}
