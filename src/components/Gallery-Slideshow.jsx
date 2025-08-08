import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import PunchInIntro from "./PunchInIntro.jsx";

export default function StoryShow({ images, startImageId, onExit }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isIntro, setIsIntro] = useState(true);
  const [speed, setSpeed] = useState(5000);
  const timer = useRef(null);

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

    if (!isPaused && index < orderedImages.length - 1) {
      timer.current = setTimeout(() => setIndex((i) => i + 1), speed);
      return () => clearTimeout(timer.current);
    }

    if (!isPaused && index === orderedImages.length - 1 && !isIntro) {
      timer.current = setTimeout(() => setIndex(0), speed);
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
      <link
        href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <div
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
                  className="max-w-[100vw] max-h-[100vh] object-contain"
                  {...kenBurns}
                />

                {current.story && (
                  <motion.div
                    className={`absolute bg-black/60 p-4 md:p-6 rounded-xl max-w-[90%] md:max-w-[40%] ${
                      isVertical
                        ? "right-4 top-1/2 -translate-y-1/2"
                        : "bottom-6 left-1/2 -translate-x-1/2"
                    } text-sm md:text-base`}
                    {...fade}
                  >
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

        {/* Controls */}
        <div className="absolute bottom-4 left-4 flex gap-4 items-center text-sm">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="bg-white/10 px-3 py-1 rounded hover:bg-white/20"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <div className="relative">
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="appearance-none bg-black border border-white/20 rounded px-3 py-2 pr-8 text-xs flex items-center"
              style={{
                minWidth: 56,
                color: "#fff",
                fontFamily: "'Glegoo', serif",
                fontSize: "1.12em",
              }}
              aria-label="Slideshow speed"
            >
              <option value={3000}>Fast</option>
              <option value={5000}>Medium</option>
              <option value={9000}>Slow</option>
            </select>
            <span
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60"
              style={{ fontSize: "1em" }}
            >
              ▼
            </span>
          </div>
        </div>

        <button
          onClick={handleExit}
          className="absolute top-4 right-4 bg-white/10 px-3 py-1 rounded hover:bg-white/20 text-sm"
        >
          Exit
        </button>
      </div>
    </>,
    document.body
  );
}
