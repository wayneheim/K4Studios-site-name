/**
 * Scan all gallery .mjs files for hidden images and copy them to Archive.mjs
 * 
 * This ensures all hidden images (visibility: "hidden", "non", "none", "") 
 * have a visible copy in the Archive gallery so the smart-404 can redirect to them.
 * 
 * Usage: node scripts/populate-archive.cjs
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const GALLERIES_DIR = path.join(__dirname, '../src/data/Galleries');
const OTHER_DIR = path.join(__dirname, '../src/data/Other');
const ARCHIVE_PATH = path.join(__dirname, '../src/data/Other/Archive/Archive.mjs');

// Backup pattern to skip
const BACKUP_PATTERN = /[-_\s](copy|backup)(\d*|[-_\s].*)?\.[^.]+$/i;

// Hidden visibility values
const HIDDEN_VISIBILITY = ['hidden', 'non', 'none', ''];

function isHidden(visibility) {
  const val = (visibility || 'show').toLowerCase().trim();
  return HIDDEN_VISIBILITY.includes(val);
}

function isBackupFile(filePath) {
  const filename = path.basename(filePath);
  return BACKUP_PATTERN.test(filename);
}

function isGhost(img) {
  return img && img.id === 'i-k4studios';
}

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

// Normalize image data for Archive storage
function normalizeForArchive(img, sourceGalleryPath) {
  const out = {};
  
  // Copy all relevant fields
  if (img.id != null) out.id = img.id;
  if (img.title != null) out.title = img.title;
  if (img.description != null) out.description = img.description;
  if (img.alt != null) out.alt = img.alt;
  if (img.story != null) out.story = img.story;
  if (img.src != null) out.src = img.src;
  if (img.srcXL != null) out.srcXL = img.srcXL;
  if (img.srcL != null) out.srcL = img.srcL;
  if (img.srcM != null) out.srcM = img.srcM;
  if (img.srcS != null) out.srcS = img.srcS;
  if (img.srcOriginal != null) out.srcOriginal = img.srcOriginal;
  if (img.buyLink != null) out.buyLink = img.buyLink;
  if (Array.isArray(img.keywords)) out.keywords = img.keywords;
  if (img.notes != null) out.notes = img.notes;
  if (typeof img.rating === 'number') out.rating = img.rating;
  
  // Archive-specific: always "show" in Archive, track original location
  out.visibility = 'show';
  out.archivedFrom = sourceGalleryPath;
  out.sortOrder = typeof img.sortOrder === 'number' ? img.sortOrder : 0;
  
  return out;
}

// Build .mjs file content
function buildMjsContent(galleryData) {
  const header = `// Archive Gallery - Auto-managed
// Images that are hidden from main galleries but still accessible via direct URL
// DO NOT manually edit this file - it's managed by the system
`;
  const json = JSON.stringify(galleryData, null, 2);
  return `${header}export const galleryData = ${json};
`;
}

async function main() {
  console.log('🔍 Scanning galleries for hidden images...\n');
  
  // Find all .mjs files in Galleries and Other (except Archive itself)
  const galleriesPattern = path.join(GALLERIES_DIR, '**/*.mjs').replace(/\\/g, '/');
  const otherPattern = path.join(OTHER_DIR, '**/*.mjs').replace(/\\/g, '/');
  
  const allFiles = [
    ...glob.sync(galleriesPattern),
    ...glob.sync(otherPattern)
  ].filter(f => {
    // Skip backup files
    if (isBackupFile(f)) return false;
    // Skip Archive.mjs itself
    if (f.includes('Archive/Archive.mjs')) return false;
    return true;
  });
  
  console.log(`Found ${allFiles.length} gallery files to scan\n`);
  
  // Read current Archive to get the ghost entry
  let archiveData = [];
  try {
    const archiveCode = fs.readFileSync(ARCHIVE_PATH, 'utf8');
    archiveData = extractArrayFromMjs(archiveCode) || [];
  } catch (err) {
    console.log('⚠️  Could not read existing Archive, starting fresh');
  }
  
  // Keep only the ghost entry
  const ghostEntry = archiveData.find(isGhost);
  if (!ghostEntry) {
    console.log('⚠️  No ghost entry found in Archive, adding default');
    archiveData = [{
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
    }];
  } else {
    archiveData = [ghostEntry];
  }
  
  // Track what we find
  const hiddenImages = [];
  const seenIds = new Set(['i-k4studios']);
  
  // Scan each gallery file
  for (const filePath of allFiles) {
    const code = fs.readFileSync(filePath, 'utf8');
    const images = extractArrayFromMjs(code);
    
    if (!images || !Array.isArray(images)) continue;
    
    // Determine gallery path from file path
    let galleryPath = filePath
      .replace(GALLERIES_DIR, '/Galleries')
      .replace(OTHER_DIR, '/Other')
      .replace(/\\/g, '/')
      .replace(/\.mjs$/, '');
    
    // Handle nested folder structure (e.g., /Color/Color.mjs -> /Color)
    const parts = galleryPath.split('/');
    if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
      galleryPath = parts.slice(0, -1).join('/');
    }
    
    // Find hidden images
    for (const img of images) {
      if (!img.id || isGhost(img)) continue;
      
      if (isHidden(img.visibility)) {
        if (!seenIds.has(img.id)) {
          hiddenImages.push({ img, galleryPath, filePath });
          seenIds.add(img.id);
        }
      }
    }
  }
  
  console.log(`Found ${hiddenImages.length} hidden images across all galleries\n`);
  
  if (hiddenImages.length === 0) {
    console.log('✅ No hidden images to archive');
    return;
  }
  
  // Add hidden images to Archive
  for (const { img, galleryPath, filePath } of hiddenImages) {
    const archived = normalizeForArchive(img, galleryPath);
    archiveData.push(archived);
    console.log(`  📦 ${img.id} from ${galleryPath}`);
  }
  
  // Write updated Archive
  const newContent = buildMjsContent(archiveData);
  fs.writeFileSync(ARCHIVE_PATH, newContent, 'utf8');
  
  console.log(`\n✅ Archive.mjs updated with ${hiddenImages.length} images`);
  console.log(`   Total Archive size: ${archiveData.length} entries (including ghost)`);
  console.log('\n💡 Run the generators to update imageIdMap.json:');
  console.log('   npm run gen:master-data && npm run gen:image-id-map');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
