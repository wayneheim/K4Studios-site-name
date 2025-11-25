import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MIN_STAGE_DURATION = 0.5;
const DEFAULT_STAGE_DURATION = 2;
const DEFAULT_PAUSE_DURATION = 2;
const DEFAULT_START_DURATION = 0.6; // Very fast start stage for quick zoom fade-in
const CROSSFADE_MS = 400;
const FRAME_DELAY_MS = 30;
// Easing function mappings for Framer Motion
const easingMap = {
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  easeInCubic: [0.55, 0.055, 0.675, 0.19],
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  linear: [0, 0, 1, 1],
};

const normalizeDuration = (value, fallback = DEFAULT_STAGE_DURATION) => {
  const fallbackNumRaw = typeof fallback === "string" ? parseFloat(fallback) : Number(fallback);
  const fallbackNum = Number.isFinite(fallbackNumRaw) ? fallbackNumRaw : DEFAULT_STAGE_DURATION;
  const safeFallback = Math.max(MIN_STAGE_DURATION, fallbackNum);
  const parsedRaw = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(parsedRaw)) return safeFallback;
  return Math.max(MIN_STAGE_DURATION, parsedRaw);
};

const normalizePause = (value, fallback = DEFAULT_PAUSE_DURATION) => {
  const fallbackNumRaw = typeof fallback === "string" ? parseFloat(fallback) : Number(fallback);
  const fallbackNum = Number.isFinite(fallbackNumRaw) ? fallbackNumRaw : DEFAULT_PAUSE_DURATION;
  const parsedRaw = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(parsedRaw)) return Math.max(0, fallbackNum);
  return Math.max(0, parsedRaw);
};

const randomDelay = (min, max) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

const extractStageDurations = (panZoom) => {
  if (!panZoom) {
    return {
      start: DEFAULT_STAGE_DURATION,
      mid: DEFAULT_STAGE_DURATION,
      end: DEFAULT_STAGE_DURATION,
      pause: DEFAULT_PAUSE_DURATION,
    };
  }
  return {
    start: normalizeDuration(panZoom.start?.duration, DEFAULT_STAGE_DURATION),
    mid: normalizeDuration(panZoom.mid?.duration, DEFAULT_STAGE_DURATION),
    end: normalizeDuration(panZoom.end?.duration, DEFAULT_STAGE_DURATION),
    pause: normalizePause(panZoom.pauseDuration, DEFAULT_PAUSE_DURATION),
  };
};

const createDefaultStages = () => ({
  start: { zoom: 1, rotation: 0, offset: { x: 0.5, y: 0.5 }, duration: DEFAULT_STAGE_DURATION },
  mid: {
    zoom: 1.15,
    zoomFactor: 1.15,
    rotation: 0,
    offset: { x: 0.5, y: 0.5 },
    duration: DEFAULT_STAGE_DURATION,
  },
  end: {
    zoom: 1.15 * 1.15,
    zoomFactor: 1.15 * 1.15,
    rotation: 0,
    offset: { x: 0.5, y: 0.5 },
    duration: DEFAULT_STAGE_DURATION,
  },
});

const buildStagesFromPanZoom = (panZoom) => {
  const defaults = createDefaultStages();
  if (!panZoom) return defaults;
  const startZoom = panZoom.start?.scale ?? panZoom.start?.zoom ?? defaults.start.zoom;
  const baseZoom = startZoom || defaults.start.zoom;
  const midZoomRaw = panZoom.mid?.scale ?? panZoom.mid?.zoom;
  const midZoomFactor = panZoom.mid?.zoomFactor ?? (midZoomRaw ? midZoomRaw / baseZoom : defaults.mid.zoomFactor);
  const midZoom = midZoomRaw ?? baseZoom * midZoomFactor;
  const endZoomRaw = panZoom.end?.scale ?? panZoom.end?.zoom;
  const endZoomFactor = panZoom.end?.zoomFactor ?? (endZoomRaw ? endZoomRaw / baseZoom : defaults.end.zoomFactor);
  const endZoom = endZoomRaw ?? baseZoom * endZoomFactor;
  return {
    start: {
      zoom: startZoom,
      rotation: panZoom.start?.rotation ?? defaults.start.rotation,
      offset: {
        x: panZoom.start?.x ?? defaults.start.offset.x,
        y: panZoom.start?.y ?? defaults.start.offset.y,
      },
      duration: normalizeDuration(panZoom.start?.duration, defaults.start.duration),
    },
    mid: {
      zoom: midZoom,
      zoomFactor: midZoomFactor,
      rotation: panZoom.mid?.rotation ?? defaults.mid.rotation,
      offset: {
        x: panZoom.mid?.x ?? defaults.mid.offset.x,
        y: panZoom.mid?.y ?? defaults.mid.offset.y,
      },
      duration: normalizeDuration(panZoom.mid?.duration, defaults.mid.duration),
    },
    end: {
      zoom: endZoom,
      zoomFactor: endZoomFactor,
      rotation: panZoom.end?.rotation ?? defaults.end.rotation,
      offset: {
        x: panZoom.end?.x ?? defaults.end.offset.x,
        y: panZoom.end?.y ?? defaults.end.offset.y,
      },
      duration: normalizeDuration(panZoom.end?.duration, defaults.end.duration),
    },
  };
};

// Linear interpolation helper
const lerp = (a, b, t) => a + (b - a) * t;

// Interpolate between two transform states
const lerpTransform = (from, to, t) => ({
  zoom: lerp(from.zoom, to.zoom, t),
  rotation: lerp(from.rotation, to.rotation, t),
  offset: {
    x: lerp(from.offset.x, to.offset.x, t),
    y: lerp(from.offset.y, to.offset.y, t),
  },
});

// Easing function for smooth motion at endpoints
const easeInOutCubic = (t) => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// Helper to aggressively clean up audio
const cleanupAudio = (audioEl) => {
  if (!audioEl) return;
  try {
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.src = "";
    audioEl.load();
  } catch (err) {
    // Silently ignore errors during cleanup
  }
};

// StageReviewer: shared component for both editor and preview/playback
// mode: 'edit' | 'preview'
export default function StageReviewer({
  mode = "preview", // or "edit"
  images = [],
  slide: propSlide,
  outputResolution,
  resolution, // alias for outputResolution
  onExit,
  audioRef,
  crossfadeMs,
}) {

  // Output resolution (must be first so w/h are available for all logic)
  const resolvedOutputResolution = outputResolution || resolution || { width: 1920, height: 1080 };
  const w = resolvedOutputResolution.width;
  const h = resolvedOutputResolution.height;
  const aspectRatio = h === 0 ? 1 : w / h;
  const isSquareFormat = Math.abs((Number(aspectRatio) || 0) - 1) < 0.05;

  // Determine if we're in multi-slide (player) or single-slide (editor) mode
  const isMultiSlide = Array.isArray(images) && images.length > 0;
  const [slideIndex, setSlideIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0); // 0=start, 1=mid, 2=end
  const STAGES = ["start", "mid", "end"];
  const transformStage = STAGES[stageIndex];
  const [contentStage, setContentStage] = useState(transformStage);
  const prevStageRef = useRef(stageIndex);
  const slide = isMultiSlide ? images[slideIndex] || {} : propSlide || {};
  const isIntro = slide?._isIntro || slide?.type === "intro";
  const isOutro = slide?._isOutro || slide?.type === "outro";
  const stage = (isIntro || isOutro) ? contentStage : transformStage;
  const imgSrc =
    slide?.srcXL || slide?.srcL || slide?.srcM || slide?.src || slide?.url || "";
  const slideHasAudioTrack = Boolean(slide?.audioSrc);

  const parsedCrossfade = Number(crossfadeMs);
  const crossfadeDuration = Number.isFinite(parsedCrossfade)
    ? Math.max(0, parsedCrossfade)
    : CROSSFADE_MS;

  const stageDurations = useMemo(() => extractStageDurations(slide?.panZoom), [slide?.panZoom]);

  const [transformTransitionSeconds, setTransformTransitionSeconds] = useState(0);
  const [blackoutVisible, setBlackoutVisible] = useState(false);
  const [audioFailed, setAudioFailed] = useState(!slideHasAudioTrack);
  const [progress, setProgress] = useState(0); // 0-1: smooth animation progress
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = reverse
  const [paused, setPaused] = useState(false); // true when paused at endpoints

  const stageTimersRef = useRef([]);
  const autoAdvanceTimerRef = useRef(null);
  const audioAdvanceTimerRef = useRef(null);
  const blackoutTimersRef = useRef([]);
  const blackoutActiveRef = useRef(false);
  const animationFrameRef = useRef(null);

  // Refs
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const introTaglineRef = useRef(null);
  const [introShouldHideTagline, setIntroShouldHideTagline] = useState(false);
  const currentStageIndexRef = useRef(0);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [animationPaused, setAnimationPaused] = useState(false);

  const introLetterVariants = useMemo(
    () => ({
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
        scale: 0,
        y: -8,
        transition: {
          delay: letter?.exitDelay ?? 0,
          duration: 0.5,
          ease: "easeIn",
        },
      }),
    }),
    []
  );

  const clearAudioAdvanceTimer = useCallback(() => {
    if (audioAdvanceTimerRef.current) {
      clearTimeout(audioAdvanceTimerRef.current);
      audioAdvanceTimerRef.current = null;
    }
  }, []);

  const clearStageTimers = useCallback(() => {
    stageTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    stageTimersRef.current = [];
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    clearAudioAdvanceTimer();
  }, [clearAudioAdvanceTimer]);

  const clearBlackoutTimers = useCallback(() => {
    blackoutTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    blackoutTimersRef.current = [];
    blackoutActiveRef.current = false;
  }, []);

  const advanceSlide = useCallback(
    (direction = 1) => {
      if (!isMultiSlide) {
        if (direction > 0 && onExit) {
          onExit();
        }
        return;
      }

      setSlideIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return prev;
        if (next >= images.length) {
          if (direction > 0 && onExit) {
            onExit();
          }
          return prev;
        }
        return next;
      });
    },
    [images.length, isMultiSlide, onExit]
  );

  const triggerAdvanceWithBlackout = useCallback(
    (direction = 1) => {
      if (mode !== "preview") {
        advanceSlide(direction);
        return;
      }

      clearAudioAdvanceTimer();
      if (blackoutActiveRef.current) return;

      if (direction < 0) {
        if (!isMultiSlide || slideIndex === 0) return;
      }

      const isForward = direction >= 0;
      const lastSlideIndex = images.length - 1;
      const isLastSlide = isMultiSlide ? slideIndex >= lastSlideIndex : true;
      const willExit = isForward && isLastSlide;

      if (isMultiSlide) {
        const target = slideIndex + direction;
        if (target < 0) return;
        if (target > lastSlideIndex && !willExit) return;
      } else if (!willExit && direction !== 0) {
        return;
      }

      blackoutActiveRef.current = true;
      clearStageTimers();

      // Aggressively mute audio immediately when transition starts
      if (audioRef?.current) {
        cleanupAudio(audioRef.current);
      }

      setBlackoutVisible(true);

      const fadeOutTimer = setTimeout(() => {
        advanceSlide(direction);
        blackoutTimersRef.current = blackoutTimersRef.current.filter((id) => id !== fadeOutTimer);

        if (!willExit) {
          const fadeInTimer = setTimeout(() => {
            setBlackoutVisible(false);
            blackoutActiveRef.current = false;
            blackoutTimersRef.current = blackoutTimersRef.current.filter((id) => id !== fadeInTimer);
          }, crossfadeDuration);
          blackoutTimersRef.current.push(fadeInTimer);
        } else {
          blackoutActiveRef.current = false;
          blackoutTimersRef.current = [];
        }
      }, crossfadeDuration);

      blackoutTimersRef.current.push(fadeOutTimer);
    },
    [advanceSlide, audioRef, clearAudioAdvanceTimer, clearStageTimers, crossfadeDuration, images.length, isMultiSlide, mode, slideIndex]
  );


  // Pan/zoom/rotation state
  const [stagesData, setStagesData] = useState(() => buildStagesFromPanZoom(slide?.panZoom));
  const [forceWordWrap, setForceWordWrap] = useState(false);
  const [showTitle, setShowTitle] = useState(false); // Control title overlay visibility

  // Reset stage + pan/zoom when slide changes
  useEffect(() => {
    setStageIndex(0);
    setForceWordWrap(false);
    setStagesData(buildStagesFromPanZoom(slide?.panZoom));
    setContentStage(STAGES[0]);
    setIntroShouldHideTagline(false);
    setAnimationStarted(false); // Reset animation state for new slide
    
    // Reset animation state for Ken Burns effect
    setProgress(0);
    setDirection(1);
    setPaused(false);
    
    // Show title overlay for 4 seconds on slide change (preview mode only)
    if (mode === "preview" && !isIntro && !isOutro) {
      setShowTitle(true);
      const titleTimer = setTimeout(() => setShowTitle(false), 4000);
      return () => clearTimeout(titleTimer);
    }
    
    // Reset audio volume when slide changes
    if (audioRef?.current) {
      try {
        audioRef.current.volume = 1;
      } catch {}
    }
  }, [slide, audioRef, mode, isIntro, isOutro]);

  // Fit to container height when there is no saved zoom (matches editor behavior)
  useEffect(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const hasSavedZoom =
      slide?.panZoom?.start?.scale ||
      slide?.panZoom?.start?.zoom ||
      slide?.panZoom?.mid?.scale ||
      slide?.panZoom?.end?.scale;

    const fitHeight = () => {
      const cH = container.offsetHeight;
      const iH = img.naturalHeight;
      if (!iH) return;
      const fitScale = cH / iH;
      if (!hasSavedZoom) {
        setStagesData((prev) => ({
          start: { ...prev.start, zoom: fitScale },
          mid: { ...prev.mid, zoom: fitScale * (prev.mid.zoomFactor || 1) },
          end: { ...prev.end, zoom: fitScale * (prev.end.zoomFactor || 1) },
        }));
      }
    };

    if (img.complete) fitHeight();
    else {
      img.addEventListener("load", fitHeight, { once: true });
    }

    return () => {
      img.removeEventListener("load", fitHeight);
    };
  }, [imgSrc, slide]);

  useEffect(() => {
    if (mode !== "preview") return;

    // Reset animation state immediately in ref, then set state for render
    currentStageIndexRef.current = 0;
    prevStageRef.current = 0;
    setProgress(0);

    // Don't start animation if not triggered
    if (!animationStarted) return;

    let cancelled = false;
    const isSpecialSlide = isIntro || isOutro;

    if (isSpecialSlide) {
      // Intro/outro: simple fade transitions between stages (not Ken Burns)
      const safeNumber = (value, fallback) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return parsed;
      };

      const startSeconds = Math.max(safeNumber(stageDurations.start, DEFAULT_STAGE_DURATION), MIN_STAGE_DURATION);
      const midSeconds = Math.max(safeNumber(stageDurations.mid, DEFAULT_STAGE_DURATION), MIN_STAGE_DURATION);
      const endSeconds = Math.max(safeNumber(stageDurations.end, DEFAULT_STAGE_DURATION), MIN_STAGE_DURATION);
      const startMs = startSeconds * 1000;
      const midMs = midSeconds * 1000;
      const endMs = endSeconds * 1000;

      // Get stage mapping for intro (if available)
      const introTextStage = slide?.introMeta?.introTextStage ?? 1;
      const showTitleStage = slide?.introMeta?.showTitleStage ?? 2;
      const taglineStage = slide?.introMeta?.taglineStage ?? 3;
      const showIntroText = slide?.introMeta?.showIntroText ?? true;
      const showShowTitle = slide?.introMeta?.showShowTitle ?? true;
      const showTagline = slide?.introMeta?.showTagline ?? true;

      // Determine which stages are actually needed and build a mapping
      const stageAssignments = [];
      if (showIntroText) stageAssignments.push({ stageNum: introTextStage, type: 'introText' });
      if (showShowTitle) stageAssignments.push({ stageNum: showTitleStage, type: 'showTitle' });
      if (showTagline) stageAssignments.push({ stageNum: taglineStage, type: 'tagline' });

      // Get unique stages and sort them
      const uniqueStages = Array.from(new Set(stageAssignments.map(a => a.stageNum))).sort((a, b) => a - b);
      
      // Create a mapping from original stage number to new sequential number (1, 2, 3, ...)
      const stageRemap = {};
      uniqueStages.forEach((origStage, idx) => {
        stageRemap[origStage] = idx + 1;
      });

      // Remap all assignments to use sequential stage numbers
      const remappedAssignments = stageAssignments.map(a => ({
        ...a,
        displayStage: stageRemap[a.stageNum]
      }));

      setContentStage(STAGES[0]);

      const timers = [];

      const scheduleContentStageChange = (stageName, delayMs) => {
        const timerId = setTimeout(() => {
          if (!cancelled) setContentStage(stageName);
        }, Math.max(delayMs, 0));
        timers.push(timerId);
      };

      // Build stage schedule: show stage 1 with all its pieces, then transition to other stages
      // Stage rendering combines all pieces assigned to that stage
      let currentDelay = 0;
      
      // Always show the first unique stage (start/0) initially
      scheduleContentStageChange(STAGES[0], 0);
      
      // Determine duration for first stage based on which stage it is
      let firstStageDuration = startMs;
      if (uniqueStages[0] === 1) firstStageDuration = startMs;
      else if (uniqueStages[0] === 2) firstStageDuration = midMs;
      else if (uniqueStages[0] === 3) firstStageDuration = endMs;
      
      currentDelay = firstStageDuration;
      
      // Transition to subsequent stages if they exist
      for (let i = 1; i < uniqueStages.length; i++) {
        const stageNum = uniqueStages[i];
        const displayIdx = i; // Map to STAGES[i]
        const stageName = STAGES[displayIdx];
        
        scheduleContentStageChange(stageName, currentDelay);
        
        // Determine duration for this stage
        let stageDuration = midMs;
        if (stageNum === 1) stageDuration = startMs;
        else if (stageNum === 2) stageDuration = midMs;
        else if (stageNum === 3) stageDuration = endMs;
        
        currentDelay += stageDuration;
      }

      // After all stages complete, trigger tagline exit animation
      const taglineExitDuration = 700;

      const exitTimer1 = setTimeout(() => {
        if (!cancelled) setIntroShouldHideTagline(true);
      }, currentDelay);
      timers.push(exitTimer1);

      const exitTimer2 = setTimeout(() => {
        if (!cancelled) triggerAdvanceWithBlackout(1);
      }, currentDelay + taglineExitDuration);
      timers.push(exitTimer2);

      return () => {
        cancelled = true;
        timers.forEach((timerId) => clearTimeout(timerId));
      };
    }

    // Normal slides: Ken Burns effect with smooth progress animation
    const safeNumber = (value, fallback) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return parsed;
    };

    const forwardSeconds = Math.max(
      safeNumber(stageDurations.start, DEFAULT_START_DURATION),
      MIN_STAGE_DURATION
    ) + Math.max(
      safeNumber(stageDurations.mid, DEFAULT_STAGE_DURATION),
      MIN_STAGE_DURATION
    ) + Math.max(
      safeNumber(stageDurations.end, DEFAULT_STAGE_DURATION),
      MIN_STAGE_DURATION
    );

    const pauseSeconds = Math.max(safeNumber(stageDurations.pause, DEFAULT_PAUSE_DURATION), 0);

    let raf;
    let startTime = null;

    const animate = (now) => {
      if (cancelled) return;

      // Don't animate while paused
      if (animationPaused) {
        raf = requestAnimationFrame(animate);
        return;
      }

      // Initialize startTime on first frame
      if (!startTime) startTime = now;
      
      const elapsed = now - startTime;
      const totalAnimationDuration = forwardSeconds * 2; // Full cycle: forward + reverse
      const totalMs = totalAnimationDuration * 1000;
      
      // Normalize elapsed time to 0-1 across the full cycle
      let cycleProgress = (elapsed % totalMs) / totalMs;
      
      // First half (0-0.5): forward animation
      // Second half (0.5-1): reverse animation
      let pct;
      
      if (cycleProgress < 0.5) {
        // Forward phase
        const forwardProgress = cycleProgress * 2; // Map 0-0.5 to 0-1
        
        // Apply stronger ease-out in the final 12% of forward motion for polished deceleration
        const easeZoneStart = 0.88;
        if (forwardProgress >= easeZoneStart) {
          const zoneProgress = (forwardProgress - easeZoneStart) / (1 - easeZoneStart);
          // Use cubic easing for smoother, more pronounced deceleration
          pct = easeZoneStart + zoneProgress * zoneProgress * zoneProgress * (1 - easeZoneStart);
        } else {
          pct = forwardProgress;
        }
      } else {
        // Reverse phase
        const reverseProgress = (cycleProgress - 0.5) * 2; // Map 0.5-1 to 0-1
        
        // Apply stronger ease-out in the final 12% of reverse motion for polished deceleration
        const easeZoneStart = 0.88;
        let reversePct = reverseProgress;
        if (reverseProgress >= easeZoneStart) {
          const zoneProgress = (reverseProgress - easeZoneStart) / (1 - easeZoneStart);
          // Use cubic easing for smoother, more pronounced deceleration
          reversePct = easeZoneStart + zoneProgress * zoneProgress * zoneProgress * (1 - easeZoneStart);
        }
        
        pct = 1 - reversePct; // Convert to 1->0 for reverse
      }
      
      setProgress(Math.max(Math.min(pct, 1), 0));

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, [mode, stageDurations.start, stageDurations.mid, stageDurations.end, stageDurations.pause, isIntro, isOutro, triggerAdvanceWithBlackout, animationStarted, animationPaused]);

  useEffect(() => {
    if (mode !== "preview") return;
    setAudioFailed(!slideHasAudioTrack);
  }, [mode, slideHasAudioTrack, slideIndex]);

  useEffect(() => {
    if (mode === "preview") return;
    clearAudioAdvanceTimer();
  }, [mode, clearAudioAdvanceTimer]);

  useEffect(() => {
    if (isIntro || isOutro) return;
    setContentStage(transformStage);
  }, [isIntro, isOutro, transformStage]);

  useEffect(() => {
    if (mode !== "preview") {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      return;
    }

    if (slideHasAudioTrack && !audioFailed) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      return;
    }

    const forwardSeconds =
      Math.max(0, stageDurations.start) +
      Math.max(0, stageDurations.mid + stageDurations.end);
    const reverseSeconds = Math.max(0, stageDurations.start + stageDurations.mid + stageDurations.end);
    const totalSeconds = forwardSeconds + Math.max(0, stageDurations.pause) + reverseSeconds;

    if (totalSeconds <= 0) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    autoAdvanceTimerRef.current = setTimeout(() => {
      triggerAdvanceWithBlackout(1);
    }, totalSeconds * 1000);

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [audioFailed, mode, slideHasAudioTrack, stageDurations.end, stageDurations.mid, stageDurations.pause, stageDurations.start, triggerAdvanceWithBlackout, isIntro, isOutro]);

  useEffect(() => {
    if (mode !== "preview") return;
    const audioEl = audioRef?.current;

    clearAudioAdvanceTimer();

    // Always cleanup first
    cleanupAudio(audioEl);

    if (!slideHasAudioTrack || !audioEl) {
      setAudioFailed(true);
      return () => {
        cleanupAudio(audioEl);
      };
    }

    let cancelled = false;
    let advanceTriggered = false;
    
    // Create a unique key for this slide to prevent audio from previous slides replaying
    const currentSlideKey = `${slide.audioSrc}-${slideIndex}`;

    const scheduleAudioAdvance = () => {
      if (cancelled || advanceTriggered) return;
      const duration = Number(audioEl.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      const remaining = Math.max(duration - audioEl.currentTime, 0);
      const delayMs = Math.max(remaining * 1000, 0);
      clearAudioAdvanceTimer();
      audioAdvanceTimerRef.current = setTimeout(() => {
        if (cancelled || advanceTriggered) return;
        advanceTriggered = true;
        triggerAdvanceWithBlackout(1);
      }, delayMs);
    };

    const handleEnded = () => {
      if (advanceTriggered || cancelled) return;
      advanceTriggered = true;
      clearAudioAdvanceTimer();
      // Add 1 second pause before advancing to next slide
      audioAdvanceTimerRef.current = setTimeout(() => {
        if (!cancelled) {
          triggerAdvanceWithBlackout(1);
        }
      }, 1000);
    };

    const handleError = () => {
      if (cancelled) return;
      setAudioFailed(true);
      clearAudioAdvanceTimer();
    };

    const handlePlaying = () => {
      if (cancelled) return;
      advanceTriggered = false;
      setAudioFailed(false);
      scheduleAudioAdvance();
    };

    const handleTimeUpdate = () => {
      if (cancelled || advanceTriggered || !audioEl) return;
      const duration = Number(audioEl.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      const remaining = duration - audioEl.currentTime;
      // Only trigger if we're very close to the end (within 50ms) to avoid premature advance
      if (remaining <= 0.05) {
        advanceTriggered = true;
        clearAudioAdvanceTimer();
        // Add 1 second pause before advancing to next slide
        audioAdvanceTimerRef.current = setTimeout(() => {
          if (!cancelled) {
            triggerAdvanceWithBlackout(1);
          }
        }, 1000);
      }
    };

    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch {}

    audioEl.src = slide.audioSrc;
    audioEl.load();

    audioEl.addEventListener("ended", handleEnded);
    audioEl.addEventListener("error", handleError);
    audioEl.addEventListener("playing", handlePlaying);
    audioEl.addEventListener("timeupdate", handleTimeUpdate);

    const handleLoadedMetadata = () => {
      if (cancelled) return;
      scheduleAudioAdvance();
    };

    audioEl.addEventListener("loadedmetadata", handleLoadedMetadata);

    const playPromise = audioEl.play();
    if (playPromise?.then) {
      playPromise
        .then(() => {
          if (!cancelled) setAudioFailed(false);
          scheduleAudioAdvance();
        })
        .catch((error) => {
          if (cancelled) return;
          console.warn("StageReviewer preview audio play failed", error);
          setAudioFailed(true);
        });
    } else {
      setAudioFailed(false);
      scheduleAudioAdvance();
    }

    return () => {
      cancelled = true;
      audioEl.removeEventListener("ended", handleEnded);
      audioEl.removeEventListener("error", handleError);
      audioEl.removeEventListener("playing", handlePlaying);
      audioEl.removeEventListener("timeupdate", handleTimeUpdate);
      audioEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      clearAudioAdvanceTimer();
      cleanupAudio(audioEl);
    };
  }, [audioRef, clearAudioAdvanceTimer, mode, slide.audioSrc, slideHasAudioTrack, triggerAdvanceWithBlackout, slideIndex]);

  // Countdown and keyboard shortcuts REMOVED - record button no longer used

  useEffect(() => {
    return () => {
      clearStageTimers();
      clearBlackoutTimers();
    };
  }, [clearBlackoutTimers, clearStageTimers]);

  // Only apply pan/zoom/rotate for non-intro/outro slides
  const isStageTransform = !isIntro && !isOutro;
  
  // Compute smooth interpolated transform based on progress (0-1)
  const currentTransform = useMemo(() => {
    if (!isStageTransform) return createDefaultStages().start;
    
    const s = stagesData.start;
    const m = stagesData.mid;
    const e = stagesData.end;
    
    // Enforce monotonic zoom for smoothness
    const sZoom = Number(s.zoom) || 1;
    let mZoom = Number(m.zoom) || sZoom * (m.zoomFactor || 1.15);
    let eZoom = Number(e.zoom) || mZoom * (e.zoomFactor || 1.15);
    if (mZoom < sZoom) mZoom = sZoom;
    if (eZoom < mZoom) eZoom = mZoom;
    
    const startStage = { ...s, zoom: sZoom };
    const midStage = { ...m, zoom: mZoom };
    const endStage = { ...e, zoom: eZoom };
    
    // Apply easing to progress for smooth motion at endpoints
    const easedProgress = easeInOutCubic(progress);
    
    // Overlapping stage movements for smooth flowing animation
    // Lower threshold (0.2) allows more overlap between start->mid and mid->end
    // This creates continuous wave motion rather than discrete stage changes
    const startThreshold = 0.2;
    if (easedProgress < startThreshold) {
      const t = easedProgress / startThreshold;
      return lerpTransform(startStage, midStage, t);
    } else {
      const t = (easedProgress - startThreshold) / (1 - startThreshold);
      return lerpTransform(midStage, endStage, t);
    }
  }, [progress, stagesData, isStageTransform]);
  
  const zoom = currentTransform.zoom ?? 1;
  const rotation = currentTransform.rotation ?? 0;
  const offsetX = currentTransform.offset?.x ?? 0.5;
  const offsetY = currentTransform.offset?.y ?? 0.5;
  const transform = isStageTransform
    ? `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg) translate(${(0.5 - offsetX) * 100}%, ${(0.5 - offsetY) * 100}%)`
    : 'translate(-50%, -50%)';
  const getEasing = useCallback(() => {
    if (!slide?.panZoom?.easing) return easingMap.easeInOutCubic;
    const zoomEasing = slide.panZoom.easing.zoom || 'easeInOutCubic';
    return easingMap[zoomEasing] || easingMap.easeInOutCubic;
  }, [slide?.panZoom?.easing]);
  const backDisabled = mode === "preview"
    ? !isMultiSlide || slideIndex === 0
    : stageIndex === 0 && (!isMultiSlide || slideIndex === 0);
  const forwardDisabled = mode === "preview"
    ? (!isMultiSlide && !onExit)
    : stageIndex === 2 && (!isMultiSlide || slideIndex === images.length - 1);

  const defaultIntroTagline = "Embrace the Past. Live the Story.";
  const introTagline = isIntro ? slide?.tagline || defaultIntroTagline : "";

  useEffect(() => {
    setForceWordWrap(false);
  }, [introTagline, isSquareFormat]);

  const introWordGroupsData = useMemo(() => {
    const tagline = introTagline?.trim();
    if (!tagline) return { groups: [], hasSpecialSplit: false };

    const buildLetters = (text, keyPrefix) =>
      text.split("").map((char, letterIdx) => ({
        char,
        displayChar: char === " " ? "\u00A0" : char,
        key: `${keyPrefix}-${letterIdx}`,
        enterDelay: randomDelay(0, 0.7),
        exitDelay: randomDelay(0.15, 0.55),
      }));

    const specialBreakMatch = tagline.match(/^(.*?\.\.\.)(\s+)(.*)$/);
    if (specialBreakMatch) {
      const [, firstPart, spaces, rest] = specialBreakMatch;
      const groups = [];
      const firstChunkKey = "intro-special-0";
      groups.push({
        key: firstChunkKey,
        keepTogether: true,
        letters: buildLetters(firstPart, firstChunkKey),
        marginLeft: 0,
        marginRight: isSquareFormat ? "0.2em" : "0.35em",
        enforceFullLine: true,
      });

      const spaceCount = spaces.length;
      groups.push({
        key: "intro-special-spacer",
        keepTogether: true,
        letters: Array.from({ length: spaceCount }).map((_, idx) => ({
          char: " ",
          displayChar: "\u00A0",
          key: `intro-special-space-${idx}`,
          enterDelay: 0,
          exitDelay: 0,
        })),
        marginLeft: 0,
        marginRight: 0,
      });

      const restKey = "intro-special-rest";
      groups.push({
        key: restKey,
        keepTogether: false,
        letters: buildLetters(rest, restKey),
        marginLeft: isSquareFormat ? "0.2em" : "0.35em",
        marginRight: 0,
        enforceFullLine: false,
      });

      return { groups, hasSpecialSplit: true };
    }

    const words = tagline.split(/\s+/);
    const groups = words.map((word, wordIdx) => ({
      key: `intro-word-${wordIdx}`,
      keepTogether: true,
      letters: buildLetters(word, `intro-word-${wordIdx}`),
      marginLeft: wordIdx === 0 ? 0 : "0.35em",
      marginRight: wordIdx === words.length - 1 ? 0 : undefined,
    }));
    return { groups, hasSpecialSplit: false };
  }, [introTagline, forceWordWrap, isSquareFormat]);

  const introWordGroups = introWordGroupsData.groups;

  useLayoutEffect(() => {
    if (forceWordWrap || !introWordGroupsData.hasSpecialSplit) return;
    const el = introTaglineRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth } = el;
    if (scrollWidth > clientWidth + 1) {
      setForceWordWrap(true);
    }
  }, [introWordGroups, introWordGroupsData.hasSpecialSplit, forceWordWrap]);


  // Navigation handlers
  const handleForward = () => {
    if (mode === "preview") {
      if (!isMultiSlide) {
        if (onExit) onExit();
        return;
      }
      triggerAdvanceWithBlackout(1);
      return;
    }

    if (stageIndex < 2) {
      const nextStageIdx = Math.min(stageIndex + 1, 2);
      setStageIndex(nextStageIdx);
      setContentStage(STAGES[nextStageIdx]);
    } else if (isMultiSlide && slideIndex < images.length - 1) {
      setSlideIndex((i) => i + 1);
      setStageIndex(0);
      setContentStage(STAGES[0]);
    } else if (onExit) {
      onExit();
    }
  };

  const handleBack = () => {
    if (mode === "preview") {
      triggerAdvanceWithBlackout(-1);
      return;
    }

    if (stageIndex > 0) {
      const prevStageIdx = Math.max(stageIndex - 1, 0);
      setStageIndex(prevStageIdx);
      setContentStage(STAGES[prevStageIdx]);
    } else if (isMultiSlide && slideIndex > 0) {
      setSlideIndex((i) => i - 1);
      setStageIndex(2);
      setContentStage(STAGES[2]);
    }
  };

  const handleExit = () => {
    if (!onExit) return;
    if (mode !== "preview") {
      onExit();
      return;
    }

    if (blackoutActiveRef.current) return;
    blackoutActiveRef.current = true;
    clearStageTimers();

    if (audioRef?.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }

    setBlackoutVisible(true);

    const exitTimer = setTimeout(() => {
      onExit();
      blackoutTimersRef.current = blackoutTimersRef.current.filter((id) => id !== exitTimer);
      blackoutActiveRef.current = false;
    }, crossfadeDuration);

    blackoutTimersRef.current.push(exitTimer);
  };

  const pauseAnimation = () => {
    setAnimationPaused(true);
  };

  const resumeAnimation = () => {
    setAnimationPaused(false);
  };

  const resetAnimation = () => {
    setAnimationStarted(false);
    setAnimationPaused(false);
    setProgress(0);
    setContentStage(STAGES[0]);
  };

  // Output resolution


  // Render preview UI (no editing controls)
  return (
    <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col items-center justify-center z-50" style={{fontFamily: "'Glegoo', serif"}}>
      <div className="text-xs font-mono text-neutral-400 mb-2">
        {w} × {h}px — Slide {isMultiSlide ? `${slideIndex + 1}/${images.length}` : '1/1'} ({stage})
      </div>

      <div
        ref={containerRef}
        className="relative border border-red-700 bg-black overflow-hidden rounded-md"
        style={{ width: `${w}px`, height: `${h}px` }}
      >
        {/* Normal image */}
        {!isIntro && !isOutro && imgSrc && (
          <img
            ref={imgRef}
            src={imgSrc}
            alt={slide.title || ""}
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transformOrigin: "center",
              transform,
              transition: "none",
              width: w,
              height: h,
              objectFit: "contain",
              userSelect: "none",
            }}
          />
        )}

        {/* Intro: fade between stages with per-stage panZoom */}
        {isIntro && (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentStage}
              className="absolute flex flex-col items-center text-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: crossfadeDuration / 1000 }}
              style={{
                left: "50%",
                top: "50%",
                // Apply per-stage panZoom transform
                transform: (() => {
                  const stageInfo = stagesData[contentStage] || stagesData.start;
                  const z = stageInfo.zoom ?? 1;
                  const r = stageInfo.rotation ?? 0;
                  const oX = stageInfo.offset?.x ?? 0.5;
                  const oY = stageInfo.offset?.y ?? 0.5;
                  return `translate(-50%, -50%) scale(${z}) rotate(${r}deg) translate(${(0.5 - oX) * 100}%, ${(0.5 - oY) * 100}%)`;
                })(),
                color: "white",
                pointerEvents: "none",
                maxWidth: "80%",
              }}
            >
              {(() => {
                const stageNum = STAGES.indexOf(contentStage) + 1;
                const showIntroText = slide?.introMeta?.showIntroText ?? true;
                const showShowTitle = slide?.introMeta?.showShowTitle ?? true;
                const showTagline = slide?.introMeta?.showTagline ?? true;
                const introTextStage = slide?.introMeta?.introTextStage ?? 1;
                const showTitleStage = slide?.introMeta?.showTitleStage ?? 2;
                const taglineStage = slide?.introMeta?.taglineStage ?? 3;
                const introPieceOrder = slide?.introMeta?.introPieceOrder ?? ["introText", "showTitle", "tagline"];

                // Build remapping like in animation logic
                const stageAssignments = [];
                if (showIntroText) stageAssignments.push({ stageNum: introTextStage });
                if (showShowTitle) stageAssignments.push({ stageNum: showTitleStage });
                if (showTagline) stageAssignments.push({ stageNum: taglineStage });

                const uniqueStages = Array.from(new Set(stageAssignments.map(a => a.stageNum))).sort((a, b) => a - b);
                const stageRemap = {};
                uniqueStages.forEach((origStage, idx) => {
                  stageRemap[origStage] = idx + 1;
                });

                const remappedIntroTextStage = stageRemap[introTextStage];
                const remappedShowTitleStage = stageRemap[showTitleStage];
                const remappedTaglineStage = stageRemap[taglineStage];

                // Helper to render piece by key
                const renderPiece = (pieceKey) => {
                  if (pieceKey === "introText" && showIntroText && remappedIntroTextStage === stageNum) {
                    return (
                      <React.Fragment key="introText">
                        <h2 className="text-xl sm:text-2xl font-light tracking-widest opacity-80">
                          {(() => {
                            const text = slide.opening || "K4 Studios presents the Fine Art Photography of Wayne Heim.";
                            const breakAfter = "presents";
                            const idx = text.indexOf(breakAfter);
                            if (idx !== -1) {
                              const before = text.slice(0, idx + breakAfter.length);
                              const after = text.slice(idx + breakAfter.length).trimStart();
                              if (w / h > 1.3) {
                                return <><span>{before}</span><br /><span>{after}</span></>;
                              } else {
                                return after
                                  ? <><span>{before}</span> <span>{after.split(' ').map((w,i) => <span key={i}>{w} </span>)}</span></>
                                  : before;
                              }
                            }
                            return text;
                          })()}
                        </h2>
                        <img
                          src="/images/K4-Stories logo2b.webp"
                          alt="K4 Stories Logo"
                          style={{
                            width: "140px",
                            height: "auto",
                            opacity: 0.9,
                            filter: "drop-shadow(0 0 4px rgba(255,255,255,0.4))",
                          }}
                        />
                      </React.Fragment>
                    );
                  }
                  if (pieceKey === "showTitle" && showShowTitle && remappedShowTitleStage === stageNum) {
                    return (
                      <h1 key="showTitle" className="text-4xl sm:text-5xl font-bold">
                        {slide.title || "Western Living History"}
                      </h1>
                    );
                  }
                  if (pieceKey === "tagline" && showTagline && remappedTaglineStage === stageNum && introWordGroups.length > 0) {
                    return (
                      <motion.div
                        key={`intro-tagline-${introTagline}`}
                        className="text-lg sm:text-xl font-medium italic opacity-90 flex flex-wrap justify-center"
                        style={{ gap: "0.05em", lineHeight: "1.2" }}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        ref={introTaglineRef}
                      >
                        <AnimatePresence mode="sync">
                          {introWordGroups.map((group, groupIdx) => {
                            const marginLeftValue =
                              groupIdx === 0
                                ? group.marginLeft ?? 0
                                : group.marginLeft ?? "0.35em";
                            const marginRightValue =
                              groupIdx === introWordGroups.length - 1
                                ? group.marginRight ?? 0
                                : group.marginRight ?? "0.35em";
                            const justifyContent = group.enforceFullLine ? "center" : "flex-start";
                            return (
                              <span
                                key={group.key}
                                style={{
                                  display: "inline-flex",
                                  flexWrap: "nowrap",
                                  whiteSpace: group.keepTogether ? "nowrap" : "normal",
                                  marginLeft: marginLeftValue,
                                  marginRight: marginRightValue,
                                  width: group.enforceFullLine ? "100%" : "auto",
                                  justifyContent,
                                }}
                              >
                                <AnimatePresence>
                                  {group.letters
                                    .filter(() => !introShouldHideTagline)
                                    .map((letter) => (
                                      <motion.span
                                        key={letter.key}
                                        custom={letter}
                                        variants={introLetterVariants}
                                        initial="visible"
                                        animate="visible"
                                        exit="popOut"
                                        style={{ display: "inline-block", marginRight: "0.01em" }}
                                      >
                                        {letter.displayChar}
                                      </motion.span>
                                    ))}
                                </AnimatePresence>
                              </span>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }
                  return null;
                };

                return (
                  <>
                    {introPieceOrder.map((pieceKey) => renderPiece(pieceKey))}
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        )}
        {/* Outro: fade between stages with per-stage panZoom, same as intro */}
        {isOutro && (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentStage}
              className="absolute flex flex-col items-center text-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: crossfadeDuration / 1000 }}
              style={{
                left: "50%",
                top: "50%",
                // Apply per-stage panZoom transform
                transform: (() => {
                  const stageInfo = stagesData[contentStage] || stagesData.start;
                  const z = stageInfo.zoom ?? 1;
                  const r = stageInfo.rotation ?? 0;
                  const oX = stageInfo.offset?.x ?? 0.5;
                  const oY = stageInfo.offset?.y ?? 0.5;
                  return `translate(-50%, -50%) scale(${z}) rotate(${r}deg) translate(${(0.5 - oX) * 100}%, ${(0.5 - oY) * 100}%)`;
                })(),
                color: "white",
                pointerEvents: "none",
                maxWidth: "80%",
              }}
            >
              {contentStage === "start" && (
                <>
                  <h2 className="text-xl sm:text-2xl font-light tracking-widest opacity-80">
                    {slide.closing || "Every image is another notch in the belt, keeping history alive."}
                  </h2>
                </>
              )}
              {contentStage === "mid" && (
                <>
                  <p className="text-lg sm:text-xl font-light tracking-widest opacity-90">
                    {slide.cta || "Visit k4studios.com to explore more Picture Shows."}
                  </p>
                </>
              )}
              {contentStage === "end" && (
                <>
                  <p className="text-lg sm:text-xl font-light tracking-widest opacity-90">
                    {slide.url || `https://www.k4studios.com/pictureshow/${(slide.showTitle || "unknown").toLowerCase().replace(/\s+/g, "-")}`}
                  </p>
                  <img
                    src="/images/K4Logo-web.jpg"
                    alt="K4 Studios Logo"
                    draggable={false}
                    style={{
                      maxWidth: "150px",
                      maxHeight: "150px",
                      objectFit: "contain",
                      marginTop: "1rem",
                      filter: "invert(1)",
                    }}
                  />
                  <p className="text-xs sm:text-sm font-light tracking-widest opacity-70 mt-4">
                    © Wayne Heim – K4 Studios
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {mode === "preview" && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: "black",
              opacity: blackoutVisible ? 1 : 0,
              transition: `opacity ${crossfadeDuration}ms ease-in-out`,
            }}
          />
        )}

        {/* Title overlay (preview mode, bottom center, first 5 seconds) */}
        {mode === "preview" && showTitle && slide.title && !isIntro && !isOutro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{ width: `${w * 0.75}px` }}
          >
            <div
              className="text-center text-white font-bold px-8 py-3 bg-black bg-opacity-60 rounded-lg"
              style={{ 
                fontSize: "1.375rem", 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis", 
                lineHeight: "1.4",
                maskImage: 'linear-gradient(90deg, transparent 0%, black 35%, black 65%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 35%, black 65%, transparent 100%)'
              }}
            >
              {slide.title}
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation controls (preview mode only) */}
      {mode === "preview" && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setAnimationStarted(true)}
            disabled={animationStarted}
            className="bg-green-600 px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            ▶ Play/Preview
          </button>
          <button onClick={handleExit} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">
            Exit ✕
          </button>
        </div>
      )}


    </div>
  );
}
