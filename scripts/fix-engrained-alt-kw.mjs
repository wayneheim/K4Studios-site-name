/**
 * Fix alt texts and keywords in 2026-Engrained-1.mjs based on titles and descriptions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../src/data/Other/Photo-Shoots/Engrained/2026-Engrained-1.mjs');

// Read and parse the file
const content = fs.readFileSync(filePath, 'utf8');
const match = content.match(/export const galleryData = (\[[\s\S]*\]);?\s*$/);
if (!match) {
  console.error('Could not parse galleryData');
  process.exit(1);
}

const galleryData = eval(match[1]);

console.log(`Processing ${galleryData.length} entries...\n`);

// Helper to generate keywords from title and description
function generateKeywords(title, description) {
  const keywords = [];
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  // Cowboy/Western themes
  if (descLower.includes('cowboy') || titleLower.includes('cowboy')) keywords.push('cowboy');
  if (descLower.includes('western') || titleLower.includes('western')) keywords.push('Western');
  if (descLower.includes('texas ranger')) keywords.push('Texas Ranger');
  if (descLower.includes('old west') || descLower.includes('wild west')) keywords.push('Old West');
  if (descLower.includes('frontier')) keywords.push('frontier');
  
  // Landscape themes
  if (descLower.includes('landscape') || descLower.includes('mountain')) keywords.push('landscape');
  if (descLower.includes('tetons') || descLower.includes('teton')) keywords.push('Tetons');
  if (descLower.includes('jackson hole') || descLower.includes('wyoming')) keywords.push('Jackson Hole', 'Wyoming');
  if (descLower.includes('yellowstone')) keywords.push('Yellowstone');
  if (descLower.includes('aspen')) keywords.push('Aspen', 'trees');
  if (descLower.includes('sunset')) keywords.push('sunset');
  if (descLower.includes('arizona')) keywords.push('Arizona');
  if (descLower.includes('colorado')) keywords.push('Colorado');
  
  // Portrait themes
  if (descLower.includes('portrait')) keywords.push('portrait');
  if (descLower.includes('whiskey') || descLower.includes('drink')) keywords.push('whiskey', 'saloon');
  if (descLower.includes('train')) keywords.push('train');
  if (descLower.includes('gun') || descLower.includes('shoot')) keywords.push('gunfighter');
  if (descLower.includes('coffee')) keywords.push('coffee');
  
  // Other themes
  if (descLower.includes('civil war')) keywords.push('Civil War');
  if (descLower.includes('wwii') || descLower.includes('world war')) keywords.push('WWII', 'World War II');
  if (descLower.includes('nurse')) keywords.push('nurse', 'battlefield');
  if (descLower.includes('church')) keywords.push('church');
  if (descLower.includes('barn')) keywords.push('barn');
  if (descLower.includes('waterfall') || descLower.includes('falls')) keywords.push('waterfall');
  if (descLower.includes('bison') || descLower.includes('buffalo')) keywords.push('bison', 'buffalo');
  if (descLower.includes('native') || descLower.includes('indian')) keywords.push('Native American');
  
  // Engrained-specific
  keywords.push('Engrained', 'baltic birch', 'wood print', 'fine art');
  
  // Dedupe and return
  return [...new Set(keywords)];
}

// Helper to generate alt text from title and description
function generateAlt(title, description) {
  // Clean up the title
  let alt = title.replace(/["""]/g, '').trim();
  
  // Get a short description hint from the description
  const descLower = description.toLowerCase();
  
  if (descLower.includes('cowboy') && !alt.toLowerCase().includes('cowboy')) {
    alt = `${alt} - Cowboy fine art on Baltic birch by Wayne Heim`;
  } else if (descLower.includes('landscape') || descLower.includes('mountain')) {
    alt = `${alt} - Painterly landscape on Baltic birch by Wayne Heim`;
  } else if (descLower.includes('wwii') || descLower.includes('world war')) {
    alt = `${alt} - WWII fine art on Baltic birch by Wayne Heim`;
  } else if (descLower.includes('civil war')) {
    alt = `${alt} - Civil War fine art on Baltic birch by Wayne Heim`;
  } else {
    alt = `${alt} - Fine art on Baltic birch by Wayne Heim`;
  }
  
  return alt;
}

let updatedCount = 0;

galleryData.forEach((item, idx) => {
  if (item.visibility === 'ghost' || item.id === 'i-k4studios') return;
  
  const oldAlt = item.alt;
  const oldKeywords = JSON.stringify(item.keywords);
  
  // Generate new alt
  item.alt = generateAlt(item.title, item.description);
  
  // Generate new keywords
  item.keywords = generateKeywords(item.title, item.description);
  
  const newAlt = item.alt;
  const newKeywords = JSON.stringify(item.keywords);
  
  if (oldAlt !== newAlt || oldKeywords !== newKeywords) {
    updatedCount++;
    console.log(`${item.id}: "${item.title}"`);
    if (oldAlt !== newAlt) {
      console.log(`  alt: "${oldAlt}" -> "${newAlt.substring(0, 60)}..."`);
    }
    if (oldKeywords !== newKeywords) {
      console.log(`  keywords: ${item.keywords.slice(0, 5).join(', ')}...`);
    }
  }
});

console.log(`\nTotal updated: ${updatedCount}`);

// Write back
const output = `export const galleryData = ${JSON.stringify(galleryData, null, 2)};
`;

fs.writeFileSync(filePath, output, 'utf8');
console.log(`\n✅ Written to: ${filePath}`);
