import { useEffect, useRef } from "react";
import '../styles/ImageCarousel.css';

const slides = [
  {
    href: "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-fCG2nm8",
    src: "https://photos.smugmug.com/photos/i-kHqNdGX/0/KdMvPnPjV6jbRpns2t4KbsKWPh6558THX9Qp7X8Bf/S/i-kHqNdGX-S.jpg",
    alt: "Three elder cowboys on bench in rustic painterly fine art photography",
    description:
      "A trio of aging cowboys on a bench, embodying the grit and character of the American West in painterly detail.",
  },
  {
    href: "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-qVZ9m7j",
    src: "https://photos.smugmug.com/photos/i-pN7Hmfz/0/LQQKTRD3RDj9whfgr447gj8qxB5rW3D6XR3LLF63w/S/i-pN7Hmfz-S.jpg",
    alt: "Cowboy with shotgun guarding rustic church entrance in painterly Western art",
    description:
      "A lone cowboy stands sentinel with a shotgun at the doors of an old Western church, rendered in painterly tones.",
  },
  {
    href: "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-8BbMZjs",
    src: "https://photos.smugmug.com/photos/i-WjRnQ6N/0/KR3Wd5pF8hBdzpVmWNT8C3zqcXDtXFQ8BhFSLDKGR/S/i-WjRnQ6N-S.jpg",
    alt: "Horseback cowboy in painterly fine art style staring across vast Western horizon",
    description:
      "A contemplative cowboy on horseback silhouetted in golden light—quiet drama captured in painterly style.",
  },
  {
    href: "https://www.k4studios.com/Other/K4-Select-Series/Engrained/Engrained-Series/i-xF7p92v",
    src: "https://photos.smugmug.com/photos/i-QDL5jR7/0/LZN28Ck9MmMwNjzJvXH6gkpM7H4KpKXCB5NKqLmBB/S/i-QDL5jR7-S.jpg",
    alt: "Cowboy being shot and struck by lightning in stylized painterly Western scene",
    description:
      "Lightning, gunfire, and emotion converge in this surreal Western moment captured in fine art style.",
  },
  {
    href: "https://www.k4studios.com/Other/K4-Select-Series/Engrained/Engrained-Series/i-thTwwHZ",
    src: "https://photos.smugmug.com/photos/i-5JksgQk/0/LRrHbjGncpLW4WHHKsQjz95chSW3nxhsdMsMsQJD5/S/i-5JksgQk-S.jpg",
    alt: "Western cowboy holding rifle at rustic cabin window – Fine Art by K4 Studios",
    description:
      "A rustic moment of quiet tension—cowboy with rifle peers from weathered cabin in classic frontier mood.",
  },
];

export default function ImageCarousel() {
  const trackRef = useRef(null);

  useEffect(() => {
    if (trackRef.current) {
      const clone = trackRef.current.innerHTML;
      trackRef.current.innerHTML += clone;
    }
  }, []);

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
        {slides.map((slide, i) => (
          <figure
            className="carousel-slide"
            key={i}
            itemScope
            itemType="https://schema.org/ImageObject"
          >
            <a href={slide.href} title={slide.alt} aria-label={slide.alt}>
              <img
                src={slide.src}
                alt={slide.alt}
                loading="lazy"
                itemProp="contentUrl"
              />
            </a>
            <figcaption itemProp="description">{slide.description}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
