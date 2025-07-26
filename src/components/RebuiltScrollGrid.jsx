import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

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
}) {
  const [colCount, setColCount] = useState(getColCount());
  const [simIndex, setSimIndex] = useState(initialImageIndex);
  const [anchorOnNextUpdate, setAnchorOnNextUpdate] = useState(true); // only anchor when needed
  const [pendingPrepend, setPendingPrepend] = useState(false);
  const rowRefs = useRef({});

  useEffect(() => {
    const handleResize = () => setColCount(getColCount());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Buffer math: 5 rows before, 8 after (tweak as needed)
  const paddingTop = colCount * 5;
  const paddingBottom = colCount * 8;
  const start = Math.max(0, simIndex - paddingTop);
  const end = Math.min(galleryData.length, simIndex + paddingBottom);
  const visibleData = galleryData.slice(start, end);

  // --- 1. Sticky scroll logic for "Show Previous" ---
  useEffect(() => {
    if (!pendingPrepend) return;
    // Find the first card in the old grid (after prepend, now shifted down)
    // Use the previous first row as anchor (row at old 'start + paddingTop')
    const anchorRowIndex = Math.floor((start + paddingTop) / colCount);
    const anchor = rowRefs.current[`row-${anchorRowIndex}`];
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      // Scroll page so this anchor row stays where it was before expand
      window.scrollBy({ top: anchorRect.top - 80, behavior: "instant" });
      // ^ 80px fudge so not exactly at top edge
    }
    setPendingPrepend(false);
    // eslint-disable-next-line
  }, [start, colCount, pendingPrepend]);

// --- 2. Anchor to simulated index *only when anchorOnNextUpdate is true* ---
useEffect(() => {
  if (!anchorOnNextUpdate) return;
  const rowIndex = Math.floor(simIndex / colCount);
  if (rowIndex === 0) {
    setAnchorOnNextUpdate(false);
    return; // Skip scroll for row 0
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
  // eslint-disable-next-line
}, [colCount, simIndex, anchorOnNextUpdate]);


  // --- Preload next batch (after) ---
  useEffect(() => {
    const preloadStart = end;
    const preloadEnd = Math.min(preloadStart + BATCH_SIZES[colCount], galleryData.length);
    galleryData.slice(preloadStart, preloadEnd).forEach((entry) => {
      if (entry?.src) {
        const img = new window.Image();
        img.src = entry.src;
      }
    });
  }, [end, colCount, galleryData]);

  // --- Preload previous batch (before) ---
  useEffect(() => {
    const preloadStart = Math.max(0, start - BATCH_SIZES[colCount]);
    const preloadEnd = start;
    galleryData.slice(preloadStart, preloadEnd).forEach((entry) => {
      if (entry?.src) {
        const img = new window.Image();
        img.src = entry.src;
      }
    });
  }, [start, colCount, galleryData]);

  return (
    <section className="bg-white py-10 px-6">
      <div className="chapter-title-block mb-[-3rem] z-20 relative flex items-center justify-center gap-4">
        <div className="fade-line" />
        <h2 className="watermark-title whitespace-nowrap" style={{ marginBottom: "1.5rem" }}>
          Chapter Index
        </h2>
        <div className="fade-line" />
      </div>

      {/* Show Previous Button */}
      {start > 0 && (
        <div className="flex justify-center mb-8">
          <button
            className="px-6 py-2 bg-[#ece4d7] rounded-full border border-gray-300 font-medium text-sm hover:bg-[#f8e8d7] shadow-md transition"
            onClick={() => {
              setSimIndex(start); // re-center at current top
              setAnchorOnNextUpdate(false); // don't anchor scroll!
              setPendingPrepend(true); // run sticky scroll logic
            }}
          >
            Show Previous
          </button>
        </div>
      )}

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

          return entry?.src && entry?.title ? (
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
                  }}
                />
                <img
  src={entry.src}
  alt={entry.title}
  className="w-full h-full object-cover rounded-sm border-2 border-gray-400"
  style={{ minHeight: 120 }}
  onError={(e) => {
    e.target.style.opacity = 0.25;
  }}
/>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                className="h-[3.25rem] mt-4 flex flex-col items-center justify-center"
              >
                <div className="text-lg sm:text-lg font-semibold text-center text-warm-fade">
                  {`Chapter ${globalIndex + 1}:`}
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-center text-warm-fade">
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

      {/* Show More Button */}
      {end < galleryData.length && (
        <div className="flex justify-center mt-8">
          <button
            className="px-6 py-2 bg-[#ece4d7] rounded-full border border-gray-300 font-medium text-sm hover:bg-[#f8e8d7] shadow-md transition"
            onClick={() => {
              setSimIndex(end - 1);
              setAnchorOnNextUpdate(true); // scroll to anchor!
            }}
          >
            Show More
          </button>
        </div>
      )}
    </section>
  );
}
