const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');
const files = fs.readdirSync(publicDir).filter((f) => /^image-sitemap-.*\.xml$/i.test(f));

const decodeXml = (s) => s
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

let maxEscaped = 0;
let maxDecoded = 0;
let over900Escaped = 0;
let over900Decoded = 0;
let count = 0;

for (const file of files) {
  const xml = fs.readFileSync(path.join(publicDir, file), 'utf8');
  const matches = [...xml.matchAll(/<image:caption>([\s\S]*?)<\/image:caption>/g)];
  for (const match of matches) {
    const escaped = match[1].replace(/\s+/g, ' ').trim();
    const decoded = decodeXml(escaped).replace(/\s+/g, ' ').trim();
    count += 1;
    if (escaped.length > maxEscaped) maxEscaped = escaped.length;
    if (decoded.length > maxDecoded) maxDecoded = decoded.length;
    if (escaped.length > 900) over900Escaped += 1;
    if (decoded.length > 900) over900Decoded += 1;
  }
}

console.log(`FILES ${files.length}`);
console.log(`CAPTIONS ${count}`);
console.log(`MAX_ESCAPED ${maxEscaped}`);
console.log(`MAX_DECODED ${maxDecoded}`);
console.log(`OVER_900_ESCAPED ${over900Escaped}`);
console.log(`OVER_900_DECODED ${over900Decoded}`);
