import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Notebook, ShoppingCart, CircleX, SquareChevronLeft, SquareChevronRight } from "lucide-react";
import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import SwipeHint from "./SwipeHint";
import LikeButton from "@/components/LikeButton.jsx";
import StoryShow from "./Gallery-Slideshow.jsx";
import useHorizontalSwipeNav from "./hooks/useHorizontalSwipeNav.js";
import { createPortal } from "react-dom";

/* =========================================================
   Reusable lightweight guided tour (uses sectionKey + image)
   ========================================================= */
function GalleryTour({ sectionKey, imageId, autoStart = true, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const seenKey = `k4-tour-seen:${sectionKey || "k4"}`;

  const isVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const pickVisible = (selector) => {
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes.find(isVisible) || null;
  };

  const steps = [
    { selector: null, placement: "center", title: "Welcome to our Chapter Viewer", body: "Take a quick tour of navigation, grid view, zoom + matting, likes, sharing, ordering prints and more." },
    { selector: `[data-image-id="${imageId}"] [data-prev-btn]`,  title: "Go Back", body: "Step back to previous chapter-image.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-next-btn]`,  title: "Go Forward", body: "Continue to the next chapter-image.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-grid-btn]`,  title: "Grid View", body: "Open the chapter index to jump anywhere.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-menu-btn]`,  title: "Menu", body: "Open the mini menu for site navigation.", placement: "bottom" },
    { selector: `[data-image-id="${imageId}"] [data-count]`,     title: "Position", body: "See your place in this chapter gallery.", placement: "top" },
    { selector: `[data-image-id="${imageId}"] [data-jump-form]`, title: "Jump to #", body: "Type a chapter number and press Go.", placement: "top" },
    { selector: `[data-cart-btn]`,                               title: "Buy a Print", body: "Order this image in a click.", placement: "top" },
    { selector: `[data-image-id="${imageId}"] [data-like-btn]`,  title: "Like", body: "Tap the heart to show favorites.", placement: "top" },
    { selector: `[data-image-id="${imageId}"] [data-exit-btn]`,  title: "Exit", body: "Return to the collection landing page.", placement: "top" },
    { selector: `[data-image-id="${imageId}"] [data-zoom-btn]`,  title: "Zoom + Matting", body: "Open zoom view and try finishes.", placement: "right" },
    { selector: `[data-image-id="${imageId}"] [data-slideshow-btn]`, title: "Slideshow", body: "Watch a cinematic Story Show.", placement: "top" },
    { selector: `[data-share-btn]`,                             title: "Share", body: "Copy URL or share on social.", placement: "top" },
  ];

  // Patch history once
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

  // Open logic
  useEffect(() => {
    if (!autoStart) return;

    const urlIsImage = () =>
      typeof window !== "undefined" && /\/i-[a-zA-Z0-9_-]+$/i.test(window.location.pathname);

    const tryStart = () => {
      if (!urlIsImage()) return;

      try {
        const raw = localStorage.getItem(seenKey);
        if (raw) {
          if (raw === "1") return;
          try {
            const obj = JSON.parse(raw);
            if (obj && typeof obj.ts === "number" && typeof obj.ttl === "number") {
              if (Date.now() - obj.ts < obj.ttl) return;
              localStorage.removeItem(seenKey);
            }
          } catch {}
        }
      } catch {}

      const ok =
        pickVisible(`[data-image-id="${imageId}"] [data-next-btn], [data-image-id="${imageId}"] [data-prev-btn], [data-image-id="${imageId}"] [data-grid-btn], [data-image-id="${imageId}"] [data-zoom-btn]`) ||
        pickVisible(`[data-next-btn], [data-prev-btn], [data-grid-btn], [data-zoom-btn]`) ||
        pickVisible(`[data-cart-btn], [data-share-btn]`) ||
        pickVisible(`[data-image-id="${imageId}"] [data-exit-btn]`);

      if (ok) { setIsOpen(true); return; }

      let tries = 0;
      const max = 30;
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

  // Mark html with a flag while tour is open — nav/keys check this
  useEffect(() => {
    const html = document.documentElement;
    if (isOpen) html.setAttribute("data-k4tour-open", "1"); else html.removeAttribute("data-k4tour-open");
    return () => html.removeAttribute("data-k4tour-open");
  }, [isOpen]);

  // Position tip/spotlight
  useEffect(() => {
    if (!isOpen) return;
    const onRecalc = () => {
      const step = steps[idx];
      if (!step) return setRect(null);
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

  if (typeof window !== "undefined" && !/\/i-[a-zA-Z0-9_-]+$/i.test(window.location.pathname)) return null;
  if (typeof window === "undefined" || !isOpen || !steps[idx]) return null;

  const pad = 12, tipW = 320, tipH = 120;
  const r = rect;
  const placement = steps[idx].placement || "bottom";
  const tipPos = (() => {
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
    ? { position: "fixed", left: r.x - 8, top: r.y - 8, width: r.w + 16, height: r.h + 16, borderRadius: 10, boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)", outline: "2px solid rgba(255,255,255,0.5)", pointerEvents: "none", transition: "all .2s ease" }
    : { position: "fixed", inset: 0, boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)", pointerEvents: "none" };

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
        style={{ position: "fixed", left: tipPos.left, top: tipPos.top, width: 320, minHeight: 120, background: "rgba(255,255,255,0.96)", color: "#1b1a19", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", padding: "14px 14px 10px 14px", pointerEvents: "auto", userSelect: "none" }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{steps[idx].title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.35 }}>{steps[idx].body}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {steps[idx].selector ? (() => {
              const counted = steps.filter(s => s.selector);
              const currentNumber = counted.indexOf(steps[idx]) + 1;
              return `Step ${currentNumber} / ${counted.length}`;
            })() : null}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!(idx === 0 && steps[idx].selector == null) && (
              <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                style={{ pointerEvents: "auto", background: idx === 0 ? "#f2f2f2" : "#fff", color: idx === 0 ? "#999" : "#4a4a4a", border: "1px solid #d0d0d0", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: idx === 0 ? "not-allowed" : "pointer" }}>
                Back
              </button>
            )}
            {idx === 0 && steps[idx].selector == null && (
              <button type="button" onClick={() => { try { localStorage.setItem(seenKey, "1"); } catch {}; setIsOpen(false); onClose && onClose(); }}
                title="Don't show this tour again"
                style={{ pointerEvents: "auto", background: "#eee", color: "#444", border: "1px solid #ccc", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                Don't Show
              </button>
            )}
            {idx < steps.length - 1 ? (
              <button type="button" onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
                style={{ pointerEvents: "auto", background: "#7b1e1e", color: "#fff", border: "1px solid #6b1a1a", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>
                Next
              </button>
            ) : (
              <button type="button" onClick={() => closeTour(true)}
                style={{ pointerEvents: "auto", background: "#7b1e1e", color: "#fff", border: "1px solid #6b1a1a", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>
                Done
              </button>
            )}
            <button
              type="button"
              title="Skip for now"
              onClick={() => { try { localStorage.setItem(seenKey, JSON.stringify({ ts: Date.now(), ttl: 600000 })); } catch {}; setIsOpen(false); onClose && onClose(); }}
              style={{ pointerEvents: "auto", background: "transparent", color: "#7b1e1e", border: "1px solid rgba(123,30,30,0.35)", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
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

/* =========================
   Utility + Base Component
   ========================= */
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

/**
 * ChapterGalleryBase
 * Props:
 *  - rawData: array of image entries (id, src, title, story, description, notes, buyLink?)
 *  - basePath: canonical path for this gallery (no trailing /i-xxx)
 *  - titleBase: string used in <title>
 *  - sectionKey: unique key for tour persistence
 *  - galleryKey: key for SwipeHint
 *  - initialImageId?: optional starting image id
 */
export default function ChapterGalleryBase({
  rawData,
  basePath,
  titleBase,
  sectionKey,
  galleryKey,
  initialImageId
}) {
  // Filter out ghost id
  const galleryData = (rawData || []).filter((e) => e && e.id !== "i-k4studios");

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
  const [showStoryShow, setShowStoryShow] = useState(false);

  const prevIndex = useRef(currentIndex);

  // Tour gate helper
  const tourOpen = () =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-k4tour-open") === "1";

  // Centralized nav handlers
  const goPrev = (e) => { e?.stopPropagation(); if (tourOpen()) return; setIsExpanded(false); setCurrentIndex((i) => Math.max(i - 1, 0)); };
  const goNext = (e) => { e?.stopPropagation(); if (tourOpen()) return; setIsExpanded(false); setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1)); };
  const goGrid = (e) => { e?.stopPropagation(); if (tourOpen()) return; setViewMode("grid"); };
  const goExit = (e) => { e?.stopPropagation(); if (tourOpen()) return; if (basePath) window.location.href = basePath; };

  // Enter chapters via custom event (SSR/static safe)
  useEffect(() => {
    const handleEnterChapters = () => setHasEnteredChapters(true);
    window.addEventListener("enterChapters", handleEnterChapters);
    return () => window.removeEventListener("enterChapters", handleEnterChapters);
  }, []);

  // Initial index from URL or prop
  useEffect(() => {
    if (!galleryData.length) return;
    const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)$/);
    const idFromURL = match ? match[1] : initialImageId;
    if (idFromURL) {
      const idx = galleryData.findIndex((e) => e.id === idFromURL);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialImageId, galleryData.length]);

  // Auto-enter if loading an image route
  useEffect(() => {
    if (/\/(i-[a-zA-Z0-9_-]+)/.test(window.location.pathname)) setHasEnteredChapters(true);
  }, []);

  // Push image URL when navigating
  useEffect(() => {
    const imageId = galleryData[currentIndex]?.id;
    const alreadyOnImage = /\/i-[a-zA-Z0-9_-]+$/.test(window.location.pathname);
    if (!imageId || (!hasEnteredChapters && !alreadyOnImage) || !basePath) return;
    const newUrl = `${basePath}/${imageId}`;
    if (window.location.pathname !== newUrl) window.history.pushState(null, "", newUrl);
  }, [currentIndex, hasEnteredChapters, basePath, galleryData]);

  // Title
  useEffect(() => {
    const entry = galleryData[currentIndex];
    const chapterLabel = entry?.title ? fixMojibake(entry.title) : `Chapter ${currentIndex + 1}`;
    const base = titleBase || "K4 Studios Gallery";
    const newTitle = `${chapterLabel} — ${base}`;
    if (document.title !== newTitle) document.title = newTitle;
  }, [currentIndex, titleBase, galleryData]);

  // Clean URL if intro visible
  useEffect(() => {
    const introEl = document.getElementById("intro-section");
    const isIntroVisible = introEl && !introEl.classList.contains("section-hidden");
    const isViewingImageZero = currentIndex === 0;
    if (isIntroVisible && isViewingImageZero && /\/i-/.test(window.location.pathname) && basePath) {
      window.history.replaceState(null, "", basePath);
    }
  }, [currentIndex, basePath]);

  // Back/forward support
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/);
      const id = match ? match[1] : null;

      const header = document.getElementById("header-section");
      const intro = document.getElementById("intro-section");
      const chapter = document.getElementById("chapter-section");

      if (id) {
        const idx = galleryData.findIndex((e) => e.id === id);
        if (idx !== -1) {
          setCurrentIndex(idx);
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

      // Return to intro
      if (chapter) {
        chapter.style.display = "none";
        chapter.classList.add("section-hidden");
        chapter.classList.remove("section-visible");
      }
      if (header) header.classList.remove("section-hidden", "slide-fade-out");
      if (intro) intro.classList.remove("section-hidden", "slide-fade-out");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [galleryData]);

  // Mount class
  useEffect(() => { document.body.classList.add("react-mounted"); }, []);

  // Arrow key nav (disabled during tour)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (tourOpen()) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (/(INPUT|TEXTAREA|SELECT)/.test(e.target.tagName)) return;
      if (viewMode !== "flip" || isZoomed) return;
      if (e.key === "ArrowRight") goNext(e);
      else if (e.key === "ArrowLeft") goPrev(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode, isZoomed]);

  // Orientation + mobile detection
  useEffect(() => {
    const updateOrientation = () => {
      const w = window.innerWidth, h = window.innerHeight;
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

  // Arrow overlay fade
  useEffect(() => {
    if (!showArrows) return;
    const t = setTimeout(() => setShowArrows(false), 4000);
    return () => clearTimeout(t);
  }, [showArrows]);

  // First-time swipe hint
  useEffect(() => {
    if (!localStorage.getItem("scrollFlipIntroSeen")) {
      setShowArrowHint(true);
      setTimeout(() => {
        setShowArrowHint(false);
        localStorage.setItem("scrollFlipIntroSeen", "true");
      }, 3000);
    }
  }, []);

  // Body scroll lock during slideshow
  useEffect(() => {
    if (showStoryShow) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showStoryShow]);

  // Touch swipe
  const { containerProps: swipeHandlers } = useHorizontalSwipeNav({
    onPrev: () => { if (!tourOpen()) goPrev(); },
    onNext: () => { if (!tourOpen()) goNext(); }
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
      <link href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />

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
                  {/* Mobile breadcrumb line */}
                  {isMobile && (
                    <div
                      className="text-center text-2xl text-gray-400 tracking-wide mb-0 sm:hidden font-bold"
                      style={{ fontFamily: "'Glegoo', serif", marginTop: "-2.0rem", opacity: ".6", lineHeight: "1" }}
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
                        type="button"
                        onClick={goPrev}
                        aria-label="Previous Chapter"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-gray-100 rounded-md shadow px-2 py-1 md:hidden"
                        style={{ minWidth: 28, minHeight: 28, display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', opacity: showArrows ? 0.85 : 0.15, transition: 'opacity .5s ease', pointerEvents: showArrows ? 'auto' : 'none', cursor: 'pointer' }}
                        tabIndex={isMobile ? 0 : -1}
                        data-prev-btn
                      >
                        <SquareChevronLeft className="w-6 h-6" color="#84766d" />
                        <span className="sr-only">Previous</span>
                      </button>

                      <div className="relative w-full md:w-[340px] flex flex-row">
                        {/* Image */}
                        <div
                          className="aspect-[4/5] relative rounded-lg flex items-center justify-center text-gray-500 cursor-pointer z-10 w-full group"
                          style={{ marginLeft: isMobile ? "10px" : 0, marginRight: isMobile ? "10px" : 0 }}
                          onClick={() => { if (!isLandscapeMobile) setIsZoomed(true); }}
                          data-zoom-btn
                        >
                          <img
                            src={galleryData[currentIndex]?.src}
                            alt={galleryData[currentIndex]?.title}
                            className="chapter-image-mobile border-2 border-gray-400 rounded-lg"
                            style={
                              isMobile
                                ? { cursor: "zoom-in", width: "auto", height: "auto", objectFit: "contain", maxHeight: "65vh" }
                                : { cursor: "zoom-in", width: "auto", height: "auto", objectFit: "contain", maxHeight: "70vh", background: "#f7f7f7", transition: 'box-shadow .3s ease' }
                            }
                            onMouseEnter={(e) => {
                              if (!isMobile) {
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.85), 0 4px 15px 4px rgba(134, 134, 134, 0.85)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isMobile) {
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          />
                        </div>

                        {/* Collector Notes (desktop) */}
                        {!isMobile && galleryData[currentIndex]?.notes?.trim() && (
                          <div className="md:flex flex-col items-start relative" style={isMobile ? { visibility: 'hidden' } : {}}>
                            <button
                              type="button"
                              onClick={() => setShowNotes((p) => !p)}
                              aria-label="View Collector Notes"
                              title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                              className="ml-0 mt-1 w-6 h-8 border border-gray-300 bg-white text-gray-400 rounded-md shadow hover:bg-gray-200 transition relative z-30"
                              style={{ boxShadow: "0 2px 6px rgba(80,60,30,0.10)" }}
                            >
                              {showNotes ? (
                                <span className="text-lg leading-none">✕</span>
                              ) : (
                                <>
                                  <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
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
                                  style={{ backgroundColor: "#cdd1c5ff", border: "1px solid rgb(109, 111, 114)", minWidth: "260px", maxWidth: "90vw", marginLeft: "16px" }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <strong style={{ color: "#fff", textShadow: "0 1px 2px #444", fontWeight: "bold", marginRight: "0.75em", fontSize: "1em" }}>
                                      Collector Notes:
                                    </strong>
                                    <span style={{ flex: 1, marginTop: "4px", height: "2px", marginLeft: "0.5em", borderRadius: "2px", background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))", filter: "drop-shadow(0 1px 2px #444)" }} />
                                  </div>
                                  {galleryData[currentIndex].notes.split("\n\n").map((para, idx) => (
                                    <p key={idx} className="mb-3 last:mb-0">{para}</p>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Right Arrow (mobile) */}
                      <button
                        type="button"
                        onClick={goNext}
                        aria-label="Next Chapter"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-gray-100 rounded-md shadow px-2 py-1 md:hidden"
                        style={{ minWidth: 28, minHeight: 28, display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', opacity: showArrows ? 0.85 : 0.15, transition: 'opacity .5s ease', pointerEvents: showArrows ? 'auto' : 'none', cursor: 'pointer' }}
                        tabIndex={isMobile ? 0 : -1}
                        data-next-btn
                      >
                        <SquareChevronRight className="w-6 h-6" color="#84766d" />
                        <span className="sr-only">Next</span>
                      </button>
                    </div>

                    {/* Unified Nav Row */}
                    <div
                      className="w-full flex items-center justify-between ml-[0.1rem] gap-0.5 md:gap-2 mt-4 mb-1 mx-auto border border-gray-200 bg-white rounded-full shadow-sm px-1 py-1 select-none"
                      style={{ maxWidth: '340px', minWidth: '0' }}
                    >
                      {/* Menu */}
                      <button
                        type="button"
                        className="flex items-center justify-center w-8 h-8 border border-gray-200 hover:bg-gray-100 bg-white text-gray-500 text-lg rounded-full shadow-sm transition-colors duration-150 hover:border-red-200 hover:text-gray-700 focus:text-gray-600 hover:border-gray-300 focus:border-gray-300"
                        aria-label="Show Menu"
                        title="Show Menu"
                        style={{ fontWeight: 400 }}
                        onClick={(e) => { e.stopPropagation(); setShowMiniMenu(true); }}
                        data-menu-btn
                      >
                        ☰
                      </button>

                      {/* Notes (mobile) */}
                      {galleryData[currentIndex]?.notes && isMobile && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowNotes((p) => !p); }}
                          aria-label="View Collector Notes"
                          title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                          className="inline-flex items-center justify-center w-8 h-8 relative border border-gray-200 bg-white rounded-full shadow text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
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
                      <div className="text-sm text-gray-400 font-medium flex items-center whitespace-nowrap" style={{ letterSpacing: "-0.085em" }} data-count>
                        {`${currentIndex + 1} – ${galleryData.length}`}
                      </div>

                      {/* Grid icon (mobile) */}
                      <button
                        type="button"
                        onClick={goGrid}
                        aria-label="View Grid Mode"
                        title="View Grid Mode"
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 shadow hover:bg-gray-200 border border-gray-500 transition-colors"
                        style={{ border: "1px solid #bebbbaff" }}
                        data-grid-btn
                      >
                        <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
                      </button>

                      {/* Jump form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (tourOpen()) return;
                          const num = parseInt(e.target.elements.chapterNum.value, 10);
                          if (!isNaN(num) && num >= 1 && num <= galleryData.length) {
                            setIsExpanded(false);
                            setCurrentIndex(num - 1);
                          }
                        }}
                        className="flex items-center gap-0 text-xs"
                        style={{ minWidth: 50 }}
                        data-jump-form
                      >
                        <input
                          type="text"
                          id="chapterNum"
                          name="chapterNum"
                          min="1"
                          max={galleryData.length}
                          placeholder="#"
                          className="w-8 border border-gray-200 rounded px-2 py-1 text-center"
                          style={{ fontSize: "1.0em" }}
                        />
                        <button type="submit" className="bg-gray-100 px-1 py-1 text-gray-400 border border-gray-300 rounded shadow hover:border-red-200 hover:text-gray-500 hover:bg-gray-100">
                          Go!
                        </button>
                      </form>

                      {/* Cart */}
                      <a
                        data-cart-btn
                        href={galleryData[currentIndex]?.buyLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Click to order prints"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shadow transition border border-gray-300 hover:border-red-200"
                        style={{ backgroundColor: "#bbb6b1", color: "#ffffff" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#76807b")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#bbb6b1")}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </a>

                      {/* ❤️ Like Button */}
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white shadow hover:bg-gray-100 transition-colors hover:border-red-200" data-like-btn>
                        <LikeButton imageId={galleryData[currentIndex]?.id} pageTitle={galleryData[currentIndex]?.title} />
                      </div>

                      {/* Exit */}
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-300 rounded-full shadow-sm hover:bg-gray-700 hover:text-gray-200 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer"
                        aria-label="Exit Chapter View"
                        title="Exit"
                        style={{ position: 'relative', zIndex: 20 }}
                        onClick={goExit}
                        data-exit-btn
                      >
                        <CircleX className="w-7 h-7" />
                      </button>
                    </div>

                    {!showStoryShow && (
  <button
    type="button"
    onClick={() => { if (!tourOpen()) setShowStoryShow(true); }}
    aria-label="Play K4 Slideshow"
    title="Play K4 Story Show"
    className="group my-3 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white border border-gray-200 hover:border-red-300 shadow-sm transition-colors"
    style={{ letterSpacing: ".02em" }}
    data-slideshow-btn
  >
    <span className="inline-flex items-center justify-center w-4 h-4 text-gray-400 group-hover:text-red-700 transition-colors">
      ▶
    </span>
    <span className="text-sm font-medium text-gray-400 group-hover:text-gray-500 transition-colors">
      Play Show
    </span>
  </button>
)}


                    {/* Collector Notes Panel (mobile) */}
                    {galleryData[currentIndex]?.notes && isMobile && (
                      <AnimatePresence>
                        {showNotes && (
                          <motion.div
                            key="collector-notes-mobile"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                            className="w-full mx-auto mt-2 mb-[6px] border border-gray-300 rounded shadow p-4 text-sm text-gray-800 text-left"
                            style={{ backgroundColor: "#cfd1c8ff", border: "1px solid rgb(109, 111, 114)", maxWidth: "98vw", boxSizing: "border-box" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                              <strong style={{ color: "#fff", textShadow: "0 1px 2px #444", fontWeight: "bold", marginRight: "0.75em", fontSize: "1em" }}>
                                Collector Notes:
                              </strong>
                              <span style={{ flex: 1, marginTop: "4px", height: "2px", marginLeft: "0.5em", borderRadius: "2px", background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))", filter: "drop-shadow(0 1px 2px #444)" }} />
                            </div>
                            {galleryData[currentIndex].notes.split("\n\n").map((para, idx) => (
                              <p key={idx} className="mb-3 last:mb-0">{para}</p>
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
                      style={{ fontSize: "1.55rem", opacity: 0.5, lineHeight: isMobile ? "1.0" : "1.35", fontFamily: "'Glegoo', serif" }}
                    >
                      Chapter {currentIndex + 1}:
                      {galleryData[currentIndex]?.title && (
                        <>
                          <br />
                          <span className="chapter-title">{galleryData[currentIndex].title}</span>
                        </>
                      )}
                    </h2>

                    {/* Story */}
                    <p className="italic text-base mt-3 md:text-lg mb-4 leading-snug text-left">
                      {galleryData[currentIndex]?.story}
                    </p>

                    {/* More Info Toggle & Panel */}
                    {(() => {
                      const descPanelId = `desc-panel-${galleryData[currentIndex]?.id || currentIndex}`;
                      return (
                        <div
                          className="text-sm text-gray-600 mb-6 text-center group"
                          style={{ position: "relative" }}
                        >
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsExpanded((p) => !p); }}
                            className="inline-flex items-center gap-1 no-underline hover:no-underline focus:no-underline"
                            aria-expanded={isExpanded}
                            aria-controls={descPanelId}
                            aria-label="Toggle more information about this image"
                            id={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                            style={{ zIndex: showNotes ? 5 : 50, position: "relative" }}
                          >
                            <span className={`inline-block transform transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}>
                              ▼
                            </span>
                            More about this image
                          </button>

                          <AnimatePresence>
                            {isExpanded && (isMobile ? (
                              <motion.div
                                key={`desc-${currentIndex}-mobile`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 12 }}
                                transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                                className="relative mt-4 mx-auto w-11/12 max-w-lg px-4"
                                style={{ background: "#f2f3f4", border: "1.5px solid #d1d5d9", borderRadius: 16, boxShadow: "0 8px 48px rgba(80,80,90,0.10)", padding: ".95rem 1.5rem", color: "#4a4a49", minHeight: "4rem", maxHeight: "290px", overflowY: "auto", width: "100%" }}
                                id={descPanelId}
                                role="region"
                                aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                                aria-label="More information about this image"
                              >
                                <p className="pb-2">{galleryData[currentIndex]?.description}</p>
                              </motion.div>
                            ) : (
                              <motion.div
                                key={`desc-${currentIndex}-desktop`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 12 }}
                                transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                                className="absolute left-2/2 top-12 z-50"
                                style={{ transform: "translateX(-50%)", background: "#f2f3f4", border: "1.5px solid #d1d5d9", borderRadius: 16, boxShadow: "0 8px 48px rgba(80,80,90,0.15)", padding: ".45rem 1.05rem", color: "#4a4a49", minWidth: "340px", maxWidth: "75vw", minHeight: "4rem", maxHeight: "260px", overflowY: "auto" }}
                                id={descPanelId}
                                role="region"
                                aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                                aria-label="More information about this image"
                              >
                                <p className="pb-2">{galleryData[currentIndex]?.description}</p>
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
<div className="hidden md:flex justify-center items-center gap-6 pt-4" data-image-id={currentId}>
  <button
    type="button"
    onClick={goPrev}
    className="bg-white p-1 -mt-16 rounded shadow flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors"
    title="Back"
    data-prev-btn
  >
    <SquareChevronLeft className="w-5 h-5 text-gray-300 hover:text-gray-500 transition-colors" />
    <span className="sr-only">Previous</span>
  </button>

  <button
    type="button"
    onClick={goGrid}
    className="bg-gray-100 w-11 h-11 -mt-16 rounded-full shadow flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors"
    title="Index View"
    data-grid-btn
  >
    <Grid className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
  </button>

  <button
    type="button"
    onClick={goNext}
    className={`bg-white p-1 -mt-16 rounded shadow flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors ${showArrowHint ? 'animate-pulse' : ''}`}
    title="Next"
    data-next-btn
  >
    <SquareChevronRight className="w-5 h-5 text-gray-300 hover:text-gray-500 transition-colors" />
    <span className="sr-only">Next</span>
  </button>
</div>

                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Mini Menu Drawer */}
            {showMiniMenu && (
              <div className="fixed top-0 right-0 h-full z-[9999] bg-white overflow-y-auto shadow-xl transition-all duration-300 w-[90vw] md:w-[50vw] lg:w-[25vw]">
                <MobileMiniDrawer
                  onClose={() => setShowMiniMenu(false)}
                  currentPage={galleryData[currentIndex]?.title?.trim()} // Normalize current page info
                />
              </div>
            )}

            {/* Grid View */}
            {viewMode === "grid" && (
              <RebuiltScrollGrid
                galleryData={galleryData}
                onCardClick={(i) => {
                  if (tourOpen()) return;
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

      {/* Slideshow */}
      {showStoryShow && (
        <StoryShow
          images={galleryData.map((img) => ({ ...img, url: img.url || img.src }))}
          startImageId={galleryData[currentIndex]?.id}
          onExit={() => setShowStoryShow(false)}
        />
      )}

      {/* Swipe hint + Guided Tour */}
      <SwipeHint galleryKey={galleryKey || "k4-gallery"} />
      <GalleryTour sectionKey={sectionKey} imageId={currentId} autoStart={true} />
    </div>
  );
}
