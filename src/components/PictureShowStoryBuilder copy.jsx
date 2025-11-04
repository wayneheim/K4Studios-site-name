import React, { useEffect, useMemo, useRef, useState } from "react";

// Global audio ref for single-track playback
let globalAudioRef = null;


import { Volume2 } from "lucide-react";

function AudioPreviewIcon({ src }) {
  if (!src) return null;
  return (
    <div
      title="Audio attached"
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
        pointerEvents: "none", // 👈 makes it non-clickable
      }}
    >
      <Volume2 size={22} color="#19c37d" />
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

function stripRoot(p) {
  const n = normalizePath(p);
  for (const root of DATA_ROOTS) {
    const r = normalizePath(root) + "/";
    if (n.startsWith(r)) return n.slice(r.length);
  }
  return n.startsWith("/") ? n.slice(1) : n;
}

/* === Server save helper === */
async function saveShowToServer(showArray, showMeta) {
  if (!showArray?.length) {
    alert("No show data to save.");
    return;
  }

  const filename = `${(showMeta?.showTitle || "Untitled-Show")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
  }.mjs`;

  const metaWithTimestamp = {
    ...showMeta,
    savedAt: new Date().toISOString()
  };

  const content = `// Auto-generated Picture Show dataset\nexport const storyMeta = ${JSON.stringify(metaWithTimestamp, null, 2)};\nexport const storyData = ${JSON.stringify(showArray, null, 2)};`;

  try {
    const res = await fetch("/.netlify/functions/saveShowData", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content }),
    });
    if (!res.ok) throw new Error(await res.text());
    alert(`✅ Saved show file to /src/data/Other/Stories/${filename}`);
  } catch (err) {
    alert("Server save failed. Falling back to download.\n\n" + err.message);
    downloadText(content, filename);
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
  return (
    d.url || d.srcXL || d.srcL || d.srcM || d.srcS || d.src || d.imageUrl || d.cover || d.hero?.src || d.preview?.src ||
    d.images?.[0]?.url || d.images?.[0]?.src || ""
  );
}

const GHOST_TEMPLATE = {
  id: "i-k4studios",
  title: "Prologue: Dust and Legend",
  description: "An opening panel introducing this story sequence.",
  alt: "Intro slide for demo picture show",
  src: "/images/K4-Stories.webp",
  src2: "/images/K4-Stories-b.webp",
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

export default function PictureShowStoryBuilder() {
  /* ---------- stepper ---------- */
  const [step, setStep] = useState(1); // 1..8

  /* ---------- meta ---------- */
  const [showMeta, setShowMeta] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || "null") || {
        showTitle: "Untitled Picture Show",
        intro: "",
        description: "",
        keywords: [],
        alt: "",
        closingText: CLOSING_TEMPLATE.description,
        globalAudioSrc: "",
        globalAudioMode: "score", // default
      };
    } catch {
      return {
        showTitle: "Untitled Picture Show",
        intro: "",
        description: "",
        keywords: [],
        alt: "",
        closingText: CLOSING_TEMPLATE.description,
        globalAudioSrc: "",
        globalAudioMode: "score", // default
      };
    }
  });

  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(showMeta));
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
    const ghost = { ...GHOST_TEMPLATE };
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

  function handleContext(e, idx) {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, index: idx });
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
    if (!file) return;
    const audioPath = AUDIO_BASE_URL + (file.name || "");
    const localPath = file?.path || file?.webkitRelativePath || "";
    // Update local editData
    const updated = { ...editData, audioSrc: audioPath, audioLocal: localPath };
    setEditData(updated);
    // Update main slides list
    setSlides((arr) =>
      arr.map((s) => (s.id === updated.id ? updated : s))
    );
  }

  /* ---------- export ---------- */
  function ensureGhostAndClosing(payload) {
    let arr = [...payload];
    const hasGhost = arr.find((s) => s.id === "i-k4studios")
      || arr.find((s) => s.visibility === "ghost");
    const hasClosing = arr.find((s) => s.visibility === "closing")
      || arr.find((s) => s.id === "i-k4studios-closing");

    if (!hasGhost) arr.unshift({ ...GHOST_TEMPLATE });
    if (!hasClosing) arr.push({ ...CLOSING_TEMPLATE, description: showMeta.closingText });

    // normalize sortOrder and lock endpoints
    arr = arr.map((s, i) => {
      if (s.id === "i-k4studios" || s.visibility === "ghost") return { ...s, sortOrder: -1 };
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
  const headerBar = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#d4e4fa", padding: "10px 20px", borderRadius: 8,
      marginBottom: 18, boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
    }}>
      <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>K4 Picture Show Story Builder</h1>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LabeledInput label="Show Title" value={showMeta.showTitle} onChange={(v) => setShowMeta((m) => ({ ...m, showTitle: v }))} />
            <LabeledInput label="ALT (show-level)" value={showMeta.alt} onChange={(v) => setShowMeta((m) => ({ ...m, alt: v }))} />
            <LabeledInput label="Keywords (comma-separated)" value={Array.isArray(showMeta.keywords) ? showMeta.keywords.join(", ") : (showMeta.keywords || "")} onChange={(v) => setShowMeta((m) => ({ ...m, keywords: v.split(",").map((s) => s.trim()).filter(Boolean) }))} />
            <LabeledInput label="Description (meta)" value={showMeta.description} onChange={(v) => setShowMeta((m) => ({ ...m, description: v }))} />
          </div>
          <LabeledTextArea label="Intro (for Ghost slide story)" value={showMeta.intro} onChange={(v) => setShowMeta((m) => ({ ...m, intro: v }))} />
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
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setShowMeta((m) => ({
                  ...m,
                  globalAudioSrc: file.name || file.path || "",
                }));
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
                Selected file: {showMeta.globalAudioSrc}
              </div>
            )}
          </div>
          <StepControls />
        </div>
      )}

      {/* Step 2 — Select Gallery */}
      {step === 2 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">2) Select a Gallery</h2>
          <div style={{ marginBottom: 12 }}>
            <select value={selectedGalleryPath} onChange={(e) => setSelectedGalleryPath(e.target.value)} style={{ minWidth: 420, padding: 8, borderRadius: 8, border: "1px solid #c7b9a3" }}>
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
          <h2 className="text-xl font-semibold mb-2">4) Reorder Slides</h2>
          <p className="text-sm opacity-70">Intro (ghost) is locked first, Closing is locked last. Drag others to reorder. Right-click any slide to edit.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {slides.map((s, idx) => {
              const locked = idx === 0 || idx === slides.length - 1;
              const border = s.visibility === "ghost" ? "#6b7787" : s.visibility === "closing" ? "#a86" : "#ddd";
              const bg = s.visibility === "ghost" ? "#93aa99ff" : s.visibility === "closing" ? "#add3ecff" : "#fff";
              return (
                <div key={s.id}
                  draggable={!locked}
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(idx)}
                  onContextMenu={(e) => handleContext(e, idx)}
                  style={{ border: `2px solid ${border}`, borderRadius: 8, background: bg, overflow: "hidden", cursor: locked ? "default" : "grab", position: "relative" }}>
                  {pickImage(s) && s.visibility !== "closing" ? (
                    <img src={pickImage(s)} alt={s.alt || s.title || ""} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                  ) : s.visibility === "closing" ? (
                    <div style={{ width: "100%", height: 140, background: "#c7e1f1ff" }} />
                  ) : null}
                  {/* Consistent audio preview icon */}
                  {s.audioSrc && <AudioPreviewIcon src={s.audioSrc} />}
                  <div style={{ padding: 8, position: "relative" }}>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>#{idx}</div>
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

      {/* Step 5 — Edit (modal via right-click) */}
      {contextMenu.visible && (
        <div style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, background: "#fff", border: "1px solid #ccc", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,.15)", zIndex: 1000 }}>
          <div style={{ padding: "10px 16px", cursor: "pointer" }} onClick={() => openEdit(contextMenu.index)}>Edit</div>
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
            <LabeledInput label="Keywords (comma-separated)" value={Array.isArray(editData.keywords) ? editData.keywords.join(", ") : (editData.keywords || "")} onChange={(v) => setEditData((d) => ({ ...d, keywords: v.split(",").map((s) => s.trim()).filter(Boolean) }))} />

            {/* Audio browse (stores local path/name only) - disabled for closing slide */}
            {editData.id !== "i-k4studios-closing" && editData.visibility !== "closing" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Audio (optional)</label>
                <input type="file" accept="audio/*" onChange={(e) => onAudioPick(e.target.files?.[0])} />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Stored as path/filename only for now: <code>{editData.audioSrc || "(none)"}</code></div>
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
          <StepControls />
        </div>
      )}

      {/* Step 7 — Final Walk-through (simple review) */}
      {step === 7 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">7) Review Show (Sequential)</h2>
          {!slides.length && <p className="text-sm">No slides to review yet. Go back to Step 4 and build slides.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {slides.map((s, i) => (
              <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                {pickImage(s) ? (
                  <img src={pickImage(s)} alt={s.alt || s.title || ""} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                ) : null}
                <div style={{ padding: 10, background: s.visibility === "closing" ? "#9b2929ff" : undefined }}>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>#{i} {s.visibility ? `(${s.visibility})` : ""}</div>
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
            ))}
          </div>
          <StepControls />
        </div>
      )}

      {/* Step 8 — Save (Save button always available in header; keep a reminder here) */}
      {step === 8 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e1d9cf" }}>
          <h2 className="text-xl font-semibold mb-2">8) Save Show Data</h2>
          <p className="text-sm">Click <b>Save .mjs</b> in the header to download your dataset. Place it under <code>/src/data/Other/Stories/</code>.</p>
          <button onClick={exportMJS} style={{ border: "1px solid #6b5b4b", padding: "8px 14px", borderRadius: 6, background: "#e3d9cf", fontWeight: 700 }}>Save .mjs Now</button>
        </div>
      )}
    </div>
  );
}

/* ---------- small UI atoms ---------- */
function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #c7b9a3", borderRadius: 8, background: "#faf8f4" }} />
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
