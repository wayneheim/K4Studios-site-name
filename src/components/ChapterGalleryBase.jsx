// Helper to shorten page paths for cleaner analytics
// "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-RsLmsLZ"
// becomes "…/Western-Cowboy-Portraits/Color/i-RsLmsLZ"
function shortenPagePath(path) {
  if (!path) return path;
  const parts = path.split('/').filter(Boolean);
  // Keep last 3 segments (e.g., gallery/color/imageId or gallery/imageId)
  if (parts.length > 3) {
    return '…/' + parts.slice(-3).join('/');
  }
  return path;
}

// === Batched UI Event Logging ===
// Collects events and sends in batches to reduce function calls by ~90%
// Flushes: every 30s, on page exit, or when batch reaches 20 events
const eventBatch = [];
let flushTimer = null;
const FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_BATCH_SIZE = 20;

function flushEventBatch(useBeacon = false) {
  if (eventBatch.length === 0) return;
  
  const payload = JSON.stringify({ events: eventBatch.splice(0) }); // splice clears array
  
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/.netlify/functions/log-ui-event", blob);
  } else {
    fetch("/.netlify/functions/log-ui-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(err => console.error("Batch flush failed:", err));
  }
}

// Set up flush on page exit (runs once when module loads)
if (typeof window !== "undefined") {
  // Flush on tab close/navigate away
  window.addEventListener("beforeunload", () => flushEventBatch(true));
  // Flush when tab becomes hidden (mobile: switching apps)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEventBatch(true);
  });
}

// Helper to log UI events (now batched)
async function logUIEvent(eventType, details = {}, useBeacon = false) {
  // Skip logging on localhost (admin/dev work)
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return;
  }
  
  // Shorten page paths for cleaner analytics
  if (details.page) {
    details.page = shortenPagePath(details.page);
  }
  
  // Add to batch
  eventBatch.push({ eventType, details, timestamp: Date.now() });
  
  // Flush immediately if batch is full
  if (eventBatch.length >= MAX_BATCH_SIZE) {
    flushEventBatch(useBeacon);
    return;
  }
  
  // Reset/start flush timer
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flushEventBatch(false), FLUSH_INTERVAL);
}
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Notebook, ShoppingCart, CircleX, SquareChevronLeft, SquareChevronRight, Info } from "lucide-react";
import { getClosingSentence } from "../utils/seoDescriptionAppender.js";
import { sitemapMatches } from "../data/sitemapMatches.ts";
import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import SwipeHint from "./SwipeHint";
import LikeButton from "@/components/LikeButton.jsx";
import StoryShow from "./Gallery-Slideshow.jsx";
import SeriesOrderModal from "./SeriesOrderModal.jsx";
import SeriesInfoPopup from "./SeriesInfoPopup.jsx";
import { SERIES_DEFINITIONS, SERIES_ICONS, getEffectiveSeries, loadSeriesRegistry } from "../data/seriesDefinitions.js";
import useHorizontalSwipeNav from "./hooks/useHorizontalSwipeNav.js";
import { createPortal } from "react-dom";
import useMetaSwap from "./hooks/useMetaSwap.js";
import { siteNav } from "../data/siteNav.js";
import { useImageFallbackRedirect } from "./utils/useImageFallbackRedirect.js";
import { themes } from "../data/themes/themes.mjs";

/* =========================================================
   Helper function to find section landing page from siteNav
   ========================================================= */
function findSectionUrl(basePath) {
  // For paths containing "By-Location", go up to the By-Location level
  if (basePath.includes('/By-Location/')) {
    const parts = basePath.split('/');
    const byLocationIndex = parts.findIndex(part => part === 'By-Location');
    if (byLocationIndex !== -1) {
      return parts.slice(0, byLocationIndex + 1).join('/');
    }
  }
  
  // Fallback: strip "/Gallery" if present, then go up one level
  let url = basePath;
  if (url.endsWith('/Gallery')) {
    url = url.slice(0, -'/Gallery'.length);
  }
  return url.split('/').slice(0, -1).join('/');
}

/* =========================================================
   Reusable lightweight guided tour (uses sectionKey + image)
   ========================================================= */
function GalleryTour({ sectionKey, imageId, openNonce = 0, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  // Manual-open only: no auto-start, no session/localStorage flags

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

  // Get notes for the current image
  let notes = null;
  try {
    const el = document.querySelector(`[data-image-id="${imageId}"] [data-notes-btn]`);
    notes = el && el.offsetParent !== null;
  } catch {}

  const steps = [
    { selector: null, placement: 'center', title: 'Welcome to our Chapter Viewer', body: 'Before exploring the chapter-images, take a quick tour of our features to get the most out of your visit — navigation, grid view, zoom + matting, likes, sharing, ordering prints and more.' },
    { selector: `[data-image-id="${imageId}"] [data-prev-btn]`,  title: 'Go Back', body: 'Step back to previous chapter-image.', placement: 'bottom' },
    { selector: `[data-image-id="${imageId}"] [data-next-btn]`,  title: 'Go Forward', body: 'Continue to the next chapter-image.', placement: 'bottom' },
    { selector: `[data-image-id="${imageId}"] [data-grid-btn]`,  title: 'Grid View', body: 'Open a dynamic grid index to jump around.', placement: 'bottom' },
    { selector: `[data-image-id="${imageId}"] [data-menu-btn]`,  title: 'Menu', body: 'Open the site-wide navigation.', placement: 'bottom' },
    { selector: `[data-image-id="${imageId}"] [data-count]`,     title: 'Position', body: 'See your place in this gallery.', placement: 'top' },
    { selector: `[data-share-btn]`, title: 'Share', body: 'Copy or share this chapter-image.', placement: 'top' },
  ];

  // Manual open trigger: open ONLY when openNonce increments (ignore imageId changes)
  useEffect(() => {
    if (openNonce > 0) {
      setIdx(0);
      setIsOpen(true);
    }
  }, [openNonce]);

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

  const closeTour = () => {
    setIsOpen(false);
    onClose && onClose();
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 999999, pointerEvents: "auto", fontFamily: "'Glegoo', serif" }}
      onClick={() => {
        // Close tour when clicking anywhere outside the tip box
  logUIEvent("guide_click_outside", { page: window.location.pathname, sectionKey });
        setIsOpen(false);
        onClose && onClose();
      }}
    >
      <div style={spotlightStyle} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={steps[idx].title}
        style={{ position: "fixed", left: tipPos.left, top: tipPos.top, width: 320, minHeight: 120, background: "rgba(255,255,255,0.96)", color: "#1b1a19", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", padding: "14px 14px 10px 14px", pointerEvents: "auto", userSelect: "none" }}
        onClick={(e) => {
          // Prevent clicks inside the tip from closing the tour
          e.stopPropagation();
        }}
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
          <div style={{ display: "flex", gap: 6, flexWrap: 'wrap' }}>
            {!(idx === 0 && steps[idx].selector == null) && (
              <button
                type="button"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                style={{ pointerEvents: "auto", background: idx === 0 ? "#f2f2f2" : "#fff", color: idx === 0 ? "#999" : "#4a4a4a", border: "1px solid #d0d0d0", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: idx === 0 ? "not-allowed" : "pointer" }}
              >
                Back
              </button>
            )}
            {idx < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
                style={{ pointerEvents: "auto", background: "#7b1e1e", color: "#fff", border: "1px solid #6b1a1a", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  logUIEvent("guide_done", { page: window.location.pathname, sectionKey });
                  closeTour();
                }}
                style={{ pointerEvents: "auto", background: "#7b1e1e", color: "#fff", border: "1px solid #6b1a1a", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
              >
                Done
              </button>
            )}
            <button
              type="button"
              title="Close guide"
              onClick={() => {
                logUIEvent("guide_close", { page: window.location.pathname, sectionKey });
                setIsOpen(false); onClose && onClose();
              }}
              style={{ pointerEvents: "auto", background: "#fff", color: "#444", border: "1px solid #c0c0c0", borderRadius: 88, padding: "5px 8px", fontSize: 12, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================
   Utility + Base adf  Component
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
 */
export default function ChapterGalleryBase({
  rawData,
  basePath,
  titleBase,
  sectionKey,
  galleryKey,
  initialImageId
}) {
  const sectionUrl = findSectionUrl(basePath);

  // Load series registry on mount (for Chronicle/Legend data)
  const [seriesRegistry, setSeriesRegistry] = useState(null);
  useEffect(() => {
    loadSeriesRegistry().then(setSeriesRegistry);
  }, []);

  // Edition context for SEO uniqueness - use basePath for SSR-safe initial render
  const [clientPath, setClientPath] = useState((basePath || "").toLowerCase());
  useEffect(() => {
    setClientPath(window.location.pathname.toLowerCase());
  }, []);
  const path = clientPath;
  const isBW = path.includes("/black-white/");
  const editionTag = isBW ? "Black and White" : "Color";
  const isEngrainedSeries = basePath && basePath.includes("Engrained");

  // Generate appropriate title for the section landing page
  const getSectionDisplayTitle = (url) => {
    const parts = url.split('/').filter(p => p);
    
    // Handle Landscapes sections
    if (url.includes('/Landscapes/')) {
      if (url.includes('/By-Location')) {
        return 'Landscapes By Location';
      }
      if (url.includes('/By-Theme')) {
        return 'Landscapes By Theme';
      }
      return 'Landscapes';
    }
    
    // Handle Facing History sections
    if (url.includes('/Facing-History/')) {
      const historyIndex = parts.findIndex(p => p === 'Facing-History');
      if (historyIndex !== -1 && parts.length > historyIndex + 1) {
        const section = parts[historyIndex + 1];
        if (parts.length > historyIndex + 2) {
          const subsection = parts[historyIndex + 2];
          // Map subsection codes to display names
          const subsectionNames = {
            'War': 'Art of War',
            'Machines': 'Men & Machines',
            'Portraits': 'Portraits'
          };
          const displaySubsection = subsectionNames[subsection] || subsection.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `${section.toUpperCase()}: ${displaySubsection}`;
        }
        return section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    
    // Default: use the last part with title case
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const sectionDisplayTitle = getSectionDisplayTitle(sectionUrl);
  
  const altText = `${sectionDisplayTitle} – Painterly Fine Art Photography by Wayne Heim`;
  const titleText = altText;
  // Filter out ghost + hidden items
  const isGhost  = (e) => e && e.id === "i-k4studios";
  const isHidden = (e) => e?.visibility === "hidden" || e?.show === false || e?.hidden === true;

  // Check for theme filter in URL query params - hydration-safe
  const [themeSlug, setThemeSlug] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setThemeSlug(params.get("theme"));
  }, []);

  // Look up the theme name from the themes registry
  const activeTheme = useMemo(() => {
    if (!themeSlug) return null;
    return themes.find(t => t.slug === themeSlug) || null;
  }, [themeSlug]);

  // Strip theme param from URL immediately after processing (SEO: prevents duplicate content)
  // BUT: preserve params if ?view=grid is present (shared theme links need to survive refresh)
  useEffect(() => {
    if (typeof window === "undefined" || !themeSlug) return;
    const url = new URL(window.location.href);
    // If this is a shared theme link (?view=grid), keep the params for refresh support
    if (url.searchParams.get("view") === "grid") return;
    // Otherwise, strip theme param for SEO
    if (url.searchParams.has("theme")) {
      url.searchParams.delete("theme");
      window.history.replaceState({}, "", url.pathname + url.hash);
    }
  }, [themeSlug]);

  // Helper to clear theme filter
  const clearThemeFilter = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("theme");
      window.location.href = url.toString();
    }
  };

  const galleryData = useMemo(() => {
    const arr = Array.isArray(rawData) ? rawData : [];
    let filtered = arr
      .filter((e) => e && !isGhost(e) && !isHidden(e));
    
    // If theme filter is active, filter to only images with that theme
    if (themeSlug) {
      filtered = filtered
        .filter((e) => e.themes && typeof e.themes[themeSlug] !== "undefined")
        .sort((a, b) => {
          // Sort by theme order value (the number stored in themes[slug])
          const orderA = a.themes?.[themeSlug] ?? 9999;
          const orderB = b.themes?.[themeSlug] ?? 9999;
          return orderA - orderB;
        });
    } else {
      // Default sort by sortOrder
      filtered = filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    
    return filtered;
  }, [rawData, themeSlug]);

  // 🚨 ADD THIS LINE:

  useImageFallbackRedirect(galleryData);

  // Prevent SSR/CSR errors: if the imageId in the URL is invalid, render nothing and let the hook redirect
  let imageIdFromUrl = null;
  if (typeof window !== "undefined") {
    const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)$/);
    imageIdFromUrl = match ? match[1] : null;
  }
  const isImageDetail = !!imageIdFromUrl;
  const foundImage = !isImageDetail || galleryData.some(e => e && e.id === imageIdFromUrl);
  if (isImageDetail && !foundImage) {
    // Don't render image-dependent UI, let the hook redirect
    return null;
  }

  // Auto-enter chapters if URL has image ID or ?view=grid (shared theme links)
  const [hasEnteredChapters, setHasEnteredChapters] = useState(() => {
    if (typeof window !== "undefined") {
      // Enter immediately if viewing a specific image
      if (/\/(i-[a-zA-Z0-9_-]+)/.test(window.location.pathname)) return true;
      // Enter immediately if ?view=grid is present (shared theme link)
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "grid") return true;
    }
    return false;
  });
  // SSR-safe initial index: match initialImageId or URL
  const initialIndex = (() => {
    if (!galleryData.length) return 0;
    // Try to match URL first (SSR: window is undefined)
    let idFromURL = undefined;
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)$/);
      idFromURL = match ? match[1] : undefined;
    }
    const idToFind = idFromURL || initialImageId;
    if (idToFind) {
      const idx = galleryData.findIndex((e) => e.id === idToFind);
      if (idx !== -1) return idx;
    }
    return 0;
  })();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  // Support ?view=grid URL param to force grid view (for shared theme links)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get("view");
      // Only override to grid if explicitly requested via URL
      return urlView === "grid" ? "grid" : "flip";
    }
    return "flip";
  });
  const [isZoomed, setIsZoomed] = useState(false);
  const [showArrowHint, setShowArrowHint] = useState(false);
  const [matColor, setMatColor] = useState("white");
  const [showMiniMenu, setShowMiniMenu] = useState(false);
  const [showArrows, setShowArrows] = useState(true);

    // Event counters for batching UI actions
    const [eventCounts, setEventCounts] = useState({
      next: 0,
      grid: 0,
      zoom: 0,
      like: 0,
      slideshow: 0,
      share: 0,
      prev: 0,
      exit: 0
    });

  // Sister link logic - use state to avoid SSR/client mismatch
  const currentImageId = galleryData[currentIndex]?.id;
  const [sisterMatch, setSisterMatch] = useState(() => {
    // Initial render: only use sitemapMatches (deterministic, same on server & client)
    return sitemapMatches.find(m => m.a.includes(currentImageId)) || null;
  });

  // Update sisterMatch on client when currentImageId changes (includes window.location fallback)
  useEffect(() => {
    let match = sitemapMatches.find(m => m.a.includes(currentImageId));
    
    // Fallback: link to sister gallery (Color <-> Black-White)
    if (!match && typeof window !== 'undefined') {
      const currentPath = window.location.pathname.replace(/\/$/, '');
      let sisterPath = currentPath;
      if (currentPath.includes('/Color/')) {
        sisterPath = currentPath.replace('/Color/', '/Black-White/');
      } else if (currentPath.includes('/Black-White/')) {
        sisterPath = currentPath.replace('/Black-White/', '/Color/');
      }
      if (sisterPath !== currentPath) {
        match = { b: `https://www.k4studios.com${sisterPath}` };
      }
    }
    
    setSisterMatch(match || null);
    console.log('Sister link debug:', { currentImageId, sisterMatch: !!match });
  }, [currentImageId]);

  const anchorTexts = ["See more painterly photography", "Explore traditional fine art photography", "Discover related images", "View similar artwork", "Browse additional pieces", "Check out more fine art", "Find related photography", "Explore more images", "Enjoy more of Wayne's work", "Discover more art", "Explore Wayne Heim's portfolio", "Discover more artistic pieces", "View additional fine art", "Browse related works", "See more from this series"];
  const hash = currentImageId ? currentImageId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) : 0;
  const anchorIndex = Math.abs(hash) % anchorTexts.length;
  const anchorText = anchorTexts[anchorIndex];
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showStoryShow, setShowStoryShow] = useState(false);
  const [showCollectorHint, setShowCollectorHint] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSeriesOrderModal, setShowSeriesOrderModal] = useState(false);
  const [showSeriesInfoPopup, setShowSeriesInfoPopup] = useState(false);
  const [seriesInfoScrollTo, setSeriesInfoScrollTo] = useState(null);
  const [showEngrainedInfoPopup, setShowEngrainedInfoPopup] = useState(false);

  const prevIndex = useRef(currentIndex);
  const notesBtnRef = useRef(null);

  const tourOpen = () =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-k4tour-open") === "1";

  // Nav handlers
  const goPrev = (e) => {
    e?.stopPropagation();
    if (tourOpen()) return;
    setIsExpanded(false);
    setCurrentIndex((i) => {
      const newIndex = Math.max(i - 1, 0);
      setEventCounts((counts) => ({ ...counts, prev: counts.prev + 1 }));
      return newIndex;
    });
  };
  const goNext = (e) => {
    e?.stopPropagation();
    if (tourOpen()) return;
    setIsExpanded(false);
    setCurrentIndex((i) => {
      const newIndex = Math.min(i + 1, galleryData.length - 1);
      setEventCounts((counts) => ({ ...counts, next: counts.next + 1 }));
      return newIndex;
    });
  };
  const goGrid = (e) => {
    e?.stopPropagation();
    if (tourOpen()) return;
    setViewMode("grid");
    setEventCounts((counts) => ({ ...counts, grid: counts.grid + 1 }));
  };
  const goExit = (e) => { e?.stopPropagation(); if (tourOpen()) return; if (basePath) window.location.href = basePath; };

  // Enter chapters
  useEffect(() => {
    const handleEnterChapters = () => setHasEnteredChapters(true);
    window.addEventListener("enterChapters", handleEnterChapters);
    return () => window.removeEventListener("enterChapters", handleEnterChapters);
  }, []);

  // Initial index
  useEffect(() => {
    if (!galleryData.length) return;
    const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)$/);
    const idFromURL = match ? match[1] : initialImageId;
    if (idFromURL) {
      const idx = galleryData.findIndex((e) => e.id === idFromURL);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialImageId, galleryData.length]);

  // Auto-enter
  useEffect(() => {
    if (/\/(i-[a-zA-Z0-9_-]+)/.test(window.location.pathname)) setHasEnteredChapters(true);
  }, []);

  // Auto-enter and hide intro for shared theme links (?view=grid)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "grid") {
      // Force enter chapters and hide intro sections
      setHasEnteredChapters(true);
      const header = document.getElementById("header-section");
      const intro = document.getElementById("intro-section");
      const chapter = document.getElementById("chapter-section");
      if (header) header.classList.add("section-hidden");
      if (intro) intro.classList.add("section-hidden");
      if (chapter) {
        chapter.style.display = "block";
        chapter.classList.remove("section-hidden");
        chapter.classList.add("section-visible");
      }
    }
  }, []);

  // Push URL (but not when in grid view via URL param - shared theme links stay on grid)
  useEffect(() => {
    const imageId = galleryData[currentIndex]?.id;
    const alreadyOnImage = /\/i-[a-zA-Z0-9_-]+$/.test(window.location.pathname);
    // Don't push URL when viewing grid via ?view=grid (shared theme links)
    if (viewMode === "grid") return;
    if (!imageId || (!hasEnteredChapters && !alreadyOnImage) || !basePath) return;
    const newUrl = `${basePath}/${imageId}`;
    if (window.location.pathname !== newUrl) window.history.pushState(null, "", newUrl);
  }, [currentIndex, hasEnteredChapters, basePath, galleryData, viewMode]);

  // ✅ Replaced old title updater with the hook
  const entry = galleryData[currentIndex];
  useMetaSwap(entry, titleBase, currentIndex);

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

  // Collector Notes attention hint
  useEffect(() => {
    const collectorState = sessionStorage.getItem("collectorHintShown") || "0";
    const pageViews = parseInt(sessionStorage.getItem("pageViews") || "0", 10);
    const hasNotes = galleryData[currentIndex]?.notes?.trim();

    if (collectorState === "0" && pageViews < 4 && hasNotes && !showNotes && !tourOpen()) {
      const timer = setTimeout(() => {
        setShowCollectorHint(true);
      }, 1250); // 1.25 seconds delay
      return () => clearTimeout(timer);
    } else {
      setShowCollectorHint(false);
    }
  }, [currentIndex, galleryData, showNotes, tourOpen()]);

  // Increment page views on index change
  useEffect(() => {
    let views = parseInt(sessionStorage.getItem("pageViews") || "0", 10);
    views++;
    sessionStorage.setItem("pageViews", views.toString());
  }, [currentIndex]);

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

  // Inactivity/session-end logging
  const eventCountsRef = useRef(eventCounts);
  eventCountsRef.current = eventCounts;
  
  useEffect(() => {
    let inactivityTimer;
    let heartbeatInterval;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
    const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes - periodic flush for Safari/mobile reliability

    // Regular flush (inactivity timeout) - uses normal fetch
    const logAndResetEvents = () => {
      const counts = eventCountsRef.current;
      const hasAnyEvents = Object.values(counts).some(c => c > 0);
      if (!hasAnyEvents) return;
      
      Object.entries(counts).forEach(([eventType, count]) => {
        if (count > 0) {
          logUIEvent(eventType, {
            page: window.location.pathname,
            count
          }, false); // use fetch
        }
      });
      setEventCounts({ next: 0, grid: 0, zoom: 0, like: 0, slideshow: 0, share: 0, prev: 0, exit: 0 });
    };

    // Exit flush (beforeunload/visibilitychange) - uses sendBeacon for reliable delivery
    const logAndResetEventsBeacon = () => {
      const counts = eventCountsRef.current;
      const hasAnyEvents = Object.values(counts).some(c => c > 0);
      if (!hasAnyEvents) return;
      
      Object.entries(counts).forEach(([eventType, count]) => {
        if (count > 0) {
          logUIEvent(eventType, {
            page: window.location.pathname,
            count
          }, true); // use sendBeacon
        }
      });
      setEventCounts({ next: 0, grid: 0, zoom: 0, like: 0, slideshow: 0, share: 0, prev: 0, exit: 0 });
    };

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(logAndResetEvents, INACTIVITY_LIMIT);
    };

    // Reset timer on any click or keydown
    const activityHandler = () => resetTimer();
    window.addEventListener("click", activityHandler);
    window.addEventListener("keydown", activityHandler);

    // Log on tab close or hide - use beacon for guaranteed delivery
    window.addEventListener("beforeunload", logAndResetEventsBeacon);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") logAndResetEventsBeacon();
    });

    // Periodic heartbeat flush - catches Safari/iOS edge cases where visibilitychange
    // or beforeunload may not fire reliably (e.g., force-quit, PWA, background tab kill)
    heartbeatInterval = setInterval(() => {
      const counts = eventCountsRef.current;
      const hasAnyEvents = Object.values(counts).some(c => c > 0);
      if (hasAnyEvents) {
        logAndResetEvents();
      }
    }, HEARTBEAT_INTERVAL);

    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      clearInterval(heartbeatInterval);
      window.removeEventListener("click", activityHandler);
      window.removeEventListener("keydown", activityHandler);
      window.removeEventListener("beforeunload", logAndResetEventsBeacon);
      // Note: anonymous visibilitychange handler can't be removed, but it's harmless
    };
  }, []); // Empty deps - use ref to access current counts

  const direction = currentIndex > prevIndex.current ? 1 : -1;
  prevIndex.current = currentIndex;

  const currentId = galleryData[currentIndex]?.id;
  const [tourOpenNonce, setTourOpenNonce] = useState(0);

  // Add this near other useState/useEffect hooks inside ChapterGalleryBase
  const [showThemePopover, setShowThemePopover] = useState(false);
  useEffect(() => {
    const handler = () => setShowThemePopover(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div
      className="min-h- bg-white text-black font-serif px-5 py-2 md:py-8 overflow-x-hidden"
      style={{ fontFamily: "Glegoo, serif", maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}
      onMouseMove={() => setShowArrows(true)}
    >
      {/* 
        NOTE: SEO meta tags (<meta>, <link>, <script type="application/ld+json">) 
        are handled by BaseLayout.astro in <head>. DO NOT render them here in React -
        it causes hydration mismatches (React Error #418) because:
        1. They're invalid inside <body>
        2. Middleware may strip them, breaking React's expected DOM
        3. They duplicate what's already in <head>
      */}

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
              <>
              {/* Mobile Top Toolbar - Outside the motion.div */}
              {isMobile && (
                <div
                  className="relative flex items-center justify-between rounded-xl shadow-sm px-3 py-1.5 sm:hidden"
                  style={{ 
                    width: 'calc(100vw - 2.5rem)', 
                    maxWidth: 'calc(100vw - 2.5rem)',
                    backgroundColor: '#6b5e54',
                    margin: '0 auto 0.35rem auto'
                  }}
                >
                  {/* Left: Menu */}
                  <button
                    type="button"
                    className="flex items-center justify-center w-7 h-7 text-gray-200 text-lg transition-colors duration-150 hover:text-white"
                    aria-label="Show Menu"
                    title="Show Menu"
                    style={{ fontWeight: 400 }}
                    onClick={(e) => { e.stopPropagation(); setShowMiniMenu(true); }}
                    data-menu-btn-top
                  >
                    ☰
                  </button>

                  {/* Count - positioned at 25% (halfway between left edge and center) */}
                  <div 
                    className="absolute text-sm text-gray-300 font-medium whitespace-nowrap" 
                    style={{ left: '25%', transform: 'translateX(-50%)', letterSpacing: "-0.05em", opacity: 0.5 }}
                  >
                    {`${currentIndex + 1}/${galleryData.length}`}
                  </div>

                  {/* Center: K4 Studios */}
                  <a
                    href="/"
                    title="K4 Studios Home"
                    className="text-base font-semibold no-underline hover:underline absolute left-1/2 -translate-x-1/2"
                    style={{ color: '#ffffff', fontFamily: "'Glegoo', serif", letterSpacing: '0.1em', opacity: 0.5 }}
                  >
                    K4 Studios
                  </a>

                  {/* Right: Exit */}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-6 h-6 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    aria-label="Exit Chapter View"
                    title="Exit Viewer"
                    onClick={goExit}
                    data-exit-btn-top
                  >
                    <CircleX className="w-5 h-5" />
                  </button>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: direction > 0 ? 150 : -150 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -150 : 150 }}
                  transition={{ duration: 0.6, ease: [0.45, 0, 0.55, 1] }}
                  className="flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-start justify-center md:min-h-[75vh]"
                  {...swipeHandlers}
                  data-image-id={currentId}
                >

                  {/* IMAGE + ARROWS COLUMN */}
                  <div
                    className="flex flex-col items-center relative chapter-image-container-mobile"
                    style={{ marginTop: !isMobile ? '2rem' : 0, width: 'fit-content', ...(isMobile ? { maxWidth: '100%', overflowX: 'hidden', width: '100%' } : {}) }}
                  >

                    <div className="w-full relative flex items-center justify-center mb-0 chapter-image-container-mobile" style={isMobile ? { maxWidth: '100%', overflowX: 'hidden' } : {}}>
                      {/* Removed absolute-positioned mobile arrows; moved to row near slideshow */}

                      <div className="relative flex flex-row justify-center chapter-image-container-mobile" style={isMobile ? { maxWidth: '100%', overflowX: 'hidden', width: '100%' } : { maxWidth: '575px', width: 'fit-content' }}> 
                        {/* Image container with absolutely positioned collector notes button outside/right of image edge */}
                        <div
                          className="relative flex justify-center items-center chapter-image-container-mobile"
                          style={{ width: 'fit-content', maxWidth: '100%', margin: '0 auto' }}
                        >
                          <img
                            src={galleryData[currentIndex]?.src}
                            alt={galleryData[currentIndex]?.alt || galleryData[currentIndex]?.title}
                            className="chapter-image-mobile rounded-lg block"
                            style={
                              (() => {
                                const img = galleryData[currentIndex];
                                const isLandscape = img && img.width > img.height;
                                if (isMobile) {
                                  return {
                                    cursor: "zoom-in",
                                    maxWidth: "calc(100vw - 2.5rem)",
                                    width: "auto",
                                    height: "auto",
                                    maxHeight: "65vh",
                                    border: '1px solid rgba(120,120,120,0.30)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                  };
                                }
                                return {
                                  cursor: "zoom-in",
                                  maxWidth: isLandscape ? "550px" : "100%",
                                  width: "auto",
                                  height: "auto",
                                  maxHeight: "70vh",
                                  transition: 'box-shadow .3s ease',
                                  border: '1px solid rgba(110,110,110,0.28)',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.10)'
                                };
                              })()
                            }
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            onContextMenu={(e) => e.preventDefault()}
                            onClick={() => {
                              if (!isLandscapeMobile) {
                                setIsZoomed(true);
                                setEventCounts((counts) => ({ ...counts, zoom: counts.zoom + 1 }));
                              }
                            }}
                            data-zoom-btn
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
                          {/* Desktop Collector Notes button absolutely positioned outside/right of image edge */}
                          {!isMobile && galleryData[currentIndex]?.notes?.trim() && (
                            <button
                              ref={notesBtnRef}
                              type="button"
                              data-notes-btn
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowNotes((p) => !p);
                                setEventCounts((counts) => ({ ...counts, notes: (counts.notes || 0) + 1 }));
                                sessionStorage.setItem("collectorHintShown", "1");
                                setShowCollectorHint(false);
                              }}
                              aria-label="View Collector Notes"
                              title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                              className={`desktop-only-element absolute top-2 right-3 w-8 h-9 border border-gray-300 bg-white text-gray-400 rounded-md shadow hover:bg-gray-200 transition z-30 flex items-center justify-center ${showCollectorHint ? 'collector-hint-ring' : ''}`}
                              style={{ boxShadow: "0 2px 6px rgba(80,60,30,0.10)", transform: "translateX(50px)" }}
                            >
                              {showNotes ? (
                                <span className="text-lg text-red-600 leading-none">✕</span>
                              ) : (
                                <>
                                  <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
                                  <Notebook className="w-6 h-6 stroke-[1.75]" style={{ color: '#9bb69eff' }} />
                                </>
                              )}
                            </button>
                          )}

                          {/* Desktop Series Icons - stacked below collector notes button */}
                          {!isMobile && (() => {
                            const currentImage = galleryData[currentIndex];
                            
                            // For Engrained gallery: show only Engrained icon, clicking opens Engrained info modal
                            if (isEngrainedSeries) {
                              const hasNotes = currentImage?.notes?.trim();
                              const topOffset = hasNotes ? '56px' : '8px';
                              const engrainedDef = SERIES_DEFINITIONS.engrained;
                              
                              return (
                                <div
                                  className="desktop-only-element absolute right-3 flex flex-col gap-0.5 z-30"
                                  style={{ transform: "translateX(50px)", top: topOffset }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      logUIEvent("series_info", { page: window.location.pathname, series: "engrained" });
                                      setShowEngrainedInfoPopup(true);
                                    }}
                                    title="Engrained Series Member — Click for details"
                                    className="w-8 h-8 flex items-center justify-center text-lg transition-all cursor-pointer hover:scale-110"
                                    style={{ color: "#b45309", opacity: 0.7 }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                  >
                                    {engrainedDef?.icon || SERIES_ICONS.engrained}
                                  </button>
                                </div>
                              );
                            }
                            
                            // For normal galleries: show standard series icons
                            const effectiveSeries = getEffectiveSeries(currentImage, seriesRegistry);
                            const displaySeries = effectiveSeries
                              .filter(s => SERIES_DEFINITIONS[s] && s !== "engrained")
                              .sort((a, b) => (SERIES_DEFINITIONS[a].sortOrder || 99) - (SERIES_DEFINITIONS[b].sortOrder || 99));
                            
                            if (displaySeries.length === 0) return null;
                            
                            // Calculate top offset based on whether collector notes button exists
                            const hasNotes = currentImage?.notes?.trim();
                            const topOffset = hasNotes ? '56px' : '8px';
                            
                            return (
                              <div
                                className="desktop-only-element absolute right-3 flex flex-col gap-0.5 z-30"
                                style={{ transform: "translateX(50px)", top: topOffset }}
                              >
                                {displaySeries.map((seriesKey) => {
                                  const def = SERIES_DEFINITIONS[seriesKey];
                                  return (
                                    <button
                                      key={seriesKey}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        logUIEvent("series_info", { page: window.location.pathname, series: seriesKey });
                                        setSeriesInfoScrollTo(seriesKey);
                                        setShowSeriesInfoPopup(true);
                                      }}
                                      title={`${def.label} Series Member — Click for details`}
                                      className="w-8 h-8 flex items-center justify-center text-lg transition-all cursor-pointer hover:scale-110"
                                      style={{ color: "#3c83b3", opacity: 0.6 }}
                                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                    >
                                      {def.icon || SERIES_ICONS[seriesKey]}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                        {/* Desktop Collector Notes panel absolutely positioned 20px down from top, right-aligned to image container */}
                        {!isMobile && showNotes && galleryData[currentIndex]?.notes?.trim() && (
                          <AnimatePresence>
                            <motion.div
                              key="collector-notes-desktop"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.20, ease: [0.33, 1, 0.68, 1] }}
                              className="desktop-only-element w-96 border border-gray-300 rounded shadow-2xl p-5 text-sm text-gray-800"
                              style={{
                                position: 'absolute',
                                zIndex: 100000,
                                top: '46px',
                                right: '-390px',
                                willChange: 'opacity',
                                backgroundColor: '#cdd1c5ff',
                                border: '1px solid rgba(151, 153, 156, 1)',
                                minWidth: '260px',
                                maxWidth: '90vw'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <strong style={{ color: '#fff', textShadow: '0 1px 2px #444', fontWeight: 'bold', marginRight: '0.75em', fontSize: '1em' }}>
                                  Collector Notes:
                                </strong>
                                <span style={{ flex: 1, marginTop: '4px', height: '2px', marginLeft: '0.5em', borderRadius: '2px', background: 'linear-gradient(to right, #fff 65%, rgba(255,255,255,0))', filter: 'drop-shadow(0 1px 2px #444)' }} />
                              </div>
                              {galleryData[currentIndex].notes.split('\n\n').map((para, idx) => (
                                <p key={idx} className="mb-3 last:mb-0">{para}</p>
                              ))}
                            </motion.div>
                          </AnimatePresence>
                        )}
                      </div>

                      {/* Removed absolute-positioned mobile arrows; moved to row near slideshow */}
                    </div>

                    {/* Unified Nav Row + Guide trigger */}
                    <div className={`flex items-center justify-center gap-2 mb-1 ${isMobile ? 'mt-2' : 'mt-4'}`}>
                      {/* Toolbar */}
                      <div
                        className={
                          `flex items-center gap-1 md:gap-6 mx-auto rounded-xl shadow-sm px-3 py-1 select-none ` +
                          (isMobile ? ' w-full' : ' bg-white max-w-[1300px]')
                        }
                        style={isMobile ? { width: 'calc(100vw - 2.5rem)', maxWidth: 'calc(100vw - 2.5rem)', minWidth: 0, justifyContent: 'space-between', border: '1px solid rgba(107, 94, 84, 0.1)', backgroundColor: 'rgba(240, 238, 233, 0.85)' } : { maxWidth: '1300px', minWidth: 0, justifyContent: 'space-evenly', border: '1px solid #e5e7eb' }}
                      >
                        {/* Menu - Desktop only */}
                      {!isMobile && (
                        <button
                          type="button"
                          className="flex items-center justify-center w-7 h-7 text-gray-500 text-lg transition-colors duration-150 hover:text-gray-700 border border-gray-200 hover:bg-gray-100 bg-white rounded-full shadow-sm hover:border-red-200 hover:border-gray-300 focus:border-gray-300"
                          aria-label="Show Menu"
                          title="Show Menu"
                          style={{ fontWeight: 400 }}
                          onClick={(e) => { e.stopPropagation(); setShowMiniMenu(true); }}
                          data-menu-btn
                        >
                          ☰
                        </button>
                      )}

                      {/* Notes (mobile) - First item on mobile */}
                      {galleryData[currentIndex]?.notes && isMobile && (
                        <button
                          ref={notesBtnRef}
                          type="button"
                          data-notes-btn
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNotes((p) => !p);
                            sessionStorage.setItem("collectorHintShown", "1");
                            setShowCollectorHint(false);
                            logUIEvent("collector_notes_toggle", {
                              page: window.location.pathname,
                              imageId: galleryData[currentIndex]?.id,
                              notesVisible: !showNotes
                            });
                          }}
                          aria-label="View Collector Notes"
                          title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                          className={`inline-flex items-center justify-center w-8 h-8 relative border border-gray-200 bg-white rounded-full shadow text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors ${showCollectorHint ? 'collector-hint-ring' : ''}`}
                        >
                          {showNotes ? (
                            <span className="text-lg leading-none">✕</span>
                          ) : (
                            <>
                              <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
                              <Notebook className="w-5 h-5 stroke-[1.75]" style={{ color: '#b91c1c' }} />
                            </>
                          )}
                        </button>
                      )}

                      {/* Gallery count - Desktop only */}
                      {!isMobile && (
                        <div className="text-sm text-gray-400 font-medium flex items-center whitespace-nowrap" style={{ letterSpacing: "-0.085em" }} data-count>
                          {`${currentIndex + 1} – ${galleryData.length}`}
                        </div>
                      )}

                      {/* THEME FILTER STAR (Click-To-Toggle, No Hover Popover) */}
                      {activeTheme && (
                        <div className="relative ml-1" style={{ zIndex: 50 }}>
                          {/* STAR ICON */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowThemePopover((prev) => !prev);
                            }}
                            role="button"
                            aria-label="Clear Theme"
                            title="Clear Theme"
                            style={{
                              cursor: "pointer",
                              fontSize: "1.2rem",
                              color: "#d3a048",
                              transition: "filter 0.15s ease",
                              display: "inline-block",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = "drop-shadow(0 0 4px rgba(200,0,0,0.5))";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = "none";
                            }}
                          >
                            ★
                          </span>
                          {/* CLICK POPOVER */}
                          {showThemePopover && (
                            <div
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-700 px-3 py-2"
                              style={{
                                minWidth: "180px",
                                fontFamily: "'Glegoo', serif",
                                zIndex: 999,
                                textAlign: "center",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="font-semibold text-amber-700 mb-1">
                                Filtered View
                              </div>
                              <div className="mb-2">
                                Viewing: <strong>{activeTheme.name}</strong>
                              </div>
                              <button
                                type="button"
                                className="px-3 py-1 border border-gray-300 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                                onClick={() => {
                                  clearThemeFilter();
                                  setShowThemePopover(false);
                                }}
                              >
                                View Full Gallery
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Jump form - Second on mobile */}
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
                        className="flex items-center gap-1 text-xs"
                        style={{ minWidth: 50 }}
                        data-jump-form
                      >
                        <input
                          type="text"
                          id="chapterNum"
                          name="chapterNum"
                          min="1"
                          max={galleryData.length}
                          placeholder={isMobile ? "Jump to #" : "#"}
                          className="w-20 border border-gray-200 rounded px-1 py-1 text-center"
                          style={{ fontSize: "1.0em" }}
                        />
                        <button 
                          type="submit" 
                          className="bg-gray-100 px-1 py-1 text-gray-400 border border-gray-300 rounded shadow hover:border-red-200 hover:text-gray-500 hover:bg-gray-100 text-xs"
                          aria-label="Jump to image number"
                          title="Jump to image"
                        >
                          {isMobile ? "Go" : "➜"}
                        </button>
                      </form>

                      {/* Grid icon (mobile) - Third on mobile */}
                      <button
                        type="button"
                        onClick={goGrid}
                        aria-label="View Grid Mode"
                        title="View Grid Mode"
                        className="md:hidden flex items-center justify-center gap-1 transition-colors"
                        data-grid-btn
                      >
                        <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
                        <span className="text-xs" style={{ color: "#84766d", opacity: 0.5 }}>All</span>
                      </button>

                      {/* ❤️ Like Button - Fourth on mobile */}
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white shadow hover:bg-gray-100 transition-colors hover:border-red-200" data-like-btn>
                        <LikeButton imageId={galleryData[currentIndex]?.id} pageTitle={galleryData[currentIndex]?.title} />
                      </div>

                      {/* Cart - Fifth on mobile */}
                      {isEngrainedSeries ? (
                        <button
                          data-cart-btn
                          title="Click to see pricing"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shadow transition border border-gray-300 hover:border-red-200"
                          style={{ backgroundColor: "#bbb6b1", color: "#ffffff" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#76807b")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#bbb6b1")}
                          onClick={() => {
                            setShowPricingModal(true);
                            logUIEvent("order_clicked", {
                              page: window.location.pathname,
                              imageId: galleryData[currentIndex]?.id,
                              series: "engrained"
                            });
                          }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          data-cart-btn
                          title="Click to see order options"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shadow transition border border-gray-300 hover:border-red-200"
                          style={{ backgroundColor: "#bbb6b1", color: "#ffffff" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#76807b")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#bbb6b1")}
                          onClick={() => {
                            setShowSeriesOrderModal(true);
                            logUIEvent("order_clicked", {
                              page: window.location.pathname,
                              imageId: galleryData[currentIndex]?.id,
                              series: "standard"
                            });
                          }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      )}

                      {/* Exit - Desktop only (mobile exit is in top bar) */}
                      {!isMobile && (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-300 rounded-full shadow-sm hover:bg-gray-700 hover:text-gray-200 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer"
                          aria-label="Exit Chapter View"
                          title="Exit Viewer"
                          style={{ position: 'relative', zIndex: 20 }}
                          onClick={goExit}
                          data-exit-btn
                        >
                          <CircleX className="w-7 h-7" />
                        </button>
                      )}
                      </div>
                      {/* Desktop-only Guide button to the right of the toolbar */}
                      {!isMobile && (
                        <button
                          type="button"
                          onClick={() => { logUIEvent("guide_open", { page: window.location.pathname, sectionKey }); setTourOpenNonce(n => n + 1); }}
                          className="hidden md:inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white border border-gray-200 hover:border-red-300 shadow-sm transition-colors"
                          title="View our brief guided walk-through of all the features of our gallery viewer."
                          aria-label="Open Guide"
                        >
                          <span className="text-sm font-medium text-gray-500">Guide</span>
                        </button>
                      )}
                    </div>

                    {/* Mobile Series Icons - row below toolbar, above Play Show */}
                    {isMobile && (() => {
                      const currentImage = galleryData[currentIndex];
                      const effectiveSeries = getEffectiveSeries(currentImage, seriesRegistry);
                      const displaySeries = effectiveSeries
                        .filter(s => SERIES_DEFINITIONS[s] && s !== "engrained")
                        .sort((a, b) => (SERIES_DEFINITIONS[a].sortOrder || 99) - (SERIES_DEFINITIONS[b].sortOrder || 99));
                      
                      if (displaySeries.length === 0) return null;
                      
                      return (
                        <div className="flex items-center justify-center my-2 md:hidden">
                          {/* Icons container with relative positioning for label */}
                          <div className="relative flex items-center gap-4">
                            {/* Series label - anchored to left of icons container */}
                            <span 
                              className="absolute text-xs font-medium whitespace-nowrap"
                              style={{ right: '100%', marginRight: '8px', color: '#3c83b3', opacity: 0.5 }}
                            >
                              Series <span className="font-bold">:</span>
                            </span>
                            {displaySeries.map((seriesKey, index) => {
                              const def = SERIES_DEFINITIONS[seriesKey];
                              return (
                                <div key={seriesKey} className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      logUIEvent("series_info", { page: window.location.pathname, series: seriesKey });
                                      setSeriesInfoScrollTo(seriesKey);
                                      setShowSeriesInfoPopup(true);
                                    }}
                                    title={`${def.label} Series Member`}
                                    className="text-lg p-1 transition-opacity"
                                    style={{ color: "#3c83b3", opacity: 0.7 }}
                                  >
                                    {def.icon || SERIES_ICONS[seriesKey]}
                                  </button>
                                  {index < displaySeries.length - 1 && (
                                    <span className="text-gray-300 text-sm ml-4">|</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {!showStoryShow && (
                      isMobile ? (
                        // Mobile: arrows flanking slideshow button
                        <div className="my-1 md:hidden flex items-center justify-center gap-3" data-image-id={currentId}>
                          <button
                            type="button"
                            onClick={goPrev}
                            aria-label="Previous Chapter"
                            title="Previous"
                            className="w-10 h-10 rounded-full bg-white  flex items-center justify-center active:scale-[0.98]"
                            style={{ borderColor: "#ffffffff" }}
                            data-prev-btn
                          >
                            <SquareChevronLeft className="w-6 h-6" style={{ color: "#bdb5aeff" }} />
                            <span className="sr-only">Previous</span>
                          </button>

                          <div className="relative inline-flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                logUIEvent("slideshow_start", { page: window.location.pathname });
                                if (!tourOpen()) {
                                  setShowStoryShow(true);
                                  setEventCounts((counts) => ({ ...counts, slideshow: counts.slideshow + 1 }));
                                }
                              }}
                              aria-label="Play K4 Slideshow"
                              title="Play K4 Story Show"
                              className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 h-8 border shadow-sm"
                              style={{
                                backgroundColor: "#f5f3eeff",
                                borderColor: "#e3d5c9",
                                color: "#7b1e1e",
                                letterSpacing: ".02em"
                              }}
                              data-slideshow-btn
                            >
                              <span className="inline-flex items-center justify-center w-3 h-3" style={{ color: "#7b1e1e" }}>
                                ▶
                              </span>
                              <span className="text-xs font-semibold">Slideshow</span>
                            </button>
                            
                          </div>

                          <button
                            type="button"
                            onClick={goNext}
                            aria-label="Next Chapter"
                            title="Next"
                            className="w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-[0.98]"
                            style={{ borderColor: "#c5d1c8ff" }}
                            data-next-btn
                          >
                            <SquareChevronRight className="w-6 h-6" style={{ color: "#bdb5aeff" }} />
                            <span className="sr-only">Next</span>
                          </button>
                        </div>
                      ) : (
                        // Desktop: keep standalone slideshow button with theme star indicator
                        <div className="relative inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              logUIEvent("slideshow_start", { page: window.location.pathname });
                              if (!tourOpen()) {
                                setShowStoryShow(true);
                                setEventCounts((counts) => ({ ...counts, slideshow: counts.slideshow + 1 }));
                              }
                            }}
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
                          
                        </div>
                      )
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
        style={{ backgroundColor: "#cfd1c8ff", border: "1px solid rgb(109, 111, 114)", maxWidth: "98vw", boxSizing: "border-box", position: "relative" }}
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
        {/* Close button in lower right corner */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowNotes(false); }}
          aria-label="Close Collector Notes"
className="absolute bottom-3 right-3 w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#b91c1c] text-[#b91c1c] shadow-lg"
                            style={
                              isMobile
                                ? { cursor: "zoom-in", maxWidth: "100%", width: "auto", height: "auto", objectFit: "contain", maxHeight: "65vh", border: '1px solid rgba(120,120,120,0.30)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                                : { cursor: "zoom-in", maxWidth: "1290px", width: "auto", height: "auto", objectFit: "contain", maxHeight: "92vh", background: "#f7f7f7", transition: 'box-shadow .3s ease', border: '1px solid rgba(110,110,110,0.28)', boxShadow: '0 2px 5px rgba(0,0,0,0.10)' }
                            }
        >
          <span className="text-1xl font-bold" style={{ color: "#b91c1c" }}>✕</span>
        </button>
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
                        
                       
                        
                      </div>
                    </div>

                    {/* Logo Watermark */}
                    <div className="mb-4 flex justify-center relative z-0 hidden md:flex">
                      <a
                        href={sectionUrl}
                        title={titleText}
                        className="relative block group"
                      >
                        <img
                          src="/images/K4Logo-web-b.jpg"
                          alt={altText}
                          className="h-16.5 mb-5 transition-opacity duration-300 group-hover:opacity-0 group-hover:pointer-events-none"
                          style={{ borderRadius: "50px", maxWidth: "160px", opacity: ".20" }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-center text-[#7a6a58] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-white rounded-full">
                          {sectionDisplayTitle}
                        </span>
                        <span className="sr-only">{sectionDisplayTitle}</span>
                      </a>
                    </div>

                    {/* Title */}
                    {(() => {
                      const chapterTitle = galleryData[currentIndex]?.meta?.ogTitle ||
                        galleryData[currentIndex]?.title ||
                        galleryData[currentIndex]?.alt ||
                        titleBase;
                      // Dynamic font size: shrink for long titles on mobile
                      const titleLength = chapterTitle?.length || 0;
                      const mobileTitleSize = titleLength > 40 ? '1.0rem' : titleLength > 30 ? '1.15rem' : '1.35rem';
                      return (
                        <h1
                          className="text-center font-semibold mb-1 tracking-wide text-[#85644b]"
                          style={{ fontSize: "1.55rem", opacity: 0.5, lineHeight: isMobile ? "1.0" : "1.35", fontFamily: "'Glegoo', serif" }}
                        >
                          Chapter {currentIndex + 1}:
                          <>
                            <br />
                            <span 
                              className="chapter-title"
                              style={isMobile ? { fontSize: mobileTitleSize } : {}}
                            >
                              {chapterTitle}
                            </span>
                          </>
                        </h1>
                      );
                    })()}

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
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const newExpanded = !isExpanded;
                              setIsExpanded(newExpanded);
                              if (newExpanded) {
                                logUIEvent("more_about_image_click", {
                                  page: window.location.pathname,
                                  imageId: galleryData[currentIndex]?.id,
                                  sectionKey
                                });
                              }
                            }}
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
                                <h2 className="text-lg font-semibold mb-2">More about this image</h2>
                                <p className="pb-2">{galleryData[currentIndex]?.description} — {getClosingSentence(sectionKey, galleryData[currentIndex]?.id)}</p>
                                {sisterMatch && (
                                  <div className="pt-2 text-sm">
                                    <a 
                                      href={sisterMatch.b.replace('https://www.k4studios.com', typeof window !== 'undefined' ? window.location.origin : 'https://www.k4studios.com')} 
                                      className="underline text-[#7b1e1e] hover:opacity-80"
                                      onClick={() => logUIEvent("sister_link_click", {
                                        page: window.location.pathname,
                                        imageId: galleryData[currentIndex]?.id,
                                        sectionKey,
                                        destination: sisterMatch.b,
                                        anchorText
                                      })}
                                    >
                                      {anchorText}
                                    </a>
                                  </div>
                                )}
                              </motion.div>
                            ) : (
                              <motion.div
                                key={`desc-${currentIndex}-desktop`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 12 }}
                                transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                                className="absolute left-1/2 bottom-0 z-50"
                                style={{ transform: "translateX(-50%) translateY(-8px)", marginLeft: "-275px", background: "#fff", border: "1.5px solid #d1d5d9", borderRadius: 16, boxShadow: "0 2px 12px rgba(80,80,90,0.10)", padding: ".95rem 1.5rem 3rem 1.5rem", color: "#4a4a49", minWidth: "340px", maxWidth: "75vw", minHeight: "4rem", maxHeight: "320px", overflowY: "auto" }}
                                id={descPanelId}
                                role="region"
                                aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                                aria-label="More information about this image"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                  aria-label="Close More Info"
                                  title="close"
                                  className="absolute bottom-3 left-3 inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-300 rounded-full shadow-sm hover:bg-gray-700 hover:text-gray-200 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer"
                                  style={{ zIndex: 10001 }}
                                >
                                  <CircleX className="w-7 h-7" />
                                </button>
                                {/* Collector Notes button next to close button */}
                                {galleryData[currentIndex]?.notes?.trim() && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowNotes(true);
                                      setIsExpanded(false);
                                      setTimeout(() => notesBtnRef.current?.focus(), 0);
                                      logUIEvent("collector_notes_toggle", {
                                        page: window.location.pathname,
                                        imageId: galleryData[currentIndex]?.id,
                                        notesVisible: true
                                      });
                                    }}
                                    aria-label="View Collector Notes"
                                    title="Open Collector Notes"
                                    className={`absolute bottom-3 left-14 inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-400 rounded-full shadow-sm hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer ${showCollectorHint ? 'collector-hint-ring' : ''}`}
                                    style={{ zIndex: 10001 }}
                                  >
                                    <span className="relative inline-flex items-center justify-center w-5 h-5">
                                      <span className="absolute left-3 top-0 text-[10px] text-red-600 font-semibold">*</span>
                                      <Notebook 
                                        className="w-5 h-5 stroke-[1.75] cursor-pointer" 
                                        style={{ color: '#9bb69eff' }}
                                        onMouseEnter={(e) => {
                                          const tooltip = e.currentTarget.parentElement.querySelector('.tooltip');
                                          if (tooltip) tooltip.style.opacity = '1';
                                        }}
                                        onMouseLeave={(e) => {
                                          const tooltip = e.currentTarget.parentElement.querySelector('.tooltip');
                                          if (tooltip) tooltip.style.opacity = '0';
                                        }}
                                      />
                                      {/* Hover tooltip: only shows when hovering the notebook icon */}
                                      <span className="tooltip absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                        View extra insight about this image
                                      </span>
                                    </span>
                                  </button>
                                )}
                                <h2 className="text-lg font-semibold mb-2">More about this image</h2>
                                <p className="pb-2">{galleryData[currentIndex]?.description} — {getClosingSentence(sectionKey, galleryData[currentIndex]?.id)}</p>
                                {sisterMatch && (
                                  <div className="pt-2 text-sm">
                                    <a 
                                      href={sisterMatch.b.replace('https://www.k4studios.com', typeof window !== 'undefined' ? window.location.origin : 'https://www.k4studios.com')} 
                                      className="underline text-[#7b1e1e] hover:opacity-80"
                                      onClick={() => logUIEvent("sister_link_click", {
                                        page: window.location.pathname,
                                        imageId: galleryData[currentIndex]?.id,
                                        sectionKey,
                                        destination: sisterMatch.b,
                                        anchorText
                                      })}
                                    >
                                      {anchorText}
                                    </a>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      );
                    })()}

                    {/* Bottom Separator */}
                    <div className="flex justify-center my-3">
                      <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                        
                       
                        
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
              </>
            )}

            {/* Mini Menu Drawer */}
            {showMiniMenu && (
              <div className="fixed top-0 right-0 h-full z-[9999] bg-white overflow-y-auto shadow-xl transition-all duration-300 w-[90vw] md:w-[50vw] lg:w-[25vw]">
                <MobileMiniDrawer
                  onClose={() => setShowMiniMenu(false)}
                  currentPage={galleryData[currentIndex]?.title?.trim()}
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
                // Pass theme info for shared theme links (grid header)
                themeName={activeTheme?.name || null}
                themeDescription={activeTheme?.description || null}
                themeImageCount={activeTheme ? galleryData.length : null}
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

  {/* Swipe hint + Guided Tour - only show in flip mode, not grid */}
      {viewMode === "flip" && <SwipeHint galleryKey={galleryKey || "k4-gallery"} />}
  <GalleryTour sectionKey={sectionKey} imageId={currentId} openNonce={tourOpenNonce} />

      {/* Pricing Modal for Engrained Series */}
      <AnimatePresence>
        {showPricingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={() => setShowPricingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 relative">
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-gray-800">More About This Image</h2>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <img
                      src={galleryData[currentIndex]?.src}
                      alt={galleryData[currentIndex]?.alt || galleryData[currentIndex]?.title}
                      className="w-full max-w-48 mx-auto rounded-lg shadow-md"
                    />
                    <h3 className="text-lg font-semibold text-gray-800 mt-3">
                      {galleryData[currentIndex]?.title}
                    </h3>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Pricing Information</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      {(() => {
                        const currentItem = galleryData[currentIndex];
                        const editionSize = currentItem?.editionSize;
                        const imageSize = currentItem?.imageSize;
                        const price = currentItem?.price;
                        const availability = currentItem?.availability;
                        const shipping = currentItem?.shipping;

                        if (editionSize || imageSize || price || availability || shipping) {
                          return (
                            <div className="space-y-1">
                              {editionSize && (
                                <p style={{ color: "#1b1a19" }}>
                                  • Limited Edition: {editionSize}
                                </p>
                              )}
                              {imageSize && (
                                <p style={{ color: "#1b1a19" }}>
                                  • Size: {imageSize}
                                </p>
                              )}
                              {price && (
                                <p style={{ color: "#1b1a19" }}>
                                  • Price: {price}
                                </p>
                              )}
                              {availability && (
                                <p style={{ color: "#1b1a19" }}>
                                  • Availability: {availability}
                                </p>
                              )}
                              {shipping && (
                                <p style={{ color: "#1b1a19" }}>
                                  • Shipping: {shipping}
                                </p>
                              )}
                            </div>
                          );
                        } else {
                          // Fallback to parsing description for backward compatibility
                          const description = currentItem?.description || "";
                          const pricingMatches = description.match(/\$[\d,]+(?:\.\d{2})?/g);
                          const sizeMatches = description.match(/\d+"?\s*x\s*\d+"?/g);
                          const limitedEdition = description.match(/Limited edition[-\s]*(\d+)/i);

                          if (pricingMatches && pricingMatches.length > 0) {
                            return (
                              <div className="space-y-1">
                                {limitedEdition && (
                                  <p style={{ color: "#1b1a19" }}>
                                    • Limited Edition: {limitedEdition[1]}
                                  </p>
                                )}
                                {sizeMatches && sizeMatches.length > 0 && (
                                  <p style={{ color: "#1b1a19" }}>
                                    • Size: {sizeMatches[0].replace(/x/g, " × ")}
                                  </p>
                                )}
                                <p style={{ color: "#1b1a19" }}>
                                  • Price: {pricingMatches[0]}
                                </p>
                                <p style={{ color: "#1b1a19" }}>
                                  • Availability: Call
                                </p>
                              </div>
                            );
                          } else {
                            return (
                              <div className="space-y-1">
                                <p style={{ color: "#1b1a19" }}>• Contact us for custom pricing</p>
                                <p style={{ color: "#1b1a19" }}>• Various sizes available</p>
                                <p style={{ color: "#1b1a19" }}>• Limited edition</p>
                                <p style={{ color: "#1b1a19" }}>• Availability: Call</p>
                              </div>
                            );
                          }
                        }
                      })()}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ backgroundColor: "#cfd1c8ff" }}>
                    <h4 className="font-semibold mb-2" style={{ color: "#1b1a19" }}>About Engrained Series</h4>
                    <p className="text-sm" style={{ color: "#1b1a19" }}>
                      Fine art printed on nature's canvas. Each piece is created using a custom 5-layer UV process on hand-selected Baltic Birch, where the wood's natural grain becomes part of the image. The result: rich depth, painterly texture, and a one-of-a-kind fusion of art and nature.
                    </p>
                  </div>

                  {/* Contact Us to Order Button */}
                  <div className="text-center">
                    {(() => {
                      const currentItem = galleryData[currentIndex];
                      const inv = currentItem?.inventory || {};
                      const inStock = inv.inStock || Math.max(0, (inv.printed || 0) - (inv.sold || 0));
                      const hasInventory = inStock > 0;
                      
                      return (
                        <a
                          href={`mailto:info@k4studios.com?subject=Order Inquiry: ${currentItem?.title || 'Engrained Series Image'} — Engrained Series&body=Hello,%0A%0AI am interested in ordering:%0A%0AImage: ${currentItem?.title || 'N/A'}%0AImage ID: ${currentItem?.id || 'N/A'}%0ASeries: Engrained (Baltic Birch Wood Print)%0A${currentItem?.imageSize ? `Size: ${currentItem.imageSize}` : ''}${currentItem?.imageSize && currentItem?.price ? ` (${currentItem.price})` : (currentItem?.price ? `Price: ${currentItem.price}` : '')}%0A%0APlease provide ordering information.%0A%0A---%0AYour Name:%0APreferred Contact (email or phone):%0A---%0A%0AThank you!`}
                          className="inline-flex items-center justify-center gap-2 w-full max-w-xs px-4 py-2.5 text-white rounded text-sm transition-all font-medium"
                          style={{
                            background: "linear-gradient(to bottom, #92400e 0%, #78350f 100%)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                            border: "1px solid #78350f",
                            textShadow: "0 1px 1px rgba(0,0,0,0.3)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "linear-gradient(to bottom, #78350f 0%, #451a03 100%)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "linear-gradient(to bottom, #92400e 0%, #78350f 100%)";
                          }}
                          onClick={() => {
                            logUIEvent("order_submitted", {
                              series: "engrained",
                              page: window.location.pathname,
                              imageId: currentItem?.id,
                              imageTitle: currentItem?.title,
                              hasInventory: hasInventory
                            });
                          }}
                        >
                          <span>Contact Us to Order</span>
                          {hasInventory && (
                            <span className="text-xs text-green-200/90 font-normal italic">· Quick ship available</span>
                          )}
                        </a>
                      );
                    })()}
                  </div>
                </div>

                {/* Close button in lower left */}
                <button
                  type="button"
                  className="absolute bottom-4 left-4 inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-300 rounded-full shadow-sm hover:bg-gray-700 hover:text-gray-200 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer"
                  aria-label="Close pricing modal"
                  title="Close"
                  onClick={() => setShowPricingModal(false)}
                >
                  <CircleX className="w-7 h-7" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Series Order Modal (for non-Engrained images) */}
      <SeriesOrderModal
        isOpen={showSeriesOrderModal}
        onClose={() => setShowSeriesOrderModal(false)}
        image={galleryData[currentIndex]}
        logUIEvent={logUIEvent}
      />

      {/* Series Info Popup (all series descriptions) */}
      <SeriesInfoPopup
        isOpen={showSeriesInfoPopup}
        onClose={() => {
          setShowSeriesInfoPopup(false);
          setSeriesInfoScrollTo(null);
        }}
        scrollToSeries={seriesInfoScrollTo}
        activeSeries={getEffectiveSeries(galleryData[currentIndex], seriesRegistry).filter(s => s !== "engrained")}
      />

      {/* Engrained Info Popup (museum label style, same as circle-i info overlay) */}
      <AnimatePresence>
        {showEngrainedInfoPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black bg-opacity-30"
            onClick={() => setShowEngrainedInfoPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-stone-50 border-2 rounded-lg shadow-xl p-5 max-w-sm"
              style={{ borderColor: "#b45309", backgroundColor: "#fffbeb" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="flex items-center gap-2 font-semibold text-base mb-3" style={{ color: "#92400e" }}>
                <span className="text-lg">{SERIES_DEFINITIONS.engrained?.icon || "◈"}</span>
                Engrained Series
              </h4>
              <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                The Engrained Series represents Wayne Heim's most distinctive collector offering—painterly fine art and Western photography uniquely printed on Baltic birch wood using a signature UV layering process.

Each piece transforms the natural grain of the wood into an integral part of the artwork, creating depth and warmth impossible to achieve on traditional media. The result is a one-of-a-kind presentation where every grain tells its own story alongside Wayne's vision.

Limited to editions of 50 or fewer, Engrained pieces arrive ready to hang with a float mount presentation on 0.5" thick birch panels.
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowEngrainedInfoPopup(false)}
                  className="text-xs text-stone-600 border border-stone-400 px-3 py-1 rounded hover:bg-stone-200 hover:border-stone-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
