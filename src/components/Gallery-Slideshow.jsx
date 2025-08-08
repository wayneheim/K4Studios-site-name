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
    return () => {
      window.removeEventListener("mousemove", resetHideTimer);
      clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // ➋ Landscape detection
  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
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

  const [kenAngles] = useState(() =>
    images.map((_, idx) => {
      const amount = 0.4 + Math.random() * 1.8;
      const direction = idx % 2 === 0 ? -1 : 1;
      return direction * amount;
    })
  );
  const kenAngle = kenAngles[index];

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

  const kenBurns = {
    initial: { scale: 1.14, opacity: 0.92, rotate: 0 },
    animate: { scale: 1.5, opacity: 1, rotate: kenAngle },
    exit: { opacity: 0 },
    transition: { duration: speed / 950, ease: "easeInOut" },
  };

  return createPortal(
    <>
 <style jsx>{`
      @media (orientation: landscape) and (max-width: 768px) {
        .gallery-slideshow {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
        }

        .gallery-slideshow img {
          max-width: 50%;
          height: auto;
        }

        .gallery-slideshow .text-content {
          max-width: 45%;
          font-size: 0.9rem;
        }
      }

      .gallery-slideshow img {
        width: 100%;
        height: auto;
      }

      .gallery-slideshow .text-content {
        font-size: clamp(1rem, 2.5vw, 1.5rem);
      }
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
        }}
      >
        {/* Landscape prompt */}
       {isLandscape &&
  !(document.fullscreenElement || document.webkitFullscreenElement) && (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/10 text-white rounded px-4 py-2 text-xs pointer-events-auto"
      style={{ cursor: "pointer", zIndex: 10001 }}
      onClick={enterFullScreen}
      onTouchEnd={enterFullScreen}
    >
      Tap to enter full-screen for best experience
    </div>
)}

        <AnimatePresence>
          {isIntro ? (
            <PunchInIntro onDone={() => setIsIntro(false)} />
          ) : (
            <motion.div
              key={current.id}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              {...fade}
            >
              <div className="w-screen h-screen flex items-center justify-center relative">
                <motion.img
                  src={current.url}
                  alt={current.title || ""}
                  className="max-w-[100vw] max-h-[100vh] object-contain cursor-pointer"
                  onClick={() => setIsPaused((p) => !p)}
                  {...kenBurns}
                />

                {current.story && (
                  <motion.div
                    className={`absolute p-4 md:p-6 max-w-[90%] md:max-w-[40%] ${
                      isVertical
                        ? "right-4 top-1/2 -translate-y-1/2"
                        : "bottom-6 left-1/2 -translate-x-1/2"
                    } text-sm md:text-base`}
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
                    <div className="font-semibold text-lg mb-2">
                      {current.title}
                    </div>
                    <div className="opacity-80 whitespace-pre-line">
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
              className="absolute bottom-4 left-4 border rounded-lg p-2 flex gap-4 items-center bg-black/30"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              {/* Pause/Play */}
              <button
                onClick={() => setIsPaused((p) => !p)}
                className="bg-white/10 text-white rounded px-3 py-1 hover:bg-white/20 transition"
                aria-label={isPaused ? "Resume slideshow" : "Pause slideshow"}
                title={isPaused ? "Resume slideshow" : "Pause slideshow"}
              >
                {isPaused ? "▶" : "‖‖"}
              </button>

              {/* Speed Selector */}
              <div
                className="flex gap-2"
                role="group"
                aria-label="Slideshow speed"
              >
                {[3000, 5000, 9000].map((s, idx) => {
                  const label =
                    idx === 0 ? "Fast" : idx === 1 ? "Medium" : "Slow";
                  return (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className="bg-white/10 text-white rounded px-3 py-1 h-8 flex items-center justify-center hover:bg-white/20 transition"
                      aria-label={`Set speed to ${label}`}
                      title={`Set speed to ${label}`}
                    >
                      <div className="flex gap-1">
                        {Array.from({ length: idx + 1 }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-2 h-2 rounded-full bg-white ${
                              speed === s ? "" : "opacity-50"
                            }`}
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
                className="bg-white/10 text-white rounded px-3 py-1 hover:bg-white/20 transition"
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
