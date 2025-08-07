import { useEffect, useState } from "react";

export default function LikeButton({ imageId, pageTitle }) {
  const [liked, setLiked] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    try {
      const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
      setLiked(likedImages.includes(imageId));
    } catch (err) {
      console.error("Failed to parse liked images from localStorage:", err);
    }
  }, [imageId]);

  const handleLike = async () => {
    // Track two lists: likedImages (UI), likedNotified (permanent, never notify again)
    const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
    const likedNotified = JSON.parse(localStorage.getItem("k4-liked-notified") || "[]");

    const isLiked = likedImages.includes(imageId);
    const isNotified = likedNotified.includes(imageId);

    if (!isLiked) {
      // Liking (turn ON)
      setLiked(true);
      localStorage.setItem("k4-liked-images", JSON.stringify([...likedImages, imageId]));

      // Only notify if never notified before
      if (!isNotified) {
        localStorage.setItem("k4-liked-notified", JSON.stringify([...likedNotified, imageId]));
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
          }
        } catch (err) {
          console.error("Like send error:", err);
        }
      }
    } else {
      // Unliking (turn OFF, remove from UI, don't touch notified list)
      setLiked(false);
      const updatedImages = likedImages.filter((id) => id !== imageId);
      localStorage.setItem("k4-liked-images", JSON.stringify(updatedImages));
    }
  };

  return (
    <button
      onClick={hasMounted ? handleLike : undefined}
      className={`text-xl transition duration-300 ${
        liked ? "text-red-600" : "text-gray-400 hover:text-red-500"
      }`}
      aria-label={liked ? "Unlike this image" : "Like this image"}
      type="button"
    >
      {hasMounted ? (liked ? "❤️" : "🤍") : "🤍"}
    </button>
  );
}
