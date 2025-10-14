import { useEffect } from "react";

// Global component to clear gallery tour skip flags when leaving gallery pages
export default function GalleryTourSkipClearer() {
  useEffect(() => {
    // Patch history once globally
    if (typeof window === "undefined") return;
    if (window.__k4PatchedHistory) return;
    window.__k4PatchedHistory = true;

    const fire = () => window.dispatchEvent(new Event("k4:urlchange"));
    const _push = history.pushState;
    const _replace = history.replaceState;

    history.pushState = function (...args) { const r = _push.apply(this, args); fire(); return r; };
    history.replaceState = function (...args) { const r = _replace.apply(this, args); fire(); return r; };
    window.addEventListener("popstate", fire);

    return () => window.removeEventListener("popstate", fire);
  }, []);

  useEffect(() => {
    const clearSkipIfNotGallery = () => {
      const isOnGalleryPage = /\/i-[a-zA-Z0-9_-]+$/i.test(window.location.pathname);

      if (!isOnGalleryPage) {
        // Clear global tour skip flag when not on any gallery page
        sessionStorage.removeItem("k4-tour-skipped");
        
        // Also clear legacy section-specific flags for cleanup
        const keys = Object.keys(sessionStorage).filter(key => key.startsWith('k4-tour-skip:'));
        keys.forEach(key => sessionStorage.removeItem(key));
      }
    };

    // Clear on mount/initial load
    clearSkipIfNotGallery();

    // Listen for URL changes
    window.addEventListener("k4:urlchange", clearSkipIfNotGallery);
    return () => window.removeEventListener("k4:urlchange", clearSkipIfNotGallery);
  }, []);

  // This component doesn't render anything
  return null;
}