import React, { useState, useEffect, useMemo } from "react";


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

// --- Local fallback for stripRoot ---
function stripRoot(path) {
  if (!path) return "";
  return path.replace(/^.*\/src\//, "");
}

// --- Local fallback for prettyLabelFromPath ---
function prettyLabelFromPath(path) {
  if (!path) return "Unknown";
  // Strip extension and folders, keep last meaningful segment
  const name = path.split("/").pop().replace(/\.[^/.]+$/, "");
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize words
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
      const path = raw.startsWith("/") ? raw : `/${raw}`;
      const prefixed = path.startsWith("/src/") ? path : `/src/${path}`;
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

  // --- Choose dataset: prefer prop → URL → first option
  useEffect(() => {
    if (!options.length) return;
    const fromProp = datasetPath
      ? datasetPath.startsWith("/")
        ? datasetPath
        : `/${datasetPath}`
      : "";
    const candidate = fromProp || urlDataset || options[0]?.path || "";
    setSelectedPath(
      options.some((o) => o.path === candidate)
        ? candidate
        : options[0]?.path || ""
    );
  }, [options.length, datasetPath, urlDataset]);

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
      // setItems(arr.filter(isRealItem)); // ❌ old version
      setItems(arr); // ✅ simplified, now loads all items
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  // --- Multi-select and popup states
  const [selectedIds, setSelectedIds] = useState([]);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [adjustPopupOpen, setAdjustPopupOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [adjustData, setAdjustData] = useState(null);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

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

  // --- Close context menu on outside click
  useEffect(() => {
    function handleClickOutside() {
      if (contextMenu.visible)
        setContextMenu({ visible: false, x: 0, y: 0 });
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  // --- Render
  return (
    <div style={{ padding: 24, position: "relative" }}>
      

      {/* Gallery selection dropdown */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="gallery-select">Select Gallery: </label>
        <select
          id="gallery-select"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
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
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 24,
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
              padding: 12,
              background: selectedIds.includes(item.id)
                ? "#e6f2ff"
                : "#fafafa",
              cursor: "pointer",
              position: "relative",
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
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>
              {item.title}
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
            borderRadius: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            zIndex: 1000,
            minWidth: 120,
          }}
        >
          {selectedIds.length === 1 && (
            <div
              style={{ padding: "8px 16px", cursor: "pointer" }}
              onClick={handleEditClick}
            >
              Edit
            </div>
          )}
          {selectedIds.length === 2 && (
            <div
              style={{ padding: "8px 16px", cursor: "pointer" }}
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
              borderRadius: 10,
              padding: 32,
              minWidth: 340,
              maxWidth: 420,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
            }}
          >
            <h3>Edit Image Data</h3>
            <img
              src={pickImage(editData)}
              alt={editData.alt || editData.title || ""}
              style={{
                width: "100%",
                height: 140,
                objectFit: "cover",
                borderRadius: 4,
                marginBottom: 12,
              }}
            />
            <div>
              <b>Title:</b>{" "}
              <input
                style={{ width: "100%" }}
                value={editData.title || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, title: e.target.value }))
                }
              />
            </div>
            <div>
              <b>Description:</b>{" "}
              <input
                style={{ width: "100%" }}
                value={editData.description || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, description: e.target.value }))
                }
              />
            </div>
            <div>
              <b>Alt:</b>{" "}
              <input
                style={{ width: "100%" }}
                value={editData.alt || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, alt: e.target.value }))
                }
              />
            </div>
            <div>
              <b>Keywords:</b>{" "}
              <input
                style={{ width: "100%" }}
                value={
                  Array.isArray(editData.keywords)
                    ? editData.keywords.join(", ")
                    : editData.keywords || ""
                }
                onChange={(e) =>
                  setEditData((d) => ({
                    ...d,
                    keywords: e.target.value
                      .split(",")
                      .map((s) => s.trim()),
                  }))
                }
              />
            </div>
            <div>
              <b>Story:</b>{" "}
              <textarea
                style={{ width: "100%" }}
                rows={3}
                value={editData.story || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, story: e.target.value }))
                }
              />
            </div>
            <div>
              <b>Notes:</b>{" "}
              <textarea
                style={{ width: "100%" }}
                rows={2}
                value={editData.notes || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, notes: e.target.value }))
                }
              />
            </div>
            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button
                onClick={() => setEditPopupOpen(false)}
                style={{ marginRight: 8 }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setItems((arr) =>
                    arr.map((i) =>
                      i.id === editData.id ? { ...i, ...editData } : i
                    )
                  );
                  setEditPopupOpen(false);
                  setShowRefreshPrompt(true);
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
          {["title", "description", "alt", "keywords", "story", "notes"].map(
            (field) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <b>{field.charAt(0).toUpperCase() + field.slice(1)}:</b>
                {field === "story" || field === "notes" ? (
                  <textarea
                    style={{
                      width: "100%",
                      minHeight: field === "story" ? 100 : 70, // ⬅️ taller
                      fontFamily: "'Glegoo', serif",
                      fontSize: "0.95em",
                      border: "1px solid #ccc",
                      borderRadius: 6,
                      padding: 8,
                      resize: "vertical", // allow resizing
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
            )
          )}
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
          onClick={() => {
            setItems((arr) =>
              arr.map((i) =>
                i.id === adjustData.a.id
                  ? { ...i, ...adjustData.a }
                  : i.id === adjustData.b.id
                  ? { ...i, ...adjustData.b }
                  : i
              )
            );
            setAdjustPopupOpen(false);
            setShowRefreshPrompt(true);
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


      {/* --- Refresh prompt --- */}
      {showRefreshPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.18)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 32,
              minWidth: 320,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              textAlign: "center",
            }}
          >
            <h3>Changes Saved</h3>
            <p>Refresh the grid to see updated data and avoid corruption.</p>
            <button onClick={() => setShowRefreshPrompt(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
