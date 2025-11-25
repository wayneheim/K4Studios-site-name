// src/components/StagePlayer.jsx
import React, { useState, useMemo, useCallback } from "react";

/**
 * StagePlayer — Phase 1 (Static Scrubber, 1:1 Playback)
 * ----------------------------------------------------
 * Displays slides at true full resolution with correct pan/zoom/offset scaling.
 * Each Forward click: start → mid → end → next slide (start)
 * Each Back click reverses that order.
 */

export default function StagePlayer({
  images = [],
  outputAspect = 16 / 9,
  outputResolution = { width: 1920, height: 1080 },
  onExit = () => {},
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const stages = ["start", "mid", "end"];
  const currentStageName = stages[stageIndex];
  const totalSlides = images.length;

  const currentSlide = images[slideIndex] || {};
  const src =
    currentSlide.srcXL ||
    currentSlide.srcL ||
    currentSlide.srcM ||
    currentSlide.src ||
    "";

  const { width, height } = outputResolution;
  const metaWidth = currentSlide.metaWidth || width;
  const metaHeight = currentSlide.metaHeight || height;
  const stageData =
    currentSlide?.panZoom?.[currentStageName] || {
      zoom: 1,
      rotation: 0,
      offset: { x: 0.5, y: 0.5 },
    };
  const { zoom = 1, rotation = 0, offset = { x: 0.5, y: 0.5 } } = stageData;

  /** 🔧 Corrected transform for 50% editor scale */
  const transformStyle = useMemo(() => {
    const trueWidth = (metaWidth || width) * 2; // double from editor
    const trueHeight = (metaHeight || height) * 2;
    const cx = (0.5 - offset.x) * trueWidth;
    const cy = (0.5 - offset.y) * trueHeight;

    return {
      width: `${trueWidth}px`,
      height: `${trueHeight}px`,
      objectFit: "cover",
      transformOrigin: "center center",
      transform: `translate(${cx}px, ${cy}px) scale(${zoom}) rotate(${rotation || 0}deg)`,
    };
  }, [metaWidth, metaHeight, offset.x, offset.y, zoom, rotation, width, height]);

  /** Navigation */
  const handleForward = useCallback(() => {
    if (!images.length) return;
    if (stageIndex < 2) setStageIndex((i) => i + 1);
    else {
      setStageIndex(0);
      setSlideIndex((i) => (i + 1) % images.length);
    }
  }, [stageIndex, images.length]);

  const handleBack = useCallback(() => {
    if (!images.length) return;
    if (stageIndex > 0) setStageIndex((i) => i - 1);
    else {
      setStageIndex(2);
      setSlideIndex((i) =>
        i === 0 ? images.length - 1 : (i - 1 + images.length) % images.length
      );
    }
  }, [stageIndex, images.length]);

  if (!images.length)
    return (
      <div className="fixed inset-0 bg-black text-white grid place-items-center">
        <div>No slides loaded</div>
      </div>
    );

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-neutral-900 text-gray-100 select-none">
      {/* Info Bar */}
      <div className="mb-2 text-sm font-mono opacity-80">
        {width} × {height}px — {outputAspect.toFixed(2)} — Slide{" "}
        {slideIndex + 1}/{totalSlides} ({currentStageName})
      </div>

      {/* Live Area */}
      <div
        className="relative bg-black overflow-hidden flex items-center justify-center"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: "2px solid red",
        }}
      >
        {src ? (
          <img
            src={src}
            alt={currentSlide.title || ""}
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              ...transformStyle,
            }}
          />
        ) : (
          <div className="text-gray-500">No image</div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex gap-4">
        <button
          onClick={handleBack}
          className="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-600"
        >
          ← Back
        </button>
        <button
          onClick={handleForward}
          className="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-600"
        >
          Forward →
        </button>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-md bg-red-700 hover:bg-red-600 border border-red-800"
        >
          Exit ✕
        </button>
      </div>
    </div>
  );
}
