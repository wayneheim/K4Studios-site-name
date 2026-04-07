import React, { useState, useEffect, useMemo } from "react";
import { siteNav } from "../data/siteNav.ts";

const DATA_ROOTS = [
  "/src/data/Galleries",
  "/src/pages/Other",
  "/src/data/Other",
];

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getProxySrc = (id, size = "s") => `/img/${id}/${size}.jpg`;

// ✅ Use proxy URLs for grid thumbnails
function pickImage(item) {
  if (!item || !item.id) return "";
  return getProxySrc(item.id, "s");
}

export default function GalleryLightbox({ datasetPath = "", showHeader = true }) {
  const [selectedPath, setSelectedPath] = useState("");
  const [items, setItems] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeRowIds, setActiveRowIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = React.useRef(null);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      let modKey = modules[selectedPath];
      let triedDuplicate = false;
      let triedFallback = false;
      // Step 2: Try duplicating last folder name if not found
      if (!modKey && selectedPath) {
        const pathParts = selectedPath.replace(/^\/src\/data\//, "").replace(/\.mjs$/, "").split("/");
        if (pathParts.length > 0) {
          const last = pathParts[pathParts.length - 1];
          const dupePath = `/src/data/${pathParts.join("/")}/${last}.mjs`;
          if (dupePath !== selectedPath && modules[dupePath]) {
            modKey = modules[dupePath];
            triedDuplicate = true;
          } else {
            // Step 2b: Try .mjs file directly inside the folder
            const directFilePath = `/src/data/${pathParts.slice(0, -1).join("/")}/${last}.mjs`;
            if (directFilePath !== selectedPath && modules[directFilePath]) {
              modKey = modules[directFilePath];
              triedDuplicate = true;
            }
          }
        }
      }
      // Step 3: Fallback to siteNav if still not found
      if (!modKey && selectedPath) {
        // Remove .mjs and /src/data prefix
        const cleanPath = selectedPath.replace(/^\/src\/data/, "").replace(/\.mjs$/, "");
        function findNav(node) {
          if (node.href === cleanPath || node.href === `/${cleanPath}`) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findNav(child);
              if (found) return found;
            }
          }
          return null;
        }
        let found = null;
        for (const node of siteNav) {
          found = findNav(node);
          if (found) break;
        }
        if (found && found.href) {
          const fallbackPath = `/src/data${found.href}.mjs`;
          modKey = modules[fallbackPath];
          triedFallback = true;
        }
      }
      if (!modKey) {
        console.warn("No dataset found for path:", selectedPath);
        if (triedDuplicate) {
          console.warn("Tried duplicate folder/file fallback and failed.");
        }
        if (triedFallback) {
          console.warn("Fallback to siteNav also failed.");
        }
        console.log("Available module keys:\n" + Object.keys(modules).join("\n"));
        return;
      }
      try {
        const mod = await modKey();
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
      <div 
        ref={gridRef}
        className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 px-10 max-w-[1600px] mx-auto justify-center"
        onMouseLeave={() => {
          setTimeout(() => setActiveRowIds(new Set()), 400);
        }}
      >
        {items.map((item, idx) => {
          const isRowActive = activeRowIds.has(item.id);
          const linkUrl = getGalleryUrl(item.id);
          
          // Row detection on hover
          const handleCardHover = (e) => {
            const card = e.currentTarget;
            const grid = gridRef.current;
            if (!grid) return;
            
            const cardTop = card.getBoundingClientRect().top;
            const allCards = grid.querySelectorAll('[data-card-id]');
            const rowIds = new Set();
            
            allCards.forEach(c => {
              const cTop = c.getBoundingClientRect().top;
              if (Math.abs(cTop - cardTop) < 20) {
                rowIds.add(c.dataset.cardId);
              }
            });
            
            setActiveRowIds(rowIds);
            setHoveredId(item.id);
          };
          
          const isHovered = hoveredId === item.id;
          
          return (
            <div
              key={item.id}
              data-card-id={item.id}
              onMouseEnter={handleCardHover}
              onMouseLeave={() => setHoveredId(null)}
              className="relative rounded-lg bg-white overflow-hidden border border-gray-200"
              style={{
                transform: isRowActive ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered 
                  ? '0 0 0 3px rgba(184, 134, 11, 0.5), 0 8px 20px rgba(0,0,0,.15)' 
                  : isRowActive 
                    ? '0 8px 20px rgba(0,0,0,.15)' 
                    : '0 2px 5px rgba(0,0,0,.1)',
                transition: 'transform 0.7s ease-in-out, box-shadow 0.15s ease-out',
              }}
            >
              {/* Image link trigger */}
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden cursor-pointer"
              >
                <img
                  src={pickImage(item)}
                  alt={item.alt || item.title || ""}
                  className="w-full rounded-t-lg"
                  style={{
                    transform: isRowActive && !isMobile ? "scale(1.05)" : "scale(1)",
                    maxHeight: isMobile ? "none" : (isRowActive ? "280px" : "144px"),
                    objectFit: isMobile ? "contain" : "cover",
                    transition: 'all 0.7s ease-in-out',
                  }}
                />
              </a>

              {/* Title + Story */}
              <div
                className="p-3 overflow-hidden"
                style={{
                  maxHeight: isMobile ? "none" : (isRowActive ? "200px" : "100px"),
                  transition: 'all 0.7s ease-in-out',
                }}
              >
                <div className="text-xs text-gray-600 mb-1">#{idx + 1}</div>
                <div className="font-bold text-sm leading-tight mb-1">
                  {item.title || "Untitled"}
                </div>
                <div className={`text-sm text-gray-700 ${isMobile ? '' : 'line-clamp-2'}`}>
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
