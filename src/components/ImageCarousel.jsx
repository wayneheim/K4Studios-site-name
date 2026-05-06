import { useEffect, useRef, useState, useCallback } from "react";
import '../styles/ImageCarousel.css';
import { getSemanticImageUrl, extractImageId } from '../utils/imageProxy.js';

function getSlideImageSrc(slide) {
  const imageId = slide.id || extractImageId(slide.src);
  return imageId ? getSemanticImageUrl(imageId, {}, 's') : slide.src;
}

const slides = [
  {
    href: "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-fCG2nm8",
    id: "i-kHqNdGX",
    src: "/img/i-kHqNdGX/s.jpg",
    alt: "Three elder cowboys on bench in rustic painterly fine art photography",
    description:
      "A trio of aging cowboys on a bench, embodying the grit and character of the American West in painterly detail.",
  },
  {
    href: "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-qVZ9m7j",
    id: "i-pN7Hmfz",
    src: "/img/i-pN7Hmfz/s.jpg",
    alt: "Cowboy with shotgun guarding rustic church entrance in painterly Western art",
    description:
      "A lone cowboy stands sentinel with a shotgun at the doors of an old Western church, rendered in painterly tones.",
  },
  {
    href: "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-8BbMZjs",
    id: "i-WjRnQ6N",
    src: "/img/i-WjRnQ6N/s.jpg",
    alt: "Horseback cowboy in painterly fine art style staring across vast Western horizon",
    description:
      "A contemplative cowboy on horseback silhouetted in golden light—quiet drama captured in painterly style.",
  },
  {
    href: "https://www.k4studios.com/Other/K4-Select-Series/Engrained/Engrained-Series/i-xF7p92v",
    id: "i-QDL5jR7",
    src: "/img/i-QDL5jR7/s.jpg",
    alt: "Cowboy being shot and struck by lightning in stylized painterly Western scene",
    description:
      "Lightning, gunfire, and emotion converge in this surreal Western moment captured in fine art style.",
  },
  {
    href: "https://www.k4studios.com/Other/K4-Select-Series/Engrained/Engrained-Series/i-thTwwHZ",
    id: "i-5JksgQk",
    src: "/img/i-5JksgQk/s.jpg",
    alt: "Western cowboy holding rifle at rustic cabin window – Fine Art by K4 Studios",
    description:
      "A rustic moment of quiet tension—cowboy with rifle peers from weathered cabin in classic frontier mood.",
  },
];

export default function ImageCarousel() {
  const trackRef = useRef(null);
  // Duplicate slides for infinite scroll effect - done in React state, not DOM manipulation
  const [duplicated, setDuplicated] = useState(false);
  // Track loaded images for fade-in effect
  const [loadedImages, setLoadedImages] = useState({});

  const handleImageLoad = useCallback((index) => {
    setLoadedImages(prev => ({ ...prev, [index]: true }));
  }, []);

  useEffect(() => {
    // Mark as duplicated on client (this triggers re-render with doubled slides)
    setDuplicated(true);
  }, []);

  // Double the slides for infinite scroll effect (only after hydration)
  const displaySlides = duplicated ? [...slides, ...slides] : slides;

  return (
    <section
      className="carousel"
      aria-label="Fine Art Western Cowboy Photography Gallery by K4 Studios"
      role="region"
      itemScope
      itemType="https://schema.org/ImageGallery"
    >
      <meta
        itemProp="name"
        content="Painterly Fine Art Western Cowboy Photography Gallery"
      />
      <meta itemProp="creator" content="K4 Studios" />

      <div className="carousel-track" ref={trackRef}>
        {displaySlides.map((slide, i) => (
          <figure
            className="carousel-slide"
            key={`slide-${i}`}
            itemScope
            itemType="https://schema.org/ImageObject"
          >
            <a href={slide.href} title={slide.alt} aria-label={slide.alt}>
              <img
                src={getSlideImageSrc(slide)}
                alt={slide.alt}
                loading="lazy"
                itemProp="contentUrl"
                className={loadedImages[i] ? 'loaded' : ''}
                onLoad={() => handleImageLoad(i)}
              />
            </a>
            <figcaption itemProp="description">{slide.description}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
