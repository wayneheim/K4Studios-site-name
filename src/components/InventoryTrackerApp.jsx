// InventoryTrackerApp.jsx - Inventory tracking page for prints in stock
import { useState, useEffect, useRef } from "react";
import { SERIES_DEFINITIONS } from "../data/seriesDefinitions.js";

// Context menu component
function ContextMenu({ x, y, item, onClose, onEditInEditorPro, onPrintCertificate }) {
  const menuRef = useRef(null);
  
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  
  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-stone-200 py-1 z-50 min-w-48"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => { onEditInEditorPro(item); onClose(); }}
        className="w-full text-left px-4 py-2 hover:bg-stone-100 text-sm flex items-center gap-2"
      >
        <span>✏️</span>
        <span>Edit in Editor Pro</span>
      </button>
      <button
        onClick={() => { onPrintCertificate(item); onClose(); }}
        className="w-full text-left px-4 py-2 hover:bg-stone-100 text-sm flex items-center gap-2"
      >
        <span>📜</span>
        <span>Print Certificate</span>
      </button>
    </div>
  );
}

// Inventory card component
function InventoryCard({ item, onContextMenu }) {
  const def = SERIES_DEFINITIONS[item.tier];
  
  // Color coding for series + size combinations
  // Uses opacity-based approach for scalability
  // Chronicle = blue base, Legend = green base, Engrained = amber/wood base
  // Smaller sizes = lighter (lower opacity), larger sizes = darker (higher opacity)
  
  const chronicleSizes = ['16" x 20"', '20" x 24"'];
  const legendSizes = ['24" x 30"', '30" x 40"', '40" x 60"'];
  
  const getOpacityForIndex = (idx, total) => {
    // Scale from 20% to 100% based on position
    if (total === 1) return 100;
    if (total === 2) return idx === 0 ? 20 : 100;
    if (total === 3) return [20, 55, 100][idx];
    if (total === 4) return [20, 45, 70, 100][idx];
    // Fallback for more sizes
    return Math.round(20 + (80 * idx / (total - 1)));
  };
  
  const getCardStyle = (tier, size) => {
    let baseColor, borderColor, sizeIdx, totalSizes;
    
    if (tier === "chronicle") {
      baseColor = "84, 146, 164"; // #5492a4
      borderColor = "64, 116, 134"; // darker shade
      sizeIdx = chronicleSizes.findIndex(s => size.includes(s.split('"')[0]));
      if (sizeIdx === -1) sizeIdx = 0;
      totalSizes = chronicleSizes.length;
    } else if (tier === "legend") {
      baseColor = "107, 180, 134"; // #6bb486
      borderColor = "77, 140, 104"; // darker shade
      sizeIdx = legendSizes.findIndex(s => size.includes(s.split('"')[0]));
      if (sizeIdx === -1) sizeIdx = 0;
      totalSizes = legendSizes.length;
    } else if (tier === "engrained") {
      // Engrained: warm amber/wood tone
      baseColor = "180, 140, 90"; // warm wood brown
      borderColor = "140, 100, 60"; // darker wood
      return {
        background: `rgba(${baseColor}, 0.7)`,
        borderColor: `rgba(${borderColor}, 0.9)`
      };
    } else {
      return { background: "white", borderColor: "#e7e5e4" };
    }
    
    const opacity = getOpacityForIndex(sizeIdx, totalSizes) / 100;
    return {
      background: `rgba(${baseColor}, ${opacity})`,
      borderColor: `rgba(${borderColor}, ${Math.min(1, opacity + 0.2)})`
    };
  };
  
  const cardStyle = getCardStyle(item.tier, item.size);
  
  const seriesBadgeColors = {
    chronicle: "bg-sky-200 border-sky-500 text-sky-900",
    legend: "bg-emerald-200 border-emerald-500 text-emerald-900",
    engrained: "bg-amber-200 border-amber-600 text-amber-900",
  };
  
  return (
    <div
      className="rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-2"
      style={{ backgroundColor: cardStyle.background, borderColor: cardStyle.borderColor }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, item);
      }}
    >
      {/* Image */}
      <div className="aspect-square bg-stone-200 relative overflow-hidden">
        <img
          src={item.src}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Inventory badge */}
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
          {item.inventory} in stock
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-stone-800 truncate text-center" title={item.title}>
          {item.title || item.imageId}
        </h3>
        
        {/* Series badge and size - centered */}
        <div className="mt-2 flex flex-col items-center gap-1">
          <span className={`text-xs px-2 py-0.5 rounded border ${seriesBadgeColors[item.tier] || "bg-stone-100 border-stone-300 text-stone-600"}`}>
            {def?.icon} {def?.label || item.tier}
          </span>
          <span className="text-xs font-medium text-stone-700">{item.size}</span>
        </div>
        
        {/* Printed/Sold counts */}
        <div className="mt-2 text-xs text-stone-600 flex justify-between">
          <span>Printed: <span className="text-blue-600 font-medium">{item.printed}</span></span>
          <span>Sold: <span className="text-amber-600 font-medium">{item.sold}</span></span>
        </div>
      </div>
    </div>
  );
}

// Main app component
function InventoryTrackerApp() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [filterTier, setFilterTier] = useState("all");
  const [sortBy, setSortBy] = useState("title"); // title, inventory, tier
  
  // Fetch inventory data
  useEffect(() => {
    async function fetchInventory() {
      try {
        const cacheBuster = Date.now();
        
        // Fetch both series registry and Engrained data in parallel
        const [registryRes, engrainedRes] = await Promise.all([
          fetch(`/.netlify/functions/seriesRegistry?_t=${cacheBuster}`, { cache: "no-store" }),
          fetch(`/.netlify/functions/engrainedData?_t=${cacheBuster}`, { cache: "no-store" })
        ]);
        
        if (!registryRes.ok) throw new Error("Failed to fetch registry");
        
        const registry = await registryRes.json();
        const engrainedData = engrainedRes.ok ? await engrainedRes.json() : { items: [] };
        
        // Parse registry to find items with inventory (P - S > 0)
        const items = [];
        
        for (const [seriesId, series] of Object.entries(registry.series || {})) {
          if (!series.editionData) continue;
          
          for (const [tier, tierData] of Object.entries(series.editionData)) {
            // Only track limited series (chronicle, legend)
            if (!["chronicle", "legend"].includes(tier)) continue;
            
            const printedBySize = tierData.printedBySize || {};
            const soldBySize = tierData.soldBySize || {};
            
            for (const [size, printed] of Object.entries(printedBySize)) {
              const sold = soldBySize[size] || 0;
              const inventory = printed - sold;
              
              if (inventory > 0) {
                items.push({
                  seriesId,
                  imageId: series.primaryImageId,
                  title: series.title || series.primaryImageId,
                  src: series.src,
                  tier,
                  size,
                  printed,
                  sold,
                  inventory,
                  galleryPath: series.occurrences?.[0]?.galleryPath || ""
                });
              }
            }
          }
        }
        
        // Add Engrained items that have inventory
        for (const item of (engrainedData.items || [])) {
          if (!item.inventory) continue;
          
          const inv = item.inventory;
          const inStock = inv.inStock || Math.max(0, (inv.printed || 0) - (inv.sold || 0));
          
          if (inStock > 0) {
            items.push({
              seriesId: `engrained:${item.id}`,
              imageId: item.id,
              title: item.title || item.id,
              src: item.src,
              tier: "engrained",
              size: item.imageSize || "Wood Panel",
              printed: inv.printed || 0,
              sold: inv.sold || 0,
              inventory: inStock,
              galleryPath: "src/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs",
              price: item.price
            });
          }
        }
        
        setInventory(items);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching inventory:", err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    fetchInventory();
  }, []);
  
  // Handle context menu
  function handleContextMenu(e, item) {
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }
  
  // Edit in Editor Pro
  function handleEditInEditorPro(item) {
    // Build URL to Editor Pro with the image
    // The galleryPath helps locate the image
    const galleryPath = item.galleryPath || "";
    const imageId = item.imageId;
    
    // Open Editor Pro in new tab - it will need to navigate to this image
    // Format: /admin/GalleryEditor?file=<galleryPath>&id=<imageId>
    const params = new URLSearchParams();
    if (galleryPath) params.set("file", galleryPath);
    if (imageId) params.set("id", imageId);
    
    window.open(`/admin/GalleryEditor?${params.toString()}`, "_blank");
  }
  
  // Print certificate - opens the COA print page
  function handlePrintCertificate(item) {
    // Build certificate ID: K4-{imageId}-{tier}-{size}-{editionNum}
    // Size format: "16 x 20" -> "16x20"
    const sizeSlug = (item.size || "16x20").replace(/["\s]/g, '').replace('×', 'x');
    const imageIdShort = (item.imageId || '').replace('i-', '');
    const editionNum = String(item.printed || 1).padStart(3, '0');
    
    const certificateId = `K4-${imageIdShort}-${item.tier}-${sizeSlug}-${editionNum}`;
    
    // Open in new window for printing
    window.open(`/admin/print/certificate/${certificateId}`, '_blank', 'width=800,height=1000');
  }
  
  // Filter and sort inventory
  const filteredInventory = inventory
    .filter(item => filterTier === "all" || item.tier === filterTier)
    .sort((a, b) => {
      switch (sortBy) {
        case "inventory":
          return b.inventory - a.inventory;
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "tier":
          return a.tier.localeCompare(b.tier);
        case "size":
          // Sort by size (extract first number for comparison)
          const sizeA = parseInt(a.size.match(/\d+/)?.[0] || "0");
          const sizeB = parseInt(b.size.match(/\d+/)?.[0] || "0");
          return sizeA - sizeB;
        default:
          return 0;
      }
    });
  
  // Group inventory by gallery path
  const groupedInventory = filteredInventory.reduce((acc, item) => {
    const path = item.galleryPath || "Unknown Gallery";
    if (!acc[path]) acc[path] = [];
    acc[path].push(item);
    return acc;
  }, {});
  
  // Sort gallery paths alphabetically
  const sortedGalleryPaths = Object.keys(groupedInventory).sort();
  
  // Convert gallery path to breadcrumb segments and URL
  function parseGalleryPath(path) {
    // Example: /src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs
    // Extract the meaningful parts after "Galleries/"
    const match = path.match(/\/Galleries\/(.+)\.mjs$/);
    if (!match) return { segments: [path], url: "/" };
    
    const parts = match[1].split("/").map(part => 
      part.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    );
    
    // Build URL - keep original casing from path
    // /src/data/Galleries/X/Y/Z.mjs -> /Galleries/X/Y/Z
    const urlPath = match[1];
    
    return { segments: parts, url: `/Galleries/${urlPath}` };
  }
  
  // Calculate totals
  const totalItems = filteredInventory.reduce((sum, item) => sum + item.inventory, 0);
  const chronicleCount = inventory.filter(i => i.tier === "chronicle").reduce((sum, i) => sum + i.inventory, 0);
  const legendCount = inventory.filter(i => i.tier === "legend").reduce((sum, i) => sum + i.inventory, 0);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-stone-600">Loading inventory...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Inventory</h2>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">📦 Inventory Tracker</h1>
              <p className="text-sm text-stone-500 mt-1">Prints ready to ship</p>
            </div>
            
            {/* Summary stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalItems}</div>
                <div className="text-xs text-stone-500">Total in Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{chronicleCount}</div>
                <div className="text-xs text-stone-500">Chronicle</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{legendCount}</div>
                <div className="text-xs text-stone-500">Legend</div>
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-stone-600">Filter:</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="text-sm border border-stone-300 rounded px-2 py-1"
              >
                <option value="all">All Series</option>
                <option value="chronicle">Chronicle Only</option>
                <option value="legend">Legend Only</option>
                <option value="engrained">Engrained Only</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-stone-600">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-stone-300 rounded px-2 py-1"
              >
                <option value="title">Title</option>
                <option value="size">Size</option>
                <option value="tier">Series</option>
                <option value="inventory">Inventory Count</option>
              </select>
            </div>
            
            <div className="flex-1"></div>
            
            <a
              href="/admin/GalleryEditor"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Editor Pro
            </a>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-stone-700 mb-2">No Inventory</h2>
            <p className="text-stone-500">
              {filterTier === "all" 
                ? "No prints are currently in stock. Add P (printed) values in Editor Pro."
                : `No ${filterTier} prints in stock.`}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedGalleryPaths.map((galleryPath) => {
              const items = groupedInventory[galleryPath];
              const { segments, url } = parseGalleryPath(galleryPath);
              
              return (
                <div key={galleryPath}>
                  {/* Gallery header with breadcrumb */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-300">
                    <span className="text-stone-400 text-sm">📁</span>
                    <div className="flex items-center gap-1 text-sm flex-wrap">
                      {segments.map((segment, idx) => (
                        <span key={idx} className="flex items-center">
                          {idx > 0 && <span className="text-stone-400 mx-1">/</span>}
                          {idx === segments.length - 1 ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {segment}
                            </a>
                          ) : (
                            <span className="text-stone-600">{segment}</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="text-stone-400 text-xs ml-auto">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  
                  {/* Gallery items grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {items.map((item, idx) => (
                      <InventoryCard
                        key={`${item.seriesId}-${item.tier}-${item.size}-${idx}`}
                        item={item}
                        onContextMenu={handleContextMenu}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onEditInEditorPro={handleEditInEditorPro}
          onPrintCertificate={handlePrintCertificate}
        />
      )}
      
      {/* Right-click hint */}
      <div className="fixed bottom-4 right-4 bg-stone-800 text-white text-xs px-3 py-2 rounded-lg opacity-70">
        💡 Right-click any image for options
      </div>
    </div>
  );
}

export default InventoryTrackerApp;
