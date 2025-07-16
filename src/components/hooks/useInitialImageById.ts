import { useEffect } from "react";

export function useInitialImageById(
  galleryData: any[],
  setCurrentIndex: (index: number) => void,
  setHasEnteredChapters?: (val: boolean) => void
) {
  useEffect(() => {
    if (!galleryData || galleryData.length === 0) return;

    const match = window.location.pathname.match(/\/(i-[\w-]+)\/?$/);
    const idFromURL = match?.[1];

    if (idFromURL) {
      const index = galleryData.findIndex((entry) => entry.id === idFromURL);
      if (index !== -1) {
        console.log("📸 Matched image ID from URL:", idFromURL, "→ index", index);
        setCurrentIndex(index);
        if (setHasEnteredChapters) setHasEnteredChapters(true);
      } else {
        console.warn("⚠️ ID from URL not found in galleryData:", idFromURL);
      }
    }
  }, [galleryData]);
}
