// netlify/functions/photoShootScraper.js
// Photo Shoot Scraper API - Local-only admin tool for /Other/Photo-Shoots ingestion
// 
// SCOPE GUARDRAILS (per Quill's spec):
// ❌ No copyright batching
// ❌ No legacy backfill  
// ❌ No EXIF parsing
// ❌ No rolling 90-day logic
// ❌ No changes to main gallery ingestion
// ❌ No destructive updates to existing .mjs files
//
// This UI exists ONLY to manage SmugMug → /Other/Photo-Shoots ingestion safely.

const fs = require("fs");
const path = require("path");

const SCRAPER_VERSION = "scrapev22.ts";
const PHOTO_SHOOTS_ROOT = "src/data/Other/Photo-Shoots";
const TEMP_SCRAPE_FILE = "cowboy-scraper/data/_temp_scrape.mjs";
const toPosix = (p = "") => String(p).replace(/\\/g, "/");
const hasTraversal = (p = "") => p.split(/[\\/]+/).some(seg => seg === "..");

// Validate path is under Photo-Shoots only
function validatePhotoShootPath(relativePath) {
  const rel = toPosix(String(relativePath || "").replace(/^\//, ""));
  if (!rel || hasTraversal(rel)) {
    throw new Error("Invalid path: traversal detected");
  }
  if (!rel.startsWith(toPosix(PHOTO_SHOOTS_ROOT) + "/") && rel !== toPosix(PHOTO_SHOOTS_ROOT)) {
    throw new Error(`Path must be under ${PHOTO_SHOOTS_ROOT}`);
  }
  return path.join(process.cwd(), rel);
}

// Recursively list directory structure
function listDirectoryTree(dirPath, basePath = "") {
  const result = { folders: [], files: [] };
  
  if (!fs.existsSync(dirPath)) {
    return result;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      result.folders.push({
        name: entry.name,
        path: relativePath,
        children: listDirectoryTree(path.join(dirPath, entry.name), relativePath)
      });
    } else if (entry.name.endsWith(".mjs")) {
      result.files.push({
        name: entry.name,
        path: relativePath
      });
    }
  }
  
  return result;
}

// Parse .mjs file to extract galleryData array
function parseGalleryData(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, "utf8");
  
  // Try to extract JSON array from the file
  // Handle both: export const galleryData = [...] and raw JSON
  let match = content.match(/export\s+const\s+galleryData\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
  if (!match) {
    // Try without the trailing semicolon requirement
    match = content.match(/galleryData\s*=\s*(\[[\s\S]*\])/);
  }
  
  if (match) {
    try {
      // Clean up the JSON - handle template literals, etc.
      let jsonStr = match[1];
      // Replace String.raw`...` with regular strings
      jsonStr = jsonStr.replace(/String\.raw`([^`]*)`/g, (_, content) => JSON.stringify(content));
      const fn = new Function(`return ${jsonStr}`);
      return fn();
    } catch (e) {
      console.error("Failed to parse galleryData with Function:", e.message);
      // Try JSON.parse as fallback
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        console.error("Failed to parse galleryData with JSON.parse:", e2.message);
        return [];
      }
    }
  }
  
  return [];
}

// Build .mjs file content
function buildMjsContent(galleryData) {
  return `export const galleryData = ${JSON.stringify(galleryData, null, 2)};\n`;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const action = event.queryStringParameters?.action;

    // GET: List folder structure
    if (event.httpMethod === "GET" && action === "list") {
      const rootPath = path.join(process.cwd(), PHOTO_SHOOTS_ROOT);
      // Pass the root as the basePath so all paths are fully qualified
      const tree = listDirectoryTree(rootPath, PHOTO_SHOOTS_ROOT);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          root: PHOTO_SHOOTS_ROOT,
          tree,
          scraperVersion: SCRAPER_VERSION
        })
      };
    }

    // GET: Read existing .mjs file
    if (event.httpMethod === "GET" && action === "read") {
      const filePath = event.queryStringParameters?.path;
      if (!filePath) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing path parameter" }) };
      }

      // Handle both relative paths and full paths
      let absPath;
      try {
        if (filePath.startsWith(PHOTO_SHOOTS_ROOT)) {
          absPath = path.join(process.cwd(), filePath);
        } else {
          absPath = validatePhotoShootPath(`${PHOTO_SHOOTS_ROOT}/${filePath}`);
        }
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
      }

      if (!absPath.endsWith(".mjs")) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Path must be a .mjs file" }) };
      }

      if (!fs.existsSync(absPath)) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "File not found", path: absPath }) };
      }

      const data = parseGalleryData(absPath);
      const existingIds = data.map(d => d.id).filter(Boolean);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          path: filePath,
          count: data.length,
          existingIds,
          data
        })
      };
    }

    // GET: Read temp scrape file
    if (event.httpMethod === "GET" && action === "readTemp") {
      const tempPath = path.join(process.cwd(), TEMP_SCRAPE_FILE);
      
      if (!fs.existsSync(tempPath)) {
        return { 
          statusCode: 404, 
          headers, 
          body: JSON.stringify({ 
            error: "No scraped data found. Run the scraper first.",
            expectedPath: TEMP_SCRAPE_FILE
          }) 
        };
      }

      const stat = fs.statSync(tempPath);
      const data = parseGalleryData(tempPath);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          path: TEMP_SCRAPE_FILE,
          count: data.length,
          lastModified: stat.mtime.toISOString(),
          data
        })
      };
    }

    // POST: Save/merge data
    if (event.httpMethod === "POST" && action === "save") {
      const body = JSON.parse(event.body || "{}");
      const { targetPath, scrapedData, isNewFile } = body;

      if (!targetPath || !scrapedData) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing targetPath or scrapedData" }) };
      }

      // Build full path
      let absPath;
      try {
        if (targetPath.startsWith(PHOTO_SHOOTS_ROOT)) {
          absPath = path.join(process.cwd(), targetPath);
        } else {
          absPath = path.join(process.cwd(), PHOTO_SHOOTS_ROOT, targetPath);
        }
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
      }

      if (!absPath.endsWith(".mjs")) {
        absPath += ".mjs";
      }

      // Validate it's under Photo-Shoots
      const relPath = toPosix(path.relative(process.cwd(), absPath));
      if (!relPath.startsWith(toPosix(PHOTO_SHOOTS_ROOT))) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Path must be under ${PHOTO_SHOOTS_ROOT}` }) };
      }

      const today = getTodayDate();
      let finalData = [];
      let stats = { existing: 0, added: 0, skipped: 0 };

      if (isNewFile || !fs.existsSync(absPath)) {
        // NEW FILE: All images get first_seen = today
        finalData = scrapedData.map((img, idx) => ({
          ...img,
          first_seen: today,
          sortOrder: img.sortOrder ?? (idx - 1) // ghost is -1, first real image is 0
        }));
        stats.added = finalData.length;
        
        console.log(`Creating new file with ${stats.added} images`);
      } else {
        // MERGE: Only append new IDs
        const existingData = parseGalleryData(absPath);
        const existingIds = new Set(existingData.map(d => d.id).filter(Boolean));
        
        stats.existing = existingData.length;
        
        // Start with existing data (never modify)
        finalData = [...existingData];
        
        // Find max sortOrder in existing data
        let maxSortOrder = Math.max(-1, ...existingData.map(d => d.sortOrder ?? 0));
        
        // Append only new images
        for (const img of scrapedData) {
          if (!img.id) {
            stats.skipped++;
            continue;
          }
          
          if (existingIds.has(img.id)) {
            stats.skipped++;
            continue;
          }
          
          // New image - assign first_seen and append
          maxSortOrder++;
          finalData.push({
            ...img,
            first_seen: today,
            sortOrder: maxSortOrder
          });
          stats.added++;
        }
        
        console.log(`Merge complete: ${stats.existing} existing, ${stats.added} added, ${stats.skipped} skipped`);
      }

      // Ensure directory exists
      const dir = path.dirname(absPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      const content = buildMjsContent(finalData);
      fs.writeFileSync(absPath, content, "utf8");

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          path: relPath,
          stats,
          totalCount: finalData.length
        })
      };
    }

    // POST: Create folder
    if (event.httpMethod === "POST" && action === "createFolder") {
      const body = JSON.parse(event.body || "{}");
      const { folderPath } = body;

      if (!folderPath) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing folderPath" }) };
      }

      let absPath;
      if (folderPath.startsWith(PHOTO_SHOOTS_ROOT)) {
        absPath = path.join(process.cwd(), folderPath);
      } else {
        absPath = path.join(process.cwd(), PHOTO_SHOOTS_ROOT, folderPath);
      }

      if (!fs.existsSync(absPath)) {
        fs.mkdirSync(absPath, { recursive: true });
      }

      const relPath = toPosix(path.relative(process.cwd(), absPath));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, path: relPath })
      };
    }

    // POST: Scrape - spawn the puppeteer scraper
    if (event.httpMethod === "POST" && action === "scrape") {
      const body = JSON.parse(event.body || "{}");
      const { outputPath, gallerySlug, isNewFile, existingIds = [] } = body;

      if (!outputPath) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing outputPath" }) };
      }

      // Build the absolute output path
      let absOutputPath;
      if (outputPath.startsWith(PHOTO_SHOOTS_ROOT)) {
        absOutputPath = path.join(process.cwd(), outputPath);
      } else {
        absOutputPath = path.join(process.cwd(), PHOTO_SHOOTS_ROOT, outputPath);
      }
      if (!absOutputPath.endsWith(".mjs")) {
        absOutputPath += ".mjs";
      }

      // Ensure output directory exists
      const outDir = path.dirname(absOutputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // Spawn the scraper as a child process using tsx
      const { spawn } = require("child_process");
      const scraperDir = path.join(process.cwd(), "cowboy-scraper");
      const scraperFile = SCRAPER_VERSION; // relative to scraperDir
      
      // Convert to forward slashes for cross-platform compatibility
      const outPathForArg = absOutputPath.replace(/\\/g, "/");
      
      // Build scraper arguments - use npx tsx to run TypeScript
      // Pass args separately to avoid shell escaping issues
      const scraperArgs = [
        "tsx",
        scraperFile,
        `--out=${outPathForArg}`,
      ];
      if (gallerySlug) {
        scraperArgs.push(`--slug=${gallerySlug}`);
      }

      console.log(`[scrape] Starting scraper: npx ${scraperArgs.join(" ")}`);
      console.log(`[scrape] Working dir: ${scraperDir}`);
      console.log(`[scrape] Output path: ${outPathForArg}`);

      return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";

        // On Windows, use shell: true to properly resolve npx
        const proc = spawn("npx", scraperArgs, {
          cwd: scraperDir,
          stdio: ["ignore", "pipe", "pipe"],
          shell: true,
          env: { ...process.env, FORCE_COLOR: "0" }
        });

        proc.stdout.on("data", (d) => { stdout += d.toString(); });
        proc.stderr.on("data", (d) => { stderr += d.toString(); });

        proc.on("error", (err) => {
          console.error(`[scrape] Spawn error: ${err.message}`);
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `Failed to spawn scraper: ${err.message}` })
          });
        });

        proc.on("close", (code) => {
          console.log(`[scrape] Scraper exited with code ${code}`);
          console.log(`[scrape] stdout (last 1000): ${stdout.slice(-1000)}`);
          if (stderr) console.log(`[scrape] stderr (last 1000): ${stderr.slice(-1000)}`);

          if (code !== 0) {
            resolve({
              statusCode: 500,
              headers,
              body: JSON.stringify({ 
                error: `Scraper exited with code ${code}`,
                stdout: stdout.slice(-2000),
                stderr: stderr.slice(-2000)
              })
            });
            return;
          }

          // Read the output file to get results
          try {
            const scrapedData = parseGalleryData(absOutputPath);
            const relPath = toPosix(path.relative(process.cwd(), absOutputPath));
            const today = getTodayDate();
            
            // ONLY add first_seen to NEW records (not in existingIds)
            // Existing records must NEVER be modified
            const existingSet = new Set(existingIds);
            let addedFirstSeen = 0;
            const updatedData = scrapedData.map(record => {
              // Only add first_seen to NEW images (not already in file)
              if (!record.first_seen && record.id && !existingSet.has(record.id)) {
                addedFirstSeen++;
                return { ...record, first_seen: today };
              }
              return record;
            });
            
            // Write the updated data back with first_seen (only if we added to new records)
            if (addedFirstSeen > 0) {
              const content = buildMjsContent(updatedData);
              fs.writeFileSync(absOutputPath, content, "utf8");
              console.log(`[scrape] Added first_seen to ${addedFirstSeen} NEW records`);
            }
            
            // Count stats
            const added = updatedData.filter(d => d.id && !existingSet.has(d.id)).length;
            const skipped = updatedData.filter(d => d.id && existingSet.has(d.id)).length;

            resolve({
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                path: relPath,
                stats: {
                  total: updatedData.length,
                  added: isNewFile ? updatedData.length : added,
                  skipped: isNewFile ? 0 : skipped,
                  existing: existingIds.length
                }
              })
            });
          } catch (parseErr) {
            resolve({
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: `Failed to parse scrape result: ${parseErr.message}` })
            });
          }
        });
      });
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Unknown action. Use: list, read, readTemp, save, createFolder, scrape" })
    };

  } catch (err) {
    console.error("photoShootScraper error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Internal server error" })
    };
  }
};
