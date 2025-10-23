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

      // --- Normalize and order like Orderer ---
      const ghosts = arr.filter((d) => d?.id === "i-k4studios");
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
      const ordered = ghosts.concat(shown, hidden);

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
            {String(item.visibility).toLowerCase() === "hidden" && (
              <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-yellow-100 border border-yellow-300 text-yellow-900">
                Hidden
              </span>
            )}
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

      {/* Fields */}
      {["title", "description", "alt", "keywords", "story", "notes"].map(
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
