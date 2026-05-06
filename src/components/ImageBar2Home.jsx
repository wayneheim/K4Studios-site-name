import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar2.css";
import { slides as homeSlides } from "../data/home/carousel.ts";
import { warmImage } from "../utils/warmImage";
import { getSemanticImageUrl } from "../utils/imageProxy.js";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getGalleryPathFromImageHref = (href = "") => String(href || "").replace(/\/i-[a-zA-Z0-9-]+\/?$/, "");
const getHomeImageSrc = (slide, size = "s") =>
  slide?.id ? getSemanticImageUrl(slide, { galleryPath: slide.galleryPath || getGalleryPathFromImageHref(slide.href) }, size) : "";

const getImageAltText = (slide) => {
  if (slide?.alt && String(slide.alt).trim()) return String(slide.alt).trim();
  if (slide?.title && String(slide.title).trim()) return String(slide.title).trim();
  if (slide?.description && String(slide.description).trim()) {
    return String(slide.description).replace(/\s+/g, " ").trim();
  }
  return "Fine art image by Wayne Heim";
};

export default function ImageBar2Home() {
  const trackRef = useRef(null);
  const [show, setShow] = useState(false);
  const [fullSize, setFullSize] = useState(false);
  // Duplicate slides for infinite scroll effect - done in React state, not DOM manipulation
  const [duplicated, setDuplicated] = useState(false);

  useEffect(() => {
    // Warm first 4 carousel images (3 visible on load + 1 buffer)
    // Rest load naturally as page hydrates
    homeSlides.slice(0, 4).forEach(slide => {
      if (slide.id) warmImage(slide.id, 's');
    });

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
          const imageAlt = getImageAltText(s);
          return (
          <figure
            className="carousel-slide"
            key={`slide-${i}`}
            itemScope
            itemType="https://schema.org/ImageObject"
            aria-hidden={isDuplicate ? "true" : undefined}
          >
            <a href={s.href} title={isDuplicate ? undefined : imageAlt} aria-label={isDuplicate ? undefined : imageAlt} tabIndex={isDuplicate ? -1 : undefined}>
              <img
                src={s.id ? getHomeImageSrc(s, 's') : (s.srcS || s.src)}
                alt={isDuplicate ? "" : imageAlt}
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
