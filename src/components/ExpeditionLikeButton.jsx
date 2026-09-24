import { useEffect, useState } from "react";
import LikeButton from "@/components/LikeButton.jsx";

const IMAGE_CHANGE_EVENT = "k4:expedition-image-change";

export default function ExpeditionLikeButton({ images = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const dialog = document.querySelector("[data-lightbox]");
    const initialIndex = Number(dialog?.dataset.activeImageIndex || 0);
    if (Number.isInteger(initialIndex) && initialIndex >= 0 && initialIndex < images.length) {
      setActiveIndex(initialIndex);
    }

    const handleImageChange = (event) => {
      const nextIndex = Number(event.detail?.index);
      if (Number.isInteger(nextIndex) && nextIndex >= 0 && nextIndex < images.length) {
        setActiveIndex(nextIndex);
      }
    };

    window.addEventListener(IMAGE_CHANGE_EVENT, handleImageChange);
    return () => window.removeEventListener(IMAGE_CHANGE_EVENT, handleImageChange);
  }, [images.length]);

  const activeImage = images[activeIndex];
  if (!activeImage) return null;

  return (
    <div
      className="expedition-like-control"
      data-expedition-like
      data-image-id={activeImage.imageId}
    >
      <div className="expedition-like-button-shell" data-like-btn>
        <LikeButton
          key={activeImage.imageId}
          imageId={activeImage.imageId}
          pageTitle={activeImage.pageTitle}
        />
      </div>
      <span>Like this image</span>
    </div>
  );
}
