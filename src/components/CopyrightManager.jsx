// src/components/CopyrightManager.jsx
// Gallery Copyright Manager - Manual catch-up and quarterly registration workflow
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  checkCopyrightStatus,
  bulkCheckCopyrightStatus,
  markAsRegistered,
  updateRegistration,
  removeRegistration,
  batchMarkAsRegistered,
  getQuarterlyBatch,
  listQuarterlyBatches,
  getQuarterlySummary,
  addToQuarterlyBatch,
  removeFromQuarterlyBatch,
  approveQuarterlyBatch,
  markAsSubmitted,
  recordSubmission,
  processQuarterlyBatch,
  getCurrentQuarter,
  getRegistry,
  downloadAsFile,
  generateLedgerCSV
} from "../utils/copyrightApi.js";

// ---------- Config ----------
const DATA_ROOTS = [
  "/src/data/Galleries",
  "/src/pages/Other",
  "/src/data/Other",
];

// ---------- Helpers ----------
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
  return segs.join(" / ");
}

// Get label without section prefix (for grouped display)
function getLabelWithoutSection(fullPath) {
  const rel = stripRoot(fullPath).replace(/\.mjs$/i, "");
  const segs = rel.split("/").map((s) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
  );
  // Skip the first segment (section folder like "Painterly Fine Art Photography")
  return segs.slice(1).join(" / ") || segs[0];
}

// Extract section from gallery path for grouping
function getSectionFromPath(fullPath) {
  const rel = stripRoot(fullPath);
  if (rel.startsWith("Painterly-Fine-Art-Photography/")) return "Painterly Fine Art";
  if (rel.startsWith("Fine-Art-Photography/")) return "Fine Art";
  if (rel.startsWith("Engrained/")) return "Engrained";
  return "Other";
}

// Section styling config
const SECTION_STYLES = {
  "Painterly Fine Art": { 
    bg: "bg-purple-50", 
    border: "border-purple-200",
    header: "bg-purple-100 text-purple-800",
    dot: "bg-purple-500"
  },
  "Fine Art": { 
    bg: "bg-blue-50", 
    border: "border-blue-200",
    header: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500"
  },
  "Engrained": { 
    bg: "bg-amber-50", 
    border: "border-amber-200",
    header: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500"
  },
  "Other": { 
    bg: "bg-gray-50", 
    border: "border-gray-200",
    header: "bg-gray-100 text-gray-700",
    dot: "bg-gray-500"
  }
};

function pickImage(d = {}) {
  return d.srcS || d.srcM || d.srcL || d.srcXL || d.src || d.url || "";
}

function isRealItem(d) { return d && d.id !== "i-k4studios"; }

// ---------- Styles ----------
const btnBase = "px-3 py-1.5 rounded-md border inline-flex items-center gap-2 transition-colors duration-150 text-sm font-medium";
const btnPrimary = "bg-blue-600 border-blue-700 text-white hover:bg-blue-700";
const btnSecondary = "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200";
const btnSuccess = "bg-green-600 border-green-700 text-white hover:bg-green-700";
const btnWarning = "bg-amber-500 border-amber-600 text-white hover:bg-amber-600";
const btnDanger = "bg-red-600 border-red-700 text-white hover:bg-red-700";

// Status badge styles
const badgeRegistered = "bg-green-100 text-green-800 border-green-300";
const badgePending = "bg-amber-100 text-amber-800 border-amber-300";
const badgeUnregistered = "bg-gray-100 text-gray-600 border-gray-300";

// ---------- Sub-Components ----------

// Badge style for submitted (blue)
const badgeSubmitted = "bg-blue-100 text-blue-800 border-blue-300";

function StatusBadge({ status }) {
  if (status.is_registered) {
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${badgeRegistered}`}>
        ✓ Registered
      </span>
    );
  }
  if (status.is_submitted) {
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${badgeSubmitted}`}>
        <span className="font-bold">P</span> Submitted
      </span>
    );
  }
  if (status.in_pending_batch) {
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${badgePending}`}>
        ⏳ Pending ({status.pending_quarter})
      </span>
    );
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${badgeUnregistered}`}>
      ○ Unregistered
    </span>
  );
}

function ImageCard({ image, status, selected, onToggle, onMarkRegistered, onEditRegistration, onRemoveRegistration }) {
  const thumbnail = pickImage(image);
  
  return (
    <div 
      className={`relative border rounded-lg overflow-hidden transition-all ${
        selected ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-200"
      } ${status.is_registered ? "opacity-60" : ""}`}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 relative">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={image.title || image.id}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
        
        {/* Selection checkbox - show for unregistered and pending */}
        {!status.is_registered && (
          <label className="absolute top-2 left-2 bg-white/80 rounded p-0.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(image.id)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        )}
        
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={status} />
        </div>
      </div>
      
      {/* Info */}
      <div className="p-2 space-y-1">
        <div className="text-xs font-mono text-gray-500 truncate">{image.id}</div>
        <div className="text-sm font-medium truncate" title={image.title}>
          {image.title || "Untitled"}
        </div>
        {image.first_seen && (
          <div className="text-xs text-gray-500">
            First seen: {image.first_seen}
          </div>
        )}
        
        {/* Quick actions */}
        {!status.is_registered && !status.in_pending_batch && (
          <button
            onClick={() => onMarkRegistered(image)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Mark as registered →
          </button>
        )}
        
        {status.is_registered && status.registration && (
          <div className="text-xs text-gray-500">
            {status.registration.registration_number}
            <br />
            {status.registration.batch_id}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => onEditRegistration(image, status.registration)}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onRemoveRegistration(image)}
                className="text-red-600 hover:text-red-800 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MarkRegisteredModal({ image, existingRegistration, onClose, onSave, onRemove }) {
  const isEdit = !!existingRegistration;
  const [regNumber, setRegNumber] = useState(existingRegistration?.registration_number || "");
  const [subDate, setSubDate] = useState(existingRegistration?.submission_date || new Date().toISOString().split("T")[0]);
  const [batchId, setBatchId] = useState(existingRegistration?.batch_id || "LEGACY");
  const [notes, setNotes] = useState(existingRegistration?.notes || "");
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        imageId: image.id,
        registration_number: regNumber || "MANUAL-ENTRY",
        submission_date: subDate,
        batch_id: batchId,
        title_at_submission: image.title,
        notes
      });
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleRemove = async () => {
    if (!confirm(`Remove registration for ${image.id}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await onRemove(image.id);
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold mb-4">
          {isEdit ? "Edit Registration" : "Mark as Registered"}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image ID
            </label>
            <input
              type="text"
              value={image.id}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number
            </label>
            <input
              type="text"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="e.g., VA 2-345-678"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission Date
            </label>
            <input
              type="date"
              value={subDate}
              onChange={(e) => setSubDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch ID
            </label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g., LEGACY or 2024-Q1-A"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          {isEdit && (
            <button
              onClick={handleRemove}
              className={`${btnBase} ${btnDanger}`}
              disabled={saving}
            >
              Remove Registration
            </button>
          )}
          <div className={`flex gap-3 ${isEdit ? "" : "ml-auto"}`}>
          <button
            onClick={onClose}
            className={`${btnBase} ${btnSecondary}`}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`${btnBase} ${btnSuccess}`}
            disabled={saving}
          >
            {saving ? "Saving..." : (isEdit ? "Update" : "Save")}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchMarkModal({ count, onClose, onSave }) {
  const [regNumber, setRegNumber] = useState("");
  const [subDate, setSubDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchId, setBatchId] = useState("LEGACY");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        registration_number: regNumber || "MANUAL-ENTRY",
        submission_date: subDate,
        batch_id: batchId,
        notes
      });
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold mb-4">Batch Mark as Registered</h3>
        <p className="text-gray-600 mb-4">
          Mark <strong>{count}</strong> selected images as already registered.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number
            </label>
            <input
              type="text"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="e.g., VA 2-345-678"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission Date
            </label>
            <input
              type="date"
              value={subDate}
              onChange={(e) => setSubDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch ID
            </label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g., LEGACY or 2024-Q1-A"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className={`${btnBase} ${btnSecondary}`}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`${btnBase} ${btnSuccess}`}
            disabled={saving}
          >
            {saving ? "Saving..." : `Mark ${count} Images`}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuarterlyReviewPanel({ quarter, onClose, onRefresh }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [regNumbers, setRegNumbers] = useState({});
  
  useEffect(() => {
    loadSummary();
  }, [quarter]);
  
  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getQuarterlySummary(quarter);
      setSummary(data);
      // Initialize reg numbers from existing data
      const batch = await getQuarterlyBatch(quarter);
      if (batch?.submissions) {
        const nums = {};
        for (const [group, info] of Object.entries(batch.submissions)) {
          if (info.registration_number) {
            nums[group] = info.registration_number;
          }
        }
        setRegNumbers(nums);
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async () => {
    if (!confirm("Approve this batch? This will assign submission groups.")) return;
    setProcessing(true);
    try {
      await approveQuarterlyBatch(quarter);
      await loadSummary();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleRecordSubmission = async (group) => {
    const regNum = regNumbers[group];
    if (!regNum) {
      alert("Please enter a registration number");
      return;
    }
    setProcessing(true);
    try {
      await recordSubmission({ quarter, group, registration_number: regNum });
      await loadSummary();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleMarkAsSubmitted = async () => {
    if (!confirm("Mark as submitted? This confirms the files have been sent to the Copyright Office.")) return;
    setProcessing(true);
    try {
      await markAsSubmitted(quarter);
      await loadSummary();
      onRefresh?.();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleProcess = async () => {
    if (!confirm("Process this batch? This will update the master registry and cannot be undone.")) return;
    setProcessing(true);
    try {
      await processQuarterlyBatch(quarter);
      await loadSummary();
      onRefresh?.();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };
  
  // Helper to trigger file download
  const downloadTextFile = (content, filename) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  
  // Helper to extract SmugMug name from URL and create filename with _i-xxxx suffix
  const getFilenameFromUrl = (url, imageId) => {
    if (!url) return `${imageId}.jpg`;
    try {
      const urlPath = new URL(url).pathname;
      const originalName = decodeURIComponent(urlPath.split("/").pop());
      // Remove size suffix like -M.jpg or -S.jpg
      const baseName = originalName.replace(/-[SMLX]+\.jpg$/i, "").replace(/\.jpg$/i, "");
      return `${baseName}_${imageId}.jpg`;
    } catch {
      return `${imageId}.jpg`;
    }
  };
  
  // Download CSV file
  const handleDownloadCSV = () => {
    if (!summary?.images) return;
    
    const rows = ["Filename,Title"];
    summary.images.forEach(img => {
      const filename = getFilenameFromUrl(img.download_url, img.id);
      const title = (img.title || "Untitled").replace(/"/g, '""');
      rows.push(`${filename},"${title}"`);
    });
    
    downloadTextFile(rows.join("\n"), `${quarter}-submission.csv`);
  };
  
  // Download BAT file - self-contained, uses PowerShell (built into Windows)
  const handleDownloadBAT = () => {
    if (!summary?.images) return;
    
    // Build the list of URLs and filenames (with SmugMug name + _i-xxxx)
    const imageData = summary.images
      .filter(img => img.download_url)
      .map(img => {
        const filename = getFilenameFromUrl(img.download_url, img.id);
        return `@{url='${img.download_url}';name='${filename}'}`;
      })
      .join(",");
    
    const batContent = `@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   K4 Studios Copyright Image Downloader
echo   Quarter: ${quarter}
echo   Images: ${summary.images.length}
echo ========================================
echo.
echo This will download images to an "images" folder
echo in the same location as this file.
echo.
pause

PowerShell -ExecutionPolicy Bypass -NoProfile -Command "$ProgressPreference='SilentlyContinue'; $dir=Join-Path (Split-Path -Parent '%~f0') 'images'; if(!(Test-Path $dir)){mkdir $dir|Out-Null}; Write-Host 'Saving to:' $dir; Write-Host ''; $images=@(${imageData}); foreach($img in $images){ Write-Host ('  '+$img.name+'...') -NoNewline; try{ Invoke-WebRequest -Uri $img.url -OutFile (Join-Path $dir $img.name) -UseBasicParsing; Write-Host ' OK' -ForegroundColor Green }catch{ Write-Host ' FAILED' -ForegroundColor Red }}; Write-Host ''; Write-Host 'DONE!' -ForegroundColor Green"

echo.
echo ========================================
echo   Download complete!
echo   Check the "images" folder.
echo ========================================
pause
`;
    downloadTextFile(batContent, `RUN-COPYRIGHT-${quarter}.cmd`);
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quarterly data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold">{quarter} Quarterly Review</h3>
            <p className="text-gray-500">
              Status: <span className="font-medium capitalize">{summary?.status || "empty"}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        
        {summary?.total_images === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No images in this quarterly batch.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{summary?.total_images || 0}</div>
                <div className="text-sm text-gray-600">Total Images</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{summary?.submission_count || 0}</div>
                <div className="text-sm text-gray-600">Submissions</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.ceil((summary?.total_images || 0) / 750)}
                </div>
                <div className="text-sm text-gray-600">Batches (≤750 each)</div>
              </div>
            </div>
            
            {/* Image list - compact scrollable */}
            {summary?.images && summary.images.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Images in Batch ({summary.images.length})</h4>
                <div className="max-h-48 overflow-y-auto border rounded bg-gray-50">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">ID</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Gallery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {summary.images.map((img) => (
                        <tr key={img.id} className="hover:bg-gray-100">
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-700">{img.id}</td>
                          <td className="px-3 py-1.5 text-gray-600">{img.gallery}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Submission groups */}
            {summary?.submissions && summary.submissions.length > 0 && (
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-gray-700">Submission Groups</h4>
                {summary.submissions.map((sub) => (
                  <div key={sub.group} className="flex items-center gap-3 bg-gray-50 rounded p-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl font-bold text-blue-600">
                      {sub.group}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{sub.count} images</div>
                    </div>
                    {summary.status === "approved" || summary.status === "submitted" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={regNumbers[sub.group] || ""}
                          onChange={(e) => setRegNumbers({ ...regNumbers, [sub.group]: e.target.value })}
                          placeholder="VA 2-xxx-xxx"
                          className="px-2 py-1 border rounded text-sm w-36"
                          disabled={summary.status === "processed"}
                        />
                        {summary.status === "approved" && (
                          <button
                            onClick={() => handleRecordSubmission(sub.group)}
                            className={`${btnBase} ${btnSuccess} text-xs`}
                            disabled={processing}
                          >
                            Save
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            
            {/* Actions */}
            <div className="space-y-4 pt-4 border-t">
              {/* Download buttons */}
              {summary?.status === "approved" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 mb-2">📦 Step 1: Download Files</h5>
                  <p className="text-blue-700 text-sm mb-3">
                    Download the CSV (for Copyright Office) and the BAT file (to download images).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadCSV}
                      className={`${btnBase} ${btnPrimary} flex-1`}
                    >
                      📄 Download CSV
                    </button>
                    <button
                      onClick={handleDownloadBAT}
                      className={`${btnBase} ${btnSuccess} flex-1`}
                    >
                      ⚡ Download BAT
                    </button>
                  </div>
                  <p className="text-blue-600 mt-2 text-xs">
                    Save the BAT file anywhere, then double-click to download images. No installation needed!
                  </p>
                  <button
                    onClick={handleMarkAsSubmitted}
                    className={`${btnBase} ${btnWarning} w-full mt-3`}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "✓ Mark as Submitted to Copyright Office"}
                  </button>
                </div>
              )}
              
              {summary?.status === "submitted" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 mb-2">📬 Awaiting Registration Number</h5>
                  <p className="text-blue-700 text-sm mb-3">
                    Submitted {summary.submitted_at ? new Date(summary.submitted_at).toLocaleDateString() : "recently"}. 
                    Enter the VA number when received (usually 3-6 months).
                  </p>
                </div>
              )}
              
              {(summary?.status === "approved" || summary?.status === "submitted") && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <h5 className="font-medium text-amber-800 mb-2">📝 Enter Registration Number (when received)</h5>
                  <p className="text-amber-700 text-xs mb-2">
                    After Copyright Office processes your submission (usually 3-6 months), 
                    enter the VA number above and click Save.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                {summary?.status === "draft" && (
                  <button
                    onClick={handleApprove}
                    className={`${btnBase} ${btnWarning}`}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Approve Batch"}
                  </button>
                )}
                
                {summary?.status === "submitted" && (
                  <button
                    onClick={handleProcess}
                    className={`${btnBase} ${btnSuccess}`}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Finalize & Update Registry"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Main Component ----------

export default function CopyrightManager() {
  // State
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [galleryData, setGalleryData] = useState([]);
  const [copyrightStatus, setCopyrightStatus] = useState({});
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all, registered, unregistered, pending
  const [markModal, setMarkModal] = useState(null); // { image, existingRegistration? }
  const [batchMarkModal, setBatchMarkModal] = useState(false);
  const [quarterlyPanel, setQuarterlyPanel] = useState(null);
  const [quarterlyBatches, setQuarterlyBatches] = useState([]);
  const [statsView, setStatsView] = useState(false);
  const [registry, setRegistry] = useState(null);
  
  // Load gallery list on mount
  useEffect(() => {
    loadGalleryList();
    loadQuarterlyBatches();
  }, []);
  
  const loadGalleryList = async () => {
    try {
      const res = await fetch("/.netlify/functions/importGalleryItems?action=list");
      const data = await res.json();
      if (data.files) {
        setGalleries(data.files.sort());
      }
    } catch (err) {
      console.error("Failed to load gallery list:", err);
    }
  };
  
  const loadQuarterlyBatches = async () => {
    try {
      const { batches } = await listQuarterlyBatches();
      setQuarterlyBatches(batches || []);
    } catch (err) {
      console.error("Failed to load quarterly batches:", err);
    }
  };
  
  const loadGalleryData = async (path) => {
    setLoading(true);
    setSelectedImages(new Set());
    try {
      const res = await fetch(`/.netlify/functions/importGalleryItems?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      const items = (data.galleryData || []).filter(isRealItem);
      setGalleryData(items);
      
      // Load copyright status for all images
      const imageIds = items.map(img => img.id);
      if (imageIds.length > 0) {
        const statusMap = await bulkCheckCopyrightStatus(imageIds);
        setCopyrightStatus(statusMap);
      }
    } catch (err) {
      console.error("Failed to load gallery:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGallerySelect = (path) => {
    setSelectedGallery(path);
    loadGalleryData(path);
  };
  
  const handleToggleSelect = (imageId) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });
  };
  
  const handleSelectAll = () => {
    const unregistered = filteredImages
      .filter(img => !copyrightStatus[img.id]?.is_registered)
      .map(img => img.id);
    setSelectedImages(new Set(unregistered));
  };
  
  const handleDeselectAll = () => {
    setSelectedImages(new Set());
  };
  
  const handleMarkRegistered = async (params) => {
    await markAsRegistered(params);
    // Refresh status
    const status = await checkCopyrightStatus(params.imageId);
    setCopyrightStatus(prev => ({ ...prev, [params.imageId]: status }));
  };
  
  const handleUpdateRegistration = async (params) => {
    await updateRegistration(params);
    // Refresh status
    const status = await checkCopyrightStatus(params.imageId);
    setCopyrightStatus(prev => ({ ...prev, [params.imageId]: status }));
  };
  
  const handleRemoveRegistration = async (imageId) => {
    await removeRegistration(imageId);
    // Refresh status
    const status = await checkCopyrightStatus(imageId);
    setCopyrightStatus(prev => ({ ...prev, [imageId]: status }));
  };
  
  const handleBatchMarkRegistered = async (params) => {
    const images = Array.from(selectedImages).map(id => {
      const img = galleryData.find(g => g.id === id);
      return { image_id: id, title_at_submission: img?.title };
    });
    await batchMarkAsRegistered({ images, ...params });
    // Refresh all status
    const statusMap = await bulkCheckCopyrightStatus(Array.from(selectedImages));
    setCopyrightStatus(prev => ({ ...prev, ...statusMap }));
    setSelectedImages(new Set());
  };
  
  const handleCollectForRegistration = async () => {
    if (selectedImages.size === 0) {
      alert("No images selected");
      return;
    }
    
    const images = Array.from(selectedImages).map(id => {
      const img = galleryData.find(g => g.id === id);
      return {
        image_id: id,
        source_gallery: selectedGallery,
        title: img?.title,
        thumbnail: pickImage(img)
      };
    });
    
    try {
      const result = await addToQuarterlyBatch({ images });
      alert(`Added ${result.added_count} images to ${result.quarter} batch.\n${result.skipped_count} skipped.`);
      setSelectedImages(new Set());
      // Refresh status
      const statusMap = await bulkCheckCopyrightStatus(Array.from(selectedImages));
      setCopyrightStatus(prev => ({ ...prev, ...statusMap }));
      loadQuarterlyBatches();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };
  
  const handleRemoveFromPending = async () => {
    const pendingSelected = Array.from(selectedImages).filter(id => copyrightStatus[id]?.in_pending_batch);
    
    if (pendingSelected.length === 0) {
      alert("No pending images selected. Select images with the 'Pending' badge to remove them.");
      return;
    }
    
    try {
      await removeFromQuarterlyBatch({ imageIds: pendingSelected });
      // Refresh status for removed images
      const statusMap = await bulkCheckCopyrightStatus(pendingSelected);
      setCopyrightStatus(prev => ({ ...prev, ...statusMap }));
      setSelectedImages(new Set());
      loadQuarterlyBatches();
      alert(`Removed ${pendingSelected.length} image(s) from pending batch.`);
    } catch (err) {
      alert("Error removing from pending: " + err.message);
    }
  };
  
  const handleLoadStats = async () => {
    try {
      const reg = await getRegistry();
      setRegistry(reg);
      setStatsView(true);
    } catch (err) {
      alert("Error loading registry: " + err.message);
    }
  };
  
  // Filter images
  const filteredImages = useMemo(() => {
    return galleryData.filter(img => {
      const status = copyrightStatus[img.id];
      if (filter === "registered") return status?.is_registered;
      if (filter === "unregistered") return !status?.is_registered && !status?.in_pending_batch;
      if (filter === "pending") return status?.in_pending_batch;
      return true;
    });
  }, [galleryData, copyrightStatus, filter]);
  
  // Stats
  const stats = useMemo(() => {
    const total = galleryData.length;
    let registered = 0, pending = 0, unregistered = 0;
    for (const img of galleryData) {
      const status = copyrightStatus[img.id];
      if (status?.is_registered) registered++;
      else if (status?.in_pending_batch) pending++;
      else unregistered++;
    }
    return { total, registered, pending, unregistered };
  }, [galleryData, copyrightStatus]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Copyright Manager</h1>
              <p className="text-sm text-gray-500">Manage copyright registration status</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadStats}
                className={`${btnBase} ${btnSecondary}`}
              >
                📊 Registry Stats
              </button>
              <button
                onClick={() => setQuarterlyPanel(getCurrentQuarter())}
                className={`${btnBase} ${btnPrimary}`}
              >
                📋 Quarterly Review
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Gallery Selector */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg border p-4 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-3">Galleries</h2>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {/* Group galleries by section */}
                {(() => {
                  const grouped = {};
                  galleries.forEach(path => {
                    const section = getSectionFromPath(path);
                    if (!grouped[section]) grouped[section] = [];
                    grouped[section].push(path);
                  });
                  
                  // Order sections
                  const sectionOrder = ["Painterly Fine Art", "Fine Art", "Engrained", "Other"];
                  
                  return sectionOrder
                    .filter(section => grouped[section]?.length > 0)
                    .map(section => {
                      const style = SECTION_STYLES[section];
                      return (
                        <div key={section} className={`rounded-lg border ${style.border} overflow-hidden`}>
                          <div className={`px-3 py-1.5 ${style.header} text-xs font-semibold uppercase tracking-wide`}>
                            {section}
                          </div>
                          <div className={`${style.bg} divide-y divide-gray-100`}>
                            {grouped[section].map((path) => (
                              <button
                                key={path}
                                onClick={() => handleGallerySelect(path)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                                  selectedGallery === path
                                    ? "bg-blue-100 text-blue-800 font-medium"
                                    : "hover:bg-white/50 text-gray-700"
                                }`}
                              >
                                <span className="flex-1">{getLabelWithoutSection(path)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
              
              {/* Quarterly batches */}
              {quarterlyBatches.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="font-medium text-gray-700 mb-2">Quarterly Batches</h3>
                  <div className="space-y-1">
                    {quarterlyBatches.map((batch) => (
                      <button
                        key={batch.quarter}
                        onClick={() => setQuarterlyPanel(batch.quarter)}
                        className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex justify-between items-center"
                      >
                        <span>{batch.quarter}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          batch.status === "processed" ? badgeRegistered :
                          batch.status === "submitted" ? "bg-blue-100 text-blue-800" :
                          batch.status === "approved" ? badgePending :
                          badgeUnregistered
                        }`}>
                          {batch.image_count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Main content */}
          <div className="col-span-9">
            {!selectedGallery ? (
              <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
                <div className="text-4xl mb-4">📷</div>
                <p>Select a gallery to manage copyright status</p>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading gallery...</p>
              </div>
            ) : (
              <>
                {/* Stats bar */}
                <div className="bg-white rounded-lg border p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-2xl font-bold">{stats.total}</span>
                        <span className="text-gray-500 ml-1">total</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-green-600">{stats.registered}</span>
                        <span className="text-gray-500 ml-1">registered</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-amber-600">{stats.pending}</span>
                        <span className="text-gray-500 ml-1">pending</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-gray-400">{stats.unregistered}</span>
                        <span className="text-gray-500 ml-1">unregistered</span>
                      </div>
                    </div>
                    
                    {/* Filter */}
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="px-3 py-2 border rounded"
                    >
                      <option value="all">All images</option>
                      <option value="registered">Registered only</option>
                      <option value="unregistered">Unregistered only</option>
                      <option value="pending">Pending only</option>
                    </select>
                  </div>
                </div>
                
                {/* Action bar */}
                {selectedImages.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <div className="text-blue-800">
                      <strong>{selectedImages.size}</strong> images selected
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleDeselectAll} className={`${btnBase} ${btnSecondary}`}>
                        Clear
                      </button>
                      <button
                        onClick={() => setBatchMarkModal(true)}
                        className={`${btnBase} ${btnSuccess}`}
                      >
                        Mark as Registered
                      </button>
                      <button
                        onClick={handleCollectForRegistration}
                        className={`${btnBase} ${btnPrimary}`}
                      >
                        Add to Quarterly Batch
                      </button>
                      <button
                        onClick={handleRemoveFromPending}
                        className={`${btnBase} bg-orange-600 text-white hover:bg-orange-700`}
                      >
                        Remove from Pending
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Select all button */}
                {stats.unregistered > 0 && (
                  <div className="mb-4 flex gap-4 items-center">
                    <button 
                      onClick={handleSelectAll} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Select All {stats.unregistered} Unregistered
                    </button>
                    {selectedImages.size > 0 && (
                      <span className="text-sm text-gray-600">
                        ({selectedImages.size} selected)
                      </span>
                    )}
                  </div>
                )}
                
                {/* Image grid */}
                <div className="grid grid-cols-4 gap-4">
                  {filteredImages.map((img) => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      status={copyrightStatus[img.id] || {}}
                      selected={selectedImages.has(img.id)}
                      onToggle={handleToggleSelect}
                      onMarkRegistered={(image) => setMarkModal({ image, existingRegistration: null })}
                      onEditRegistration={(image, registration) => setMarkModal({ image, existingRegistration: registration })}
                      onRemoveRegistration={async (image) => {
                        if (!confirm(`Remove registration for ${image.id}? This cannot be undone.`)) return;
                        try {
                          await handleRemoveRegistration(image.id);
                        } catch (err) {
                          alert("Error: " + err.message);
                        }
                      }}
                    />
                  ))}
                </div>
                
                {filteredImages.length === 0 && (
                  <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
                    No images match the current filter.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {markModal && (
        <MarkRegisteredModal
          image={markModal.image}
          existingRegistration={markModal.existingRegistration}
          onClose={() => setMarkModal(null)}
          onSave={markModal.existingRegistration ? handleUpdateRegistration : handleMarkRegistered}
          onRemove={handleRemoveRegistration}
        />
      )}
      
      {batchMarkModal && (
        <BatchMarkModal
          count={selectedImages.size}
          onClose={() => setBatchMarkModal(false)}
          onSave={handleBatchMarkRegistered}
        />
      )}
      
      {quarterlyPanel && (
        <QuarterlyReviewPanel
          quarter={quarterlyPanel}
          onClose={() => setQuarterlyPanel(null)}
          onRefresh={() => {
            if (selectedGallery) loadGalleryData(selectedGallery);
            loadQuarterlyBatches();
          }}
        />
      )}
      
      {/* Stats modal */}
      {statsView && registry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Registry Statistics</h3>
              <button onClick={() => setStatsView(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-4xl font-bold text-green-600">
                  {Object.keys(registry.registrations || {}).length}
                </div>
                <div className="text-gray-600">Total Registered Images</div>
              </div>
              
              <div className="text-sm text-gray-500">
                Last updated: {registry._meta?.lastUpdated 
                  ? new Date(registry._meta.lastUpdated).toLocaleString()
                  : "Never"}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  const entries = Object.entries(registry.registrations || {}).map(([id, reg]) => ({
                    image_id: id,
                    batch_id: reg.batch_id,
                    registration_number: reg.registration_number,
                    submission_date: reg.submission_date,
                    source_gallery: "",
                    title_at_submission: reg.title_at_submission || ""
                  }));
                  const csv = generateLedgerCSV(entries);
                  downloadAsFile(csv, `copyright-registry-${new Date().toISOString().split("T")[0]}.csv`);
                }}
                className={`${btnBase} ${btnSecondary}`}
              >
                Export CSV
              </button>
              <button onClick={() => setStatsView(false)} className={`${btnBase} ${btnPrimary}`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
