// patch-na-color-gallery.js
// Usage: node patch-na-color-gallery.js
// Patches NA-Color.mjs with missing fields from Artist-Ride-F.mjs based on id

const fs = require('fs');
const path = require('path');

// Update these paths as needed
const masterPath = path.resolve(__dirname, '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs');
const fixedPath = path.resolve(__dirname, '../src/data/Other/Photo-Shoots/South-Dakota/Artist-Ride-F.mjs');
const outputPath = masterPath; // Overwrite master

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
const fixedRaw = fs.readFileSync(fixedPath, 'utf8');
const masterData = extractGalleryData(masterRaw);
const fixedData = extractGalleryData(fixedRaw);

const fixedMap = Object.fromEntries(fixedData.map(img => [img.id, img]));
const fields = ['sortOrder', 'srcXL', 'srcL', 'srcM', 'srcS', 'srcOriginal'];

let updated = 0;
let skipped = 0;
for (const img of masterData) {
  const match = fixedMap[img.id];
  if (match) {
    for (const f of fields) {
      if (match[f] !== undefined) img[f] = match[f];
    }
    updated++;
  } else {
    skipped++;
  }
}

console.log(`Updated ${updated} items, skipped ${skipped} items.`);

const newContent = replaceGalleryData(masterRaw, masterData);
fs.writeFileSync(outputPath, newContent, 'utf8');

console.log('Patched NA-Color.mjs with data from Artist-Ride-F.mjs');