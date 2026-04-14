// src/utils/seoDescriptionAppender.js
import { semantic } from '../data/semantic/K4-Sem.ts';
import { closingTemplates } from '../data/seo/closingTemplates.ts';

// Map sectionKey to semantic key
function getSemanticKey(sectionKey) {
  // Simple mapping based on keywords in sectionKey
  if (sectionKey.includes('/Facing-History/Wild-West/Western-Narratives')) return 'westernNarratives';
  if (sectionKey.includes('/Facing-History/Wild-West/Native-Americans')) return 'nativeAmericans';
  if (sectionKey === '/Facing-History/Wild-West' || sectionKey.includes('/Facing-History/Wild-West/')) return 'wildWest';
  if (sectionKey.includes('Native-American')) return 'cowboyNativeAmerican';
  if (sectionKey.includes('Roaring-20s')) return 'roaring20s';
  if (sectionKey.includes('WWII/Portraits')) return 'wwiiPortraits';
  if (sectionKey.includes('WWII/War')) return 'wwiiArtOfWar';
  if (sectionKey === '/Facing-History/WWII/Machines/Black-White') return 'wwiiMenAndMachinesBW';
  if (sectionKey === '/Facing-History/WWII/Machines/Color') return 'wwiiMenAndMachinesColor';
  if (sectionKey === '/Miscellaneous/Portraits') return 'miscellaneousPainterly';
  if (sectionKey === '/Miscellaneous/Reenactments') return 'reenactorsTraditional';
  if (sectionKey === '/Miscellaneous/Wildlife') return 'wildlifePainterly';
  if (sectionKey.includes('/Miscellaneous/')) return 'miscellaneousTraditional';
  if (sectionKey === '/Transportation/Military') return 'militaryVehiclesTraditional';
  if (sectionKey === '/Transportation/Planes') return 'aviationTraditional';
  if (sectionKey === '/Transportation/Trains') return 'railwayTraditional';
  if (sectionKey.includes('/Transportation/')) return 'transportation';
  if (sectionKey === '/Landscapes/International') return 'landscapeIntTraditional';
  if (sectionKey === '/Landscapes/International/Canada-Western') return 'canadaWesternTraditional';
  if (sectionKey === '/Landscapes/International/Iceland') return 'icelandTraditional';
  if (sectionKey === '/Landscapes/International/Newfoundland') return 'newfoundlandTraditional';
  if (sectionKey === '/Landscapes/International/The-Faroe-Islands') return 'faroeIslandsTraditional';
  if (sectionKey === '/Landscapes/West') return 'landscapeWestTraditional';
  if (sectionKey === '/Landscapes/Midwest') return 'landscapeMidwestTraditional';
  if (sectionKey === '/Landscapes/Northeast') return 'landscapeNortheastTraditional';
  if (sectionKey === '/Landscapes/South') return 'landscapeSouthTraditional';
  if (sectionKey === '/Landscapes/Black-White-Traditional') return 'blackWhiteTraditional';
  if (sectionKey === '/Landscapes/Color-Traditional') return 'colorTraditional';
  if (sectionKey === '/Landscapes/Mountains-Traditional') return 'mountainsTraditional';
  if (sectionKey === '/Landscapes/Sunsets-Traditional') return 'sunsetsTraditional';
  if (sectionKey === '/Landscapes/Water-Traditional') return 'waterTraditional';
  if (sectionKey === '/Landscapes/Mountains-Painterly') return 'mountainsPainterly';
  if (sectionKey === '/Landscapes/Water-Painterly') return 'waterPainterly';
  if (sectionKey === '/Landscapes/Sunsets-Painterly') return 'sunsetsPainterly';
  if (sectionKey === '/Architecture/Gallery') return 'architectureTraditional';
  if (sectionKey === '/Portraits/Reenactors') return 'reenactorsTraditional';
  if (sectionKey.includes('/Portraits/')) return 'portraitsTraditional';
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

  // For traditional sections, replace "painterly" with "fine art" or remove
  let finalTemplate = template;
  if (semanticKey.includes('Traditional')) {
    finalTemplate = finalTemplate.replace(/painterly fine art/g, 'fine art').replace(/painterly/g, 'fine art');
  }

  return finalTemplate.replace('[keyword]', keyword);
}