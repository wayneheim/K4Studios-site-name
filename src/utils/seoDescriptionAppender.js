// src/utils/seoDescriptionAppender.js
import { semantic } from '../data/semantic/K4-Sem.ts';
import { closingTemplates } from '../data/seo/closingTemplates.ts';

// Map sectionKey to semantic key
function getSemanticKey(sectionKey) {
  // Simple mapping based on keywords in sectionKey
  if (sectionKey.includes('Native-American')) return 'cowboyNativeAmerican';
  if (sectionKey.includes('Roaring-20s')) return 'roaring20s';
  if (sectionKey.includes('WWII/Portraits')) return 'wwiiPortraits';
  if (sectionKey.includes('WWII/War')) return 'wwiiArtOfWar';
  if (sectionKey.includes('Cowboy')) return 'cowboy';
  if (sectionKey.includes('Civil-War')) return 'civilwar';
  // Add more mappings as needed
  // For now, default to sectionKey if it matches
  return sectionKey;
}

// Function to get a closing sentence for an image based on section and image ID
export function getClosingSentence(sectionKey, imageId) {
  const semanticKey = getSemanticKey(sectionKey);
  const section = semantic[semanticKey];
  if (!section || !section.imagePhrases) {
    return ''; // No keywords for this section
  }

  const keywords = section.imagePhrases.filter(p => p.use).map(p => p.phrase);
  if (keywords.length === 0) {
    return '';
  }

  // Create a simple hash from imageId to get a deterministic index
  const hash = imageId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const totalCombinations = closingTemplates.length * keywords.length;
  const index = Math.abs(hash) % totalCombinations;

  const templateIndex = Math.floor(index / keywords.length);
  const keywordIndex = index % keywords.length;

  const template = closingTemplates[templateIndex];
  const keyword = keywords[keywordIndex];

  return template.replace('[keyword]', keyword);
}