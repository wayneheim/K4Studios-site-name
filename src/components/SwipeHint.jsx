import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHint({ galleryKey = "default" }) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const sessionKey = `swipeHint-${galleryKey}`;
    const maxViews = 3;
    const cooldownMs = 10 * 60 * 1000; // 10 minutes

    if (!isMobile) return;

    const now = Date.now();
    let hintData = {
      count: 0,
      lastShown: 0
    };

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
      const delay = setTimeout(() => {
        setShowHint(true);

        // auto hide after 4s
        const hideTimer = setTimeout(() => {
          setShowHint(false);
          const newData = {
            count: hintData.count + 1,
            lastShown: Date.now()
          };
          sessionStorage.setItem(sessionKey, JSON.stringify(newData));
        }, 4000);

        return () => clearTimeout(hideTimer);
      }, 1100); // initial delay

      return () => clearTimeout(delay);
    }
  }, [galleryKey]);

  if (!showHint) return null;

  return (
    <motion.div
      className="swipe-hint-overlay"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="swipe-hand"
        animate={{ x: [0, 12, 0] }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
        }}
      >
        <Hand size={24} />
      </motion.div>
      <span className="swipe-label">Swipe</span>
    </motion.div>
  );
}
