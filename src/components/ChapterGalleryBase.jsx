
function getSisterGalleryPath(path) {
  const normalizedPath = (path || '').replace(/\/+$/, '');
  const specialCaseSwaps = [];
  const swaps = [
    ['/NA-Color', '/NA-Black-White'],
    ['/NA-Black-White', '/NA-Color'],
    ['/Color', '/Black-White'],
    ['/Black-White', '/Color'],
  ];

  for (const [from, to] of specialCaseSwaps) {
    if (normalizedPath === from) {
      return to;
    }
  }

  for (const [from, to] of swaps) {
    if (normalizedPath.includes(from)) {
      return normalizedPath.replace(from, to);
    }
  }

  return null;
}
import { warmImage } from "../utils/warmImage";
import { trackEvent, emitActionPixel, emitChapterViewPixel } from "../utils/analytics";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Notebook, CircleX, SquareChevronLeft, SquareChevronRight, Info } from "lucide-react";
import { getClosingSentence } from "../utils/seoDescriptionAppender.js";
import { sitemapMatches } from "../data/sitemapMatches.ts";
import {
  buildCollectionContextStatement,
  getCollectionContextEntry,
} from "../data/semantic/collectionContext.ts";
import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import SwipeHint from "./SwipeHint";
import LikeButton from "@/components/LikeButton.jsx";
import StoryShow from "./Gallery-Slideshow.jsx";
import EngrainedOrderModal from "./EngrainedOrderModal.jsx";
import SeriesOrderModal from "./SeriesOrderModal.jsx";
import SeriesInfoPopup from "./SeriesInfoPopup.jsx";
import { SERIES_DEFINITIONS, SERIES_ICONS, getEffectiveSeries, loadSeriesRegistry } from "../data/seriesDefinitions.js";
import useHorizontalSwipeNav from "./hooks/useHorizontalSwipeNav.js";
import { createPortal } from "react-dom";
import useMetaSwap from "./hooks/useMetaSwap.js";
import { siteNav } from "../data/siteNav.js";
import { useImageFallbackRedirect } from "./utils/useImageFallbackRedirect.js";
import { getSemanticImageUrl } from "../utils/imageProxy.js";
import { themes } from "../data/themes/themes.mjs";
import blogImageMap from "../data/blogImageMap.js";
import { isWesternImagePath, westernImageAttributionText } from "../data/wayneEntity.js";

/* =========================================================
   Image Proxy URL Generator
   Converts image ID + size to /img/{id}/{size} proxy URL
   This ensures SmugMug URLs never appear in rendered HTML
   ========================================================= */
function getProxySrc(imageId, size = 'm') {
  if (!imageId) return '';
  // Validate size
  const validSizes = ['s', 'm', 'l', 'xl', 'src'];
  const safeSize = validSizes.includes(size) ? size : 'm';
  return `/img/${imageId}/${safeSize}.jpg`;
}

function buildCaptionExcerpt(description, minChars = 150, maxChars = 280) {
  if (!description || typeof description !== "string") {
    return { text: "", truncated: false };
  }

  const cleanText = description.replace(/\s+/g, " ").trim();
  if (!cleanText) {
    return { text: "", truncated: false };
  }

  if (cleanText.length <= maxChars) {
    return { text: cleanText, truncated: false };
  }

  const boundedText = cleanText.slice(0, maxChars + 1);

  // Prefer ending at a sentence break after minChars when possible
  const sentenceBoundaryMatches = [...boundedText.matchAll(/[.!?](?=\s|$)/g)];
  const preferredBoundary = sentenceBoundaryMatches
    .map((m) => m.index)
    .filter((idx) => typeof idx === "number" && idx >= minChars)
    .pop();

  let cutIndex = typeof preferredBoundary === "number" ? preferredBoundary + 1 : -1;

  if (cutIndex === -1) {
    const safeSlice = boundedText.slice(0, maxChars);
    const lastSpace = safeSlice.lastIndexOf(" ");
    cutIndex = lastSpace > minChars ? lastSpace : maxChars;
  }

  const text = cleanText.slice(0, cutIndex).trim();
  return { text, truncated: cutIndex < cleanText.length };
}

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
        trackEvent("guide_click_outside");
        emitActionPixel('guide_click_outside', imageId || null, {
          sourceLayer: 'guide_click_outside_pixel_v1',
          trigger: 'guide_click_outside',
          pageType: 'image'
        });
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
                  trackEvent("guide_done");
                  emitActionPixel('guide_done', imageId || null, {
                    sourceLayer: 'guide_done_pixel_v1',
                    trigger: 'guide_done',
                    pageType: 'image'
                  });
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
                trackEvent("guide_close");
                emitActionPixel('guide_close', imageId || null, {
                  sourceLayer: 'guide_close_pixel_v1',
                  trigger: 'guide_close',
                  pageType: 'image'
                });
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
  const isImageDetailRender = Boolean(
    initialImageId && String(initialImageId).toLowerCase() !== "i-k4studios"
  );

  const pixelLayerByEvent = {
    nav_prev: 'chapter_nav_prev_pixel_v1',
    nav_next: 'chapter_nav_next_pixel_v1',
    order_clicked: 'order_clicked_pixel_v1',
    order_submitted: 'order_submitted_pixel_v1',
    series_info: 'series_info_pixel_v1',
    more_info_open: 'more_info_open_pixel_v1',
    sister_image_click: 'sister_image_click_pixel_v1',
    slideshow_start: 'slideshow_start_pixel_v1',
    collector_notes_open: 'collector_notes_open_pixel_v1',
    exit_to_gallery: 'exit_to_gallery_pixel_v1',
    guide_open: 'guide_open_pixel_v1'
  };

  // Helper to track events with gallery context
  const track = (event, extraContext = {}) => {
    trackEvent(event, { galleryId: galleryKey, ...extraContext });

    const pixelLayer = pixelLayerByEvent[event];
    if (pixelLayer) {
      emitActionPixel(event, extraContext?.imageId || null, {
        galleryId: galleryKey,
        sourceLayer: pixelLayer,
        trigger: event,
        pageType: extraContext?.pageType || 'image',
        theme: extraContext?.theme || null
      });
    }
  };

  // Note: page_view is now tracked globally in BaseLayout.astro
  // Gallery-specific events (nav, zoom, etc.) still use track() with galleryId

  const chapterImageRef = useRef(null);

  // Load series registry after the primary image has settled; it only enriches badges/pricing.
  const [seriesRegistry, setSeriesRegistry] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let idleId = null;
    let timerId = null;
    let imgEl = null;

    const loadRegistry = () => {
      loadSeriesRegistry().then((registry) => {
        if (!cancelled) setSeriesRegistry(registry);
      });
    };

    const scheduleLoad = () => {
      if (cancelled) return;
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(loadRegistry, { timeout: 3000 });
      } else {
        timerId = window.setTimeout(loadRegistry, 1500);
      }
    };

    imgEl = chapterImageRef.current;
    if (imgEl && !imgEl.complete) {
      imgEl.addEventListener("load", scheduleLoad, { once: true });
    } else {
      scheduleLoad();
    }

    return () => {
      cancelled = true;
      if (imgEl) imgEl.removeEventListener("load", scheduleLoad);
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);

  // Edition context for SEO uniqueness - use basePath for SSR-safe initial render
  const [clientPath, setClientPath] = useState((basePath || "").toLowerCase());
  useEffect(() => {
    setClientPath(window.location.pathname.toLowerCase());
  }, []);
  const path = clientPath;
  const collectionContextEntry =
    getCollectionContextEntry(basePath) || getCollectionContextEntry(clientPath);
  const collectionContextStatement = collectionContextEntry
    ? buildCollectionContextStatement(collectionContextEntry)
    : "";
  const isBW = path.includes("/black-white/");
  const editionTag = isBW ? "Black and White" : "Color";
  const isEngrainedSeries = basePath && basePath.includes("Engrained");
  const showWesternImageAttribution = isImageDetailRender && isWesternImagePath(basePath);

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

  // Prevent SSR/CSR errors: if the routed imageId is invalid, render nothing and let the hook redirect
  const imageIdFromUrl = initialImageId && String(initialImageId).toLowerCase() !== "i-k4studios"
    ? String(initialImageId)
    : null;
  const isImageDetail = Boolean(imageIdFromUrl);
  // Case-insensitive comparison to handle URL case variations
  const imageIdFromUrlLower = imageIdFromUrl?.toLowerCase();
  const foundImage = !isImageDetail || galleryData.some(e => e && e.id && e.id.toLowerCase() === imageIdFromUrlLower);
  if (isImageDetail && !foundImage) {
    // Don't render image-dependent UI, let the hook redirect
    return null;
  }

  // Auto-enter chapters if URL has image ID or ?view=grid (shared theme links)
  const [hasEnteredChapters, setHasEnteredChapters] = useState(() => {
    return Boolean(initialImageId);
  });
  // SSR-safe initial index: match initialImageId or URL
  const initialIndex = (() => {
    if (!galleryData.length) return 0;
    const idToFind = initialImageId;
    if (idToFind) {
      // Case-insensitive comparison to handle URL case variations
      const idToFindLower = idToFind.toLowerCase();
      const idx = galleryData.findIndex((e) => e.id && e.id.toLowerCase() === idToFindLower);
      if (idx !== -1) return idx;
    }
    return 0;
  })();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  // Start hydration from the same mode SSR rendered; URL params switch this after mount.
  const [viewMode, setViewMode] = useState("flip");
  const [isZoomed, setIsZoomed] = useState(false);
  const [showArrowHint, setShowArrowHint] = useState(false);
  const [matColor, setMatColor] = useState("white");
  const [showMiniMenu, setShowMiniMenu] = useState(false);
  const [showArrows, setShowArrows] = useState(true);

  // 🔧 HYDRATION FIX: Enter chapters/grid mode on initial load if theme or view param is present
  // This runs after hydration to ensure URL params are respected on static pages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hasTheme = params.has("theme");
    const hasViewGrid = params.get("view") === "grid";
    const hasImageId = /\/(i-[a-zA-Z0-9_-]+)/.test(window.location.pathname);
    
    // Enter chapters mode if any of these conditions are met
    if ((hasTheme || hasViewGrid || hasImageId) && !hasEnteredChapters) {
      setHasEnteredChapters(true);
    }
    // Force grid view if theme or view=grid is present
    if ((hasTheme || hasViewGrid) && viewMode !== "grid") {
      setViewMode("grid");
    }
  }, []); // Run once after hydration

  // Sister link logic - use state to avoid SSR/client mismatch
  const currentImageId = galleryData[currentIndex]?.id;
  const currentImageData = galleryData[currentIndex] || null;
  const currentSemanticImageUrl = currentImageData
    ? getSemanticImageUrl(currentImageData, { galleryPath: basePath })
    : "";
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
      const sisterPath = getSisterGalleryPath(currentPath);
      if (sisterPath && sisterPath !== currentPath) {
        match = { b: `https://www.k4studios.com${sisterPath}` };
      }
    }
    
    setSisterMatch(match || null);
  }, [currentImageId]);

  const anchorTexts = ["See more painterly photography", "Explore traditional fine art photography", "Discover related images", "View similar artwork", "Browse additional pieces", "Check out more fine art", "Find related photography", "Explore more images", "Enjoy more of Wayne's work", "Discover more art", "Explore Wayne Heim's portfolio", "Discover more artistic pieces", "View additional fine art", "Browse related works", "See more from this series"];
  const hash = currentImageId ? currentImageId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) : 0;
  const anchorIndex = Math.abs(hash) % anchorTexts.length;
  const anchorText = anchorTexts[anchorIndex];
  const prevImage = currentIndex > 0 ? galleryData[currentIndex - 1] : null;
  const nextImage = currentIndex < galleryData.length - 1 ? galleryData[currentIndex + 1] : null;
  const prevHref = prevImage && basePath ? `${basePath}/${prevImage.id}` : null;
  const nextHref = nextImage && basePath ? `${basePath}/${nextImage.id}` : null;
  const gridHref = basePath
    ? `${basePath}${themeSlug ? `?theme=${encodeURIComponent(themeSlug)}&view=grid` : '?view=grid'}`
    : null;
  const exitHref = basePath || null;
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [showStoryShow, setShowStoryShow] = useState(false);
  const [showCollectorHint, setShowCollectorHint] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSeriesOrderModal, setShowSeriesOrderModal] = useState(false);
  const [showSeriesInfoPopup, setShowSeriesInfoPopup] = useState(false);
  const [seriesInfoScrollTo, setSeriesInfoScrollTo] = useState(null);
  const [showEngrainedInfoPopup, setShowEngrainedInfoPopup] = useState(false);
  const [enableEntryAnimation, setEnableEntryAnimation] = useState(false);

  const isCurrentLandscape = Boolean(currentImageData && currentImageData.width > currentImageData.height);
  const desktopLandscapeFrameMaxWidth = windowWidth >= 1280 ? "615px" : "585px";
  const desktopLandscapeImageMaxWidth = windowWidth >= 1280 ? "590px" : "560px";
  const desktopStoryColumnMaxWidth = isCurrentLandscape ? "24rem" : "28rem";
  const desktopStoryColumnFlexBasis = isCurrentLandscape ? "23rem" : "27rem";

  const prevIndex = useRef(currentIndex);
  const notesBtnRef = useRef(null);
  const qualifiedViewTimerRef = useRef(null);

  // Effect to borrow notes content from widget to popup (one-way move)
  // SEO only cares about initial SSR state - after that, DOM can change freely
  useEffect(() => {
    if (!showNotes) return;
    
    const imageId = galleryData[currentIndex]?.id;
    const canonicalNotes = document.getElementById(`canonical-notes-${imageId}`);
    const popupContainer = document.getElementById('notes-popup-container');
    
    if (canonicalNotes && popupContainer && !popupContainer.contains(canonicalNotes)) {
      // Move notes content to popup (stays there permanently)
      canonicalNotes.classList.add('notes-in-popup');
      canonicalNotes.style.maxHeight = 'none';
      popupContainer.appendChild(canonicalNotes);
    }
  }, [showNotes, currentIndex, galleryData]);

  // Effect to update SSR widget content when navigating images
  // Crawlers see initial SSR, humans see updated content
  useEffect(() => {
    const widget = document.querySelector('.image-details-widget');
    if (!widget) return;
    
    const currentImage = galleryData[currentIndex];
    if (!currentImage) return;
    
    // Update description
    const descEl = widget.querySelector('.widget-description');
    if (descEl) {
      descEl.textContent = currentImage.description || '';
    }
    
    // Update or create notes container
    const notesContainer = widget.querySelector('.widget-notes-container');
    const expandTrigger = widget.querySelector('.widget-expand-trigger');
    
    if (currentImage.notes) {
      if (notesContainer) {
        // Update existing notes
        notesContainer.id = `canonical-notes-${currentImage.id || 'default'}`;
        const notesP = notesContainer.querySelector('.widget-notes');
        if (notesP) notesP.textContent = currentImage.notes;
        notesContainer.style.display = '';
      } else if (expandTrigger) {
        // Create notes container if it doesn't exist
        const newNotesContainer = document.createElement('div');
        newNotesContainer.id = `canonical-notes-${currentImage.id || 'default'}`;
        newNotesContainer.className = 'widget-notes-container';
        newNotesContainer.setAttribute('data-notes-canonical', 'true');
        newNotesContainer.innerHTML = `<p class="widget-notes">${currentImage.notes}</p>`;
        widget.insertBefore(newNotesContainer, expandTrigger);
      }
    } else if (notesContainer) {
      // Hide notes if current image has none
      notesContainer.style.display = 'none';
    }
    
    // Update schema metadata
    const metaName = widget.querySelector('meta[itemprop="name"]');
    const linkImage = widget.querySelector('link[itemprop="image"]');
    if (metaName) metaName.setAttribute('content', currentImage.title || currentImage.alt || '');
    if (linkImage) linkImage.setAttribute('href', getSemanticImageUrl(currentImage, { galleryPath: basePath }));
    
    // Collapse widget when changing images
    widget.classList.remove('expanded');
  }, [currentIndex, galleryData, basePath]);

  const tourOpen = () =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-k4tour-open") === "1";

  // Nav handlers
  const exitNavPendingRef = useRef(false);

  const goPrev = (e) => {
    e?.stopPropagation();
    e?.preventDefault?.();
    if (tourOpen()) return;
    setIsExpanded(false);
    setCurrentIndex((i) => {
      const newIndex = Math.max(i - 1, 0);
      track("nav_prev", { imageId: galleryData[newIndex]?.id, pageType: 'image' });
      return newIndex;
    });
  };
  const goNext = (e) => {
    e?.stopPropagation();
    e?.preventDefault?.();
    if (tourOpen()) return;
    setIsExpanded(false);
    setCurrentIndex((i) => {
      const newIndex = Math.min(i + 1, galleryData.length - 1);
      track("nav_next", { imageId: galleryData[newIndex]?.id, pageType: 'image' });
      return newIndex;
    });
  };
  const goGrid = (e) => {
    e?.stopPropagation();
    e?.preventDefault?.();
    if (tourOpen()) return;
    setViewMode("grid");
    track("grid_open");
  };
  const goExit = (e) => {
    e?.stopPropagation();
    e?.preventDefault?.();
    if (tourOpen() || !basePath || exitNavPendingRef.current) return;

    track("exit_to_gallery", {
      imageId: currentId || null,
      pageType: 'image',
      trigger: 'chapter_exit_button'
    });

    exitNavPendingRef.current = true;
    // Give keepalive/beacon dispatch a brief head start before hard navigation.
    window.setTimeout(() => {
      window.location.href = basePath;
    }, 75);
  };

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
      // Case-insensitive comparison to handle URL case variations
      const idFromURLLower = idFromURL.toLowerCase();
      const idx = galleryData.findIndex((e) => e.id && e.id.toLowerCase() === idFromURLLower);
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

  // Always emit chapter_view when the active image changes.
  // This is the most reliable signal for next/prev and internal navigation.
  // Dedupe is enforced in src/utils/analytics.ts (per-image per-session).
  useEffect(() => {
    if (viewMode === "grid") return;
    const alreadyOnImage = /\/i-[a-zA-Z0-9_-]+$/.test(window.location.pathname);
    // Guardrail: preview-strip selection can change currentIndex before the user
    // actually enters chapters. Do not count those as chapter views.
    if (!hasEnteredChapters && !alreadyOnImage) return;
    const imageId = galleryData[currentIndex]?.id;
    if (!imageId) return;
    trackEvent('chapter_view', {
      galleryId: galleryKey,
      imageId,
      pageType: 'image',
      trigger: 'index_change'
    });

    // Sister Pixel: emit on every chapter-view transition, but share a path-aware
    // guard with the global URL tracker so direct image entries don't double-fire.
    emitChapterViewPixel(imageId, {
      galleryId: galleryKey,
      trigger: 'chapter_view',
      pageType: 'image'
    });
  }, [currentIndex, galleryData, viewMode, galleryKey, hasEnteredChapters]);

  useEffect(() => {
    if (qualifiedViewTimerRef.current) {
      window.clearTimeout(qualifiedViewTimerRef.current);
      qualifiedViewTimerRef.current = null;
    }

    if (viewMode === "grid") return;

    const alreadyOnImage = /\/i-[a-zA-Z0-9_-]+$/.test(window.location.pathname);
    if (!hasEnteredChapters && !alreadyOnImage) return;

    const imageId = galleryData[currentIndex]?.id;
    if (!imageId) return;

    const armQualifiedView = () => {
      if (qualifiedViewTimerRef.current) {
        window.clearTimeout(qualifiedViewTimerRef.current);
        qualifiedViewTimerRef.current = null;
      }

      const imgEl = chapterImageRef.current;
      const isLoaded = !!(imgEl && imgEl.complete && imgEl.naturalWidth > 0);
      if (!isLoaded) return;
      if (document.visibilityState !== "visible") return;

      qualifiedViewTimerRef.current = window.setTimeout(() => {
        const activeImageId = galleryData[currentIndex]?.id;
        const activeImgEl = chapterImageRef.current;
        const stillLoaded = !!(activeImgEl && activeImgEl.complete && activeImgEl.naturalWidth > 0);
        if (activeImageId !== imageId) return;
        if (!stillLoaded) return;
        if (document.visibilityState !== "visible") return;

        trackEvent('qualified_chapter_view', {
          galleryId: galleryKey,
          imageId,
          pageType: 'image',
          sourceLayer: 'hardened_chapter_view_v1',
          trigger: '1s_visible_loaded'
        });
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        armQualifiedView();
      } else if (qualifiedViewTimerRef.current) {
        window.clearTimeout(qualifiedViewTimerRef.current);
        qualifiedViewTimerRef.current = null;
      }
    };

    const imgEl = chapterImageRef.current;
    armQualifiedView();
    imgEl?.addEventListener('load', armQualifiedView);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (qualifiedViewTimerRef.current) {
        window.clearTimeout(qualifiedViewTimerRef.current);
        qualifiedViewTimerRef.current = null;
      }
      imgEl?.removeEventListener('load', armQualifiedView);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentIndex, galleryData, viewMode, galleryKey, hasEnteredChapters]);

  // Only swap to image-specific metadata when the chapter viewer is the active page mode.
  const entry = galleryData[currentIndex];
  const shouldSwapMeta = hasEnteredChapters && viewMode === "flip";
  useMetaSwap(entry, titleBase, currentIndex, shouldSwapMeta);

  const imageCaptionExcerpt = useMemo(() => {
    const description = galleryData[currentIndex]?.description;
    const minChars = isMobile ? 115 : 150;
    const maxChars = isMobile ? 200 : 280;
    return buildCaptionExcerpt(description, minChars, maxChars);
  }, [galleryData, currentIndex, isMobile]);

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
      const pathname = window.location.pathname;
      const match = pathname.match(/\/(i-[a-zA-Z0-9_-]+)/);
      const id = match ? match[1] : null;
      const header = document.getElementById("header-section");
      const intro = document.getElementById("intro-section");
      const chapter = document.getElementById("chapter-section");

      // PATCH: Detect broken lowercase URL redirect artifacts
      // If we land on an image URL where the path (minus ID) is all lowercase,
      // it's likely the broken intermediate redirect state - skip it
      if (id && basePath) {
        const pathWithoutId = pathname.replace(/\/i-[a-zA-Z0-9_-]+$/, '');
        const isLowercasePath = pathWithoutId === pathWithoutId.toLowerCase() && 
                                pathWithoutId !== basePath;
        if (isLowercasePath) {
          // This is the broken redirect artifact - go back one more
          window.history.go(-1);
          return;
        }
      }

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
      setHasEnteredChapters(false);
      if (header) header.classList.remove("section-hidden", "slide-fade-out");
      if (intro) intro.classList.remove("section-hidden", "slide-fade-out");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [galleryData, basePath]);

  // Mount class
  useEffect(() => {
    document.body.classList.add("react-mounted");
    setEnableEntryAnimation(true);
  }, []);

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

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE WARMING: Pre-fetch adjacent viewer images to reduce cold-cache delays
  // Size mapping: s = grid thumbs, m = grid cards, l = viewer, xl = slideshow
  // ═══════════════════════════════════════════════════════════════════════════

  // Phase 1: Viewer navigation warm - warm current ±3 to cover flip nav
  useEffect(() => {
    if (!galleryData?.length || viewMode !== "flip") return;
    
    // Warm current + 3 before + 3 after at 'l' for viewer navigation.
    // Grid mode loads its own 'm' images when the grid is opened.
    const warmRange = 3;
    for (let offset = -warmRange; offset <= warmRange; offset++) {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < galleryData.length && galleryData[idx]?.id) {
        warmImage(galleryData[idx].id, 'l'); // For viewer display
      }
    }
  }, [currentIndex, galleryData, viewMode]);

  // Phase 2: Gallery landing warm - warm images that are clickable on landing page
  // Uses galleryData.length as dep so it runs once data is actually loaded
  useEffect(() => {
    if (!galleryData?.length) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isImageDetailPath = /\/i-[a-zA-Z0-9_-]+\/?$/.test(window.location.pathname);
      const isSharedGridView = params.get("view") === "grid" || params.has("theme");
      if (isImageDetailPath || isSharedGridView) return;
    }
    
    // Warm first image at 'l' for "Explore the Gallery" click
    warmImage(galleryData[0].id, 'l');
    
    // Warm preview strip images at 's' for display AND 'l' for click-through
    // 's' = what the thumbnails actually render, 'l' = what viewer loads
    galleryData.slice(0, 6).forEach(img => {
      warmImage(img.id, 's'); // for display
      warmImage(img.id, 'l'); // for click-through
    });
  }, [galleryData.length]); // Run once when data loads

  // ═══════════════════════════════════════════════════════════════════════════

  // Orientation + mobile detection
  // NOTE: For 2-in-1 laptops with touch screens, we need to check BOTH pointer type AND screen size.
  // A touch-capable device with a large screen (e.g., 1920x1200) should NOT be treated as mobile.
  useEffect(() => {
    const updateOrientation = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      // Only treat as landscape mobile if BOTH touch device AND narrow screen (<=1024)
      setIsLandscapeMobile(w > h && isCoarse && w <= 1024);
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
      // Only treat as mobile if screen is actually narrow (<768px)
      // Touch capability alone (coarse pointer) should NOT trigger mobile mode on large screens
      setIsMobile(window.innerWidth < 768);
      setWindowWidth(window.innerWidth);
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

  const direction = currentIndex > prevIndex.current ? 1 : -1;
  prevIndex.current = currentIndex;

  const currentId = galleryData[currentIndex]?.id;

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
            isEngrained={isEngrainedSeries}
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
                    {`${currentIndex + 1} / ${galleryData.length}`}
                  </div>

                  {/* Center: K4 Studios (dead center) */}
                  <a
                    href="/"
                    title="K4 Studios Home"
                    className="text-base font-semibold no-underline hover:underline absolute left-1/2 -translate-x-1/2"
                    style={{ color: '#ffffff', fontFamily: "'Glegoo', serif", letterSpacing: '0.1em', opacity: 0.5 }}
                  >
                    K4 Studios
                  </a>

                  {/* Theme View indicator - positioned at 75% (mirrored from count) */}
                  {activeTheme && (
                    <div 
                      className="absolute text-sm text-gray-300 font-medium whitespace-nowrap"
                      style={{ left: '75%', transform: 'translateX(-50%)', letterSpacing: "-0.05em", opacity: 0.5 }}
                    >
                      Theme View
                    </div>
                  )}

                  {/* Right: Exit */}
                  {exitHref ? (
                    <a
                      href={exitHref}
                      className="inline-flex items-center justify-center w-6 h-6 text-gray-300 hover:text-white transition-colors cursor-pointer"
                      aria-label="Exit Chapter View"
                      title="Exit Viewer"
                      onClick={goExit}
                      data-exit-btn-top
                    >
                      <CircleX className="w-5 h-5" />
                    </a>
                  ) : (
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
                  )}
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={enableEntryAnimation ? { opacity: 0, x: direction > 0 ? 150 : -150 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -150 : 150 }}
                  transition={{ duration: 0.6, ease: [0.45, 0, 0.55, 1] }}
                  className="flex flex-col md:flex-row gap-6 md:gap-6 items-center justify-center md:min-h-[75vh]"
                  {...swipeHandlers}
                  data-image-id={currentId}
                >

                  {/* IMAGE + ARROWS COLUMN */}
                  <div
                    className="flex flex-col items-center relative chapter-image-container-mobile"
                    style={{ width: 'fit-content', ...(isMobile ? { maxWidth: '100%', overflowX: 'hidden', width: '100%' } : { minWidth: 0 }) }}
                  >

                    <figure style={{ margin: 0 }}>
                    <div className="w-full relative flex items-center justify-center mb-0 chapter-image-container-mobile" style={isMobile ? { maxWidth: '100%', overflowX: 'hidden' } : {}}>
                      {/* Removed absolute-positioned mobile arrows; moved to row near slideshow */}

                      <div className="relative flex flex-row justify-center chapter-image-container-mobile" style={isMobile ? { maxWidth: '100%', overflowX: 'hidden', width: '100%' } : { maxWidth: isCurrentLandscape ? desktopLandscapeFrameMaxWidth : '575px', width: 'fit-content' }}> 
                        {/* Image container with absolutely positioned collector notes button outside/right of image edge */}
                        <div
                          className="relative flex justify-center items-center chapter-image-container-mobile"
                          style={{ width: 'fit-content', maxWidth: '100%', margin: '0 auto' }}
                        >
                          <img
                            ref={chapterImageRef}
                            src={currentSemanticImageUrl || getProxySrc(galleryData[currentIndex]?.id, 'l')}
                            alt={galleryData[currentIndex]?.alt || galleryData[currentIndex]?.title}
                            itemProp="image contentUrl"
                            className="chapter-image-mobile rounded-lg block"
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                            style={
                              (() => {
                                const img = galleryData[currentIndex];
                                const isLandscape = img && img.width > img.height;
                                
                                // Keep the image markup hydration-stable; mobile sizing is handled by CSS.
                                return {
                                  cursor: "zoom-in",
                                  maxWidth: isLandscape ? desktopLandscapeImageMaxWidth : "100%",
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
                              // Disable zoom on mobile - users don't know to click, and matt preview makes images too small
                              if (!isMobile && !isLandscapeMobile) {
                                setIsZoomed(true);
                                const imageId = galleryData[currentIndex]?.id;
                                // XL zoom is counted from the user intent click (beacon), not from loading the XL image.
                                trackEvent('xl_zoom', { imageId, pageType: 'image', galleryId: galleryKey, trigger: 'xl_zoom' });

                                // Pixel-style zoom open signal (segmented in analytics by source_layer).
                                // Emit every click so repeat zoom usage is measurable per session.
                                if (imageId) {
                                  emitActionPixel('xl_zoom', imageId, {
                                    galleryId: galleryKey,
                                    sourceLayer: 'zoom_pixel_v1',
                                    trigger: 'xl_zoom',
                                    pageType: 'image'
                                  });
                                }
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
                                setShowNotes((p) => {
                                  if (!p) {
                                    track("collector_notes_open");
                                    sessionStorage.setItem("collectorHintShown", "1");
                                    setShowCollectorHint(false);
                                  }
                                  return !p;
                                });
                                // Close "More about this image" when opening notes
                                const moreDetails = document.querySelector('.more-about-image');
                                if (moreDetails) moreDetails.removeAttribute('open');
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
                                      track("series_info");
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
                                        track("series_info");
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
                        {/* Desktop Collector Notes panel - borrows content from widget */}
                        {!isMobile && galleryData[currentIndex]?.notes?.trim() && (
                            <div
                              className="desktop-only-element w-96 border border-gray-300 rounded shadow-2xl p-5 text-sm text-gray-800"
                              style={{
                                position: 'absolute',
                                zIndex: 100000,
                                top: '46px',
                                right: '-390px',
                                backgroundColor: '#f7f5f1',
                                border: '1px solid rgba(151, 153, 156, 1)',
                                minWidth: '260px',
                                maxWidth: '90vw',
                                display: showNotes ? 'block' : 'none',
                                opacity: showNotes ? 1 : 0,
                                transition: 'opacity 0.2s ease'
                              }}
                            >
                              {/* Container for borrowed notes content from widget */}
                              <div id="notes-popup-container" className="notes-popup-content" />
                            </div>
                        )}
                      </div>

                      {/* Removed absolute-positioned mobile arrows; moved to row near slideshow */}
                    </div>

                    {/* Subtle caption excerpt (from "More about this image" description) */}
                    {imageCaptionExcerpt?.text && (
                      <figcaption className="mx-auto mt-2 mb-2 px-3" style={{ maxWidth: isMobile ? '390px' : '500px' }} itemProp="caption">
                        <p
                          className="image-caption"
                          style={{
                            textAlign: 'center',
                            fontStyle: 'italic',
                            marginTop: '0.25rem',
                            marginBottom: 0,
                            fontSize: isMobile ? '0.66rem' : '0.74rem',
                            lineHeight: '1.35',
                            color: '#9ca3af',
                            opacity: 1,
                            minHeight: '2.7em',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          “{imageCaptionExcerpt.text}{imageCaptionExcerpt.truncated ? '...' : ''}”
                        </p>
                      </figcaption>
                    )}
                    </figure>

                    {/* Unified Nav Row + Guide trigger */}
                    <div className={`flex items-center justify-center gap-2 mb-1 ${isMobile ? 'mt-2' : 'mt-4'}`}>
                      {/* Toolbar */}
                      <div
                        className={
                          `flex items-center gap-1 md:gap-6 mx-auto rounded-xl shadow-sm px-3 py-1 select-none ` +
                          (isMobile ? ' w-full' : ' bg-white max-w-[1300px]')
                        }
                        style={isMobile
                          ? { width: 'calc(100vw - 2.5rem)', maxWidth: 'calc(100vw - 2.5rem)', minWidth: 0, justifyContent: 'space-between', border: '1px solid rgba(107, 94, 84, 0.1)', backgroundColor: 'rgba(240, 238, 233, 0.85)' }
                          : { maxWidth: '1300px', minWidth: 0, justifyContent: 'space-evenly', border: '1px solid #e5e7eb' }
                        }
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
                            setShowNotes((p) => {
                              if (!p) {
                                track("collector_notes_open");
                                sessionStorage.setItem("collectorHintShown", "1");
                                setShowCollectorHint(false);
                              }
                              return !p;
                            });
                            // Close "More about this image" when opening notes
                            const moreDetails = document.querySelector('.more-about-image');
                            if (moreDetails) moreDetails.removeAttribute('open');
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
                          type="number"
                          id="chapterNum"
                          name="chapterNum"
                          min="1"
                          max={galleryData.length}
                          step="1"
                          inputMode="numeric"
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
                      {gridHref ? (
                        <a
                          href={gridHref}
                          onClick={goGrid}
                          aria-label="View Grid Mode"
                          title="View Grid Mode"
                          className="md:hidden flex items-center justify-center gap-1 transition-colors"
                          data-grid-btn
                        >
                          <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
                          <span className="text-xs" style={{ color: "#84766d", opacity: 0.5 }}>- All</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={goGrid}
                          aria-label="View Grid Mode"
                          title="View Grid Mode"
                          className="md:hidden flex items-center justify-center gap-1 transition-colors"
                          data-grid-btn
                        >
                          <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
                          <span className="text-xs" style={{ color: "#84766d", opacity: 0.5 }}>- All</span>
                        </button>
                      )}

                      {/* ❤️ Like Button - Fourth on mobile */}
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white shadow hover:bg-gray-100 transition-colors hover:border-red-200" data-like-btn>
                        <LikeButton imageId={galleryData[currentIndex]?.id} pageTitle={galleryData[currentIndex]?.title} />
                      </div>

                      {/* Pricing button */}
                      <button
                        data-cart-btn
                        title={isEngrainedSeries ? "Click to see pricing" : "Click to see pricing and editions"}
                          className={`inline-flex items-center justify-center h-8 rounded-full text-[11px] font-semibold tracking-tight leading-none shadow transition border border-gray-300 hover:border-red-200 ${isMobile ? "px-2 min-w-[48px]" : "px-2.5 min-w-[68px]"}`}
                        style={{ backgroundColor: "#bbb6b1", color: "#ffffff" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#76807b")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#bbb6b1")}
                        onClick={() => {
                          if (isEngrainedSeries) {
                            setShowPricingModal(true);
                          } else {
                            setShowSeriesOrderModal(true);
                          }
                          track("order_clicked");
                        }}
                      >
                        {isMobile ? "Price" : "Pricing"}
                      </button>

                      {/* Exit - Desktop only (mobile exit is in top bar) */}
                      {!isMobile && (
                        exitHref ? (
                          <a
                            href={exitHref}
                            className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-300 rounded-full shadow-sm hover:bg-gray-700 hover:text-gray-200 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer"
                            aria-label="Exit Chapter View"
                            title="Exit Viewer"
                            style={{ position: 'relative', zIndex: 20 }}
                            onClick={goExit}
                            data-exit-btn
                          >
                            <CircleX className="w-7 h-7" />
                          </a>
                        ) : (
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
                        )
                      )}
                      </div>
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
                                      track("series_info");
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
                          {prevHref ? (
                            <a
                              href={prevHref}
                              onClick={goPrev}
                              aria-label="Previous Chapter"
                              title="Previous"
                              className="w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-[0.98]"
                              style={{ borderColor: "#ffffffff" }}
                              data-prev-btn
                            >
                              <SquareChevronLeft className="w-6 h-6" style={{ color: "#bdb5aeff" }} />
                              <span className="sr-only">Previous</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={goPrev}
                              aria-label="Previous Chapter"
                              title="Previous"
                              className="w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-[0.98]"
                              style={{ borderColor: "#ffffffff", opacity: 0.45 }}
                              disabled
                              data-prev-btn
                            >
                              <SquareChevronLeft className="w-6 h-6" style={{ color: "#bdb5aeff" }} />
                              <span className="sr-only">Previous</span>
                            </button>
                          )}

                          <div className="relative inline-flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                track('slideshow_start', { pageType: 'image', imageId: galleryData[currentIndex]?.id, trigger: 'play_slideshow' });
                                if (!tourOpen()) {
                                  setShowStoryShow(true);
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

                          {nextHref ? (
                            <a
                              href={nextHref}
                              onClick={goNext}
                              aria-label="Next Chapter"
                              title="Next"
                              className="w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-[0.98]"
                              style={{ borderColor: "#c5d1c8ff" }}
                              data-next-btn
                            >
                              <SquareChevronRight className="w-6 h-6" style={{ color: "#bdb5aeff" }} />
                              <span className="sr-only">Next</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={goNext}
                              aria-label="Next Chapter"
                              title="Next"
                              className="w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-[0.98]"
                              style={{ borderColor: "#c5d1c8ff", opacity: 0.45 }}
                              disabled
                              data-next-btn
                            >
                              <SquareChevronRight className="w-6 h-6" style={{ color: "#bdb5aeff" }} />
                              <span className="sr-only">Next</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        // Desktop: keep standalone slideshow button with theme star indicator
                        <div className="relative inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              track('slideshow_start', { pageType: 'image', imageId: galleryData[currentIndex]?.id, trigger: 'play_slideshow' });
                              if (!tourOpen()) {
                                setShowStoryShow(true);
                              }
                            }}
                            aria-label="Play K4 Slideshow"
                            title="Play K4 Story Show"
                            className="group my-3 inline-flex items-center gap-2 rounded-full px-3 py-1 border border-gray-200 hover:border-red-300 shadow-sm transition-colors"
                            style={{ letterSpacing: ".02em", backgroundColor: 'rgba(240, 238, 233, 0.85)' }}
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

                    {/* Collector Notes Panel (mobile) - borrows content from widget */}
                    {galleryData[currentIndex]?.notes && isMobile && (
      <div
        className="w-full mx-auto mt-2 mb-[6px] border border-gray-300 rounded shadow p-4 text-sm text-gray-800 text-left"
        style={{ 
          backgroundColor: "#f7f5f1", 
          border: "1px solid rgb(109, 111, 114)", 
          maxWidth: "98vw", 
          boxSizing: "border-box", 
          position: "relative",
          display: showNotes ? 'block' : 'none'
        }}
      >
        {/* Container for borrowed notes content from widget */}
        <div id="notes-popup-container" className="notes-popup-content" />
        {/* Close button in lower right corner */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowNotes(false); }}
          aria-label="Close Collector Notes"
          className="absolute bottom-3 right-3 w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#b91c1c] text-[#b91c1c] shadow-lg"
        >
          <span className="text-1xl font-bold" style={{ color: "#b91c1c" }}>✕</span>
        </button>
      </div>
)}
                  </div>

                  {/* DESCRIPTION + DESKTOP NAV COLUMN */}
                  <div 
                    className="w-full md:pl-8"
                    style={(() => {
                      const desktopLayoutStyle = isMobile
                        ? {}
                        : {
                            flex: `1 1 ${desktopStoryColumnFlexBasis}`,
                            maxWidth: desktopStoryColumnMaxWidth,
                            minWidth: 0,
                          };

                      // Tight zone (768-825px) - scale text down slightly
                      if (windowWidth >= 768 && windowWidth < 825) {
                        const scaleValue = 0.85 + ((windowWidth - 768) / (825 - 768)) * 0.15;
                        return { ...desktopLayoutStyle, transform: `scale(${scaleValue})`, transformOrigin: 'top center' };
                      }
                      return desktopLayoutStyle;
                    })()}
                  >
                    {/* Separator */}
                    <div className="hidden md:flex justify-center my-2">
                      <div className="flex items-center justify-center gap-3 my-4 text-[#7a6a58]">
                        
                       
                        
                      </div>
                    </div>

                    {/* Logo Watermark - shows theme icon when in theme mode, K4 logo otherwise */}
                    <nav className="mb-4 flex justify-center relative z-0 hidden md:flex" aria-label="Gallery navigation">
                      <a
                        href={sectionUrl}
                        rel="up"
                        title={activeTheme ? `Theme: ${activeTheme.name} in "${sectionDisplayTitle}"` : titleText}
                        className="relative block group"
                      >
                        <img
                          src={activeTheme ? "/images/theme%20icon.webp" : "/images/K4Logo-web-b.jpg"}
                          alt={activeTheme ? `Theme: ${activeTheme.name}` : altText}
                          className="h-16.5 mb-5 transition-opacity duration-300 group-hover:opacity-0 group-hover:pointer-events-none"
                          style={{ borderRadius: activeTheme ? "8px" : "50px", maxWidth: "160px", opacity: activeTheme ? ".65" : ".20" }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-center text-[#7a6a58] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-white rounded-full" style={{ borderRadius: activeTheme ? "8px" : "50px" }}>
                          {sectionDisplayTitle}
                        </span>
                        <span className="sr-only">{activeTheme ? `Theme: ${activeTheme.name} in ${sectionDisplayTitle}` : sectionDisplayTitle}</span>
                      </a>
                    </nav>

                    {/* Title - styled chapter label + H1 for actual title */}
                    {(() => {
                      const chapterTitle = galleryData[currentIndex]?.meta?.ogTitle ||
                        galleryData[currentIndex]?.title ||
                        galleryData[currentIndex]?.alt ||
                        titleBase;
                      // Dynamic font size: shrink for long titles on mobile
                      const titleLength = chapterTitle?.length || 0;
                      const mobileTitleSize = titleLength > 40 ? '1.0rem' : titleLength > 30 ? '1.15rem' : '1.35rem';
                      const ChapterTitleTag = isImageDetailRender ? "h1" : "h3";
                      return (
                        <div className="text-center" style={{ fontFamily: "'Glegoo', serif", marginBottom: isMobile ? "1.5rem" : "0.5rem" }}>
                          <p
                            className="font-semibold tracking-wide text-[#85644b]"
                            style={{ fontSize: "1.55rem", opacity: 0.5, lineHeight: "1.35", marginBottom: isMobile ? "0.75rem" : "0.25rem" }}
                          >
                            Chapter {currentIndex + 1}:
                          </p>
                          <ChapterTitleTag
                            className="font-semibold tracking-wide text-[#85644b] chapter-title"
                            itemProp={isImageDetailRender ? "name" : undefined}
                            style={{ fontSize: isMobile ? mobileTitleSize : "1.55rem", opacity: 0.5, lineHeight: "1.35", marginTop: 0, marginBottom: 0 }}
                          >
                            {chapterTitle}
                          </ChapterTitleTag>
                        </div>
                      );
                    })()}

                    {/* Story */}
                    <section className="image-story" aria-labelledby={`image-story-heading-${currentId || 'default'}`}>
                      <h2 id={`image-story-heading-${currentId || 'default'}`} className="sr-only">Story</h2>
                      <p className="italic text-base mt-3 md:text-lg mb-4 leading-snug text-left">
                        {galleryData[currentIndex]?.story}
                      </p>
                    </section>

                    {/* More about this image - Tier 1 SEO pattern */}
                    {(galleryData[currentIndex]?.description || galleryData[currentIndex]?.notes) && (
                      <>
                      <details 
                        className="more-about-image" 
                        style={{ margin: 0 }}
                        onToggle={(e) => {
                          if (e.target.open) {
                            const currentId = galleryData[currentIndex]?.id || null;
                            track("more_info_open", { imageId: currentId, pageType: 'image', trigger: 'more_about_toggle' });
                            
                            // Warm sister link image immediately on panel open
                            // User reading time (5-10s) provides the warm window naturally
                            if (currentId) {
                              // Find sister match for this image
                              const match = sitemapMatches.find(m => m.a.includes(currentId));
                              let sisterUrl = match?.b || null;
                              
                              // Fallback: Color <-> Black-White sister gallery (same image ID)
                              if (!sisterUrl && basePath) {
                                const fullPath = `${basePath}/${currentId}`;
                                sisterUrl = getSisterGalleryPath(fullPath);
                              }
                              
                              if (sisterUrl) {
                                // Extract image ID from URL path (last segment like i-XXXXX)
                                const sisterIdMatch = sisterUrl.match(/\/(i-[a-zA-Z0-9]+)\/?$/);
                                if (sisterIdMatch) {
                                  warmImage(sisterIdMatch[1], 'l'); // Warm for viewer display
                                }
                              }
                            }
                          }
                        }}
                      >
                        <summary style={{
                          display: 'block',
                          listStyle: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#7a6a58',
                          fontFamily: "'Glegoo', serif",
                          padding: '0.5rem 0',
                          textAlign: 'center'
                        }}>
                          <span className="plus-minus-icon" style={{ 
                            display: 'inline-block', 
                            fontSize: '0.9em', 
                            marginRight: '0.4em',
                            fontWeight: 'bold'
                          }}></span> More about this image
                        </summary>
                        <div className="details-content" style={{
                          fontSize: '0.9rem',
                          lineHeight: '1.7',
                          paddingTop: '0.5rem',
                          borderTop: '1px dashed rgba(200, 190, 180, 0.4)',
                          textAlign: 'left'
                        }}>
                          {galleryData[currentIndex]?.description && (
                            <section className="image-description" aria-labelledby={`image-description-heading-${currentId || 'default'}`}>
                              <h2 id={`image-description-heading-${currentId || 'default'}`} className="sr-only">About this image</h2>
                              <p itemProp="description" style={{ margin: '0 0 1rem' }}>
                                {galleryData[currentIndex].description}
                              </p>
                            </section>
                          )}
                          {collectionContextStatement && (
                            <aside
                              className="collection-context-note"
                              aria-labelledby={`series-context-heading-${currentId || 'default'}`}
                              style={{
                                margin: '0 0 1rem',
                                color: '#7a6a58',
                                fontSize: '0.86rem',
                                lineHeight: '1.65'
                              }}
                            >
                              <h3 id={`series-context-heading-${currentId || 'default'}`} className="sr-only">Part of the {sectionDisplayTitle} series</h3>
                              {collectionContextStatement}
                            </aside>
                          )}
                          {showWesternImageAttribution && (
                            <p
                              className="western-image-attribution"
                              style={{
                                margin: '0 0 1rem',
                                color: '#7a6a58',
                                fontSize: '0.86rem',
                                lineHeight: '1.65'
                              }}
                            >
                              {westernImageAttributionText}
                            </p>
                          )}
                          {galleryData[currentIndex]?.notes && (
                            <section 
                              id={`canonical-notes-${galleryData[currentIndex]?.id || 'default'}`}
                              className="notes-section"
                              data-notes-canonical="true"
                              aria-labelledby={`collector-notes-heading-${currentId || 'default'}`}
                              style={{
                                marginTop: '1rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px dashed rgba(200, 190, 180, 0.4)'
                              }}
                            >
                              <h3 id={`collector-notes-heading-${currentId || 'default'}`} className="notes-label" style={{
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                color: '#928176',
                                margin: '0 0 0.5rem',
                                letterSpacing: '0.04em'
                              }}>Collector Notes:</h3>
                              <p style={{
                                fontStyle: 'italic',
                                color: '#9a9a99',
                                margin: 0,
                                mixBlendMode: 'multiply'
                              }}>
                                {galleryData[currentIndex].notes}
                              </p>
                            </section>
                          )}

                          {/* Featured in blog — links image → conversation post */}
                          {(() => {
                            const currentId = galleryData[currentIndex]?.id;
                            const blog = currentId && blogImageMap[currentId];
                            if (!blog) return null;
                            return (
                              <a
                                href={blog.url}
                                onClick={() => track("blog_link_click", { imageId: currentId, pageType: 'image', trigger: 'featured_in_blog' })}
                                style={{
                                  display: 'block',
                                  marginTop: '1rem',
                                  paddingTop: '0.75rem',
                                  borderTop: '1px dashed rgba(200, 190, 180, 0.4)',
                                  fontSize: '0.8rem',
                                  color: '#7b1e1e',
                                  textDecoration: 'none',
                                  fontFamily: "'Glegoo', serif"
                                }}
                              >
                                📖 Featured in <em>Inside the Frame: {blog.title}</em>
                              </a>
                            );
                          })()}
                          
                          {/* Cross-image discovery - uses sitemapMatches as an anti-orphan crawl mesh */}
                          {(() => {
                            const currentId = galleryData[currentIndex]?.id;
                            if (!currentId) return null;
                            
                            // Find in sitemapMatches chain
                            const match = sitemapMatches.find(m => m.a.includes(currentId));
                            let relatedUrl = match?.b || null;
                            
                            // Fallback: link to Color <-> Black-White sister gallery
                            if (!relatedUrl && basePath) {
                              const fullPath = `${basePath}/${currentId}`;
                              relatedUrl = getSisterGalleryPath(fullPath);
                            }
                            
                            if (!relatedUrl) return null;
                            
                            // Convert full URL to path if needed
                            const href = relatedUrl.startsWith('http') 
                              ? new URL(relatedUrl).pathname 
                              : relatedUrl;
                            
                            return (
                              <a 
                                href={href}
                                className="cross-image-discovery-link"
                                aria-label="Explore another image from the K4 Studios collection"
                                onClick={() => {
                                  track("sister_image_click", { imageId: currentId, pageType: 'image', trigger: 'explore_more_photos' });
                                  emitActionPixel("sister_image_click", currentId, {
                                    sourceLayer: "sister_image_click_pixel_v1",
                                    pageType: "image",
                                    trigger: "explore_more_photos"
                                  });
                                }}
                                style={{
                                  display: 'block',
                                  marginTop: '1rem',
                                  fontSize: '0.75rem',
                                  color: '#7b1e1e',
                                  textDecoration: 'none',
                                  textAlign: 'right'
                                }}
                              >
                                Explore More Photos →
                              </a>
                            );
                          })()}
                        </div>
                      </details>
                      </>
                    )}

                    {/* Bottom Separator */}
                    <div className="flex justify-center my-3">
                      <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                        
                       
                        
                      </div>
                    </div>

                    {/* Desktop Nav Buttons */}
                    <div className="hidden md:flex justify-center items-center gap-6 pt-4" data-image-id={currentId}>
                      {prevHref ? (
                        <a
                          href={prevHref}
                          onClick={goPrev}
                          className="bg-white p-1 -mt-16 rounded shadow flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors"
                          title="Back"
                          data-prev-btn
                        >
                          <SquareChevronLeft className="w-5 h-5 text-gray-300 hover:text-gray-500 transition-colors" />
                          <span className="sr-only">Previous</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={goPrev}
                          className="bg-white p-1 -mt-16 rounded shadow flex items-center justify-center border border-gray-200 transition-colors"
                          title="Back"
                          style={{ opacity: 0.45 }}
                          disabled
                          data-prev-btn
                        >
                          <SquareChevronLeft className="w-5 h-5 text-gray-300 transition-colors" />
                          <span className="sr-only">Previous</span>
                        </button>
                      )}

                      {gridHref ? (
                        <a
                          href={gridHref}
                          onClick={goGrid}
                          className="bg-gray-100 w-11 h-11 -mt-16 rounded-full shadow flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors"
                          title="Index View"
                          data-grid-btn
                        >
                          <Grid className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
                          <span className="sr-only">Grid View</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={goGrid}
                          className="bg-gray-100 w-11 h-11 -mt-16 rounded-full shadow flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors"
                          title="Index View"
                          data-grid-btn
                        >
                          <Grid className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
                        </button>
                      )}

                      {nextHref ? (
                        <a
                          href={nextHref}
                          onClick={goNext}
                          className={`bg-white p-1 -mt-16 rounded shadow flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors ${showArrowHint ? 'animate-pulse' : ''}`}
                          title="Next"
                          data-next-btn
                        >
                          <SquareChevronRight className="w-5 h-5 text-gray-300 hover:text-gray-500 transition-colors" />
                          <span className="sr-only">Next</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={goNext}
                          className="bg-white p-1 -mt-16 rounded shadow flex items-center justify-center border border-gray-200 transition-colors"
                          title="Next"
                          style={{ opacity: 0.45 }}
                          disabled
                          data-next-btn
                        >
                          <SquareChevronRight className="w-5 h-5 text-gray-300 transition-colors" />
                          <span className="sr-only">Next</span>
                        </button>
                      )}
                    </div>

                  </div>
                </motion.div>
              </AnimatePresence>
              </>
            )}

            {/* Mini Menu Drawer */}
            {showMiniMenu && (
              <MobileMiniDrawer
                onClose={() => setShowMiniMenu(false)}
                currentPage={galleryData[currentIndex]?.title?.trim()}
              />
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
                isEngrainedSeries={isEngrainedSeries}
                style={{ display: viewMode === "grid" ? "block" : "none" }}
                // Pass theme info for shared theme links (grid header)
                themeName={activeTheme?.name || null}
                themeIntroLead={activeTheme?.introLead || null}
                themeIntroFollow={activeTheme?.introFollow || null}
                themeDescription={activeTheme?.description || null}
                themeTransitionLine={activeTheme?.transitionLine || null}
                themeStoryUrl={activeTheme?.storyUrl || null}
                themeStoryCta={activeTheme?.storyCta || null}
                themeImageCountLabel={activeTheme?.imageCountLabel || null}
                themeImageCount={activeTheme ? galleryData.length : null}
              />
            )}
          </>
        )}
      </div>

      {/* Slideshow */}
      {showStoryShow && (
        <StoryShow
          images={galleryData.map((img) => ({ ...img, url: getProxySrc(img.id, 'xl') }))}
          startImageId={galleryData[currentIndex]?.id}
          onExit={() => setShowStoryShow(false)}
        />
      )}

      {/* Swipe hint */}
      {viewMode === "flip" && <SwipeHint galleryKey={galleryKey || "k4-gallery"} />}

      <EngrainedOrderModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        image={galleryData[currentIndex]}
        trackEvent={track}
      />

      {/* Series Order Modal (for non-Engrained images) */}
      <SeriesOrderModal
        isOpen={showSeriesOrderModal}
        onClose={() => setShowSeriesOrderModal(false)}
        image={galleryData[currentIndex]}
        trackEvent={track}
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

