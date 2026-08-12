// PricingEditorModal.jsx — In-app editor for series pricing & all copy
// pricingConfig.json is the SINGLE SOURCE OF TRUTH for pricing, descriptions, cardCopy, infoCopy
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleX, Save, ChevronDown, ChevronUp, Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";

// Editable size row with rename/delete and drag handle
function SizeRow({ sizeKey, price, onPriceChange, onRename, onDelete, index, onDragStart, onDragOver, onDrop, isDragging }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(sizeKey);

  function handleSave() {
    if (editValue.trim() && editValue !== sizeKey) {
      onRename(editValue.trim());
    }
    setEditing(false);
  }

  function handleCancel() {
    setEditValue(sizeKey);
    setEditing(false);
  }

  return (
    <div 
      className={`flex items-center gap-2 py-1 px-1 rounded ${isDragging ? 'bg-blue-100 opacity-50' : 'hover:bg-gray-50'}`}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
        <GripVertical className="w-4 h-4" />
      </div>
      
      {editing ? (
        <>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-20 px-2 py-1 border rounded text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={handleCancel} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <>
          <span className="text-xs text-gray-600 w-16">{sizeKey}</span>
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Rename size"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </>
      )}
      <div className="flex items-center ml-auto">
        <span className="text-gray-500 text-sm">$</span>
        <input
          type="number"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-20 px-2 py-1 border rounded text-sm text-right"
          min="0"
          step="5"
        />
        <button
          onClick={onDelete}
          className="p-1 ml-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="Delete size"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Add new size row
function AddSizeRow({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [sizeName, setSizeName] = useState("");
  const [price, setPrice] = useState(0);

  function handleAdd() {
    if (sizeName.trim()) {
      onAdd(sizeName.trim(), parseInt(price, 10) || 0);
      setSizeName("");
      setPrice(0);
      setAdding(false);
    }
  }

  function handleCancel() {
    setSizeName("");
    setPrice(0);
    setAdding(false);
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Plus className="w-3 h-3" /> Add size
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-blue-50 p-2 rounded" onMouseDown={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={sizeName}
        onChange={(e) => setSizeName(e.target.value)}
        placeholder="e.g. 8×10"
        className="w-20 px-2 py-1 border rounded text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") handleCancel();
        }}
      />
      <div className="flex items-center">
        <span className="text-gray-500 text-sm">$</span>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-20 px-2 py-1 border rounded text-sm text-right"
          min="0"
          step="5"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") handleCancel();
          }}
        />
      </div>
      <button onClick={handleAdd} className="p-1 text-green-600 hover:bg-green-100 rounded">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={handleCancel} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Draggable size list wrapper
function DraggableSizeList({ seriesKey, sizes, onPriceChange, onRename, onDelete, onReorder, onAdd }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const entries = Object.entries(sizes || {});

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDragOver(index) {
    setHoverIndex(index);
  }

  function handleDrop(toIndex) {
    if (dragIndex !== null && dragIndex !== toIndex) {
      onReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setHoverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setHoverIndex(null);
  }

  return (
    <div 
      className="space-y-1"
      onDragEnd={handleDragEnd}
    >
      {entries.map(([sizeKey, price], index) => (
        <SizeRow
          key={sizeKey}
          sizeKey={sizeKey}
          price={price}
          index={index}
          isDragging={dragIndex === index}
          onPriceChange={(val) => onPriceChange(sizeKey, val)}
          onRename={(newKey) => onRename(sizeKey, newKey)}
          onDelete={() => onDelete(sizeKey)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
      <AddSizeRow onAdd={onAdd} />
    </div>
  );
}

export default function PricingEditorModal({ isOpen, onClose }) {
  const [pricing, setPricing] = useState(null);
  const mouseDownOnBackdrop = useRef(false);
  const [descriptions, setDescriptions] = useState(null);
  const [cardCopy, setCardCopy] = useState(null);
  const [infoCopy, setInfoCopy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState(null);

  // Series labels (Engrained excluded - has its own system)
  const seriesLabels = {
    sketch: "Sketch Series",
    foundation: "Foundation Series",
    chronicle: "Chronicle Series",
    legend: "Legend Series",
  };

  // Default values (fallback if not in config)
  const defaults = {
    descriptions: {
      sketch: "Open edition proof prints on archival matte paper.",
      foundation: "Open edition archival prints in collector-friendly sizes.",
      chronicle: "Limited edition of 50, unsigned, museum-quality archival print.",
      legend: "Ultra-limited edition of 25, signed, museum-grade canvas.",
    },
    cardCopy: {
      sketch: "Open edition study prints — intimate, immediate, and tactile.\nA quiet entry point into the work.",
      foundation: "Open edition archival prints — refined, balanced, and collectible.\nWhere images begin to take their full form.",
      chronicle: "Signed, limited archival prints — historically recorded and tightly controlled.",
      legend: "Ultra-limited, signed statement works — the highest expression of the image.",
    },
    infoCopy: {
      sketch: { title: "The Sketch Series", body: "These small-format prints are the foundation of the work." },
      foundation: { title: "The Foundation Series", body: "This series represents the first formal presentation of an image." },
      chronicle: { title: "The Chronicle Series", body: "Each Chronicle image is released as a signed, limited edition." },
      legend: { title: "The Legend Series", body: "Legend works represent the final and most complete expression." },
    },
  };

  // Load pricing on open
  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  async function loadPricing() {
    setLoading(true);
    setError(null);
    try {
      const cacheBuster = Date.now();
      const res = await fetch(`/.netlify/functions/pricingConfig?_t=${cacheBuster}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPricing(data.pricing || {});
        setDescriptions(data.descriptions || defaults.descriptions);
        setCardCopy(data.cardCopy || defaults.cardCopy);
        setInfoCopy(data.infoCopy || defaults.infoCopy);
      } else {
        setPricing({});
        setDescriptions(defaults.descriptions);
        setCardCopy(defaults.cardCopy);
        setInfoCopy(defaults.infoCopy);
      }
    } catch (err) {
      console.error("Error loading pricing:", err);
      setPricing({});
      setDescriptions(defaults.descriptions);
      setCardCopy(defaults.cardCopy);
      setInfoCopy(defaults.infoCopy);
    }
    setLoading(false);
    setHasChanges(false);
  }

  async function savePricing() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/pricingConfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricing, descriptions, cardCopy, infoCopy }),
      });
      if (!res.ok) {
        throw new Error("Failed to save");
      }
      setHasChanges(false);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  function updatePrice(seriesKey, sizeKey, value) {
    const numValue = parseInt(value, 10) || 0;
    setPricing(prev => ({
      ...prev,
      [seriesKey]: {
        ...prev[seriesKey],
        [sizeKey]: numValue,
      },
    }));
    setHasChanges(true);
  }

  function updateDescription(seriesKey, value) {
    setDescriptions(prev => ({ ...prev, [seriesKey]: value }));
    setHasChanges(true);
  }

  function updateCardCopy(seriesKey, value) {
    setCardCopy(prev => ({ ...prev, [seriesKey]: value }));
    setHasChanges(true);
  }

  function updateInfoCopy(seriesKey, field, value) {
    setInfoCopy(prev => ({
      ...prev,
      [seriesKey]: { ...prev[seriesKey], [field]: value },
    }));
    setHasChanges(true);
  }

  function addSize(seriesKey, sizeName, price) {
    if (!sizeName.trim()) return;
    setPricing(prev => ({
      ...prev,
      [seriesKey]: {
        ...prev[seriesKey],
        [sizeName.trim()]: price || 0,
      },
    }));
    setHasChanges(true);
  }

  function deleteSize(seriesKey, sizeKey) {
    setPricing(prev => {
      const updated = { ...prev[seriesKey] };
      delete updated[sizeKey];
      return { ...prev, [seriesKey]: updated };
    });
    setHasChanges(true);
  }

  function renameSize(seriesKey, oldKey, newKey) {
    if (!newKey.trim() || oldKey === newKey) return;
    setPricing(prev => {
      const seriesPricing = { ...prev[seriesKey] };
      const price = seriesPricing[oldKey];
      delete seriesPricing[oldKey];
      seriesPricing[newKey.trim()] = price;
      return { ...prev, [seriesKey]: seriesPricing };
    });
    setHasChanges(true);
  }

  function reorderSizes(seriesKey, fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    setPricing(prev => {
      const entries = Object.entries(prev[seriesKey] || {});
      const [moved] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, moved);
      return { ...prev, [seriesKey]: Object.fromEntries(entries) };
    });
    setHasChanges(true);
  }

  function toggleExpanded(seriesKey) {
    setExpandedSeries(prev => prev === seriesKey ? null : seriesKey);
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-center justify-center p-4"
        onMouseDown={(e) => {
          // Only mark as backdrop click if directly on backdrop (not bubbled from children)
          mouseDownOnBackdrop.current = e.target === e.currentTarget;
        }}
        onMouseUp={(e) => {
          // Only close if BOTH mousedown AND mouseup were on the backdrop
          if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
            onClose();
          }
          mouseDownOnBackdrop.current = false;
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-amber-50">
            <h2 className="text-lg font-bold text-amber-900">💰 Edit Pricing & Copy</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-amber-100 rounded-full transition-colors"
            >
              <CircleX className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[65vh]">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : pricing && descriptions && cardCopy && infoCopy ? (
              <div className="space-y-3">
                {Object.entries(seriesLabels).map(([seriesKey, label]) => {
                  const isExpanded = expandedSeries === seriesKey;
                  return (
                    <div key={seriesKey} className="border rounded-lg bg-gray-50 overflow-hidden">
                      {/* Collapsed header - always visible */}
                      <button
                        onClick={() => toggleExpanded(seriesKey)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
                      >
                        <h3 className="font-semibold text-gray-800 text-sm">{label}</h3>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div 
                          className="px-3 pb-3 space-y-3 border-t"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {/* Description (short, for editor reference) */}
                          <div className="mt-3">
                            <label className="text-xs text-gray-500 block mb-1">Description (editor reference)</label>
                            <textarea
                              value={descriptions[seriesKey] || ""}
                              onChange={(e) => updateDescription(seriesKey, e.target.value)}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 border rounded text-sm resize-y min-h-[3rem]"
                              rows={2}
                            />
                          </div>

                          {/* Card Copy (popup card text) */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Card Copy (popup text)</label>
                            <textarea
                              value={cardCopy[seriesKey] || ""}
                              onChange={(e) => updateCardCopy(seriesKey, e.target.value)}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 border rounded text-sm resize-y min-h-[4rem]"
                              rows={3}
                            />
                          </div>

                          {/* Info Copy (hover/overlay text) */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Info Title (ℹ️ overlay)</label>
                            <input
                              type="text"
                              value={infoCopy[seriesKey]?.title || ""}
                              onChange={(e) => updateInfoCopy(seriesKey, "title", e.target.value)}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Info Body (ℹ️ overlay)</label>
                            <textarea
                              value={infoCopy[seriesKey]?.body || ""}
                              onChange={(e) => updateInfoCopy(seriesKey, "body", e.target.value)}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 border rounded text-sm resize-y min-h-[5rem]"
                              rows={4}
                            />
                          </div>

                          {/* Pricing */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Pricing (drag to reorder)</label>
                            <DraggableSizeList
                              seriesKey={seriesKey}
                              sizes={pricing[seriesKey]}
                              onPriceChange={(sizeKey, val) => updatePrice(seriesKey, sizeKey, val)}
                              onRename={(oldKey, newKey) => renameSize(seriesKey, oldKey, newKey)}
                              onDelete={(sizeKey) => deleteSize(seriesKey, sizeKey)}
                              onReorder={(from, to) => reorderSizes(seriesKey, from, to)}
                              onAdd={(name, price) => addSize(seriesKey, name, price)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <span className="text-xs text-gray-500">
              {hasChanges ? "⚠️ Unsaved changes" : "✓ All saved"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={savePricing}
                disabled={!hasChanges || saving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
