import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHintDebug({
  galleryKey = "default",
  verticalOffsetPercent = 50,
  arrowSelectors = ['[aria-label*="Previous"]', '[aria-label*="Next"]'],
}) {
  const [showHint, setShowHint] = useState(false);
  const [positionStyle, setPositionStyle] = useState({});
  const repositionRef = useRef(null);

  useEffect(() => {
    console.log("SwipeHintDebug: forcing show (bypassing session limits)");
    setShowHint(true);
  }, [galleryKey]);

  const computePosition = () => {
    if (typeof window === "undefined") return;

    const matched = arrowSelectors
      .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
      .filter(Boolean);

    if (matched.length >= 2) {
      const prevEl = matched.find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("previous")
      ) ?? matched[0];
      const nextEl = matched.find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("next")
      ) ?? matched[1];

      const prevRect = prevEl.getBoundingClientRect();
      const nextRect = nextEl.getBoundingClientRect();

      const top = Math.max(prevRect.bottom, nextRect.bottom) + 6;

      setPositionStyle({
        position: "fixed",
        top,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
      });
    } else if (matched.length === 1) {
      const r = matched[0].getBoundingClientRect();
      setPositionStyle({
        position: "fixed",
        top: r.bottom + 6,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
      });
    } else {
      setPositionStyle({
        position: "fixed",
        top: `${verticalOffsetPercent}%`,
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
      });
    }
  };

  useEffect(() => {
    if (!showHint) return;
    computePosition();
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, { passive: true });

    let tries = 0;
    const poll = () => {
      if (tries++ > 10) return;
      computePosition();
      repositionRef.current = window.setTimeout(poll, 250);
    };
    poll();

    return () => {
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition);
      if (repositionRef.current) clearTimeout(repositionRef.current);
    };
  }, [showHint, arrowSelectors]);

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          key="swipe-hint-debug"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.35 }}
          style={{
            pointerEvents: "none",
            ...positionStyle,
            display: "flex",
            padding: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.7)",
              padding: "0.75rem 1rem",
              borderRadius: 999,
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              fontWeight: 600,
              fontSize: "0.9rem",
              maxWidth: 360,
              justifyContent: "center",
            }}
          >
            <motion.div
              animate={{ x: [0, 12, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
              }}
              style={{ display: "flex", alignItems: "center" }}
            >
              <Hand size={24} />
            </motion.div>
            <span>Swipe</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
