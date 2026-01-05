const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all .mjs files in src/data
const files = glob.sync('src/data/**/*.mjs');
let content = fs.readFileSync(filePath, 'utf8');

// Track changes
let descFixes = 0;
let storyFixes = 0;
let titleFixes = 0;

// === DESCRIPTION FIXES ===
// Pattern: Remove ", frederic remington," or "and frederic remington" or "frederic remington piece" etc.
const descPatterns = [
  // "This frederic remington piece" -> "This western fine art piece"
  [/This frederic remington piece/gi, 'This western fine art piece'],
  // "and frederic remington" -> ""
  [/, and frederic remington/gi, ''],
  [/and frederic remington,/gi, ''],
  [/and frederic remington\./gi, '.'],
  // "Featuring frederic remington," -> ""
  [/Featuring frederic remington, /gi, ''],
  // "through painterly cowboy portraits and frederic remington" -> "through painterly cowboy portraits"
  [/ and frederic remington/gi, ''],
  // "frederic remington, cowboy portraits" -> "cowboy portraits"  
  [/frederic remington, /gi, ''],
  // "Explore frederic remington with" -> "Explore western fine art with"
  [/Explore frederic remington with/gi, 'Explore western fine art with'],
  // "A testament to frederic remington in fine art" -> "A testament to Western art tradition"
  [/A testament to frederic remington in fine art/gi, 'A testament to Western art tradition'],
  // "with a touch of frederic remington" -> ""
  [/with a touch of frederic remington/gi, ''],
  // "It reflects frederic remington with" -> "It reflects Western tradition with"
  [/It reflects frederic remington with/gi, 'It reflects Western tradition with'],
  // Cleanup double spaces
  [/  +/g, ' '],
  // Cleanup ", ." -> "."
  [/, \./g, '.'],
  // Cleanup ",." -> "."
  [/,\./g, '.'],
];

// === STORY FIXES ===
// For fake AI stories, we'll replace specific patterns
const storyPatterns = [
  // "and frederic remington" variations
  [/ and frederic remington/gi, ''],
  [/frederic remington and /gi, ''],
  [/frederic remington, /gi, ''],
  [/, frederic remington/gi, ''],
  // "A testament to frederic remington" -> "A testament to Western art tradition"
  [/A testament to frederic remington/gi, 'A testament to Western art tradition'],
  // "with a touch of frederic remington" -> ""
  [/with a touch of frederic remington/gi, ''],
  // "It reflects frederic remington" -> "It reflects Western art tradition"
  [/It reflects frederic remington/gi, 'It reflects Western art tradition'],
  // Cleanup
  [/  +/g, ' '],
  [/, \./g, '.'],
  [/,\./g, '.'],
];

// === TITLE FIXES ===
// Replace titles containing Frederic Remington
const titlePatterns = [
  [/"title": "The Essence Of Frederic Remington"/g, '"title": "Western Portrait"'],
  [/"title": "Cowboy Frederic Remington"/g, '"title": "Cowboy Portrait"'],
  [/"title": "Frederic Remington And Western Art"/g, '"title": "Western Art Portrait"'],
  [/Frederic Remington - /gi, ''],
  [/ - Frederic Remington/gi, ''],
  [/Frederic Remington /gi, ''],
  [/ Frederic Remington/gi, ''],
];

// Apply description patterns
const beforeDesc = (content.match(/frederic remington/gi) || []).length;
descPatterns.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});
const afterDesc1 = (content.match(/frederic remington/gi) || []).length;
descFixes = beforeDesc - afterDesc1;

// Apply story patterns  
const beforeStory = afterDesc1;
storyPatterns.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});
const afterStory1 = (content.match(/frederic remington/gi) || []).length;
storyFixes = beforeStory - afterStory1;

// Apply title patterns
const beforeTitle = afterStory1;
titlePatterns.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});
const afterTitle1 = (content.match(/frederic remington/gi) || []).length;
titleFixes = beforeTitle - afterTitle1;

// Count remaining
const remaining = (content.match(/frederic remington/gi) || []).length;
const inKeywords = (content.match(/"frederic remington"/gi) || []).length; // In keywords (quoted)

console.log('=== Frederic Remington Removal ===');
console.log('Total fixes:', descFixes, '(before:', beforeDesc, '-> after:', afterTitle1, ')');
console.log('');
console.log('Remaining instances:', remaining);
console.log('  - In keywords (expected):', inKeywords);
console.log('  - Other:', remaining - inKeywords);

// Only write if we made progress
if (descFixes > 0 || storyFixes > 0 || titleFixes > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('\n✓ File updated successfully');
} else {
  console.log('\nNo changes made');
}
