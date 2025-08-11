import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Notebook, ShoppingCart } from "lucide-react";
import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White.mjs";
import SwipeHint from "./SwipeHint";
import LikeButton from "@/components/LikeButton.jsx";
import StoryShow from "./Gallery-Slideshow.jsx"; // adjust the path if needed
import useHorizontalSwipeNav from "./hooks/useHorizontalSwipeNav.js";
import { createPortal } from "react-dom";

/* =========================
   Lightweight Guided Tour
   ========================= */
function GalleryTour({ sectionKey, imageId, autoStart = true, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);

  const seenKey = `k4-tour-seen:${sectionKey || "k4"}`;

  // Visible element detector
  const isVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // Safely pick the first visible match (handles mobile/desktop duplicates)
  const pickVisible = (selector) => {
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes.find(isVisible) || null;
  };

  // --- Steps (welcome + controls; cart/share included)
  const steps = [
    {
      selector: null,
      placement: "center",
      title: "Welcome to our Chapter Viewer",
      body: "Before exploring the chapter-images, take a quick tour of our features to get the most out of your visit — navigation, grid view, zoom + matting, likes, sharing, ordering prints and more."
    },

    { selector: `[data-image-id="${imageId}"] [data-prev-btn]`,  title: "Go Back", body: "Step back to previous chapter-image.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-next-btn]`,  title: "Go Forward", body: "Continue to the next chapter-image.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-grid-btn]`,  title: "Grid View", body: "Looking for a 'Chapter Index' overview of the gallery? Click to browse a dynamic grid view of this gallery and jump right to your image of choice by clicking.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-menu-btn]`,  title: "Menu", body: "Open the menu for easy site-wide navigation to explore other galleries and sections.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-count]`,     title: "Position", body: "See your place in the gallery and total image count for this gallery.", placement: "top" },
    { selector: `[data-image-id="${imageId}"] [data-jump-form]`, title: "Jump to #", body: "Type a chapter number and press Go to jump to that image.", placement: "top" },
      { selector: `[data-cart-btn]`,  title: "Buy a Print", body: "Click to place an image order.", placement: "top" },
    { selector: `[data-image-id="${imageId}"] [data-like-btn]`,  title: "Like", body: "Tap the heart to show us your favorites.", placement: "top" },

    // 🔙 Exit (circle X) — restored
    { selector: `[data-image-id="${imageId}"] [data-exit-btn]`,  title: "Exit", body: "Exit and return to the collection landing page.", placement: "top" },
    { selector: `[data-image-id="${imageId}"] [data-zoom-btn]`,  title: "Zoom + Matting", body: "Click the image to open zoom-view and try our interactive matting/finishing reviews.", placement: "right" },
      { selector: `[data-image-id="${imageId}"] [data-slideshow-btn]`, title: "Slideshow", body: "Sit back and enjoy a cinematic story show of this gallery.", placement: "top" },
    // Cart + Share (not image-scoped so they work if toolbar/footer move)

    { selector: `[data-share-btn]`, title: "Share", body: "Copy URL or get social media shares for this chapter-image with friends.", placement: "top" },
  ];

  // Patch history once to detect SPA URL changes
  useEffect(() => {
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

  // Only open on /i-xxxx; start on SPA URL change too; ensure visible targets
  useEffect(() => {
    if (!autoStart) return;

    const urlIsImage = () =>
      typeof window !== "undefined" && /\/i-[a-zA-Z0-9_-]+$/i.test(window.location.pathname);

    const tryStart = () => {
      if (!urlIsImage()) return;

      // don't reopen if seen already (supports permanent or TTL JSON)
      try {
        const raw = localStorage.getItem(seenKey);
        if (raw) {
          if (raw === '1') return; // permanent hide
          try {
            const obj = JSON.parse(raw);
            if (obj && typeof obj.ts === 'number' && typeof obj.ttl === 'number') {
              if (Date.now() - obj.ts < obj.ttl) return; // still within hide window
              // expired TTL -> remove so we can show again
              localStorage.removeItem(seenKey);
            }
          } catch { /* legacy or unexpected value; fall through and show */ }
        }
      } catch {}

      // Ensure at least one visible target exists (desktop/mobile variants)
      const ok =
        pickVisible(`[data-image-id="${imageId}"] [data-next-btn], [data-image-id="${imageId}"] [data-prev-btn], [data-image-id="${imageId}"] [data-grid-btn], [data-image-id="${imageId}"] [data-zoom-btn]`) ||
        pickVisible(`[data-next-btn], [data-prev-btn], [data-grid-btn], [data-zoom-btn]`) ||
        pickVisible(`[data-cart-btn], [data-share-btn]`) ||
        pickVisible(`[data-image-id="${imageId}"] [data-exit-btn]`);

      if (ok) { setIsOpen(true); return; }

      // brief retries if DOM not ready yet
      let tries = 0;
      const max = 30; // ~450ms
      const tick = 15;
      const retry = () => {
        const again =
          pickVisible(`[data-image-id="${imageId}"] [data-next-btn], [data-image-id="${imageId}"] [data-prev-btn], [data-image-id="${imageId}"] [data-grid-btn], [data-image-id="${imageId}"] [data-zoom-btn]`) ||
          pickVisible(`[data-next-btn], [data-prev-btn], [data-grid-btn], [data-zoom-btn]`) ||
          pickVisible(`[data-cart-btn], [data-share-btn]`) ||
          pickVisible(`[data-image-id="${imageId}"] [data-exit-btn]`);
        if (again) { setIsOpen(true); return; }
        if (tries++ < max) setTimeout(retry, tick);
      };
      retry();
    };

    tryStart();
    window.addEventListener("k4:urlchange", tryStart);
    return () => window.removeEventListener("k4:urlchange", tryStart);
  }, [autoStart, seenKey, imageId]);

  // Recalc spotlight around the visible target (handles welcome slide)
  useEffect(() => {
    if (!isOpen) return;
    const onRecalc = () => {
      const step = steps[idx];
      if (!step) return setRect(null);

      // Welcome slide (no selector): no hole; center tip via tipPos()
      if (!step.selector) { setRect(null); return; }

      const el = pickVisible(step.selector);
      if (!el) { setRect(null); return; }

      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    onRecalc();
    window.addEventListener("resize", onRecalc, { passive: true });
    window.addEventListener("scroll", onRecalc, { passive: true });
    return () => {
      window.removeEventListener("resize", onRecalc);
      window.removeEventListener("scroll", onRecalc);
    };
  }, [isOpen, idx, steps]);

  // Never render on landings (no /i-xxxx)
  if (typeof window !== "undefined" && !/\/i-[a-zA-Z0-9_-]+$/i.test(window.location.pathname)) {
    return null;
  }
  if (typeof window === "undefined" || !isOpen || !steps[idx]) return null;

  // Tip + spotlight layout
  const pad = 12;
  const tipW = 320;
  const tipH = 120;
  const r = rect;
  const placement = steps[idx].placement || "bottom";
  const tipPos = (() => {
    // Center the welcome slide (no selector) or when no rect yet
    if (!r || placement === "center" || steps[idx]?.selector == null) {
      const left = Math.max(12, (window.innerWidth - tipW) / 2);
      const top  = Math.max(12, (window.innerHeight - tipH) / 2);
      return { left, top };
    }
    let left = r.x, top = r.y;
    if (placement === "bottom") { left = r.x; top = r.y + r.h + pad; }
    if (placement === "top")    { left = r.x; top = r.y - tipH - pad; }
    if (placement === "left")   { left = r.x - tipW - pad; top = r.y; }
    if (placement === "right")  { left = r.x + r.w + pad; top = r.y; }
    left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12));
    top  = Math.max(12, Math.min(top, window.innerHeight - tipH - 12));
    return { left, top };
  })();

  const spotlightStyle = r
    ? {
        position: "fixed",
        left: r.x - 8,
        top: r.y - 8,
        width: r.w + 16,
        height: r.h + 16,
        borderRadius: 10,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        outline: "2px solid rgba(255,255,255,0.5)",
        pointerEvents: "none",
        transition: "all .2s ease",
      }
    : {
        // Welcome or no target: full-page dim, no hole
        position: "fixed",
        inset: 0,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        pointerEvents: "none"
      };

  const closeTour = (markSeen = true) => {
    if (markSeen) { try { localStorage.setItem(seenKey, "1"); } catch {} }
    setIsOpen(false);
    onClose && onClose();
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 999999, pointerEvents: "none", fontFamily: "'Glegoo', serif" }}>
      <div style={spotlightStyle} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={steps[idx].title}
        style={{
          position: "fixed",
          left: tipPos.left,
          top: tipPos.top,
          width: 320,
          minHeight: 120,
          background: "rgba(255,255,255,0.96)",
          color: "#1b1a19",
          border: "1px solid rgba(0,0,0,0.15)",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          padding: "14px 14px 10px 14px",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{steps[idx].title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.35 }}>{steps[idx].body}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          {/* Step counter: exclude the welcome (no selector) from numbering */}
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {steps[idx].selector
              ? (() => {
                  const counted = steps.filter(s => s.selector);
                  const currentNumber = counted.indexOf(steps[idx]) + 1;
                  return `Step ${currentNumber} / ${counted.length}`;
                })()
              : null}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Hide Back button entirely on welcome slide */}
            {!(idx === 0 && steps[idx].selector == null) && (
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                style={{
                  pointerEvents: "auto",
                  background: idx === 0 ? "#f2f2f2" : "#fff",
                  color: idx === 0 ? "#999" : "#4a4a4a",
                  border: "1px solid #d0d0d0",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 13,
                  cursor: idx === 0 ? "not-allowed" : "pointer",
                }}
              >
                Back
              </button>
            )}
            {/* Permanent hide button (only on welcome) */}
            {idx === 0 && steps[idx].selector == null && (
              <button
                onClick={() => {
                  try { localStorage.setItem(seenKey, '1'); } catch {}
                  setIsOpen(false);
                  onClose && onClose();
                }}
                style={{
                  pointerEvents: 'auto',
                  background: '#eee',
                  color: '#444',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
                title="Don't show this tour again"
              >
                Don't Show
              </button>
            )}
            {idx < steps.length - 1 ? (
              <button
                onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
                style={{ pointerEvents: "auto", background: "#7b1e1e", color: "#fff", border: "1px solid #6b1a1a", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => closeTour(true)}
                style={{ pointerEvents: "auto", background: "#7b1e1e", color: "#fff", border: "1px solid #6b1a1a", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
              >
                Done
              </button>
            )}
            <button
              onClick={() => {
                // 10 minute temporary hide (TTL)
                try { localStorage.setItem(seenKey, JSON.stringify({ ts: Date.now(), ttl: 600000 })); } catch {}
                setIsOpen(false);
                onClose && onClose();
              }}
              style={{ pointerEvents: 'auto', background: 'transparent', color: '#7b1e1e', border: '1px solid rgba(123,30,30,0.35)', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
              title="Skip this tour for now (will reappear later)"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ========== DATA ========= */
const galleryData = rawData.filter((entry) => entry.id !== "i-k4studios");

// --- Simple mojibake fixer (UTF-8 shown as Latin-1)
function fixMojibake(str) {
  if (!str) return str;
  return str
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€�/g, "”")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…");
}

export default function ScrollFlipGallery({ initialImageId }) {
  const [hasEnteredChapters, setHasEnteredChapters] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [viewMode, setViewMode] = useState("flip");
  const [isZoomed, setIsZoomed] = useState(false);
  const [showArrowHint, setShowArrowHint] = useState(false);
  const [matColor, setMatColor] = useState("white");
  const [showMiniMenu, setShowMiniMenu] = useState(false);
  const [showArrows, setShowArrows] = useState(true);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const prevIndex = useRef(currentIndex);
  const [showStoryShow, setShowStoryShow] = useState(false);

  // 🔄 Trigger chapter entry mode via custom event
  useEffect(() => {
    const handleEnterChapters = () => setHasEnteredChapters(true);
    window.addEventListener("enterChapters", handleEnterChapters);
    return () => window.removeEventListener("enterChapters", handleEnterChapters);
  }, []);

  // 🔍 Initial load: parse URL or use fallback — safe for static builds
  useEffect(() => {
    if (!galleryData || galleryData.length === 0) return;

    const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)$/);
    const idFromURL = match ? match[1] : initialImageId;

    if (idFromURL) {
      const index = galleryData.findIndex((entry) => entry.id === idFromURL);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [initialImageId]);

  // 🟢 Auto-enter chapters if directly loading an image page
  useEffect(() => {
    if (window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/)) {
      setHasEnteredChapters(true);
    }
  }, []);

  // 🔗 Update URL when navigating *after* entering chapters
  useEffect(() => {
    const imageId = galleryData[currentIndex]?.id;
    const alreadyOnImage = window.location.pathname.match(/\/i-[a-zA-Z0-9_-]+$/);
    if (!imageId || (!hasEnteredChapters && !alreadyOnImage)) return;

    const basePath = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White";
    const newUrl = `${basePath}/${imageId}`;
    const currentUrl = window.location.pathname;

    if (currentUrl !== newUrl) {
      window.history.pushState(null, "", newUrl);
    }
  }, [currentIndex, hasEnteredChapters]);

  // Update <title> tag
  useEffect(() => {
    const base = "Civil War Portraits – Black & White";
    const entry = galleryData[currentIndex];
    const chapterLabel = entry?.title ? fixMojibake(entry.title) : `Chapter ${currentIndex + 1}`;
    const newTitle = `${chapterLabel} — ${base}`;
    if (document.title !== newTitle) document.title = newTitle;
  }, [currentIndex]);

  // Clean up stray ID in URL if landing intro is showing
  useEffect(() => {
    const introEl = document.getElementById("intro-section");
    const isIntroVisible = introEl && !introEl.classList.contains("section-hidden");
    const isViewingImageZero = currentIndex === 0;

    if (isIntroVisible && isViewingImageZero && window.location.pathname.includes("/i-")) {
      const cleanUrl = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White";
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [currentIndex]);

  // ⬅️⬆️ Browser back/forward handler
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/);
      const id = match ? match[1] : null;

      const header = document.getElementById("header-section");
      const intro = document.getElementById("intro-section");
      const chapter = document.getElementById("chapter-section");

      if (id) {
        const index = galleryData.findIndex((entry) => entry.id === id);
        if (index !== -1) {
          setCurrentIndex(index);
          if (header) header.classList.add("section-hidden");
          if (intro) intro.classList.add("section-hidden");
          if (chapter) {
            chapter.style.display = "block";
            chapter.classList.remove("section-hidden");
            chapter.classList.add("section-visible");
          }
          return;
        }
      }

      // No image ID = return to intro
      if (chapter) {
        chapter.style.display = "none";
        chapter.classList.add("section-hidden");
        chapter.classList.remove("section-visible");
      }
      if (header) {
        header.classList.remove("section-hidden", "slide-fade-out");
      }
      if (intro) {
        intro.classList.remove("section-hidden", "slide-fade-out");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Add react-mounted class
  useEffect(() => {
    document.body.classList.add("react-mounted");
  }, []);

  // Arrow key navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey ||
        /(INPUT|TEXTAREA|SELECT)/.test(e.target.tagName)
      ) {
        return;
      }
      if (viewMode !== "flip" || isZoomed) return;

      if (e.key === "ArrowRight") {
        setIsExpanded(false);
        setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
      } else if (e.key === "ArrowLeft") {
        setIsExpanded(false);
        setCurrentIndex((i) => Math.max(i - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode, isZoomed]);

  // Orientation detection
  useEffect(() => {
    const updateOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      setIsLandscapeMobile(w > h && (isCoarse || w <= 1024));
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  // Mobile check
  useEffect(() => {
    const mqCoarse = window.matchMedia ? window.matchMedia("(pointer: coarse)") : null;
    const checkMobile = () => {
      const coarse = mqCoarse ? mqCoarse.matches : false;
      setIsMobile(coarse || window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    if (mqCoarse && mqCoarse.addEventListener) mqCoarse.addEventListener("change", checkMobile);
    if (mqCoarse && mqCoarse.addListener) mqCoarse.addListener(checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      if (mqCoarse && mqCoarse.removeEventListener) mqCoarse.removeEventListener("change", checkMobile);
      if (mqCoarse && mqCoarse.removeListener) mqCoarse.removeListener(checkMobile);
    };
  }, []);

  // Arrow hint timeout
  useEffect(() => {
    if (!showArrows) return;
    const timeout = setTimeout(() => setShowArrows(false), 4000);
    return () => clearTimeout(timeout);
  }, [showArrows]);

  // Swipe hint for first-time
  useEffect(() => {
    if (!localStorage.getItem("scrollFlipIntroSeen")) {
      setShowArrowHint(true);
      setTimeout(() => {
        setShowArrowHint(false);
        localStorage.setItem("scrollFlipIntroSeen", "true");
      }, 3000);
    }
  }, []);

  // no background scroll while slideshow is on
  useEffect(() => {
    if (showStoryShow) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showStoryShow]);

  // Touch navigation
  const { containerProps: swipeHandlers } = useHorizontalSwipeNav({
    onPrev: () => { setIsExpanded(false); setCurrentIndex((i) => Math.max(i - 1, 0)); },
    onNext: () => { setIsExpanded(false); setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1)); }
  });

  const direction = currentIndex > prevIndex.current ? 1 : -1;
  prevIndex.current = currentIndex;

  const currentId = galleryData[currentIndex]?.id;

  return (
    <div
      className="min-h- bg-white text-black font-serif px-5 py-8 overflow-hidden"
      style={{ fontFamily: "Glegoo, serif" }}
      onMouseMove={() => setShowArrows(true)}
    >
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />

      <div className="relative max-w-6xl mx-auto">
        {isZoomed ? (
          <ZoomOverlay
            imageData={galleryData[currentIndex]}
            matColor={matColor}
            setMatColor={setMatColor}
            onClose={() => setIsZoomed(false)}
          />
        ) : (
          <>
            {/* Flip View */}
            {viewMode === "flip" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: direction > 0 ? 150 : -150 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -150 : 150 }}
                  transition={{ duration: 0.6, ease: [0.45, 0, 0.55, 1] }}
                  className="grid md:grid-cols-2 gap-6 md:gap-12 items-center"
                  {...swipeHandlers}
                  data-image-id={currentId}
                >
                  {isMobile && (
                    <div
                      className="text-center text-2xl text-gray-400 tracking-wide mb-0 sm:hidden font-bold"
                      style={{
                        fontFamily: "'Glegoo', serif",
                        marginTop: "-2.0rem",
                        opacity: ".6",
                        lineHeight: "1",
                      }}
                    >
                      ⸺{" "}
                      <a
                        href={(() => {
                          const parts = window.location.pathname.split("/");
                          const iIdx = parts.findIndex((p) => p.startsWith("i-"));
                          return iIdx > 1
                            ? parts.slice(0, iIdx - 1).join("/")
                            : parts.slice(0, -1).join("/");
                        })()}
                        title="Explore Full Collection"
                        className="text-[#85644b] no-underline hover:underline"
                      >
                        K4 Studios
                      </a>{" "}
                      ⸺
                    </div>
                  )}

                  {/* IMAGE + ARROWS COLUMN */}
                  <div className="flex flex-col -mt-4 items-center w-full relative">
                    <div className="w-full relative flex items-center justify-center mb-0">
                      {/* Left Arrow (mobile) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.max(i - 1, 0));
                        }}
                        aria-label="Previous Chapter"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-gray-400 bg-gray-100 rounded-md shadow px-2 py-1 text-xl md:hidden"
                        style={{
                          minWidth: 28,
                          minHeight: 28,
                          fontSize: "1.2rem",
                          display: isMobile ? "block" : "none",
                          opacity: showArrows ? 0.8 : 0,
                          transition: "opacity 0.5s ease",
                          pointerEvents: showArrows ? "auto" : "none",
                        }}
                        tabIndex={isMobile ? 0 : -1}
                        data-prev-btn
                      >
                        ❮
                      </button>

                      <div className="relative w-full md:w-[340px] flex flex-row">
                        {/* Image */}
                        <div
                          className="aspect-[4/5] relative rounded-lg flex items-center justify-center text-gray-500 cursor-pointer overflow-hidden z-10 w-full group"
                          style={{
                            marginLeft: isMobile ? "10px" : 0,
                            marginRight: isMobile ? "10px" : 0,
                          }}
                        >
                          <img
                            src={galleryData[currentIndex].src}
                            alt={galleryData[currentIndex].title}
                            className="chapter-image-mobile border-2 border-gray-400 rounded-lg"
                            style={
                              isMobile
                                ? {
                                    cursor: "zoom-in",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    maxHeight: "65vh",
                                  }
                                : {
                                    cursor: "zoom-in",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    maxHeight: "70vh",
                                    background: "#f7f7f7",
                                  }
                            }
                            onClick={() => {
                              if (!isLandscapeMobile) setIsZoomed(true);
                            }}
                            data-zoom-btn
                          />
                        </div>

                        {/* Collector Notes (desktop) */}
                        {!isMobile && galleryData[currentIndex].notes && (
                          <div className="hidden md:flex flex-col items-start relative">
                            <button
                              onClick={() => setShowNotes((prev) => !prev)}
                              aria-label="View Collector Notes"
                              title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                              className="ml-0 mt-1 w-6 h-8 border border-gray-300 bg-white text-gray-400 rounded-md shadow hover:bg-gray-200 transition relative z-30"
                              style={{ boxShadow: "0 2px 6px rgba(80,60,30,0.10)" }}
                            >
                              {showNotes ? (
                                <span className="text-lg leading-none">✕</span>
                              ) : (
                                <>
                                  <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">
                                    *
                                  </span>
                                  <Notebook className="w-6 h-6 stroke-[1.75]" />
                                </>
                              )}
                            </button>
                            <AnimatePresence>
                              {showNotes && (
                                <motion.div
                                  key="collector-notes-desktop"
                                  initial={{ opacity: 0, x: -32 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -32 }}
                                  transition={{ duration: 0.38, ease: [0.33, 1, 0.68, 1] }}
                                  className="absolute -left-3 top-11 z-50 w-96 border border-gray-300 rounded shadow-2xl p-5 text-sm text-gray-800"
                                  style={{
                                    backgroundColor: "#9fa692",
                                    border: "1px solid rgb(109, 111, 114)",
                                    minWidth: "260px",
                                    maxWidth: "90vw",
                                    marginLeft: "16px",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <strong
                                      style={{
                                        color: "#fff",
                                        textShadow: "0 1px 2px #444",
                                        fontWeight: "bold",
                                        marginRight: "0.75em",
                                        fontSize: "1em",
                                      }}
                                    >
                                      Collector Notes:
                                    </strong>
                                    <span
                                      style={{
                                        flex: 1,
                                        marginTop: "4px",
                                        height: "2px",
                                        marginLeft: "0.5em",
                                        borderRadius: "2px",
                                        background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))",
                                        filter: "drop-shadow(0 1px 2px #444)",
                                      }}
                                    />
                                  </div>
                                  {galleryData[currentIndex].notes.split("\n\n").map((para, idx) => (
                                    <p key={idx} className="mb-3 last:mb-0">
                                      {para}
                                    </p>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Right Arrow (mobile) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
                        }}
                        aria-label="Next Chapter"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-gray-400 bg-gray-100 rounded-md shadow px-2 py-1 text-xl md:hidden"
                        style={{
                          minWidth: 28,
                          minHeight: 28,
                          fontSize: "1.2rem",
                          display: isMobile ? "block" : "none",
                          opacity: showArrows ? 0.8 : 0,
                          transition: "opacity 0.5s ease",
                          pointerEvents: showArrows ? "auto" : "none",
                        }}
                        tabIndex={isMobile ? 0 : -1}
                        data-next-btn
                      >
                        ❯
                      </button>
                    </div>

                    {/* Unified Nav Row */}
                    <div
                      className="flex items-center justify-center ml-[0.1rem] gap-0.5 md:gap-4 mt-1 mb-1 max-w-[370px] mx-auto border border-gray-200 bg-white rounded-md shadow-sm px-1.5 py-1.5"
                      style={!isMobile && galleryData[currentIndex].notes ? { marginRight: "92px" } : {}}
                    >
                      {/* Menu */}
                      <button
                        className="px-1 py-.5 border border-gray-200 hover:bg-gray-100 bg-white text-gray-400 text-lg rounded shadow-sm transition-colors duration-150 hover:text-gray-600 focus:text-gray-500 hover:border-gray-300 focus:border-gray-300"
                        aria-label="Show Menu"
                        title="Show Menu"
                        style={{ minWidth: 32, minHeight: 32, fontWeight: 400 }}
                        onClick={() => setShowMiniMenu(true)}
                        data-menu-btn
                      >
                        ☰
                      </button>

                      {/* Notes (mobile) */}
                      {galleryData[currentIndex].notes && isMobile && (
                        <button
                          onClick={() => setShowNotes((prev) => !prev)}
                          aria-label="View Collector Notes"
                          title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                          className="inline-flex items-center text-gray-400 hover:bg-gray-200 justify-center w-7 h-7 relative border border-gray-200 bg-white rounded shadow"
                        >
                          {showNotes ? (
                            <span className="text-lg leading-none">✕</span>
                          ) : (
                            <>
                              <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
                              <Notebook className="w-5 h-5 stroke-[1.75]" />
                            </>
                          )}
                        </button>
                      )}

                      {/* Gallery count */}
                      <div
                        className="text-sm text-gray-400 font-medium flex items-center whitespace-nowrap"
                        style={{ letterSpacing: "-0.075em" }}
                        data-count
                      >
                        {`${currentIndex + 1} – ${galleryData.length}`}
                      </div>

                      {/* Grid icon (mobile) */}
                      <button
                        onClick={() => setViewMode((prev) => (prev === "flip" ? "grid" : "flip"))}
                        aria-label="View Grid Mode"
                        title="View Grid Mode"
                        className="bg-gray-100 rounded p-1 shadow hover:bg-gray-200 flex items-center justify-center md:hidden"
                        style={{ minWidth: 32, minHeight: 32 }}
                        data-grid-btn
                      >
                        <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
                      </button>

                      {/* Jump form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const num = parseInt(e.target.elements.chapterNum.value, 10);
                          if (!isNaN(num) && num >= 1 && num <= galleryData.length) {
                            setIsExpanded(false);
                            setCurrentIndex(num - 1);
                          }
                        }}
                        className="flex items-center gap-2 text-xs"
                        style={{ minWidth: 50 }}
                        data-jump-form
                      >
                        <input
                          type="number"
                          id="chapterNum"
                          name="chapterNum"
                          min="1"
                          max={galleryData.length}
                          placeholder="#"
                          className="w-16 border border-gray-200 rounded px-1 py-1 text-center"
                          style={{ fontSize: "1.0em" }}
                        />
                        <button
                          type="submit"
                          className="bg-gray-000 px-1.5 py-1 text-gray-400 border border-gray-300 rounded shadow hover:text-gray-500 hover:bg-gray-100"
                        >
                          Go
                        </button>
                      </form>

                      {/* Cart */}
                      <a
                        data-cart-btn
                        href={galleryData[currentIndex].buyLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Click to order prints"
                        className="inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold shadow transition"
                        style={{ backgroundColor: "#bbb6b1", color: "#ffffff" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#76807b")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#bbb6b1")}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </a>

                      {/* ❤️ Like Button (toolbar) */}
                      <div className="inline-flex items-center px-2" data-like-btn>
                        <LikeButton imageId={galleryData[currentIndex].id} pageTitle={galleryData[currentIndex].title} />
                      </div>

                      {/* Exit */}
                      <button
                        className="group relative inline-block px-1 py-[0.15rem] border border-gray-200 bg-white text-gray-400 text-xs rounded-full shadow-sm transition-colors duration-200 hover:bg-gray-800 hover:text-gray-200 hover:border-gray-400 focus:text-gray-200 focus:border-gray-400"
                        aria-label="Exit Chapter View"
                        title="Exit"
                        style={{ fontWeight: 400, minHeight: 32, minWidth: 30 }}
                        onClick={() =>
                          (window.location.href =
                            "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White")
                        }
                        data-exit-btn
                      >
                        <span className="block relative h-[1em]">
                          <span className="absolute inset-0 flex items-center justify-center text-md transition-all duration-200 ease-in-out opacity-100 translate-y-0 group-hover:opacity-0 group-hover:-translate-y-1">
                            X
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 ease-in-out opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
                            Exit
                          </span>
                        </span>
                      </button>
                    </div>

                    {!showStoryShow && (
                      <button
                        onClick={() => setShowStoryShow(true)}
                        aria-label="Play K4 Slideshow"
                        title="Play K4 Story Show"
                        className="group my-3 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white border border-gray-300 shadow-sm transition-colors"
                        style={{ letterSpacing: ".02em" }}
                        data-slideshow-btn
                      >
                        <span className="inline-flex items-center justify-center w-4 h-4 text-gray-300 group-hover:text-red-700 transition-colors">
                          ▶
                        </span>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-gray-400 transition-colors">
                          Play Show
                        </span>
                      </button>
                    )}

                    {/* Collector Notes Panel (mobile) */}
                    {galleryData[currentIndex].notes && isMobile && (
                      <AnimatePresence>
                        {showNotes && (
                          <motion.div
                            key="collector-notes-mobile"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                            className="w-full mx-auto mt-2 mb-[6px] border border-gray-300 rounded shadow p-4 text-sm text-gray-800 text-left"
                            style={{ backgroundColor: "#9fa692", border: "1px solid rgb(109, 111, 114)", maxWidth: "98vw", boxSizing: "border-box" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                              <strong style={{ color: "#fff", textShadow: "0 1px 2px #444", fontWeight: "bold", marginRight: "0.75em", fontSize: "1em" }}>
                                Collector Notes:
                              </strong>
                              <span style={{ flex: 1, marginTop: "4px", height: "2px", marginLeft: "0.5em", borderRadius: "2px", background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))", filter: "drop-shadow(0 1px 2px #444)" }} />
                            </div>
                            {galleryData[currentIndex].notes.split("\n\n").map((para, idx) => (
                              <p key={idx} className="mb-3 last:mb-0">
                                {para}
                              </p>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>

                  {/* DESCRIPTION + DESKTOP NAV COLUMN */}
                  <div className="w-full md:pl-8">
                    {/* Separator */}
                    <div className="hidden md:flex justify-center my-2">
                      <div className="flex items-center justify-center gap-3 my-4 text-[#7a6a58]">
                        <div className="h-px w-20 bg-[#7a6a58]" />
                        <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                        <div className="h-px w-20 bg-[#7a6a58]" />
                      </div>
                    </div>

                    {/* Logo Watermark */}
                    <div className="mb-4 flex justify-center relative z-0 hidden md:flex">
                      <img
                        src="/images/K4Logo-web-b.jpg"
                        alt="K4 Studios Logo"
                        className="h-16.5 mb-5"
                        style={{ borderRadius: "50px", maxWidth: "160px", opacity: ".55" }}
                      />
                    </div>

                    {/* Title */}
                    <h2
                      className="text-center font-semibold mb-1 tracking-wide text-[#85644b]"
                      style={{
                        fontSize: "1.55rem",
                        opacity: 0.5,
                        lineHeight: isMobile ? "1.0" : "1.35",
                        fontFamily: "'Glegoo', serif",
                      }}
                    >
                      Chapter {currentIndex + 1}:
                      {galleryData[currentIndex].title && (
                        <>
                          <br />
                          <span className="chapter-title">{galleryData[currentIndex].title}</span>
                        </>
                      )}
                    </h2>

                    {/* Story */}
                    <p className="italic text-base mt-3 md:text-lg mb-4 leading-snug text-left">
                      {galleryData[currentIndex].story}
                    </p>

                    {/* More Info Toggle & Panel */}
                    {(() => {
                      const descPanelId = `desc-panel-${galleryData[currentIndex]?.id || currentIndex}`;
                      return (
                        <div className="text-sm text-gray-600 mb-6 text-center group" style={{ position: "relative" }}>
                          <button
                            onClick={() => setIsExpanded((prev) => !prev)}
                            className="inline-flex items-center gap-1 no-underline hover:no-underline focus:no-underline"
                            aria-expanded={isExpanded}
                            aria-controls={descPanelId}
                            aria-label="Toggle more information about this image"
                            id={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                            style={{ zIndex: 50, position: "relative" }}
                          >
                            <span className={`inline-block transform transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}>
                              ▼
                            </span>
                            More about this image
                          </button>

                          <AnimatePresence>
                            {isExpanded &&
                              (isMobile ? (
                                <motion.div
                                  key={`desc-${currentIndex}-mobile`}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 12 }}
                                  transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                                  className="relative mt-4 mx-auto w-11/12 max-w-lg px-4"
                                  style={{
                                    background: "#f9f6f1",
                                    border: "1.5px solid #e1d6c1",
                                    borderRadius: 16,
                                    boxShadow: "0 8px 48px rgba(130,110,60,0.10)",
                                    padding: ".95rem 1.5rem",
                                    color: "#564427",
                                    minHeight: "4rem",
                                    maxHeight: "290px",
                                    overflowY: "auto",
                                    width: "100%",
                                  }}
                                  id={descPanelId}
                                  role="region"
                                  aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                                  aria-label="More information about this image"
                                >
                                  <p className="pb-2">{galleryData[currentIndex].description}</p>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key={`desc-${currentIndex}-desktop`}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 12 }}
                                  transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                                  className="absolute left-2/2 top-12 z-50"
                                  style={{
                                    transform: "translateX(-50%)",
                                    background: "#f9f6f1",
                                    border: "1.5px solid #e1d6c1",
                                    borderRadius: 16,
                                    boxShadow: "0 8px 48px rgba(130,110,60,0.18)",
                                    padding: ".45rem 1.05rem",
                                    color: "#564427",
                                    minWidth: "340px",
                                    maxWidth: "75vw",
                                    minHeight: "4rem",
                                    maxHeight: "260px",
                                    overflowY: "auto",
                                  }}
                                  id={descPanelId}
                                  role="region"
                                  aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                                  aria-label="More information about this image"
                                >
                                  <p className="pb-2">{galleryData[currentIndex].description}</p>
                                </motion.div>
                              ))}
                          </AnimatePresence>
                        </div>
                      );
                    })()}

                    {/* Bottom Separator */}
                    <div className="flex justify-center my-3">
                      <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                        <div className="h-px w-20 bg-[#7a6a58]" />
                        <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                        <div className="h-px w-20 bg-[#7a6a58]" />
                      </div>
                    </div>

                    {/* Desktop Nav Buttons */}
                    <div className="hidden md:flex justify-center items-center gap-4 pt-4" data-image-id={currentId}>
                      <button
                        onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                        className="bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200"
                        title="Back"
                        data-prev-btn
                      >
                        &lt;
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className="bg-gray-100 p-2 -mt-16 rounded shadow hover:bg-gray-200"
                        title="Index View"
                        data-grid-btn
                      >
                        <Grid className="w-5 h-5" color="#84766d" />
                      </button>
                      <button
                        onClick={() => setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1))}
                        className={`bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200 ${
                          showArrowHint ? "animate-pulse text-yellow-500" : "text-black"
                        }`}
                        title="Next"
                        data-next-btn
                      >
                        &gt;
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Mini Menu Drawer */}
            {showMiniMenu && (
              <div className="fixed top-0 right-0 h-full z-[9999] bg-white overflow-y-auto shadow-xl transition-all duration-300 w-[90vw] md:w-[50vw] lg:w-[25vw]">
                <MobileMiniDrawer onClose={() => setShowMiniMenu(false)} />
              </div>
            )}

            {/* Grid View */}
            {viewMode === "grid" && (
              <RebuiltScrollGrid
                galleryData={galleryData}
                onCardClick={(i) => {
                  setCurrentIndex(i);
                  setIsExpanded(false);
                  setViewMode("flip");
                  window.scrollTo(0, 0);
                }}
                initialImageIndex={currentIndex}
                style={{ display: viewMode === "grid" ? "block" : "none" }}
              />
            )}
          </>
        )}
      </div>

      {showStoryShow && (
        <StoryShow
          images={galleryData.map((img) => ({ ...img, url: img.url || img.src }))}
          startImageId={galleryData[currentIndex].id}
          onExit={() => setShowStoryShow(false)}
        />
      )}

      {/* Swipe Hint */}
      <SwipeHint galleryKey="Painterly-Civil-War-BW" />

      {/* Guided Tour Mount (runs once per section) */}
      <GalleryTour
        sectionKey="/Facing-History/Civil-War-BW"
        imageId={currentId}
        autoStart={true}
      />
    </div>
  );
}
