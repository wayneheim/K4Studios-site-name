/**
 * Fix carousel.ts files to include id: img.id in toSlide returns
 * This enables the proxy URL system to work correctly
 */
const fs = require('fs');
const path = require('path');

function findCarouselFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findCarouselFiles(fullPath));
    } else if (entry.name === 'carousel.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

function fixCarouselFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Pattern 1: return { href: `${path}/${img.id}`, (no id property after href)
  // Add id: img.id after href line
  const pattern1 = /(return\s*\{\s*\n?\s*href:\s*`\$\{path\}\/\$\{img\.id\}`)(,\s*\n?\s*src)/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, '$1,\n    id: img.id$2');
  }

  // Pattern 2: return { href: `${galleryPath}/${img.id}`, (no id property)
  const pattern2 = /(return\s*\{\s*\n?\s*href:\s*`\$\{galleryPath\}\/\$\{img\.id\}`)(,\s*\n?\s*src)/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, '$1,\n    id: img.id$2');
  }

  // Pattern 3: Single line return { href: ..., src: ... } without id
  // Match return statements that have href with img.id but no id: property
  const singleLinePattern = /(return\s*\{\s*href:\s*`[^`]+\$\{img\.id\}`)(,\s*src:)/g;
  if (singleLinePattern.test(content) && !content.includes('id: img.id')) {
    content = content.replace(singleLinePattern, '$1, id: img.id$2');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
    return true;
  } else if (content.includes('id: img.id')) {
    console.log(`Already OK: ${filePath}`);
    return false;
  } else {
    console.log(`Needs manual review: ${filePath}`);
    return false;
  }
}

const dataDir = path.join(__dirname, '..', 'src', 'data');
const carouselFiles = findCarouselFiles(dataDir);

console.log(`Found ${carouselFiles.length} carousel.ts files\n`);

let fixed = 0;
for (const file of carouselFiles) {
  if (fixCarouselFile(file)) {
    fixed++;
  }
}

console.log(`\nFixed ${fixed} files`);
