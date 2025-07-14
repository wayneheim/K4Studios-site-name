import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const BATCH_SIZES = { 1: 25, 2: 24, 3: 24 };

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

function getColCount() {
  if (typeof window !== "undefined") {
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }
  return 3;
}

export default function RebuiltScrollGrid({ galleryData, onCardClick }) {
  const [colCount, setColCount] = useState(getColCount());
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZES[getColCount()]);
  const [loading, setLoading] = useState(false);
  const [pendingBatch, setPendingBatch] = useState({ start: 0, end: 0, loadsLeft: 0 });
  const spinnerStart = useRef(null);
  const minSpinnerMs = 1400;

  // Add or remove body cursor spinner
  useEffect(() => {
    if (loading) {
      document.body.classList.add("loading");
    } else {
      document.body.classList.remove("loading");
    }
    return () => document.body.classList.remove("loading");
  }, [loading]);

  // Responsive columns
  useEffect(() => {
    function handleResize() {
      setColCount(getColCount());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // When col count changes, show first full batch, reset spinner
  useEffect(() => {
    const initialBatch = BATCH_SIZES[colCount] || 24;
    setVisibleCount((prev) => (prev < initialBatch ? initialBatch : prev));
    setLoading(false);
    setPendingBatch({ start: 0, end: 0, loadsLeft: 0 });
  }, [colCount]);

  // Preload next batch
  useEffect(() => {
    const loadMoreBatch = BATCH_SIZES[colCount] || 24;
    const nextStart = visibleCount;
    const nextEnd = Math.min(visibleCount + loadMoreBatch, galleryData.length);
    const nextBatch = galleryData.slice(nextStart, nextEnd);
    nextBatch.forEach(entry => {
      if (entry && entry.src) {
        const img = new window.Image();
        img.src = entry.src;
      }
    });
  }, [visibleCount, colCount, galleryData]);

  // "Show More" logic: next batch only
  function handleShowMore() {
    const loadMoreBatch = BATCH_SIZES[colCount] || 24;
    const next = Math.min(visibleCount + loadMoreBatch, galleryData.length);
    const start = visibleCount;
    const end = next;
    const numNew = end - start;
    setVisibleCount(next);
    setLoading(true);
    spinnerStart.current = Date.now();
    setPendingBatch({ start, end, loadsLeft: numNew });
  }

  // Track loaded images for current batch, with minimum spinner time
  function handleImgLoad(i) {
    if (i < pendingBatch.start || i >= pendingBatch.end) return;
    setPendingBatch((pb) => {
      const nextLeft = pb.loadsLeft - 1;
      if (nextLeft <= 0) {
        const now = Date.now();
        const elapsed = now - (spinnerStart.current || now);
        if (elapsed < minSpinnerMs) {
          setTimeout(() => setLoading(false), minSpinnerMs - elapsed);
        } else {
          setLoading(false);
        }
      }
      return { ...pb, loadsLeft: nextLeft };
    });
  }

  const visibleData = galleryData.slice(0, visibleCount);

  return (
    <section className="bg-white py-10 px-6">
      <div className="chapter-title-block mb-[-3rem] z-20 relative flex items-center justify-center gap-4">
        <div className="fade-line" />
        <h2 className="watermark-title whitespace-nowrap">Chapter Index</h2>
        <div className="fade-line" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          gap: "2rem",
        }}
      >
        {visibleData.map((entry, i) =>
          entry && entry.src && entry.title ? (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              onClick={() => onCardClick && onCardClick(i)}
              className="rounded-xl border border-gray-300 p-4 hover:shadow-md cursor-pointer flex flex-col will-change-transform"
              style={{ backgroundColor: "#f7f3eb" }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4 / 5",
                  background: "#eae6df",
                  borderRadius: "6px",
                  overflow: "hidden",
                  minHeight: 120,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    borderRadius: "6px",
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
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "6px",
                    background: "#eae6df"
                  }}
                  onLoad={() => handleImgLoad(i)}
                  onError={() => handleImgLoad(i)}
                />
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                className="h-[3.25rem] mt-4 flex items-center justify-center"
              >
                <h3 className="text-sm sm:text-base font-semibold text-center text-warm-fade">
                  {entry.title}
                </h3>
              </motion.div>
            </motion.div>
          ) : (
            <div
              key={i}
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
              MISSING DATA AT INDEX {i}
            </div>
          )
        )}
      </div>

      {/* Show More Button */}
      {visibleCount < galleryData.length && (
        <div className="flex flex-col items-center mt-8">
          <button
            className="px-6 py-2 bg-[#ece4d7] rounded-full border border-gray-300 font-medium text-lg hover:bg-[#f8e8d7] shadow-md transition"
            onClick={handleShowMore}
            disabled={loading}
          >
            Show More
          </button>
        </div>
      )}
    </section>
  );
}
