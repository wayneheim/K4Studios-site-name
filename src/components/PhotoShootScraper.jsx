// src/components/PhotoShootScraper.jsx
// Photo Shoot Scraper UI - Simple two-mode interface
//
// Mode 1: Create New Photo Shoot - create folder structure + new .mjs file
// Mode 2: Add to Existing - select existing .mjs and append new images

import { useState, useEffect, useCallback } from "react";

const API_BASE = "/.netlify/functions/photoShootScraper";

const CHROME_CMD = 'start chrome --remote-debugging-port=9222 --user-data-dir="C:\\ChromeDebug"';

function FolderTree({ node, level = 0, onSelectFile, onSelectFolder, selectedPath, selectedFolder }) {
  const [expanded, setExpanded] = useState(level < 2);
  const indent = level * 16;

  if (!node) return null;

  const hasChildren = (node.children?.folders?.length > 0) || (node.children?.files?.length > 0);
  const isSelectedFolder = selectedFolder === node.path;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-amber-900/30 rounded transition-colors ${
          isSelectedFolder ? "bg-amber-800/40 ring-1 ring-amber-600" : ""
        }`}
        style={{ paddingLeft: indent + 8 }}
        onClick={() => {
          setExpanded(!expanded);
          onSelectFolder?.(node.path);
        }}
      >
        <span className="text-amber-500">{expanded ? "📂" : "📁"}</span>
        <span className="text-stone-200 font-medium">{node.name}</span>
        {hasChildren && (
          <span className="text-stone-500 text-xs ml-auto">
            {node.children?.files?.length || 0}
          </span>
        )}
      </div>

      {expanded && node.children && (
        <>
          {node.children.folders?.map((folder) => (
            <FolderTree
              key={folder.path}
              node={folder}
              level={level + 1}
              onSelectFile={onSelectFile}
              onSelectFolder={onSelectFolder}
              selectedPath={selectedPath}
              selectedFolder={selectedFolder}
            />
          ))}
          {node.children.files?.map((file) => (
            <div
              key={file.path}
              className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-green-900/30 rounded transition-colors ${
                selectedPath === file.path ? "bg-green-800/40 ring-1 ring-green-500" : ""
              }`}
              style={{ paddingLeft: indent + 24 }}
              onClick={() => onSelectFile?.(file.path)}
            >
              <span className="text-green-500">📄</span>
              <span className="text-stone-300">{file.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function PhotoShootScraper() {
  // Core state
  const [mode, setMode] = useState(null); // null | 'new' | 'existing'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  // Folder tree
  const [tree, setTree] = useState(null);

  // For NEW mode
  const [selectedFolder, setSelectedFolder] = useState("src/data/Other/Photo-Shoots");
  const [newSubfolder, setNewSubfolder] = useState("");
  const [newFileName, setNewFileName] = useState("");

  // For EXISTING mode  
  const [selectedPath, setSelectedPath] = useState("");
  const [existingData, setExistingData] = useState(null);

  // Scraping state
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);

  // Load folder tree
  const loadTree = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}?action=list`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTree({
        name: "Photo-Shoots",
        path: data.root,
        children: data.tree
      });
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Load existing file when selected
  const loadExistingFile = async (filePath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}?action=read&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExistingData(data);
      setStatus(`Loaded ${data.count} existing images`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Create subfolder
  const createSubfolder = async () => {
    if (!newSubfolder.trim()) return;
    setLoading(true);
    try {
      const folderPath = `${selectedFolder}/${newSubfolder}`.replace(/\/+/g, "/");
      const res = await fetch(`${API_BASE}?action=createFolder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedFolder(data.path);
      setNewSubfolder("");
      setStatus(`Created: ${data.path}`);
      loadTree();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // START SCRAPE - this triggers the actual puppeteer scraper
  const startScrape = async () => {
    setScraping(true);
    setError(null);
    setScrapeResult(null);
    setStatus("🔄 Scraping... Watch Chrome browser. This may take a few minutes.");

    try {
      // Determine output path
      let outputPath;
      let gallerySlug;
      
      if (mode === "new") {
        if (!newFileName.trim()) throw new Error("Enter a filename for the new shoot");
        const fileName = newFileName.endsWith(".mjs") ? newFileName : `${newFileName}.mjs`;
        outputPath = `${selectedFolder}/${fileName}`.replace(/\/+/g, "/");
        gallerySlug = selectedFolder.replace("src/data/", "");
      } else {
        if (!selectedPath) throw new Error("Select a file to update");
        outputPath = selectedPath;
        gallerySlug = selectedPath.replace("src/data/", "").replace(/\/[^/]+\.mjs$/, "");
      }

      // Call the scraper - wait for it to complete
      const res = await fetch(`${API_BASE}?action=scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputPath,
          gallerySlug,
          isNewFile: mode === "new",
          existingIds: existingData?.existingIds || []
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Scrape failed");
      }

      setScrapeResult(data);
      setStatus(`✅ Done! ${data.stats?.added || 0} new images added.`);
      loadTree();

    } catch (e) {
      // Check if it's a timeout but scrape might have succeeded
      if (e.message.includes("timeout") || e.message.includes("Timeout")) {
        setStatus("⚠️ Request timed out, but scrape may have completed. Refresh tree to check.");
        loadTree();
      } else {
        setError(e.message);
      }
    } finally {
      setScraping(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("📋 Copied to clipboard!");
    } catch {
      prompt("Copy this:", text);
    }
  };

  // Handle file selection
  const handleSelectFile = (path) => {
    setSelectedPath(path);
    loadExistingFile(path);
  };

  // Handle folder selection
  const handleSelectFolder = (path) => {
    console.log("[PhotoShootScraper] Selected folder:", path);
    setSelectedFolder(path);
  };

  // Get target path display
  const getTargetPath = () => {
    if (mode === "new") {
      const fileName = newFileName ? (newFileName.endsWith(".mjs") ? newFileName : `${newFileName}.mjs`) : "[filename].mjs";
      return `${selectedFolder}/${fileName}`.replace(/\/+/g, "/");
    }
    return selectedPath || "Select a file...";
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-amber-500 mb-2">📸 Photo Shoot Scraper</h1>
          <p className="text-stone-400">SmugMug → <code className="text-amber-400">/Other/Photo-Shoots</code></p>
        </div>

        {/* Error/Status */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-4 mb-4">
            ❌ {error}
            <button onClick={() => setError(null)} className="float-right text-red-400">✕</button>
          </div>
        )}
        {status && (
          <div className="bg-stone-800 border border-stone-600 rounded-lg p-3 mb-4">
            {status}
          </div>
        )}

        {/* Mode Selection - if not chosen yet */}
        {!mode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode("new")}
              className="bg-stone-900 border-2 border-amber-600 hover:bg-amber-900/30 rounded-xl p-8 text-left transition-colors"
            >
              <div className="text-4xl mb-4">🆕</div>
              <h2 className="text-2xl font-bold text-amber-400 mb-2">New Photo Shoot</h2>
              <p className="text-stone-400">
                Create a new folder structure and .mjs file for a fresh photo shoot scrape.
              </p>
            </button>

            <button
              onClick={() => setMode("existing")}
              className="bg-stone-900 border-2 border-green-600 hover:bg-green-900/30 rounded-xl p-8 text-left transition-colors"
            >
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">Add to Existing</h2>
              <p className="text-stone-400">
                Select an existing .mjs file and add newly scraped images to it.
              </p>
            </button>
          </div>
        )}

        {/* Main Interface - after mode is chosen */}
        {mode && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => {
                setMode(null);
                setSelectedPath("");
                setExistingData(null);
                setScrapeResult(null);
              }}
              className="text-stone-400 hover:text-stone-200"
            >
              ← Back to mode selection
            </button>

            {/* Chrome Setup */}
            <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-amber-400 mb-3">🌐 Chrome Setup</h3>
              <p className="text-stone-400 text-sm mb-3">
                Run this in Command Prompt, then navigate to your SmugMug gallery and open the lightbox:
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 text-green-400 text-sm">
                  {CHROME_CMD}
                </code>
                <button
                  onClick={() => copyToClipboard(CHROME_CMD)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Folder Tree */}
              <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-amber-400">
                    {mode === "new" ? "📁 Select Target Folder" : "📄 Select File to Update"}
                  </h3>
                  <button onClick={loadTree} className="text-stone-400 hover:text-white text-sm">
                    🔄
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto bg-stone-950 border border-stone-700 rounded-lg p-2">
                  {tree ? (
                    <FolderTree
                      node={tree}
                      onSelectFile={handleSelectFile}
                      onSelectFolder={handleSelectFolder}
                      selectedPath={selectedPath}
                      selectedFolder={mode === "new" ? selectedFolder : ""}
                    />
                  ) : (
                    <div className="text-stone-500 py-4 text-center">Loading...</div>
                  )}
                </div>
              </div>

              {/* Right: Configuration */}
              <div className="space-y-4">
                {/* NEW mode options */}
                {mode === "new" && (
                  <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-4">
                    <h3 className="text-lg font-semibold text-amber-400">➕ New Photo Shoot</h3>
                    
                    <div>
                      <label className="block text-stone-400 text-sm mb-1">Target Folder</label>
                      <div className="bg-stone-800 rounded px-3 py-2 text-stone-300 font-mono text-sm">
                        {selectedFolder}
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-400 text-sm mb-1">Create Subfolder (optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubfolder}
                          onChange={(e) => setNewSubfolder(e.target.value)}
                          placeholder="e.g., Texas/Dallas-25"
                          className="flex-1 bg-stone-800 border border-stone-600 rounded px-3 py-2"
                        />
                        <button
                          onClick={createSubfolder}
                          disabled={!newSubfolder.trim() || loading}
                          className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded disabled:opacity-50"
                        >
                          Create
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-400 text-sm mb-1">New File Name *</label>
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="e.g., MyShoot-25"
                        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2"
                      />
                    </div>

                    <div className="bg-stone-800 rounded p-3">
                      <span className="text-stone-500 text-sm">Will save to: </span>
                      <span className="text-amber-400 font-mono text-sm">{getTargetPath()}</span>
                    </div>
                  </div>
                )}

                {/* EXISTING mode options */}
                {mode === "existing" && (
                  <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-3">📝 Add to Existing</h3>
                    
                    {selectedPath ? (
                      <div className="space-y-3">
                        <div className="bg-stone-800 rounded p-3">
                          <span className="text-stone-500 text-sm">Selected: </span>
                          <span className="text-green-400 font-mono text-sm">{selectedPath}</span>
                        </div>
                        {existingData && (
                          <div className="text-stone-400">
                            Contains <strong className="text-white">{existingData.count}</strong> existing images
                          </div>
                        )}
                        <div className="bg-amber-900/30 border border-amber-700/50 rounded p-3 text-amber-200 text-sm">
                          ⚠️ Only NEW images will be added. Existing records are never modified.
                        </div>
                      </div>
                    ) : (
                      <p className="text-stone-500">← Click a .mjs file to select it</p>
                    )}
                  </div>
                )}

                {/* START SCRAPE Button */}
                <button
                  onClick={startScrape}
                  disabled={scraping || (mode === "new" && !newFileName.trim()) || (mode === "existing" && !selectedPath)}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-stone-700 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xl transition-colors"
                >
                  {scraping ? "🔄 Scraping... Please wait" : "🚀 Start Scrape"}
                </button>

                {/* Scrape Result */}
                {scrapeResult && (
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">✅ Scrape Complete</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{scrapeResult.stats?.total || 0}</div>
                        <div className="text-stone-500 text-sm">Total Scraped</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">{scrapeResult.stats?.added || 0}</div>
                        <div className="text-green-600 text-sm">Added</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-stone-400">{scrapeResult.stats?.skipped || 0}</div>
                        <div className="text-stone-500 text-sm">Skipped</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-stone-800 text-center text-stone-600 text-sm">
          Forward-only discovery. All new images receive <code className="text-amber-600">first_seen</code> date.
        </div>
      </div>
    </div>
  );
}
