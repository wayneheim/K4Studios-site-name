import { readFileSync, writeFileSync } from 'node:fs';

const file = './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';
const MAX_ALT_LEN = 140;

function trimAtWordBoundary(text, maxLen) {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen + 1);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 80) return slice.slice(0, lastSpace).trim();
  return text.slice(0, maxLen).trim();
}

const input = readFileSync(file, 'utf8');
let changed = 0;
let shortened = 0;

const output = input.replace(/("alt"\s*:\s*")([^"]*)(",)/g, (full, p1, alt, p3) => {
  const normalized = alt
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim();

  const trimmed = trimAtWordBoundary(normalized, MAX_ALT_LEN);
  const cleaned = trimmed.replace(/[\s,;:\-]+$/g, '').trim();

  if (cleaned.length < normalized.length) shortened += 1;
  if (cleaned !== alt) changed += 1;
  return `${p1}${cleaned}${p3}`;
});

writeFileSync(file, output);
console.log(`${file}: alt lines updated = ${changed}, shortened = ${shortened}`);
