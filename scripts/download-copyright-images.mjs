#!/usr/bin/env node
/**
 * Simple Copyright Package Downloader
 * 
 * Downloads images from quarterly batch directly using the URLs stored in the batch.
 * No gallery loading needed - just converts S thumbnails to larger sizes.
 * 
 * Usage: node scripts/download-copyright-images.mjs [quarter]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COPYRIGHT_DIR = path.join(ROOT, 'src', 'data', 'copyright');

// Get current quarter
function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

// Read quarterly batch file
function readQuarterlyBatch(quarter) {
  const filePath = path.join(COPYRIGHT_DIR, 'quarterly', `copyright-quarterly-${quarter}.json`);
  console.log('Looking for:', filePath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Show Windows folder picker dialog
function browseForFolder(description, defaultPath) {
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
    
    return result === 'CANCELLED' ? null : result;
  } catch (err) {
    console.error('Failed to open folder dialog:', err.message);
    return null;
  }
}

// Download file with HTTPS
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
        reject(new Error(`HTTP ${response.statusCode}`));
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

// Convert thumbnail URL to larger size
function getLargeUrl(thumbnailUrl) {
  // SmugMug URLs: change /S/ to /XL/ and -S.jpg to -XL.jpg
  return thumbnailUrl
    .replace(/\/S\//g, '/XL/')
    .replace(/-S\.jpg/gi, '-XL.jpg')
    .replace(/-S\.png/gi, '-XL.png');
}

// Sanitize filename
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*%]/g, '_').replace(/\s+/g, '_');
}

// Escape CSV
function escapeCSV(value) {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Main
async function main() {
  const quarter = process.argv[2] || getCurrentQuarter();
  const customPath = process.argv[3]; // Optional custom output path
  
  console.log(`\n📦 Copyright Image Downloader`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Quarter: ${quarter}\n`);
  
  // Read batch
  const batch = readQuarterlyBatch(quarter);
  if (!batch) {
    console.error(`❌ No batch found for ${quarter}`);
    process.exit(1);
  }
  
  if (batch.status === 'draft') {
    console.error(`❌ Batch is still in draft. Approve it first.`);
    process.exit(1);
  }
  
  console.log(`✓ Found ${batch.images.length} images (status: ${batch.status})\n`);
  
  // Use provided path, or default to copyright-submissions folder
  const baseDir = customPath || path.join(ROOT, 'copyright-submissions');
  const outputDir = path.join(baseDir, quarter);
  const imagesDir = path.join(outputDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  
  console.log(`\n📁 Saving to: ${outputDir}\n`);
  
  // Download images
  const csvRows = ['Filename,Title'];
  const manifestRows = ['Filename,Title,ImageID,Gallery'];
  let successCount = 0;
  const errors = [];
  
  for (const img of batch.images) {
    // Use download_url if available, otherwise fall back to thumbnail conversion
    let downloadUrl = img.download_url;
    if (!downloadUrl && img.thumbnail_url) {
      downloadUrl = img.thumbnail_url
        .replace(/\/S\//g, '/M/')
        .replace(/-S\.jpg/gi, '-M.jpg')
        .replace(/-S\.png/gi, '-M.png');
    }
    
    if (!downloadUrl) {
      errors.push({ id: img.image_id, error: 'No URL' });
      continue;
    }
    
    // Save as i-xxxx.jpg
    const filename = `${img.image_id}.jpg`;
    const destPath = path.join(imagesDir, filename);
    
    process.stdout.write(`  ⬇️ ${img.image_id}...`);
    
    try {
      await downloadFile(downloadUrl, destPath);
      console.log(' ✓');
      successCount++;
    } catch (e) {
      console.log(` ❌ ${e.message}`);
      errors.push({ id: img.image_id, error: e.message });
      continue;
    }
    
    // Add to CSV
    const title = img.title_snapshot || 'Untitled';
    csvRows.push(`${escapeCSV(filename)},${escapeCSV(title)}`);
    
    const gallery = (img.source_gallery || '').split('/').slice(-2).join('/').replace('.mjs', '');
    manifestRows.push(`${escapeCSV(filename)},${escapeCSV(title)},${img.image_id},${escapeCSV(gallery)}`);
  }
  
  // Write CSV files
  fs.writeFileSync(path.join(outputDir, `${quarter}-submission.csv`), csvRows.join('\n'));
  fs.writeFileSync(path.join(outputDir, `${quarter}-manifest.csv`), manifestRows.join('\n'));
  
  if (errors.length > 0) {
    fs.writeFileSync(
      path.join(outputDir, `${quarter}-errors.txt`), 
      errors.map(e => `${e.id}: ${e.error}`).join('\n')
    );
  }
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ DONE`);
  console.log(`   Downloaded: ${successCount}/${batch.images.length} images`);
  console.log(`   Location: ${outputDir}`);
  console.log(`   Files:`);
  console.log(`     - images/ folder`);
  console.log(`     - ${quarter}-submission.csv (for Copyright Office)`);
  console.log(`     - ${quarter}-manifest.csv (your records)`);
  if (errors.length > 0) {
    console.log(`   ⚠️ Errors: ${errors.length} (see ${quarter}-errors.txt)`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
