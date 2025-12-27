// EngrainedStatusPanel.jsx — Editor panel for Engrained Series images
// Handles: P/S/I tracking, pricing, Link to Master Image, Metadata Sync
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";

// Edition size for all Engrained prints
const EDITION_SIZE = 50;

/* ---------- MasterImageLinkModal ---------- */
function MasterImageLinkModal({ isOpen, onClose, onSelect, currentLinkedId, currentLinkedPath }) {
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("galleries"); // "galleries" | "images"

  // Load gallery list - only when modal first opens, not on prop changes
  useEffect(() => {
    if (!isOpen) return;
    console.log("[MasterImageLinkModal] Opening, currentLinkedId:", currentLinkedId, "currentLinkedPath:", currentLinkedPath);
    setStep("galleries");
    setSelectedGallery(null);
    setGalleryImages([]);
    
    // Delay the fetch slightly to avoid any race conditions with parent state
    const timer = setTimeout(() => {
      fetch("/.netlify/functions/engrainedData?action=listGalleries")
        .then(res => res.json())
        .then(data => {
          console.log("[MasterImageLinkModal] Galleries loaded:", data.galleries?.length);
          setGalleries(data.galleries || []);
        })
        .catch(err => console.error("Failed to load galleries:", err));
    }, 50);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load images when gallery selected
  async function loadGalleryImages(galleryPath) {
    setLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/updateGalleryItem?datasetPath=${encodeURIComponent(galleryPath)}`);
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data.items || []);
        setStep("images");
      }
    } catch (err) {
      console.error("Failed to load gallery images:", err);
    }
    setLoading(false);
  }

  function handleSelectImage(image) {
    onSelect({
      linkedImageId: image.id,
      linkedGalleryPath: selectedGallery.path,
      masterImage: image
    });
  }

  if (!isOpen) return null;

  // Render inline (not in portal) to avoid parent state reset issues
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" style={{ pointerEvents: 'auto', opacity: 1 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()} style={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50">
          <h3 className="text-lg font-bold text-amber-800">
            {step === "galleries" ? "🔗 Select Gallery" : "🖼️ Select Master Image"}
          </h3>
          <div className="flex items-center gap-2">
            {step === "images" && (
              <button
                onClick={() => setStep("galleries")}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                ← Back to Galleries
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : step === "galleries" ? (
            /* Gallery List */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {galleries.map((g) => {
                const isCurrentlyLinked = currentLinkedPath === g.path;
                // Clean label: remove prefix and format nicely
                const displayLabel = g.label || g.path
                  .replace(/^src\/data\/Galleries\//, "")
                  .replace(/\.mjs$/, "")
                  .replace(/\//g, " / ")
                  .replace(/-/g, " ");
                return (
                  <button
                    key={g.path}
                    onClick={() => {
                      setSelectedGallery(g);
                      loadGalleryImages(g.path);
                    }}
                    className={`p-2 text-left rounded border hover:border-amber-400 hover:bg-amber-50 transition-colors ${
                      isCurrentlyLinked ? "border-green-400 bg-green-50" : "border-gray-200"
                    }`}
                  >
                    <div className="text-sm text-gray-800">
                      {displayLabel}
                    </div>
                    {isCurrentlyLinked && (
                      <div className="text-xs text-green-600">✓ Currently linked</div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Image Grid */
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {galleryImages.filter(img => img.visibility !== "hidden" && img.visibility !== "ghost").map((img) => {
                const isCurrentlyLinked = currentLinkedId === img.id;
                const thumbSrc = img.srcS || img.srcM || img.src || "";
                return (
                  <button
                    key={img.id}
                    onClick={() => handleSelectImage(img)}
                    className={`relative aspect-square rounded overflow-hidden border-2 transition-all hover:border-amber-400 ${
                      isCurrentlyLinked ? "border-green-500 ring-2 ring-green-300" : "border-gray-200"
                    }`}
                    title={img.title || img.id}
                  >
                    <img
                      src={thumbSrc}
                      alt={img.alt || img.title || img.id}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isCurrentlyLinked && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">✓ Linked</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with current link info */}
        {currentLinkedId && (
          <div className="px-4 py-2 border-t bg-gray-50 text-sm text-gray-600">
            Currently linked to: <span className="font-mono text-xs">{currentLinkedId}</span>
            {currentLinkedPath && (
              <span className="ml-2 text-xs text-gray-400">in {currentLinkedPath}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- MetadataSyncModal ---------- */
function MetadataSyncModal({ isOpen, onClose, engrainedItem, masterItem, onSync }) {
  const [copiedFields, setCopiedFields] = useState({});

  const fields = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "alt", label: "Alt Text" },
    { key: "keywords", label: "Keywords", isArray: true },
    { key: "story", label: "Story" },
    { key: "notes", label: "Collector Notes" }
  ];

  // Copy a single field - keep modal open
  function copyField(fieldKey) {
    const value = masterItem[fieldKey];
    onSync({ [fieldKey]: value }, true); // true = keep modal open
    setCopiedFields(prev => ({ ...prev, [fieldKey]: true }));
    // Reset the "copied" indicator after a short delay
    setTimeout(() => {
      setCopiedFields(prev => ({ ...prev, [fieldKey]: false }));
    }, 1500);
  }

  // Copy all fields at once - close modal after
  function copyAll() {
    const patch = {};
    fields.forEach(f => {
      patch[f.key] = masterItem[f.key];
    });
    onSync(patch, false); // false = close modal after
    const allCopied = {};
    fields.forEach(f => { allCopied[f.key] = true; });
    setCopiedFields(allCopied);
  }

  if (!isOpen) return null;

  // Use portal to escape parent opacity/pointer-events restrictions
  if (typeof document === "undefined") return null;

  // Show loading state if master data not yet available
  if (!engrainedItem || !masterItem) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" style={{ pointerEvents: 'auto', opacity: 1 }}>
        <div className="bg-white rounded-lg shadow-xl p-8 text-center mx-4" style={{ opacity: 1 }}>
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading master image data...</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Cancel
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" style={{ pointerEvents: 'auto', opacity: 1 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4" style={{ pointerEvents: 'auto', opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50">
          <h3 className="text-lg font-bold text-blue-800">🔄 Sync Metadata from Master</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Copy All button */}
        <div className="px-4 py-2 border-b bg-gray-50 flex justify-between items-center">
          <span className="text-xs text-gray-500">Click ← to copy each field from Master to Engrained</span>
          <button 
            onClick={copyAll}
            className="px-3 py-1.5 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded font-medium"
          >
            ← Copy All Fields
          </button>
        </div>

        {/* Content - Side by side comparison with per-field copy buttons */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {fields.map((field) => {
              const engVal = engrainedItem[field.key];
              const masterVal = masterItem[field.key];
              const engDisplay = field.isArray ? (engVal || []).join(", ") : (engVal || "—");
              const masterDisplay = field.isArray ? (masterVal || []).join(", ") : (masterVal || "—");
              const isDifferent = JSON.stringify(engVal) !== JSON.stringify(masterVal);
              const wasCopied = copiedFields[field.key];

              return (
                <div key={field.key} className={`border rounded-lg overflow-hidden ${isDifferent ? "border-amber-300" : "border-gray-200"}`}>
                  {/* Field Header with Copy Button */}
                  <div className={`flex items-center justify-between px-3 py-2 ${isDifferent ? "bg-amber-50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{field.label}</span>
                      {isDifferent && <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Different</span>}
                    </div>
                    <button
                      onClick={() => copyField(field.key)}
                      disabled={!isDifferent}
                      className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                        wasCopied 
                          ? "bg-green-500 text-white" 
                          : isDifferent 
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300" 
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                      title={isDifferent ? `Copy ${field.label} from Master` : "Values are identical"}
                    >
                      {wasCopied ? "✓ Copied!" : "← Copy"}
                    </button>
                  </div>

                  {/* Side by side values */}
                  <div className="grid grid-cols-2 divide-x text-sm">
                    <div className="p-3 bg-white">
                      <div className="text-xs text-gray-400 mb-1">Engrained</div>
                      <div className="text-gray-700 whitespace-pre-wrap max-h-20 overflow-auto">
                        {engDisplay}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50/50">
                      <div className="text-xs text-blue-400 mb-1">Master</div>
                      <div className="text-gray-700 whitespace-pre-wrap max-h-20 overflow-auto">
                        {masterDisplay}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- EngrainedStatusPanel ---------- */
export default function EngrainedStatusPanel({ current, backupMade, onUpdate, onSave, galleryPath, onBeforeSave }) {
  // Inventory state: { printed: 0, sold: 0, inStock: 0 }
  const [inventory, setInventory] = useState({ printed: 0, sold: 0, inStock: 0 });
  const [pendingChanges, setPendingChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Local state for price/size fields (tracks if changed from original)
  const [localImageSize, setLocalImageSize] = useState("");
  const [localPrice, setLocalPrice] = useState("");
  const [localEditionSize, setLocalEditionSize] = useState(50);
  
  // Link to Master modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [masterImage, setMasterImage] = useState(null);
  const [lastCurrentId, setLastCurrentId] = useState(null);

  // Initialize from current item - only reset when switching to a different image
  useEffect(() => {
    if (!current) return;
    
    // Only reset state if we switched to a different image
    if (current.id !== lastCurrentId) {
      setLastCurrentId(current.id);
      const inv = current.inventory || { printed: 0, sold: 0, inStock: 0 };
      setInventory({
        printed: inv.printed || 0,
        sold: inv.sold || 0,
        inStock: inv.inStock || Math.max(0, (inv.printed || 0) - (inv.sold || 0))
      });
      // Initialize local price/size from current
      setLocalImageSize(current.imageSize || "");
      setLocalPrice(current.price || "");
      setLocalEditionSize(current.editionSize || 50);
      setPendingChanges(false);
      setMasterImage(null); // Only clear when switching images, not on every update
      // Close any open modals when switching images
      setLinkModalOpen(false);
      setSyncModalOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Load master image data if linked
  useEffect(() => {
    if (!current?.linkedImageId || !current?.linkedGalleryPath) {
      setMasterImage(null);
      return;
    }
    
    // Fetch master image data
    fetch(`/.netlify/functions/updateGalleryItem?datasetPath=${encodeURIComponent(current.linkedGalleryPath)}`)
      .then(res => res.json())
      .then(data => {
        const master = (data.items || []).find(i => i.id === current.linkedImageId);
        setMasterImage(master || null);
      })
      .catch(err => {
        console.error("Failed to load master image:", err);
        setMasterImage(null);
      });
  }, [current?.linkedImageId, current?.linkedGalleryPath]);

  function updatePrinted(val) {
    const maxEdition = localEditionSize || EDITION_SIZE;
    const p = Math.max(0, Math.min(maxEdition, Number(val) || 0));
    const s = inventory.sold;
    setInventory({ printed: p, sold: s, inStock: Math.max(0, p - s) });
    setPendingChanges(true);
  }

  function updateSold(val) {
    const s = Math.max(0, Math.min(inventory.printed, Number(val) || 0));
    const p = inventory.printed;
    setInventory({ printed: p, sold: s, inStock: Math.max(0, p - s) });
    setPendingChanges(true);
  }

  async function saveInventory() {
    if (!current?.id) return;
    onBeforeSave?.(); // Save resume state before HMR triggers
    setLoading(true);
    
    try {
      // Build patch with all Engrained-specific fields
      const patch = {
        inventory: {
          printed: inventory.printed,
          sold: inventory.sold,
          inStock: inventory.inStock
        }
      };
      
      // Add price/size/editionSize if they have values
      if (localImageSize) patch.imageSize = localImageSize;
      if (localPrice) patch.price = localPrice;
      if (localEditionSize) patch.editionSize = localEditionSize;
      
      const res = await fetch("/.netlify/functions/engrainedData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateItem",
          imageId: current.id,
          patch
        })
      });
      
      if (res.ok) {
        setPendingChanges(false);
        // Update the current item in the editor with all fields
        onUpdate("_linkBatch", {
          inventory,
          imageSize: localImageSize || undefined,
          price: localPrice || undefined,
          editionSize: localEditionSize || undefined
        });
      }
    } catch (err) {
      console.error("Failed to save Engrained data:", err);
    }
    
    setLoading(false);
  }

  async function handleLinkSelect({ linkedImageId, linkedGalleryPath, masterImage: master }) {
    if (!current?.id) return;
    onBeforeSave?.(); // Save resume state before HMR triggers
    
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/engrainedData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "linkMasterImage",
          imageId: current.id,
          linkedImageId,
          linkedGalleryPath
        })
      });
      
      if (res.ok) {
        // Close modal and update state BEFORE calling parent updates
        setLinkModalOpen(false);
        setMasterImage(master);
        setLoading(false);
        // Batch update both link fields together to minimize re-renders
        onUpdate("_linkBatch", { linkedImageId, linkedGalleryPath });
      } else {
        console.error("Failed to link - server error:", await res.text());
        setLinkModalOpen(false);
        setLoading(false);
        alert("Failed to save link. Check console for details.");
      }
    } catch (err) {
      console.error("Failed to link master image:", err);
      setLinkModalOpen(false);
      setLoading(false);
      alert("Error linking image: " + err.message);
    }
  }

  async function handleMetadataSync(patch, keepOpen = false) {
    if (!current?.id || !patch || Object.keys(patch).length === 0) {
      if (!keepOpen) setSyncModalOpen(false);
      return;
    }
    
    onBeforeSave?.(); // Save resume state before HMR triggers
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/engrainedData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "syncMetadata",
          imageId: current.id,
          patch
        })
      });
      
      if (res.ok) {
        // Update local state for each synced field
        for (const [key, value] of Object.entries(patch)) {
          onUpdate(key, value);
        }
        // Only close modal if not keeping open (e.g., Copy All closes, per-field stays open)
        if (!keepOpen) setSyncModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to sync metadata:", err);
    }
    setLoading(false);
  }

  async function handleUnlink() {
    if (!current?.id) return;
    if (!confirm("Unlink this image from its master? The metadata will remain unchanged.")) return;
    onBeforeSave?.(); // Save resume state before HMR triggers
    
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/engrainedData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlinkMasterImage",
          imageId: current.id
        })
      });
      
      if (res.ok) {
        onUpdate("linkedImageId", null);
        onUpdate("linkedGalleryPath", null);
        setMasterImage(null);
      }
    } catch (err) {
      console.error("Failed to unlink:", err);
    }
    setLoading(false);
  }

  if (!current) return null;

  const editionSize = localEditionSize || EDITION_SIZE;
  const remaining = editionSize - inventory.sold;

  return (
    <div className="mt-4 p-4 border-2 border-teal-200 rounded-lg bg-teal-50">
      <h4 className="text-sm font-bold text-teal-800 mb-3 flex items-center gap-2">
        ◈ Engrained Series
        {current.linkedImageId && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            🔗 Linked
          </span>
        )}
      </h4>

      {/* Print Info - Size & Price */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs opacity-70 mb-1">Print Size</label>
          <input
            type="text"
            value={localImageSize}
            onChange={(e) => { setLocalImageSize(e.target.value); setPendingChanges(true); }}
            placeholder='e.g. 20" × 24"'
            className="w-full px-3 py-2 bg-white rounded border border-teal-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs opacity-70 mb-1">Price</label>
          <input
            type="text"
            value={localPrice}
            onChange={(e) => { setLocalPrice(e.target.value); setPendingChanges(true); }}
            placeholder="e.g. $900"
            className="w-full px-3 py-2 bg-white rounded border border-teal-200 text-sm"
          />
        </div>
      </div>

      {/* Edition Size */}
      <div className="mb-4">
        <label className="block text-xs opacity-70 mb-1">Edition Size</label>
        <input
          type="number"
          min={1}
          max={999}
          value={localEditionSize}
          onChange={(e) => { setLocalEditionSize(parseInt(e.target.value) || 50); setPendingChanges(true); }}
          className="w-24 px-3 py-2 bg-white rounded border border-teal-200 text-sm"
        />
      </div>

      {/* Edition Tracking */}
      <div className="mb-4">
        <label className="block text-xs opacity-70 mb-2">Edition Tracking (P/S/I)</label>
        <div className="flex items-center gap-4 bg-white p-3 rounded border border-teal-200">
          {/* Printed */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">P:</span>
            <input
              type="number"
              min={0}
              max={editionSize}
              value={inventory.printed}
              onChange={(e) => updatePrinted(e.target.value)}
              disabled={!backupMade || loading}
              className="w-16 px-2 py-1 text-sm border rounded text-center disabled:opacity-50"
            />
          </div>
          
          {/* Sold */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">S:</span>
            <input
              type="number"
              min={0}
              max={inventory.printed}
              value={inventory.sold}
              onChange={(e) => updateSold(e.target.value)}
              disabled={!backupMade || loading}
              className="w-16 px-2 py-1 text-sm border rounded text-center disabled:opacity-50"
            />
          </div>
          
          {/* In Stock (calculated) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">I:</span>
            <span className={`w-12 text-center font-bold ${inventory.inStock > 0 ? "text-green-600" : "text-gray-400"}`}>
              {inventory.inStock}
            </span>
          </div>
          
          {/* Remaining in Edition */}
          <div className="ml-auto text-xs text-gray-500">
            {remaining} of {editionSize} remaining
          </div>
        </div>
        
        {/* Save button */}
        {pendingChanges && (
          <button
            onClick={saveInventory}
            disabled={loading}
            className="mt-2 px-3 py-1.5 text-xs bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : "💾 Save Changes"}
          </button>
        )}
      </div>

      {/* Link to Master Image */}
      <div className="mb-4">
        <label className="block text-xs opacity-70 mb-2">Master Image Link</label>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLinkModalOpen(true); }}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300 disabled:opacity-50"
          >
            🔗 {current.linkedImageId ? "Change Link" : "Link to Master Image"}
          </button>
          
          {current.linkedImageId && masterImage && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSyncModalOpen(true); }}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 disabled:opacity-50"
            >
              🔄 Sync Metadata
            </button>
          )}
          
          {current.linkedImageId && (
            <button
              onClick={handleUnlink}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 disabled:opacity-50"
            >
              ✕ Unlink
            </button>
          )}
        </div>
        
        {/* Show linked image info */}
        {current.linkedImageId && (
          <div 
            className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs flex items-center gap-3 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
            onClick={() => setSyncModalOpen(true)}
            title="Click to sync metadata from master"
          >
            {masterImage?.srcS && (
              <img 
                src={masterImage.srcS} 
                alt={masterImage.title || "Master"} 
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <div className="font-medium text-gray-800">{masterImage?.title || current.linkedImageId}</div>
              <div className="text-gray-500">{current.linkedGalleryPath}</div>
            </div>
            <span className="text-blue-500 text-lg">🔄</span>
          </div>
        )}
      </div>

      {/* Modals */}
      <MasterImageLinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSelect={handleLinkSelect}
        currentLinkedId={current.linkedImageId}
        currentLinkedPath={current.linkedGalleryPath}
      />
      
      <MetadataSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        engrainedItem={current}
        masterItem={masterImage}
        onSync={handleMetadataSync}
      />
    </div>
  );
}
