import React, { useEffect, useMemo, useRef, useState } from "react";

// Global audio ref for single-track playback
let globalAudioRef = null;

// Import saved shows for the dropdown list
import { stories as savedShowsList } from "@/data/Other/Stories/stories.mjs";

import { Volume2 } from "lucide-react";

function AudioPreviewIcon({ src, muted, ambient }) {
    if (!src) return null;
    // Default muted to false if not provided
    const isMuted = typeof muted === 'boolean' ? muted : false;
    // If ambient mode, use blue; if score (muted), use gray; else green
    let iconColor = "#19c37d"; // default green
    if (ambient) iconColor = "#4a90e2";
    if (isMuted) iconColor = "#bbb";
    return (
      <div
        title={isMuted ? "Audio muted" : ambient ? "Ambient audio" : "Audio attached"}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1000,
          background: "rgba(255,255,255,0.9)",
          borderRadius: "50%",
          padding: "6px",
          border: "1px solid #aaa",
          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
          pointerEvents: "none",
        }}
      >
        <Volume2 size={22} color={iconColor} />
      </div>
    );
}

/* =============================================
   K4 Picture Show Story Builder (MVP v1.0)
   - Multi-gallery collector (Ctrl/Cmd click to select)
   - Ghost intro + Closing slide auto-injected
   - Reorder grid with HTML5 drag & drop
   - Right-click edit modal for any slide (incl. Ghost/Closing)
   - Optional local audio file picker (stores path/filename only)
   - Export to .mjs file (storyData array)
   ============================================= */

/* ========= roots (add more here if needed) ========= */
const DATA_ROOTS = [
  "/src/data/Galleries",
  "/src/pages/Other",
  "/src/data/Other",
];

const AUDIO_BASE_URL = "/audio/StoryShows/"; // or "https://cdn.k4studios.com/audio/StoryShows/"

/* ========= helpers ========= */
function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizePath(p = "") {
  return p.replace(/\\/g, "/");
}

function getAudioFileName(src = "") {
  if (!src) return "";
  if (src.startsWith("http")) return decodeURIComponent(src.split("/").pop() || "");
  if (src.startsWith("/")) return src.split("/").pop() || "";
  return src;
}

function toBase64FromArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function stripRoot(p) {
  const n = normalizePath(p);
  for (const root of DATA_ROOTS) {
    const r = normalizePath(root) + "/";
    if (n.startsWith(r)) return n.slice(r.length);
  }
  return n.startsWith("/") ? n.slice(1) : n;
}


/* === Server save helper (fixed version with correct order and working Package Show button) === */
async function saveShowToServer(showArray, showMeta) {
  if (!showArray?.length) {
    alert("No show data to save.");
    return;
  }

  // --- Prepare filenames and metadata ---
  const safeSlug = (showMeta?.showTitle || "Untitled-Show")
    .replace(/&/g, "and")           // Replace & with "and"
    .replace(/,/g, "")              // Remove commas
    .replace(/\s+/g, "-")           // Spaces to dashes
    .replace(/-+/g, "-")            // Collapse multiple dashes to single
    .replace(/[^a-zA-Z0-9-_]/g, "") // Remove any remaining special chars
    .replace(/-+/g, "-");           // Final pass to collapse dashes
  const mjsFilename = `${safeSlug}.mjs`;
  const astroFilename = `${safeSlug}.astro`;
  // Remove global audio fields from storyMeta (they go in ghost slide)
  const { globalAudioSrc, globalAudioMode, globalAudioFile, ...metaWithoutAudio } = showMeta;
  
  // Build complete storyMeta with intro/outro metadata for VideoBaker compatibility
  const metaWithTimestamp = { 
    ...metaWithoutAudio, 
    savedAt: new Date().toISOString(),
    // Add introMeta for VideoBaker (used for video export, not web slideshow)
    introMeta: showMeta.introMeta || {
      introText: "K4 Studios presents the Fine Art Photography of Wayne Heim.",
      showTitle: showMeta.showTitle || "Untitled Show",
      tagline: "Embrace the Past... Live the Story.",
      introTextStage: 1,
      showTitleStage: 2,
      taglineStage: 1,
      showIntroText: true,
      showShowTitle: true,
      showTagline: true,
      introPieceOrder: ["tagline", "introText", "showTitle"]
    },
    // Empty pan/zoom data - populated by VideoBaker
    introPanZoom: showMeta.introPanZoom || {},
    outroPanZoom: showMeta.outroPanZoom || {},
    burnRateSeconds: showMeta.burnRateSeconds || 50,
    burnPauseSeconds: showMeta.burnPauseSeconds || 2
  };

  // --- Upload audio (with progress + caching) ---
  const audioCache = JSON.parse(localStorage.getItem("r2AudioCache") || "{}");
  let uploadIndex = 1;
  let uploadedAudio = 0;
  let failedAudio = [];

  const R2_BASE = "https://media.k4studios.com/";

  async function remoteFileExists(url) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function uploadAudio(fileObj, destKey, label) {
    // If we have a fresh File object, always upload and overwrite the target key.
    // This guarantees recovery from bad/corrupt existing objects in R2.
    if (!fileObj && audioCache[destKey]) {
      const cachedUrl = audioCache[destKey];
      if (await remoteFileExists(cachedUrl)) {
        console.log(`(cached) ${label}: ${destKey}`);
        return cachedUrl;
      }
      delete audioCache[destKey];
      localStorage.setItem("r2AudioCache", JSON.stringify(audioCache));
    }
    // No File object means audio was already uploaded in a prior session.
    // Only accept the derived URL if the file actually exists in R2.
    if (!fileObj) {
      const derivedUrl = R2_BASE + destKey;
      if (await remoteFileExists(derivedUrl)) {
        console.log(`(derived R2 URL — verified) ${label}: ${derivedUrl}`);
        audioCache[destKey] = derivedUrl;
        localStorage.setItem("r2AudioCache", JSON.stringify(audioCache));
        uploadedAudio += 1;
        return derivedUrl;
      }
      throw new Error(`Missing audio in R2 for ${label}. Reattach the file to overwrite it.`);
    }
    delete audioCache[destKey];
    localStorage.setItem("r2AudioCache", JSON.stringify(audioCache));
    console.log(`Uploading ${uploadIndex++}: ${label}...`);
    const url = `/.netlify/functions/uploadToR2?destKey=${encodeURIComponent(destKey)}`;
    const arrayBuffer = await fileObj.arrayBuffer();
    const base64 = toBase64FromArrayBuffer(arrayBuffer);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destKey,
        contentBase64: base64,
        contentType: fileObj.type || "audio/mpeg",
        payloadType: "audio",
      }),
    });
    const data = await res.json();
    if (!data.url) throw new Error(data.error || "No URL returned");
    audioCache[destKey] = data.url;
    localStorage.setItem("r2AudioCache", JSON.stringify(audioCache));
    console.log(`✅ Uploaded: ${label}`);
    uploadedAudio += 1;
    return data.url;
  }

  // Global audio upload handled during ghost slide injection below

  // Per-slide audio
  for (const slide of showArray) {
    const fileObj = slide.audioFile || null;
    if (slide.audioSrc && (fileObj || !slide.audioSrc.startsWith("http"))) {
      // If a fresh File exists, upload it even if audioSrc currently points at an HTTP URL.
      const fileName = getAudioFileName(slide.audioSrc);
      const destKey = `StoryShows/${safeSlug}/${fileName}`;
      try {
        slide.audioSrc = await uploadAudio(fileObj, destKey, fileName);
      } catch (err) {
        console.error(`Slide audio upload failed (${fileName}):`, err);
        failedAudio.push(fileName || "(unknown)");
      }
    }
  }

  // Only .mjs and .astro files are written, and only audio files are uploaded.

  // --- Store global audio only in ghost slide, upload if needed ---
  let globalAudioUrl = "";
  let ghostAudioMode = showMeta.globalAudioMode || "mute";
  if (ghostAudioMode !== "mute" && showMeta.globalAudioSrc) {
    const rawSrc = showMeta.globalAudioSrc;
    if (rawSrc.startsWith("http") && !showMeta.globalAudioFile) {
      // Already a full URL (previously uploaded) — use as-is
      globalAudioUrl = rawSrc;
    } else {
      // Upload (or derive R2 URL if no File object available)
      const fileObj = showMeta.globalAudioFile || null;
      const fileName = getAudioFileName(rawSrc);
      const destKey = `StoryShows/${safeSlug}/${fileName}`;
      try {
        globalAudioUrl = await uploadAudio(fileObj, destKey, fileName);
      } catch (err) {
        console.error("Global audio upload failed:", err);
        globalAudioUrl = "";
        failedAudio.push(fileName || "(global audio)");
      }
    }
  }
  // If muted, globalAudioUrl stays empty
  const slidesWithGhostAudio = showArray.map((slide, idx) => {
    if (idx === 0 && (slide.id === "i-k4studios" || slide.visibility === "ghost")) {
      return {
        ...slide,
        audioSrc: globalAudioUrl,
        globalAudioMode: ghostAudioMode
      };
    }
    return slide;
  });

  // --- Build file contents ---
  // Remove closing slide from export; viewer renders its own end screen
  const exportSlides = slidesWithGhostAudio.filter(
    (s) => s.visibility !== "closing" && s.id !== "i-k4studios-closing"
  );
  const mjsContent = `// Auto-generated by VideoBaker – review & commit\nexport const storyMeta = ${JSON.stringify(metaWithTimestamp, null, 2)};\nexport const storyData = ${JSON.stringify(exportSlides, null, 2)};`;

  const astroContent = `---
export const prerender = true;
// Auto-generated Astro page for ${safeSlug}
import BaseLayout from "@/layouts/BaseLayout.astro";
import PictureShowBase from "@/components/PictureShowBase.jsx";
import { storyMeta, storyData } from "@/data/Other/Stories/${safeSlug}.mjs";
import { getStructuredData } from "@/components/utils/getStructuredData.ts";
import { normalizeImageSrc } from "@/utils/imageProxy.js";

const coverSlide = storyData.find((slide) => slide.visibility !== "ghost") || storyData[0];
const noscriptImage = normalizeImageSrc(
  coverSlide?.id || coverSlide?.srcS || coverSlide?.srcM || coverSlide?.src || coverSlide?.srcL || "/images/K4-Stories logo1b.webp",
  "l"
);

const structuredDataJSON = getStructuredData({
  type: "gallery",
  data: {
    title: storyMeta.showTitle,
    description: storyMeta.description,
    url: \`https://www.k4studios.com/Other/Show/${safeSlug}\`,
    keywords: storyMeta.keywords,
    copyrightNotice: "© Wayne Heim, k4studios.com. All rights reserved."
  },
  images: storyData,
  defaults: {
    copyrightNotice: "© Wayne Heim, www.k4studios.com. All rights reserved.",
    license: "https://www.k4studios.com/licensing",
    acquireLicensePage: "https://www.k4studios.com/licensing",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/"
  }
});
---

<BaseLayout title={storyMeta.showTitle} structuredDataJSON={structuredDataJSON}>
  <noscript>
    <img
      src={noscriptImage}
      alt="\${storyMeta.showTitle} – Cinematic Picture Show"
      style="width:100%;height:auto;display:block;"
    />
  </noscript>
  <PictureShowBase
    client:load
    rawData={storyData}
    basePath="/Other/Show/${safeSlug}"
    titleBase={storyMeta.showTitle}
    globalAudioSrc={storyMeta.globalAudioSrc || ""}
    globalAudioMode={storyMeta.globalAudioMode || "score"}
    presentationMode={storyMeta.presentationMode === true}
    introMeta={storyMeta.introMeta || {}}
    outroMeta={storyMeta.outroMeta || {}}
  />
</BaseLayout>`;

  // --- Save to server ---
  try {
    const res = await fetch("/.netlify/functions/saveShowData", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: mjsFilename,
        content: mjsContent,
        astroFilename,
        astroContent,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const audioNote = uploadedAudio || failedAudio.length
      ? `\n\nAudio: uploaded ${uploadedAudio}${failedAudio.length ? `, failed ${failedAudio.length} (${failedAudio.join(", ")})` : ""}`
      : "";
    alert(`✅ Show packaged and uploaded:\n• ${mjsFilename}\n• ${astroFilename}${audioNote}`);
  } catch (err) {
    console.error("Server save failed:", err);
    alert("Server save failed; falling back to download.");
    downloadText(mjsContent, mjsFilename);
    downloadText(astroContent, astroFilename);
  }
}


function prettyLabelFromPath(fullPath) {
  const rel = stripRoot(fullPath).replace(/\.mjs$/i, "");
  const segs = rel.split("/").map((s) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
  );
  const rootHint =
    DATA_ROOTS.find((r) => normalizePath(fullPath).startsWith(normalizePath(r) + "/")) || "";
  const rootName = rootHint.split("/").pop(); // "Galleries" or "Other"
  return `[${rootName}] ${segs.join(" / ")}`;
}

function pickImage(d = {}) {
  const src = (
    d.url || d.srcXL || d.srcL || d.srcM || d.srcS || d.src || d.imageUrl || d.cover || d.hero?.src || d.preview?.src ||
    d.images?.[0]?.url || d.images?.[0]?.src || ""
  );
  return src.replace(/\.mjs$/, "");
}

const GHOST_TEMPLATE = {
  id: "i-k4studios",
  title: "Prologue: Dust and Legend",
  description: "An opening panel introducing this story sequence.",
  alt: "Intro slide for demo picture show",
  src: "/images/K4-Stories logo1b.webp",
  src2: "/images/K4-Stories logo2.webp",
  src3: "/images/K4-Stories-logo3b.gif",
  visibility: "ghost",
  sortOrder: -1,
  story:
    "The West wasn’t built on gold—it was built on memory. Every trail, every face, every echo of dust tells a story worth retelling.",
  galleries: ["System / Ghost Intro"], // ✅ Added
};

const CLOSING_TEMPLATE = {
  id: "i-k4studios-closing",
  title: "The End of This Story",
  description:
    "Every photograph carries a fragment of the past — thank you for walking through this story. Continue exploring the gallery below.",
  alt: "Closing slide for this picture show",
  visibility: "closing",
  sortOrder: 9999,
  story: "",
  galleries: ["System / Closing Slide"], // ✅ Added
};

const TEMP_KEY = "K4_Show_Temp_Selected"; // holds working slides (excluding ghost/closing)
const META_KEY = "K4_Show_Meta"; // holds show meta like title/intro

const createDefaultShowMeta = () => ({
  showTitle: "Untitled Picture Show",
  prologueTitle: "Prologue:",
  openingParagraph: "",
  description: "",
  keywords: [],
  alt: "",
  closingText: CLOSING_TEMPLATE.description,
  globalAudioSrc: "",
  globalAudioMode: "score",
  presentationMode: false,
  showWatermark: false,
  watermarkText: "© Wayne Heim",
  copyrightName: "Wayne Heim",
  copyrightYear: new Date().getFullYear().toString(),
});

export default function PictureShowStoryBuilder() {
  // --- Show loaded flag for floating continue button ---
  const [showLoaded, setShowLoaded] = useState(false);
  // --- Track the loaded show's slug for delete functionality ---
  const [loadedShowSlug, setLoadedShowSlug] = useState(null);
  // Ref to track if Show Title has been auto-cleared
  const showTitleClearedRef = useRef(false);
  // Track if Show Title has been auto-cleared
  const [showTitleCleared, setShowTitleCleared] = useState(false);
  /* ---------- stepper ---------- */
  const [step, setStep] = useState(1); // 1..8

  /* ---------- meta ---------- */
  const [showMeta, setShowMeta] = useState(() => {
    try {
      return {
        ...createDefaultShowMeta(),
        ...(JSON.parse(localStorage.getItem(META_KEY) || "null") || {}),
      };
    } catch {
      return createDefaultShowMeta();
    }
  });

  useEffect(() => {
    // Persist meta without non-serializable File objects
    const { globalAudioFile, ...persistable } = showMeta || {};
    localStorage.setItem(META_KEY, JSON.stringify(persistable));
  }, [showMeta]);

  /* ---------- gallery discovery ---------- */
  const modules = useMemo(() => {
    const maps = [
      import.meta.glob("/src/data/Galleries/**/*.mjs", { eager: false, import: "galleryData" }),
      import.meta.glob("/src/pages/Other/**/*.mjs", { eager: false, import: "galleryData" }),
      import.meta.glob("/src/data/Other/**/*.mjs", { eager: false, import: "galleryData" }),
    ];
    return Object.assign({}, ...maps);
  }, []);

  const options = useMemo(() => {
    const rootIdx = (p) => {
      const n = p.replace(/\\/g, "/");
      return DATA_ROOTS.findIndex((r) => n.startsWith(r.replace(/\\/g, "/") + "/"));
    };
    return Object.keys(modules)
      .sort((a, b) => {
        const ra = rootIdx(a), rb = rootIdx(b);
        if (ra !== rb) return ra - rb;
        return stripRoot(a).localeCompare(stripRoot(b));
      })
      .map((path) => ({ path, label: prettyLabelFromPath(path) }));
  }, [modules]);

  /* ---------- selection / loading ---------- */
  const [selectedGalleryPath, setSelectedGalleryPath] = useState("");
  const [galleryItems, setGalleryItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedGalleryPath) return;
      const mod = await modules[selectedGalleryPath]();
      const arr = Array.isArray(mod)
        ? mod
        : Array.isArray(mod?.galleryData)
        ? mod.galleryData
        : Array.isArray(mod?.default)
        ? mod.default
        : [];
      if (cancelled) return;
      const filtered = arr.filter((d) => d?.id && d.id !== "i-k4studios");
      setGalleryItems(filtered);
    }
    load();
    return () => { cancelled = true; };
  }, [selectedGalleryPath]);

  const [picked, setPicked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TEMP_KEY) || "null") || []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(TEMP_KEY, JSON.stringify(picked));
  }, [picked]);

  function togglePick(item, multi = false) {
    setPicked((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) {
        return prev.filter((p) => p.id !== item.id);
      }
      const galleryPath = stripRoot(selectedGalleryPath || "");
      return [...prev, {
        ...item,
        galleries: [galleryPath]
      }];
    });
  }

  // Counter to force-remount file inputs (guarantees same-name re-picks fire onChange)
  const [fileInputKey, setFileInputKey] = useState(0);

  /* ---------- editing & reorder grid (combined) ---------- */
  const [slides, setSlides] = useState([]); // this includes ghost/closing once built

  function buildSlidesForEdit() {
    // inject ghost + closing around the currently picked images
    const main = [...picked];
    // Normalize visibility default
    const normalized = main.map((s, i) => ({
      ...s,
      visibility: s.visibility || "show",
      sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : i,
    }));
    const ghost = {
      ...GHOST_TEMPLATE,
      title: showMeta.prologueTitle || "Prologue:",
      story: showMeta.openingParagraph || "",
      showMark: showMeta.showWatermark,
      watermarkText: showMeta.watermarkText,
      keywords: showMeta.keywords || []
    };
    const closing = { ...CLOSING_TEMPLATE, description: showMeta.closingText };
    setSlides([ghost, ...normalized, closing]);
  }

  /* ---------- reorder (HTML5 DnD) ---------- */
  const dragIndex = useRef(null);
  function onDragStart(idx) { dragIndex.current = idx; }
  function onDragOver(e) { e.preventDefault(); }
  function onDrop(idx) {
    const from = dragIndex.current;
    if (from == null || from === idx) return;
    setSlides((arr) => {
      // lock ghost (0) and closing (last)
      const last = arr.length - 1;
      if (from === 0 || idx === 0 || from === last || idx === last) return arr;
      const copy = [...arr];
      const [moved] = copy.splice(from, 1);
      copy.splice(idx, 0, moved);
      return copy.map((s, i) => ({ ...s, sortOrder: i === 0 ? -1 : i === copy.length - 1 ? 9999 : i }));
    });
  }

  /* ---------- right-click edit modal ---------- */
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, index: -1 });
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(-1); // highlight selection

  function handleContext(e, idx) {
    e.preventDefault();
    // Only allow context menu if this slide is selected
    if (selectedSlideIdx === idx) {
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, index: idx });
    }
  }
  useEffect(() => {
    function close() { if (contextMenu.visible) setContextMenu({ visible: false, x: 0, y: 0, index: -1 }); }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu.visible]);

  function openEdit(idx) {
    setEditData({ ...slides[idx] });
    setEditOpen(true);
    setContextMenu({ visible: false, x: 0, y: 0, index: -1 });
  }

  function applyEdit() {
    setSlides((arr) => arr.map((s) => (s.id === editData.id ? { ...editData } : s)));
    setEditOpen(false);
  }

  function onAudioPick(file) {
    try {
      if (!file) {
        console.warn('No file selected for audio.');
        return;
      }
      if (!file.name) {
        console.error('Selected file does not have a name property:', file);
        alert('Selected file is invalid. Please pick a valid audio file.');
        return;
      }
      const audioPath = AUDIO_BASE_URL + file.name;
      const localPath = file.path || file.webkitRelativePath || "";
      // Update local editData (store actual File for upload)
      const updated = { 
        ...editData, 
        audioSrc: audioPath, 
        audioLocal: localPath,
        audioFile: file
      };
      setEditData(updated);
      // Update main slides list
      setSlides((arr) =>
        arr.map((s) => (s.id === updated.id ? updated : s))
      );
    } catch (err) {
      console.error('Error in onAudioPick:', err);
      alert('Error adding audio file: ' + err.message);
    }
  }

  /* ---------- export ---------- */
  function ensureGhostAndClosing(payload) {
    let arr = [...payload];
    const hasGhost = arr.find((s) => s.id === "i-k4studios")
      || arr.find((s) => s.visibility === "ghost");
    const hasClosing = arr.find((s) => s.visibility === "closing")
      || arr.find((s) => s.id === "i-k4studios-closing");

    if (!hasGhost) arr.unshift({
      ...GHOST_TEMPLATE,
      title: showMeta.prologueTitle || "Prologue:",
      story: showMeta.openingParagraph || "",
      showMark: showMeta.showWatermark,
      watermarkText: showMeta.watermarkText
    });
    if (!hasClosing) arr.push({ ...CLOSING_TEMPLATE, description: showMeta.closingText });

    // normalize sortOrder and lock endpoints
    arr = arr.map((s, i) => {
      if (s.id === "i-k4studios" || s.visibility === "ghost") return {
        ...s,
        title: showMeta.prologueTitle || s.title || "Prologue:",
        story: showMeta.openingParagraph || s.story || "",
        showMark: showMeta.showWatermark,
        watermarkText: showMeta.watermarkText,
        sortOrder: -1
      };
      if (s.visibility === "closing" || s.id === "i-k4studios-closing") return { ...s, sortOrder: 9999 };
      return { ...s, sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : i };
    });

    return arr;
  }

  function exportMJS() {
    const core = ensureGhostAndClosing(slides.length ? slides : [GHOST_TEMPLATE, ...picked, { ...CLOSING_TEMPLATE, description: showMeta.closingText }]);
    // Remove any UI-only fields if we ever add them later.
    const header = `// Auto-generated Picture Show dataset\n// /src/data/Other/Stories/${(showMeta.showTitle || "Untitled").replace(/\s+/g, "-")}.mjs`;
    const text = `${header}\nexport const storyData = ${JSON.stringify(core, null, 2)};\n`;
    const fileName = `${(showMeta.showTitle || "Untitled").replace(/\s+/g, "-")}.mjs`;
  saveShowToServer(core, showMeta);
  }

  /* ---------- UI bits ---------- */
  // Audio popup state
  const [audioPopup, setAudioPopup] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  const headerBar = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#d4e4fa", padding: "10px 20px", borderRadius: 8,
      marginBottom: 18, boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>K4 Picture Show Story Builder</h1>
        {/* Show Title + audio icon */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.1rem", fontWeight: 600, color: "#2a1f17", background: "#eaf6ff", borderRadius: 6, padding: "4px 12px", cursor: showMeta.globalAudioSrc ? "pointer" : "default" }}
          onClick={() => setAudioPopup(true)}
        >
          {showMeta.showTitle}
          {showMeta.globalAudioSrc && (
            <span title={showMeta.globalAudioMode === "score" ? "Background Score" : "Ambient Background"}>
              <Volume2 size={22} color={showMeta.globalAudioMode === "score" ? (audioMuted ? "#bbb" : "#19c37d") : (audioMuted ? "#bbb" : "#4a90e2")} style={{ verticalAlign: "middle" }} />
            </span>
          )}
        </div>
        {/* Audio popup */}
        {audioPopup && (
          <div style={{ position: "absolute", top: 54, left: 40, zIndex: 2000, background: "#fff", border: "1px solid #bcd", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.18)", padding: "18px 22px", minWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Background Audio Options</div>
            {showMeta.globalAudioSrc && (
              <div style={{ marginBottom: 10, fontSize: "0.98rem", color: "#444" }}>
                <span style={{ fontWeight: 500 }}>Audio File:</span> {showMeta.globalAudioSrc}
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <button
                style={{ width: 90, height: 32, padding: "4px 8px", fontSize: "0.95rem", borderRadius: 5, border: "1px solid #aaa", background: "#f6f6f6", fontWeight: 500, marginRight: 6, opacity: showMeta.globalAudioSrc ? 1 : 0.5, pointerEvents: showMeta.globalAudioSrc ? "auto" : "none" }}
                disabled={!showMeta.globalAudioSrc}
                onClick={showMeta.globalAudioSrc ? () => { setShowMeta(m => ({ ...m, globalAudioMode: "score" })); setAudioPopup(false); } : undefined}
              >Score</button>
              <button
                style={{ width: 90, height: 32, padding: "4px 8px", fontSize: "0.95rem", borderRadius: 5, border: "1px solid #aaa", background: "#f6f6f6", fontWeight: 500, opacity: showMeta.globalAudioSrc ? 1 : 0.5, pointerEvents: showMeta.globalAudioSrc ? "auto" : "none" }}
                disabled={!showMeta.globalAudioSrc}
                onClick={showMeta.globalAudioSrc ? () => { setShowMeta(m => ({ ...m, globalAudioMode: "ambient" })); setAudioPopup(false); } : undefined}
              >Ambient</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <button
                style={{ width: 90, height: 32, padding: "4px 8px", fontSize: "0.95rem", borderRadius: 5, border: "1px solid #aaa", background: "#f6f6f6", fontWeight: 500, marginRight: 6, opacity: showMeta.globalAudioSrc ? 1 : 0.5, pointerEvents: showMeta.globalAudioSrc ? "auto" : "none" }}
                disabled={!showMeta.globalAudioSrc}
                onClick={showMeta.globalAudioSrc ? () => { setAudioMuted(m => !m); setAudioPopup(false); } : undefined}
              >{audioMuted ? "Unmute" : "Mute"}</button>
              <button
                style={{ width: 90, height: 32, padding: "4px 8px", fontSize: "0.95rem", borderRadius: 5, border: "1px solid #c00", background: "#fbeaea", fontWeight: 500, color: "#c00", opacity: showMeta.globalAudioSrc ? 1 : 0.5, pointerEvents: showMeta.globalAudioSrc ? "auto" : "none" }}
                disabled={!showMeta.globalAudioSrc}
                onClick={showMeta.globalAudioSrc ? () => { setShowMeta(m => ({ ...m, globalAudioSrc: "", globalAudioFile: null })); setAudioPopup(false); } : undefined}
              >Remove</button>
            </div>
            <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <button
                style={{ width: 110, height: 32, padding: "4px 8px", fontSize: "0.95rem", borderRadius: 5, border: "1px solid #aaa", background: "#f6f6f6", fontWeight: 500 }}
                onClick={() => {
                  document.getElementById('replace-audio-input').click();
                }}
              >{showMeta.globalAudioSrc ? "Replace" : "Add Audio"}</button>
              <input
                key={`replace-audio-${fileInputKey}`}
                id="replace-audio-input"
                type="file"
                accept="audio/*"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file || !file.name) {
                    setShowMeta(m => ({ ...m, globalAudioSrc: "", globalAudioFile: null }));
                  } else {
                    setShowMeta(m => ({ ...m, globalAudioSrc: String(file.name), globalAudioFile: file }));
                  }
                  setAudioPopup(false);
                  setFileInputKey(k => k + 1);
                }}
              />
            </div>
            <div style={{ textAlign: "right" }}>
              <button style={{ width: 90, height: 32, padding: "4px 8px", fontSize: "0.95rem", borderRadius: 5, border: "1px solid #aaa", background: "#f6f6f6" }} onClick={() => setAudioPopup(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            const confirmed = window.confirm(
              "⚠️ This will clear all progress and restart the Picture Show Builder.\n\nAre you sure you want to continue?"
            );
            if (!confirmed) return;

            // Clear stored session data
            localStorage.removeItem(TEMP_KEY);
            localStorage.removeItem(META_KEY);
            localStorage.removeItem("r2AudioCache");

            // Reset state visually
            setPicked([]);
            setSlides([]);
            setStep(1);

            // Optional: user feedback before reload
            document.body.style.opacity = "0.5";
            document.body.style.transition = "opacity 0.3s ease";
            document.body.innerHTML = `
              <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                height:100vh;
                font-family:'Glegoo',serif;
                font-size:1.2rem;
                color:#654321;
                background:#f7f5f1;
              ">
                Clearing session data...
              </div>
            `;

            setTimeout(() => {
              window.location.reload();
            }, 600);
          }}
          style={{
            border: "1px solid #6b7787",
            background: "#f6f6f6",
            borderRadius: 6,
            padding: "6px 12px",
          }}
        >
          Reset Session
        </button>
        <button onClick={exportMJS}
          style={{ border: "1px solid #6b5b4b", background: "#e3d9cf", borderRadius: 6, padding: "6px 12px", fontWeight: 700 }}>Save .mjs</button>
      </div>
    </div>
  );

  const StepControls = ({ next = true, back = true, onNext }) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
      <div>{back && <button onClick={() => setStep((s) => Math.max(1, s - 1))} style={{ border: "1px solid #aaa", padding: "6px 12px", borderRadius: 6 }}>Back</button>}</div>
      <div>{next && <button onClick={() => { onNext ? onNext() : null; setStep((s) => Math.min(8, s + 1)); }} style={{ border: "1px solid #6b5b4b", padding: "6px 12px", borderRadius: 6, background: "#d4c4b5", fontWeight: 700 }}>Continue</button>}</div>
    </div>
  );

  // --- Audio preview system ---
  const [isPlaying, setIsPlaying] = useState(null);
  const audioRef = useRef(null);

  function handleAudioPreview(src, id) {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const a = new window.Audio(src);
      audioRef.current = a;
      a.play().then(() => setIsPlaying(id)).catch(console.warn);
      a.onended = () => setIsPlaying(null);
    } catch (err) {
      console.error("Audio playback failed:", err);
      setIsPlaying(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#f7f5f1", padding: 20, fontFamily: "'Glegoo', serif", color: "#2a1f17" }}>
      {headerBar}

      {/* Step 1 — Welcome / Show Info */}
      {step === 1 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">1) Welcome / Show Info</h2>
          {/* --- Load existing show or create new --- */}
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              background: "#f3f1eb",
              border: "1px solid #d0c2b4",
              borderRadius: 8,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontWeight: 700 }}>Edit a Saved Show</div>
              <button
                onClick={() => {
                  const confirmed = !showLoaded || window.confirm(
                    "⚠️ Start a new show?\n\nThis will clear all current progress. Continue?"
                  );
                  if (!confirmed) return;
                  
                  localStorage.removeItem(TEMP_KEY);
                  localStorage.removeItem(META_KEY);
                  localStorage.removeItem("r2AudioCache");
                  setPicked([]);
                  setSlides([]);
                  setShowLoaded(false);
                  setLoadedShowSlug(null);
                  setShowMeta(createDefaultShowMeta());
                  showTitleClearedRef.current = false;
                }}
                style={{
                  border: "1px solid #19c37d",
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: "#e6f9f0",
                  fontWeight: 700,
                  color: "#0a7c4a",
                  cursor: "pointer",
                }}
              >
                + New Show
              </button>
            </div>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
              Select a saved show from the list below to edit, or click "New Show" to start fresh.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #6b5b4b",
                  background: "#fff",
                  fontFamily: "'Glegoo', serif",
                  fontSize: "0.95rem",
                }}
                value={loadedShowSlug || ""}
                onChange={async (e) => {
                  const selectedSlug = e.target.value;
                  if (!selectedSlug) return;
                  
                  try {
                    // Dynamically import the selected show
                    const showModule = await import(`@/data/Other/Stories/${selectedSlug}.mjs`);
                    const { storyMeta, storyData } = showModule;
                    
                    if (!storyMeta || !storyData) throw new Error("Invalid show file format.");

                    // Find ghost slide
                    const ghostSlide = storyData.find((s) => s.id === "i-k4studios" || s.visibility === "ghost");
                    const prologueTitle = ghostSlide?.title || "Prologue:";
                    const openingParagraph = ghostSlide?.story || "";
                    const showWatermark = ghostSlide?.showMark;
                    const rawWatermarkText = ghostSlide?.watermarkText || storyMeta?.watermarkText || "© Wayne Heim";
                    const watermarkText = rawWatermarkText.startsWith('©') ? rawWatermarkText : '©' + rawWatermarkText;

                    const mainSlides = storyData.filter(
                      (s) => s.visibility !== "ghost" && s.visibility !== "closing"
                    );

                    setShowMeta({
                      ...createDefaultShowMeta(),
                      ...storyMeta,
                      prologueTitle,
                      openingParagraph,
                      showWatermark,
                      watermarkText
                    });
                    setPicked(mainSlides);
                    setSlides([...storyData]);
                    setLoadedShowSlug(selectedSlug);
                    setShowLoaded(true);
                  } catch (err) {
                    console.error(err);
                    alert("Failed to load saved show.\n\n" + err.message);
                  }
                }}
              >
                <option value="">— Select a show to edit —</option>
                {savedShowsList.map((show) => (
                  <option key={show.slug} value={show.slug}>
                    {show.title} ({show.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Floating continue button appears only when a show is loaded */}
            {showLoaded && (
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 12,
                  display: "flex",
                  gap: 8,
                }}
              >
                {/* Delete Show Button */}
                {loadedShowSlug && (
                  <div
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      padding: "8px 14px",
                      borderRadius: 6,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    }}
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `⚠️ DELETE SHOW: "${showMeta.showTitle || loadedShowSlug}"\n\nThis will permanently delete:\n• ${loadedShowSlug}.mjs (data file)\n• ${loadedShowSlug}.astro (page file)\n• Entry from Shows listing\n\nThis action cannot be undone. Continue?`
                      );
                      if (!confirmed) return;

                      try {
                        const res = await fetch("/.netlify/functions/deleteShowData", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ slug: loadedShowSlug }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Delete failed");

                        alert(`✅ Show deleted: ${loadedShowSlug}\n\nDeleted files: ${data.deleted?.join(", ") || "none"}`);

                        // Reset the builder
                        localStorage.removeItem(TEMP_KEY);
                        localStorage.removeItem(META_KEY);
                        localStorage.removeItem("r2AudioCache");
                        setPicked([]);
                        setSlides([]);
                        setShowLoaded(false);
                        setLoadedShowSlug(null);
                        setStep(1);
                        window.location.reload();
                      } catch (err) {
                        console.error("Delete failed:", err);
                        alert(`❌ Failed to delete show:\n${err.message}`);
                      }
                    }}
                  >
                    🗑️ Delete Show
                  </div>
                )}
                <div
                  style={{
                    background: "#19c37d",
                    color: "#fff",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  }}
                  onClick={() => setStep(4)}
                >
                  Continue Editing Show →
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LabeledInput
              label="Show Title"
              value={showMeta.showTitle}
              onChange={(v) => setShowMeta((m) => ({ ...m, showTitle: v }))}
              onFocus={() => {
                if (!showTitleClearedRef.current && showMeta.showTitle === "Untitled Picture Show") {
                  setShowMeta((m) => ({ ...m, showTitle: "" }));
                  showTitleClearedRef.current = true;
                }
              }}
            />
            <LabeledInput label="ALT (show-level)" value={showMeta.alt} onChange={(v) => setShowMeta((m) => ({ ...m, alt: v }))} />
            <LabeledInput label="Keywords (comma-separated)" value={typeof showMeta.keywords === 'string' ? showMeta.keywords : Array.isArray(showMeta.keywords) ? showMeta.keywords.join(", ") : ""} onChange={(v) => setShowMeta((m) => ({ ...m, keywords: v }))} />
            <LabeledInput label="Description (meta)" value={showMeta.description} onChange={(v) => setShowMeta((m) => ({ ...m, description: v }))} />
            <LabeledInput label="Copyright Name" value={showMeta.copyrightName || ""} onChange={(v) => setShowMeta((m) => ({ ...m, copyrightName: v }))} placeholder="Wayne Heim" />
            <LabeledInput label="Copyright Year" value={showMeta.copyrightYear || ""} onChange={(v) => setShowMeta((m) => ({ ...m, copyrightYear: v }))} placeholder="2025" />
            <LabeledInput label="Prologue Title" value={showMeta.prologueTitle || "Prologue:"} onChange={(v) => setShowMeta((m) => ({ ...m, prologueTitle: v }))} placeholder="Prologue: ..." />
          </div>
          <LabeledTextArea label="Opening Paragraph" value={showMeta.openingParagraph || ""} onChange={(v) => setShowMeta((m) => ({ ...m, openingParagraph: v }))} placeholder="Opening paragraph for the prologue slide..." />
          {/* 🎧 Background Audio Section */}
          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: "1px solid #d2c4b5",
              borderRadius: 8,
              background: "#faf8f4",
            }}
          >
            <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Background Audio</h4>
            {/* File picker */}
            <input
              key={`step1-audio-${fileInputKey}`}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setShowMeta((m) => ({
                  ...m,
                  globalAudioSrc: file.name || file.path || "",
                  globalAudioFile: file,              // ✅ keep actual File object
                }));
                setFileInputKey(k => k + 1);
              }}
            />
            {/* Radio buttons for audio mode */}
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <input
                  type="radio"
                  name="bgAudioMode"
                  value="score"
                  checked={showMeta.globalAudioMode === "score"}
                  onChange={(e) =>
                    setShowMeta((m) => ({ ...m, globalAudioMode: e.target.value }))
                  }
                />{" "}
                Background Score – full show (medium volume, loops)
              </label>
              <label style={{ display: "block" }}>
                <input
                  type="radio"
                  name="bgAudioMode"
                  value="ambient"
                  checked={showMeta.globalAudioMode === "ambient"}
                  onChange={(e) =>
                    setShowMeta((m) => ({ ...m, globalAudioMode: e.target.value }))
                  }
                />{" "}
                Ambient Background – muted full show (low volume, loops)
              </label>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Plays softly across the entire show. Narration will layer over and
              temporarily lower background volume.
            </div>
            {/* Current file display */}
            {showMeta.globalAudioSrc && (
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  marginTop: 4,
                  fontFamily: "monospace",
                }}
              >
                Audio File: {showMeta.globalAudioSrc}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: "1px solid #d2c4b5",
              borderRadius: 8,
              background: "#faf8f4",
            }}
          >
            <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Presentation Mode</h4>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={showMeta.presentationMode === true}
                onChange={(e) =>
                  setShowMeta((m) => ({ ...m, presentationMode: e.target.checked }))
                }
              />{" "}
              Use streamlined booth walkthrough mode for this show
            </label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Hides the extra story controls and shows a scrollable preview strip at the bottom of each page.
            </div>
          </div>

          {/* 🖼️ Watermark Section */}
          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: "1px solid #d2c4b5",
              borderRadius: 8,
              background: "#faf8f4",
            }}
          >
            <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Watermark Settings</h4>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={showMeta.showWatermark === true || showMeta.showWatermark === "yes"}
                  onChange={(e) =>
                    setShowMeta((m) => ({ ...m, showWatermark: e.target.checked }))
                  }
                />{" "}
                Show watermark on all images
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Watermark Text</label>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #c7b9a3", borderRadius: 8, background: "#faf8f4" }}>
                <span style={{ padding: "8px 12px", fontWeight: 700, color: "#666" }}>©</span>
                <input
                  type="text"
                  value={(showMeta.watermarkText || "").replace(/^©/, "")}
                  onChange={(e) => {
                    const text = e.target.value;
                    setShowMeta((m) => ({ ...m, watermarkText: "©" + text }));
                  }}
                  placeholder="Wayne Heim"
                  style={{ flex: 1, padding: "8px 12px", border: "none", background: "transparent", outline: "none" }}
                />
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Watermarks protect your images while maintaining the viewing experience.
              Leave text blank to use default "© Wayne Heim".
            </div>
          </div>

          <StepControls
            onNext={async () => {
              const filename = `${(showMeta.showTitle || "Untitled Picture Show")
                .replace(/\s+/g, "-")
                .replace(/[^a-zA-Z0-9-_]/g, "")
              }.mjs`;

              try {
                const res = await fetch("/.netlify/functions/checkShowExists", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ filename }),
                });
                const data = await res.json();

                if (data.exists) {
                  const ok = window.confirm(
                    `⚠️ A show named "${filename}" already exists in /src/data/Other/Show.\n\nDo you want to overwrite it?`
                  );
                  if (!ok) {
                    alert("Please choose a different title for your show.");
                    setStep(1); // Explicitly return to Step 1
                    return;
                  }
                }

                setStep(2);

              } catch (err) {
                alert("Could not verify existing files. Continuing anyway.\n\n" + err.message);
                setStep(2);
              }
            }}
          />
        </div>
      )}

      {/* Step 2 — Select Gallery */}
      {step === 2 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">2) Select a Gallery</h2>
          <div style={{ marginBottom: 12 }}>
            <select
              value={selectedGalleryPath}
              onChange={(e) => {
                setSelectedGalleryPath(e.target.value);
                if (e.target.value) setStep(3);
              }}
              style={{ minWidth: 420, padding: 8, borderRadius: 8, border: "1px solid #c7b9a3" }}
            >
              <option value="">— Choose a gallery —</option>
              {options.map((opt) => (
                <option key={opt.path} value={opt.path}>{opt.label}</option>
              ))}
            </select>
          </div>
          <p className="opacity-70">Proceed to Step 3 to pick images. You can return here to choose from other galleries later.</p>
          <StepControls />
        </div>
      )}

      {/* Step 3 — Pick Images (Ctrl/Cmd click) */}
      {step === 3 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">3) Pick Images</h2>
          {/* Gallery dropdown stays visible for easy switching */}
          <div style={{ marginBottom: 12 }}>
            <select
              value={selectedGalleryPath}
              onChange={(e) => setSelectedGalleryPath(e.target.value)}
              style={{ minWidth: 420, padding: 8, borderRadius: 8, border: "1px solid #c7b9a3" }}
            >
              <option value="">— Choose a gallery —</option>
              {options.map((opt) => (
                <option key={opt.path} value={opt.path}>{opt.label}</option>
              ))}
            </select>
          </div>
          {!selectedGalleryPath && <p className="text-sm" style={{ color: "#7a4e2f" }}>Select a gallery in Step 2 first.</p>}
          {/* Option A: Duplicate Continue buttons at top + Deselect All */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(2)} style={{ border: "1px solid #aaa", padding: "6px 12px", borderRadius: 6 }}>
                Pick From Another Gallery
              </button>
              <button onClick={() => setPicked([])} style={{ border: "1px solid #aaa", padding: "6px 12px", borderRadius: 6, background: "#f6f6f6" }}>
                Deselect All
              </button>
            </div>
            <button onClick={() => { setStep(4); buildSlidesForEdit(); }} style={{ border: "1px solid #6b5b4b", padding: "6px 12px", borderRadius: 6, background: "#d4c4b5", fontWeight: 700 }}>
              Done Picking → Reorder
            </button>
          </div>
          {/* Click-catcher for deselecting all images */}
          <div
            style={{ position: "relative" }}
            onClick={(e) => {
              // Deselect all if clicking outside the grid (not on a child)
              if (e.target === e.currentTarget) setPicked([]);
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
              }}
            >
              {galleryItems.map((item) => {
                const isSel = !!picked.find((p) => p.id === item.id);
                return (
                  <div key={item.id}
                    onClick={() => togglePick(item)}
                    style={{ border: isSel ? "2px solid #0a66c2" : "1px solid #ddd", borderRadius: 8, background: "#fff", overflow: "hidden", cursor: "pointer" }}>
                    <img src={pickImage(item)} alt={item.alt || item.title || ""} style={{ width: "100%", height: 150, objectFit: "cover" }} />
                    <div style={{ padding: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title || item.id}</div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>{item.id}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Option B: Sticky Continue buttons at bottom */}
            <div style={{
              position: "sticky", bottom: 10, display: "flex", justifyContent: "space-between",
              background: "rgba(255,255,255,0.9)", padding: "8px 12px", borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,.15)"
            }}>
              <button onClick={() => setStep(2)} style={{ border: "1px solid #aaa", padding: "6px 12px", borderRadius: 6 }}>
                Pick From Another Gallery
              </button>
              <button onClick={() => { setStep(4); buildSlidesForEdit(); }} style={{ border: "1px solid #6b5b4b", padding: "6px 12px", borderRadius: 6, background: "#d4c4b5", fontWeight: 700 }}>
                Done Picking → Reorder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Reorder Grid (with Ghost + Closing visible) */}
      {step === 4 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">4) Reorder - Edit Slides</h2>
          <p className="text-sm opacity-70">Intro (ghost) is locked first, Closing is locked last. Drag others to reorder. <b>Click a slide to highlight, then right-click to edit or delete.</b></p>
          <button
            onClick={() => setStep(1)}
            style={{
              border: "1px solid #0a66c2",
              background: "#e3f0ff",
              borderRadius: 6,
              padding: "6px 12px",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            ← Back to Show Details
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {slides.map((s, idx) => {
              const locked = idx === 0 || idx === slides.length - 1;
              const border = selectedSlideIdx === idx ? "#0a66c2" : (s.visibility === "ghost" ? "#68836fff" : s.visibility === "closing" ? "#74a0bdff" : "#ddd");
              const bg = selectedSlideIdx === idx ? "#e3f0ff" : (s.visibility === "ghost" ? "#93aa99ff" : s.visibility === "closing" ? "#add3ecff" : "#fff");
              return (
                <div key={s.id}
                  draggable={!locked}
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(idx)}
                  onClick={() => setSelectedSlideIdx(idx)}
                  onContextMenu={(e) => handleContext(e, idx)}
                  style={{ border: `2.5px solid ${border}`, borderRadius: 8, background: bg, overflow: "hidden", cursor: locked ? "default" : "grab", position: "relative", boxShadow: selectedSlideIdx === idx ? "0 0 0 2px #0a66c2" : undefined }}>
                  {pickImage(s) && s.visibility !== "closing" ? (
                    <img src={pickImage(s)} alt={s.alt || s.title || ""} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                  ) : s.visibility === "closing" ? (
                    <div style={{ width: "100%", height: 140, background: "#c7e1f1ff" }} />
                  ) : null}
                  {/* Consistent audio preview icon */}
                  {s.audioSrc && <AudioPreviewIcon src={s.audioSrc} muted={!!showMeta.globalAudioSrc && showMeta.globalAudioMode === "score" && !audioMuted} ambient={!!showMeta.globalAudioSrc && showMeta.globalAudioMode === "ambient"} />}
                  <div style={{ padding: 8, position: "relative" }}>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.85,
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#f3efe9",
                        border: "1px solid #d8cfc3",
                        marginBottom: 6,
                      }}
                      title={idx === 0 ? "Go to Intro" : (idx === slides.length - 1 ? "End" : `Slide ${idx}`)}
                    >
                      {idx === 0 ? "Go to Intro" : (idx === slides.length - 1 ? "End" : `Slide ${idx}`)}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      {s.title || s.id}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.story || s.description || ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <StepControls onNext={() => setStep(5)} />
        </div>
      )}

      {/* Step 5 — Edit/Delete (modal via right-click) */}
      {contextMenu.visible && (
        <div style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, background: "#fff", border: "1px solid #ccc", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,.15)", zIndex: 1000 }}>
          <div style={{ padding: "10px 16px", cursor: "pointer" }} onClick={() => openEdit(contextMenu.index)}>Edit</div>
          {/* Only allow delete if not ghost/closing */}
          {contextMenu.index > 0 && contextMenu.index < slides.length - 1 && (
            <div style={{ padding: "10px 16px", cursor: "pointer", color: "#c00" }}
              onClick={() => {
                setSlides((arr) => arr.filter((_, i) => i !== contextMenu.index));
                setContextMenu({ visible: false, x: 0, y: 0, index: -1 });
                setSelectedSlideIdx(-1);
              }}>
              Remove
            </div>
          )}
        </div>
      )}

      {editOpen && editData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, width: 780, maxWidth: "92vw", border: "1px solid #ccbba8" }}>
            <h3 className="text-lg font-semibold mb-2">Edit Slide</h3>
            <img src={pickImage(editData)} alt={editData.alt || editData.title || ""} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 6, marginBottom: 12 }} />

            {/* Core fields */}
              <LabeledInput label="Title" value={editData.title || ""} onChange={(v) => setEditData((d) => ({ ...d, title: v }))} />
              <LabeledTextArea label="Story" value={editData.story || ""} onChange={(v) => setEditData((d) => ({ ...d, story: v }))} />
              <LabeledInput label="Description" value={editData.description || ""} onChange={(v) => setEditData((d) => ({ ...d, description: v }))} />
              <LabeledInput label="ALT" value={editData.alt || ""} onChange={(v) => setEditData((d) => ({ ...d, alt: v }))} />
              {/* Ghost slide image sources */}
              {(editData.id === "i-k4studios" || editData.visibility === "ghost") && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontWeight: 700, display: "block", marginBottom: 4, color: "#666" }}>Image Source (src)</label>
                    <input
                      type="text"
                      value={editData.src || ""}
                      disabled
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #c7b9a3", borderRadius: 8, background: "#f5f5f5", color: "#999", cursor: "not-allowed" }}
                    />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontWeight: 700, display: "block", marginBottom: 4, color: "#666" }}>Image Source 2 (src2)</label>
                    <input
                      type="text"
                      value={editData.src2 || ""}
                      disabled
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #c7b9a3", borderRadius: 8, background: "#f5f5f5", color: "#999", cursor: "not-allowed" }}
                    />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontWeight: 700, display: "block", marginBottom: 4, color: "#666" }}>Image Source 3 (src3)</label>
                    <input
                      type="text"
                      value={editData.src3 || ""}
                      disabled
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #c7b9a3", borderRadius: 8, background: "#f5f5f5", color: "#999", cursor: "not-allowed" }}
                    />
                  </div>
                </>
              )}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontWeight: 700, display: "block", marginBottom: 4, color: (editData.id === "i-k4studios" || editData.visibility === "ghost") ? "#666" : "inherit" }}>Collector Notes</label>
                <textarea
                  value={editData.notes || ""}
                  onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
                  disabled={editData.id === "i-k4studios" || editData.visibility === "ghost"}
                  placeholder={(editData.id === "i-k4studios" || editData.visibility === "ghost") ? "Not applicable for opening slides" : ""}
                  style={{
                    width: "100%",
                    minHeight: 110,
                    padding: "8px 10px",
                    border: "1px solid #c7b9a3",
                    borderRadius: 8,
                    background: (editData.id === "i-k4studios" || editData.visibility === "ghost") ? "#f5f5f5" : "#faf8f4",
                    color: (editData.id === "i-k4studios" || editData.visibility === "ghost") ? "#999" : "inherit",
                    cursor: (editData.id === "i-k4studios" || editData.visibility === "ghost") ? "not-allowed" : "auto",
                    resize: "vertical"
                  }}
                />
              </div>
              {/* Keywords field: for Ghost slide, always show main showMeta.keywords and update showMeta on change */}
              {editData.id === "i-k4studios" || editData.visibility === "ghost" ? (
                <LabeledInput
                  label="Keywords (comma-separated)"
                  value={Array.isArray(showMeta.keywords) ? showMeta.keywords.join(", ") : (showMeta.keywords || "")}
                  onChange={(v) => {
                    // Update both editData and showMeta
                    setEditData((d) => ({ ...d, keywords: v }));
                    setShowMeta((m) => ({ ...m, keywords: v.split(",").map(s => s.trim()).filter(Boolean) }));
                  }}
                />
              ) : (
                <LabeledInput
                  label="Keywords (comma-separated)"
                  value={Array.isArray(editData.keywords) ? editData.keywords.join(", ") : (editData.keywords || "")}
                  onChange={(v) => setEditData((d) => ({ ...d, keywords: v }))}
                />
              )}

            {/* Audio browse (stores local path/name only) - disabled for closing slide */}
            {editData.id !== "i-k4studios-closing" && editData.visibility !== "closing" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Audio (optional)</label>
                <input
                  key={`slide-audio-${fileInputKey}`}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    onAudioPick(e.target.files?.[0]);
                    setFileInputKey(k => k + 1);
                  }}
                  disabled={Boolean(showMeta.globalAudioSrc && showMeta.globalAudioSrc.trim() !== "" && showMeta.globalAudioMode === "score" && !audioMuted)}
                  style={showMeta.globalAudioSrc && showMeta.globalAudioSrc.trim() !== "" && showMeta.globalAudioMode === "score" && !audioMuted ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                />
                {editData.audioSrc && (
                  <div style={{ fontSize: 13, color: "#444", marginTop: 4 }}>
                    <span style={{ fontWeight: 500 }}>File:</span> {editData.audioSrc}
                  </div>
                )}
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  {showMeta.globalAudioSrc && showMeta.globalAudioSrc.trim() !== "" && showMeta.globalAudioMode === "score" && !audioMuted
                    ? <span style={{ color: "#888" }}>Background audio is set to Score mode and not muted. Per-image audio is disabled.</span>
                    : <>Stored as path/filename only for now: <code>{editData.audioSrc || "(none)"}</code></>}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => setEditOpen(false)} style={{ border: "1px solid #aaa", padding: "6px 12px", borderRadius: 6 }}>Cancel</button>
              <button onClick={applyEdit} style={{ border: "1px solid #6b5b4b", padding: "6px 12px", borderRadius: 6, background: "#e3d9cf", fontWeight: 700 }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Step 6 — Review Closing Copy (already editable in Step 1 + right-click on closing) */}
      {step === 6 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">6) Review Closing Copy</h2>
          <p className="opacity-70">You can edit the closing text here, or right-click the Closing slide in Step 4 to edit that slide directly.</p>
          <LabeledTextArea label="Closing Text" value={showMeta.closingText} onChange={(v) => setShowMeta((m) => ({ ...m, closingText: v }))} />
          <StepControls back={false} />
        </div>
      )}

      {/* Step 7 — Final Walk-through (simple review) */}
      {step === 7 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">7) Review Show (Sequential)</h2>
          {!slides.length && <p className="text-sm">No slides to review yet. Go back to Step 4 and build slides.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {slides.filter((s, idx) => s.visibility !== "closing" && s.id !== "i-k4studios-closing").map((s, i) => {
              // Remove .mjs from any image src path if present
              const imgSrc = pickImage(s);
              return (
                <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={s.alt || s.title || ""} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                  ) : null}
                  <div style={{ padding: 10 }}>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.85,
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#f3efe9",
                        border: "1px solid #d8cfc3",
                        marginBottom: 6,
                      }}
                      title={i === 0 ? "Go to Intro" : `Slide ${i}`}
                    >
                      {i === 0 ? "Go to Intro" : `Slide ${i}`}
                    </div>
                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      {s.title || s.id}
                      {s.audioSrc && <AudioPreviewIcon src={s.audioSrc} />}
                    </div>
                    {(s.story || s.description) && (
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 6, opacity: 0.85 }}>
                        {s.story || s.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button
              onClick={() => setStep(4)}
              style={{ border: "1px solid #0a66c2", padding: "6px 12px", borderRadius: 6, background: "#e3f0ff", fontWeight: 700 }}
            >
              Edit
            </button>
            <StepControls back={false} />
          </div>
        </div>
      )}

      {/* Step 8 — Save (Save button always available in header; keep a reminder here) */}
      {step === 8 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">8) Save Show Data</h2>
          <p className="text-sm">Click <b>Save .mjs</b> in the header to download your dataset. Place it under <code>/src/data/Other/Stories/</code>.</p>
          <button
            onClick={() => {
              const core = ensureGhostAndClosing(slides.length ? slides : [GHOST_TEMPLATE, ...picked, { ...CLOSING_TEMPLATE, description: showMeta.closingText }]);
              saveShowToServer(core, showMeta);
            }}
            style={{ border: "2px solid #19c37d", padding: "10px 18px", borderRadius: 8, background: "#e3d9cf", fontWeight: 700, color: '#19c37d' }}>
            Package Show
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- small UI atoms ---------- */
function LabeledInput({ label, value, onChange, placeholder }) {
  const inputRef = React.useRef();
  React.useEffect(() => {
    if (inputRef.current && value === "Untitled Picture Show") {
      inputRef.current.value = value;
    }
  }, [value]);
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>{label}</label>
      <input
        ref={inputRef}
        defaultValue={value === "Untitled Picture Show" ? value : undefined}
        value={value !== "Untitled Picture Show" ? value : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={typeof onFocus === "function" ? onFocus : () => {
          if (inputRef.current && inputRef.current.value === "Untitled Picture Show") {
            inputRef.current.value = "";
            onChange("");
          }
        }}
        placeholder={placeholder}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #c7b9a3", borderRadius: 8, background: "#faf8f4" }}
      />
    </div>
  );
}

function LabeledTextArea({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>{label}</label>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", minHeight: 110, padding: "8px 10px", border: "1px solid #c7b9a3", borderRadius: 8, background: "#faf8f4", resize: "vertical" }} />
    </div>
  );
}
