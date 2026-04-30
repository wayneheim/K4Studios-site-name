const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_DIRS = ['dist'];

const REPLACEMENTS = [
  [/https:\/\/wayne-heim\.smugmug\.com\/Other\/Photo-Shoots-and-Themes/g, 'https://wayne-heim.smugmug.com/Other/Photo%2DShoots-and-Themes'],
  [/https:\/\/wayne-heim\.smugmug\.com\/Other\/Photo-Shoots/g, 'https://wayne-heim.smugmug.com/Other/Photo%2DShoots'],
  [/\/Other\/Photo-Shoots-and-Themes/g, '/Other/Photo%2DShoots-and-Themes'],
  [/\/Other\/Photo-Shoots/g, '/Other/Photo%2DShoots'],
];

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.txt',
  '.xml',
  '',
]);

function shouldScan(filePath) {
  if (path.basename(filePath) === 'image-manifest.json') return false;
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function sanitizeFile(filePath) {
  if (!shouldScan(filePath)) return 0;

  const original = fs.readFileSync(filePath, 'utf8');
  let sanitized = original;

  for (const [pattern, replacement] of REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  if (sanitized === original) return 0;
  fs.writeFileSync(filePath, sanitized);
  return 1;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return 0;
  let changed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      changed += walk(fullPath);
    } else if (entry.isFile()) {
      changed += sanitizeFile(fullPath);
    }
  }
  return changed;
}

let changedFiles = 0;
for (const target of TARGET_DIRS) {
  changedFiles += walk(path.join(ROOT, target));
}

console.log(`[sanitize-public-output] Rewrote ${changedFiles} public output files`);
