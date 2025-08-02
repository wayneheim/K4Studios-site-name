import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHintDebug({
  galleryKey = "default",
  verticalOffsetPercent = 50, // fallback center
  arrowSelectors = ['[aria-label*="Previous"]', '[aria-label*="Next"]'],
}) {
  const [showHint, setShowHint] = useState(false);
  const [positionStyle, setPositionStyle] = useState({});
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const repositionRef = useRef(null);

  // force show every load for testing
  useEffect(() => {
    console.log("SwipeHintDebug: forcing show (bypassing session limits)");
    setShowHint(true);
  }, [galleryKey]);

  const computePosition = () => {
    if (typeof window === "undefined") return;

    // grab arrow elements
    const matched = arrowSelectors
      .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
      .filter(Boolean);

    console.log("SwipeHintDebug: matched arrows:", matched);

    if (matched.length >= 2) {
      // try to identify previous/next by aria-label if available
      let prevEl = matched.find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("previous")
      );
      let nextEl = matched.find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("next")
      );

      if (!prevEl || !nextEl) {
        prevEl = matched[0];
        nextEl = matched[1];
      }

      const prevRect = prevEl.getBoundingClientRect();
      const nextRect = nextEl.getBoundingClientRect();

      const gapExists = prevRect.right < nextRect.left;
      const horizontalCenter = gapExists
        ? prevRect.right + (nextRect.left - prevRect.right) / 2
        : (prevRect.left + nextRect.right) / 2;
      const top = Math.max(prevRect.bottom, nextRect.bottom) + 6;

      console.log("SwipeHintDebug: placing between arrows", { horizontalCenter, top });

      setPositionStyle({
        position: "fixed",
        top,
        left: horizontalCenter,
        transform: "translateX(-50%)",
        zIndex: 1000,
      });
    } else if (matched.length === 1) {
      const r = matched[0].getBoundingClientRect();
      const top = r.bottom + 6;
      const center = r.left + r.width / 2;
      console.log("SwipeHintDebug: single arrow fallback", { top, center });
      setPositionStyle({
        position: "fixed",
        top,
        left: center,
        transform: "translateX(-50%)",
        zIndex: 1000,
      });
    } else {
      // fallback to vertical center
      console.log("SwipeHintDebug: no arrows found, fallback centering");
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

    // poll in case arrow buttons appear late
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
