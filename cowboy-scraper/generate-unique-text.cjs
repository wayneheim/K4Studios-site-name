// generate-unique-text.js
// Usage: node generate-unique-text.js
// Generates unique titles and descriptions for placeholder items in NA-Color.mjs using K4-Sem.ts

const fs = require('fs');
const path = require('path');

// Paths
const galleryPath = path.resolve(__dirname, process.argv[2] || '../src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs');
const isRevert = process.argv[3] === 'revert';
const semPath = path.resolve(__dirname, '../src/data/semantic/K4-Sem.ts');

// Placeholder values
const placeholderTitle = "Untitled";
const placeholderDescription = "Fine Art Photography by Wayne Heim from the A collection. New Work! — More info coming soon.";
const placeholderStory = "New fine art photography by Wayne Heim – A. Check back soon for complete story on this image.";

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

// Choose phrases based on gallery path
let phrases;
if (galleryPath.includes('NA-Color') || galleryPath.includes('NA')) {
  phrases = semantic.cowboyNativeAmerican.imagePhrases.filter(p => p.use).map(p => p.phrase);
} else {
  phrases = semantic.cowboy.imagePhrases.filter(p => p.use).map(p => p.phrase);
}

function getRandomPhrase() {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function getUniquePhrases(count) {
  const selected = [];
  while (selected.length < count) {
    const p = getRandomPhrase();
    if (!selected.includes(p)) selected.push(p);
  }
  return selected;
}

function toTitleCase(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

function generateTitle(phrases) {
  const templates = [
    () => `${phrases[0]} Portrait`,
    () => `Capturing ${phrases[0]}`,
    () => `${phrases[0]} in Fine Art`,
    () => `Cowboy ${phrases[1]}`,
    () => `${phrases[0]} Cowboy`,
    () => `Fine Art ${phrases[0]}`,
    () => `${phrases[0]} Study`,
    () => `The Essence of ${phrases[0]}`,
    () => `${phrases[0]} Moment`,
    () => `${phrases[0]} - ${phrases[1]}`,
    () => `${phrases[0]} and ${phrases[1]}`,
    () => `Exploring ${phrases[0]}`,
  ];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return toTitleCase(template());
}

function generateDescription(phrases) {
  const templates = [
    () => `Discover the ${phrases[0]} in this powerful ${phrases[1]} by Wayne Heim. A compelling work that embodies ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}. Perfect for art lovers seeking ${phrases[0]} to enhance their collection. © Wayne Heim`,
    () => `Experience ${phrases[0]} through this evocative ${phrases[1]} from Wayne Heim's portfolio. This piece highlights ${phrases[2]} with ${phrases[3]}, while conveying ${phrases[4]}, ideal for those who appreciate ${phrases[0]}. © Wayne Heim`,
    () => `Immerse yourself in ${phrases[0]} with this stunning ${phrases[1]} by Wayne Heim. Capturing ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}, it's a must-have for collectors of ${phrases[0]}. © Wayne Heim`,
    () => `This ${phrases[0]} artwork by Wayne Heim showcases ${phrases[1]} in a ${phrases[2]} style. Reflecting ${phrases[3]}, ${phrases[4]}, and ${phrases[0]}, it's suited for admirers of ${phrases[1]}. © Wayne Heim`,
    () => `Wayne Heim's ${phrases[0]} captures the spirit of ${phrases[1]} in this ${phrases[2]} image. Featuring ${phrases[3]}, ${phrases[4]}, and ${phrases[0]}, it's ideal for ${phrases[1]} enthusiasts. © Wayne Heim`,
    () => `Explore ${phrases[0]} with Wayne Heim's ${phrases[1]}. This ${phrases[2]} piece conveys ${phrases[3]}, ${phrases[4]}, and ${phrases[0]}, perfect for fans of ${phrases[1]}. © Wayne Heim`,
    () => `Delve into ${phrases[0]} via this ${phrases[1]} by Wayne Heim. Highlighting ${phrases[2]} through ${phrases[3]} and ${phrases[4]}, it's great for collectors interested in ${phrases[0]}. © Wayne Heim`,
    () => `Wayne Heim presents ${phrases[0]} in this ${phrases[1]} work. Embodying ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}, it's recommended for lovers of ${phrases[0]}. © Wayne Heim`,
    () => `Witness ${phrases[0]} in Wayne Heim's ${phrases[1]}. This image features ${phrases[2]} with ${phrases[3]} and ${phrases[4]}, ideal for admirers of ${phrases[0]}. © Wayne Heim`,
    () => `Uncover ${phrases[0]} through this ${phrases[1]} from Wayne Heim. Showcasing ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}, it's perfect for enthusiasts of ${phrases[0]}. © Wayne Heim`,
  ];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template();
}

function generateStory(phrases) {
  const templates = [
    () => `This image embodies ${phrases[0]} and ${phrases[1]}, captured by Wayne Heim in his signature style. It reflects ${phrases[2]} with a touch of ${phrases[3]}. © Wayne Heim`,
    () => `Wayne Heim's exploration of ${phrases[0]} comes alive in this piece, showcasing ${phrases[1]} and ${phrases[2]}. A testament to ${phrases[3]} in fine art. © Wayne Heim`,
    () => `Delving into ${phrases[0]}, this work by Wayne Heim highlights ${phrases[1]} through ${phrases[2]} and ${phrases[3]}. A powerful statement in photography. © Wayne Heim`,
  ];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template();
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
  if (isRevert) {
    if (img.description.includes('© Wayne Heim')) {
      img.title = placeholderTitle;
      img.description = placeholderDescription;
      img.story = placeholderStory;
      img.keywords = []; // or keep
      updated++;
    }
  } else {
    if (img.title === placeholderTitle || img.description.includes("coming soon") || img.story.includes("soon")) {
      const selectedPhrases = getUniquePhrases(5);
      const storyPhrases = getUniquePhrases(4); // Separate phrases for story to make it distinct
      const newTitle = generateTitle(selectedPhrases);
      const newDesc = generateDescription(selectedPhrases);
      const newStory = generateStory(storyPhrases);
      img.title = newTitle;
      img.description = newDesc;
      img.story = newStory;

      img.keywords = updateKeywords(img.keywords || [], selectedPhrases.concat(storyPhrases));
      updated++;
    }
  }
}

if (isRevert) {
  console.log(`Reverted ${updated} generated items back to placeholders.`);
} else {
  console.log(`Updated ${updated} placeholder items with unique titles, descriptions, and stories.`);
}

const newContent = replaceGalleryData(galleryRaw, galleryData);
fs.writeFileSync(galleryPath, newContent, 'utf8');

console.log(`${galleryPath} updated with generated text.`);