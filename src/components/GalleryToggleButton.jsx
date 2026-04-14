import React, { useState, useEffect } from "react";
import { siteNav } from "../data/siteNav";
import "../styles/gallery-header-react.css";

// Helper to normalize path
function normalize(path) {
  return (path || "").replace(/[?#].*$/, "").replace(/\/+$/, '').toLowerCase();
}

function isWithinGalleryPath(pathname, galleryHref) {
  const target = normalize(pathname);
  const gallery = normalize(galleryHref);
  return target === gallery || target.startsWith(`${gallery}/`);
}

// Find siblings (other galleries at the same nav level as the current one)
function findSiblingGalleries(pathname) {
  function pickBetterMatch(currentBest, nextBest) {
    if (!nextBest) return currentBest;
    if (!currentBest) return nextBest;
    return nextBest.matchLength > currentBest.matchLength ? nextBest : currentBest;
  }

  function findInNav(items) {
    let bestMatch = null;

    for (const item of items) {
      if (item.children) {
        const galleryChildren = item.children.filter(child => child.type === "gallery-source");

        for (const child of galleryChildren) {
          if (child.href && isWithinGalleryPath(pathname, child.href)) {
            bestMatch = pickBetterMatch(bestMatch, {
              siblings: galleryChildren,
              matchLength: normalize(child.href).length,
            });
          }
        }

        const deeper = findInNav(item.children);
        bestMatch = pickBetterMatch(bestMatch, deeper);
      }
    }

    return bestMatch;
  }

  return findInNav(siteNav)?.siblings || null;
}

export default function GalleryToggleButton({ currentPath }) {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveringOther, setHoveringOther] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  let siblings = [];
  try {
    siblings = findSiblingGalleries(currentPath) || [];
  } catch (err) {
    console.error("Sibling error:", err, currentPath);
    siblings = [];
  }

  // If only one or zero siblings, show nothing (no pills, but header stays)
  if (!Array.isArray(siblings) || siblings.length < 2) return null;

  return (
    <div className="gallery-toggle">
      {siblings.map(sibling => {
        const isActive = isWithinGalleryPath(currentPath, sibling.href);
        const labelChar = sibling.label?.[0]?.toUpperCase() ?? "?";
        return (
          <a
            key={sibling.href}
            href={sibling.href}
            className={`toggle-pill${isActive ? " active" : ""}${isActive && hoveringOther ? " active-fade" : ""}`}
            title={`View ${sibling.label} Gallery`}
            onMouseEnter={() => { if (!isActive) setHoveringOther(true); }}
            onMouseLeave={() => { if (!isActive) setHoveringOther(false); }}
          >
            {labelChar}
          </a>
        );
      })}

    </div>
  );
}
