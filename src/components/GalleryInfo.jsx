import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "../styles/galleryinfo.css";
import ThemeBlock from "./ThemeBlock.jsx";

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

/* ---------------------------------------------------------
   Loader with fallback (flat + nested)
--------------------------------------------------------- */
function loadGalleryDataFor(baseHref) {
  if (!baseHref) return [];

  const normalized = baseHref.replace(/\/$/, "");
  const last = normalized.split("/").pop();

  let possibleKeys = [];

  if (normalized.includes("/Engrained/")) {
    // Engrained → direct file
    possibleKeys.push(`/src/data${normalized}.mjs`);
  } else if (last === "Gallery") {
    // By-Location → /Gallery.mjs
    possibleKeys.push(`/src/data${normalized}.mjs`);
  } else {
    // Try flat file first (…/Color.mjs, …/Portraits.mjs, etc.)
    possibleKeys.push(`/src/data${normalized}.mjs`);
    // Then try nested file (…/Black-White/Black-White.mjs, …/Mountains/Mountains.mjs, etc.)
    possibleKeys.push(`/src/data${normalized}/${last}.mjs`);
  }

  for (const key of possibleKeys) {
    if (allModules[key]) {
      console.log("✅ GalleryInfo loaded:", key);
      const mod = allModules[key];
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
  path = "",
  isLandingPage = false,
}) {
  // Use state for browser-only values to avoid hydration mismatch
  const [clientPath, setClientPath] = useState("");
  
  useEffect(() => {
    if (!path && !entranceData?.galleryPath) {
      setClientPath(window.location.pathname);
    }
  }, [path, entranceData?.galleryPath]);
  
  const baseHref = path || entranceData?.galleryPath || clientPath;
  const trimmedBase = baseHref.replace(/\/$/, "");

  const galleryData = loadGalleryDataFor(trimmedBase);
  const lowestSortImage = pickFirstRealImage(galleryData);

  const exploreHref =
    lowestSortImage && lowestSortImage.id && trimmedBase
      ? `${trimmedBase}/${lowestSortImage.id}`
      : "#";

  return (
    <>
      <section
        className="intro-wrapper"
        style={{ zIndex: 0, position: "relative" }}
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
          style={{ zIndex: 0, position: "relative" }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 1.2,
            ease: [0.33, 1, 0.68, 1],
          }}
        >
          {/* Theme Block - shows themes for this gallery */}
          <ThemeBlock galleryKey={trimmedBase} galleryData={galleryData} />

          {entranceData?.image && (
            <a
              href={exploreHref}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                cursor: 'pointer'
              }}
              aria-label="Explore the gallery"
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
              <figure>
                <img
                  src={entranceData.image.src}
                  alt={
                    entranceData.image.alt || "Portrait preview"
                  }
                  style={{
                    maxWidth: "100%",
                    borderRadius: "9px",
                    boxShadow: "0 8px 32px #0002",
                    border: "2px solid #ddd",
                    transition: "box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.85), 0 4px 15px 4px rgba(134, 134, 134, 0.85)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = '0 8px 32px #0002';
                  }}
                />
                <figcaption>
                  {entranceData.image.caption}
                </figcaption>
              </figure>
            </a>
          )}
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
