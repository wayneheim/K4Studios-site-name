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
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false); // NEW: mobile-landscape flag
  const [vp, setVp] = useState({ w: 0, h: 0 }); // viewport size
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const timer = useRef(null);
  const hideControlsTimer = useRef(null);
  const fsRef = useRef(null);

  // ➊ Inactivity timer for controls
  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
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

// ➋ Orientation + pointer detection (REPLACEMENT)
useEffect(() => {
  const updateFlags = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const landscape = w > h;

    // Use the short side so it works in both orientations
    const shortSide = Math.min(w, h);
    const isMobileish =
      shortSide <= 900 ||
      (window.matchMedia && window.matchMedia("(max-device-width: 768px)").matches);

    setIsLandscape(landscape);
    setVp({ w, h });

    // Mobile LANDSCAPE only
    setIsLandscapeMobile(landscape && isMobileish);

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
    const hasText = Boolean(current?.story) && !isLandscapeMobile; // hide story ONLY on mobile landscape

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
  }, [isLandscape, isVertical, vp.h, vp.w, current?.story, isLandscapeMobile]);

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
        /* No blanket hide on all mobile anymore.
           Only hide story/title on <=768px WHEN in landscape. */

        @media (orientation: landscape) and (max-width: 768px) {
          .text-content, .story-title, .story-body { display: none !important; }
          .gallery-slideshow img { object-fit: contain; transition: transform 0.3s ease-in-out; }
          .slideshow-controls {
            background: #000;
            transform: translateX(-50%) scale(0.9);
            transform-origin: bottom center;
            left: 50% !important;
          }
          .slideshow-controls .btn { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
        }

        /* Keep the slideshow image sane */
        .gallery-slideshow img { width: 100%; height: auto; }

        /* Base story sizes so title stays larger than body by default */
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
          height: "100vh",
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

                {/* Title + Story: hidden only on mobile landscape */}
                {current.story && !isLandscapeMobile && (
                  <motion.div
                    className={`absolute p-4 md:p-6 max-w-[90%] md:max-w-[40%] ${
                      isVertical
                        ? "right-4 top-1/2 -translate-y-1/2"
                        : "bottom-6 left-1/2 -translate-x-1/2"
                    } text-sm md:text-base text-content`}
                    {...fade}
                    style={{
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
                    <div className="opacity-80 whitespace-pre-line story-body">
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
                backgroundColor: "#000",
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 3rem)", // ← universal lift
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
