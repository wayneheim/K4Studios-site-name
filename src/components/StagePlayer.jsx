import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const STAGES = ["start", "mid", "end"];

function normalizeOffset(s) {
  const x = s?.offset?.x ?? s?.x ?? 0.5;
  const y = s?.offset?.y ?? s?.y ?? 0.5;
  return { x, y };
}

function hasAnySavedZoom(pz) {
  return Boolean(
    pz?.start?.scale || pz?.start?.zoom ||
    pz?.mid?.scale   || pz?.mid?.zoom   ||
    pz?.end?.scale   || pz?.end?.zoom
  );
}

function buildStageZooms(pz, baseZoomFromFit) {
  // base zoom = explicit start zoom if present, else fit-to-height baseline
  const explicitStart = pz?.start?.scale ?? pz?.start?.zoom;
  const startZoom = Number(explicitStart) || baseZoomFromFit || 1;

  const midZoomExplicit = pz?.mid?.scale ?? pz?.mid?.zoom;
  const midFactor = Number(pz?.mid?.zoomFactor) || (midZoomExplicit ? (Number(midZoomExplicit)/startZoom) : 1.15);
  const midZoom = Number(midZoomExplicit) || startZoom * midFactor;

  const endZoomExplicit = pz?.end?.scale ?? pz?.end?.zoom;
  const endFactor = Number(pz?.end?.zoomFactor) || (endZoomExplicit ? (Number(endZoomExplicit)/startZoom) : 1.15*1.15);
  const endZoom = Number(endZoomExplicit) || startZoom * endFactor;

  return { startZoom, midZoom, endZoom };
}

export default function StagePlayer({
  images = [],
  outputResolution = { width: 1920, height: 1080 },
  onExit = () => {},
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const stageKey = STAGES[stageIndex];

  const slide = images[slideIndex] || {};
  const isIntro  = slide?._isIntro  || slide?.type === "intro";
  const isOutro  = slide?._isOutro  || slide?.type === "outro";

  const imgSrc =
    slide?.srcXL || slide?.srcL || slide?.srcM || slide?.src || slide?.url || "";

  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Fit-to-height baseline (only used when there is no saved zoom at all)
  const [fitBaseZoom, setFitBaseZoom] = useState(1);

  // Recompute baseline when image loads or slide/frame changes
  useLayoutEffect(() => {
    const container = containerRef.current;
    const img = imgRef.current;

    // If this slide already has explicit zoom anywhere, do NOT fit
    const pz = slide?.panZoom || {};
    if (hasAnySavedZoom(pz)) {
      setFitBaseZoom(1);
      return;
    }

    // For intro/outro (no image), we use 1:1 baseline
    if (isIntro || isOutro || !img) {
      setFitBaseZoom(1);
      return;
    }

    function compute() {
      if (!container || !img || !img.naturalHeight) {
        setFitBaseZoom(1);
        return;
      }
      const cH = container.offsetHeight || outputResolution.height;
      const iH = img.naturalHeight;
      const base = iH ? cH / iH : 1;
      setFitBaseZoom(base);
    }

    if (img.complete) compute();
    else img.onload = compute;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, stageIndex, imgSrc, outputResolution.width, outputResolution.height]);


  // --- New transform logic for playback centering ---
  const w = outputResolution.width;
  const h = outputResolution.height;
  const stageW = w;
  const stageH = h;

  // Determine asset size
  let assetW = stageW, assetH = stageH;
  if (!isIntro && !isOutro && imgRef.current && imgRef.current.naturalWidth && imgRef.current.naturalHeight) {
    assetW = imgRef.current.naturalWidth;
    assetH = imgRef.current.naturalHeight;
  }

  // Fit asset to stage
  const fitScale = Math.min(stageW / assetW, stageH / assetH);

  // Pan/zoom/rotate values from stageData
  const pz = slide?.panZoom || {};
  const sData =
    stageKey === "start" ? (pz.start || {}) :
    stageKey === "mid"   ? (pz.mid   || {}) :
                           (pz.end   || {});
  const x = sData.x ?? sData.offset?.x ?? 0.5;
  const y = sData.y ?? sData.offset?.y ?? 0.5;
  const userScale = sData.scale ?? sData.zoom ?? 1;
  const rotation = sData.rotation ?? 0;


  // Compose the transform for image or intro/outro block
  const transform = `
    translate(-50%, -50%)
    scale(${fitScale * userScale})
    rotate(${rotation}deg)
    translate(${(0.5 - x) * assetW}px, ${(0.5 - y) * assetH}px)
  `;

  // Editor dimensions for scaling overlay content
  const editorWidth = 960;
  const editorHeight = 540;
  const scale = w / editorWidth;

  const handleForward = () => {
    if (stageIndex < 2) {
      setStageIndex((i) => i + 1);
    } else if (slideIndex < images.length - 1) {
      setSlideIndex((i) => i + 1);
      setStageIndex(0);
    } else {
      onExit();
    }
  };

  const handleBack = () => {
    if (stageIndex > 0) {
      setStageIndex((i) => i - 1);
    } else if (slideIndex > 0) {
      setSlideIndex((i) => i - 1);
      setStageIndex(2);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col items-center justify-center z-50" style={{fontFamily: "'Glegoo', serif"}}>
      <div className="text-xs font-mono text-neutral-400 mb-2">
        {w} × {h}px — Slide {slideIndex + 1}/{images.length} ({stageKey})
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
              transition: "transform 0.05s linear",
              width: assetW,
              height: assetH,
              objectFit: "contain",
              userSelect: "none",
            }}
          />
        )}

        {/* Intro */}
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
            <h2 className="text-xl sm:text-2xl font-light tracking-widest opacity-80">
              {(() => {
                const text = images[slideIndex]?.opening || "K4 Studios presents the Fine Art Photography of Wayne Heim.";
                const breakAfter = "presents";
                const idx = text.indexOf(breakAfter);
                if (idx !== -1) {
                  const before = text.slice(0, idx + breakAfter.length);
                  const after = text.slice(idx + breakAfter.length).trimStart();
                  if (outputResolution.width / outputResolution.height > 1.3) {
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
          </div>
        )}

        {/* Outro */}
        {isOutro && (
          (() => {
            const stageWidth = outputResolution.width;
            const stageHeight = outputResolution.height;
            return (
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  width: stageWidth,
                  height: stageHeight,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontFamily: '"Glegoo", monospace, serif',
                    fontSize: stageHeight * 0.04,
                    letterSpacing: '0.08em',
                    color: '#eee',
                    textShadow: '0 1px 8px #000, 0 0 1px #fff',
                    marginBottom: stageHeight * 0.04,
                    lineHeight: 1.2,
                  }}
                >
                  K4 Studios presents the Fine Art Photography of Wayne Heim.
                </div>
                <img
                  src="/images/K4-Stories logo2b.webp"
                  alt=""
                  style={{
                    width: stageHeight * 0.17,
                    maxWidth: stageWidth * 0.18,
                    opacity: 0.93,
                    filter: 'drop-shadow(0 3px 14px #222)',
                    margin: 0,
                  }}
                />
              </div>
            );
          })()
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleBack}
          disabled={slideIndex === 0 && stageIndex === 0}
          className="bg-neutral-700 px-3 py-1 rounded disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          onClick={handleForward}
          className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
        >
          Forward →
        </button>
        <button onClick={onExit} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">
          Exit ✕
        </button>
      </div>
    </div>
  );
}
