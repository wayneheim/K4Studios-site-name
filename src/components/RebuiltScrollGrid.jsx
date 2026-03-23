import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SERIES_DEFINITIONS, SERIES_ICONS, getEffectiveSeries, loadSeriesRegistry } from "../data/seriesDefinitions.js";
import { getProxySrc } from "@/utils/imageProxy.js";
import { warmImage } from "../utils/warmImage";
import { trackEvent, emitActionPixel } from "../utils/analytics";

const BATCH_SIZES = { 1: 25, 2: 24, 3: 30 };

function getColCount() {
  if (typeof window !== "undefined") {
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }
  return 3;
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.9,
      ease: [0.33, 1, 0.68, 1],
    },
  }),
};

export default function RebuiltScrollGrid({
  galleryData,
  onCardClick,
  initialImageIndex = 0,
  galleryKey = "default",
  onClose,
  isEngrainedSeries = false,
  // Optional theme props for shared theme links (grid landing view)
  themeName = null,
  themeIntroLead = null,
  themeIntroFollow = null,
  themeDescription = null,
  themeTransitionLine = null,
  themeStoryUrl = null,
  themeStoryCta = null,
  themeImageCountLabel = null,
  themeImageCount = null,
}) {
  const [colCount, setColCount] = useState(getColCount());
  const [simIndex, setSimIndex] = useState(initialImageIndex);
  const [anchorOnNextUpdate, setAnchorOnNextUpdate] = useState(true);
  const [pendingPrepend, setPendingPrepend] = useState(false);
  const [headingHover, setHeadingHover] = useState(false);
  const [seriesRegistry, setSeriesRegistry] = useState(null);
  const rowRefs = useRef({});
  // Track which image IDs have already been animated (don't re-animate on range expansion)
  const animatedIds = useRef(new Set());
  
  // Track the range of images that have been loaded (expands as user navigates)
  const paddingTop = colCount * 5;
  const paddingBottom = colCount * 8;
  const initialStart = Math.max(0, initialImageIndex - paddingTop);
  const initialEnd = Math.min(galleryData.length, initialImageIndex + paddingBottom);
  const [loadedRange, setLoadedRange] = useState({ start: initialStart, end: initialEnd });

  // Load series registry on mount
  useEffect(() => {
    loadSeriesRegistry().then(setSeriesRegistry);
  }, []);

  // Use proxy URL for grid images - M size is sufficient for all grid layouts
  // Worker handles fallback if M isn't available
  const getPreferredSrc = (entry, cols) => {
    if (!entry?.id) return null;
    // M size (~600px) is sufficient for grid cards at any column count
    return getProxySrc(entry.id, 'm');
  };

  // Close handler: go back if there's history (came from image), otherwise go to gallery landing
  const handleClose = () => {
    // Check if we have navigation history (user came from viewing an image)
    // history.length > 1 means there's something to go back to
    // But history.length isn't reliable - it includes entries from other sites
    // Instead, check if we entered via theme/view param (no previous image context)
    const params = new URLSearchParams(window.location.search);
    const isThemeEntry = params.has('theme') || params.has('view');
    
    if (isThemeEntry) {
      // Entered via shared link - go to gallery landing page
      const path = window.location.pathname;
      const basePath = path.replace(/\/i-[a-zA-Z0-9_-]+\/?$/, '');
      window.location.href = basePath || '/';
    } else {
      // Normal grid access - go back to previous image
      window.history.back();
    }
  };

  // ESC key triggers close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => setColCount(getColCount());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const start = Math.max(0, simIndex - paddingTop);
  const end = Math.min(galleryData.length, simIndex + paddingBottom);
  
  // Expand loaded range when user navigates (but never shrink it)
  useEffect(() => {
    setLoadedRange(prev => ({
      start: Math.min(prev.start, start),
      end: Math.max(prev.end, end)
    }));
  }, [start, end]);
  
  // Use the expanded range - keeps all previously loaded images in DOM
  const visibleData = galleryData.slice(loadedRange.start, loadedRange.end);

  useEffect(() => {
    if (!pendingPrepend) return;
    const anchorRowIndex = Math.floor((start + paddingTop) / colCount);
    const anchor = rowRefs.current[`row-${anchorRowIndex}`];
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      window.scrollBy({ top: anchorRect.top - 80, behavior: "instant" });
    }
    setPendingPrepend(false);
  }, [start, colCount, pendingPrepend]);

  useEffect(() => {
    if (!anchorOnNextUpdate) return;
    const rowIndex = Math.floor(simIndex / colCount);
    if (rowIndex === 0) {
      setAnchorOnNextUpdate(false);
      return;
    }
    const anchor = rowRefs.current[`row-${rowIndex}`];
    if (anchor) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      });
    }
    setAnchorOnNextUpdate(false);
  }, [colCount, simIndex, anchorOnNextUpdate]);

  useEffect(() => {
    const preloadStart = end;
    const preloadEnd = Math.min(preloadStart + BATCH_SIZES[colCount], galleryData.length);
    galleryData.slice(preloadStart, preloadEnd).forEach((entry) => {
      const url = getPreferredSrc(entry, colCount);
      if (url) {
        const img = new window.Image();
        img.decoding = "async";
        img.loading = "eager";
        img.src = url;
      }
    });
    
    // Pre-warm next 9 images in Cloudflare proxy cache (above the fold for next batch)
    // This ensures CF cache is hot before user clicks "Show More"
    galleryData.slice(preloadStart, Math.min(preloadStart + 9, galleryData.length)).forEach((entry) => {
      if (entry?.id) {
        warmImage(entry.id, 'm'); // Grid cards use M size
      }
    });
  }, [end, colCount, galleryData]);

  useEffect(() => {
    const preloadStart = Math.max(0, start - BATCH_SIZES[colCount]);
    const preloadEnd = start;
    galleryData.slice(preloadStart, preloadEnd).forEach((entry) => {
      const url = getPreferredSrc(entry, colCount);
      if (url) {
        const img = new window.Image();
        img.decoding = "async";
        img.loading = "eager";
        img.src = url;
      }
    });
  }, [start, colCount, galleryData]);

  // Hide large chapter spacer (dynamic top padding) while grid view is active.
  useEffect(() => {
    const el = document.getElementById("chapter-section");
    if (el) el.setAttribute("data-tight-header", "");
    return () => {
      if (el) el.removeAttribute("data-tight-header");
    };
  }, []);

  // Pixel tracking for grid open (generic vs theme-specific).
  // Emit every open so repeated grid usage is counted per session.
  useEffect(() => {
    try {
      const isThemeGrid = Boolean(themeName);
      const layer = isThemeGrid ? "theme_grid_open_pixel_v1" : "grid_open_pixel_v1";
      emitActionPixel(isThemeGrid ? 'theme_grid_open' : 'grid_open', null, {
        galleryId: galleryKey,
        sourceLayer: layer,
        trigger: isThemeGrid ? "theme_grid_open" : "grid_open",
        pageType: "image",
        theme: isThemeGrid ? String(themeName) : null,
      });
    } catch (_) {}
  }, [galleryKey, themeName]);

  const isEngrainedEntry = (entry) => {
    if (!entry) return false;
    if (isEngrainedSeries) return true;

    const candidates = [
      entry.buyLink,
      entry.src,
      entry.srcXL,
      entry.srcL,
      entry.srcM,
      entry.srcS,
      entry.linkedGalleryPath,
      ...(Array.isArray(entry.galleries) ? entry.galleries : []),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return candidates.some((value) =>
      value.includes("/other/k4-select-series/engrained/engrained-series/") ||
      value.includes("other/photo-shoots/engrained") ||
      value.includes("/engrained/")
    );
  };

  return (
    <section className="bg-white py-10 px-6">
      {/* Theme Header - shown when viewing a shared theme collection */}
      {themeName && (
        <header 
          className="text-center pb-6 mb-4 border-b border-gray-200"
          style={{ fontFamily: "'Glegoo', serif" }}
        >
          <div className="flex justify-center mb-3">
            <img
              src="/images/K4Logo-web.webp"
              alt="K4 Studios"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                objectFit: 'cover',
                opacity: 0.18,
                filter: 'grayscale(10%)',
                userSelect: 'none'
              }}
              draggable={false}
            />
          </div>
          <h1 
            className="text-2xl md:text-3xl font-semibold"
            style={{ color: "#5a4a3a" }}
          >
            {themeName}
          </h1>
          {themeIntroLead && (
            <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "#4b392d", lineHeight: 1.45 }}>
              {themeIntroLead}
            </p>
          )}
          {themeIntroFollow && (
            <p className="mt-1 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "#6a5444", lineHeight: 1.5 }}>
              {themeIntroFollow}
            </p>
          )}
          {themeDescription && (
            <p 
              className="mt-4 text-gray-600 max-w-2xl mx-auto text-sm md:text-base"
              style={{ lineHeight: 1.6 }}
            >
              {themeDescription}
            </p>
          )}
          {themeTransitionLine && (
            <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base" style={{ color: "#7b6658", lineHeight: 1.6 }}>
              {themeTransitionLine}
            </p>
          )}
          {themeStoryUrl && themeStoryCta && (
            <div className="mt-5 flex flex-col sm:flex-row justify-center items-center gap-3">
              <a
                href={themeStoryUrl}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm md:text-base"
                style={{ color: "#f7efe4", background: "#7a4e36", textDecoration: "none" }}
              >
                ▶ {themeStoryCta}
              </a>
            </div>
          )}
          {themeImageCountLabel ? (
            <p className="mt-3 text-xs text-gray-400">
              {themeImageCountLabel}
            </p>
          ) : (
            themeImageCount && (
              <p className="mt-2 text-xs text-gray-400">
                {themeImageCount} image{themeImageCount !== 1 ? 's' : ''} in this collection
              </p>
            )
          )}
        </header>
      )}

      {/* Header with hover/focus effect - hide when viewing a theme collection */}
      {!themeName && (
      <div
        className="chapter-title-block mb-[-3rem] relative flex flex-col items-center justify-center"
        // Remove top space on mobile (colCount===1); keep large offset for centered desktop presentation
        style={{ paddingTop: colCount === 1 ? "0px" : "150px" }}
      >
        {/* Desktop-only circular logo centered above heading */}
        <div
          className="hidden md:flex flex-col items-center justify-center"
          style={{
            position: "absolute",
            top: -60,
            bottom: 42,
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 0,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClose();
              }
            }}
            aria-label="Exit Chapter Index"
            title="Exit Index View"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <img
              src="/images/K4Logo-web.webp"
              alt="K4 Studios"
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                objectFit: "cover",
                opacity: 0.17,
                filter: "grayscale(10%)",
                userSelect: "none",
              }}
              draggable={false}
            />
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 w-full" style={{ marginBottom: "1.25rem" }}>
          <div className="fade-line" />
          <h2
            className="watermark-title whitespace-nowrap"
            style={{
              marginBottom: 0,
              transition: "color .14s",
              fontSize: "4rem",
              fontWeight: 700,
              color: "#5e4740",
              opacity: ".17",
              textAlign: "center",
            }}
          >
            Chapter Index
          </h2>
          <div className="fade-line" />
        </div>
        <p className="text-sm text-gray-500 text-center max-w-xl mx-auto" style={{ marginBottom: "3rem" }}>
          Click any image to view the full story and preview the series.
        </p>
      </div>
      )}

      {/* Show Previous Button - loads earlier images and keeps them */}
      {loadedRange.start > 0 && (
        <div className="flex justify-center mb-8 z-10">
          <button
            className="block px-6 py-2 bg-[#f9f6f2] rounded-full border border-gray-300 font-medium text-sm hover:bg-[#f8e8d7] shadow-md transition z-10"
            style={{ border: "2px solid #d1d5db", position: "relative" }}
            onClick={() => {
              trackEvent('grid_show_previous', { galleryId: galleryKey, pageType: 'image' });
              emitActionPixel('grid_show_previous', null, {
                galleryId: galleryKey,
                sourceLayer: 'grid_show_previous_pixel_v1',
                trigger: 'grid_show_previous',
                pageType: 'image',
                theme: themeName ? String(themeName) : null,
              });
              setSimIndex(loadedRange.start);
              setAnchorOnNextUpdate(false);
              setPendingPrepend(true);
            }}
          >
            Show Previous
          </button>
        </div>
      )}

      {/* The Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          gap: "2rem",
        }}
      >
        {(() => {
          // Calculate which cards are new BEFORE rendering (so we get accurate stagger index)
          const newCardIndices = [];
          visibleData.forEach((entry, i) => {
            if (entry?.id && !animatedIds.current.has(entry.id)) {
              newCardIndices.push(i);
            }
          });
          
          return visibleData.map((entry, i) => {
            const globalIndex = loadedRange.start + i;
            const rowIndex = Math.floor(globalIndex / colCount);
            const rowAnchor = globalIndex % colCount === 0;
            const gridSrc = getPreferredSrc(entry, colCount);
            
            // Check if this is a new card that needs animation
            const isNewCard = entry?.id && !animatedIds.current.has(entry.id);
            const staggerIndex = isNewCard ? newCardIndices.indexOf(i) : 0;
            
            // Mark as animated after first render
            if (isNewCard) {
              animatedIds.current.add(entry.id);
            }

            return gridSrc && entry?.title ? (
              <motion.div
                key={entry.id || globalIndex}
                ref={(el) => rowAnchor && (rowRefs.current[`row-${rowIndex}`] = el)}
                variants={cardVariants}
                initial={isNewCard ? "hidden" : "visible"}
                animate="visible"
                custom={staggerIndex}
                onClick={() => {
                  if (entry?.id) {
                    trackEvent('grid_image_click', {
                      galleryId: galleryKey,
                      imageId: entry.id,
                      pageType: 'image'
                    });
                    const isThemeGrid = Boolean(themeName);
                    emitActionPixel(isThemeGrid ? 'theme_grid_image_click' : 'grid_image_click', entry.id, {
                      galleryId: galleryKey,
                      sourceLayer: isThemeGrid ? 'theme_grid_image_click_pixel_v1' : 'grid_image_click_pixel_v1',
                      trigger: isThemeGrid ? 'theme_grid_image_click' : 'grid_image_click',
                      pageType: 'image',
                      theme: isThemeGrid ? String(themeName) : null,
                    });
                  }
                  onCardClick?.(globalIndex);
                }}
                className="rounded-xl border border-gray-300 p-4 hover:shadow-md cursor-pointer flex flex-col will-change-transform"
                style={{ backgroundColor: "#f7f3eb" }}
              >
              <div className="aspect-[4/5] bg-[#eae6df] rounded-sm overflow-hidden relative">
                <div
                  className="absolute inset-0 rounded-sm pointer-events-none"
                  style={{
                    boxShadow: `
                      inset 2px 0 3px rgba(75,75,75,.4),
                      inset -2px 0 3px rgba(236,236,236,.68),
                      inset 0 2px 3px rgba(77,77,77,.4),
                      inset 0 -3px 4px rgba(255,255,255,.81)
                    `,
                    zIndex: 10,
                  }}
                />
                <div
                  className="w-full h-full"
                  style={{
                    transition: "transform 7.5s ease-out",
                    willChange: "transform",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transition = "transform 8.15s ease-out";
                    e.currentTarget.style.transform =
                      "scale(1.1) translate(-4%, -4%) rotate(-1.5deg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transition = "transform 19.25s ease-in";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <img
                    src={gridSrc}
                    alt={entry.alt || entry.title}
                    className="w-full h-full object-cover rounded-sm border-2 border-gray-400"
                    style={{ minHeight: 120, objectPosition: "center 15%" }}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => {
                      // @ts-ignore
                      e.target.style.opacity = 0.25;
                    }}
                  />
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                className="h-[4.5rem] mt-4 flex flex-col items-center justify-center"
              >
                {/* Series Icons Row */}
                {(() => {
                  if (isEngrainedEntry(entry)) {
                    const engrainedDef = SERIES_DEFINITIONS.engrained;
                    return (
                      <div className="flex items-center gap-4 mb-1">
                        <span className="flex items-center">
                          <span
                            className="text-[15px] text-cyan-900/50"
                            title={`${engrainedDef.label} Series Member`}
                          >
                            {engrainedDef.icon || SERIES_ICONS.engrained}
                          </span>
                        </span>
                      </div>
                    );
                  }

                  const effectiveSeries = getEffectiveSeries(entry, seriesRegistry);
                  const displaySeries = effectiveSeries
                    .filter(s => SERIES_DEFINITIONS[s] && s !== "engrained")
                    .sort((a, b) => (SERIES_DEFINITIONS[a].sortOrder || 99) - (SERIES_DEFINITIONS[b].sortOrder || 99));
                  if (displaySeries.length === 0) return null;
                  return (
                    <div className="flex items-center gap-4 mb-1">
                      {displaySeries.map((seriesKey, idx) => {
                        const def = SERIES_DEFINITIONS[seriesKey];
                        return (
                          <span key={seriesKey} className="flex items-center">
                            <span
                              className="text-[15px] text-cyan-900/50"
                              title={`${def.label} Series Member`}
                            >
                              {def.icon || SERIES_ICONS[seriesKey]}
                            </span>
                            {idx < displaySeries.length - 1 && (
                              <span className="text-warm-fade text-xs ml-4">|</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="text-base sm:text-base font-semibold text-center text-warm-fade">
                  {`Chapter ${globalIndex + 1}:`}
                </div>
                <h3 
                  className="text-[15px] font-semibold text-center text-warm-fade truncate max-w-full px-2"
                  title={entry.title}
                >
                  "{entry.title}"
                </h3>
              </motion.div>
            </motion.div>
          ) : (
            <div
              key={globalIndex}
              style={{
                border: "2px solid red",
                background: "#fee",
                minHeight: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                borderRadius: 12,
                fontWeight: 700,
              }}
            >
              MISSING DATA AT INDEX {globalIndex}
            </div>
          );
        });
        })()}
      </div>

      <div className="flex justify-center mt-8 gap-4">
        {/* Close first now with lighter tint */}
        <button
          onClick={handleClose}
          tabIndex={0}
          className="px-6 py-2 rounded-full border border-gray-300 font-medium text-sm shadow-md transition"
          style={{
            backgroundColor: "#d4d4d4", // lighter base
          }}
          title="Exit Index View"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#c0c0c0"; // hover slightly darker
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#d4d4d4";
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = "2px solid rgba(0,0,0,0.35)";
            e.currentTarget.style.outlineOffset = "2px";
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = "none";
          }}
        >
          Close
        </button>

        {end < galleryData.length && (
          <button
            className="px-6 py-2 bg-[#f9f6f2] rounded-full border border-gray-300 font-medium text-sm hover:bg-[#f8e8d7] shadow-md transition"
            onClick={() => {
              trackEvent('grid_show_more', { galleryId: galleryKey, pageType: 'image' });
              emitActionPixel('grid_show_more', null, {
                galleryId: galleryKey,
                sourceLayer: 'grid_show_more_pixel_v1',
                trigger: 'grid_show_more',
                pageType: 'image',
                theme: themeName ? String(themeName) : null,
              });
              setSimIndex(end - 1);
              setAnchorOnNextUpdate(true);
            }}
          >
            Show More
          </button>
        )}
      </div>
    </section>
  );
}
