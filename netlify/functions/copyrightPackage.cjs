// netlify/functions/copyrightPackage.js
// Generate and download copyright submission package (ZIP with images + CSV)

const fs = require("fs").promises;
const path = require("path");
const https = require("https");
const http = require("http");

const COPYRIGHT_DIR = path.join(process.cwd(), "src/data/copyright");
const QUARTERLY_DIR = path.join(COPYRIGHT_DIR, "quarterly");

// Get current quarter
function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

// Read quarterly batch file
async function readQuarterlyBatch(quarter) {
  const filePath = path.join(QUARTERLY_DIR, `copyright-quarterly-${quarter}.json`);
  console.log("COPYRIGHT_DIR:", COPYRIGHT_DIR);
  console.log("QUARTERLY_DIR:", QUARTERLY_DIR);
  console.log("Looking for batch at:", filePath);
  console.log("process.cwd():", process.cwd());
  try {
    // Check if directory exists
    const dirExists = await fs.access(QUARTERLY_DIR).then(() => true).catch(() => false);
    console.log("Directory exists:", dirExists);
    
    if (dirExists) {
      const files = await fs.readdir(QUARTERLY_DIR);
      console.log("Files in directory:", files);
    }
    
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Failed to read batch:", err.message);
    return null;
  }
}

// Download file from URL
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

// Sanitize filename
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
}

// Escape CSV value
function escapeCSV(value) {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert S thumbnail URL to larger version
function getLargerImageUrl(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  
  // Try to get XL or L version instead of S
  // SmugMug URL pattern: .../S/filename-S.jpg -> .../XL/filename-XL.jpg
  let url = thumbnailUrl;
  
  // Replace size in path and filename
  url = url.replace(/\/S\//g, "/XL/").replace(/-S\./g, "-XL.");
  
  return url;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const quarter = event.queryStringParameters?.quarter || getCurrentQuarter();
    
    // Read batch
    const batch = await readQuarterlyBatch(quarter);
    if (!batch) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: `No batch found for ${quarter}`,
          debug: {
            cwd: process.cwd(),
            quarterlyDir: QUARTERLY_DIR,
            expectedFile: path.join(QUARTERLY_DIR, `copyright-quarterly-${quarter}.json`)
          }
        })
      };
    }

    if (batch.status === "draft") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Batch is still in draft. Please approve it first." })
      };
    }

    // We'll use archiver for ZIP creation
    const archiver = require("archiver");
    const { PassThrough } = require("stream");

    // Create a pass-through stream to collect ZIP data
    const passthrough = new PassThrough();
    const chunks = [];
    passthrough.on("data", (chunk) => chunks.push(chunk));

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(passthrough);

    const csvRows = ["Filename,Title"];
    const manifestRows = ["Filename,Title,ImageID,Gallery"];
    let downloadedCount = 0;
    const errors = [];

    // Process each image
    for (const img of batch.images) {
      const thumbnailUrl = img.thumbnail_url;
      if (!thumbnailUrl) {
        errors.push({ id: img.image_id, error: "No thumbnail URL" });
        continue;
      }

      // Try to get larger version
      const largeUrl = getLargerImageUrl(thumbnailUrl);
      
      // Extract filename parts
      const urlPath = new URL(thumbnailUrl).pathname;
      const originalName = urlPath.split("/").pop();
      const ext = path.extname(originalName) || ".jpg";
      const baseName = path.basename(originalName, ext).replace(/-S$/, "");
      const newFilename = `${sanitizeFilename(baseName)}_${img.image_id}${ext}`;

      try {
        // Try large first, fall back to thumbnail
        let imageData;
        try {
          imageData = await downloadFile(largeUrl);
        } catch (e) {
          // Fall back to original thumbnail
          imageData = await downloadFile(thumbnailUrl);
        }

        archive.append(imageData, { name: `images/${newFilename}` });
        downloadedCount++;

        // Add to CSV
        const title = (img.title_snapshot || "Untitled").replace(/"/g, '""');
        csvRows.push(`${escapeCSV(newFilename)},${escapeCSV(title)}`);

        // Add to manifest
        const gallery = (img.source_gallery || "")
          .split("/")
          .slice(-2)
          .join("/")
          .replace(".mjs", "");
        manifestRows.push(
          `${escapeCSV(newFilename)},${escapeCSV(title)},${img.image_id},${escapeCSV(gallery)}`
        );
      } catch (err) {
        errors.push({ id: img.image_id, error: err.message });
      }
    }

    // Add CSV files
    archive.append(csvRows.join("\n"), { name: `${quarter}-submission.csv` });
    archive.append(manifestRows.join("\n"), { name: `${quarter}-manifest.csv` });

    // Add errors log if any
    if (errors.length > 0) {
      const errorLog = errors.map((e) => `${e.id}: ${e.error}`).join("\n");
      archive.append(errorLog, { name: `${quarter}-errors.txt` });
    }

    // Finalize archive
    await archive.finalize();

    // Wait for all data
    await new Promise((resolve) => passthrough.on("end", resolve));

    const zipBuffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="copyright-submission-${quarter}.zip"`,
      },
      body: zipBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("Error generating package:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
