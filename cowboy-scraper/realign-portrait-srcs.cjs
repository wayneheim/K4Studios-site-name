// realign-portrait-srcs.cjs
// Usage: node realign-portrait-srcs.cjs
// Cleans and realigns src fields in Portraits.mjs so each id gets the correct src URLs

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White copy.mjs');
const backupPath = filePath + '.bak';

const fileRaw = fs.readFileSync(filePath, 'utf8');
const match = fileRaw.match(/export const galleryData = (\[.*\]);/s);
if (!match) throw new Error('galleryData array not found');
const galleryData = JSON.parse(match[1]);

const fieldsToAlign = ["src", "srcXL", "srcL", "srcM", "srcS", "srcOriginal"];
const idMap = {};
for (const rec of galleryData) {
  if (rec.id) idMap[rec.id] = rec;
}
const srcFieldBuffer = {};
for (const rec of galleryData) {
  for (const f of fieldsToAlign) {
    const url = rec[f];
    if (typeof url === 'string' && url.startsWith('http') && url.includes('i-')) {
      const match = url.match(/i-([a-zA-Z0-9]+)/);
      if (match) {
        const urlId = `i-${match[1]}`;
        if (!srcFieldBuffer[urlId]) srcFieldBuffer[urlId] = {};
        srcFieldBuffer[urlId][f] = url;
      }
    }
  }
}
let realigned = 0, unmatched = 0;
for (const id in srcFieldBuffer) {
  if (idMap[id]) {
    Object.assign(idMap[id], srcFieldBuffer[id]);
    realigned++;
  } else {
    unmatched++;
    console.warn(`No entry found for id ${id} when realigning src fields.`);
  }
}
for (const rec of galleryData) {
  for (const f of fieldsToAlign) {
    const url = rec[f];
    if (typeof url === 'string' && url.startsWith('http') && url.includes('i-')) {
      const match = url.match(/i-([a-zA-Z0-9]+)/);
      if (!match || rec.id !== `i-${match[1]}`) {
        rec[f] = '';
      }
    }
  }
}
fs.copyFileSync(filePath, backupPath);
const newContent = fileRaw.replace(/export const galleryData = \[.*\];/s, 'export const galleryData = ' + JSON.stringify(galleryData, null, 2) + ';');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`Realigned src fields for ${realigned} ids. Unmatched: ${unmatched}`);
console.log(`Backup saved to ${backupPath}`);
