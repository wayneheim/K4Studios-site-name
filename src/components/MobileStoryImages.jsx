import { useEffect } from "react";
import "../styles/MobileStoryImages.css";

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

  return null;
}
