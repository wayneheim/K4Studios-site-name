/**
 * Script to add skipIntro logic to all gallery shells
 * This enables ?view=grid shared theme links to work properly
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../src/components');

// Pattern 1: JSDoc-style comment block ending with ---
const oldPattern1 = /\/\*\* ---------------------------------------------------------------\s*\n\s*\* Detect if this is an image page\s*\n\s*\* --------------------------------------------------------------- \*\/\s*\nconst lastSegment = Astro\.url\?\.pathname\?\.split\("\/"\)\.pop\(\) \|\| "";\s*\nconst isImagePage = lastSegment\.startsWith\("i-"\);\s*\n---/g;

// Pattern 2: Simple comment style with dashes
const oldPattern2 = /\/\/ -------- Detect if this is an image page --------\s*\nconst lastSegment = Astro\.url\?\.pathname\?\.split\("\/"\)\.pop\(\) \|\| "";\s*\nconst isImagePage = lastSegment\.startsWith\("i-"\);\s*\n---/g;

// Pattern 3: Simple comment without dashes
const oldPattern3 = /\/\/ Detect if this is an image page\s*\nconst lastSegment = Astro\.url\?\.pathname\?\.split\("\/"\)\.pop\(\) \|\| "";\s*\nconst isImagePage = lastSegment\.startsWith\("i-"\);\s*\n---/g;

// Pattern 4: Block comment with equal signs
const oldPattern4 = /\/\* ={10,}\s*\n\s*Detect if this is an image page\s*\n\s*={10,} \*\/\s*\nconst lastSegment = Astro\.url\?\.pathname\?\.split\("\/"\)\.pop\(\) \|\| "";\s*\nconst isImagePage = lastSegment\.startsWith\("i-"\);\s*\n---/g;

// Pattern 5: JSDoc-style followed by another block (not ---)
const oldPattern5 = /\/\*\* ---------------------------------------------------------------\s*\n\s*\* Detect if this is an image page\s*\n\s*\* --------------------------------------------------------------- \*\/\s*\nconst lastSegment = Astro\.url\?\.pathname\?\.split\("\/"\)\.pop\(\) \|\| "";\s*\nconst isImagePage = lastSegment\.startsWith\("i-"\);\s*\n\n/g;

const newBlock1 = `/** ---------------------------------------------------------------
 * Detect if this is an image page or shared theme link
 * --------------------------------------------------------------- */
const lastSegment = Astro.url?.pathname?.split("/").pop() || "";
const isImagePage = lastSegment.startsWith("i-");
// Check for ?view=grid (shared theme links should skip intro)
const isDirectGridView = Astro.url.searchParams.get("view") === "grid";
const skipIntro = isImagePage || isDirectGridView;
---`;

const newBlock2 = `// -------- Detect if this is an image page or shared theme link --------
const lastSegment = Astro.url?.pathname?.split("/").pop() || "";
const isImagePage = lastSegment.startsWith("i-");
// Check for ?view=grid (shared theme links should skip intro)
const isDirectGridView = Astro.url.searchParams.get("view") === "grid";
const skipIntro = isImagePage || isDirectGridView;
---`;

const newBlock3 = `// Detect if this is an image page or shared theme link
const lastSegment = Astro.url?.pathname?.split("/").pop() || "";
const isImagePage = lastSegment.startsWith("i-");
// Check for ?view=grid (shared theme links should skip intro)
const isDirectGridView = Astro.url.searchParams.get("view") === "grid";
const skipIntro = isImagePage || isDirectGridView;
---`;

const newBlock4 = `/* ================================================================
   Detect if this is an image page or shared theme link
   ================================================================ */
const lastSegment = Astro.url?.pathname?.split("/").pop() || "";
const isImagePage = lastSegment.startsWith("i-");
// Check for ?view=grid (shared theme links should skip intro)
const isDirectGridView = Astro.url.searchParams.get("view") === "grid";
const skipIntro = isImagePage || isDirectGridView;
---`;

const newBlock5 = `/** ---------------------------------------------------------------
 * Detect if this is an image page or shared theme link
 * --------------------------------------------------------------- */
const lastSegment = Astro.url?.pathname?.split("/").pop() || "";
const isImagePage = lastSegment.startsWith("i-");
// Check for ?view=grid (shared theme links should skip intro)
const isDirectGridView = Astro.url.searchParams.get("view") === "grid";
const skipIntro = isImagePage || isDirectGridView;

`;

// Pattern to replace isImagePage conditionals (handles both {!isImagePage && and { !isImagePage &&)
const headerPattern = /\{\s*!isImagePage && \(\s*\n\s*<div id="header-section"/g;
const headerReplacement = `{!skipIntro && (
      <div id="header-section"`;

const introPattern = /\{\s*!isImagePage && \(\s*\n\s*<div id="intro-section"/g;
const introReplacement = `{!skipIntro && (
      <div id="intro-section"`;

const chapterPattern = /\{\s*isImagePage && \(\s*\n\s*<div id="chapter-section"/g;
const chapterReplacement = `{skipIntro && (
      <div id="chapter-section"`;

// Also handle JSX comment style: {/* ... */}
const headerPatternJsx = /\{\s*\/\*.*\*\/\s*\}\s*\n\s*\{!isImagePage && \(/g;
const introPatternJsx = /\{\s*\/\*.*Intro.*\*\/\s*\}\s*\n\s*\{!isImagePage && \(/g;

// Get all gallery shell files
const files = fs.readdirSync(componentsDir)
  .filter(f => f.startsWith('GalleryShell-') && f.endsWith('.astro'))
  .filter(f => !f.includes('copy') && !f.includes('Fixed'));

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has skipIntro
  if (content.includes('skipIntro')) {
    console.log(`⏭️  ${file} - already has skipIntro`);
    continue;
  }
  
  let matched = false;
  let newContent = content;
  
  // Try pattern 1 (JSDoc style)
  if (oldPattern1.test(content)) {
    oldPattern1.lastIndex = 0;
    newContent = newContent.replace(oldPattern1, newBlock1);
    matched = true;
  }
  
  // Try pattern 2 (dashed comment)
  oldPattern2.lastIndex = 0;
  if (oldPattern2.test(newContent)) {
    oldPattern2.lastIndex = 0;
    newContent = newContent.replace(oldPattern2, newBlock2);
    matched = true;
  }
  
  // Try pattern 3 (simple comment)
  oldPattern3.lastIndex = 0;
  if (!matched && oldPattern3.test(newContent)) {
    oldPattern3.lastIndex = 0;
    newContent = newContent.replace(oldPattern3, newBlock3);
    matched = true;
  }
  
  // Try pattern 4 (block comment with equal signs)
  oldPattern4.lastIndex = 0;
  if (!matched && oldPattern4.test(newContent)) {
    oldPattern4.lastIndex = 0;
    newContent = newContent.replace(oldPattern4, newBlock4);
    matched = true;
  }
  
  // Try pattern 5 (JSDoc followed by blank line, not ---)
  oldPattern5.lastIndex = 0;
  if (!matched && oldPattern5.test(newContent)) {
    oldPattern5.lastIndex = 0;
    newContent = newContent.replace(oldPattern5, newBlock5);
    matched = true;
  }
  
  if (!matched) {
    console.log(`⚠️  ${file} - pattern not found, skipping`);
    continue;
  }
  
  // Apply conditional replacements
  newContent = newContent
    .replace(headerPattern, headerReplacement)
    .replace(introPattern, introReplacement)
    .replace(chapterPattern, chapterReplacement);
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ ${file} - updated`);
    updatedCount++;
  } else {
    console.log(`❓ ${file} - no changes made`);
  }
}

console.log(`\n✅ Updated ${updatedCount} files`);
