import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";

export default function PunchInIntro({ onDone, introMeta = {} }) {
  // Check if introMeta has any actual data
  const hasIntroMeta = Object.keys(introMeta).length > 0;

  // Get intro metadata - ONLY use defaults if introMeta is completely empty
  const showIntroText = hasIntroMeta ? (introMeta?.showIntroText ?? true) : true;
  const showShowTitle = hasIntroMeta ? (introMeta?.showShowTitle ?? true) : true;
  const showTagline = hasIntroMeta ? (introMeta?.showTagline ?? true) : true;
  const introTextStage = hasIntroMeta ? (introMeta?.introTextStage ?? 1) : 1;
  const showTitleStage = hasIntroMeta ? (introMeta?.showTitleStage ?? 2) : 2;
  const taglineStage = hasIntroMeta ? (introMeta?.taglineStage ?? 3) : 3;
  const introPieceOrder = hasIntroMeta ? (introMeta?.introPieceOrder || ["introText", "showTitle", "tagline"]) : ["introText", "showTitle", "tagline"];

  // Determine which stages are actually used
  const usedStages = useMemo(() => {
    const stages = new Set();
    if (showIntroText) stages.add(introTextStage);
    if (showShowTitle) stages.add(showTitleStage);
    if (showTagline) stages.add(taglineStage);
    return stages.size > 0 ? stages : new Set([1]);
  }, [showIntroText, showShowTitle, showTagline, introTextStage, showTitleStage, taglineStage]);

  // Get the first (lowest) used stage
  const firstStage = useMemo(() => {
    const stagesArray = Array.from(usedStages);
    return stagesArray.length > 0 ? Math.min(...stagesArray) : 1;
  }, [usedStages]);

  // Determine which pieces are on the first stage
  const pieces = useMemo(() => {
    const result = [];

    if (showIntroText && introTextStage === firstStage) {
      result.push({
        type: "introText",
        text: introMeta?.introText || "K4 Studios presents the Fine Art Photography of Wayne Heim.",
      });
    }

    if (showShowTitle && showTitleStage === firstStage) {
      result.push({
        type: "showTitle",
        text: introMeta?.showTitle || "Western Living History",
      });
    }

    if (showTagline && taglineStage === firstStage) {
      result.push({
        type: "tagline",
        text: introMeta?.tagline || "Embrace the Past... Live the Story.",
      });
    }

    // Sort by introPieceOrder
    result.sort((a, b) => introPieceOrder.indexOf(a.type) - introPieceOrder.indexOf(b.type));

    return result;
  }, [introMeta, showIntroText, showShowTitle, showTagline, introTextStage, showTitleStage, taglineStage, introPieceOrder, firstStage]);

  return (
    <motion.div
      key="intro"
      className="absolute inset-0 flex flex-col items-center justify-center font-serif gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeIn" }}
      style={{
        color: "#f3ecd9",
        fontWeight: 700,
        textAlign: "center",
        padding: "0 20px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
      }}
    >
      {/* Render all pieces on first stage in order */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {pieces.map((piece) => (
          <div key={piece.type} style={{ maxWidth: "80%" }}>
            {piece.type === "introText" && (
              <>
                <h2 className="text-xl sm:text-2xl font-light tracking-widest opacity-80">
                  {piece.text}
                </h2>
                <img
                  src="/images/K4-Stories logo2b.webp"
                  alt="K4 Stories Logo"
                  style={{
                    width: "140px",
                    height: "auto",
                    opacity: 0.9,
                    filter: "drop-shadow(0 0 4px rgba(255,255,255,0.4))",
                    margin: "1rem auto 0",
                  }}
                />
              </>
            )}
            {piece.type === "showTitle" && (
              <h1 className="text-4xl sm:text-5xl font-bold">
                {piece.text}
              </h1>
            )}
            {piece.type === "tagline" && (
              <p className="text-lg sm:text-xl font-medium italic opacity-90" style={{ fontStyle: "italic" }}>
                {piece.text}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Exit button at the bottom */}
      <button
        onClick={onDone}
        className="mb-4 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        style={{ cursor: "pointer" }}
      >
        Continue →
      </button>
    </motion.div>
  );
}
