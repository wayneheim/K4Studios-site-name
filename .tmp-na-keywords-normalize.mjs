import { readFileSync, writeFileSync } from 'node:fs';

const file = './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';
const MAX_KEYWORDS = 15;

const input = readFileSync(file, 'utf8');
const lines = input.split(/\r?\n/);

let inKeywords = false;
let keywordLines = [];
let keywordIndent = '      ';
let totalArrays = 0;
let changedArrays = 0;
let removedKeywords = 0;

const output = [];

function normalizeKeyword(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function flushKeywords(closeLine) {
  totalArrays += 1;
  const original = keywordLines.map(k => k.value);

  const seen = new Set();
  const normalized = [];

  for (const value of original) {
    const clean = normalizeKeyword(value);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(clean);
  }

  const capped = normalized.slice(0, MAX_KEYWORDS);
  removedKeywords += Math.max(0, original.length - capped.length);

  const changed =
    original.length !== capped.length ||
    original.some((v, i) => capped[i] !== normalizeKeyword(v));

  if (changed) changedArrays += 1;

  for (const kw of capped) {
    output.push(`${keywordIndent}"${kw}",`);
  }
  output.push(closeLine);
}

for (const line of lines) {
  if (!inKeywords) {
    if (/^\s*"keywords"\s*:\s*\[\s*$/.test(line)) {
      inKeywords = true;
      keywordLines = [];
      output.push(line);
    } else {
      output.push(line);
    }
    continue;
  }

  if (/^\s*\],\s*$/.test(line)) {
    flushKeywords(line);
    inKeywords = false;
    keywordLines = [];
    continue;
  }

  const match = line.match(/^(\s*)"(.*)"\s*,\s*$/);
  if (match) {
    keywordIndent = match[1] || keywordIndent;
    keywordLines.push({ value: match[2] });
  }
}

writeFileSync(file, output.join('\n'));
console.log(`arrays=${totalArrays} changed=${changedArrays} removedKeywords=${removedKeywords}`);
