#!/usr/bin/env node
/**
 * Generate Copyright Submission Package
 * 
 * Downloads images and creates Excel file for Copyright Office submission.
 * 
 * Usage:
 *   node scripts/generate-copyright-submission.mjs [quarter] [group]
 *   
 * Examples:
 *   node scripts/generate-copyright-submission.mjs              # Current quarter, all groups
 *   node scripts/generate-copyright-submission.mjs 2025-Q4      # Specific quarter
 *   node scripts/generate-copyright-submission.mjs 2025-Q4 A    # Specific group
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Configuration
const COPYRIGHT_DIR = path.join(ROOT, 'src', 'data', 'copyright');

// Show Windows folder picker dialog
function browseForFolder(description, defaultPath) {
  // PowerShell script to show folder browser dialog
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$browser = New-Object System.Windows.Forms.FolderBrowserDialog
$browser.Description = "${description}"
$browser.SelectedPath = "${defaultPath.replace(/\\/g, '\\\\')}"
$browser.ShowNewFolderButton = $true
$result = $browser.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $browser.SelectedPath
} else {
    Write-Output "CANCELLED"
}
`;
  
  try {
    const result = execSync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf-8',
      windowsHide: true
    }).trim();
    
    if (result === 'CANCELLED') {
      return null;
    }
    return result;
  } catch (err) {
    console.error('Failed to open folder dialog:', err.message);
    return null;
  }
}

// Get current quarter
function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

// Read quarterly batch file
function readQuarterlyBatch(quarter) {
  const filePath = path.join(COPYRIGHT_DIR, 'quarterly', `copyright-quarterly-${quarter}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Dynamically import a gallery .mjs file
async function loadGalleryData(galleryPath) {
  try {
    // Normalize path
    let fullPath = galleryPath;
    if (!path.isAbsolute(galleryPath)) {
      fullPath = path.join(ROOT, galleryPath);
    }
    if (!fullPath.endsWith('.mjs')) {
      fullPath += '.mjs';
    }
    
    const fileUrl = `file://${fullPath.replace(/\\/g, '/')}`;
    const module = await import(fileUrl);
    return module.galleryData || [];
  } catch (err) {
    console.error(`Failed to load gallery: ${galleryPath}`, err.message);
    return [];
  }
}

// Find image in gallery data
function findImageInGallery(galleryData, imageId) {
  return galleryData.find(img => img.id === imageId);
}

// Get best source URL (prefer srcS, fallback to srcM, srcL, src)
function getBestSrc(image) {
  return image.srcS || image.srcM || image.srcL || image.src || null;
}

// Extract filename from URL
function getFilenameFromUrl(url) {
  if (!url) return null;
  const urlPath = new URL(url).pathname;
  return path.basename(urlPath);
}

// Download file from URL
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
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

// Generate safe filename
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

// Escape CSV value
function escapeCSV(value) {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Main function
async function generateSubmissionPackage(targetQuarter, targetGroup) {
  const quarter = targetQuarter || getCurrentQuarter();
  console.log(`\n📦 Copyright Submission Package Generator`);
  console.log(`${'='.repeat(50)}\n`);
  
  // Read quarterly batch
  const batch = readQuarterlyBatch(quarter);
  if (!batch) {
    console.error(`❌ No batch found for ${quarter}`);
    process.exit(1);
  }
  
  if (batch.status === 'draft') {
    console.error(`❌ Batch is still in draft status. Please approve it first.`);
    process.exit(1);
  }
  
  console.log(`📋 Quarter: ${quarter}`);
  console.log(`📋 Batch status: ${batch.status}`);
  console.log(`📷 Total images: ${batch.images.length}\n`);
  
  // Show folder picker dialog
  console.log(`📂 Opening folder picker...`);
  const defaultDir = path.join(ROOT, 'copyright-submissions');
  const selectedDir = browseForFolder(`Select folder to save ${quarter} submission package`, defaultDir);
  
  if (!selectedDir) {
    console.log('\n❌ Cancelled by user.');
    process.exit(0);
  }
  
  // Create quarter subfolder in selected location
  const submissionDir = path.join(selectedDir, quarter);
  const imagesDir = path.join(submissionDir, 'images');
  
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log(`\n📁 Saving to: ${submissionDir}\n`);
  
  // Group images by gallery for efficient loading
  const imagesByGallery = new Map();
  for (const img of batch.images) {
    const gallery = img.source_gallery || 'unknown';
    if (!imagesByGallery.has(gallery)) {
      imagesByGallery.set(gallery, []);
    }
    imagesByGallery.get(gallery).push(img);
  }
  
  console.log(`📂 Images from ${imagesByGallery.size} galleries\n`);
  
  // Track results for CSV
  const csvRows = [];
  const errors = [];
  let downloadCount = 0;
  
  // Process each gallery
  for (const [galleryPath, images] of imagesByGallery) {
    console.log(`\n📂 Loading gallery: ${galleryPath}`);
    const galleryData = await loadGalleryData(galleryPath);
    
    if (galleryData.length === 0) {
      console.log(`   ⚠️ Could not load gallery data`);
      for (const img of images) {
        errors.push({ id: img.image_id, error: 'Gallery not found' });
      }
      continue;
    }
    
    // Process each image in this gallery
    for (const batchImage of images) {
      const imageId = batchImage.image_id;
      const fullImage = findImageInGallery(galleryData, imageId);
      
      if (!fullImage) {
        console.log(`   ⚠️ Image ${imageId} not found in gallery`);
        errors.push({ id: imageId, error: 'Image not found in gallery' });
        continue;
      }
      
      const srcUrl = getBestSrc(fullImage);
      if (!srcUrl) {
        console.log(`   ⚠️ No source URL for ${imageId}`);
        errors.push({ id: imageId, error: 'No source URL' });
        continue;
      }
      
      // Determine filename
      const originalFilename = getFilenameFromUrl(srcUrl);
      const ext = path.extname(originalFilename) || '.jpg';
      const baseName = path.basename(originalFilename, ext);
      const newFilename = `${sanitizeFilename(baseName)}_${imageId}${ext}`;
      const destPath = path.join(imagesDir, newFilename);
      
      // Download if not already exists
      if (!fs.existsSync(destPath)) {
        try {
          process.stdout.write(`   ⬇️ Downloading ${imageId}...`);
          await downloadFile(srcUrl, destPath);
          console.log(' ✓');
          downloadCount++;
        } catch (err) {
          console.log(` ❌ ${err.message}`);
          errors.push({ id: imageId, error: err.message });
          continue;
        }
      } else {
        console.log(`   ✓ Already downloaded: ${imageId}`);
      }
      
      // Add to CSV
      csvRows.push({
        filename: newFilename,
        title: fullImage.title || batchImage.title || 'Untitled',
        image_id: imageId,
        gallery: galleryPath
      });
    }
  }
  
  // Generate CSV file for Copyright Office
  // Format: Filename, Title (as required by Copyright Office)
  console.log(`\n📄 Generating submission CSV...`);
  
  const csvContent = [
    'Filename,Title',
    ...csvRows.map(row => `${escapeCSV(row.filename)},${escapeCSV(row.title)}`)
  ].join('\n');
  
  const csvPath = path.join(submissionDir, `${quarter}-submission.csv`);
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`   ✓ Saved: ${csvPath}`);
  
  // Generate detailed manifest (for your records)
  const manifestContent = [
    'Filename,Title,ImageID,Gallery',
    ...csvRows.map(row => 
      `${escapeCSV(row.filename)},${escapeCSV(row.title)},${row.image_id},${escapeCSV(row.gallery)}`
    )
  ].join('\n');
  
  const manifestPath = path.join(submissionDir, `${quarter}-manifest.csv`);
  fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
  console.log(`   ✓ Saved: ${manifestPath}`);
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ SUBMISSION PACKAGE READY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📁 Location: ${submissionDir}`);
  console.log(`📷 Images downloaded: ${downloadCount}`);
  console.log(`📋 CSV rows: ${csvRows.length}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️ Errors (${errors.length}):`);
    for (const err of errors) {
      console.log(`   - ${err.id}: ${err.error}`);
    }
  }
  
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review images in: ${imagesDir}`);
  console.log(`   2. Create ZIP of images folder`);
  console.log(`   3. Upload ${quarter}-submission.csv and ZIP to Copyright Office`);
  console.log(`   4. After receiving VA number, enter it in Copyright Manager`);
  console.log('');
}

// Parse command line args
const args = process.argv.slice(2);
const quarter = args[0] || null;
const group = args[1] || null;

generateSubmissionPackage(quarter, group).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
