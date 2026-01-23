#!/usr/bin/env node
/**
 * sync-hidden-to-archive.mjs
 * 
 * Scans all gallery .mjs files for images with visibility: "hidden"
 * and adds them to Archive.mjs if not already present.
 * 
 * Run: node scripts/sync-hidden-to-archive.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/data');
const ARCHIVE_PATH = path.join(DATA_DIR, 'Other/Archive/Archive.mjs');

// Glob-like pattern matching
async function findGalleryFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip Archive folder itself
      if (entry.name === 'Archive') continue;
      await findGalleryFiles(fullPath, files);
    } else if (entry.name.endsWith('.mjs') && !entry.name.startsWith('_')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract array from .mjs file
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

// Build .mjs file content
function buildMjsContent(galleryData) {
  const header = `// Archive Gallery - Auto-managed by updateArchive function
// Images that are hidden from main galleries but still accessible via direct URL
// DO NOT manually edit this file
`;
  const json = JSON.stringify(galleryData, null, 2);
  return `${header}export const galleryData = ${json};
`;
}

// Create ghost entry
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

// Normalize image for archive
function normalizeImage(raw, sourceGalleryPath) {
  const out = {};
  
  if (raw.id != null) out.id = raw.id;
  if (raw.title != null) out.title = raw.title;
  if (raw.description != null) out.description = raw.description;
  if (raw.alt != null) out.alt = raw.alt;
  if (raw.story != null) out.story = raw.story;
  
  if (raw.src != null || raw.url != null) out.src = raw.src || raw.url;
  if (raw.srcXL != null) out.srcXL = raw.srcXL;
  if (raw.srcL != null) out.srcL = raw.srcL;
  if (raw.srcM != null) out.srcM = raw.srcM;
  if (raw.srcS != null) out.srcS = raw.srcS;
  if (raw.srcOriginal != null) out.srcOriginal = raw.srcOriginal;
  
  if (raw.buyLink != null) out.buyLink = raw.buyLink;
  if (Array.isArray(raw.keywords)) out.keywords = raw.keywords;
  if (raw.notes != null) out.notes = raw.notes;
  if (typeof raw.rating === "number") out.rating = raw.rating;
  
  out.visibility = "show";
  out.archivedFrom = sourceGalleryPath;
  
  if (typeof raw.sortOrder === "number") out.sortOrder = raw.sortOrder;
  
  return out;
}

async function main() {
  console.log('🔍 Scanning for hidden images...\n');
  
  // Find all gallery files
  const galleryFiles = await findGalleryFiles(path.join(DATA_DIR, 'Galleries'));
  const otherFiles = await findGalleryFiles(path.join(DATA_DIR, 'Other'));
  const allFiles = [...galleryFiles, ...otherFiles].filter(f => !f.includes('Archive'));
  
  console.log(`Found ${allFiles.length} gallery files to scan\n`);
  
  // Collect all hidden images
  const hiddenImages = [];
  
  for (const filePath of allFiles) {
    try {
      const code = await fs.readFile(filePath, 'utf8');
      const data = extractArrayFromMjs(code);
      if (!data) continue;
      
      const relPath = path.relative(DATA_DIR, filePath).replace(/\\/g, '/');
      const galleryPath = 'src/data/' + relPath;
      
      const hidden = data.filter(img => img.visibility === 'hidden' && img.id);
      
      if (hidden.length > 0) {
        console.log(`  ${relPath}: ${hidden.length} hidden`);
        for (const img of hidden) {
          hiddenImages.push({ ...img, _sourcePath: galleryPath });
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Error reading ${filePath}: ${err.message}`);
    }
  }
  
  console.log(`\n📦 Total hidden images found: ${hiddenImages.length}\n`);
  
  // Load existing archive
  let archiveData = [];
  try {
    const code = await fs.readFile(ARCHIVE_PATH, 'utf8');
    archiveData = extractArrayFromMjs(code) || [];
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    archiveData = [createGhostEntry()];
  }
  
  // Ensure ghost exists
  if (!archiveData.some(img => img.id === 'i-k4studios')) {
    archiveData.unshift(createGhostEntry());
  }
  
  const existingIds = new Set(archiveData.map(img => img.id));
  console.log(`📂 Archive currently has ${archiveData.length} entries\n`);
  
  // Add missing hidden images
  let added = 0;
  let updated = 0;
  
  for (const img of hiddenImages) {
    const sourcePath = img._sourcePath;
    delete img._sourcePath;
    
    const existingIndex = archiveData.findIndex(a => a.id === img.id);
    
    if (existingIndex >= 0) {
      // Update existing - ensure visibility is "show" in archive
      const existing = archiveData[existingIndex];
      if (existing.visibility !== 'show') {
        archiveData[existingIndex] = normalizeImage(img, sourcePath);
        updated++;
        console.log(`  ♻️ Updated ${img.id} (was hidden in archive)`);
      }
    } else {
      // Add new
      archiveData.push(normalizeImage(img, sourcePath));
      added++;
      console.log(`  ✅ Added ${img.id} from ${sourcePath}`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Added: ${added}`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Total in archive: ${archiveData.length}`);
  
  // Write updated archive
  if (added > 0 || updated > 0) {
    const content = buildMjsContent(archiveData);
    await fs.writeFile(ARCHIVE_PATH, content, 'utf8');
    console.log(`\n✅ Archive.mjs updated!`);
  } else {
    console.log(`\n✅ Archive already up to date.`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
