
import React, { useState, useEffect } from "react";
import { X, Volume2 } from "lucide-react";

let globalSetAudioSrc = null; // closure reference

function FloatingAudioPlayer({ src, onClose }) {
  if (!src) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        background: "rgba(255,255,255,0.97)",
        border: "1px solid #aaa",
        borderRadius: 10,
        padding: "10px 14px",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
      }}
    >
      <audio src={src} controls autoPlay style={{ width: 240 }} />
      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 4,
        }}
        title="Close"
      >
        <X size={20} color="#333" />
      </button>
    </div>
  );
}

export function GlobalAudioPlayerRoot() {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    globalSetAudioSrc = setSrc;
    return () => {
      globalSetAudioSrc = null;
    };
  }, []);

  return src ? (
    <FloatingAudioPlayer src={src} onClose={() => setSrc(null)} />
  ) : null;
}

export function AudioPreviewIcon({ src }) {
  if (!src) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (globalSetAudioSrc) globalSetAudioSrc(src);
      }}
      title="Preview audio"
      style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        borderRadius: "50%",
        padding: "8px",
        border: "1px solid #aaa",
        cursor: "pointer",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      <Volume2 size={26} color="#333" />
    </button>
  );
}
