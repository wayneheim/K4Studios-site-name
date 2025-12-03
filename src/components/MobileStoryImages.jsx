import { useEffect } from "react";

export default function MobileStoryImages({ images = [] }) {
  useEffect(() => {
    if (window.innerWidth > 768) {
      console.log("MobileStoryImages: skipping on desktop");
      return;
    }

    const tryInsertImages = () => {
      const storyBlocks = document.querySelectorAll(".story-block");
      console.log("MobileStoryImages: Found story blocks →", storyBlocks.length);
      console.log("MobileStoryImages: Images passed in →", images.length);

      if (!storyBlocks.length || !images.length) {
        console.log("MobileStoryImages: Retrying in 300ms...");
        return setTimeout(tryInsertImages, 300);
      }

      let insertedCount = 0;

      storyBlocks.forEach((block, index) => {
        const h3 = block.querySelector("h3");
        if (!h3 || index === 0 || !images[insertedCount]) return;

        const match = images[insertedCount];
        insertedCount++;

        const container = document.createElement("div");
        container.className = "mobile-inline-img-wrapper mobile-only";

        const link = document.createElement("a");
        link.href = `${match.galleryPath || "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"}/i-${match.id?.replace(/^i-/, "")}`;
        link.style.display = "block";

        const img = document.createElement("img");
        img.src = match.src;
        img.alt = match.alt || "";
        img.className = "mobile-inline-img";

        const caption = document.createElement("div");
        caption.className = "mobile-caption";
        caption.textContent = match.title || "";

        link.appendChild(img);
        container.appendChild(link);
        container.appendChild(caption);

        console.log(`Inserting linked mobile image before <h3> in block[${index}]:`, match.src);
        h3.parentNode?.insertBefore(container, h3);
      });
    };

    tryInsertImages();
  }, [images]);

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
          border-radius: 8px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: block;
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
