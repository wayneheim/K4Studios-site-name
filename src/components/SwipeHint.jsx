import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHint({ galleryKey = "default" }) {
  const [showHint, setShowHint] = useState(false);
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const storageKey = `swipeHintSeen-${galleryKey}`;
    const hasSeen = localStorage.getItem(storageKey);

    if (isMobile && !hasSeen) {
      const delay = setTimeout(() => {
        setDelayPassed(true);
        setShowHint(true);
        const hideTimer = setTimeout(() => {
          setShowHint(false);
          localStorage.setItem(storageKey, "true");
        }, 4000); // hint visible for 4s

        return () => clearTimeout(hideTimer);
      }, 1100); // ✅ Delay mount by 2.5s

      return () => clearTimeout(delay);
    }
  }, [galleryKey]);

  if (!delayPassed || !showHint) return null;

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
