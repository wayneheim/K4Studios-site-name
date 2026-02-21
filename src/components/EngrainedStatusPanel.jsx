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
/**
 * SIMPLE BEHAVIOR:
 * - "→ Copy" on Engrained: Copies Engrained text → Master text box (LOCAL only)
 * - "← Copy" on Master: Copies Master text → Engrained text box (LOCAL only)
 * - "💾" Save button appears when a Master field was edited - saves that field to Master file
 * - "Save N Master Edits" at top: Saves all edited Master fields to Master file
 * - Engrained side: NEVER saves from this modal - passes back to Editor Pro via "Apply"
 */
function MetadataSyncModal({ isOpen, onClose, engrainedItem, masterItem, masterGalleryPath, onSync, onMasterUpdated }) {
  // Local state for Engrained values - editable, passed back to Editor Pro
  const [engValues, setEngValues] = useState({});
  // Local state for Master values - editable, can save to file
  const [masterValues, setMasterValues] = useState({});
  // Track which master fields were edited (need saving)
  const [masterEdited, setMasterEdited] = useState({});
  // UI state
  const [saving, setSaving] = useState(false);
  // Flash state: { field: 'title', type: 'eng-copy' | 'mas-copy' | 'mas-save' }
  const [flash, setFlash] = useState(null);

  const fields = [
    { key: "title", label: "Title", multiline: false },
    { key: "description", label: "Description", multiline: true },
    { key: "alt", label: "Alt Text", multiline: false },
    { key: "keywords", label: "Keywords", isArray: true },
    { key: "story", label: "Story", multiline: true },
    { key: "notes", label: "Collector Notes", multiline: true }
  ];

  // Track if we've initialized this session
  const [initialized, setInitialized] = useState(false);

  // Initialize state when modal opens (only once per open)
  useEffect(() => {
    if (isOpen && engrainedItem && masterItem && !initialized) {
      const eng = {};
      const mas = {};
      fields.forEach(f => {
        eng[f.key] = engrainedItem[f.key];
        mas[f.key] = masterItem[f.key];
      });
      setEngValues(eng);
      setMasterValues(mas);
      setMasterEdited({});
      setFlash(null);
      setInitialized(true);
    }
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen, engrainedItem?.id, masterItem?.id, initialized]);

  // Helper functions
  function toDisplayString(val, isArray) {
    if (isArray) return (val || []).join(", ");
    return val || "";
  }

  function fromDisplayString(str, isArray) {
    if (isArray) return str.split(",").map(s => s.trim()).filter(Boolean);
    return str;
  }

  function showFlash(fieldKey, type) {
    setFlash({ field: fieldKey, type });
    setTimeout(() => setFlash(null), 800);
  }

  // Copy Engrained → Master box (LOCAL only)
  function copyEngToMaster(fieldKey, e) {
    e.stopPropagation();
    e.preventDefault();
    const val = engValues[fieldKey];
    setMasterValues(prev => ({ ...prev, [fieldKey]: val }));
    setMasterEdited(prev => ({ ...prev, [fieldKey]: true }));
    showFlash(fieldKey, 'eng-copy');
  }

  // Copy Master → Engrained box (LOCAL only)
  function copyMasterToEng(fieldKey, e) {
    e.stopPropagation();
    e.preventDefault();
    const val = masterValues[fieldKey];
    setEngValues(prev => ({ ...prev, [fieldKey]: val }));
    showFlash(fieldKey, 'mas-copy');
  }

  // Save a single Master field to file
  async function saveMasterField(fieldKey, e) {
    e.stopPropagation();
    e.preventDefault();
    
    if (!masterGalleryPath || !masterItem?.id) {
      alert("Cannot save: No master image linked");
      return;
    }
    
    const value = masterValues[fieldKey];
    console.log(`[Save Master ${fieldKey}]`, value);
    
    setSaving(true);
    try {
      const res = await fetch("/.netlify/functions/updateGalleryItem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetPath: masterGalleryPath,
          id: masterItem.id,
          patch: { [fieldKey]: value }
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      console.log(`[Save Master ${fieldKey}] Success!`);
      setMasterEdited(prev => ({ ...prev, [fieldKey]: false }));
      showFlash(fieldKey, 'mas-save');
      // Refresh parent's master data after a delay so modal doesn't close
      setTimeout(() => {
        if (onMasterUpdated) onMasterUpdated();
      }, 500);
    } catch (err) {
      console.error(`[Save Master ${fieldKey}] Error:`, err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Save ALL edited Master fields
  async function saveAllMasterEdits() {
    if (!masterGalleryPath || !masterItem?.id) {
      alert("Cannot save: No master image linked");
      return;
    }
    
    const patch = {};
    fields.forEach(f => {
      if (masterEdited[f.key]) {
        patch[f.key] = masterValues[f.key];
      }
    });
    
    if (Object.keys(patch).length === 0) {
      alert("No master edits to save!");
      return;
    }
    
    console.log("[Save All Master]", patch);
    
    setSaving(true);
    try {
      const res = await fetch("/.netlify/functions/updateGalleryItem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetPath: masterGalleryPath,
          id: masterItem.id,
          patch
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      console.log("[Save All Master] Success!");
      setMasterEdited({});
      // Refresh parent's master data after a delay so modal doesn't close
      setTimeout(() => {
        if (onMasterUpdated) onMasterUpdated();
      }, 500);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Apply Engrained changes back to parent and close
  function handleApply() {
    const patch = {};
    fields.forEach(f => {
      const original = engrainedItem?.[f.key];
      const current = engValues[f.key];
      if (JSON.stringify(original) !== JSON.stringify(current)) {
        patch[f.key] = current;
      }
    });
    
    if (Object.keys(patch).length > 0) {
      console.log("[Apply Engrained]", patch);
      onSync(patch, false);
    }
    onClose();
  }

  // Count how many Engrained fields changed (vs original)
  const engChangedCount = fields.filter(f => {
    return JSON.stringify(engrainedItem?.[f.key]) !== JSON.stringify(engValues[f.key]);
  }).length;

  // Count Master edits pending save
  const masterEditCount = fields.filter(f => masterEdited[f.key]).length;

  if (!isOpen) return null;
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

  // Count differences between Engrained and Master
  const diffCount = fields.filter(f => {
    return JSON.stringify(engValues[f.key]) !== JSON.stringify(masterValues[f.key]);
  }).length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" style={{ pointerEvents: 'auto', opacity: 1 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4" style={{ pointerEvents: 'auto', opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-amber-50">
          <h3 className="text-lg font-bold text-gray-800">🔄 Sync Metadata</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Bulk action buttons */}
        <div className="px-4 py-2 border-b bg-gray-50 flex justify-between items-center gap-2">
          <button 
            onClick={() => {
              // Copy ALL Master → Engrained (local only)
              fields.forEach(f => {
                const masVal = masterValues[f.key];
                setEngValues(prev => ({ ...prev, [f.key]: masVal }));
              });
            }}
            disabled={saving || diffCount === 0}
            className="px-3 py-1.5 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded font-medium disabled:opacity-50"
          >
            {diffCount > 0 ? `← Copy All from Master` : "In Sync ✓"}
          </button>
          
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-500">Engrained ↔ Master</span>
            {engChangedCount > 0 && (
              <span className="text-xs text-blue-600 ml-2">({engChangedCount} Engrained change{engChangedCount > 1 ? 's' : ''})</span>
            )}
            {masterEditCount > 0 && (
              <span className="text-xs text-green-600 ml-2">({masterEditCount} Master edit{masterEditCount > 1 ? 's' : ''} to save)</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                // Copy ALL Engrained → Master (local only)
                fields.forEach(f => {
                  const engVal = engValues[f.key];
                  const masVal = masterValues[f.key];
                  if (JSON.stringify(engVal) !== JSON.stringify(masVal)) {
                    setMasterValues(prev => ({ ...prev, [f.key]: engVal }));
                    setMasterEdited(prev => ({ ...prev, [f.key]: true }));
                  }
                });
              }}
              disabled={saving || diffCount === 0}
              className="px-3 py-1.5 text-xs bg-amber-500 text-white hover:bg-amber-600 rounded font-medium disabled:opacity-50"
            >
              {diffCount > 0 ? `Copy All to Master →` : "In Sync ✓"}
            </button>
            {masterEditCount > 0 && (
              <button 
                onClick={saveAllMasterEdits}
                disabled={saving}
                className="px-3 py-1.5 text-xs bg-green-500 text-white hover:bg-green-600 rounded font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : `💾 Save ${masterEditCount} to File`}
              </button>
            )}
          </div>
        </div>

        {/* Content - Side by side comparison with per-field copy buttons */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {fields.map((field) => {
              const engVal = engValues[field.key];
              const masVal = masterValues[field.key];
              const engStr = toDisplayString(engVal, field.isArray);
              const masStr = toDisplayString(masVal, field.isArray);
              const isDifferent = JSON.stringify(engVal) !== JSON.stringify(masVal);
              // Check flash state per-button
              const engCopyFlash = flash?.field === field.key && flash?.type === 'eng-copy';
              const masCopyFlash = flash?.field === field.key && flash?.type === 'mas-copy';
              const masSaveFlash = flash?.field === field.key && flash?.type === 'mas-save';

              return (
                <div key={field.key} className={`border rounded-lg overflow-hidden ${isDifferent ? "border-amber-300" : "border-gray-200"}`}>
                  {/* Field Header with label and difference indicator */}
                  <div className={`flex items-center justify-between px-3 py-2 ${isDifferent ? "bg-amber-50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{field.label}</span>
                      {isDifferent && <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Different</span>}
                    </div>
                  </div>

                  {/* Side by side values with directional buttons */}
                  <div className="grid grid-cols-[1fr_auto_1fr] text-sm">
                    {/* Engrained column - EDITABLE */}
                    <div className="p-3 bg-white border-r">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Engrained</span>
                        <button
                          onClick={(e) => copyEngToMaster(field.key, e)}
                          disabled={!isDifferent || saving}
                          className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                            engCopyFlash
                              ? "bg-green-500 text-white" 
                              : isDifferent 
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300" 
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          title={isDifferent ? `Copy to Master box (local only)` : "Values are identical"}
                        >
                          {engCopyFlash ? "✓ Copied" : "→ Copy"}
                        </button>
                      </div>
                      {/* Editable input/textarea */}
                      {field.multiline ? (
                        <textarea
                          value={engStr}
                          onChange={(e) => {
                            const newVal = fromDisplayString(e.target.value, field.isArray);
                            setEngValues(prev => ({ ...prev, [field.key]: newVal }));
                          }}
                          className="w-full text-gray-700 text-sm border rounded p-1.5 min-h-[60px] max-h-32 resize-y focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={engStr}
                          onChange={(e) => {
                            const newVal = fromDisplayString(e.target.value, field.isArray);
                            setEngValues(prev => ({ ...prev, [field.key]: newVal }));
                          }}
                          className="w-full text-gray-700 text-sm border rounded p-1.5 focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                        />
                      )}
                    </div>

                    {/* Center divider with arrows */}
                    <div className="flex flex-col items-center justify-center px-1 bg-gray-100 text-gray-400 text-xs">
                      <span>↔</span>
                    </div>

                    {/* Master column - EDITABLE with Save button */}
                    <div className="p-3 bg-blue-50/50 border-l">
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={(e) => copyMasterToEng(field.key, e)}
                          disabled={!isDifferent}
                          className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                            masCopyFlash
                              ? "bg-green-500 text-white" 
                              : isDifferent 
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300" 
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          title={isDifferent ? `Copy to Engrained box (local only)` : "Values are identical"}
                        >
                          {masCopyFlash ? "✓ Copied" : "← Copy"}
                        </button>
                        <div className="flex items-center gap-1">
                          {/* Save button - only shows when Master text was edited */}
                          {masterEdited[field.key] && (
                            <button
                              onClick={(e) => saveMasterField(field.key, e)}
                              disabled={saving}
                              className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                                masSaveFlash
                                  ? "bg-green-500 text-white"
                                  : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                              }`}
                              title="Save this edit to Master file"
                            >
                              {masSaveFlash ? "✓ Saved!" : "💾 Save"}
                            </button>
                          )}
                          <span className="text-xs text-blue-400">Master</span>
                        </div>
                      </div>
                      {/* Editable Master field */}
                      {field.multiline ? (
                        <textarea
                          value={masStr}
                          onChange={(e) => {
                            const newVal = fromDisplayString(e.target.value, field.isArray);
                            setMasterValues(prev => ({ ...prev, [field.key]: newVal }));
                            setMasterEdited(prev => ({ ...prev, [field.key]: true }));
                          }}
                          className={`w-full text-gray-700 text-sm border rounded p-1.5 min-h-[60px] max-h-32 resize-y focus:ring-1 focus:ring-blue-300 focus:border-blue-300 bg-white ${masterEdited[field.key] ? 'border-green-400 bg-green-50' : 'border-blue-200'}`}
                          placeholder={`Master ${field.label.toLowerCase()}...`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={masStr}
                          onChange={(e) => {
                            const newVal = fromDisplayString(e.target.value, field.isArray);
                            setMasterValues(prev => ({ ...prev, [field.key]: newVal }));
                            setMasterEdited(prev => ({ ...prev, [field.key]: true }));
                          }}
                          className={`w-full text-gray-700 text-sm border rounded p-1.5 focus:ring-1 focus:ring-blue-300 focus:border-blue-300 bg-white ${masterEdited[field.key] ? 'border-green-400 bg-green-50' : 'border-blue-200'}`}
                          placeholder={`Master ${field.label.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {engChangedCount > 0 ? (
              <span className="text-amber-600">⚠ {engChangedCount} Engrained field(s) changed - click Apply to keep</span>
            ) : masterEditCount > 0 ? (
              <span className="text-green-600">💾 {masterEditCount} Master edit(s) pending - Save to commit</span>
            ) : (
              <span>Copy buttons transfer locally • 💾 Save commits to file</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className={`px-4 py-2 text-sm rounded ${
                engChangedCount > 0 
                  ? "bg-blue-500 text-white hover:bg-blue-600" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {engChangedCount > 0 ? `Apply ${engChangedCount} Changes` : "Done"}
            </button>
          </div>
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
  const [localYearCreated, setLocalYearCreated] = useState(""); // Year the artwork was created
  
  // Link to Master modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [masterImage, setMasterImage] = useState(null);
  const [lastCurrentId, setLastCurrentId] = useState(null);

  // Load edition state from editionState.json when switching images
  async function loadEditionState(imageId) {
    console.log("[EditionState] Loading for:", imageId);
    try {
      // Add cache-busting timestamp to prevent browser caching
      const cacheBuster = Date.now();
      const res = await fetch(`/.netlify/functions/editionState?imageId=${encodeURIComponent(imageId)}&_t=${cacheBuster}`, {
        cache: 'no-store'
      });
      console.log("[EditionState] Response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[EditionState] Response data:", data);
        // Use canonical ID for engrained series
        const canonicalId = data.canonicalId || imageId;
        const engrainedState = data.states?.engrained;
        console.log("[EditionState] Engrained state:", engrainedState);
        if (engrainedState) {
          const printed = engrainedState.printed || 0;
          const sold = engrainedState.sold || 0;
          setInventory({
            printed,
            sold,
            inStock: Math.max(0, printed - sold)
          });
          // Also get edition limit from the state if set
          if (engrainedState.editionLimit) {
            setLocalEditionSize(engrainedState.editionLimit);
          }
          console.log("[EditionState] Loaded:", { imageId, canonicalId, printed, sold });
          return;
        }
      } else {
        console.error("[EditionState] Non-OK response:", res.status, await res.text());
      }
    } catch (err) {
      console.error("[EditionState] Failed to load:", err);
    }
    // Fallback to zeros if no state found
    console.log("[EditionState] No data found, using zeros");
    setInventory({ printed: 0, sold: 0, inStock: 0 });
  }

  // Initialize from current item - only reset when switching to a different image
  useEffect(() => {
    if (!current) return;
    
    // Only reset state if we switched to a different image
    if (current.id !== lastCurrentId) {
      setLastCurrentId(current.id);
      
      // Load inventory from editionState.json (canonical source)
      loadEditionState(current.id);
      
      // Initialize local price/size from current item's .mjs data
      setLocalImageSize(current.imageSize || "");
      setLocalPrice(current.price || "");
      setLocalEditionSize(current.editionSize || 50);
      setLocalYearCreated(current.yearCreated || "");
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
    fetchMasterImage();
  }, [current?.linkedImageId, current?.linkedGalleryPath]);

  // Function to fetch/refresh master image data
  async function fetchMasterImage() {
    if (!current?.linkedImageId || !current?.linkedGalleryPath) {
      setMasterImage(null);
      return;
    }
    try {
      const res = await fetch(`/.netlify/functions/updateGalleryItem?datasetPath=${encodeURIComponent(current.linkedGalleryPath)}`);
      const data = await res.json();
      const master = (data.items || []).find(i => i.id === current.linkedImageId);
      console.log("[fetchMasterImage] Loaded master:", master?.title);
      setMasterImage(master || null);
    } catch (err) {
      console.error("Failed to load master image:", err);
      setMasterImage(null);
    }
  }

  function updatePrinted(val) {
    const maxEdition = localEditionSize || EDITION_SIZE;
    const p = Math.max(0, Math.min(maxEdition, Number(val) || 0));
    // If reducing printed below sold, also reduce sold
    const s = Math.min(inventory.sold, p);
    setInventory({ printed: p, sold: s, inStock: Math.max(0, p - s) });
    setPendingChanges(true);
  }

  function updateSold(val) {
    const maxEdition = localEditionSize || EDITION_SIZE;
    const s = Math.max(0, Math.min(maxEdition, Number(val) || 0));
    // If sold > printed, auto-increase printed to match
    const p = Math.max(inventory.printed, s);
    setInventory({ printed: p, sold: s, inStock: Math.max(0, p - s) });
    setPendingChanges(true);
  }

  async function saveInventory() {
    if (!current?.id) return;
    onBeforeSave?.(); // Save resume state before HMR triggers
    setLoading(true);
    
    try {
      // 1. Save inventory to editionState.json (canonical source for P/S tracking)
      // First, ensure the edition state exists (create if needed)
      const checkRes = await fetch(`/.netlify/functions/editionState?imageId=${encodeURIComponent(current.id)}`);
      const checkData = await checkRes.json();
      
      if (!checkData.states?.engrained) {
        // Create the edition state first
        console.log("[EditionState] Creating new engrained state for", current.id);
        await fetch("/.netlify/functions/editionState", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            imageId: current.id,
            series: "engrained"
          })
        });
      }
      
      // Set printed count
      await fetch("/.netlify/functions/editionState", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setPrinted",
          imageId: current.id,
          series: "engrained",
          data: { printed: inventory.printed }
        })
      });
      
      // Set sold count  
      await fetch("/.netlify/functions/editionState", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setSold",
          imageId: current.id,
          series: "engrained",
          data: { sold: inventory.sold }
        })
      });
      
      console.log("[EditionState] Saved P/S:", { imageId: current.id, printed: inventory.printed, sold: inventory.sold });
      
      // 2. Save price/size/editionSize to .mjs file via engrainedData
      const patch = {};
      if (localImageSize) patch.imageSize = localImageSize;
      if (localPrice) patch.price = localPrice;
      if (localEditionSize) patch.editionSize = localEditionSize;
      if (localYearCreated) patch.yearCreated = localYearCreated;
      
      if (Object.keys(patch).length > 0) {
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
          // Update the current item in the editor with metadata fields
          onUpdate("_linkBatch", {
            imageSize: localImageSize || undefined,
            price: localPrice || undefined,
            editionSize: localEditionSize || undefined,
            yearCreated: localYearCreated || undefined
          });
        }
      }
      
      setPendingChanges(false);
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

      {/* Year Created */}
      <div className="mb-4">
        <label className="block text-xs opacity-70 mb-1">Year Created</label>
        <input
          type="text"
          value={localYearCreated}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
            setLocalYearCreated(val);
            setPendingChanges(true);
          }}
          placeholder="e.g. 2024"
          className="w-24 px-3 py-2 bg-white rounded border border-teal-200 text-sm"
          maxLength={4}
        />
        <span className="ml-2 text-xs text-gray-500">For Certificate of Authenticity</span>
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
              disabled={loading}
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
              disabled={loading}
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
        masterGalleryPath={current.linkedGalleryPath}
        onSync={handleMetadataSync}
        onMasterUpdated={fetchMasterImage}
      />
    </div>
  );
}
