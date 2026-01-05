const fs = require('fs');
const path = require('path');

// Find all .mjs files in src/data
function findMjsFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(findMjsFiles(fullPath));
    } else if (item.name.endsWith('.mjs')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findMjsFiles('src/data');

// Patterns to remove Frederic Remington from user-facing content
const patterns = [
  // "This frederic remington piece" -> "This western fine art piece"
  [/This frederic remington piece/gi, 'This western fine art piece'],
  // "and frederic remington" variations
  [/, and frederic remington/gi, ''],
  [/and frederic remington,/gi, ''],
  [/and frederic remington\./gi, '.'],
  [/ and frederic remington/gi, ''],
  [/frederic remington and /gi, ''],
  // "Featuring frederic remington," -> ""
  [/Featuring frederic remington,? /gi, ''],
  // "frederic remington, cowboy portraits" -> "cowboy portraits"  
  [/frederic remington, /gi, ''],
  [/, frederic remington/gi, ''],
  // "Explore frederic remington with" -> "Explore western fine art with"
  [/Explore frederic remington with/gi, 'Explore western fine art with'],
  // "A testament to frederic remington in fine art" -> "A testament to Western art tradition"
  [/A testament to frederic remington in fine art/gi, 'A testament to Western art tradition'],
  [/A testament to frederic remington/gi, 'A testament to Western art tradition'],
  // "with a touch of frederic remington" -> ""
  [/with a touch of frederic remington/gi, ''],
  // "It reflects frederic remington" -> "It reflects Western art tradition"
  [/It reflects frederic remington with/gi, 'It reflects Western tradition with'],
  [/It reflects frederic remington/gi, 'It reflects Western art tradition'],
  // "Delving into frederic remington" -> "Delving into western fine art"
  [/Delving into frederic remington/gi, 'Delving into western fine art'],
  // "highlights frederic remington through" -> "highlights western fine art through"
  [/highlights frederic remington through/gi, 'highlights western fine art through'],
  // "embodies frederic remington" -> "embodies Western art tradition"
  [/embodies frederic remington/gi, 'embodies Western art tradition'],
  // Title fixes
  [/"title": "The Essence Of Frederic Remington"/g, '"title": "Western Portrait"'],
  [/"title": "Cowboy Frederic Remington"/g, '"title": "Cowboy Portrait"'],
  [/"title": "Frederic Remington And Western Art"/g, '"title": "Western Art Portrait"'],
  [/"title": "Capturing Frederic Remington"/g, '"title": "Capturing the West"'],
  [/"title": "Frederic Remington Study"/g, '"title": "Western Study"'],
  [/"title": "Frederic Remington Portrait"/g, '"title": "Western Portrait"'],
  [/"title": "Frederic Remington - ([^"]+)"/gi, '"title": "$1"'],
  [/"title": "([^"]+) - Frederic Remington"/gi, '"title": "$1"'],
  // Alt text fixes
  [/of frederic remington by/gi, 'in Western style by'],
  [/frederic remington style/gi, 'Western art style'],
  // Description fixes - possessive and attributive
  [/Wayne Heim's frederic remington/gi, "Wayne Heim's western fine art"],
  [/fans of frederic remington/gi, 'fans of western fine art'],
  [/seeking frederic remington/gi, 'seeking western fine art'],
  // Cleanup
  [/  +/g, ' '],
  [/, \./g, '.'],
  [/,\./g, '.'],
  [/\. \./g, '.'],
];

let totalFixed = 0;
const results = [];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Count before
  const before = (content.match(/frederic remington/gi) || []).length;
  const beforeKeywords = (content.match(/"frederic remington"/gi) || []).length;
  const beforeUserFacing = before - beforeKeywords;
  
  if (beforeUserFacing === 0) continue;
  
  // Apply patterns
  for (const [pattern, replacement] of patterns) {
    content = content.replace(pattern, replacement);
  }
  
  // Count after
  const after = (content.match(/frederic remington/gi) || []).length;
  const afterKeywords = (content.match(/"frederic remington"/gi) || []).length;
  const afterUserFacing = after - afterKeywords;
  
  const fixed = beforeUserFacing - afterUserFacing;
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed += fixed;
    results.push({
      file: path.relative('src/data', filePath),
      before: beforeUserFacing,
      after: afterUserFacing,
      fixed
    });
  }
}

console.log('=== Frederic Remington Cleanup (All Files) ===\n');
results.forEach(r => {
  console.log(`${r.file}: ${r.fixed} fixed (${r.before} -> ${r.after})`);
});
console.log(`\nTotal fixed: ${totalFixed}`);
