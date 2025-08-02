import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHint({ galleryKey = "default", topOffset = 120 }) {
  const [showHint, setShowHint] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

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

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          key="swipe-hint-wrapper"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "fixed",
            top: topOffset,
            left: 0,
            right: 0,
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
            padding: "0 1rem",
          }}
        >
          <motion.div
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
              maxWidth: 400,
              width: "100%",
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
