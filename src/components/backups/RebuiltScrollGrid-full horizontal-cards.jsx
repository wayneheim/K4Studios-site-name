import { useState, useEffect } from "react";
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

export default function RebuiltScrollGrid({ galleryData, onCardClick }) {
  const [colCount, setColCount] = useState(getColCount());
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZES[getColCount()]);

  useEffect(() => {
    function handleResize() {
      setColCount(getColCount());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Only bump visibleCount UP if needed on colCount change
  useEffect(() => {
    setVisibleCount((prev) =>
      prev < BATCH_SIZES[colCount] ? BATCH_SIZES[colCount] : prev
    );
  }, [colCount]);

  // Preload the next batch in the background
  useEffect(() => {
    const nextStart = visibleCount;
    const nextEnd = Math.min(visibleCount + BATCH_SIZES[colCount], galleryData.length);
    const nextBatch = galleryData.slice(nextStart, nextEnd);
    nextBatch.forEach(entry => {
      if (entry && entry.src) {
        const img = new window.Image();
        img.src = entry.src;
      }
    });
  }, [visibleCount, colCount, galleryData]);

  // Defensive slice: only render available data
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
                  className="w-full h-full object-cover rounded-sm"
                  style={{ minHeight: 120 }}
                  onError={e => { e.target.style.opacity = 0.25; }}
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
        <div className="flex justify-center mt-8">
          <button
            className="px-6 py-2 bg-[#ece4d7] rounded-full border border-gray-300 font-medium text-lg hover:bg-[#f8e8d7] shadow-md transition"
            onClick={() =>
              setVisibleCount((prev) =>
                Math.min(prev + BATCH_SIZES[colCount], galleryData.length)
              )
            }
          >
            Show More
          </button>
        </div>
      )}
    </section>
  );
}
