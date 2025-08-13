import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

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

  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={hasMounted ? handleLike : undefined}
      className={`transition duration-300 flex items-center justify-center focus:outline-none group`}
      aria-label={liked ? "Unlike this image" : "Like this image"}
      type="button"
      style={{
        lineHeight: 0,
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#fff",
        padding: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
      title="Like This Image"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Heart
        size={22}
        strokeWidth={2.2}
        color={liked ? "#dc2626" : hovered ? "#dc2626" : "#9ca3af"}
        fill={liked ? "#dc2626" : "none"}
        style={{
          transition: "all 0.2s",
          stroke: liked ? "#dc2626" : hovered ? "#dc2626" : "#9ca3af",
        }}
        className={
          liked
            ? "heart-liked"
            : "heart-unliked"
        }
      />
      {/* Tooltip text on hover */}
      <span
        className="absolute left-1/2 top-full -translate-x-1/2 mt-1 px-2 py-1 text-xs bg-white text-gray-700 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none transition"
        style={{ whiteSpace: "nowrap", zIndex: 10 }}
      >
        Like This Image
      </span>
    </button>
  );
}
