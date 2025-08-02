import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHint({
  galleryKey = "default",
  topOffsetFallback = 120,
  arrowAriaLabelSelectors = ['[aria-label*="Previous"]', '[aria-label*="Next"]'],
}) {
  const [showHint, setShowHint] = useState(false);
  const [positionStyle, setPositionStyle] = useState({});
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const repositionRef = useRef(null);

  // show/hide logic with sessionStorage
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    if (!isMobile) return;

    const sessionKey = `swipeHint-${galleryKey}`;
    const maxViews = 3;
    const cooldownMs = 10 * 60 * 1000; // 10 minutes

    const now = Date.now();
    let hintData = { count: 0, lastShown: 0 };

    try {
      const stored = sessionStorage.getItem(sessionKey);
      if (stored) {
        hintData = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("SwipeHint: Failed to parse sessionStorage", e);
    }

    const timeSinceLast = now - hintData.lastShown;

    if (hintData.count < maxViews || timeSinceLast > cooldownMs) {
      showTimerRef.current = window.setTimeout(() => {
        setShowHint(true);

        hideTimerRef.current = window.setTimeout(() => {
          setShowHint(false);
          const newData = {
            count: hintData.count + 1,
            lastShown: Date.now(),
          };
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify(newData));
          } catch (e) {
            console.warn("SwipeHint: Failed to write sessionStorage", e);
          }
        }, 4000);
      }, 1100);
    }

    return () => {
      if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, [galleryKey]);

  // positioning: try to put between arrows
  const computePosition = () => {
    if (typeof window === "undefined") return;

    // gather arrow elements
    const matchedNodes = arrowAriaLabelSelectors
      .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
      .filter(Boolean);

    if (matchedNodes.length >= 2) {
      // attempt to find one "previous" and one "next"
      let prevEl = matchedNodes.find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("previous")
      );
      let nextEl = matchedNodes.find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("next")
      );

      // fallback: just take first two distinct
      if (!prevEl || !nextEl) {
        prevEl = matchedNodes[0];
        nextEl = matchedNodes[1];
      }

      const prevRect = prevEl.getBoundingClientRect();
      const nextRect = nextEl.getBoundingClientRect();

      // if their horizontal gap is positive, place hint between them
      const gapLeft = prevRect.right;
      const gapRight = nextRect.left;
      const horizontalCenter = gapLeft < gapRight
        ? gapLeft + (gapRight - gapLeft) / 2
        : (prevRect.left + nextRect.right) / 2; // overlap fallback: center of combined

      // vertical position just below whichever is lower (taking max bottom)
      const baseBottom = Math.max(prevRect.bottom, nextRect.bottom);
      const margin = 6;
      const candidateTop = baseBottom + margin;

      setPositionStyle({
        position: "fixed",
        top: candidateTop,
        left: horizontalCenter,
        transform: "translateX(-50%)",
        zIndex: 1000,
      });
    } else if (matchedNodes.length > 0) {
      // single arrow or group fallback: use group bounding box logic
      let left = Infinity,
        right = -Infinity,
        top = Infinity,
        bottom = -Infinity;
      matchedNodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
        top = Math.min(top, r.top);
        bottom = Math.max(bottom, r.bottom);
      });

      const groupRect = { left, right, top, bottom, width: right - left, height: bottom - top };
      const margin = 8;
      const candidateTop = groupRect.bottom + margin;

      setPositionStyle({
        position: "fixed",
        top: candidateTop,
        left: groupRect.left + groupRect.width / 2,
        transform: "translateX(-50%)",
        zIndex: 1000,
      });
    } else {
      // fallback: fixed from top, centered
      setPositionStyle({
        position: "fixed",
        top: topOffsetFallback,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
      });
    }
  };

  useEffect(() => {
    if (!showHint) return;
    computePosition();
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, { passive: true });

    // poll a few times in case arrows render slightly after mount
    let tries = 0;
    const poll = () => {
      if (tries++ > 8) return;
      computePosition();
      repositionRef.current = window.setTimeout(poll, 250);
    };
    poll();

    return () => {
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition);
      if (repositionRef.current) clearTimeout(repositionRef.current);
    };
  }, [showHint, arrowAriaLabelSelectors]);

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          key="swipe-hint"
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
            className="swipe-hint-overlay"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.7)", // 70% opacity
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
              className="swipe-hand"
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
            <span className="swipe-label">Swipe</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
