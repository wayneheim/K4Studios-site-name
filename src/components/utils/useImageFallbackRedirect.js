import { useEffect } from "react";

// Universal image page fallback: If /i-xxxx not in galleryData, send to parent.
export function useImageFallbackRedirect(galleryData) {
  useEffect(() => {
    if (typeof window === "undefined" || !Array.isArray(galleryData)) return;
    const path = window.location.pathname;
    const match = path.match(/\/(i-[a-zA-Z0-9_-]+)$/);
    if (!match) return; // Not an image detail page, do nothing

    // Merchant Center's -sketch URL is a presentation variant of the same image.
    const imageId = match[1].replace(/-sketch$/i, '');
    // Case-insensitive comparison to handle URL case variations
    const imageIdLower = imageId.toLowerCase();
    const found = galleryData.some((e) => e && e.id && e.id.toLowerCase() === imageIdLower);
    if (!found) {
      // Not found: fallback to parent gallery
      const parentUrl = path.replace(/\/i-[^/]+$/, '');
      window.location.replace(parentUrl);
    }
  }, [galleryData]);
}
