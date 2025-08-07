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
    } catch (err) {
      console.error("Failed to parse liked images from localStorage:", err);
    }
  }, [imageId]);

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);

    try {
      const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
      const updatedImages = newLiked
        ? [...new Set([...likedImages, imageId])]
        : likedImages.filter((id) => id !== imageId);

      localStorage.setItem("k4-liked-images", JSON.stringify(updatedImages));
    } catch (err) {
      console.error("Error updating localStorage:", err);
    }

    // Fire Netlify notification only once per user
    if (newLiked && !initiallyLiked) {
      try {
        const res = await fetch("/.netlify/functions/image-like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageId,
            page: window.location.pathname,
            title: pageTitle || document.title,
            timestamp: Date.now(),
          }),
        });

        if (!res.ok) {
          console.error("Like notification failed:", await res.text());
        } else {
          console.log("Like notification sent!");
        }
      } catch (err) {
        console.error("Like send error:", err);
      }
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
