// generate-unique-text.js
// Usage: node generate-unique-text.js
// Generates unique titles and descriptions for placeholder items in NA-Color.mjs using K4-Sem.ts

const fs = require('fs');
const path = require('path');

// Paths
const galleryPath = path.resolve(__dirname, '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs');
const semPath = path.resolve(__dirname, '../src/data/semantic/K4-Sem.ts');

// Placeholder values
const placeholderTitle = "Untitled";
const placeholderDescription = "Fine Art Photography by Wayne Heim from the A collection. New Work! — More info coming soon.";

function extractGalleryData(fileContent) {
  const match = fileContent.match(/export const galleryData = (\[.*\]);/s);
  if (!match) throw new Error('galleryData array not found');
  return JSON.parse(match[1]);
}

function replaceGalleryData(fileContent, newData) {
  return fileContent.replace(
    /export const galleryData = \[.*\];/s,
    'export const galleryData = ' + JSON.stringify(newData, null, 2) + ';'
  );
}

// Load semantic data
const semRaw = fs.readFileSync(semPath, 'utf8');
const semMatch = semRaw.match(/export const semantic = (\{.*\});/s);
if (!semMatch) throw new Error('semantic object not found');
const semantic = eval('(' + semMatch[1] + ')'); // Use eval for nested objects, or better parse

// Get cowboy imagePhrases
const phrases = semantic.cowboyNativeAmerican.imagePhrases.filter(p => p.use).map(p => p.phrase);

function getRandomPhrase() {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function generateTitle() {
  return "Western Cowboy Portrait - " + getRandomPhrase();
}

function generateDescription() {
  const p1 = getRandomPhrase();
  let p2 = getRandomPhrase();
  while (p2 === p1) p2 = getRandomPhrase();
  let p3 = getRandomPhrase();
  while (p3 === p1 || p3 === p2) p3 = getRandomPhrase();
  let p4 = getRandomPhrase();
  while (p4 === p1 || p4 === p2 || p4 === p3) p4 = getRandomPhrase();

  return `Experience the ${p1} in this captivating ${p2} by Wayne Heim. A stunning piece of ${p3} that captures the essence of ${p4}. Ideal for collectors seeking authentic Western art to adorn their walls. © Wayne Heim`;
}

function updateKeywords(keywords, newPhrases) {
  // Add new phrases to keywords if not already there
  newPhrases.forEach(phrase => {
    if (!keywords.includes(phrase)) keywords.push(phrase);
  });
  return keywords;
}

// Load gallery data
const galleryRaw = fs.readFileSync(galleryPath, 'utf8');
const galleryData = extractGalleryData(galleryRaw);

let updated = 0;
for (const img of galleryData) {
  if (img.title === placeholderTitle || img.description.includes("More info coming soon")) {
    const newTitle = generateTitle();
    const newDesc = generateDescription();
    img.title = newTitle;
    img.description = newDesc;

    // Extract phrases used in title and desc
    const usedPhrases = [];
    // From title: after " - "
    const titlePhrase = newTitle.split(" - ")[1];
    if (titlePhrase) usedPhrases.push(titlePhrase);
    // From desc: the phrases in the template
    const descMatch = newDesc.match(/the (\w+(?:\s+\w+)*) in this captivating (\w+(?:\s+\w+)*) by Wayne Heim\. A stunning piece of (\w+(?:\s+\w+)*) that captures the essence of (\w+(?:\s+\w+)*)\./);
    if (descMatch) {
      usedPhrases.push(descMatch[1], descMatch[2], descMatch[3], descMatch[4]);
    }

    img.keywords = updateKeywords(img.keywords || [], usedPhrases);
    updated++;
  }
}

console.log(`Updated ${updated} placeholder items with unique titles and descriptions.`);

const newContent = replaceGalleryData(galleryRaw, galleryData);
fs.writeFileSync(galleryPath, newContent, 'utf8');

console.log('NA-Color.mjs updated with generated text.');