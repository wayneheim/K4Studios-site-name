import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import PunchInIntro from "./PunchInIntro.jsx";

export default function StoryShow({ images, startImageId, onExit }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isIntro, setIsIntro] = useState(true);
  const [speed, setSpeed] = useState(5000);
  const [showControls, setShowControls] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isMobileShort, setIsMobileShort] = useState(false); // NEW: phone/phablet (short side ≤ 900)
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const timer = useRef(null);
  const hideControlsTimer = useRef(null);
  const fsRef = useRef(null);
  const CROSSFADE_OUT = 0.35;  // seconds to fade old image down to ~10–20%
const CROSSFADE_LEAD = 0.18; // seconds to wait before the next starts fading in


  // ➊ Inactivity timer for controls
  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetHideTimer();
    window.addEventListener("mousemove", resetHideTimer);
    window.addEventListener("pointermove", resetHideTimer);
    window.addEventListener("touchstart", resetHideTimer, { passive: true });
    window.addEventListener("keydown", resetHideTimer);
    return () => {
      window.removeEventListener("mousemove", resetHideTimer);
      window.removeEventListener("pointermove", resetHideTimer);
      window.removeEventListener("touchstart", resetHideTimer);
      window.removeEventListener("keydown", resetHideTimer);
      clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // ➋ Orientation + pointer detection
  useEffect(() => {
    const updateFlags = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const landscape = w > h;

      // Use the short side so it works in both orientations
      const shortSide = Math.min(w, h);
      const isMobileish =
        shortSide <= 900 ||
        (window.matchMedia && window.matchMedia("(max-device-width: 900px)").matches);

      setIsLandscape(landscape);
      setVp({ w, h });

      // Keep if referenced elsewhere
      setIsLandscapeMobile(landscape && isMobileish);

      // NEW: phone/phablet in any orientation
      setIsMobileShort(isMobileish);

      if (window.matchMedia) {
        setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
      }
    };

    updateFlags();
    window.addEventListener("resize", updateFlags);
    window.addEventListener("orientationchange", updateFlags);
    return () => {
      window.removeEventListener("resize", updateFlags);
      window.removeEventListener("orientationchange", updateFlags);
    };
  }, []);

  // ➌ Fullscreen helper
  const enterFullScreen = () => {
    const el = fsRef.current;
    if (!el) return;
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    request && request.call(el);
  };

  const orderedImages = useMemo(
    () => reorderImages(images, startImageId),
    [images, startImageId]
  );
  const current = orderedImages[index];
  const isVertical = current?.aspectRatio && current.aspectRatio < 1;

  // Compute image max sizes to avoid cropping and use more space for portrait
  const imgStyle = useMemo(() => {
    const style = {};
    const hasText = Boolean(current?.story) && !isMobileShort; // hide story on all phones/phablets

    if (isLandscape) {
      if (isVertical) {
        const maxH = Math.round(vp.h * 0.92);
        style.height = `${maxH}px`;
        style.maxHeight = `${maxH}px`;
        style.width = "auto";
        style.maxWidth = hasText ? `${Math.round(vp.w * 0.7)}px` : "none";
      } else {
        style.maxHeight = `${Math.round(vp.h * 0.92)}px`;
        style.maxWidth = `${Math.round(vp.w * 0.96)}px`;
      }
    } else {
      style.maxHeight = "100vh";
      style.maxWidth = "100vw";
    }
    return style;
  }, [isLandscape, isVertical, vp.h, vp.w, current?.story, isMobileShort]);

  const [kenAngles] = useState(() =>
    images.map((_, idx) => {
      const amount = 0.4 + Math.random() * 1.8;
      const direction = idx % 2 === 0 ? -1 : 1;
      return direction * amount;
    })
  );
  const kenAngle = kenAngles[index];

  const kenBurns = useMemo(() => {
    if (isLandscape && isVertical) {
      // Subtle zoom to avoid cropping in portrait-in-landscape
      return {
        initial: { scale: 1, opacity: 0.95, rotate: 0 },
        animate: { scale: 1.06, opacity: 1, rotate: 0 },
        exit: { opacity: 0 },
        transition: { duration: speed / 950, ease: "easeInOut" },
      };
    }
    return {
        initial: { scale: 1.14, opacity: 0.92, rotate: 0 },
        animate: { scale: 1.5, opacity: 1, rotate: kenAngle },
        exit: { opacity: 0 },
        transition: { duration: speed / 950, ease: "easeInOut" },
    };
  }, [isLandscape, isVertical, speed, kenAngle]);

  useEffect(() => {
    if (isIntro) {
      const introTimer = setTimeout(() => setIsIntro(false), 3000);
      return () => clearTimeout(introTimer);
    }
    if (!isPaused) {
      timer.current = setTimeout(() => {
        setIndex((i) => (i + 1) % orderedImages.length);
      }, speed);
      return () => clearTimeout(timer.current);
    }
  }, [index, isPaused, speed, isIntro, orderedImages.length]);

  function reorderImages(list, startId) {
    const startIndex = list.findIndex((img) => img.id === startId);
    if (startIndex === -1) return list;
    return [...list.slice(startIndex), ...list.slice(0, startIndex)];
  }

  function handleExit() {
    if (onExit) onExit(current);
  }

  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.76, ease: "easeIn" } },
  };

  return createPortal(
    <>
      <style jsx>{`
        /* Hide narrative on small landscape viewports (visual nicety only);
           logic-side already hides it for all phones via isMobileShort. */
        @media (orientation: landscape) and (max-width: 900px) {
          .gallery-slideshow img { object-fit: contain; transition: transform 0.3s ease-in-out; }
          .slideshow-controls {
            background: #000;
            transform: translateX(-50%) scale(0.9);
            transform-origin: bottom center;
            left: 50% !important;
          }
          .slideshow-controls .btn { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
        }

        .gallery-slideshow img { width: 100%; height: auto; }
        .story-title { font-size: 1.125rem; }
        .story-body { font-size: 1rem; line-height: 1.5; }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <div
        ref={fsRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100dvh", // use dynamic viewport to avoid offscreen controls in portrait
          backgroundColor: "black",
          color: "white",
          zIndex: 9999,
          overflow: "hidden",
          fontFamily: "'Glegoo', serif",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Landscape prompt */}
        {isLandscape &&
          !(document.fullscreenElement || document.webkitFullscreenElement) && (
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bg-black text-white border border-white rounded px-4 py-2 text-xs pointer-events-auto"
                  style={{
                    cursor: "pointer",
                    zIndex: 10001,
                    top: "0.5rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                  onClick={enterFullScreen}
                  onTouchEnd={enterFullScreen}
                >
                  Use full-screen for best experience.
                </motion.div>
              )}
            </AnimatePresence>
          )}

        {/* Global paused chip, centered above toolbar */}
        <AnimatePresence>
          {isPaused && showControls && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.95, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-1/2 -translate-x-1/2 text-white text-xs uppercase font-semibold px-2 py-0.5 border border-white/80 rounded"
              style={{ zIndex: 10002, bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 3.25rem)" }}
            >
              Paused
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isIntro ? (
            <PunchInIntro onDone={() => setIsIntro(false)} />
          ) : (
            <motion.div
              key={current.id}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              {...fade}
            >
              <div className="w-screen h-screen flex items-center justify-center relative gallery-slideshow">
                <motion.img
                  src={current.url}
                  alt={current.title || ""}
                  className={`object-contain cursor-pointer ${isVertical ? "vertical" : ""}`}
                  style={imgStyle}
                  onClick={() => setIsPaused((p) => !p)}
                  {...kenBurns}
                />

                {/* Title + Story: hidden for all phones/phablets via isMobileShort */}
{current.story && !isMobileShort && (
  <motion.div
    className={`absolute p-4 md:p-6 text-sm md:text-base text-content ${
      isVertical
        ? "right-6 top-1/2 -translate-y-1/2"
        : "bottom-8 right-8"
    }`}
    {...fade}
    style={{
      // ✅ Cap width to 520px or 92vw (whichever is smaller)
      maxWidth: "min(92vw, 520px)",
      // ✅ Prevent the box from stretching wider than the cap
      width: "auto",
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      boxShadow: "0 0 2px 2px rgba(0, 0, 0, 0.2)",
      borderRadius: "1rem",
    }}
  >
    {isPaused && (
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 text-white text-xs uppercase font-semibold px-2 py-0.5 border border-white rounded"
        style={{ opacity: 0.9 }}
      >
        Paused
      </div>
    )}
    <div className="font-semibold text-lg mb-2 story-title">
      {current.title}
    </div>

    {/* ✅ Force line wrapping */}
    <div
      className="opacity-80 story-body"
      style={{
        whiteSpace: "pre-wrap",        // preserve newlines, wrap lines
        overflowWrap: "anywhere",       // break long words if needed
        wordBreak: "break-word"         // extra safety for older browsers
      }}
    >
      {current.story}
    </div>
  </motion.div>
)}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showControls && !isIntro && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute border rounded-lg p-2 flex gap-4 items-center slideshow-controls"
              style={{
                borderColor: "rgba(255,255,255,0.25)",
                backgroundColor: "rgba(0, 0, 0, 0.8)", // 80% opaque black
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 4rem)",
              }}
            >
              {/* Pause/Play */}
              <button
                onClick={() => setIsPaused((p) => !p)}
                className="bg-white/10 text-white rounded px-3 py-1 hover:bg-white/20 transition btn"
                aria-label={isPaused ? "Resume slideshow" : "Pause slideshow"}
                title={isPaused ? "Resume slideshow" : "Pause slideshow"}
              >
                {isPaused ? "▶" : "‖‖"}
              </button>

              {/* Speed Selector */}
              <div className="flex gap-2" role="group" aria-label="Slideshow speed">
                {[3000, 5000, 9000].map((s, idx) => {
                  const label = idx === 0 ? "Fast" : idx === 1 ? "Medium" : "Slow";
                  return (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className="bg-white/10 text-white rounded px-3 py-1 h-8 flex items-center justify-center hover:bg-white/20 transition btn"
                      aria-label={`Set speed to ${label}`}
                      title={`Set speed to ${label}`}
                    >
                      <div className="flex gap-1">
                        {Array.from({ length: idx + 1 }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-2 h-2 rounded-full bg-white ${speed === s ? "" : "opacity-50"}`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Exit */}
              <button
                onClick={handleExit}
                className="bg-white/10 text-white rounded px-2 py-1 hover:bg-white/20 transition btn"
                aria-label="Exit slideshow"
                title="Exit slideshow"
              >
                Exit
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>,
    document.body
  );
}
