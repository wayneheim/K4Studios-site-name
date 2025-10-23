import React, { useState, useEffect, useMemo } from "react";
import { generateSmartMetadata } from "../utils/autoTextGenerator.mjs";


// ✅ local replacements
const DATA_ROOTS = [
  "/src/data/Galleries",
  "/src/pages/Other",
  "/src/data/Other",
];

// --- Local fallback for pickImage ---
function pickImage(item) {
  if (!item) return "";
  return (
    item.thumb ||
    item.preview ||
    item.image ||
    item.src ||
    item.url ||
    ""
  );
}

// --- Shared helpers from GalleryOrderer for consistent labeling ---
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

// --- Visibility helpers (matching GalleryOrderer)
function isHidden(d) { return d && String(d.visibility).toLowerCase() === "hidden"; }

/* ---------- Star Rating (1–5) ---------- */
function StarRating({ value = 0, onChange }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  const set = (n) => onChange && onChange(n);
  const stars = [1,2,3,4,5];
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {stars.map((n) => {
        const active = n <= v;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => set(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") set(Math.min(5, v + 1));
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(Math.max(1, v - 1));
            }}
            className={`text-xl leading-none ${active ? "text-amber-500" : "text-gray-300"} focus:outline-none focus:ring-2 focus:ring-amber-400 rounded`}
            title={`${n} star${n>1?"s":""}`}
          >
            {active ? "★" : "☆"}
          </button>
        );
      })}
      <span className="ml-2 text-xs opacity-60">{v ? `${v}/5` : "Unrated"}</span>
    </div>
  );
}

export default function GalleryDataSwapper({ datasetPath = "" }) {
  // --- Read ?dataset=... from URL if not provided (safe for SSR)
  const [urlDataset, setUrlDataset] = useState("");
  useEffect(() => {
    try {
      const search =
        window.location.search ||
        (window.location.hash.includes("?")
          ? window.location.hash.split("?")[1]
          : "");
      const params = new URLSearchParams(search);
      const raw = params.get("dataset");
      if (!raw) return;
      const prefixed = raw.startsWith("/src/") ? raw : `/src/${raw}`;
      setUrlDataset(prefixed.replace(/\\/g, "/"));
    } catch {}
  }, []);

  // --- Discover datasets in roots
  const modules = useMemo(() => {
    const maps = [
      import.meta.glob("/src/data/Galleries/**/*.mjs", {
        eager: false,
        import: "galleryData",
      }),
      import.meta.glob("/src/pages/Other/**/*.mjs", {
        eager: false,
        import: "galleryData",
      }),
      import.meta.glob("/src/data/Other/**/*.mjs", {
        eager: false,
        import: "galleryData",
      }),
    ];
    return Object.assign({}, ...maps);
  }, []);

  // --- Build sorted dropdown options
  const options = useMemo(() => {
    const rootIdx = (p) => {
      const n = p.replace(/\\/g, "/");
      return DATA_ROOTS.findIndex((r) =>
        n.startsWith(r.replace(/\\/g, "/") + "/")
      );
    };
    return Object.keys(modules)
      .sort((a, b) => {
        const ra = rootIdx(a),
          rb = rootIdx(b);
        if (ra !== rb) return ra - rb;
        return stripRoot(a).localeCompare(stripRoot(b));
      })
      .map((path) => ({ path, label: prettyLabelFromPath(path) }));
  }, [modules]);

  // --- Core state
  const [selectedPath, setSelectedPath] = useState("");
  const [items, setItems] = useState([]);

  // --- Choose dataset: prefer prop → URL → sessionStorage → first option
  useEffect(() => {
    if (!options.length) return;

    const fromProp = datasetPath
      ? datasetPath.startsWith("/")
        ? datasetPath
        : `/${datasetPath}`
      : "";
    const fromUrl = urlDataset || "";
    const fromSession = sessionStorage.getItem("lastDatasetPath") || "";

    const candidate = [fromProp, fromUrl, fromSession, options[0]?.path]
      .find((p) => p && options.some((o) => o.path === p.replace(/\\/g, "/")));

    if (candidate && candidate !== selectedPath) {
      setSelectedPath(candidate.replace(/\\/g, "/"));
    }
  }, [options, datasetPath, urlDataset]);

  // Persist selected dataset to sessionStorage for cross-app continuity
  useEffect(() => {
    if (selectedPath) {
      sessionStorage.setItem("lastDatasetPath", selectedPath);
    }
  }, [selectedPath]);

  // --- Load dataset
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedPath) return;
      const mod = await modules[selectedPath]();
      const arr = Array.isArray(mod)
        ? mod
        : Array.isArray(mod?.galleryData)
        ? mod.galleryData
        : Array.isArray(mod?.default)
        ? mod.default
        : [];

      if (cancelled) return;

      // --- Normalize and order like Orderer ---
      const realItems = arr.filter((d) => d?.id !== "i-k4studios");

      // sort by sortOrder if present; fallback to array order
      realItems.sort((a, b) => {
        const ao = typeof a.sortOrder === "number" ? a.sortOrder : Infinity;
        const bo = typeof b.sortOrder === "number" ? b.sortOrder : Infinity;
        return ao - bo;
      });

      // Move hidden items to end
      const shown = realItems.filter((d) => String(d.visibility).toLowerCase() !== "hidden");
      const hidden = realItems.filter((d) => String(d.visibility).toLowerCase() === "hidden");
      const ordered = shown.concat(hidden);

      setItems(ordered);
    }
    load();
    return () => { cancelled = true; };
  }, [selectedPath]);

  // --- Multi-select and popup states
  const [selectedIds, setSelectedIds] = useState([]);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [adjustPopupOpen, setAdjustPopupOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [adjustData, setAdjustData] = useState(null);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showTitleGen, setShowTitleGen] = useState(false);
  const [currentTitleItem, setCurrentTitleItem] = useState(null);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [showGenDataConfirm, setShowGenDataConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Handlers
  function handleImageClick(e, id) {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds((sel) =>
        sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }

  function handleImageContextMenu(e, id) {
    e.preventDefault();
    if (!selectedIds.includes(id)) setSelectedIds([id]);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  }

  function handleEditClick() {
    const item = items.find((i) => i.id === selectedIds[0]);
    setEditData(item ? { ...item } : null);
    setEditPopupOpen(true);
    setContextMenu({ visible: false, x: 0, y: 0 });
  }

  function handleAdjustClick() {
    const itemA = items.find((i) => i.id === selectedIds[0]);
    const itemB = items.find((i) => i.id === selectedIds[1]);
    setAdjustData(itemA && itemB ? { a: { ...itemA }, b: { ...itemB } } : null);
    setAdjustPopupOpen(true);
    setContextMenu({ visible: false, x: 0, y: 0 });
  }

  function handleGenerateTitleClick() {
    const item = items.find((i) => i.id === selectedIds[0]);
    if (!item) return;
    setCurrentTitleItem(item);
    setGeneratedTitle(generateTitleFromSem(item)); // ← fixed
    setShowTitleGen(true);
    setContextMenu({ visible: false, x: 0, y: 0 });
  }

  // --- Handle context menu click ---
  function handleGenerateDataClick() {
    setContextMenu({ visible: false, x: 0, y: 0 });
    setShowGenDataConfirm(true);
  }

  // --- Confirm generation ---
  async function handleConfirmGenerateData() {
    setIsGenerating(true);
    const updatedItems = [];

    for (const id of selectedIds) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;

      // 🔧 Generate full metadata
      const gen = generateSmartMetadata(item, selectedPath);
      const updated = { ...item, ...gen, autoGenerated: true };

      const ok = await saveUpdatedItemToServer(updated);
      if (ok) updatedItems.push(updated);
    }

    if (updatedItems.length > 0) {
      setItems((prev) =>
        prev.map((i) => updatedItems.find((u) => u.id === i.id) || i)
      );
      setShowGenDataConfirm(false);
      setShowSavedModal(true);
    }

    setIsGenerating(false);
  }

  // --- Generate title from semantic data ---
  function generateTitleFromSem(item) {
    if (!item) return "Untitled";
    const gen = generateSmartMetadata(item, selectedPath);
    return gen.title || "Untitled";
  }

  async function generateTitles(replaceAll = false) {
    if (!currentTitleItem) return;
    
    const baseTitle = (currentTitleItem.title || "Untitled").trim().toLowerCase();
    const itemsToUpdate = replaceAll
      ? items.filter(item =>
          (item.title || "Untitled").trim().toLowerCase() === baseTitle
        )
      : [currentTitleItem];
    
    const updatedItems = [];
    
    for (const item of itemsToUpdate) {
      const newTitle = generateTitleFromSem(item);
      if (newTitle && newTitle !== item.title) {
        const updated = { ...item, title: newTitle, autoTitle: true };
        const ok = await saveUpdatedItemToServer(updated);
        if (ok) {
          updatedItems.push(updated);
        }
      }
    }
    
    if (updatedItems.length > 0) {
      setItems(prev => prev.map(item => 
        updatedItems.find(u => u.id === item.id) || item
      ));
      setShowTitleGen(false);
      setShowSavedModal(true);
    }
  }

  // --- Close context menu on outside click
  useEffect(() => {
    function handleClickOutside() {
      if (contextMenu.visible)
        setContextMenu({ visible: false, x: 0, y: 0 });
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  // --- Swap/Clone helpers for the 2-image editor ---

  // Normalize values so swap/clone behaves consistently
  function normalizeFieldValue(field, val) {
    if (field === "keywords") {
      if (Array.isArray(val)) return [...val];
      if (typeof val === "string")
        return val.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    }
    return val ?? "";
  }

  // Swap a single field between A and B
  function swapField(field) {
    setAdjustData((d) => {
      const va = normalizeFieldValue(field, d.a[field]);
      const vb = normalizeFieldValue(field, d.b[field]);
      return {
        ...d,
        a: { ...d.a, [field]: vb },
        b: { ...d.b, [field]: va },
      };
    });
  }

  // Clone the current side's field to the other side
  function cloneField(fromSide, field) {
    setAdjustData((d) => {
      const v = normalizeFieldValue(field, d[fromSide][field]);
      const other = fromSide === "a" ? "b" : "a";
      return {
        ...d,
        [other]: { ...d[other], [field]: v },
      };
    });
  }

  // Small, consistent button style for the toolbar
  const miniBtnStyle = {
    border: "1px solid #bbb",
    background: "#f0ede9",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: "0.85em",
    cursor: "pointer",
  };

  async function saveUpdatedItemToServer(item) {
    if (!selectedPath || !item?.id) return false;
    const payload = {
      datasetPath: selectedPath.replace(/^\//, ""),
      id: item.id,
      patch: {
        title: item.title ?? "",
        alt: item.alt ?? "",
        description: item.description ?? "",
        story: item.story ?? "",
        notes: item.notes ?? "",
        keywords: Array.isArray(item.keywords)
          ? item.keywords
          : String(item.keywords || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        autoGenerated: item.autoGenerated || false,
        autoTitle: item.autoTitle || false,
        visibility: item.visibility ?? "",
      },
    };

    try {
      const res = await fetch("/.netlify/functions/updateGalleryItem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return true;
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed:\n\n" + (err?.message || err));
      return false;
    }
  }

  // toggle visibility for a given item id
  async function toggleVisibility(id, wantHidden) {
    const item = items.find(it => it.id === id);
    if (!item) return;

    const updated = wantHidden 
      ? { ...item, visibility: "hidden" }
      : (() => {
          const { visibility, ...rest } = item;
          return rest; // remove visibility to "show"
        })();

    const ok = await saveUpdatedItemToServer(updated);
    if (ok) {
      setItems(arr => arr.map(it => it.id === id ? updated : it));
    }
  }

  // --- Render
  return (
    <div
      className="p-6 max-w-7xl mx-auto text-sm"
      style={{
        fontFamily: "'Glegoo', serif",
        background: "#f7f5f1", // slightly lighter ivory vs Orderer beige
        minHeight: "100vh",
        color: "#2a1f17",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#d4e4fa",
          padding: "10px 20px",
          borderRadius: 8,
          marginBottom: 18,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: "1.6em", fontWeight: "700", margin: 0 }}>
          Gallery Data Swapper
        </h1>

        <button
          onClick={() => {
            const q = selectedPath
              ? `?dataset=${encodeURIComponent(selectedPath.replace(/^\/src\//, ""))}`
              : "";
            window.open(`/admin/GalleryReorderer${q}`, "_self"); // switch to reorder view in same tab
          }}
          style={{
            background: "#d4c4b5",
            border: "1px solid #6b7787",
            borderRadius: 6,
            padding: "6px 12px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#c3b29e")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#d4c4b5")}
        >
          ⇄ Switch to Reorder View
        </button>
      </div>

      {/* Gallery selection dropdown */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="gallery-select"
          style={{
            fontWeight: 600,
            marginRight: 8,
            color: "#3a2e23",
            fontFamily: "'Glegoo', serif",
          }}
        >
          Select Gallery:
        </label>
        <select
          id="gallery-select"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          style={{
            minWidth: "22rem",
            fontFamily: "'Glegoo', serif",
            background: "#faf8f4",
            border: "1px solid #c7b9a3",
            borderRadius: 6,
            padding: "6px 10px",
            color: "#2a1f17",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            outline: "none",
            cursor: "pointer",
            transition: "border-color 0.2s ease, background 0.2s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#a79277";
            e.currentTarget.style.background = "#f0ede9";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#c7b9a3";
            e.currentTarget.style.background = "#faf8f4";
          }}
        >
          {options.map((opt) => (
            <option key={opt.path} value={opt.path}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid preview of images */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 20,
          padding: "0 40px",          // side margins like Orderer
          justifyContent: "center",   // centers grid
          maxWidth: "1600px",         // keeps width similar to Orderer layout
          margin: "0 auto",           // centers the entire grid area
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              border: selectedIds.includes(item.id)
                ? "2px solid #0078d4"
                : "1px solid #ddd",
              borderRadius: 8,
              padding: 10,
              background: selectedIds.includes(item.id)
                ? "#e8f0ec"
                : "#f9f7f4",
              cursor: "pointer",
              position: "relative",
              opacity: String(item.visibility).toLowerCase() === "hidden" ? 0.5 : 1,
              filter: String(item.visibility).toLowerCase() === "hidden" ? "grayscale(0.3)" : "none",
            }}
            onClick={(e) => handleImageClick(e, item.id)}
            onContextMenu={(e) => handleImageContextMenu(e, item.id)}
          >
            <img
              src={pickImage(item)}
              alt={item.alt || item.title || ""}
              style={{
                width: "100%",
                height: 140,
                objectFit: "cover",
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            {/* S/H tiny toggle */}
            <div className="absolute top-1 right-1 z-10 flex gap-1">
              <button
                type="button"
                className={`px-1.5 h-6 text-[11px] rounded ${isHidden(item) ? "bg-white border border-gray-300 text-gray-500" : "bg-green-600 text-white border border-green-700"}`}
                title="Show"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleVisibility(item.id, false); }}
              >
                S
              </button>
              <button
                type="button"
                className={`px-1.5 h-6 text-[11px] rounded ${isHidden(item) ? "bg-red-600 text-white border border-red-700" : "bg-white border border-gray-300 text-gray-500"}`}
                title="Hide"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleVisibility(item.id, true); }}
              >
                H
              </button>
            </div>
            {String(item.visibility).toLowerCase() === "hidden" && (
              <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-yellow-100 border border-yellow-300 text-yellow-900">
                Hidden
              </span>
            )}
            <div style={{ marginBottom: 4, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.85em", color: "#7c6e5f", marginBottom: 2 }}>
                #{item.sortOrder ?? items.indexOf(item) + 1}
              </div>
              <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{item.title}</span>
                {(item.autoTitle || item.autoGenerated) && (
                  <span
                    title={item.autoGenerated ? "Full auto-generated metadata" : "Auto-generated title"}
                    style={{
                      color: item.autoGenerated ? "#c79b3b" : "#b49b67",
                      fontSize: "1em",
                      lineHeight: 1,
                    }}
                  >
                    ★
                  </span>
                )}
              </div>
            </div>
            <div
              style={{
                fontSize: "0.95em",
                color: "#555",
                whiteSpace: "pre-line",
                maxHeight: 40,
                overflow: "hidden",
              }}
            >
              {item.story ? item.story.split("\n").slice(0, 2).join("\n") : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            minWidth: 140,
            overflow: "hidden",
          }}
        >
          {selectedIds.length >= 1 && (
            <>
              <div
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #e5e5e5",
                  background: "#fafafa",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                onMouseLeave={(e) => e.target.style.background = "#fafafa"}
                onClick={handleGenerateDataClick}
              >
                🪶 Generate Data
              </div>
              {selectedIds.length === 1 && (
                <>
                  <div
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      borderBottom: "1px solid #e5e5e5",
                      background: "#fafafa",
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                    onMouseLeave={(e) => e.target.style.background = "#fafafa"}
                    onClick={handleEditClick}
                  >
                    Edit
                  </div>
                  <div
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      background: "#fafafa",
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                    onMouseLeave={(e) => e.target.style.background = "#fafafa"}
                    onClick={handleGenerateTitleClick}
                  >
                    🪶 Generate Title
                  </div>
                </>
              )}
            </>
          )}
          {selectedIds.length === 2 && (
            <div
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                background: "#fafafa",
              }}
              onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
              onMouseLeave={(e) => e.target.style.background = "#fafafa"}
              onClick={handleAdjustClick}
            >
              Adjust Data
            </div>
          )}
        </div>
      )}

      {/* --- Edit Popup (single image) --- */}
      {editPopupOpen && selectedIds.length === 1 && editData && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.25)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 40,
        minWidth: 700, // ⬅️ wider box to match double editor feel
        maxWidth: 800,
        boxShadow: "0 6px 30px rgba(0,0,0,0.25)",
        fontFamily: "'Glegoo', serif",
        color: "#2a1f17",
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: "1.25em" }}>Edit Image Data</h3>

      {/* Image Preview */}
      <img
        src={pickImage(editData)}
        alt={editData.alt || editData.title || ""}
        style={{
          width: "100%",
          height: 200,
          objectFit: "cover",
          borderRadius: 8,
          marginBottom: 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        }}
      />

      {/* ID Field (read-only) */}
      <div style={{ marginBottom: 14 }}>
        <b>ID:</b>
        <input
          style={{
            width: "100%",
            fontFamily: "'Glegoo', serif",
            fontSize: "0.95em",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: 6,
            background: "#f5f5f5",
            color: "#666",
          }}
          value={editData.id || ""}
          readOnly
        />
      </div>

      {/* Fields */}
      {["title", "description", "alt", "keywords"].map(
        (field) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <b>{field.charAt(0).toUpperCase() + field.slice(1)}:</b>
            <input
              style={{
                width: "100%",
                fontFamily: "'Glegoo', serif",
                fontSize: "0.95em",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: 6,
                background: "#faf9f7",
              }}
              value={
                field === "keywords"
                  ? Array.isArray(editData[field])
                    ? editData[field].join(", ")
                    : editData[field] || ""
                  : editData[field] || ""
              }
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  [field]:
                    field === "keywords"
                      ? e.target.value.split(",").map((s) => s.trim())
                      : e.target.value,
                  ...(field === "title" && { autoTitle: false }),
                }))
              }
            />
          </div>
        )
      )}

      {/* Rating Field */}
      <div style={{ marginBottom: 14 }}>
        <b>Rating (1–5):</b>
        <div style={{ marginTop: 4 }}>
          <StarRating
            value={typeof editData.rating === "number" ? editData.rating : 0}
            onChange={(n) => setEditData((d) => ({ ...d, rating: n }))}
          />
        </div>
      </div>

      {["story", "notes"].map(
        (field) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <b>{field.charAt(0).toUpperCase() + field.slice(1)}:</b>
            {field === "story" || field === "notes" ? (
              <textarea
                style={{
                  width: "100%",
                  minHeight: field === "story" ? 100 : 70,
                  fontFamily: "'Glegoo', serif",
                  fontSize: "0.95em",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: 8,
                  resize: "vertical",
                  background: "#faf9f7",
                }}
                value={editData[field] || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, [field]: e.target.value }))
                }
              />
            ) : (
              <input
                style={{
                  width: "100%",
                  fontFamily: "'Glegoo', serif",
                  fontSize: "0.95em",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: 6,
                  background: "#faf9f7",
                }}
                value={
                  field === "keywords"
                    ? Array.isArray(editData[field])
                      ? editData[field].join(", ")
                      : editData[field] || ""
                    : editData[field] || ""
                }
                onChange={(e) =>
                  setEditData((d) => ({
                    ...d,
                    [field]:
                      field === "keywords"
                        ? e.target.value.split(",").map((s) => s.trim())
                        : e.target.value,
                    ...(field === "title" && { autoTitle: false }),
                  }))
                }
              />
            )}
          </div>
        )
      )}

      {/* Buttons */}
      <div
        style={{
          marginTop: 30,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={() => setEditPopupOpen(false)}
          style={{
            padding: "8px 16px",
            border: "1px solid #888",
            borderRadius: 6,
            background: "#f0ede9",
            cursor: "pointer",
          }}
        >
          Close
        </button>
        <button
          onClick={async () => {
            const updated = { ...editData };
            const ok = await saveUpdatedItemToServer(updated);
            if (ok) {
              setItems((arr) =>
                arr.map((i) => (i.id === updated.id ? updated : i))
              );
              setEditPopupOpen(false);
              setShowSavedModal(true);
            }
          }}
          style={{
            padding: "8px 16px",
            border: "1px solid #6b5b4b",
            borderRadius: 6,
            background: "#e3d9cf",
            color: "#2a1f17",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}


      {/* --- Adjust Data Popup (two images) --- */}
      {adjustPopupOpen && selectedIds.length === 2 && adjustData && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.25)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 40,
        minWidth: 1000,              // ⬅️ wider box
        maxWidth: 1200,
        boxShadow: "0 6px 30px rgba(0,0,0,0.25)",
        display: "flex",
        gap: 40,
        fontFamily: "'Glegoo', serif",
        color: "#2a1f17",
      }}
    >
      {["a", "b"].map((side) => (
        <div style={{ flex: 1 }} key={side}>
          <img
            src={pickImage(adjustData[side])}
            alt={adjustData[side].alt || adjustData[side].title || ""}
            style={{
              width: "100%",
              height: 180,
              objectFit: "cover",
              borderRadius: 6,
              marginBottom: 16,
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            }}
          />
          {["title", "description", "alt", "keywords", "story", "notes"].map((field) => (
            <div key={field} style={{ marginBottom: 12 }}>
              {/* Label + action buttons row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <b>{field.charAt(0).toUpperCase() + field.slice(1)}:</b>

                {/* right-aligned mini toolbar */}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {/* Swap exchanges A<->B for this field */}
                  <button
                    type="button"
                    title="Swap this field between A and B"
                    onClick={() => swapField(field)}
                    style={miniBtnStyle}
                  >
                    ⇄ Swap
                  </button>

                  {/* Clone copies FROM this side TO the other side */}
                  <button
                    type="button"
                    title={`Clone ${field} from ${side.toUpperCase()} to ${side === "a" ? "B" : "A"}`}
                    onClick={() => cloneField(side, field)}
                    style={miniBtnStyle}
                  >
                    ⧉ Clone
                  </button>
                </div>
              </div>

              {/* The input itself */}
              {field === "story" || field === "notes" ? (
                <textarea
                  style={{
                    width: "100%",
                    minHeight: field === "story" ? 100 : 70,
                    fontFamily: "'Glegoo', serif",
                    fontSize: "0.95em",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    padding: 8,
                    resize: "vertical",
                    background: "#faf9f7",
                  }}
                  value={adjustData[side][field] || ""}
                  onChange={(e) =>
                    setAdjustData((d) => ({
                      ...d,
                      [side]: { ...d[side], [field]: e.target.value },
                    }))
                  }
                />
              ) : (
                <input
                  style={{
                    width: "100%",
                    fontFamily: "'Glegoo', serif",
                    fontSize: "0.95em",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    padding: 6,
                    background: "#faf9f7",
                  }}
                  value={
                    field === "keywords"
                      ? Array.isArray(adjustData[side][field])
                        ? adjustData[side][field].join(", ")
                        : adjustData[side][field] || ""
                      : adjustData[side][field] || ""
                  }
                  onChange={(e) =>
                    setAdjustData((d) => ({
                      ...d,
                      [side]: {
                        ...d[side],
                        [field]:
                          field === "keywords"
                            ? e.target.value.split(",").map((s) => s.trim())
                            : e.target.value,
                      },
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={() => setAdjustPopupOpen(false)}
          style={{
            padding: "8px 16px",
            border: "1px solid #888",
            borderRadius: 6,
            background: "#f0ede9",
            cursor: "pointer",
          }}
        >
          Close
        </button>
        <button
          onClick={async () => {
            const [a, b] = [adjustData.a, adjustData.b];
            const okA = await saveUpdatedItemToServer(a);
            const okB = await saveUpdatedItemToServer(b);
            if (okA || okB) {
              setItems((arr) =>
                arr.map((i) =>
                  i.id === a.id ? a : i.id === b.id ? b : i
                )
              );
              setAdjustPopupOpen(false);
              setShowSavedModal(true);
            }
          }}
          style={{
            padding: "8px 16px",
            border: "1px solid #6b5b4b",
            borderRadius: 6,
            background: "#e3d9cf",
            color: "#2a1f17",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}


      {/* --- Title Generation Modal --- */}
      {showTitleGen && currentTitleItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.25)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Glegoo', serif",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 30,
              minWidth: 500,
              maxWidth: 600,
              boxShadow: "0 6px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ marginBottom: 20, fontSize: "1.5em", textAlign: "center" }}>
              🪶 Generate Title
            </h3>

            {/* Image Preview */}
            <img
              src={pickImage(currentTitleItem)}
              alt={currentTitleItem.alt || currentTitleItem.title || ""}
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 20,
                boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              }}
            />

            {/* Current Title */}
            <div style={{ marginBottom: 16 }}>
              <b>Current Title:</b>
              <div style={{
                padding: 10,
                background: "#f5f5f5",
                borderRadius: 6,
                marginTop: 4,
                fontStyle: currentTitleItem.autoTitle ? "italic" : "normal",
                color: currentTitleItem.autoTitle ? "#666" : "#000"
              }}>
                {currentTitleItem.title || "No title"}
                {currentTitleItem.autoTitle && " ★"}
              </div>
            </div>

            {/* Generated Title */}
            <div style={{ marginBottom: 24 }}>
              <b>Generated Title:</b>
              <div style={{
                padding: 10,
                background: "#e8f4fd",
                borderRadius: 6,
                marginTop: 4,
                fontWeight: "bold",
                color: "#2a1f17"
              }}>
                {generatedTitle || "—"} ★
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <button
                onClick={() => setShowTitleGen(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #888",
                  borderRadius: 6,
                  background: "#f0ede9",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => generateTitles(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #6b5b4b",
                  borderRadius: 6,
                  background: "#e3d9cf",
                  color: "#2a1f17",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Replace Current
              </button>
              <button
                onClick={() => generateTitles(true)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #6b5b4b",
                  borderRadius: 6,
                  background: "#d4c4b5",
                  color: "#2a1f17",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Replace All Matching
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Generate Data Confirmation Modal --- */}
      {showGenDataConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{ fontFamily: "'Glegoo', serif" }}
        >
          <div
            className="bg-white rounded-lg shadow-xl px-8 py-6 text-center max-w-sm w-full"
            style={{ border: "1px solid #b7a78f" }}
          >
            <h2 className="text-lg font-semibold mb-2">Generate Smart Metadata?</h2>
            <p className="text-gray-700 mb-5">
              All displayed text (<strong>title, description, story, alt, and
              keywords</strong>) will be replaced with randomized keyword-fed wording.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowGenDataConfirm(false)}
                className="px-5 py-2 rounded-md border border-gray-400 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                disabled={isGenerating}
                onClick={handleConfirmGenerateData}
                className="px-5 py-2 rounded-md border border-gray-700 bg-[#d4c4b5] hover:bg-[#c3b29e] transition font-semibold"
              >
                {isGenerating ? "Generating..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Saved Modal --- */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" style={{ fontFamily: "'Glegoo', serif" }}>
          <div className="bg-white rounded-lg shadow-xl px-8 py-6 text-center max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2">Changes Saved</h2>
            <p className="text-gray-700 mb-5">
              Refresh the grid to see updated data and avoid corruption.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-md border border-gray-400 bg-gray-100 hover:bg-gray-200 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
