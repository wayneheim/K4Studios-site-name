import { useState, useEffect } from "react";

export default function LikeButton({ imageId, pageTitle }) {
  const [liked, setLiked] = useState(false);
  const [initiallyLiked, setInitiallyLiked] = useState(false);

  // On mount: check localStorage to set initial like state
  useEffect(() => {
    try {
      const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
      if (likedImages.includes(imageId)) {
        setLiked(true);
        setInitiallyLiked(true);
      }
    } catch {
      // ignore
    }
  }, [imageId]);

  // On page unload: only log if like state changed
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (liked && !initiallyLiked) {
        try {
          const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
          likedImages.push(imageId);
          localStorage.setItem("k4-liked-images", JSON.stringify([...new Set(likedImages)]));
        } catch {}

        try {
          await fetch("/.netlify/functions/image-like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageId,
              page: window.location.pathname,
              title: pageTitle || document.title,
              timestamp: Date.now(),
            }),
            keepalive: true, // ensure it sends during unload
          });
        } catch (err) {
          console.error("Like logging failed:", err);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [liked, initiallyLiked, imageId, pageTitle]);

  // Toggle like on click
  const toggleLike = () => setLiked((prev) => !prev);

  return (
    <button
      onClick={toggleLike}
      className={`text-xl transition duration-300 ${
        liked ? "text-red-600" : "text-gray-400 hover:text-red-500"
      }`}
      aria-label={liked ? "Unlike this image" : "Like this image"}
    >
      {liked ? "❤️" : "🤍"}
    </button>
  );
}
