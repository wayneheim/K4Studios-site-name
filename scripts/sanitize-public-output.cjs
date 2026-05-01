const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET_DIRS = ['dist'];

const REPLACEMENTS = [
  [/https:\/\/wayne-heim\.smugmug\.com\/Other\/Photo-Shoots-and-Themes/g, 'https://wayne-heim.smugmug.com/Other/Photo%2DShoots-and-Themes'],
  [/https:\/\/wayne-heim\.smugmug\.com\/Other\/Photo-Shoots/g, 'https://wayne-heim.smugmug.com/Other/Photo%2DShoots'],
  [/\/Other\/Photo-Shoots-and-Themes/g, '/Other/Photo%2DShoots-and-Themes'],
  [/\/Other\/Photo-Shoots/g, '/Other/Photo%2DShoots'],
];

const SEARCH_STRINGS = [
  'https://wayne-heim.smugmug.com/Other/Photo-Shoots-and-Themes',
  'https://wayne-heim.smugmug.com/Other/Photo-Shoots',
  '/Other/Photo-Shoots-and-Themes',
  '/Other/Photo-Shoots',
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

function findCandidatesWithRipgrep(targetDirs) {
  const args = [
    '--files-with-matches',
    '--fixed-strings',
    '--no-ignore',
    '--no-messages',
  ];

  for (const needle of SEARCH_STRINGS) {
    args.push('-e', needle);
  }

  for (const target of targetDirs) {
    args.push(path.join(ROOT, target));
  }

  const result = spawnSync('rg', args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });

  // rg exits 1 for "no matches"; other non-zero codes fall back to the safe
  // full walk so builds still work on machines without rg.
  if (result.error || result.status > 1) return null;

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((filePath) => path.resolve(ROOT, filePath));
}

let changedFiles = 0;
const candidates = findCandidatesWithRipgrep(TARGET_DIRS);

if (candidates) {
  for (const filePath of candidates) {
    if (filePath.includes(`${path.sep}image-manifest.json`)) continue;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      changedFiles += sanitizeFile(filePath);
    }
  }
} else {
  for (const target of TARGET_DIRS) {
    changedFiles += walk(path.join(ROOT, target));
  }
}

console.log(`[sanitize-public-output] Rewrote ${changedFiles} public output files`);
