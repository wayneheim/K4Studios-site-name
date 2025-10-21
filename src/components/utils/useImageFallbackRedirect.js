import { useEffect } from "react";

// USAGE: useImageFallbackRedirect(galleryData);
export function useImageFallbackRedirect(galleryData) {
  useEffect(() => {
    if (typeof window === "undefined" || !Array.isArray(galleryData)) return;
    const path = window.location.pathname;
    // Detect if we’re on an image page (ends with /i-xxxxxx)
    const match = path.match(/\/(i-[a-zA-Z0-9_-]+)$/);
    if (!match) return; // Not an image page, do nothing

    const imageId = match[1];
    const found = galleryData.some((e) => e.id === imageId);
    if (!found) {
      // Not in galleryData: fallback to parent (strip /i-xxx)
      const parentUrl = path.replace(/\/i-[^/]+$/, '');
      window.location.replace(parentUrl);
    }
  }, [galleryData]);
}