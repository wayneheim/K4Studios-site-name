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

  useEffect(() => {
    if (!hasMounted) return;

    const handleBeforeUnload = () => {
      if (liked && !initiallyLiked) {
        try {
          const likedImages = JSON.parse(localStorage.getItem("k4-liked-images") || "[]");
          likedImages.push(imageId);
          localStorage.setItem("k4-liked-images", JSON.stringify([...new Set(likedImages)]));
        } catch {}

        navigator.sendBeacon?.("/.netlify/functions/image-like", JSON.stringify({
          imageId,
          page: window.location.pathname,
          title: pageTitle || document.title,
          timestamp: Date.now(),
        }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasMounted, liked, initiallyLiked, imageId, pageTitle]);

  const toggleLike = () => setLiked((prev) => !prev);

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
