import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SERIES_DEFINITIONS, SERIES_ICONS, getEffectiveSeries, loadSeriesRegistry } from "../data/seriesDefinitions.js";

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
  // Optional theme props for shared theme links (grid landing view)
  themeName = null,
  themeDescription = null,
  themeImageCount = null,
}) {
  const [colCount, setColCount] = useState(getColCount());
  const [simIndex, setSimIndex] = useState(initialImageIndex);
  const [anchorOnNextUpdate, setAnchorOnNextUpdate] = useState(true);
  const [pendingPrepend, setPendingPrepend] = useState(false);
  const [headingHover, setHeadingHover] = useState(false);
  const [seriesRegistry, setSeriesRegistry] = useState(null);
  const rowRefs = useRef({});

  // Load series registry on mount
  useEffect(() => {
    loadSeriesRegistry().then(setSeriesRegistry);
  }, []);

  // Prefer a smaller image in the grid for speed; fall back to larger if needed.
  const getPreferredSrc = (entry, cols) => {
    const m = entry?.srcM;
    const l = entry?.srcL;
    const xl = entry?.srcXL;
    const original = entry?.src;
    if (cols <= 1) {
      // 1-col (mobile/full width): prefer larger
      return xl || l || m || original || null;
    }
    if (cols === 2) {
      // 2-col: medium/large
      return l || xl || m || original || null;
    }
    // 3-col: medium best for thumbnails
    return m || l || xl || original || null;
  };

  // Simple close handler: reload the page to exit grid mode
  const handleClose = () => {
    window.location.reload();
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

  const paddingTop = colCount * 5;
  const paddingBottom = colCount * 8;
  const start = Math.max(0, simIndex - paddingTop);
  const end = Math.min(galleryData.length, simIndex + paddingBottom);
  const visibleData = galleryData.slice(start, end);

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

  return (
    <section className="bg-white py-10 px-6">
      {/* Theme Header - shown when viewing a shared theme collection */}
      {themeName && (
        <header 
          className="text-center pb-6 mb-4 border-b border-gray-200"
          style={{ fontFamily: "'Glegoo', serif" }}
        >
          <h1 
            className="text-2xl md:text-3xl font-semibold"
            style={{ color: "#5a4a3a" }}
          >
            {themeName}
          </h1>
          {themeDescription && (
            <p 
              className="mt-3 text-gray-600 max-w-2xl mx-auto text-sm md:text-base"
              style={{ lineHeight: 1.6 }}
            >
              {themeDescription}
            </p>
          )}
          {themeImageCount && (
            <p className="mt-2 text-xs text-gray-400">
              {themeImageCount} image{themeImageCount !== 1 ? 's' : ''} in this collection
            </p>
          )}
        </header>
      )}

      {/* Header with hover/focus effect - hide when viewing a theme collection */}
      {!themeName && (
      <div
        className="chapter-title-block mb-[-3rem] relative flex items-center justify-center gap-4"
        // Remove top space on mobile (colCount===1); keep large offset for centered desktop presentation
        style={{ paddingTop: colCount === 1 ? "0px" : "150px" }}
      >
        {/* Desktop-only circular logo absolutely centered above heading (no structural changes) */}
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
        <div className="fade-line" style={{ marginBottom: "2.5rem" }} />
        <h2
          className="watermark-title whitespace-nowrap"
          style={{
            marginBottom: "4rem",
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
        <div className="fade-line" style={{ marginBottom: "2.5rem" }} />
      </div>
      )}

      {/* Show Previous Button */}
      {start > 0 && (
        <div className="flex justify-center mb-8 z-10">
          <button
            className="block px-6 py-2 bg-[#f9f6f2] rounded-full border border-gray-300 font-medium text-sm hover:bg-[#f8e8d7] shadow-md transition z-10"
            style={{ border: "2px solid #d1d5db", position: "relative" }}
            onClick={() => {
              setSimIndex(start);
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
        {visibleData.map((entry, i) => {
          const globalIndex = start + i;
          const rowIndex = Math.floor(globalIndex / colCount);
          const rowAnchor = globalIndex % colCount === 0;
          const gridSrc = getPreferredSrc(entry, colCount);

          return gridSrc && entry?.title ? (
            <motion.div
              key={globalIndex}
              ref={(el) => rowAnchor && (rowRefs.current[`row-${rowIndex}`] = el)}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              onClick={() => onCardClick?.(globalIndex)}
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
                    style={{ minHeight: 120 }}
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
        })}
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
