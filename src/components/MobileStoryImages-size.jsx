import { useEffect, useMemo } from "react";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getProxySrc = (id, size = "s") => `/img/${id}/${size}.jpg`;

// Fisher-Yates shuffle
const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * MobileStoryImages - Inline images for mobile with client-side rotation
 * 
 * Props:
 * - images: Full pool of available images (pass more than needed for variety)
 * - displayCount: Number of images to insert (default: based on story blocks)
 */
export default function MobileStoryImages({ images = [], displayCount }) {
  // Shuffle pool once on mount for this page load
  const shuffledImages = useMemo(() => shuffleArray(images), [images]);
  
  useEffect(() => {
    if (window.innerWidth > 768) {
      console.log("MobileStoryImages: skipping on desktop");
      return;
    }

    const tryInsertImages = () => {
      const storyBlocks = document.querySelectorAll(".story-block");
      console.log("MobileStoryImages: Found story blocks →", storyBlocks.length);
      console.log("MobileStoryImages: Shuffled images available →", shuffledImages.length);

      if (!storyBlocks.length || !shuffledImages.length) {
        console.log("MobileStoryImages: Retrying in 300ms...");
        return setTimeout(tryInsertImages, 300);
      }

      let insertedCount = 0;
      const maxToInsert = displayCount || shuffledImages.length;

      storyBlocks.forEach((block, index) => {
        const h3 = block.querySelector("h3");
        if (!h3 || index === 0 || insertedCount >= maxToInsert || !shuffledImages[insertedCount]) return;

        const match = shuffledImages[insertedCount];
        insertedCount++;

        const container = document.createElement("div");
        container.className = "mobile-inline-img-wrapper mobile-only";

        const link = document.createElement("a");
        link.href = `${match.galleryPath || "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"}/i-${match.id?.replace(/^i-/, "")}`;
        link.style.display = "block";

        const img = document.createElement("img");
        img.src = match.id ? getProxySrc(match.id, 's') : (match.srcS || match.srcM || match.srcL || match.src);
        img.alt = match.alt || "";
        img.className = "mobile-inline-img";
        img.width = 280;  // Explicit dimensions to prevent CLS
        img.height = 350; // Approximate aspect ratio for portrait images
        img.loading = "lazy";
        img.decoding = "async";

        const caption = document.createElement("div");
        caption.className = "mobile-caption";
        caption.textContent = match.title || "";

        link.appendChild(img);
        container.appendChild(link);
        container.appendChild(caption);

        console.log(`Inserting linked mobile image before <h3> in block[${index}]:`, match.id);
        h3.parentNode?.insertBefore(container, h3);
      });
    };

    tryInsertImages();
  }, [shuffledImages, displayCount]);

  return (
    <>
      <style jsx global>{`
        .mobile-inline-img-wrapper {
          text-align: center;
          margin: 1.75rem auto 2.25rem;
          max-width: 280px;
        }

        .mobile-inline-img {
          width: 100%;
          height: auto;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: block;
          contain: layout;
        }

        .mobile-inline-img:hover {
          transform: scale(1.025);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
        }

        .mobile-caption {
          font-family: 'Glegoo', serif;
          font-size: 0.95rem;
          color: #4c3a2e;
          margin-top: 0.5rem;
          padding: 0 0.25rem;
          line-height: 1.4;
          opacity: 0.95;
        }
      `}</style>
    </>
  );
}
