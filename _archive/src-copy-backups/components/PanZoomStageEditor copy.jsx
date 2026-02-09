import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MIN_STAGE_DURATION = 0.5;
const DEFAULT_STAGE_DURATION = 2;
const DEFAULT_PAUSE_DURATION = 2;

const normalizeDuration = (value, fallback = DEFAULT_STAGE_DURATION) => {
  const fallbackNumRaw = typeof fallback === "string" ? parseFloat(fallback) : Number(fallback);
  const fallbackNum = Number.isFinite(fallbackNumRaw) ? fallbackNumRaw : DEFAULT_STAGE_DURATION;
  const safeFallback = Math.max(MIN_STAGE_DURATION, fallbackNum);
  const parsedRaw = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(parsedRaw)) return safeFallback;
  return Math.max(MIN_STAGE_DURATION, parsedRaw);
};

const randomDelay = (min, max) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

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
  const startDuration = normalizeDuration(panZoom.start?.duration, defaults.start.duration);
  const midDuration = normalizeDuration(panZoom.mid?.duration, defaults.mid.duration);
  const endDuration = normalizeDuration(panZoom.end?.duration, defaults.end.duration);
  return {
    start: {
      zoom: startZoom,
      rotation: panZoom.start?.rotation ?? defaults.start.rotation,
      offset: {
        x: panZoom.start?.x ?? defaults.start.offset.x,
        y: panZoom.start?.y ?? defaults.start.offset.y,
      },
      duration: startDuration,
    },
    mid: {
      zoom: midZoom,
      zoomFactor: midZoomFactor,
      rotation: panZoom.mid?.rotation ?? defaults.mid.rotation,
      offset: {
        x: panZoom.mid?.x ?? defaults.mid.offset.x,
        y: panZoom.mid?.y ?? defaults.mid.offset.y,
      },
      duration: midDuration,
    },
    end: {
      zoom: endZoom,
      zoomFactor: endZoomFactor,
      rotation: panZoom.end?.rotation ?? defaults.end.rotation,
      offset: {
        x: panZoom.end?.x ?? defaults.end.offset.x,
        y: panZoom.end?.y ?? defaults.end.offset.y,
      },
      duration: endDuration,
    },
  };
};

export default function PanZoomStageEditor({ slide, onSave, onCancel, resolution }) {
  const [stage, setStage] = useState("start"); // start | mid | end
  const [stagesData, setStagesData] = useState(() => createDefaultStages());
  const [endInitialized, setEndInitialized] = useState(false);
  const [forceWordWrap, setForceWordWrap] = useState(false);

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const introTaglineRef = useRef(null);
  const imgSrc =
    slide?.srcXL || slide?.srcL || slide?.srcM || slide?.src || slide?.url || "";

  /* -----------------------------
     Compute aspect ratio from resolution
  ------------------------------*/
  const aspectRatio = resolution
    ? resolution.width / resolution.height
    : 16 / 9;
  const isSquareFormat = Math.abs((Number(aspectRatio) || 0) - 1) < 0.05;

  /* -----------------------------
     Restore saved data on load
  ------------------------------*/
  useEffect(() => {
    setStage("start");
    setEndInitialized(Boolean(slide?.panZoom?.end));
    setStagesData(buildStagesFromPanZoom(slide?.panZoom));
  }, [slide]);

  /* -----------------------------
     Fit to height on load
  ------------------------------*/
  useEffect(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const hasSavedZoom =
      slide?.panZoom?.start?.scale ||
      slide?.panZoom?.start?.zoom ||
      slide?.panZoom?.mid?.scale ||
      slide?.panZoom?.end?.scale;

    function fitHeight() {
      const cH = container.offsetHeight;
      const iH = img.naturalHeight;
      if (!iH) return;
      const fitScale = cH / iH;
      if (!hasSavedZoom) {
        setStagesData((prev) => ({
          start: { ...prev.start, zoom: fitScale },
          mid: { ...prev.mid, zoom: fitScale * prev.mid.zoomFactor },
          end: { ...prev.end, zoom: fitScale * prev.end.zoomFactor },
        }));
      }
    }
    if (img.complete) fitHeight();
    else img.onload = fitHeight;
  }, [imgSrc, slide, resolution]);

  /* -----------------------------
     Drag to pan
  ------------------------------*/
  const { zoom, rotation, offset } = stagesData[stage];
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let startX = 0,
      startY = 0,
      initX = offset.x,
      initY = offset.y;
    const onDown = (e) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      initX = offset.x;
      initY = offset.y;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    const onMove = (e) => {
      const dx = (e.clientX - startX) / container.offsetWidth;
      const dy = (e.clientY - startY) / container.offsetHeight;
      setStagesData((prev) => ({
        ...prev,
        [stage]: {
          ...prev[stage],
          offset: {
            x: Math.min(Math.max(initX - dx, 0), 1),
            y: Math.min(Math.max(initY - dy, 0), 1),
          },
        },
      }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    container.addEventListener("mousedown", onDown);
    return () => container.removeEventListener("mousedown", onDown);
  }, [offset, stage]);

  /* -----------------------------
     Wheel zoom (now works for all stages)
  ------------------------------*/
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setStagesData((prev) => {
        const baseZoom = prev.start.zoom || 1;
        const target = prev[stage];
        const minZoom = baseZoom * 0.5;
        const maxZoom = baseZoom * 2;
        const nextZoom = Math.max(target.zoom + delta, minZoom);
        const limitedZoom = Math.min(nextZoom, maxZoom);

        if (stage === "start") {
          const factorMid = prev.mid.zoomFactor;
          const factorEnd = prev.end.zoomFactor;
          if (limitedZoom === prev.start.zoom) return prev;
          return {
            ...prev,
            start: { ...prev.start, zoom: limitedZoom },
            mid: { ...prev.mid, zoom: limitedZoom * factorMid },
            end: { ...prev.end, zoom: limitedZoom * factorEnd },
          };
        }

        if (limitedZoom === target.zoom) return prev;

        const newFactor = limitedZoom / baseZoom;
        if (stage === "end") {
          setEndInitialized(true);
        }
        return {
          ...prev,
          [stage]: { ...target, zoom: limitedZoom, zoomFactor: newFactor },
        };
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [stage]);

  /* -----------------------------
     Save logic
  ------------------------------*/
  function saveStageData() {
    const prev = slide.panZoom || {};
    const pauseDuration = Number.isFinite(Number(prev.pauseDuration))
      ? Number(prev.pauseDuration)
      : DEFAULT_PAUSE_DURATION;
    const newPanZoom = {
      ...prev,
      start: {
        x: stagesData.start.offset.x,
        y: stagesData.start.offset.y,
        scale: stagesData.start.zoom,
        rotation: stagesData.start.rotation,
        duration: normalizeDuration(stagesData.start.duration),
      },
      mid: {
        x: stagesData.mid.offset.x,
        y: stagesData.mid.offset.y,
        scale: stagesData.mid.zoom,
        rotation: stagesData.mid.rotation,
        duration: normalizeDuration(stagesData.mid.duration),
      },
      end: {
        x: stagesData.end.offset.x,
        y: stagesData.end.offset.y,
        scale: stagesData.end.zoom,
        rotation: stagesData.end.rotation,
        duration: normalizeDuration(stagesData.end.duration),
      },
      pauseDuration,
      easing: { zoom: "easeInOutCubic", pan: "easeInOutCubic", rot: "easeInOutCubic" },
    };

    const stageEl = containerRef.current;
    const imageEl = imgRef.current;
    const stageWidth = stageEl?.clientWidth;
    const stageHeight = stageEl?.clientHeight;
    if (Number.isFinite(stageWidth) && Number.isFinite(stageHeight) && stageWidth > 0 && stageHeight > 0) {
      newPanZoom.stageMeta = {
        width: Math.round(stageWidth),
        height: Math.round(stageHeight),
        aspectRatio: stageHeight === 0 ? null : stageWidth / stageHeight,
        imageWidth: imageEl?.naturalWidth ? Math.round(imageEl.naturalWidth) : null,
        imageHeight: imageEl?.naturalHeight ? Math.round(imageEl.naturalHeight) : null,
        savedAt: new Date().toISOString(),
      };
    } else {
      delete newPanZoom.stageMeta;
    }

    onSave(newPanZoom);
  }

  const handleClose = () => {
  saveStageData();
  onCancel();
  };

  const nextStage = () => {
    if (stage === "start") setStage("mid");
    else if (stage === "mid") {
      if (!endInitialized) {
        setStagesData((prev) => {
          const baseZoom = prev.start.zoom || 1;
          const midZoom = prev.mid.zoom;
          const defaultFactorEnd = 1.15;
          const newEndZoom = midZoom * defaultFactorEnd;
          return {
            ...prev,
            end: {
              ...prev.end,
              zoom: newEndZoom,
              zoomFactor: newEndZoom / baseZoom,
            },
          };
        });
        setEndInitialized(true);
      }
      setStage("end");
    } else {
      handleClose();
    }
  };
  const prevStage = () => {
    if (stage === "mid") setStage("start");
    else if (stage === "end") setStage("mid");
  };

  useEffect(() => {
    // keep end initialized flag accurate when panZoom changes mid-session
    setEndInitialized(Boolean(slide?.panZoom?.end));
  }, [slide?.panZoom]);

  const transform = `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg) translate(${(0.5 - offset.x) * 100}%, ${(0.5 - offset.y) * 100}%)`;

  const isIntro = slide?.type === "intro" || slide?._isIntro;
  const isOutro = slide?.type === "outro" || slide?._isOutro;
  const defaultIntroTagline = "Embrace the Past. Live the Story.";
  const introTagline = isIntro ? (slide?.tagline || defaultIntroTagline) : "";
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
        enforceFullLine: isSquareFormat,
        marginLeft: 0,
        marginRight: isSquareFormat ? 0 : "0.35em",
      });

      const trimmedRest = (spaces || " ") + (rest ?? "");
      if (!forceWordWrap) {
        const restKey = "intro-special-1";
        groups.push({
          key: restKey,
          keepTogether: true,
          letters: buildLetters(trimmedRest.trimStart(), restKey),
          marginLeft: isSquareFormat ? 0 : "0.35em",
          marginRight: 0,
        });
      } else {
        const restTokens = trimmedRest
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        const totalWords = restTokens.length;
        restTokens.forEach((word, idx) => {
          const key = `intro-word-${idx}`;
          groups.push({
            key,
            keepTogether: true,
            letters: buildLetters(word, key),
            marginLeft: groups.length === 0 || isSquareFormat ? 0 : "0.35em",
            marginRight: idx === totalWords - 1 ? 0 : undefined,
          });
        });
      }

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

  const frameWidth = useMemo(() => {
    const ratio = Number(aspectRatio) || 1;
    if (ratio >= 1) {
      return `min(85vw, 75vh, calc(56vh * ${ratio.toFixed(4)}))`;
    }
    return `min(85vw, calc(56vh * ${ratio.toFixed(4)}))`;
  }, [aspectRatio]);

  /* -----------------------------
     Render
  ------------------------------*/
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 text-white">
      <div className="bg-neutral-900 rounded-xl shadow-xl w-full max-w-5xl overflow-hidden border border-neutral-700">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 bg-neutral-800 border-b border-neutral-700">
          <h2 className="text-lg font-semibold">
            {slide?.title || "Untitled"} — {stage.toUpperCase()} State
          </h2>
          <button
            onClick={handleClose}
            className="px-2 py-1 text-xs bg-red-600 rounded hover:bg-red-700"
          >
            ✕ Close
          </button>
        </div>

        {/* Image Preview */}
        <div
          ref={containerRef}
          className="relative flex items-center justify-center mx-auto"
          style={{
            // ✅ Outer frame window (mask)
            aspectRatio: String(aspectRatio),
            width: frameWidth,
            maxWidth: "95%",
            maxHeight: "56vh",
            height: "auto",
            overflow: "hidden",
            cursor: "grab",
            borderRadius: "0.75rem",
            border: "2px solid rgba(255,255,255,0.2)",
            backgroundColor: "black",
            boxShadow: "0 0 14px rgba(0,0,0,0.7), inset 0 0 4px rgba(255,255,255,0.05)",
            padding: "0.5rem",
            margin: "1rem auto",
            position: "relative",
          }}
        >
          {/* Overlay label for format */}
          {resolution && (
            <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 text-[10px] rounded">
              {resolution.width}×{resolution.height} ({aspectRatio.toFixed(2)}:1)
            </div>
          )}

          {isIntro && (
            <div
              className="absolute flex flex-col items-center text-center gap-4"
              style={{
                left: "50%",
                top: "50%",
                transform,
                transformOrigin: "center",
                transition: "transform 0.05s linear",
                color: "white",
                pointerEvents: "none",
                maxWidth: "80%",
              }}
            >
              {stage === "start" && (
                <>
                  <h2 className="text-xl sm:text-2xl font-light tracking-widest opacity-80">
                    {slide.opening || "A K4 Studios Picture Show"}
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
                </>
              )}
              {stage === "mid" && (
                <h1 className="text-4xl sm:text-5xl font-bold">
                  {slide.title || "Western Living History"}
                </h1>
              )}
              {stage === "end" && introWordGroups.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`intro-tagline-${introTagline}`}
                    className="text-lg sm:text-xl font-medium italic opacity-90 flex flex-wrap justify-center"
                    style={{ gap: "0.05em", lineHeight: "1.2" }}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { duration: 0.2 } },
                    }}
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
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}

          {isOutro && (
            <div
              className="absolute flex flex-col items-center text-center gap-4"
              style={{
                left: "50%",
                top: "50%",
                transform,
                transformOrigin: "center",
                transition: "transform 0.05s linear",
                color: "white",
                pointerEvents: "none",
                maxWidth: "85%",
              }}
            >
              {stage === "start" && (
                <p className="text-xl sm:text-2xl font-light italic max-w-3xl">
                  {slide.closing ||
                    "Every image is another notch in the belt, keeping history alive."}
                </p>
              )}
              {stage === "mid" && (
                <h2 className="text-2xl sm:text-3xl font-semibold">
                  {slide.cta || "Visit k4studios.com to explore more Picture Shows."}
                </h2>
              )}
              {stage === "end" && (
                <div className="flex flex-col items-center gap-2 opacity-90">
                  <a
                    href={slide.url || "https://www.k4studios.com/pictureshow"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-sm sm:text-base hover:text-blue-300"
                    style={{ pointerEvents: "auto" }}
                  >
                    {slide.url || "https://www.k4studios.com/pictureshow"}
                  </a>
                  <div className="flex flex-col items-center">
                    <img
                      src="/images/K4Logo-web.webp"
                      alt="K4 Studios Logo"
                      style={{
                        width: "90px",
                        height: "auto",
                        marginBottom: "0.25rem",
                        filter:
                          "invert(1) brightness(1.1) drop-shadow(0 0 4px rgba(255,255,255,0.3))",
                      }}
                    />
                    <p className="text-xs tracking-wide text-gray-300">
                      © Wayne Heim — K4 Studios
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isIntro && !isOutro && imgSrc && (
            <img
              ref={imgRef}
              src={imgSrc}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform,
                transformOrigin: "center",
                transition: "transform 0.05s linear",
                userSelect: "none",
                maxWidth: "none",
                maxHeight: "none",
                width: "auto",
                height: "auto",
              }}
            />
          )}

          {!isIntro && !isOutro && !imgSrc && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No image source found
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-neutral-800 p-4 flex flex-wrap items-center gap-6">
          <div className="text-xs font-semibold whitespace-nowrap">
            {stage === "start" && "1. Start State"}
            {stage === "mid" && "2. Middle State"}
            {stage === "end" && "3. End State"}
          </div>

          {(isIntro || isOutro) && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-300">
              <span className="uppercase tracking-wide font-semibold text-neutral-400">Timing (sec)</span>
              {[
                { key: "start", label: "Start" },
                { key: "mid", label: "Mid" },
                { key: "end", label: "End" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1">
                  <span className="text-neutral-400">{label}</span>
                  <input
                    type="number"
                    min={MIN_STAGE_DURATION}
                    step="0.1"
                    value={normalizeDuration(stagesData[key]?.duration)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = normalizeDuration(raw, stagesData[key]?.duration);
                      setStagesData((prev) => {
                        if (prev[key]?.duration === parsed) return prev;
                        return {
                          ...prev,
                          [key]: { ...prev[key], duration: parsed },
                        };
                      });
                    }}
                    className="w-14 rounded border border-neutral-600 bg-neutral-900 px-1 py-0.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </label>
              ))}
            </div>
          )}

          <label className="flex flex-col text-xs">
            Zoom ({zoom.toFixed(2)}x)
            <input
              type="range"
              min={stagesData.start.zoom * 0.8}
              max={stagesData.start.zoom * 2}
              step="0.01"
              value={zoom}
              onChange={(e) =>
                setStagesData((prev) => {
                  const newZoom = parseFloat(e.target.value);
                  if (stage === "start") {
                    const factorMid = prev.mid.zoomFactor;
                    const factorEnd = prev.end.zoomFactor;
                    return {
                      ...prev,
                      start: { ...prev.start, zoom: newZoom },
                      mid: { ...prev.mid, zoom: newZoom * factorMid },
                      end: { ...prev.end, zoom: newZoom * factorEnd },
                    };
                  } else {
                    const baseZoom = prev.start.zoom;
                    const newFactor = newZoom / baseZoom;
                    if (stage === "end") {
                      setEndInitialized(true);
                    }
                    return {
                      ...prev,
                      [stage]: { ...prev[stage], zoom: newZoom, zoomFactor: newFactor },
                    };
                  }
                })
              }
            />
          </label>

          <label className="flex flex-col text-xs">
            Rotation ({rotation.toFixed(1)}°)
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={rotation}
              onChange={(e) =>
                setStagesData((prev) => ({
                  ...prev,
                  [stage]: { ...prev[stage], rotation: parseFloat(e.target.value) },
                }))
              }
            />
          </label>

          <div className="ml-auto flex gap-3">
            <button
              onClick={prevStage}
              disabled={stage === "start"}
              className="bg-neutral-700 px-3 py-1 rounded disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={nextStage}
              className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
            >
              {stage === "end" ? "Done" : "Next State →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

