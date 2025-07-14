import React, { useState, useEffect } from "react";
import { siteNav } from "../data/siteNav";

function findSiblingGalleries(pathname) {
  function findInNav(items) {
    for (const item of items) {
      if (item.href === pathname) return null;
      if (item.children) {
        const match = item.children.find(child => child.href === pathname);
        if (match) return item.children;
        const deeper = findInNav(item.children);
        if (deeper) return deeper;
      }
    }
    return null;
  }
  return findInNav(siteNav);
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

  const siblings = findSiblingGalleries(currentPath);
  if (!siblings || siblings.length < 2) return null;

  return (
    <div className="gallery-toggle">
      {siblings
        .filter(s => !isMobile || s.href !== currentPath) // Only show inactive one on mobile
        .map(sibling => {
          const isActive = sibling.href === currentPath;
          const labelChar =
            sibling.label === "Color"
              ? "C"
              : sibling.label === "Black & White"
              ? "B"
              : sibling.label;

          return (
            <a
              key={sibling.href}
              href={sibling.href}
              className={`toggle-pill ${isActive ? "active" : ""} ${
                isActive && hoveringOther ? "active-fade" : ""
              }`}
              title={`View ${sibling.label} Gallery`}
              onMouseEnter={() => {
                if (!isActive) setHoveringOther(true);
              }}
              onMouseLeave={() => {
                if (!isActive) setHoveringOther(false);
              }}
            >
              {labelChar}
            </a>
          );
        })}

      <style jsx>{`
        .gallery-toggle {
  margin-left: 0.75rem;
  display: inline-flex;
  gap: 0.35rem;
  z-index: 5;
  min-width: 50px; /* ensures layout space is reserved even with 1 button */
  justify-content: center;
}

        .toggle-pill {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  background: transparent;
  border: 1.8px solid #c5bdbb;
  color: #c5bdbb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
  padding-top: 1px; /* micro tweak if needed */
}

        .toggle-pill:hover {
          background: #e3dad4;
          color: #000;
          transform: translateY(1px);
        }

        .toggle-pill.active {
          background: #c5bdbb;
          color: #000;
          pointer-events: none;
        }

        .toggle-pill.active.active-fade {
          background: transparent;
          color: #c5bdbb;
        }
      `}</style>
    </div>
  );
}
