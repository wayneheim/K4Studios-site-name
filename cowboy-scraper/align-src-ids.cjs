// align-src-ids.cjs
// Usage: node align-src-ids.cjs
// Aligns src URLs to use the same ID as the item's id

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs');
const backupPath = filePath + '.bak';

const fileRaw = fs.readFileSync(filePath, 'utf8');
const start = fileRaw.indexOf('export const galleryData = [');
const end = fileRaw.lastIndexOf(']');
console.log('start:', start, 'end:', end);
if (start === -1 || end === -1) throw new Error('galleryData array not found');
const jsonStr = fileRaw.substring(start + 'export const galleryData = '.length, end + 1);
const galleryData = JSON.parse(jsonStr);

const fieldsToAlign = ["src", "srcXL", "srcL", "srcM", "srcS", "srcOriginal"];

let updated = 0;
for (const rec of galleryData) {
  if (!rec.id) continue;
  const targetId = rec.id;
  for (const f of fieldsToAlign) {
    const url = rec[f];
    if (typeof url === 'string' && url.startsWith('http') && url.includes('i-')) {
      // Replace the i-XXXXX with the targetId
      const newUrl = url.replace(/i-[a-zA-Z0-9]+/, targetId);
      if (newUrl !== url) {
        rec[f] = newUrl;
        updated++;
      }
    }
  }
}

fs.copyFileSync(filePath, backupPath);
const newJsonStr = JSON.stringify(galleryData, null, 2);
const newContent = fileRaw.substring(0, start + 'export const galleryData = '.length) + newJsonStr + fileRaw.substring(end + 1);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`Updated ${updated} src fields.`);
console.log(`Backup saved to ${backupPath}`);