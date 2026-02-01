// netlify/functions/copyrightRegistry.js
// Manages the master copyright registry and quarterly batches
// 
// Endpoints:
// GET ?action=status&imageId=xxx - Check if image is registered
// GET ?action=registry - Get full registry
// GET ?action=quarterly&quarter=2025-Q2 - Get quarterly batch
// GET ?action=listQuarterly - List all quarterly batches
// POST action=register - Register an image as copyrighted
// POST action=markRegistered - Mark existing image as already registered (manual catch-up)
// POST action=addToQuarterly - Add image to quarterly batch
// POST action=removeFromQuarterly - Remove image from quarterly batch
// POST action=approveQuarterly - Approve a quarterly batch
// POST action=processQuarterly - Process batch with registration numbers
// POST action=scanGallery - Scan a gallery for copyright status

const fs = require("fs/promises");
const path = require("path");

const REGISTRY_PATH = path.join(process.cwd(), "src/data/copyright/copyright-registry.json");
const QUARTERLY_DIR = path.join(process.cwd(), "src/data/copyright/quarterly");
const LEDGER_PATH = path.join(process.cwd(), "src/data/copyright/submission-ledger.csv");

// Maximum images per Copyright Office submission
const MAX_IMAGES_PER_SUBMISSION = 750;

// --- Utility functions ---

function getCurrentQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

function getQuarterFilePath(quarter) {
  return path.join(QUARTERLY_DIR, `copyright-quarterly-${quarter}.json`);
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function readRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return {
        _meta: {
          version: "1.0",
          description: "Master Copyright Registry",
          lastUpdated: null,
          note: "Append/update only. Never auto-delete."
        },
        registrations: {}
      };
    }
    throw err;
  }
}

async function writeRegistry(registry) {
  registry._meta = registry._meta || {};
  registry._meta.lastUpdated = new Date().toISOString();
  await ensureDir(path.dirname(REGISTRY_PATH));
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

async function readQuarterlyBatch(quarter) {
  const filePath = getQuarterFilePath(quarter);
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function writeQuarterlyBatch(batch) {
  await ensureDir(QUARTERLY_DIR);
  batch.updated_at = new Date().toISOString();
  const filePath = getQuarterFilePath(batch.quarter);
  await fs.writeFile(filePath, JSON.stringify(batch, null, 2), "utf8");
}

async function listQuarterlyBatches() {
  try {
    await ensureDir(QUARTERLY_DIR);
    const files = await fs.readdir(QUARTERLY_DIR);
    const batches = [];
    for (const file of files) {
      if (file.startsWith("copyright-quarterly-") && file.endsWith(".json")) {
        const quarter = file.replace("copyright-quarterly-", "").replace(".json", "");
        const batch = await readQuarterlyBatch(quarter);
        if (batch) {
          batches.push({
            quarter: batch.quarter,
            status: batch.status,
            image_count: batch.images?.length || 0,
            created_at: batch.created_at,
            updated_at: batch.updated_at
          });
        }
      }
    }
    return batches.sort((a, b) => b.quarter.localeCompare(a.quarter));
  } catch (err) {
    return [];
  }
}

async function appendToLedger(entries) {
  await ensureDir(path.dirname(LEDGER_PATH));
  
  // Check if file exists, if not create with headers
  let exists = true;
  try {
    await fs.access(LEDGER_PATH);
  } catch {
    exists = false;
  }
  
  let content = "";
  if (!exists) {
    content = "image_id,batch_id,registration_number,submission_date,source_gallery,title_at_submission\n";
  }
  
  for (const entry of entries) {
    const row = [
      entry.image_id,
      entry.batch_id,
      entry.registration_number,
      entry.submission_date,
      `"${(entry.source_gallery || "").replace(/"/g, '""')}"`,
      `"${(entry.title_at_submission || "").replace(/"/g, '""')}"`
    ].join(",");
    content += row + "\n";
  }
  
  await fs.appendFile(LEDGER_PATH, content, "utf8");
}

function assignSubmissionGroups(images) {
  // Assign A, B, C, etc. groups for batches > 750
  const groups = [];
  const groupLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  
  for (let i = 0; i < images.length; i++) {
    const groupIndex = Math.floor(i / MAX_IMAGES_PER_SUBMISSION);
    const groupLabel = groupLabels[groupIndex] || `G${groupIndex + 1}`;
    images[i].submission_group = groupLabel;
    
    if (!groups[groupIndex]) {
      groups[groupIndex] = { group: groupLabel, count: 0, images: [] };
    }
    groups[groupIndex].count++;
    groups[groupIndex].images.push(images[i].image_id);
  }
  
  return { images, groups };
}

// --- Main handler ---

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // --- GET handlers ---
    if (event.httpMethod === "GET") {
      const action = event.queryStringParameters?.action || "status";
      
      switch (action) {
        case "status": {
          // Check registration status for a single image
          const imageId = event.queryStringParameters?.imageId;
          if (!imageId) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing imageId parameter" })
            };
          }
          
          const registry = await readRegistry();
          const registration = registry.registrations[imageId];
          
          // Also check if in any pending quarterly batch
          const batches = await listQuarterlyBatches();
          let pendingQuarter = null;
          let pendingStatus = null;
          for (const batchInfo of batches) {
            if (batchInfo.status !== "processed") {
              const batch = await readQuarterlyBatch(batchInfo.quarter);
              if (batch?.images?.some(img => img.image_id === imageId)) {
                pendingQuarter = batchInfo.quarter;
                pendingStatus = batchInfo.status; // draft, approved, or submitted
                break;
              }
            }
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              image_id: imageId,
              is_registered: !!registration?.registered,
              registration: registration || null,
              in_pending_batch: !!pendingQuarter,
              pending_quarter: pendingQuarter,
              is_submitted: pendingStatus === "submitted"
            })
          };
        }
        
        case "registry": {
          // Get full registry
          const registry = await readRegistry();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(registry)
          };
        }
        
        case "quarterly": {
          // Get specific quarterly batch
          const quarter = event.queryStringParameters?.quarter || getCurrentQuarter();
          const batch = await readQuarterlyBatch(quarter);
          
          if (!batch) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                quarter,
                status: "empty",
                images: [],
                message: "No batch exists for this quarter"
              })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(batch)
          };
        }
        
        case "listQuarterly": {
          // List all quarterly batches
          const batches = await listQuarterlyBatches();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ batches })
          };
        }
        
        case "summary": {
          // Get summary for quarterly review
          const quarter = event.queryStringParameters?.quarter || getCurrentQuarter();
          const batch = await readQuarterlyBatch(quarter);
          
          if (!batch) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                quarter,
                total_images: 0,
                submission_count: 0,
                submissions: [],
                status: "empty"
              })
            };
          }
          
          const { groups } = assignSubmissionGroups([...batch.images]);
          
          // Extract gallery name from path for display (last 2 parts)
          const extractGalleryName = (path) => {
            if (!path) return "Unknown";
            const cleanPath = path.replace(/\\.mjs$/, "").replace(/^src\/data\//, "");
            const parts = cleanPath.split("/");
            // Take last 2 parts for context (e.g., "Western Cowboy / Color")
            if (parts.length >= 2) {
              return parts.slice(-2).join(" / ");
            }
            return parts[parts.length - 1] || path;
          };
          
          // Build compact image list with id, gallery, title, and download_url
          const imageList = batch.images.map(img => ({
            id: img.image_id,
            gallery: extractGalleryName(img.source_gallery),
            title: img.title_snapshot || img.title,
            download_url: img.download_url
          }));
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              quarter: batch.quarter,
              total_images: batch.images.length,
              submission_count: groups.length,
              submissions: groups,
              images: imageList,
              status: batch.status,
              submitted_at: batch.submitted_at
            })
          };
        }
        
        case "downloadPackage": {
          // Generate and download ZIP with CMD, script, CSV files (NO image downloads)
          const quarter = event.queryStringParameters?.quarter || getCurrentQuarter();
          const batch = await readQuarterlyBatch(quarter);
          
          if (!batch) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: `No batch found for ${quarter}` })
            };
          }
          
          if (batch.status === "draft") {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Batch is still in draft. Please approve it first." })
            };
          }
          
          const archiver = require("archiver");
          const { PassThrough } = require("stream");
          
          // Escape CSV
          const escapeCSV = (value) => {
            if (!value) return "";
            const str = String(value);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };
          
          // Create ZIP
          const passthrough = new PassThrough();
          const chunks = [];
          passthrough.on("data", (chunk) => chunks.push(chunk));
          
          const archive = archiver("zip", { zlib: { level: 5 } });
          archive.pipe(passthrough);
          
          // 1. Create submission CSV (Filename, Title)
          const csvRows = ["Filename,Title"];
          for (const img of batch.images) {
            const filename = `${img.image_id}.jpg`;
            const title = img.title_snapshot || "Untitled";
            csvRows.push(`${escapeCSV(filename)},${escapeCSV(title)}`);
          }
          archive.append(csvRows.join("\n"), { name: `${quarter}-submission.csv` });
          
          // 2. Create manifest CSV (Filename, Title, ImageID, Gallery, DownloadURL)
          const manifestRows = ["Filename,Title,ImageID,Gallery,DownloadURL"];
          for (const img of batch.images) {
            const filename = `${img.image_id}.jpg`;
            const title = img.title_snapshot || "Untitled";
            const gallery = (img.source_gallery || "").split("/").slice(-2).join("/").replace(".mjs", "");
            const downloadUrl = img.download_url || "";
            manifestRows.push(`${escapeCSV(filename)},${escapeCSV(title)},${img.image_id},${escapeCSV(gallery)},${escapeCSV(downloadUrl)}`);
          }
          archive.append(manifestRows.join("\n"), { name: `${quarter}-manifest.csv` });
          
          // 3. Create batch JSON for the local script
          const batchJson = JSON.stringify(batch, null, 2);
          archive.append(batchJson, { name: `${quarter}-batch.json` });
          
          // 4. Create the download script
          const downloadScript = `#!/usr/bin/env node
/**
 * K4 Studios Copyright Image Downloader
 * Downloads images for Copyright Office submission
 * 
 * Usage: Just double-click RUN-COPYRIGHT-${quarter}.cmd
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const QUARTER = '${quarter}';
const SCRIPT_DIR = __dirname;
const ROOT_DIR = path.dirname(SCRIPT_DIR);

// Read batch file
function readBatch() {
  const batchPath = path.join(ROOT_DIR, \`\${QUARTER}-batch.json\`);
  if (!fs.existsSync(batchPath)) {
    console.error(\`ERROR: Batch file not found: \${batchPath}\`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
}

// Download a file via HTTPS
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(\`HTTP \${response.statusCode}\`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function main() {
  console.log('');
  console.log('='.repeat(50));
  console.log('  K4 Studios Copyright Image Downloader');
  console.log('='.repeat(50));
  console.log(\`  Quarter: \${QUARTER}\`);
  console.log('');
  
  const batch = readBatch();
  console.log(\`  Found \${batch.images.length} images to download\\n\`);
  
  // Create images folder
  const imagesDir = path.join(ROOT_DIR, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  let successCount = 0;
  const errors = [];
  
  for (const img of batch.images) {
    const downloadUrl = img.download_url;
    if (!downloadUrl) {
      console.log(\`  SKIP \${img.image_id} - no download URL\`);
      errors.push({ id: img.image_id, error: 'No download URL' });
      continue;
    }
    
    const filename = \`\${img.image_id}.jpg\`;
    const destPath = path.join(imagesDir, filename);
    
    process.stdout.write(\`  Downloading \${img.image_id}... \`);
    
    try {
      await downloadFile(downloadUrl, destPath);
      console.log('OK');
      successCount++;
    } catch (err) {
      console.log(\`FAILED: \${err.message}\`);
      errors.push({ id: img.image_id, error: err.message });
    }
  }
  
  console.log('');
  console.log('='.repeat(50));
  console.log(\`  COMPLETE: \${successCount}/\${batch.images.length} images downloaded\`);
  console.log(\`  Images saved to: \${imagesDir}\`);
  if (errors.length > 0) {
    console.log(\`  Errors: \${errors.length}\`);
  }
  console.log('='.repeat(50));
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Open the "images" folder');
  console.log('  2. Upload images to Copyright Office');
  console.log(\`  3. Use \${QUARTER}-submission.csv for the form\`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
`;
          archive.append(downloadScript, { name: `scripts/download-copyright-images.mjs` });
          
          // 5. Create the CMD file
          const cmdContent = `@echo off
echo.
echo ========================================
echo   K4 Studios Copyright Downloader
echo ========================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
node scripts\\download-copyright-images.mjs
pause
`;
          archive.append(cmdContent, { name: `RUN-COPYRIGHT-${quarter}.cmd` });
          
          // 6. Create README
          const readmeContent = `K4 Studios Copyright Submission Package
========================================
Quarter: ${quarter}
Images: ${batch.images.length}
Generated: ${new Date().toISOString()}

INSTRUCTIONS
============

1. Make sure Node.js is installed on this computer
   - Download from: https://nodejs.org/
   - Just install the LTS version with default settings

2. Double-click: RUN-COPYRIGHT-${quarter}.cmd
   - This will download all ${batch.images.length} images
   - Images will be saved to the "images" folder

3. When complete, you'll have:
   - images/ folder with all the JPG files
   - ${quarter}-submission.csv (use this for Copyright Office form)
   - ${quarter}-manifest.csv (your records)

4. Upload to Copyright Office:
   - Go to copyright.gov
   - Upload all images from the "images" folder
   - Use the CSV file for titles

FILES IN THIS PACKAGE
=====================
- RUN-COPYRIGHT-${quarter}.cmd  (double-click to download images)
- ${quarter}-submission.csv     (for Copyright Office)
- ${quarter}-manifest.csv       (your detailed records)
- ${quarter}-batch.json         (data file for script)
- scripts/download-copyright-images.mjs (the download script)

TROUBLESHOOTING
===============
If you get an error about Node.js:
  - Install Node.js from https://nodejs.org/
  - Restart your computer
  - Try again

If downloads fail:
  - Check your internet connection
  - Try again - the script will overwrite existing files
`;
          archive.append(readmeContent, { name: `README.txt` });
          
          await archive.finalize();
          await new Promise((resolve) => passthrough.on("end", resolve));
          
          const zipBuffer = Buffer.concat(chunks);
          
          return {
            statusCode: 200,
            headers: {
              ...headers,
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="K4-Copyright-${quarter}.zip"`,
            },
            body: zipBuffer.toString("base64"),
            isBase64Encoded: true,
          };
        }
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Unknown action: ${action}` })
          };
      }
    }

    // --- POST handlers ---
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { action } = body;

      switch (action) {
        case "markRegistered": {
          // Manual catch-up: mark an existing image as already registered
          const { imageId, registration_number, submission_date, batch_id, title_at_submission, notes } = body;
          
          if (!imageId) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing imageId" })
            };
          }
          
          const registry = await readRegistry();
          
          registry.registrations[imageId] = {
            registered: true,
            submission_date: submission_date || new Date().toISOString().split("T")[0],
            registration_number: registration_number || "MANUAL-ENTRY",
            batch_id: batch_id || "LEGACY",
            title_at_submission: title_at_submission || undefined,
            notes: notes || "Manually marked as registered"
          };
          
          await writeRegistry(registry);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              imageId,
              registration: registry.registrations[imageId]
            })
          };
        }
        
        case "updateRegistration": {
          // Update an existing registration (edit mode)
          const { imageId, registration_number, submission_date, batch_id, title_at_submission, notes } = body;
          
          if (!imageId) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing imageId" })
            };
          }
          
          const registry = await readRegistry();
          
          if (!registry.registrations[imageId]) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Registration not found" })
            };
          }
          
          // Update only provided fields, preserve others
          const existing = registry.registrations[imageId];
          registry.registrations[imageId] = {
            registered: true,
            submission_date: submission_date !== undefined ? submission_date : existing.submission_date,
            registration_number: registration_number !== undefined ? registration_number : existing.registration_number,
            batch_id: batch_id !== undefined ? batch_id : existing.batch_id,
            title_at_submission: title_at_submission !== undefined ? title_at_submission : existing.title_at_submission,
            notes: notes !== undefined ? notes : existing.notes
          };
          
          await writeRegistry(registry);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              imageId,
              registration: registry.registrations[imageId]
            })
          };
        }
        
        case "removeRegistration": {
          // Remove a registration (with confirmation)
          const { imageId, confirm } = body;
          
          if (!imageId) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing imageId" })
            };
          }
          
          if (confirm !== true) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Must confirm deletion with confirm: true" })
            };
          }
          
          const registry = await readRegistry();
          
          if (!registry.registrations[imageId]) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Registration not found" })
            };
          }
          
          // Store what we're deleting for the response
          const deleted = registry.registrations[imageId];
          delete registry.registrations[imageId];
          
          await writeRegistry(registry);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              imageId,
              deleted
            })
          };
        }
        
        case "batchMarkRegistered": {
          // Batch manual catch-up: mark multiple images as already registered
          const { images, registration_number, submission_date, batch_id, notes } = body;
          
          if (!images || !Array.isArray(images) || images.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing or empty images array" })
            };
          }
          
          const registry = await readRegistry();
          const results = [];
          
          for (const img of images) {
            const imgId = typeof img === "string" ? img : img.image_id;
            registry.registrations[imgId] = {
              registered: true,
              submission_date: submission_date || new Date().toISOString().split("T")[0],
              registration_number: registration_number || "MANUAL-ENTRY",
              batch_id: batch_id || "LEGACY",
              title_at_submission: img.title_at_submission || undefined,
              notes: notes || "Batch manual entry"
            };
            results.push({ imageId: imgId, success: true });
          }
          
          await writeRegistry(registry);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              count: results.length,
              results
            })
          };
        }
        
        case "addToQuarterly": {
          // Add image(s) to quarterly batch
          const { images, quarter: targetQuarter } = body;
          const quarter = targetQuarter || getCurrentQuarter();
          
          if (!images || !Array.isArray(images) || images.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing or empty images array" })
            };
          }
          
          // Load registry to check which are already registered
          const registry = await readRegistry();
          
          // Load or create quarterly batch
          let batch = await readQuarterlyBatch(quarter);
          if (!batch) {
            batch = {
              quarter,
              status: "draft",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              images: []
            };
          }
          
          // Deduplicate: only add images not already in batch and not already registered
          const existingIds = new Set(batch.images.map(img => img.image_id));
          const added = [];
          const skipped = [];
          
          for (const img of images) {
            const imageId = typeof img === "string" ? img : img.image_id;
            
            // Skip if already registered
            if (registry.registrations[imageId]?.registered) {
              skipped.push({ image_id: imageId, reason: "already_registered" });
              continue;
            }
            
            // Skip if already in batch
            if (existingIds.has(imageId)) {
              skipped.push({ image_id: imageId, reason: "already_in_batch" });
              continue;
            }
            
            // Compute download_url (srcM) from thumbnail
            const thumbnailSrc = img.thumbnail || img.thumbnail_url || img.src || "";
            const downloadUrl = thumbnailSrc
              .replace(/\/S\//g, '/M/')
              .replace(/-S\.jpg/gi, '-M.jpg')
              .replace(/-S\.png/gi, '-M.png');
            
            const newEntry = {
              image_id: imageId,
              source_gallery: img.source_gallery || img.gallery_path || "unknown",
              title_snapshot: img.title || img.title_snapshot || undefined,
              thumbnail_url: thumbnailSrc || undefined,
              download_url: downloadUrl || undefined
            };
            
            batch.images.push(newEntry);
            existingIds.add(imageId);
            added.push(newEntry);
          }
          
          await writeQuarterlyBatch(batch);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              quarter,
              added_count: added.length,
              skipped_count: skipped.length,
              total_in_batch: batch.images.length,
              added,
              skipped
            })
          };
        }
        
        case "removeFromQuarterly": {
          // Remove image(s) from quarterly batch
          const { imageIds, quarter: targetQuarter } = body;
          const quarter = targetQuarter || getCurrentQuarter();
          
          if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing or empty imageIds array" })
            };
          }
          
          const batch = await readQuarterlyBatch(quarter);
          if (!batch) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Quarterly batch not found" })
            };
          }
          
          if (batch.status !== "draft") {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Can only remove from draft batches" })
            };
          }
          
          const removeSet = new Set(imageIds);
          const originalCount = batch.images.length;
          batch.images = batch.images.filter(img => !removeSet.has(img.image_id));
          const removedCount = originalCount - batch.images.length;
          
          await writeQuarterlyBatch(batch);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              quarter,
              removed_count: removedCount,
              remaining_count: batch.images.length
            })
          };
        }
        
        case "approveQuarterly": {
          // Approve a quarterly batch for submission
          const { quarter: targetQuarter } = body;
          const quarter = targetQuarter || getCurrentQuarter();
          
          const batch = await readQuarterlyBatch(quarter);
          if (!batch) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Quarterly batch not found" })
            };
          }
          
          if (batch.status !== "draft") {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: `Batch is already ${batch.status}` })
            };
          }
          
          if (batch.images.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Cannot approve empty batch" })
            };
          }
          
          // Assign submission groups
          const { images, groups } = assignSubmissionGroups([...batch.images]);
          batch.images = images;
          batch.status = "approved";
          batch.approved_at = new Date().toISOString();
          batch.submissions = {};
          
          for (const group of groups) {
            batch.submissions[group.group] = {
              image_count: group.count
            };
          }
          
          await writeQuarterlyBatch(batch);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              quarter,
              status: batch.status,
              submission_count: groups.length,
              submissions: groups
            })
          };
        }
        
        case "markAsSubmitted": {
          // Mark batch as submitted to Copyright Office (pending registration number)
          const { quarter: targetQuarter } = body;
          const quarter = targetQuarter || getCurrentQuarter();
          
          const batch = await readQuarterlyBatch(quarter);
          if (!batch) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Quarterly batch not found" })
            };
          }
          
          if (batch.status !== "approved") {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: `Batch must be approved first. Current status: ${batch.status}` })
            };
          }
          
          batch.status = "submitted";
          batch.submitted_at = new Date().toISOString();
          await writeQuarterlyBatch(batch);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              quarter,
              status: batch.status,
              submitted_at: batch.submitted_at
            })
          };
        }
        
        case "recordSubmission": {
          // Record that a submission group was sent to Copyright Office
          const { quarter: targetQuarter, group, registration_number, submitted_at } = body;
          const quarter = targetQuarter || getCurrentQuarter();
          
          if (!group || !registration_number) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing group or registration_number" })
            };
          }
          
          const batch = await readQuarterlyBatch(quarter);
          if (!batch) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Quarterly batch not found" })
            };
          }
          
          if (!batch.submissions?.[group]) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: `Submission group ${group} not found` })
            };
          }
          
          batch.submissions[group].registration_number = registration_number;
          batch.submissions[group].submitted_at = submitted_at || new Date().toISOString();
          
          // Check if all groups have registration numbers
          const allSubmitted = Object.values(batch.submissions).every(s => s.registration_number);
          if (allSubmitted) {
            batch.status = "submitted";
            batch.submitted_at = new Date().toISOString();
          }
          
          await writeQuarterlyBatch(batch);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              quarter,
              group,
              registration_number,
              all_submitted: allSubmitted
            })
          };
        }
        
        case "processQuarterly": {
          // Final processing: update master registry from quarterly batch
          const { quarter: targetQuarter } = body;
          const quarter = targetQuarter || getCurrentQuarter();
          
          const batch = await readQuarterlyBatch(quarter);
          if (!batch) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Quarterly batch not found" })
            };
          }
          
          if (batch.status !== "submitted") {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Batch must be submitted before processing" })
            };
          }
          
          // Verify all groups have registration numbers
          const missingReg = Object.entries(batch.submissions || {})
            .filter(([_, s]) => !s.registration_number)
            .map(([g]) => g);
          
          if (missingReg.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                error: "Missing registration numbers",
                missing_groups: missingReg
              })
            };
          }
          
          // Update master registry
          const registry = await readRegistry();
          const ledgerEntries = [];
          
          for (const img of batch.images) {
            const group = img.submission_group;
            const submissionInfo = batch.submissions[group];
            const batchId = `${quarter}-${group}`;
            
            registry.registrations[img.image_id] = {
              registered: true,
              submission_date: submissionInfo.submitted_at?.split("T")[0] || new Date().toISOString().split("T")[0],
              registration_number: submissionInfo.registration_number,
              batch_id: batchId,
              title_at_submission: img.title_snapshot
            };
            
            ledgerEntries.push({
              image_id: img.image_id,
              batch_id: batchId,
              registration_number: submissionInfo.registration_number,
              submission_date: submissionInfo.submitted_at?.split("T")[0] || new Date().toISOString().split("T")[0],
              source_gallery: img.source_gallery,
              title_at_submission: img.title_snapshot || ""
            });
          }
          
          await writeRegistry(registry);
          await appendToLedger(ledgerEntries);
          
          // Mark batch as processed
          batch.status = "processed";
          batch.processed_at = new Date().toISOString();
          await writeQuarterlyBatch(batch);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              quarter,
              processed_count: batch.images.length,
              status: "processed"
            })
          };
        }
        
        case "bulkStatus": {
          // Get status for multiple images at once
          const { imageIds } = body;
          
          if (!imageIds || !Array.isArray(imageIds)) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Missing imageIds array" })
            };
          }
          
          const registry = await readRegistry();
          const batches = await listQuarterlyBatches();
          
          // Build pending batch lookup with status info
          const pendingLookup = {};
          for (const batchInfo of batches) {
            if (batchInfo.status !== "processed") {
              const batch = await readQuarterlyBatch(batchInfo.quarter);
              if (batch?.images) {
                for (const img of batch.images) {
                  pendingLookup[img.image_id] = {
                    quarter: batchInfo.quarter,
                    status: batchInfo.status  // approved, submitted, etc.
                  };
                }
              }
            }
          }
          
          const results = {};
          for (const imageId of imageIds) {
            const registration = registry.registrations[imageId];
            const pendingInfo = pendingLookup[imageId];
            results[imageId] = {
              image_id: imageId,
              is_registered: !!registration?.registered,
              registration: registration || null,
              in_pending_batch: !!pendingInfo,
              pending_quarter: pendingInfo?.quarter || null,
              pending_status: pendingInfo?.status || null,
              is_submitted: pendingInfo?.status === "submitted"
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(results)
          };
        }
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Unknown action: ${action}` })
          };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };

  } catch (err) {
    console.error("Copyright registry error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
