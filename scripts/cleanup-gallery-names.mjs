/**
 * Cleanup script to fix garbled gallery names in story text
 * Replaces the Windows path garbage with proper gallery names
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const galleriesDir = path.join(__dirname, '../src/data/Galleries');

// Generic pattern to catch all variations
const patterns = [
  // Fix "Wayne Heim's A collection" - the gallery name failed to extract
  // These are in the By-Theme folders
  {
    regex: /Wayne Heim's A collection/g,
    replacement: 'Wayne Heim\'s Landscape Photography collection'
  },
  // Catch the main garbled pattern
  {
    regex: /GitHubK4 StudiossrcdataGalleriesPainterly Fine Art PhotographyFacing HistoryWWIIWar(Color|Black White) collection\./g,
    replacement: 'the WWII War $1 collection.'
  },
  {
    regex: /GitHubK4 StudiossrcdataGalleriesPainterly Fine Art PhotographyFacing HistoryWWIIPortraits(Color|Black White) collection\./g,
    replacement: 'the WWII Portraits $1 collection.'
  },
  {
    regex: /GitHubK4 StudiossrcdataGalleriesPainterly Fine Art PhotographyFacing HistoryWWIIMachines(Color|Black White) collection\./g,
    replacement: 'the WWII Machines $1 collection.'
  },
  {
    regex: /GitHubK4 StudiossrcdataGalleries[A-Za-z ]+collection\./g,
    replacement: 'the collection.'
  },
  // General cleanup for any remaining garbage
  {
    regex: /GitHubK4 Studios[A-Za-z ]+\./g,
    replacement: '.'
  }
];

function findMjsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMjsFiles(fullPath, files);
    } else if (entry.name.endsWith('.mjs') && !entry.name.includes('Entrance')) {
      files.push(fullPath);
    }
  }
  return files;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const { regex, replacement } of patterns) {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      modified = true;
    }
    // Reset regex lastIndex
    regex.lastIndex = 0;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.basename(filePath)}`);
    return true;
  }
  return false;
}

// Main
const files = findMjsFiles(galleriesDir);
console.log(`Found ${files.length} .mjs files\n`);

let fixed = 0;
for (const file of files) {
  if (processFile(file)) fixed++;
}

console.log(`\n✅ Fixed ${fixed} files`);
