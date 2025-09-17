// merge-gallery-fields.js
// Usage: node merge-gallery-fields.js
// Merges srcXL, srcL, srcM, srcS, srcOriginal from copy into master for matching ids

const fs = require('fs');
const path = require('path');

// Update these paths as needed
const masterPath = path.resolve(__dirname, '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs');
const copyPath = path.resolve(__dirname, '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color copy.mjs');
const outputPath = masterPath; // Overwrite master, or change to a new file for safety

function extractGalleryData(fileContent) {
  // Assumes: export const galleryData = [ ... ];
  const match = fileContent.match(/export const galleryData = (\[.*\]);/s);
  if (!match) throw new Error('galleryData array not found');
  return JSON.parse(match[1]);
}

function replaceGalleryData(fileContent, newData) {
  return fileContent.replace(
    /export const galleryData = \[.*\];/s,
    'export const galleryData = ' + JSON.stringify(newData, null, 2) + ';'
  );
}

const masterRaw = fs.readFileSync(masterPath, 'utf8');
const copyRaw = fs.readFileSync(copyPath, 'utf8');
const masterData = extractGalleryData(masterRaw);
const copyData = extractGalleryData(copyRaw);

const copyMap = Object.fromEntries(copyData.map(img => [img.id, img]));
const fields = ['srcXL', 'srcL', 'srcM', 'srcS', 'srcOriginal', 'src'];

let updated = 0;
let skipped = 0;
for (const img of masterData) {
  const match = copyMap[img.id];
  if (match) {
    for (const f of fields) {
      if (match[f]) img[f] = match[f];
    }
    updated++;
  } else {
    skipped++;
  }
}

const newContent = replaceGalleryData(masterRaw, masterData);
fs.writeFileSync(outputPath, newContent, 'utf8');

console.log(`Merge complete. Updated: ${updated}, Skipped: ${skipped}`);
