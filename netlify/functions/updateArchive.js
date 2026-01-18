// netlify/functions/updateArchive.js
// Manages the Archive gallery - adds/removes images when they're hidden/unhidden
//
// When an image is HIDDEN: add a copy to Archive.mjs with visibility: "show"
//   Also adds the image to imageIdMap.json pointing to /Other/Archive
// When an image is SHOWN: set visibility to "hidden" in Archive (original gallery becomes canonical)
//   Also updates imageIdMap.json to point to the original gallery

const fs = require("fs/promises");
const path = require("path");

const ARCHIVE_PATH = path.join(process.cwd(), "src/data/Other/Archive/Archive.mjs");
const IMAGE_ID_MAP_SRC = path.join(process.cwd(), "src/data/imageIdMap.json");
const IMAGE_ID_MAP_FUNCTIONS = path.join(process.cwd(), "netlify/functions/imageIdMap.json");

/* ===== Image ID Map Helpers ===== */
async function readImageIdMap() {
  try {
    const content = await fs.readFile(IMAGE_ID_MAP_SRC, "utf8");
    return JSON.parse(content);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function writeImageIdMap(map) {
  const json = JSON.stringify(map, null, 0); // Minified
  await fs.writeFile(IMAGE_ID_MAP_SRC, json, "utf8");
  await fs.writeFile(IMAGE_ID_MAP_FUNCTIONS, json, "utf8");
}

/* ===== Helpers ===== */

// Extract array from .mjs file content
function extractArrayFromMjs(code) {
  const m = code.match(/export\s+const\s+galleryData\s*=\s*(\[[\s\S]*\]);?/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`
        const String = { raw: (...args) => (Array.isArray(args[0]) ? args[0][0] : String(args[0])) };
        const x = ${m[1]};
        return x;
      `);
      return fn();
    } catch { return null; }
  }
}

// Build .mjs file content from array
function buildMjsContent(galleryData) {
  const header = `// Archive Gallery - Auto-managed by updateArchive function
// Images that are hidden from main galleries but still accessible via direct URL
// DO NOT manually edit this file
`;
  const json = JSON.stringify(galleryData, null, 2);
  return `${header}export const galleryData = ${json};
`;
}

// Create the ghost entry that all galleries need
function createGhostEntry() {
  return {
    id: "i-k4studios",
    title: "Archive",
    description: "Images temporarily hidden from public galleries.",
    alt: "Archive - Hidden Works",
    src: "/images/gallery-intro-placeholder.jpg",
    srcXL: "",
    srcL: "",
    srcM: "",
    srcS: "",
    srcOriginal: "",
    buyLink: "",
    keywords: [],
    story: "",
    notes: "",
    rating: 0,
    galleries: ["Other/Archive"],
    visibility: "ghost",
    sortOrder: -1
  };
}

// Normalize image data for storage
function normalizeImage(raw, sourceGalleryPath) {
  const out = {};
  
  // Required fields
  if (raw.id != null) out.id = raw.id;
  if (raw.title != null) out.title = raw.title;
  if (raw.description != null) out.description = raw.description;
  if (raw.alt != null) out.alt = raw.alt;
  if (raw.story != null) out.story = raw.story;
  
  // Image sources
  if (raw.src != null || raw.url != null) out.src = raw.src || raw.url;
  if (raw.srcXL != null) out.srcXL = raw.srcXL;
  if (raw.srcL != null) out.srcL = raw.srcL;
  if (raw.srcM != null) out.srcM = raw.srcM;
  if (raw.srcS != null) out.srcS = raw.srcS;
  if (raw.srcOriginal != null) out.srcOriginal = raw.srcOriginal;
  
  // Metadata
  if (raw.buyLink != null) out.buyLink = raw.buyLink;
  if (Array.isArray(raw.keywords)) out.keywords = raw.keywords;
  if (raw.notes != null) out.notes = raw.notes;
  if (typeof raw.rating === "number") out.rating = raw.rating;
  
  // Archive-specific: always "show" in Archive, and track where it came from
  out.visibility = "show";
  out.archivedFrom = sourceGalleryPath; // Track original location for potential unarchive
  
  // Preserve sortOrder for ordering within Archive
  if (typeof raw.sortOrder === "number") out.sortOrder = raw.sortOrder;
  
  return out;
}

/* ===== Handler ===== */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const { action, imageId, imageData, sourceGalleryPath } = body;

    if (!action || !imageId) {
      return { statusCode: 400, body: "Missing action or imageId" };
    }

    // Read current Archive content
    let archiveData = [];
    try {
      const code = await fs.readFile(ARCHIVE_PATH, "utf8");
      archiveData = extractArrayFromMjs(code) || [];
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      // File doesn't exist yet, start fresh with ghost
      archiveData = [createGhostEntry()];
    }
    
    // Ensure ghost entry exists
    const hasGhost = archiveData.some(img => img.id === "i-k4studios");
    if (!hasGhost) {
      archiveData.unshift(createGhostEntry());
    }

    console.log(`[updateArchive] ${action} ${imageId}, current archive size: ${archiveData.length}`);

    if (action === "add") {
      // Add image to Archive (when hiding from main gallery)
      if (!imageData || !sourceGalleryPath) {
        return { statusCode: 400, body: "Missing imageData or sourceGalleryPath for add action" };
      }
      
      // Check if already in archive
      const existingIndex = archiveData.findIndex(img => img.id === imageId);
      if (existingIndex >= 0) {
        // Update existing entry - ensure visibility is "show"
        archiveData[existingIndex] = normalizeImage(imageData, sourceGalleryPath);
        console.log(`[updateArchive] Updated existing archive entry for ${imageId}`);
      } else {
        // Add new entry
        archiveData.push(normalizeImage(imageData, sourceGalleryPath));
        console.log(`[updateArchive] Added ${imageId} to archive`);
      }
      
      // Update imageIdMap to point to Archive
      const idMap = await readImageIdMap();
      idMap[imageId] = "/Other/Archive";
      await writeImageIdMap(idMap);
      console.log(`[updateArchive] Updated imageIdMap: ${imageId} → /Other/Archive`);
      
    } else if (action === "remove") {
      // Remove image from Archive (when unhiding in main gallery)
      const existingIndex = archiveData.findIndex(img => img.id === imageId);
      if (existingIndex >= 0) {
        archiveData.splice(existingIndex, 1);
        console.log(`[updateArchive] Removed ${imageId} from archive`);
      } else {
        console.log(`[updateArchive] ${imageId} not found in archive, nothing to remove`);
      }
      
    } else if (action === "hide" || action === "removeIfFrom") {
      // Hide image in Archive (set visibility to "hidden" instead of deleting)
      // This is safer than removing - preserves data and prevents wiping other galleries' hidden images
      const existingIndex = archiveData.findIndex(img => img.id === imageId);
      if (existingIndex >= 0) {
        // Simply find by ID and hide it - the image is now visible in its original gallery
        const entry = archiveData[existingIndex];
        archiveData[existingIndex] = { ...entry, visibility: "hidden" };
        console.log(`[updateArchive] Set ${imageId} to hidden in archive`);
        
        // Update imageIdMap to point back to original gallery (now visible there)
        const idMap = await readImageIdMap();
        // Convert sourceGalleryPath to URL format (strip src/data/ prefix if present)
        let galleryUrl = sourceGalleryPath
          .replace(/^src\/data\//, '/')
          .replace(/^src\/pages\//, '/')
          .replace(/\.mjs$/, '');
        if (!galleryUrl.startsWith('/')) galleryUrl = '/' + galleryUrl;
        idMap[imageId] = galleryUrl;
        await writeImageIdMap(idMap);
        console.log(`[updateArchive] Updated imageIdMap: ${imageId} → ${galleryUrl}`);
      } else {
        console.log(`[updateArchive] ${imageId} not found in archive, nothing to hide`);
      }
      
    } else {
      return { statusCode: 400, body: `Unknown action: ${action}` };
    }

    // Write updated Archive
    const newContent = buildMjsContent(archiveData);
    await fs.writeFile(ARCHIVE_PATH, newContent, "utf8");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ok: true, 
        action,
        imageId,
        archiveSize: archiveData.length 
      }),
    };
  } catch (err) {
    console.error("[updateArchive] Error:", err);
    return { statusCode: 500, body: err?.message || "Server error" };
  }
};
