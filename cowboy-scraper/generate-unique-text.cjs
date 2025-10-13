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
const placeholderDescriptionAlt = "From the Wayne Heim A series. New image! More info coming soon.";
const placeholderStory = "New fine art photography by Wayne Heim – A. Check back soon for complete story on this image.";

function extractGalleryData(fileContent) {
  const match = fileContent.match(/export const galleryData = (\[[\s\S]*\]);?/);
  if (!match) throw new Error('galleryData array not found');
  return eval('(' + match[1] + ')'); // Use eval for JS array
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
let section = 'cowboy';
let location = '';
if (galleryPath.includes('NA-Color') || galleryPath.includes('NA')) {
  phrases = semantic.cowboyNativeAmerican.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'cowboy';
} else if (galleryPath.includes('Civil-War')) {
  phrases = semantic.civilwar.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'civilwar';
} else if (galleryPath.includes('Roaring-20s')) {
  phrases = semantic.roaring20s.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'roaring20s';
} else if (galleryPath.includes('WWII') && galleryPath.includes('Machines')) {
  phrases = semantic.wwiiMenAndMachines.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'wwii';
} else if (galleryPath.includes('WWII') && galleryPath.includes('Portraits')) {
  phrases = semantic.wwiiPortraits.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'wwii';
} else if (galleryPath.includes('WWII') && galleryPath.includes('War')) {
  phrases = semantic.wwiiArtOfWar.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'wwii';
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('International')) {
  phrases = semantic.landscapeIntPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
  location = path.basename(galleryPath, '.mjs');
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('West')) {
  phrases = semantic.landscapeWestPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('Midwest')) {
  phrases = semantic.landscapeMidwestPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('Northeast')) {
  phrases = semantic.landscapeNortheastPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('South')) {
  phrases = semantic.landscapeSouthPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('Mountains')) {
  phrases = semantic.mountainsPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('Water')) {
  phrases = semantic.waterPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
} else if (galleryPath.includes('Landscapes') && galleryPath.includes('Sunsets')) {
  phrases = semantic.sunsetsPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'landscapes';
} else if (galleryPath.includes('Reenact')) {
  phrases = semantic.reenactorsTraditional.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'reenactors';
} else if (galleryPath.includes('Wildlife')) {
  phrases = semantic.wildlifePainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'wildlife';
} else if (galleryPath.includes('Miscellaneous')) {
  phrases = semantic.miscellaneousPainterly.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'miscellaneous';
} else if (galleryPath.includes('Transportation')) {
  let allPhrases = semantic.transportation.imagePhrases.filter(p => p.use).map(p => p.phrase);
  if (galleryPath.includes('Cars')) {
    phrases = allPhrases.filter(p => p.includes('car') || p.includes('automotive') || p.includes('route 66'));
  } else if (galleryPath.includes('Trains')) {
    phrases = allPhrases.filter(p => p.includes('train') || p.includes('steam') || p.includes('engine'));
  } else if (galleryPath.includes('Boats')) {
    phrases = allPhrases.filter(p => p.includes('boat') || p.includes('nautical') || p.includes('ship'));
  } else if (galleryPath.includes('Planes')) {
    phrases = allPhrases.filter(p => p.includes('plane') || p.includes('aviation') || p.includes('aircraft'));
  } else if (galleryPath.includes('Military')) {
    phrases = allPhrases.filter(p => p.includes('military') || p.includes('vehicle'));
  } else {
    phrases = allPhrases;
  }
  section = 'transportation';
} else if (galleryPath.includes('Architecture')) {
  phrases = semantic.architectureTraditional.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'architecture';
} else if (galleryPath.includes('Reenact')) {
  phrases = semantic.reenactorsTraditional.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'reenactors';
} else {
  phrases = semantic.cowboy.imagePhrases.filter(p => p.use).map(p => p.phrase);
  section = 'cowboy';
}
console.log('Using phrases for', galleryPath, phrases.length, 'section:', section);

function getRandomPhrase() {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function getUniquePhrases(count) {
  const selected = [];
  while (selected.length < count) {
    const p = getRandomPhrase();
    selected.push(p); // Allow duplicates if not enough unique
  }
  return selected;
}

function toTitleCase(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

function generateTitle(phrases, section) {
  let templates;
  if (section === 'landscapes') {
    templates = [
      () => location ? `${location} Landscape: ${phrases[0]}` : `${phrases[0]} Landscape`,
      () => location ? `Capturing ${phrases[0]} in ${location}` : `Capturing ${phrases[0]}`,
      () => location ? `${phrases[0]} in ${location}` : `${phrases[0]} in Fine Art`,
      () => location ? `Fine Art ${phrases[0]} of ${location}` : `Fine Art ${phrases[0]}`,
      () => location ? `${location} ${phrases[0]} Study` : `${phrases[0]} Study`,
      () => location ? `The Essence of ${phrases[0]} in ${location}` : `The Essence of ${phrases[0]}`,
      () => location ? `${phrases[0]} Moment in ${location}` : `${phrases[0]} Moment`,
      () => location ? `${phrases[0]} - ${phrases[1]} in ${location}` : `${phrases[0]} - ${phrases[1]}`,
      () => location ? `${phrases[0]} and ${phrases[1]} of ${location}` : `${phrases[0]} and ${phrases[1]}`,
      () => location ? `Exploring ${phrases[0]} in ${location}` : `Exploring ${phrases[0]}`,
    ];
  } else {
    templates = [
      () => `${phrases[0]} Portrait`,
      () => `Capturing ${phrases[0]}`,
      () => `${phrases[0]} in Fine Art`,
      () => `Fine Art ${phrases[0]}`,
      () => `${phrases[0]} Study`,
      () => `The Essence of ${phrases[0]}`,
      () => `${phrases[0]} Moment`,
      () => `${phrases[0]} - ${phrases[1]}`,
      () => `${phrases[0]} and ${phrases[1]}`,
      () => `Exploring ${phrases[0]}`,
    ];
  }
  const template = templates[Math.floor(Math.random() * templates.length)];
  return toTitleCase(template());
}

function generateDescription(phrases) {
  const templates = [
    () => `Discover the ${phrases[0]} in this powerful ${phrases[1]} by Wayne Heim${location ? ` from ${location}` : ''}. A compelling work that embodies ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}. Featuring ${phrases[5]}, perfect for art lovers seeking ${phrases[0]} to enhance their collection. © Wayne Heim`,
    () => `Experience ${phrases[0]} through this evocative ${phrases[1]} from Wayne Heim's portfolio${location ? ` of ${location}` : ''}. This piece highlights ${phrases[2]} with ${phrases[3]}, while conveying ${phrases[4]}, ideal for those who appreciate ${phrases[0]}. Explore ${phrases[5]} in fine art. © Wayne Heim`,
    () => `Immerse yourself in ${phrases[0]} with this stunning ${phrases[1]} by Wayne Heim${location ? ` captured in ${location}` : ''}. Capturing ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}, it's a must-have for collectors of ${phrases[0]}. Including ${phrases[5]} themes. © Wayne Heim`,
    () => `This ${phrases[0]} artwork by Wayne Heim showcases ${phrases[1]} in a ${phrases[2]} style${location ? ` from ${location}` : ''}. Reflecting ${phrases[3]}, ${phrases[4]}, and ${phrases[0]}, it's suited for admirers of ${phrases[1]}. With ${phrases[5]} elements. © Wayne Heim`,
    () => `Wayne Heim's ${phrases[0]} captures the spirit of ${phrases[1]} in this ${phrases[2]} image${location ? ` of ${location}` : ''}. Featuring ${phrases[3]}, ${phrases[4]}, and ${phrases[0]}, it's ideal for ${phrases[1]} enthusiasts. Discover ${phrases[5]} in photography. © Wayne Heim`,
    () => `Explore ${phrases[0]} with Wayne Heim's ${phrases[1]}${location ? ` in ${location}` : ''}. This ${phrases[2]} piece conveys ${phrases[3]}, ${phrases[4]}, and ${phrases[0]}, perfect for fans of ${phrases[1]}. Highlighting ${phrases[5]}. © Wayne Heim`,
    () => `Delve into ${phrases[0]} via this ${phrases[1]} by Wayne Heim${location ? ` from ${location}` : ''}. Highlighting ${phrases[2]} through ${phrases[3]} and ${phrases[4]}, it's great for collectors interested in ${phrases[0]}. Featuring ${phrases[5]}. © Wayne Heim`,
    () => `Wayne Heim presents ${phrases[0]} in this ${phrases[1]} work${location ? ` depicting ${location}` : ''}. Embodying ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}, it's recommended for lovers of ${phrases[0]}. With ${phrases[5]} inspiration. © Wayne Heim`,
    () => `Witness ${phrases[0]} in Wayne Heim's ${phrases[1]}${location ? ` of ${location}` : ''}. This image features ${phrases[2]} with ${phrases[3]} and ${phrases[4]}, ideal for admirers of ${phrases[0]}. Explore ${phrases[5]} themes. © Wayne Heim`,
    () => `Uncover ${phrases[0]} through this ${phrases[1]} from Wayne Heim${location ? ` in ${location}` : ''}. Showcasing ${phrases[2]}, ${phrases[3]}, and ${phrases[4]}, it's perfect for enthusiasts of ${phrases[0]}. Including ${phrases[5]}. © Wayne Heim`,
  ];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template();
}

function generateStory(phrases) {
  const templates = [
    () => `This image embodies ${phrases[0]} and ${phrases[1]}, captured by Wayne Heim in his signature style${location ? ` in ${location}` : ''}. It reflects ${phrases[2]} with a touch of ${phrases[3]}. © Wayne Heim`,
    () => `Wayne Heim's exploration of ${phrases[0]} comes alive in this piece, showcasing ${phrases[1]} and ${phrases[2]}${location ? ` from ${location}` : ''}. A testament to ${phrases[3]} in fine art. © Wayne Heim`,
    () => `Delving into ${phrases[0]}, this work by Wayne Heim highlights ${phrases[1]} through ${phrases[2]} and ${phrases[3]}${location ? ` in ${location}` : ''}. A powerful statement in photography. © Wayne Heim`,
  ];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template();
}

function generateAlt(phrases) {
  const templates = [
    () => `Fine art photography of ${phrases[0]} by Wayne Heim`,
    () => `${phrases[0]} in fine art photography`,
    () => `Wayne Heim's ${phrases[0]} artwork`,
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
    if (img.description.includes('© Wayne Heim') || img.description.includes("to be added")) {
      img.title = placeholderTitle;
      img.description = placeholderDescription;
      img.story = placeholderStory;
      img.keywords = []; // or keep
      updated++;
    }
  } else {
    if (img.title === placeholderTitle || img.description.includes("coming soon") || img.description.includes("to be added") || img.description === placeholderDescription || img.description.includes("From the Wayne Heim A series") || img.story.includes("soon") || img.story.includes("to be added")) {
      const selectedPhrases = getUniquePhrases(6);
      const storyPhrases = getUniquePhrases(4); // Separate phrases for story to make it distinct
      const newTitle = generateTitle(selectedPhrases, section);
      const newDesc = generateDescription(selectedPhrases);
      const newStory = generateStory(storyPhrases);
      img.title = newTitle;
      img.description = newDesc;
      img.story = newStory;

      if (img.alt === "Photographic artwork © Wayne Heim" || !img.alt) {
        const altPhrases = getUniquePhrases(1);
        img.alt = generateAlt(altPhrases);
      }

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

fs.writeFileSync(galleryPath, replaceGalleryData(galleryRaw, galleryData), 'utf8');
console.log(`${galleryPath} updated with generated text.`);

const newContent = replaceGalleryData(galleryRaw, galleryData);
fs.writeFileSync(galleryPath, newContent, 'utf8');

console.log(`${galleryPath} updated with generated text.`);