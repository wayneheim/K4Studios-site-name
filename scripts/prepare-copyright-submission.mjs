#!/usr/bin/env node
/**
 * prepare-copyright-submission.mjs
 * 
 * Downloads images from an approved quarterly batch and prepares
 * the submission package for the Copyright Office:
 * - Images renamed with ID: originalname_i-xxx.jpg
 * - CSV file with: filename, title (for Copyright Office upload)
 * 
 * Usage:
 *   node scripts/prepare-copyright-submission.mjs [quarter] [group]
 *   
 * Examples:
 *   node scripts/prepare-copyright-submission.mjs 2025-Q4 A
 *   node scripts/prepare-copyright-submission.mjs  # Uses current quarter, group A
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ============ Configuration ============

const COPYRIGHT_DIR = path.join(ROOT, "src/data/copyright");
const OUTPUT_BASE = path.join(ROOT, "copyright-submissions");

// ============ Utilities ============

function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode} - ${url}`));
        return;
      }
      
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      
      file.on("finish", () => {
        file.close();
        resolve();
      });
      
      file.on("error", (err) => {
        fs.unlink(destPath, () => {}); // Delete partial file
        reject(err);
      });
    });
    
    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Timeout downloading: ${url}`));
    });
  });
}

function sanitizeFilename(name) {
  // Remove or replace problematic characters
  return name
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 200); // Limit length
}

function getExtension(url) {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

// ============ Gallery Data Loading ============

async function loadGalleryData(galleryPath) {
  // Convert relative path to absolute
  let fullPath = galleryPath;
  if (!path.isAbsolute(galleryPath)) {
    fullPath = path.join(ROOT, galleryPath);
  }
  
  // Ensure .mjs extension
  if (!fullPath.endsWith(".mjs")) {
    fullPath += ".mjs";
  }
  
  try {
    const module = await import(`file://${fullPath}`);
    return module.galleryData || [];
  } catch (err) {
    console.error(`  Failed to load gallery: ${galleryPath}`, err.message);
    return [];
  }
}

async function findImageData(imageId, sourceGallery) {
  const galleryData = await loadGalleryData(sourceGallery);
  return galleryData.find(img => img.id === imageId);
}

// ============ Main Processing ============

async function prepareBatch(quarter, group) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Preparing Copyright Submission: ${quarter} - Group ${group}`);
  console.log("=".repeat(60));
  
  // Read quarterly batch
  const batchPath = path.join(COPYRIGHT_DIR, `quarterly-${quarter}.json`);
  const batch = readJSON(batchPath);
  
  if (!batch) {
    console.error(`\n❌ Batch not found: ${batchPath}`);
    console.error(`   Make sure you've approved the batch in the Copyright Manager.`);
    process.exit(1);
  }
  
  if (batch.status !== "approved" && batch.status !== "submitted") {
    console.error(`\n❌ Batch status is "${batch.status}" - must be "approved" or "submitted"`);
    console.error(`   Approve the batch in Copyright Manager first.`);
    process.exit(1);
  }
  
  // Get images for this group (max 750 per group)
  const startIdx = (group.charCodeAt(0) - 65) * 750; // A=0, B=750, C=1500...
  const endIdx = startIdx + 750;
  const groupImages = batch.images.slice(startIdx, endIdx);
  
  if (groupImages.length === 0) {
    console.error(`\n❌ No images found for group ${group}`);
    process.exit(1);
  }
  
  console.log(`\n📦 Found ${groupImages.length} images in group ${group}`);
  
  // Create output directory
  const outputDir = path.join(OUTPUT_BASE, `${quarter}-${group}`);
  const imagesDir = path.join(outputDir, "images");
  
  if (fs.existsSync(outputDir)) {
    console.log(`\n⚠️  Output directory exists: ${outputDir}`);
    console.log(`   Delete it manually if you want to regenerate.`);
    // Continue anyway - will skip existing files
  }
  
  fs.mkdirSync(imagesDir, { recursive: true });
  
  // Process each image
  const csvRows = [["Filename", "Title"]]; // Header row
  const errors = [];
  let downloaded = 0;
  let skipped = 0;
  
  console.log(`\n📥 Downloading images...`);
  
  for (let i = 0; i < groupImages.length; i++) {
    const batchImage = groupImages[i];
    const imageId = batchImage.image_id;
    const sourceGallery = batchImage.source_gallery;
    const title = batchImage.title || "Untitled";
    
    // Progress
    process.stdout.write(`\r   [${i + 1}/${groupImages.length}] ${imageId}...`);
    
    try {
      // Load full image data from gallery to get src URL
      const imageData = await findImageData(imageId, sourceGallery);
      
      if (!imageData || !imageData.src) {
        errors.push({ imageId, error: "No src URL found in gallery" });
        continue;
      }
      
      const srcUrl = imageData.src;
      
      // Build filename: originalname_i-xxx.ext
      const urlPath = new URL(srcUrl).pathname;
      const originalName = path.basename(urlPath, path.extname(urlPath));
      const ext = getExtension(srcUrl);
      const newFilename = sanitizeFilename(`${originalName}_${imageId}`) + ext;
      const destPath = path.join(imagesDir, newFilename);
      
      // Skip if already downloaded
      if (fs.existsSync(destPath)) {
        skipped++;
        csvRows.push([newFilename, title]);
        continue;
      }
      
      // Download the image
      await downloadFile(srcUrl, destPath);
      downloaded++;
      
      // Add to CSV
      csvRows.push([newFilename, title]);
      
    } catch (err) {
      errors.push({ imageId, error: err.message });
    }
  }
  
  console.log(`\n\n✅ Downloaded: ${downloaded} images`);
  if (skipped > 0) console.log(`⏭️  Skipped (already exist): ${skipped}`);
  if (errors.length > 0) console.log(`❌ Errors: ${errors.length}`);
  
  // Write CSV file
  const csvPath = path.join(outputDir, `submission-${quarter}-${group}.csv`);
  const csvContent = csvRows.map(row => 
    row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n📄 CSV saved: ${csvPath}`);
  
  // Write error log if any
  if (errors.length > 0) {
    const errorPath = path.join(outputDir, `errors-${quarter}-${group}.json`);
    fs.writeFileSync(errorPath, JSON.stringify(errors, null, 2));
    console.log(`⚠️  Error log: ${errorPath}`);
  }
  
  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUBMISSION PACKAGE READY`);
  console.log("=".repeat(60));
  console.log(`\n📁 Output folder: ${outputDir}`);
  console.log(`   ├── images/          (${downloaded + skipped} image files)`);
  console.log(`   └── submission-${quarter}-${group}.csv`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. ZIP the "images" folder`);
  console.log(`   2. Upload ZIP + CSV to Copyright Office`);
  console.log(`   3. When you receive the VA number, enter it in Copyright Manager`);
  console.log(`\n`);
}

// ============ CLI ============

const args = process.argv.slice(2);
const quarter = args[0] || getCurrentQuarter();
const group = (args[1] || "A").toUpperCase();

if (!/^\d{4}-Q[1-4]$/.test(quarter)) {
  console.error(`Invalid quarter format: ${quarter}`);
  console.error(`Expected: YYYY-Q# (e.g., 2025-Q4)`);
  process.exit(1);
}

if (!/^[A-Z]$/.test(group)) {
  console.error(`Invalid group: ${group}`);
  console.error(`Expected: A, B, C, etc.`);
  process.exit(1);
}

prepareBatch(quarter, group).catch(err => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
