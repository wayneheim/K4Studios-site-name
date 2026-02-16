import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import "../styles/galleryinfo.css";
import ThemeBlock from "./ThemeBlock.jsx";
import { themes } from "@/data/themes/themes.mjs";
import { warmImage } from "../utils/warmImage";
import { getProxySrc } from "../utils/imageProxy";
import { trackEvent } from "../utils/analytics";

/* ---------------------------------------------------------
   Check if gallery has matching themes
--------------------------------------------------------- */
function hasThemesForGallery(galleryKey) {
  if (!galleryKey) return false;
  return themes.some((t) => {
    if (t.visible === false) return false;
    if (!t.dataset) return false;
    const normalizedDataset = t.dataset
      .toLowerCase()
      .replace(/\\/g, "/")
      .replace(/^src\/data\/galleries\//i, "")
      .replace(/\.mjs$/i, "");
    const normalizedKey = galleryKey
      .toLowerCase()
      .replace(/\\/g, "/")
      .replace(/^\/galleries\//i, "")
      .replace(/\/$/, "");
    return normalizedDataset.includes(normalizedKey) || normalizedKey.includes(normalizedDataset);
  });
}

/* ---------------------------------------------------------
   Glob all gallery data files
--------------------------------------------------------- */
const dataModules = import.meta.glob(
  "/src/data/Galleries/**/*.mjs",
  { eager: true }
);
const dataModulesOther = import.meta.glob(
  "/src/data/Other/**/*.mjs",
  { eager: true }
);
const allModules = { ...dataModules, ...dataModulesOther };

// Build a lowercase→original key map for case-insensitive lookup
const moduleKeyMap = {};
Object.keys(allModules).forEach(key => {
  moduleKeyMap[key.toLowerCase()] = key;
});

/* ---------------------------------------------------------
   Case-insensitive module lookup helper
--------------------------------------------------------- */
function findModuleKey(possibleKey) {
  // Try exact match first
  if (allModules[possibleKey]) return possibleKey;
  // Try case-insensitive match
  const lowerKey = possibleKey.toLowerCase();
  return moduleKeyMap[lowerKey] || null;
}

/* ---------------------------------------------------------
   Loader with fallback (flat + nested)
--------------------------------------------------------- */
function loadGalleryDataFor(baseHref) {
  if (!baseHref) return [];

  const normalized = baseHref.replace(/\/$/, "");
  const last = normalized.split("/").pop();

  let possibleKeys = [];

  if (normalized.toLowerCase().includes("/engrained/")) {
    // Engrained → direct file
    possibleKeys.push(`/src/data${normalized}.mjs`);
  } else if (last.toLowerCase() === "gallery") {
    // By-Location → /Gallery.mjs
    possibleKeys.push(`/src/data${normalized}.mjs`);
  } else {
    // Try flat file first (…/Color.mjs, …/Portraits.mjs, etc.)
    possibleKeys.push(`/src/data${normalized}.mjs`);
    // Then try nested file (…/Black-White/Black-White.mjs, …/Mountains/Mountains.mjs, etc.)
    possibleKeys.push(`/src/data${normalized}/${last}.mjs`);
    // Also try By-Location pattern: …/West → …/West/Gallery.mjs
    possibleKeys.push(`/src/data${normalized}/Gallery.mjs`);
  }

  for (const key of possibleKeys) {
    const actualKey = findModuleKey(key);
    if (actualKey) {
      console.log("✅ GalleryInfo loaded:", actualKey);
      const mod = allModules[actualKey];
      return mod.galleryData || mod.default || [];
    }
  }

  console.warn("⚠️ GalleryInfo: no data module found for", possibleKeys);
  return [];
}

/* ---------------------------------------------------------
   Pick first valid image
--------------------------------------------------------- */
function pickFirstRealImage(arr) {
  return (arr || [])
    .filter(
      (img) =>
        img &&
        img.id &&
        img.id !== "i-k4studios" &&
        (img.sortOrder ?? 0) !== -1 &&
        img.visibility !== "ghost"
    )
    .sort(
      (a, b) =>
        (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity)
    )[0];
}

/* ---------------------------------------------------------
   Component
--------------------------------------------------------- */
export default function GalleryInfo({
  entranceData,
  galleryKey = "",
  path = "",
  isLandingPage = false,
}) {
  // Use state for browser-only values to avoid hydration mismatch
  const [clientPath, setClientPath] = useState("");
  
  useEffect(() => {
    if (!path && !entranceData?.galleryPath && !galleryKey) {
      setClientPath(window.location.pathname);
    }
  }, [path, entranceData?.galleryPath, galleryKey]);
  
  // galleryKey takes precedence (new architecture - passed as serializable string)
  // Then explicit path, then entranceData.galleryPath, then URL fallback (legacy)
  const baseHref = galleryKey || path || entranceData?.galleryPath || clientPath;
  const trimmedBase = baseHref.replace(/\/$/, "");

  // Resolve gallery data from the key using allModules (client-safe)
  // galleryKey is a string that survives Astro→React serialization
  const galleryData = loadGalleryDataFor(trimmedBase);
  const lowestSortImage = pickFirstRealImage(galleryData);

  // Pick a random hero image from the gallery pool (excluding ghosts)
  // This rotates on each page load, like the preview strip
  const heroImage = useMemo(() => {
    const pool = (galleryData || []).filter(
      img => img?.id && img.id !== "i-k4studios" && img.visibility !== "ghost"
    );
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [galleryData]);

  // "Explore the Gallery" always goes to first image in gallery
  const exploreHref =
    lowestSortImage?.id && trimmedBase
      ? `${trimmedBase}/${lowestSortImage.id}`
      : "#";
  
  // Hero image click goes to that specific image
  const heroImageHref =
    heroImage?.id && trimmedBase
      ? `${trimmedBase}/${heroImage.id}`
      : exploreHref;

  // Track hero image loaded state for graceful fade-in
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Reset loaded state when hero image changes
  useEffect(() => {
    setHeroLoaded(false);
  }, [heroImage?.id]);

  // Warm clickable images on landing page at 'l' size
  // - Hero image (random from pool)
  // - First image (for "Explore the Gallery" click)
  // - Preview strip images (first 6)
  useEffect(() => {
    // Warm the hero image
    if (heroImage?.id) {
      warmImage(heroImage.id, 'l');
    }
    
    // Warm first image for "Explore the Gallery"
    if (lowestSortImage?.id) {
      warmImage(lowestSortImage.id, 'l');
    }
    
    // Warm preview strip (first 6) at 'l' for direct clicks
    if (galleryData?.length) {
      galleryData.slice(0, 6).forEach(img => {
        if (img?.id) warmImage(img.id, 'l');
      });
    }
  }, [heroImage?.id, lowestSortImage?.id, galleryData?.length]);

  // Background warm sister gallery (Color ↔ Black-White)
  useEffect(() => {
    if (typeof window === 'undefined' || !trimmedBase) return;
    
    let sisterPath = null;
    if (trimmedBase.includes('/Color')) {
      sisterPath = trimmedBase.replace('/Color', '/Black-White');
    } else if (trimmedBase.includes('/Black-White')) {
      sisterPath = trimmedBase.replace('/Black-White', '/Color');
    }
    
    if (!sisterPath) return;
    
    const warmSisterGallery = async () => {
      try {
        const res = await fetch('/galleryPrefetchMap.json');
        if (!res.ok) return;
        const prefetchMap = await res.json();
        const sisterImages = prefetchMap[sisterPath];
        
        if (sisterImages?.length) {
          // Warm first 6 images at 'l' for seamless gallery switch
          sisterImages.slice(0, 6).forEach(imgId => {
            warmImage(imgId, 'l');
          });
        }
      } catch {
        // Silent fail - optimization only
      }
    };
    
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(warmSisterGallery, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(warmSisterGallery, 500);
      return () => clearTimeout(timer);
    }
  }, [trimmedBase]);

  return (
    <>
      <section
        className="intro-wrapper"
        style={{ zIndex: 50, position: "relative" }}
      >
        <motion.div
          className="intro-text"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0 }}
        >
          <div
            className="gallery-intro-description"
              dangerouslySetInnerHTML={{
                __html: entranceData?.description || lowestSortImage?.story || "",
              }}
          />
          {!!entranceData?.details && (
            <details>
              <summary>
                <span className="arrow-icon">▶</span> More
                about this gallery
              </summary>
              <div 
                className="mt-2 text-base"
                dangerouslySetInnerHTML={{ __html: entranceData.details }}
              />
            </details>
          )}
        </motion.div>

        <motion.div
          className="intro-image"
          style={{ zIndex: 50, position: "relative", overflow: "visible" }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 1.2,
            ease: [0.33, 1, 0.68, 1],
          }}
        >
          {/* Mobile: Image with accordion ThemeBlock below */}
          <div className="mobile-image-section">
            {heroImage && (
              <a
                href={heroImageHref}
                className="mobile-sample-image"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  cursor: 'pointer'
                }}
                aria-label="Explore the gallery"
                onClick={() => trackEvent("gallery_hero_click")}
              >
                <figure style={{ position: 'relative', minHeight: '200px' }}>
                  {/* Placeholder skeleton while loading */}
                  {!heroLoaded && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d5 100%)',
                        borderRadius: '9px',
                        animation: 'heroShimmer 1.5s ease-in-out infinite',
                      }}
                    />
                  )}
                  <img
                    src={getProxySrc(heroImage.id, 'l')}
                    alt={heroImage.alt || heroImage.title || "Gallery preview"}
                    onLoad={() => setHeroLoaded(true)}
                    style={{
                      maxWidth: "100%",
                      borderRadius: "9px",
                      boxShadow: "0 8px 32px #0002",
                      border: "2px solid #ddd",
                      opacity: heroLoaded ? 1 : 0,
                      transition: 'opacity 0.5s ease-in-out',
                    }}
                  />
                  <figcaption>{heroImage.title || ""}</figcaption>
                </figure>
              </a>
            )}
            {/* Mobile: Accordion-style ThemeBlock - only show if themes exist */}
            {hasThemesForGallery(trimmedBase) && (
              <details className="mobile-themes-accordion">
                <summary>
                  <span className="accordion-arrow">▼</span> Featured Themes
                </summary>
                <div className="themes-content">
                  <ThemeBlock galleryKey={trimmedBase} galleryData={galleryData} />
                </div>
              </details>
            )}
          </div>

          {/* Desktop: Image first, then ThemeBlock below */}
          {heroImage && (
            <a
              href={heroImageHref}
              className="desktop-sample-image"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                cursor: 'pointer',
                marginBottom: '0.75rem'
              }}
              aria-label="View this image"
              onClick={() => trackEvent("gallery_hero_click")}
              onMouseEnter={() => {
                // Trigger glow effect on explore button
                const exploreButton = document.querySelector('.explore-section');
                if (exploreButton) {
                  exploreButton.classList.add('image-hover-glow');
                }
              }}
              onMouseLeave={() => {
                // Remove glow effect from explore button
                const exploreButton = document.querySelector('.explore-section');
                if (exploreButton) {
                  exploreButton.classList.remove('image-hover-glow');
                }
              }}
            >
              <figure style={{ position: 'relative', minHeight: '280px' }}>
                <figcaption style={{ marginBottom: '0.5rem' }}>
                  {heroImage.title || ""}
                </figcaption>
                {/* Placeholder skeleton while loading */}
                {!heroLoaded && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '2rem',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d5 100%)',
                      borderRadius: '9px',
                      animation: 'heroShimmer 1.5s ease-in-out infinite',
                    }}
                  />
                )}
                <img
                  src={getProxySrc(heroImage.id, 'l')}
                  alt={heroImage.alt || heroImage.title || "Gallery preview"}
                  onLoad={() => setHeroLoaded(true)}
                  style={{
                    maxWidth: "100%",
                    borderRadius: "9px",
                    boxShadow: heroLoaded ? "0 8px 32px #0002" : "none",
                    border: "2px solid #ddd",
                    opacity: heroLoaded ? 1 : 0,
                    transition: "opacity 0.5s ease-in-out, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (heroLoaded) {
                      e.target.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.85), 0 4px 15px 4px rgba(134, 134, 134, 0.85)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (heroLoaded) {
                      e.target.style.boxShadow = '0 8px 32px #0002';
                    }
                  }}
                />
              </figure>
            </a>
          )}

          {/* Desktop: ThemeBlock below image */}
          <div className="theme-block-desktop">
            <ThemeBlock galleryKey={trimmedBase} galleryData={galleryData} />
          </div>
        </motion.div>
      </section>

      {lowestSortImage && lowestSortImage.id ? (
        <motion.a
          href={exploreHref}
          className="explore-section explore-button"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.2,
            delay: 0,
            ease: [0.33, 1, 0.68, 1],
          }}
          style={{
            display: "block",
            textDecoration: "none",
            color: "inherit",
          }}
          onClick={() => trackEvent("gallery_explore_click")}
        >
          Explore the Gallery
          <span
            style={{
              fontSize: "1.8rem",
              verticalAlign: "middle",
            }}
          >
            →
          </span>
          <div className="landing-divider">
            <span style={{ fontSize: "1.5rem" }}>◆</span>
          </div>
        </motion.a>
      ) : null}
    </>
  );
}
