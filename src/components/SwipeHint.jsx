import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHint({ galleryKey = "default" }) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    const sessionKey = `swipeHint-${galleryKey}`;
    const maxViews = 4;
    const cooldownMs = 10 * 60 * 700;
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
    const shouldShow = hintData.count < 3 || timeSinceLast > cooldownMs;

    if (shouldShow) {
      const delay = setTimeout(() => {
        setShowHint(true);

        const hide = setTimeout(() => {
          setShowHint(false);
          const updated = {
            count: hintData.count + 1,
            lastShown: Date.now(),
          };
          sessionStorage.setItem(sessionKey, JSON.stringify(updated));
        }, 9000);

        return () => clearTimeout(hide);
      }, 1100);

      return () => clearTimeout(delay);
    }
  }, [galleryKey]);

  const positionStyle = {
    position: "fixed",
    top: "20%",
    left: "50%",
    transform: "translateX(-115px)",
    zIndex: 1000,
    pointerEvents: "none",
    display: "flex",
  };

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          key="swipe-hint"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.35 }}
          style={positionStyle}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "-3.5rem",
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
