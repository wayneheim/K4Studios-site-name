import React, { useState, useEffect, useMemo } from "react";

const DATA_ROOTS = [
  "/src/data/Galleries",
  "/src/pages/Other",
  "/src/data/Other",
];

// ✅ Strict manual fallback chain (no browser choice)
function pickImage(item) {
  if (!item) return "";
  return (
    item.srcS ||
    item.srcM ||
    item.srcL ||
    item.srcXL ||
    item.src ||
    item.thumb ||
    item.preview ||
    item.image ||
    item.url ||
    ""
  );
}

export default function GalleryLightbox({ datasetPath = "", showHeader = true }) {
  const [selectedPath, setSelectedPath] = useState("");
  const [items, setItems] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);
  const [activeId, setActiveId] = useState(null);

  // --- capture ?dataset= param or prop
  useEffect(() => {
    try {
      const search =
        window.location.search ||
        (window.location.hash.includes("?")
          ? window.location.hash.split("?")[1]
          : "");
      const params = new URLSearchParams(search);
      const raw = params.get("dataset");
      let resolved = raw || datasetPath || "";
      resolved = resolved.replace(/\\/g, "/");
      // Remove any leading /src/data/ or /src/data
      resolved = resolved.replace(/^\/?src\/?data\/?/, "");
      // Remove any leading slash
      resolved = resolved.replace(/^\//, "");
      // Always prefix with /src/data/
      resolved = `/src/data/${resolved}`;
      // Always end with .mjs
      if (!resolved.endsWith(".mjs")) resolved += ".mjs";
      setSelectedPath(resolved);
    } catch (err) {
      console.error("Failed to parse dataset path:", err);
    }
  }, [datasetPath]);

  // --- discover datasets
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

  // --- load data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedPath || !modules[selectedPath]) {
        console.warn("No dataset found for path:", selectedPath);
        return;
      }
      try {
        const mod = await modules[selectedPath]();
        const arr = Array.isArray(mod)
          ? mod
          : Array.isArray(mod?.galleryData)
          ? mod.galleryData
          : Array.isArray(mod?.default)
          ? mod.default
          : [];
        if (cancelled) return;
        const realItems = arr.filter((d) => d?.id !== "i-k4studios");
        realItems.sort((a, b) => {
          const ao = typeof a.sortOrder === "number" ? a.sortOrder : Infinity;
          const bo = typeof b.sortOrder === "number" ? b.sortOrder : Infinity;
          return ao - bo;
        });
        setItems(realItems);
      } catch (err) {
        console.error("Failed to load dataset:", selectedPath, err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedPath, modules]);

  // --- hover delay logic
  useEffect(() => {
    if (!hoveredId) return setActiveId(null);
    const t = setTimeout(() => setActiveId(hoveredId), 700);
    return () => clearTimeout(t);
  }, [hoveredId]);

  // --- derive gallery base path for linking
  function getGalleryUrl(imageId) {
    if (!selectedPath || !imageId) return "#";
    const base = selectedPath
      .replace(/^\/src\/data/, "")
      .replace(/\.mjs$/i, "")
      .replace(/\/$/, "");
    return `${base}/${imageId}`;
  }

  // --- derive landing page (for heading link)
  const landingUrl = selectedPath
    ? selectedPath.replace(/^\/src\/data/, "").replace(/\.mjs$/i, "")
    : "#";

  // --- readable full gallery name
  let galleryName = "";
  if (landingUrl) {
    const parts = landingUrl.split("/").filter(Boolean);
    const last = parts.pop() || "";
    const prev = parts.pop() || "";
    const full = [prev, last]
      .filter(Boolean)
      .map((s) =>
        s
          .replace(/-/g, " ")
          .replace(/\b\w/g, (m) => m.toUpperCase())
          .trim()
      )
      .join(" – ");
    galleryName = full || "Gallery Lightbox";
  }

  return (
    <div
      className="min-h-screen bg-[#f7f5f1] p-6 max-w-7xl mx-auto text-sm"
      style={{ fontFamily: "'Glegoo', serif", color: "#2a1f17" }}
    >
      {/* ✅ Conditional Header */}
      {showHeader && (
        <div
          className="glx-header"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#000",
            padding: "16px 24px",
            borderRadius: 8,
            marginBottom: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <a
            href={landingUrl}
            style={{
              fontSize: "1.6em",
              fontWeight: 700,
              textDecoration: "none",
              color: "#fff",
            }}
          >
            {galleryName}
          </a>
          <p style={{ marginTop: 6, fontSize: "0.95em", color: "#e2e2e2" }}>
            Mouse over image to see full preview. Click image to view page.
          </p>
        </div>
      )}

      {/* ✅ Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 px-10 max-w-[1600px] mx-auto justify-center">
        {items.map((item, idx) => {
          const isExpanded = activeId === item.id;
          const linkUrl = getGalleryUrl(item.id);
          return (
            <div
              key={item.id}
              className="relative border rounded-lg bg-white overflow-hidden shadow-sm transition-all duration-500 ease-out"
            >
              {/* Image link trigger */}
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden cursor-pointer"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  transition: "all 0.6s cubic-bezier(0.25, 1, 0.3, 1)",
                  background: isExpanded ? "#000" : "transparent",
                }}
              >
                <img
                  src={pickImage(item)}
                  alt={item.alt || item.title || ""}
                  className="w-full object-cover rounded-t-lg transition-all duration-[700ms] ease-out"
                  style={{
                    transform: isExpanded ? "scale(1.03)" : "scale(1)",
                    objectFit: isExpanded ? "contain" : "cover",
                    maxHeight: isExpanded ? "600px" : "144px",
                    transition:
                      "transform 0.7s ease-out, max-height 0.7s ease-out, object-fit 0.7s ease-out",
                  }}
                />
              </a>

              {/* Title + Story */}
              <div
                className="p-3 transition-all duration-700 ease-out overflow-hidden"
                style={{
                  maxHeight: isExpanded ? "400px" : "100px",
                }}
              >
                <div className="text-xs text-gray-600 mb-1">#{idx + 1}</div>
                <div className="font-bold text-sm leading-tight mb-1">
                  {item.title || "Untitled"}
                </div>
                <div
                  className={`text-sm text-gray-700 transition-all duration-700 ease-out ${
                    isExpanded ? "line-clamp-none" : "line-clamp-2"
                  }`}
                >
                  {item.story || ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
