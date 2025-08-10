import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const title = "Embrace the Past... Live the Story";
const letters = title.split("").map(l => (l === " " ? "\u00A0" : l));

function getLetterDelays(count, min = 0, max = 0.7) {
  return Array.from({ length: count }, () =>
    +(Math.random() * (max - min) + min).toFixed(2)
  );
}

export default function PunchInIntro({ onDone }) {
  const [showCurtain, setShowCurtain] = useState(true);         // <--- 1. ADD THIS
  const [showShimmer, setShowShimmer] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const delays = useRef(getLetterDelays(letters.length, 0, 0.7)).current;

  // 2. REMOVE THE CURTAIN AFTER 1S
  useEffect(() => {
    const curtain = setTimeout(() => setShowCurtain(false), 800);
    return () => clearTimeout(curtain);
  }, []);

  // Track when all letters are in
  useEffect(() => {
    if (visibleCount === letters.length) {
      const holdTimer = setTimeout(() => {
        setFadeOut(true);
        if (onDone) onDone();
      }, 5500);
      return () => clearTimeout(holdTimer);
    }
  }, [visibleCount, onDone]);

  const letterVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 8 },
    visible: custom => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: delays[custom],
        type: "spring",
        stiffness: 420,
        damping: 32,
        duration: 1.0
      }
    })
  };

  // 3. CURTAIN GOES HERE!
  if (showCurtain) {
    return (
      <div
        className="absolute inset-0 bg-black"
        style={{ zIndex: 20 }}
      />
    );
  }

  return (
    <motion.div
      key="intro"
      className="absolute inset-0 flex items-center justify-center font-serif"
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 1.7, ease: "fade" }}
      style={{
  // Responsive size: still allows wrap on narrow screens without over-scaling
  fontSize: "clamp(1.05rem,2.5vw,2.7rem)",
        letterSpacing: ".05em",
        fontFamily: "'Glegoo', serif",
        color: "#f3ecd9",
  fontWeight: 700,
  // Provide ~5px margin on each side while centering
  maxWidth: "calc(100% - 10px)",
  margin: "0 5px",
  padding: 0,
  textAlign: "center",
  lineHeight: 1.12
      }}
    >
      {letters.map((l, i) => (
        <motion.span
          key={i}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={letterVariants}
          onAnimationComplete={() =>
            setVisibleCount(c => (c < letters.length ? c + 1 : c))
          }
          style={{
            display: "inline-block",
            marginRight: l === "\u00A0" ? "0.25em" : "0.01em"
          }}
        >
          {l}
        </motion.span>
      ))}
    </motion.div>
  );
}
