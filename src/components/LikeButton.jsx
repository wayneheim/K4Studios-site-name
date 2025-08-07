import { useEffect, useState } from "react";

export default function LikeButton({ imageId, pageTitle }) {
  const [liked, setLiked] = useState(false);
  const [initiallyLiked, setInitiallyLiked] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    try {
      const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
      if (likedImages.includes(imageId)) {
        setLiked(true);
        setInitiallyLiked(true);
      }
    } catch {}
  }, [imageId]);

  const toggleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);

    try {
      const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
      let updatedImages;

      if (newLiked) {
        updatedImages = [...new Set([...likedImages, imageId])];
      } else {
        updatedImages = likedImages.filter((id) => id !== imageId);
      }

      localStorage.setItem("k4-liked-images", JSON.stringify(updatedImages));
    } catch (e) {
      console.error("Error updating localStorage", e);
    }

    if (newLiked && !initiallyLiked) {
      fetch("/.netlify/functions/image-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId,
          page: window.location.pathname,
          title: pageTitle || document.title,
          timestamp: Date.now(),
        }),
      }).catch((err) => console.error("Like send error:", err));
    }
  };

  return (
    <button
      onClick={hasMounted ? toggleLike : undefined}
      className={`text-xl transition duration-300 ${
        liked ? "text-red-600" : "text-gray-400 hover:text-red-500"
      }`}
      aria-label={liked ? "Unlike this image" : "Like this image"}
    >
      {hasMounted ? (liked ? "❤️" : "🤍") : "🤍"}
    </button>
  );
}
