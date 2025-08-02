import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

export default function SwipeHintDebug({ galleryKey = "default" }) {
  const [showHint, setShowHint] = useState(false);

  // Force show every time for testing
  useEffect(() => {
    console.log("SwipeHintDebug: force showing hint (debug mode)");
    setShowHint(true);
  }, [galleryKey]);

  const positionStyle = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1000,
    pointerEvents: "none",
    display: "flex",
  };

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          key="swipe-hint-debug"
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
