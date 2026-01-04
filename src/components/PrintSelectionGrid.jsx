// src/components/PrintSelectionGrid.jsx
// Print Selection Grid Viewer - Read-only preview tool for selecting images for printing
// Does NOT modify gallery .mjs files - stores selection state in localStorage

import { useEffect, useMemo, useState, useCallback, useRef } from "react";

/* ---------- config: gallery data roots ---------- */
const DATA_ROOTS = [
  "/src/data/Galleries",
  "/src/pages/Other",
  "/src/data/Other",
];

/* ---------- helpers ---------- */
function normalizePath(p = "") { return p.replace(/\\/g, "/"); }

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
  const rootHint = DATA_ROOTS.find((r) => normalizePath(fullPath).startsWith(normalizePath(r) + "/")) || "";
  const rootName = rootHint.split("/").pop();
  return `[${rootName}] ${segs.join(" / ")}`;
}

function getBestImageSrc(image) {
  if (!image) return "";
  return image.srcXL || image.srcL || image.srcM || image.src || "";
}

function getGalleryPath(fullPath) {
  // Convert file path to gallery URL path
  // e.g., "/src/data/Galleries/Fine-Art-Photography/Architecture/Gallery.mjs"
  // -> "/Galleries/Fine-Art-Photography/Architecture"
  const rel = stripRoot(fullPath).replace(/\.mjs$/i, "");
  const parts = rel.split("/");
  // Remove the last segment if it's "Gallery" or similar
  const last = parts[parts.length - 1];
  if (last === "Gallery" || last === "Color" || last === "Black-White" || last === "NA-Color") {
    // Keep the full path for specific galleries
  }
  return "/Galleries/" + rel.replace(/\/Gallery$/, "");
}

// Local storage key for print selections
const STORAGE_KEY = "k4-print-selection";
const ORDER_STORAGE_KEY = "k4-print-order";
const LOADED_GALLERIES_KEY = "k4-print-loaded-galleries";

function loadSelections() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSelections(selections) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch {}
}

function loadOrder() {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOrder(order) {
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {}
}

function loadLoadedGalleries() {
  try {
    const raw = localStorage.getItem(LOADED_GALLERIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLoadedGalleries(galleries) {
  try {
    localStorage.setItem(LOADED_GALLERIES_KEY, JSON.stringify(galleries));
  } catch {}
}

/* ---------- component ---------- */
export default function PrintSelectionGrid() {
  // Gallery file discovery using Vite's import.meta.glob
  const modules = useMemo(() => {
    const maps = [
      import.meta.glob("/src/data/Galleries/**/*.mjs", { eager: false }),
      import.meta.glob("/src/pages/Other/**/*.mjs", { eager: false }),
      import.meta.glob("/src/data/Other/**/*.mjs", { eager: false }),
    ];
    return Object.assign({}, ...maps);
  }, []);

  const options = useMemo(() => {
    const rootIdx = (p) => {
      const n = normalizePath(p);
      return DATA_ROOTS.findIndex((r) => n.startsWith(normalizePath(r) + "/"));
    };
    return Object.keys(modules)
      .sort((a, b) => {
        const ra = rootIdx(a), rb = rootIdx(b);
        if (ra !== rb) return ra - rb;
        return stripRoot(a).localeCompare(stripRoot(b));
      })
      .map((path) => ({ path, label: prettyLabelFromPath(path) }));
  }, [modules]);

  // State
  const [loadedGalleries, setLoadedGalleries] = useState(() => loadLoadedGalleries()); // Array of {path, label}
  const [galleryToAdd, setGalleryToAdd] = useState(""); // For the add gallery dropdown
  const [data, setData] = useState([]); // Combined data from all loaded galleries with _galleryPath
  const [loading, setLoading] = useState(false);
  const [showStories, setShowStories] = useState(true);
  const [gridCols, setGridCols] = useState(5); // default 5 columns for big screens
  const [selections, setSelections] = useState(() => loadSelections());
  const [customOrder, setCustomOrder] = useState(() => loadOrder()); // { "multi-gallery": [id1, id2, ...] }
  const [selectedImages, setSelectedImages] = useState(new Set()); // For multi-select
  const [lastClickedId, setLastClickedId] = useState(null); // For shift-click range
  const [contextMenu, setContextMenu] = useState(null); // { x, y, imageIds }
  const [draggedId, setDraggedId] = useState(null); // Currently dragged image
  const [dragOverId, setDragOverId] = useState(null); // Drop target
  
  const gridRef = useRef(null);
  const imageRefs = useRef({});
  
  // Unique key for multi-gallery selection storage
  const selectionKey = useMemo(() => {
    if (loadedGalleries.length === 0) return "";
    if (loadedGalleries.length === 1) return loadedGalleries[0].path;
    return "multi-gallery:" + loadedGalleries.map(g => g.path).sort().join("|");
  }, [loadedGalleries]);

  // Load gallery data - supports multiple galleries
  const loadGalleryData = useCallback(async (galleryPath) => {
    if (!galleryPath || !modules[galleryPath]) return [];
    
    try {
      const mod = await modules[galleryPath]();
      const allArr = Array.isArray(mod)
        ? mod
        : Array.isArray(mod?.galleryData)
        ? mod.galleryData
        : Array.isArray(mod?.default)
        ? mod.default
        : [];
      // Filter out the intro placeholder and add gallery path
      return allArr
        .filter(d => d && d.id !== "i-k4studios")
        .map(d => ({ ...d, _galleryPath: galleryPath }));
    } catch (err) {
      console.error("Failed to load gallery:", galleryPath, err);
      return [];
    }
  }, [modules]);

  // Load all galleries when loadedGalleries changes
  useEffect(() => {
    if (loadedGalleries.length === 0) {
      setData([]);
      return;
    }
    
    setLoading(true);
    Promise.all(loadedGalleries.map(g => loadGalleryData(g.path)))
      .then(results => {
        // Merge all results, avoiding duplicates by ID
        const seen = new Set();
        const merged = [];
        for (const galleryImages of results) {
          for (const img of galleryImages) {
            if (!seen.has(img.id)) {
              seen.add(img.id);
              merged.push(img);
            }
          }
        }
        console.log("[PrintSelectionGrid] Loaded", merged.length, "images from", loadedGalleries.length, "galleries");
        setData(merged);
        setSelectedImages(new Set());
        setLastClickedId(null);
      })
      .finally(() => setLoading(false));
  }, [loadedGalleries, loadGalleryData]);

  // Save loaded galleries to localStorage
  useEffect(() => {
    saveLoadedGalleries(loadedGalleries);
  }, [loadedGalleries]);

  // Add a gallery
  const addGallery = useCallback(() => {
    if (!galleryToAdd) return;
    
    // Check if already loaded
    if (loadedGalleries.some(g => g.path === galleryToAdd)) {
      alert("This gallery is already loaded");
      return;
    }
    
    const label = prettyLabelFromPath(galleryToAdd);
    setLoadedGalleries(prev => [...prev, { path: galleryToAdd, label }]);
    setGalleryToAdd("");
  }, [galleryToAdd, loadedGalleries]);

  // Remove a gallery
  const removeGallery = useCallback((path) => {
    setLoadedGalleries(prev => prev.filter(g => g.path !== path));
  }, []);

  // Clear all galleries
  const clearAllGalleries = useCallback(() => {
    if (!confirm("Remove all loaded galleries?")) return;
    setLoadedGalleries([]);
    setData([]);
  }, []);

  // Save selections to localStorage whenever they change
  useEffect(() => {
    saveSelections(selections);
  }, [selections]);

  // Save order to localStorage whenever it changes
  useEffect(() => {
    saveOrder(customOrder);
  }, [customOrder]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Get selection state for current gallery set - MERGE from individual galleries if multi-gallery
  const gallerySelections = useMemo(() => {
    // If we have selections for this exact key, use them
    if (selections[selectionKey]) {
      return selections[selectionKey];
    }
    
    // If multi-gallery, try to merge selections from individual gallery keys
    if (loadedGalleries.length > 1) {
      const merged = {};
      for (const gallery of loadedGalleries) {
        const gallerySelections = selections[gallery.path] || {};
        Object.assign(merged, gallerySelections);
      }
      // If we found any selections, save them to the new key
      if (Object.keys(merged).length > 0) {
        console.log("[PrintSelectionGrid] Merged selections from", loadedGalleries.length, "galleries:", Object.keys(merged).length, "items");
        // Save merged selections (this will happen in next render via effect)
        return merged;
      }
    }
    
    return {};
  }, [selections, selectionKey, loadedGalleries]);
  
  // When gallery selection key changes and we have merged selections, save them
  useEffect(() => {
    if (loadedGalleries.length > 1 && !selections[selectionKey]) {
      // Check if we can merge from individual galleries
      const merged = {};
      for (const gallery of loadedGalleries) {
        const gallerySelections = selections[gallery.path] || {};
        Object.assign(merged, gallerySelections);
      }
      if (Object.keys(merged).length > 0) {
        setSelections(prev => ({
          ...prev,
          [selectionKey]: merged
        }));
      }
    }
  }, [selectionKey, loadedGalleries, selections]);

  // Check if image is marked as "No"
  const isNo = useCallback((id) => {
    return gallerySelections[id] === false;
  }, [gallerySelections]);

  // Set selection for image(s)
  const setImageSelection = useCallback((ids, value) => {
    setSelections(prev => {
      const galleryState = { ...(prev[selectionKey] || {}) };
      ids.forEach(id => {
        if (value === true) {
          // "Yes" is default, so we can remove the entry
          delete galleryState[id];
        } else {
          galleryState[id] = value;
        }
      });
      return { ...prev, [selectionKey]: galleryState };
    });
  }, [selectionKey]);

  // Handle image click (for multi-select)
  const handleImageClick = useCallback((e, image, index) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + click: toggle individual selection
      setSelectedImages(prev => {
        const next = new Set(prev);
        if (next.has(image.id)) {
          next.delete(image.id);
        } else {
          next.add(image.id);
        }
        return next;
      });
      setLastClickedId(image.id);
    } else if (e.shiftKey && lastClickedId) {
      // Shift + click: range selection
      const lastIndex = data.findIndex(d => d.id === lastClickedId);
      if (lastIndex !== -1) {
        const start = Math.min(lastIndex, index);
        const end = Math.max(lastIndex, index);
        const rangeIds = data.slice(start, end + 1).map(d => d.id);
        setSelectedImages(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
      }
    } else {
      // Regular click: open in new tab using the image's original gallery path
      const galleryPath = getGalleryPath(image._galleryPath || loadedGalleries[0]?.path || "");
      const imageUrl = `${galleryPath}/${image.id}`;
      window.open(imageUrl, "_blank");
    }
  }, [data, lastClickedId, loadedGalleries]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e, image) => {
    e.preventDefault();
    
    // If right-clicking on a selected image, apply to all selected
    // Otherwise, apply only to the right-clicked image
    let targetIds;
    if (selectedImages.has(image.id) && selectedImages.size > 0) {
      targetIds = Array.from(selectedImages);
    } else {
      targetIds = [image.id];
    }
    
    // Determine if target is in Yes or No section
    const isInNoSection = isNo(image.id);
    setContextMenu({ x: e.clientX, y: e.clientY, imageIds: targetIds, isNoSection: isInNoSection });
  }, [selectedImages, isNo]);

  // Context menu actions
  const handleContextAction = useCallback((action) => {
    if (!contextMenu) return;
    
    if (action === "yes") {
      setImageSelection(contextMenu.imageIds, true);
    } else if (action === "no") {
      setImageSelection(contextMenu.imageIds, false);
    } else if (action === "moveToTop" || action === "moveToBottom") {
      // Compute the current image lists inline to avoid reference issues
      const yesImgs = data.filter(img => !isNo(img.id));
      const noImgs = data.filter(img => isNo(img.id));
      
      // Get the current image list for the section
      const imageList = contextMenu.isNoSection ? noImgs : yesImgs;
      const currentIds = imageList.map(img => img.id);
      
      // Start with existing custom order or current order
      const existingOrder = customOrder[selectionKey] || data.map(img => img.id);
      const newOrder = [...existingOrder];
      
      // Move each selected image
      contextMenu.imageIds.forEach(id => {
        const idx = newOrder.indexOf(id);
        if (idx !== -1) {
          newOrder.splice(idx, 1);
        }
      });
      
      if (action === "moveToTop") {
        // Find the first item in this section that's in newOrder
        const firstInSection = currentIds.find(id => !contextMenu.imageIds.includes(id));
        const insertIdx = firstInSection ? newOrder.indexOf(firstInSection) : 0;
        newOrder.splice(Math.max(0, insertIdx), 0, ...contextMenu.imageIds);
      } else {
        // Find the last item in this section that's in newOrder
        const lastInSection = [...currentIds].reverse().find(id => !contextMenu.imageIds.includes(id));
        const insertIdx = lastInSection ? newOrder.indexOf(lastInSection) + 1 : newOrder.length;
        newOrder.splice(insertIdx, 0, ...contextMenu.imageIds);
      }
      
      setCustomOrder(prev => ({ ...prev, [selectionKey]: newOrder }));
    }
    
    // Clear selection after action
    setSelectedImages(new Set());
    setContextMenu(null);
  }, [contextMenu, setImageSelection, customOrder, selectionKey, data, isNo]);

  // Apply custom order to images - also try to merge from individual galleries
  const applyOrder = useCallback((images) => {
    let galleryOrder = customOrder[selectionKey];
    
    // If no order for multi-gallery, try to merge from individual gallery orders
    if ((!galleryOrder || galleryOrder.length === 0) && loadedGalleries.length > 1) {
      const mergedOrder = [];
      for (const gallery of loadedGalleries) {
        const order = customOrder[gallery.path] || [];
        for (const id of order) {
          if (!mergedOrder.includes(id)) {
            mergedOrder.push(id);
          }
        }
      }
      if (mergedOrder.length > 0) {
        galleryOrder = mergedOrder;
      }
    }
    
    if (!galleryOrder || galleryOrder.length === 0) return images;
    
    // Create a map of id -> order index
    const orderMap = new Map();
    galleryOrder.forEach((id, idx) => orderMap.set(id, idx));
    
    // Sort by custom order, unordered items go to the end
    return [...images].sort((a, b) => {
      const aIdx = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
      const bIdx = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
      return aIdx - bIdx;
    });
  }, [customOrder, selectionKey, loadedGalleries]);

  // Separate "Yes" and "No" images, then apply custom order
  const { yesImages, noImages } = useMemo(() => {
    const yes = [];
    const no = [];
    data.forEach(img => {
      if (isNo(img.id)) {
        no.push(img);
      } else {
        yes.push(img);
      }
    });
    return { 
      yesImages: applyOrder(yes), 
      noImages: applyOrder(no) 
    };
  }, [data, isNo, applyOrder]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e, image) => {
    setDraggedId(image.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", image.id);
  }, []);

  const handleDragOver = useCallback((e, image) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (image.id !== draggedId) {
      setDragOverId(image.id);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e, targetImage, imageList) => {
    e.preventDefault();
    setDragOverId(null);
    
    if (!draggedId || draggedId === targetImage.id) {
      setDraggedId(null);
      return;
    }
    
    // Get current order or create from imageList
    const currentOrder = customOrder[selectionKey] || imageList.map(img => img.id);
    const newOrder = [...currentOrder];
    
    // Find positions
    const draggedIdx = newOrder.indexOf(draggedId);
    const targetIdx = newOrder.indexOf(targetImage.id);
    
    if (draggedIdx === -1 || targetIdx === -1) {
      // If items aren't in the order yet, build fresh order from current list
      const freshOrder = imageList.map(img => img.id);
      const freshDraggedIdx = freshOrder.indexOf(draggedId);
      const freshTargetIdx = freshOrder.indexOf(targetImage.id);
      
      if (freshDraggedIdx !== -1 && freshTargetIdx !== -1) {
        freshOrder.splice(freshDraggedIdx, 1);
        freshOrder.splice(freshTargetIdx, 0, draggedId);
        setCustomOrder(prev => ({ ...prev, [selectionKey]: freshOrder }));
      }
    } else {
      // Reorder
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedId);
      setCustomOrder(prev => ({ ...prev, [selectionKey]: newOrder }));
    }
    
    setDraggedId(null);
  }, [draggedId, customOrder, selectionKey]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  // Reset order to original
  const resetOrder = useCallback(() => {
    if (!confirm("Reset to original gallery order?")) return;
    setCustomOrder(prev => {
      const next = { ...prev };
      delete next[selectionKey];
      return next;
    });
  }, [selectionKey]);

  // Stats
  const stats = useMemo(() => ({
    total: data.length,
    yes: yesImages.length,
    no: noImages.length
  }), [data.length, yesImages.length, noImages.length]);

  // Clear all selections for current gallery set
  const clearSelections = useCallback(() => {
    if (!confirm(`Clear all selections? (${stats.no} marked as "No" will be reset)`)) return;
    setSelections(prev => {
      const next = { ...prev };
      delete next[selectionKey];
      return next;
    });
  }, [selectionKey, stats.no]);

  // Export selections and order as JSON
  const exportSelections = useCallback(() => {
    const exportData = {
      selections,
      order: customOrder
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `print-selections-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selections, customOrder]);

  // Import selections and order from JSON file
  const importSelections = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          // Support both old format (just selections) and new format (selections + order)
          if (imported.selections && typeof imported.selections === "object") {
            setSelections(prev => ({ ...prev, ...imported.selections }));
            if (imported.order && typeof imported.order === "object") {
              setCustomOrder(prev => ({ ...prev, ...imported.order }));
            }
            alert(`Imported selections for ${Object.keys(imported.selections).length} galleries`);
          } else if (typeof imported === "object" && imported !== null) {
            // Old format - just selections
            setSelections(prev => ({ ...prev, ...imported }));
            alert(`Imported selections for ${Object.keys(imported).length} galleries`);
          }
        } catch (err) {
          alert("Failed to parse JSON file");
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-6">
      {/* Header Controls */}
      <div className="max-w-[3200px] mx-auto mb-6 space-y-4">
        <h1 className="text-2xl font-bold text-stone-800">Print Selection Grid</h1>
        
        {/* Loaded Galleries */}
        {loadedGalleries.length > 0 && (
          <div className="bg-white border border-stone-300 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-700">Loaded Galleries ({loadedGalleries.length})</span>
              <button
                onClick={clearAllGalleries}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {loadedGalleries.map((gallery) => (
                <div 
                  key={gallery.path}
                  className="flex items-center gap-1 bg-stone-100 border border-stone-300 rounded px-2 py-1 text-xs"
                >
                  <span className="text-stone-700 max-w-[200px] truncate" title={gallery.label}>
                    {gallery.label}
                  </span>
                  <button
                    onClick={() => removeGallery(gallery.path)}
                    className="text-stone-400 hover:text-red-600 ml-1"
                    title="Remove gallery"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Add Gallery */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-600">
              {loadedGalleries.length === 0 ? "Select Gallery:" : "Add Gallery:"}
            </span>
            <select
              value={galleryToAdd}
              onChange={(e) => setGalleryToAdd(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg bg-white text-sm min-w-[300px]"
            >
              <option value="">— Select a gallery —</option>
              {options
                .filter(opt => !loadedGalleries.some(g => g.path === opt.path))
                .map((opt) => (
                  <option key={opt.path} value={opt.path}>{opt.label}</option>
                ))}
            </select>
          </label>
          
          <button
            onClick={addGallery}
            disabled={!galleryToAdd}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              galleryToAdd 
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-stone-300 text-stone-500 cursor-not-allowed"
            }`}
          >
            {loadedGalleries.length === 0 ? "Load Gallery" : "+ Add Gallery"}
          </button>
          
          {/* Grid columns */}
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-600">Columns:</span>
            <select
              value={gridCols}
              onChange={(e) => setGridCols(Number(e.target.value))}
              className="px-3 py-2 border border-stone-300 rounded-lg bg-white text-sm"
            >
              <option value={3}>3 Wide</option>
              <option value={4}>4 Wide</option>
              <option value={5}>5 Wide</option>
              <option value={6}>6 Wide</option>
            </select>
          </label>
          
          {/* Toggle stories */}
          <button
            onClick={() => setShowStories(!showStories)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showStories 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "bg-stone-300 text-stone-700 hover:bg-stone-400"
            }`}
          >
            {showStories ? "Hide Stories" : "Show Stories"}
          </button>
          
          {/* Clear selections */}
          {stats.no > 0 && (
            <button
              onClick={clearSelections}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Clear Selections
            </button>
          )}
          
          {/* Export */}
          <button
            onClick={exportSelections}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          >
            Export JSON
          </button>
          
          {/* Import */}
          <button
            onClick={importSelections}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
          >
            Import JSON
          </button>
          
          {/* Reset Order */}
          {customOrder[selectionKey] && (
            <button
              onClick={resetOrder}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            >
              Reset Order
            </button>
          )}
        </div>
        
        {/* Stats bar */}
        {data.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-stone-600">
              Total: <strong>{stats.total}</strong>
            </span>
            <span className="text-green-700">
              Yes: <strong>{stats.yes}</strong>
            </span>
            <span className="text-red-700">
              No: <strong>{stats.no}</strong>
            </span>
            {selectedImages.size > 0 && (
              <span className="text-blue-700">
                Selected: <strong>{selectedImages.size}</strong>
              </span>
            )}
          </div>
        )}
        
        {/* Instructions */}
        <div className="text-xs text-stone-500 bg-stone-200 px-3 py-2 rounded-lg">
          <strong>Click:</strong> Open in new tab &nbsp;|&nbsp;
          <strong>Ctrl+Click:</strong> Toggle select &nbsp;|&nbsp;
          <strong>Shift+Click:</strong> Range select &nbsp;|&nbsp;
          <strong>Right-Click:</strong> Yes/No menu &nbsp;|&nbsp;
          <strong>Drag:</strong> Reorder images
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12 text-stone-500">Loading gallery...</div>
      )}
      
      {/* No gallery selected */}
      {loadedGalleries.length === 0 && !loading && (
        <div className="text-center py-12 text-stone-500">
          Select a gallery above to begin
        </div>
      )}
      
      {/* Image Grid */}
      {!loading && data.length > 0 && (
        <div ref={gridRef} className="max-w-[3200px] mx-auto">
          {/* YES Images */}
          {yesImages.length > 0 && (
            <div 
              className="grid gap-6 mb-8"
              style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            >
              {yesImages.map((image, index) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  index={data.indexOf(image)}
                  showStory={showStories}
                  showGalleryBadge={loadedGalleries.length > 1}
                  isSelected={selectedImages.has(image.id)}
                  isNo={false}
                  isDragging={draggedId === image.id}
                  isDragOver={dragOverId === image.id}
                  onClick={handleImageClick}
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, image, yesImages)}
                  onDragEnd={handleDragEnd}
                  ref={el => imageRefs.current[image.id] = el}
                />
              ))}
            </div>
          )}
          
          {/* NO Images Section */}
          {noImages.length > 0 && (
            <>
              <div className="border-t-2 border-red-300 my-8 pt-4">
                <h2 className="text-lg font-semibold text-red-700 mb-4">
                  Excluded from Print ({noImages.length})
                </h2>
              </div>
              <div 
                className="grid gap-6"
                style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
              >
                {noImages.map((image, index) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    showGalleryBadge={loadedGalleries.length > 1}
                    index={data.indexOf(image)}
                    showStory={showStories}
                    isSelected={selectedImages.has(image.id)}
                    isNo={true}
                    isDragging={draggedId === image.id}
                    isDragOver={dragOverId === image.id}
                    onClick={handleImageClick}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, image, noImages)}
                    onDragEnd={handleDragEnd}
                    ref={el => imageRefs.current[image.id] = el}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-stone-300 rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleContextAction("yes")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-green-100 text-green-700 font-medium flex items-center gap-2"
          >
            <span className="text-lg">✓</span> Yes
          </button>
          <button
            onClick={() => handleContextAction("no")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-100 text-red-700 font-medium flex items-center gap-2"
          >
            <span className="text-lg">✗</span> No
          </button>
          <div className="border-t border-stone-200 my-1" />
          <button
            onClick={() => handleContextAction("moveToTop")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-100 text-blue-700 font-medium flex items-center gap-2"
          >
            <span className="text-lg">⬆</span> Move to Top
          </button>
          <button
            onClick={() => handleContextAction("moveToBottom")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-100 text-blue-700 font-medium flex items-center gap-2"
          >
            <span className="text-lg">⬇</span> Move to Bottom
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Image Card Component ---------- */
import { forwardRef } from "react";

// Get short gallery name for badge
function getGalleryShortName(galleryPath) {
  if (!galleryPath) return "";
  const parts = galleryPath.split("/").filter(Boolean);
  // Get last meaningful segment
  const last = parts[parts.length - 1];
  if (last === "Color" || last === "Black-White" || last === "NA-Color") {
    return parts.slice(-2).join("/");
  }
  return last;
}

const ImageCard = forwardRef(function ImageCard(
  { image, index, showStory, isSelected, isNo, isDragging, isDragOver, onClick, onContextMenu, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, showGalleryBadge },
  ref
) {
  const imageSrc = getBestImageSrc(image);
  const galleryName = image._galleryPath ? getGalleryShortName(image._galleryPath) : "";
  
  return (
    <div
      ref={ref}
      draggable
      className={`relative rounded-lg overflow-hidden bg-white shadow-md transition-all cursor-grab ${
        isNo ? "opacity-40 grayscale" : ""
      } ${isSelected ? "ring-4 ring-blue-500 ring-offset-2" : ""} ${
        isDragging ? "opacity-50 scale-95 ring-2 ring-amber-400" : ""
      } ${isDragOver ? "ring-4 ring-green-500 ring-offset-2 scale-105" : ""}`}
      onClick={(e) => onClick(e, image, index)}
      onContextMenu={(e) => onContextMenu(e, image)}
      onDragStart={(e) => onDragStart(e, image)}
      onDragOver={(e) => onDragOver(e, image)}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Image container - uncropped, natural aspect ratio */}
      <div className="w-full bg-stone-200">
        <img
          draggable={false}
          src={imageSrc}
          alt={image.alt || image.title || "Image"}
          className="w-full h-auto object-contain"
          loading="lazy"
        />
      </div>
      
      {/* Title */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-stone-800 line-clamp-2">
          {image.title || "Untitled"}
        </h3>
        <p className="text-xs text-stone-500 mt-1">{image.id}</p>
        
        {/* Gallery source badge */}
        {showGalleryBadge && galleryName && (
          <p className="text-xs text-amber-600 mt-1 truncate" title={image._galleryPath}>
            📁 {galleryName}
          </p>
        )}
        
        {/* Story */}
        {showStory && image.story && (
          <p className="text-xs text-stone-600 mt-2 line-clamp-4 leading-relaxed">
            {image.story}
          </p>
        )}
      </div>
      
      {/* Status badge */}
      {isNo && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          NO
        </div>
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
          ✓
        </div>
      )}
    </div>
  );
});
