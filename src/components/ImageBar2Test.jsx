import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar2.css";

export default function ImageBar2Test({ slides: homeSlides = [] }) {
  const trackRef = useRef(null);
  const [show, setShow] = useState(false);
  const [fullSize, setFullSize] = useState(false);
  const [duplicated, setDuplicated] = useState(false);

  useEffect(() => {
    if (homeSlides.length > 0) {
      setDuplicated(true);
    }
    const fadeTimer = setTimeout(() => setShow(true), 30);
    const scaleTimer = setTimeout(() => setFullSize(true), 1950);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(scaleTimer);
    };
  }, []);

  if (!homeSlides.length) return null;

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
    >
      <div className="carousel-track" ref={trackRef}>
        {displaySlides.map((s, i) => (
          <figure className="carousel-slide" key={`slide-${i}`}>
            <a href={s.href} title={s.alt} aria-label={s.alt}>
              <img
                src={s.srcS || s.src}
                alt={s.alt}
                loading={s.loading}
                fetchpriority={s.fetchpriority}
              />
            </a>
            <figcaption>{s.description}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
