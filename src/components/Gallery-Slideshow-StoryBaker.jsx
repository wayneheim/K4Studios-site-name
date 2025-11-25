// Editor saved stage at 50% preview — promote back to 1:1
const EDITOR_PREVIEW_SCALE = 0.5;
const REAL_SCALE = 1 / EDITOR_PREVIEW_SCALE; // => 2
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ShoppingCart, VolumeX, Volume2 } from "lucide-react";
import PunchInIntro from "./PunchInIntro.jsx";

// Helper function to select the best image source for slideshow display
const getBestImageSrc = (image) => {
  if (!image) return "";
  // For slideshow: prefer srcXL (extra large), then srcL (large), then srcM (medium), then src (original)
  return image.srcXL || image.srcL || image.srcM || image.src || "";
};

const MIN_STAGE_DURATION = 0.5;
const DEFAULT_STAGE_DURATION = 2;
const DEFAULT_PAUSE_DURATION = 2;
const BLACKOUT_MS = 400;

const normalizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDuration = (value, fallback = DEFAULT_STAGE_DURATION) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(MIN_STAGE_DURATION, fallback);
  return Math.max(MIN_STAGE_DURATION, parsed);
};

const normalizePause = (value, fallback = DEFAULT_PAUSE_DURATION) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(0, fallback);
  return Math.max(0, parsed);
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clamp01 = (value) => clamp(value, 0, 1);

const extractStageDurations = (panZoom) => {
  if (!panZoom) return null;
  return {
    start: normalizeDuration(panZoom.start?.duration, DEFAULT_STAGE_DURATION),
    mid: normalizeDuration(panZoom.mid?.duration, DEFAULT_STAGE_DURATION),
    end: normalizeDuration(panZoom.end?.duration, DEFAULT_STAGE_DURATION),
    pause: normalizePause(panZoom.pauseDuration, DEFAULT_PAUSE_DURATION),
  };
};

const getStageSnapshot = (panZoom, stageKey, fallbackKey) => {
  if (!panZoom) return null;
  const source = panZoom[stageKey] ?? (fallbackKey ? panZoom[fallbackKey] : null);
  if (!source) return null;
  return {
    scale: normalizeNumber(source.scale ?? source.zoom, 1),
    rotation: normalizeNumber(source.rotation, 0),
    x: normalizeNumber(source.x ?? source.offset?.x, 0.5),
    y: normalizeNumber(source.y ?? source.offset?.y, 0.5),
  };
};

const computeOverlayTransform = (stage) => {
  if (!stage) return "translate(-50%, -50%)";
  const translateX = (0.5 - stage.x) * 100;
  const translateY = (0.5 - stage.y) * 100;
  return `translate(-50%, -50%) scale(${stage.scale}) rotate(${stage.rotation}deg) translate(${translateX}%, ${translateY}%)`;
};

const randomDelay = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

const buildIntroWordGroups = (tagline) => {
  const trimmed = tagline?.trim();
  if (!trimmed) return [];
  const words = trimmed.split(/\s+/);
  return words.map((word, wordIdx) => ({
    key: `intro-word-${wordIdx}`,
    marginLeft: wordIdx === 0 ? 0 : "0.35em",
    letters: word.split("").map((char, letterIdx) => ({
      key: `intro-letter-${wordIdx}-${letterIdx}`,
      displayChar: char === " " ? "\u00A0" : char,
      enterDelay: randomDelay(0, 0.7),
      exitDelay: randomDelay(0.15, 0.55),
    })),
  }));
};

const introLetterVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  visible: (letter) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: letter?.enterDelay ?? 0,
      type: "spring",
      stiffness: 420,
      damping: 32,
      duration: 1,
    },
  }),
  popOut: (letter) => ({
    opacity: 0,
    scale: 0.65,
    y: -10,
    transition: { delay: letter?.exitDelay ?? 0, duration: 0.35, ease: "easeIn" },
  }),
};

function buildPanZoomAnimation(panZoom) {
  if (!panZoom) return null;

  const baseStage = {
    scale: 1,
    rotate: 0,
    x: 0.5,
    y: 0.5,
    duration: DEFAULT_STAGE_DURATION,
  };

  const extractStage = (stage, fallback) => {
    if (!stage) return fallback;
    return {
      scale: normalizeNumber(stage.scale ?? stage.zoom, fallback.scale),
      rotate: normalizeNumber(stage.rotation, fallback.rotate),
      x: clamp01(normalizeNumber(stage.x ?? stage.offset?.x, fallback.x)),
      y: clamp01(normalizeNumber(stage.y ?? stage.offset?.y, fallback.y)),
      duration: normalizeDuration(stage.duration, fallback.duration),
    };
  };

  const startStage = extractStage(panZoom.start, baseStage);
  const midStage = extractStage(panZoom.mid, startStage);
  const endStage = extractStage(panZoom.end, midStage);
  const pauseDuration = normalizePause(panZoom.pauseDuration, DEFAULT_PAUSE_DURATION);

  const forwardFirst = Math.max(MIN_STAGE_DURATION, startStage.duration);
  const forwardSecond = Math.max(MIN_STAGE_DURATION, midStage.duration + endStage.duration);
  const reverseFirst = forwardSecond;
  const reverseSecond = forwardFirst;

  const endHoldStage = {
    scale: endStage.scale,
    rotate: endStage.rotate,
    x: endStage.x,
    y: endStage.y,
  };

  const keyframes = [startStage, midStage, endStage, endHoldStage, midStage, startStage];
  const legDurations = [
    forwardFirst,
    forwardSecond,
    pauseDuration,
    reverseFirst,
    reverseSecond,
  ];
  const totalDuration = legDurations.reduce((acc, value) => acc + value, 0);
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return null;

  const times = [0];
  let accumulator = 0;
  legDurations.forEach((segment) => {
    accumulator += segment;
    times.push(accumulator / totalDuration);
  });

  const buildTransform = (stage) => {
    // Editor saved normalized coordinates and scale at 50% preview, so we need to scale up to 100% actual size.
    // The editor's normalized x/y are in [0,1] relative to the 50% preview, so for playback we use them as-is for 100% size.
    // No need to correct for scale factor here; just use the normalized values directly.
    const scale = stage?.scale ?? 1;
    const rotate = stage?.rotate ?? 0;
    const x = stage?.x ?? 0.5;
    const y = stage?.y ?? 0.5;
    const translateX = (0.5 - x) * 100;
    const translateY = (0.5 - y) * 100;
    return `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg) translate(${translateX}%, ${translateY}%)`;
  };

  const transformKeyframes = keyframes.map((frame) => buildTransform(frame));

  return {
    initial: {
      transform: transformKeyframes[0],
    },
    animate: {
      transform: transformKeyframes,
    },
    transition: {
      duration: totalDuration,
      ease: "linear",
      times,
      repeat: Infinity,
      repeatType: "loop",
    },
    exit: { opacity: 0, transition: { duration: 0.45, ease: "easeInOut" } },
  };
}

export default function StoryShowBaker({ images, startImageId, onExit, isMuted = false, setIsMuted, volume = 0.7, setVolume, audioRef, ambientAudioRef, setIsSpeaking, isSpeaking, globalAudioSrc, globalAudioMode, outputAspect, outputResolution, introMeta = {}, outroMeta = {}, showTitle = "" }) {
  const [index, setIndex] = useState(0);
  const [isIntro, setIsIntro] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isMobileShort, setIsMobileShort] = useState(false); // NEW: phone/phablet (short side ≤ 900)
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [introPhase, setIntroPhase] = useState("start");
  const [outroPhase, setOutroPhase] = useState("start");

  const fsRef = useRef(null);
  const stageDisplayRef = useRef(null);
  const liveAreaRef = useRef(null);
  const [liveAreaSize, setLiveAreaSize] = useState({ width: null, height: null });
  const hasUserUnlockedAudioRef = useRef(false);
  const hasAutoPlayedRef = useRef(false);
  const hideControlsTimerRef = useRef(null);
  const showControlsRef = useRef(true);
  const ignoreAudioEndedRef = useRef(false);
  const [blackoutPhase, setBlackoutPhase] = useState("idle"); // idle | fade-out | fade-in
  const blackoutCallbackRef = useRef(null);

  const orderedImages = useMemo(
    () => reorderImages(images, startImageId),
    [images, startImageId]
  );
  const current = orderedImages[index];


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

  useEffect(() => {
    showControlsRef.current = showControls;
  }, [showControls]);

  useEffect(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }

    if (isIntro) {
      if (!showControlsRef.current) {
        showControlsRef.current = true;
        setShowControls(true);
      }
      return;
    }

    if (isCoarsePointer) {
      if (!showControlsRef.current) {
        showControlsRef.current = true;
        setShowControls(true);
      }
      return;
    }

    const handlePointerActivity = () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      if (!showControlsRef.current) {
        showControlsRef.current = true;
        setShowControls(true);
      }

      hideControlsTimerRef.current = setTimeout(() => {
        showControlsRef.current = false;
        setShowControls(false);
      }, 2000);
    };

    handlePointerActivity();

    window.addEventListener("mousemove", handlePointerActivity);
    window.addEventListener("mousedown", handlePointerActivity);
    window.addEventListener("keydown", handlePointerActivity);

    return () => {
      window.removeEventListener("mousemove", handlePointerActivity);
      window.removeEventListener("mousedown", handlePointerActivity);
      window.removeEventListener("keydown", handlePointerActivity);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }
    };
  }, [isIntro, isCoarsePointer, setShowControls]);

  useEffect(() => {
    if (blackoutPhase === "fade-out") {
      const timer = setTimeout(() => {
        blackoutCallbackRef.current?.();
        setBlackoutPhase("fade-in");
      }, BLACKOUT_MS);
      return () => clearTimeout(timer);
    }
    if (blackoutPhase === "fade-in") {
      const timer = setTimeout(() => {
        setBlackoutPhase("idle");
        blackoutCallbackRef.current = null;
      }, BLACKOUT_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [blackoutPhase]);

  const isIntroSlide = current?._isIntro || current?.id === "i-k4video-intro";
  const isOutroSlide = current?._isOutro || current?.id === "i-k4video-outro";
  const isVertical = current?.aspectRatio && current.aspectRatio < 1;

  const introDurations = useMemo(
    () => {
      if (!isIntroSlide) return null;
      const durations = extractStageDurations(current?.panZoom);
      if (!durations) return null;
      const { start = DEFAULT_STAGE_DURATION, mid = DEFAULT_STAGE_DURATION, end = DEFAULT_STAGE_DURATION } = durations;
      return {
        start,
        mid,
        end,
        total: start + mid + end,
      };
    },
    [isIntroSlide, current?.panZoom]
  );
  const outroDurations = useMemo(
    () => {
      if (!isOutroSlide) return null;
      const durations = extractStageDurations(current?.panZoom);
      if (!durations) return null;
      const { start = DEFAULT_STAGE_DURATION, mid = DEFAULT_STAGE_DURATION, end = DEFAULT_STAGE_DURATION } = durations;
      return {
        start,
        mid,
        end,
        total: start + mid + end,
      };
    },
    [isOutroSlide, current?.panZoom]
  );

  const introStageSnapshot = useMemo(() => {
    if (!isIntroSlide) return null;
    if (introPhase === "start") return getStageSnapshot(current?.panZoom, "start");
    if (introPhase === "mid") return getStageSnapshot(current?.panZoom, "mid", "start");
    return (
      getStageSnapshot(current?.panZoom, "end", "mid") ||
      getStageSnapshot(current?.panZoom, "mid", "start") ||
      getStageSnapshot(current?.panZoom, "start")
    );
  }, [current?.panZoom, introPhase, isIntroSlide]);

  const outroStageSnapshot = useMemo(() => {
    if (!isOutroSlide) return null;
    if (outroPhase === "start") return getStageSnapshot(current?.panZoom, "start");
    if (outroPhase === "mid") return getStageSnapshot(current?.panZoom, "mid", "start");
    return (
      getStageSnapshot(current?.panZoom, "end", "mid") ||
      getStageSnapshot(current?.panZoom, "mid", "start") ||
      getStageSnapshot(current?.panZoom, "start")
    );
  }, [current?.panZoom, outroPhase, isOutroSlide]);

  const introTransform = useMemo(() => computeOverlayTransform(introStageSnapshot), [introStageSnapshot]);

  const outroTransform = useMemo(() => computeOverlayTransform(outroStageSnapshot), [outroStageSnapshot]);

  // Compute image max sizes to avoid cropping and use more space for portrait
  const {
    imgStyle,
    stageDisplayStyle,
    stageContentStyle,
    imageContainerStyle,
  } = useMemo(() => {
    const baseImageStyle = {
      filter: "contrast(1.14) brightness(1.04) url(#sharpen)",
      willChange: "transform",
    };
    const baseContainerStyle = {
      position: "absolute",
      left: "50%",
      top: "50%",
      transformOrigin: "center center",
    };

    // --------------------------
    // Pull stageMeta from editor
    // --------------------------
    const stageMeta = current?.panZoom?.stageMeta || {};
    const metaWidth = toPositiveNumber(stageMeta.width)
      ? toPositiveNumber(stageMeta.width) * REAL_SCALE
      : null;
    const metaHeight = toPositiveNumber(stageMeta.height)
      ? toPositiveNumber(stageMeta.height) * REAL_SCALE
      : null;
    const metaImageWidth = toPositiveNumber(stageMeta.imageWidth)
      ? toPositiveNumber(stageMeta.imageWidth) * REAL_SCALE
      : null;
    const metaImageHeight = toPositiveNumber(stageMeta.imageHeight)
      ? toPositiveNumber(stageMeta.imageHeight) * REAL_SCALE
      : null;

    // If we have valid meta sizes, use them directly as full render dims
    if (metaWidth && metaHeight) {
      const imageWidth = metaImageWidth ?? metaWidth;
      const imageHeight = metaImageHeight ?? metaHeight;

      // ✅ Automatically shrink if too large for viewport
      const fitScale = Math.min(
        1,
        (vp.w * 0.94) / metaWidth,
        (vp.h * 0.92) / metaHeight
      );

      return {
        imgStyle: {
          ...baseImageStyle,
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          maxWidth: "none",
          maxHeight: "none",
        },
        stageDisplayStyle: {
          position: "relative",
          width: `${metaWidth}px`,
          height: `${metaHeight}px`,
          overflow: "hidden",
          backgroundColor: "black",
          margin: "0 auto",
          transform: `scale(${fitScale})`,
          transformOrigin: "top left",
        },
        stageContentStyle: {
          position: "absolute",
          top: 0,
          left: 0,
          width: `${metaWidth}px`,
          height: `${metaHeight}px`,
          transform: "none",
        },
        imageContainerStyle: {
          ...baseContainerStyle,
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
        },
        realMetaWidth: metaWidth,
        realMetaHeight: metaHeight,
      };
    }

    // Fallback if no meta found (uses outputResolution)
    const widthPx = Number(outputResolution?.width);
    const heightPx = Number(outputResolution?.height);
    const hasResolution =
      Number.isFinite(widthPx) && Number.isFinite(heightPx) && widthPx > 0 && heightPx > 0;

    if (hasResolution) {
      return {
        imgStyle: {
          ...baseImageStyle,
          width: `${widthPx}px`,
          height: `${heightPx}px`,
        },
        stageDisplayStyle: {
          position: "relative",
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          overflow: "hidden",
          backgroundColor: "black",
          margin: "0 auto",
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        stageContentStyle: {
          position: "absolute",
          top: 0,
          left: 0,
          width: `${widthPx}px`,
          height: `${heightPx}px`,
        },
        imageContainerStyle: {
          ...baseContainerStyle,
          width: `${widthPx}px`,
          height: `${heightPx}px`,
        },
        realMetaWidth: widthPx,
        realMetaHeight: heightPx,
      };
    }

    // Generic fallback
    return {
      imgStyle: baseImageStyle,
      stageDisplayStyle: {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      },
      stageContentStyle: { position: "absolute", top: 0, left: 0 },
      imageContainerStyle: baseContainerStyle,
    };
  }, [
    current?.panZoom?.stageMeta,
    outputResolution,
    vp.w,
    vp.h,
  ]);

  const introOpening = useMemo(() => {
    if (!isIntroSlide) return "";
    return (
      current?.opening ||
      introMeta?.introText ||
      current?.story ||
      "K4 Studios presents the Fine Art Photography of Wayne Heim."
    );
  }, [current, introMeta, isIntroSlide]);

  const introTitle = useMemo(() => {
    if (!isIntroSlide) return "";
    const titleOptions = [
      current?.title,
      introMeta?.showTitle,
      current?.showTitle,
      showTitle,
      "K4 Studios Picture Show",
    ];
    return titleOptions.find((value) => value && value.trim().length > 0) || "";
  }, [current, introMeta, isIntroSlide, showTitle]);

  const introTagline = useMemo(() => {
    if (!isIntroSlide) return "";
    return current?.tagline || introMeta?.tagline || "Embrace the Past... Live the Story.";
  }, [current, introMeta, isIntroSlide]);

  const introWordGroups = useMemo(() => buildIntroWordGroups(introTagline), [introTagline]);

  useEffect(() => {
    if (!isIntroSlide || !introDurations) {
      setIntroPhase("start");
      return;
    }

    setIntroPhase("start");

    const timers = [];
    const midAt = introDurations.start * 1000;
    const endAt = (introDurations.start + introDurations.mid) * 1000;
    const doneAt = introDurations.total * 1000;

    if (midAt > 0) timers.push(setTimeout(() => setIntroPhase("mid"), midAt));
    if (endAt > 0) timers.push(setTimeout(() => setIntroPhase("end"), endAt));
    if (doneAt > 0) timers.push(setTimeout(() => setIntroPhase("done"), doneAt));

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
    };
  }, [isIntroSlide, introDurations, index]);

  const outroClosing = useMemo(() => {
    if (!isOutroSlide) return "";
    return (
      current?.closing ||
      outroMeta?.closingText ||
      current?.story ||
      "Every image is another notch in the belt, keeping history alive."
    );
  }, [current, outroMeta, isOutroSlide]);

  useEffect(() => {
    if (!isOutroSlide || !outroDurations) {
      setOutroPhase("start");
      return;
    }

    setOutroPhase("start");

    const timers = [];
    const midAt = outroDurations.start * 1000;
    const endAt = (outroDurations.start + outroDurations.mid) * 1000;
    const doneAt = outroDurations.total * 1000;

    if (midAt > 0) timers.push(setTimeout(() => setOutroPhase("mid"), midAt));
    if (endAt > 0) timers.push(setTimeout(() => setOutroPhase("end"), endAt));
    if (doneAt > 0) timers.push(setTimeout(() => setOutroPhase("done"), doneAt));

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
    };
  }, [isOutroSlide, outroDurations, index]);

  const outroCta = useMemo(() => {
    if (!isOutroSlide) return "";
    return current?.cta || outroMeta?.cta || "Visit k4studios.com to explore more Picture Shows.";
  }, [current, outroMeta, isOutroSlide]);

  const outroUrl = useMemo(() => {
    if (!isOutroSlide) return "";
    const fallbackTitle = introMeta?.showTitle || showTitle || "unknown";
    const fallbackUrl = `https://www.k4studios.com/pictureshow/${fallbackTitle
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
    return current?.url || outroMeta?.displayUrl || fallbackUrl;
  }, [current, introMeta, outroMeta, isOutroSlide, showTitle]);


  const [kenAngles] = useState(() =>
    images.map((_, idx) => {
      const amount = 0.5 + Math.random() * 2.5; // Base rotation capped at 3° max (0.5-3.0°)
      const direction = idx % 2 === 0 ? -1 : 1;
      return direction * amount;
    })
  );
  const [kenPans] = useState(() =>
    images.map((img) => {
      const isVertical = img?.aspectRatio && img.aspectRatio < 1;
      // Add downward bias since important elements are usually at the top
      // More bias for vertical images (portrait), less for horizontal (landscape)
      const downBias = isVertical ? 15 : 8; // 15px down for vertical, 8px for horizontal
      return {
        x: (Math.random() - 0.5) * 40, // Random pan up to ±20px
        y: (Math.random() - 0.5) * 40 + downBias, // Random pan with downward bias
      };
    })
  );
  const kenAngle = kenAngles[index];
  const kenPan = kenPans[index];

  const kenBurns = useMemo(() => {
    const buildTransform = (scale, rotate, panX, panY) =>
      `translate(-50%, -50%) translate(${panX}px, ${panY}px) rotate(${rotate}deg) scale(${scale})`;

    if (isLandscape && isVertical) {
      const initialTransform = buildTransform(1, 0, kenPan.x * 0.3, kenPan.y * 0.3);
      const animateTransform = buildTransform(1.06, kenAngle * 0.3, kenPan.x * 0.3, kenPan.y * 0.3);
      return {
        initial: { transform: initialTransform, opacity: 0.95 },
        animate: { transform: animateTransform, opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 22, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
      };
    }

    const initialTransform = buildTransform(1.14, 0, kenPan.x, kenPan.y);
    const animateTransform = buildTransform(1.5, kenAngle, kenPan.x, kenPan.y);
    return {
      initial: { transform: initialTransform, opacity: 0.92 },
      animate: { transform: animateTransform, opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 22, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
    };
  }, [isLandscape, isVertical, kenAngle, kenPan]);

  const panZoomAnimation = useMemo(
    () => buildPanZoomAnimation(current?.panZoom),
    [current?.panZoom]
  );
  const imageMotion = panZoomAnimation ?? kenBurns;

  const imageSrc = useMemo(() => getBestImageSrc(current), [current]);

  const imageStack = imageSrc ? (
    <motion.div
      key={current?.id || "slideshow-image"}
      style={imageContainerStyle}
      initial={imageMotion.initial}
      animate={imageMotion.animate}
      exit={imageMotion.exit}
      transition={imageMotion.transition}
    >
      <img
        src={imageSrc}
        alt={current?.title || ""}
        className={`object-cover ${isVertical ? "vertical" : ""}`}
        style={imgStyle}
        draggable={false}
      />
    </motion.div>
  ) : null;

  const liveAreaOverlay = (
    <div
      key="live-area-outline"
      ref={liveAreaRef}
      className="pointer-events-none"
      style={{
        position: "absolute",
        inset: 0,
        border: "2px solid rgba(255, 0, 0, 0.55)",
        boxSizing: "border-box",
        zIndex: 2,
      }}
    />
  );

  // Effect to update the live area overlay's pixel size
  useEffect(() => {
    function updateLiveAreaSize() {
      if (liveAreaRef.current) {
        const rect = liveAreaRef.current.getBoundingClientRect();
        setLiveAreaSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    }
    updateLiveAreaSize();
    window.addEventListener('resize', updateLiveAreaSize);
    return () => window.removeEventListener('resize', updateLiveAreaSize);
  }, [stageDisplayRef]);

  const introOverlayElement = useMemo(() => {
    if (!isIntroSlide) return null;
    const overlayMotion = panZoomAnimation || {
      initial: { transform: introTransform },
      animate: { transform: introTransform },
      transition: { duration: 0 },
    };

    return (
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          className="flex flex-col items-center text-center gap-4 px-6 sm:px-10"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            color: "white",
            maxWidth: "80%",
            transformOrigin: "center center",
            ...(panZoomAnimation ? {} : { transform: introTransform }),
          }}
          initial={overlayMotion.initial}
          animate={overlayMotion.animate}
          transition={overlayMotion.transition}
          exit={overlayMotion.exit}
        >
          <AnimatePresence mode="wait">
            {introPhase === "start" && (
              <motion.div
                key="intro-start"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center gap-4"
              >
                {introOpening && (
                  <div className="text-sm sm:text-base uppercase tracking-[0.4em] opacity-80">
                    {introOpening}
                  </div>
                )}
                <img
                  src="/images/K4-Stories logo2b.webp"
                  alt="K4 Stories Logo"
                  className="w-24 sm:w-36 h-auto"
                  style={{ filter: "drop-shadow(0 0 6px rgba(0,0,0,0.35))" }}
                />
              </motion.div>
            )}

            {introPhase === "mid" && (
              <motion.div
                key="intro-mid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-3xl sm:text-5xl font-semibold tracking-wide uppercase"
              >
                {introTitle}
              </motion.div>
            )}

            {introPhase === "end" && introTagline && (
              <motion.div
                key="intro-end"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-base sm:text-xl font-medium italic opacity-85 max-w-xl flex flex-wrap justify-center"
                style={{ gap: "0.05em", lineHeight: 1.2 }}
              >
                <AnimatePresence mode="sync">
                  {introWordGroups.map((group) => (
                    <span
                      key={group.key}
                      style={{
                        display: "inline-flex",
                        flexWrap: "nowrap",
                        whiteSpace: "nowrap",
                        marginLeft: group.marginLeft,
                      }}
                    >
                      {group.letters.map((letter) => (
                        <motion.span
                          key={letter.key}
                          custom={letter}
                          variants={introLetterVariants}
                          initial="hidden"
                          animate="visible"
                          exit="popOut"
                          style={{ display: "inline-block", marginRight: "0.01em" }}
                        >
                          {letter.displayChar}
                        </motion.span>
                      ))}
                    </span>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }, [isIntroSlide, introPhase, panZoomAnimation, introTransform, introOpening, introTagline, introTitle, introWordGroups]);

  const outroOverlayElement = useMemo(() => {
    if (!isOutroSlide) return null;
    const overlayMotion = panZoomAnimation || {
      initial: { transform: outroTransform },
      animate: { transform: outroTransform },
      transition: { duration: 0 },
    };

    return (
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          className="flex flex-col items-center text-center gap-4 px-6 sm:px-10"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            color: "white",
            maxWidth: "85%",
            transformOrigin: "center center",
            ...(panZoomAnimation ? {} : { transform: outroTransform }),
          }}
          initial={overlayMotion.initial}
          animate={overlayMotion.animate}
          transition={overlayMotion.transition}
          exit={overlayMotion.exit}
        >
          <AnimatePresence mode="wait">
            {outroPhase === "start" && (
              <motion.div
                key="outro-start"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-lg sm:text-2xl font-light italic max-w-3xl opacity-90"
              >
                {outroClosing}
              </motion.div>
            )}

            {outroPhase === "mid" && (
              <motion.div
                key="outro-mid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-xl sm:text-3xl font-semibold"
              >
                {outroCta}
              </motion.div>
            )}

            {(outroPhase === "end" || outroPhase === "done") && (
              <motion.div
                key="outro-end"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center gap-2 mt-2 opacity-90"
              >
                {outroUrl && (
                  <a
                    href={outroUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 text-sm sm:text-base hover:text-blue-200"
                    style={{ pointerEvents: "auto" }}
                  >
                    {outroUrl}
                  </a>
                )}
                <img
                  src="/images/K4Logo-web.webp"
                  alt="K4 Studios Logo"
                  className="w-16 sm:w-24 h-auto"
                  style={{ filter: "invert(1) brightness(1.15)" }}
                />
                <div className="text-[11px] tracking-wide uppercase opacity-70">
                  © Wayne Heim — K4 Studios
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }, [isOutroSlide, outroPhase, panZoomAnimation, outroTransform, outroClosing, outroCta, outroUrl]);

  const triggerBlackout = useCallback(
    (callback) => {
      if (typeof callback !== "function") return;
      if (blackoutPhase !== "idle") return;
      blackoutCallbackRef.current = callback;
      setBlackoutPhase("fade-out");
    },
    [blackoutPhase]
  );

  const stopCurrentAudio = useCallback(() => {
    const element = audioRef?.current;
    if (!element) return;
    ignoreAudioEndedRef.current = true;
    hasUserUnlockedAudioRef.current = false;
    try {
      element.pause();
      element.currentTime = 0;
    } catch {}
    setIsSpeaking(false);
  }, [audioRef, setIsSpeaking]);

  // Manual navigation, skipping ghost image
  const goNext = useCallback(() => {
    if (!orderedImages.length) return;
    stopCurrentAudio();
    setIndex((i) => {
      let next = (i + 1) % orderedImages.length;
      while (orderedImages[next]?.id === "i-k4studios" && next !== i) {
        next = (next + 1) % orderedImages.length;
      }
      return next;
    });
  }, [orderedImages, stopCurrentAudio]);

  const goPrev = useCallback(() => {
    if (!orderedImages.length) return;
    stopCurrentAudio();
    setIndex((i) => {
      let prev = (i - 1 + orderedImages.length) % orderedImages.length;
      while (orderedImages[prev]?.id === "i-k4studios" && prev !== i) {
        prev = (prev - 1 + orderedImages.length) % orderedImages.length;
      }
      return prev;
    });
  }, [orderedImages, stopCurrentAudio]);

  useEffect(() => {
    if (!current || orderedImages.length <= 1) return undefined;
    if (current?.audioSrc) return undefined;

    let totalSeconds = null;

    if (isIntroSlide && introDurations) {
      totalSeconds = introDurations.total;
    } else if (isOutroSlide && outroDurations) {
      totalSeconds = outroDurations.total;
    } else {
      const durations = extractStageDurations(current?.panZoom);
      if (durations) {
        totalSeconds = durations.start + durations.mid + durations.end + durations.pause;
      }
    }

    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      totalSeconds = DEFAULT_STAGE_DURATION * 3 + DEFAULT_PAUSE_DURATION;
    }

    const timer = setTimeout(() => {
      triggerBlackout(() => {
        goNext();
      });
    }, totalSeconds * 1000);

    return () => clearTimeout(timer);
  }, [
    current,
    orderedImages.length,
    isIntroSlide,
    isOutroSlide,
    introDurations,
    outroDurations,
    triggerBlackout,
    goNext,
  ]);

  useEffect(() => {
    if (isIntro) {
      const introTimer = setTimeout(() => setIsIntro(false), 3000);
      return () => clearTimeout(introTimer);
    }
  }, [isIntro]);

  const isMessengerWebView = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /FBAN|FBAV|Messenger|Instagram/i.test(navigator.userAgent);
  }, []);

  // Reset autoplay flag when component unmounts
  useEffect(() => {
    return () => {
      hasAutoPlayedRef.current = false;
    };
  }, []);

  // Auto-play individual image audio when index changes (but not global audio)
  useEffect(() => {
    if (!current?.audioSrc || isMuted) return;

    // Play new individual audio
    if (audioRef.current) {
      audioRef.current.src = current.audioSrc;
      audioRef.current.volume = volume;
      hasUserUnlockedAudioRef.current = true;
      ignoreAudioEndedRef.current = false;
      audioRef.current.play().catch((error) => {
        console.error('Error auto-playing individual audio:', error);
        hasUserUnlockedAudioRef.current = false;
      });
      setIsSpeaking(true);
    }
  }, [index, current?.audioSrc, isMuted, volume, audioRef, setIsSpeaking]);

  useEffect(() => {
    const element = audioRef?.current;
    if (!element) return undefined;

    const handleEnded = () => {
      if (ignoreAudioEndedRef.current) {
        ignoreAudioEndedRef.current = false;
        return;
      }

      setIsSpeaking(false);

      if (!current?.audioSrc || orderedImages.length <= 1) return;

      triggerBlackout(() => {
        goNext();
      });
    };

    element.addEventListener("ended", handleEnded);
    return () => {
      element.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, current?.audioSrc, goNext, orderedImages.length, setIsSpeaking, triggerBlackout]);

  function reorderImages(list, startId) {
    const startIndex = list.findIndex((img) => img.id === startId);
    if (startIndex === -1) return list;
    return [...list.slice(startIndex), ...list.slice(0, startIndex)];
  }

  function handleExit() {
    stopCurrentAudio();
    if (onExit) onExit(current);
  }

  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 1.0, ease: "easeInOut" } },
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
          .slideshow-controls .btn { padding: 0.25rem 0.5rem; font-size: 0.75rem; white-space: nowrap; }
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
        {/* Mobile-only paused chip (desktop uses the one in the story panel) */}
        <AnimatePresence>
          {false && showControls && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.95, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute text-white text-[0.65rem] tracking-wide font-semibold px-2 py-0.5 border border-white/70 rounded"
              style={{
                zIndex: 10002,
                // Raised 35px total and shifted 65px left via calc on left
                bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 7rem + 35px)",
                left: "calc(50% - 50px)",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(2px)",
              }}
            >
              PAUSED
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
              <div className="w-screen h-screen flex items-center justify-center relative gallery-slideshow px-4 md:px-0">
                <div
                  ref={stageDisplayRef}
                  className="relative flex items-center justify-center"
                  style={
                    stageDisplayStyle || {
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }
                  }
                >
                  {stageContentStyle ? (
                    <div className="absolute top-0 left-0 relative" style={stageContentStyle}>
                      {imageStack}
                    </div>
                  ) : (
                    imageStack
                  )}
                  {liveAreaOverlay}

                  {/* ✅ Display actual render size outside the red box */}
                  {(() => {
                    const widthPx = Number(outputResolution?.width);
                    const heightPx = Number(outputResolution?.height);
                    let displayW = widthPx;
                    let displayH = heightPx;
                    if (!Number.isFinite(displayW) || !Number.isFinite(displayH)) {
                      const ratio = Number(outputAspect) || 16 / 9;
                      displayW = Math.round(1920);
                      displayH = Math.round(displayW / ratio);
                    }
                    return (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-1.6em",
                          right: 0,
                          color: "rgba(255,255,255,0.7)",
                          fontSize: "0.75rem",
                          letterSpacing: "0.03em",
                          whiteSpace: "nowrap",
                          textShadow: "0 0 4px rgba(0,0,0,0.7)",
                          pointerEvents: "none",
                          background: "rgba(0,0,0,0.32)",
                          borderTopLeftRadius: "0.5em",
                          padding: "0.18em 0.7em 0.18em 0.9em",
                          margin: 0,
                        }}
                      >
                        {`${displayW} × ${displayH} (Actual Render Size)`}
                      </div>
                    );
                  })()}

                  {introOverlayElement}
                  {outroOverlayElement}
                </div>

                {/* Title + Story: hidden for all phones/phablets via isMobileShort, and hidden when audio is playing unless muted */}
                <AnimatePresence>
                  {current.story && !isIntroSlide && !isOutroSlide && !isMobileShort && (!isSpeaking || isMuted) && (
                    <motion.div
                      key="story-text"
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
                </AnimatePresence>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {blackoutPhase !== "idle" && (
            <motion.div
              key="story-blackout"
              className="absolute inset-0 bg-black pointer-events-none"
              initial={{ opacity: blackoutPhase === "fade-out" ? 0 : 1 }}
              animate={{ opacity: blackoutPhase === "fade-out" ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: BLACKOUT_MS / 1000, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>

        {/* Render actual pixel size of the red box above the controls */}
        {showControls && !isIntro && liveAreaSize.width && liveAreaSize.height && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 6.2rem)",
              color: "rgba(255,255,255,0.85)",
              fontSize: "0.85rem",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              textShadow: "0 0 4px rgba(0,0,0,0.7)",
              pointerEvents: "none",
              background: "rgba(0,0,0,0.32)",
              borderRadius: "0.5em",
              padding: "0.22em 1.1em 0.22em 1.1em",
              margin: 0,
              zIndex: 10001,
            }}
          >
            {`${liveAreaSize.width} × ${liveAreaSize.height} (Live Area Pixels)`}
          </div>
        )}

        <AnimatePresence>
          {showControls && !isIntro && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute border rounded-lg p-2 flex gap-3 items-center slideshow-controls"
              style={{
                borderColor: "rgba(255,255,255,0.25)",
                backgroundColor: "rgba(0, 0, 0, 0.8)", // 80% opaque black
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 4rem)",
              }}
            >
              {/* Prev */}
              <button
                onClick={goPrev}
                className="bg-white/10 text-white rounded px-2 sm:px-3 py-1 hover:bg-white/20 transition btn whitespace-nowrap text-xs sm:text-sm leading-none flex items-center gap-1"
                aria-label="Previous image"
                title="Previous image"
              >
                <span aria-hidden>◀</span>
                <span>Prev</span>
              </button>

              {/* Next */}
              <button
                onClick={goNext}
                className="bg-white/10 text-white rounded px-2 sm:px-3 py-1 hover:bg-white/20 transition btn whitespace-nowrap text-xs sm:text-sm leading-none flex items-center gap-1"
                aria-label="Next image"
                title="Next image"
              >
                <span>Next</span>
                <span aria-hidden>▶</span>
              </button>

              {/* Audio Control - show if current image has audioSrc OR if there's global audio */}
              {(current?.audioSrc || globalAudioSrc || (images.some(img => img.globalAudioMode) && images.some(img => img.globalAudioSrc))) && (
                <div className="relative flex items-center gap-1">
                <div className="relative group">
                  <button
                    onClick={() => {
                      if (isMuted) {
                        // Unmuting - play individual image audio if available and not already playing
                        setIsMuted(false);

                        // Play individual image audio if current image has it and not already speaking
                        if (current?.audioSrc && audioRef.current && !isSpeaking) {
                          audioRef.current.src = current.audioSrc;
                          audioRef.current.volume = volume;
                          hasUserUnlockedAudioRef.current = true;
                          ignoreAudioEndedRef.current = false;
                          audioRef.current.play().catch((error) => {
                            console.error('Error playing individual audio on unmute:', error);
                            hasUserUnlockedAudioRef.current = false;
                          });
                          setIsSpeaking(true);
                        }
                        // Global audio will start automatically via unified controller when isMuted becomes false
                      } else {
                        // Muting - stop current playback
                        setIsMuted(true);
                        hasUserUnlockedAudioRef.current = false;
                        stopCurrentAudio();
                      }
                    }}
                    className={`bg-white/10 text-white rounded px-2 py-1 hover:bg-white/20 transition btn ${
                      isMuted ? 'text-red-400' : ''
                    }`}
                    aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                    title={isMuted ? "Unmute audio" : "Mute audio"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  {/* Volume Slider */}
                  <div className="absolute bottom-full mb-2 left-0 bg-black/80 rounded-lg p-3 min-w-32 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-white" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-white text-xs min-w-8">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>
                </div>
                </div>
              )}

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
