const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node script.cjs <file>');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

const phraseVariations = {
  "Fine art landscape photography of Newfoundland, Canada - the shores of North America.": [
    "Fine art photography of Newfoundland's landscapes, Canada's eastern shores.",
    "Artistic landscapes of Newfoundland, Canada - North America's coastal beauty.",
    "Fine art images capturing Newfoundland's shores in Canada.",
    "Newfoundland's landscapes in fine art photography, Canada's rugged coast.",
    "Capturing the shores of Newfoundland, Canada through fine art.",
    "Fine art landscape shots of Canada's Newfoundland shores.",
    "Newfoundland, Canada's coastal landscapes in exquisite fine art.",
    "Artistic photography of Newfoundland's North American shores.",
    "Fine art exploration of Newfoundland's landscapes, Canada.",
    "Newfoundland's shores captured in fine art photography."
  ]
};

let totalReplacements = 0;
for (const [original, variations] of Object.entries(phraseVariations)) {
  let count = 0;
  while (content.includes(original)) {
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    content = content.replace(original, randomVariation);
    count++;
  }
  if (count > 0) {
    console.log(`Replaced ${count} occurrences of "${original}"`);
    totalReplacements += count;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Total replacements: ${totalReplacements}`);