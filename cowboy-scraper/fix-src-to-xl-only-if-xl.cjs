// fix-src-to-xl-only-if-xl.cjs
// Usage: node fix-src-to-xl-only-if-xl.cjs
// Sets src to the same as srcXL only if srcXL contains XL

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs');
const backupPath = filePath + '.bak3';

const fileRaw = fs.readFileSync(filePath, 'utf8');
const start = fileRaw.indexOf('export const galleryData = [');
const end = fileRaw.lastIndexOf(']');
const jsonStr = fileRaw.substring(start + 'export const galleryData = '.length, end + 1);
const galleryData = JSON.parse(jsonStr);

let updated = 0;
for (const rec of galleryData) {
  if (rec.srcXL && rec.srcXL.includes('/XL/') && rec.srcXL.includes('-XL.jpg') && rec.srcXL !== rec.src) {
    rec.src = rec.srcXL;
    updated++;
  }
}

fs.copyFileSync(filePath, backupPath);
const newJsonStr = JSON.stringify(galleryData, null, 2);
const newContent = fileRaw.substring(0, start + 'export const galleryData = '.length) + newJsonStr + fileRaw.substring(end + 1);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`Updated ${updated} src fields to match srcXL (only for true XL).`);
console.log(`Backup saved to ${backupPath}`);