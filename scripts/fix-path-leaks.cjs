/**
 * Fixes file path leaks in gallery data files
 * These appear as "C:\Users\Wayne\..." or "C:UsersWayne..." in story fields
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all .mjs files in src/data
const files = glob.sync('src/data/**/*.mjs');
let totalFixed = 0;
const fixedFiles = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Pattern: Match C:\Users\Wayne\ followed by anything until end of string value
  // This handles paths with spaces like "K4 Studios" and "Fine Art Photography"
  // The path ends at the closing quote (which isn't included in the match)
  content = content.replace(/ ?C:\\Users\\Wayne\\[^"]+\./g, '');
  
  // Also handle the version without trailing period
  content = content.replace(/ ?C:\\Users\\Wayne\\Documents\\GitHub\\K4 Studios[^"]*/g, '');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('✓ Fixed:', file);
    fixedFiles.push(file);
    totalFixed++;
  }
});

console.log('\n========================================');
console.log(`Total files fixed: ${totalFixed}`);
if (fixedFiles.length > 0) {
  console.log('\nFixed files:');
  fixedFiles.forEach(f => console.log('  -', f));
}
