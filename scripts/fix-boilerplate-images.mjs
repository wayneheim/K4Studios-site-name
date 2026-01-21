/**
 * Generate unique content for boilerplate images
 * 
 * Uses:
 * - Image alt text (often unique descriptive name)
 * - Gallery entrance data (title, description, keywords)
 * - K4-Sem phrases for the gallery category
 * 
 * Generates unique story and description for each image
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gallery-specific phrases from K4-Sem (subset for WWII and common galleries)
const galleryPhrases = {
  'WWII/War': [
    'World War II fine art photography',
    'painterly WWII photography',
    'battlefield moments captured in art',
    'the Greatest Generation',
    'wartime photography as fine art',
    'Second World War imagery',
    'WWII combat photography',
    'historical military photography'
  ],
  'WWII/Portraits': [
    'WWII portrait photography',
    'Greatest Generation portraits',
    'wartime portrait art',
    'military portrait photography',
    'soldier portraits in fine art',
    'World War II faces',
    'painterly military portraits'
  ],
  'WWII/Machines': [
    'WWII military vehicles',
    'wartime machinery photography',
    'tanks and equipment art',
    'military hardware photography',
    'World War II equipment',
    'vintage military vehicles'
  ],
  'Western-Cowboy-Portraits': [
    'Western cowboy portraits',
    'painterly Western photography',
    'cowboy character studies',
    'American West portraiture',
    'Western fine art photography',
    'cowboy fine art prints'
  ],
  'Civil-War-Portraits': [
    'Civil War portrait photography',
    'historical Civil War art',
    'painterly Civil War photography',
    'American Civil War portraits'
  ],
  'Roaring-20s-Portraits': [
    'Roaring Twenties portraits',
    '1920s portrait photography',
    'Jazz Age portraiture',
    'vintage 1920s photography',
    'Art Deco era portraits'
  ],
  'Reenactments': [
    'historical reenactment photography',
    'living history photography',
    'reenactor portraits',
    'period costume photography'
  ],
  'default': [
    'fine art photography',
    'painterly photography',
    'Wayne Heim photography',
    'K4 Studios fine art'
  ]
};

// Story templates that incorporate image-specific details
const storyTemplates = [
  (alt, galleryName, phrase) => 
    `"${alt}" — ${phrase}. This painterly image by Wayne Heim captures a moment of quiet intensity, where light and composition tell the story. Part of the ${galleryName} collection.`,
  
  (alt, galleryName, phrase) => 
    `${alt}. Wayne Heim's approach to ${phrase} transforms this scene into fine art — where atmosphere, restraint, and narrative converge. From the ${galleryName} series.`,
  
  (alt, galleryName, phrase) => 
    `In "${alt}," Wayne Heim renders ${phrase} with the tonal depth and compositional discipline of classical painting. A study in light, posture, and consequence. ${galleryName}.`,
  
  (alt, galleryName, phrase) => 
    `${alt} — part of Wayne Heim's ${galleryName} collection. ${phrase} meets painterly execution, creating an image that bridges documentation and fine art.`,
  
  (alt, galleryName, phrase) => 
    `Wayne Heim captures "${alt}" with the restraint and intention of ${phrase}. Light is sculpted, composition serves story. From ${galleryName}.`
];

// Description templates
const descriptionTemplates = [
  (alt, galleryName, phrase, keywords) => 
    `${alt} — a painterly fine art photograph by Wayne Heim. This ${phrase} image is part of the ${galleryName} collection, embodying ${keywords.slice(0, 2).join(' and ')}. Available as museum-quality prints.`,
  
  (alt, galleryName, phrase, keywords) => 
    `Fine art photography: "${alt}" from Wayne Heim's ${galleryName} series. Characterized by ${phrase} and Wayne's signature painterly style. Keywords: ${keywords.slice(0, 3).join(', ')}.`,
  
  (alt, galleryName, phrase, keywords) => 
    `"${alt}" captures ${phrase} through Wayne Heim's lens. Part of the ${galleryName} collection at K4 Studios. This painterly photograph embodies ${keywords[0] || 'fine art photography'}. © Wayne Heim`
];

function getGalleryKey(galleryPath) {
  if (galleryPath.includes('WWII/War')) return 'WWII/War';
  if (galleryPath.includes('WWII/Portraits')) return 'WWII/Portraits';
  if (galleryPath.includes('WWII/Machines')) return 'WWII/Machines';
  if (galleryPath.includes('Western-Cowboy-Portraits')) return 'Western-Cowboy-Portraits';
  if (galleryPath.includes('Civil-War-Portraits')) return 'Civil-War-Portraits';
  if (galleryPath.includes('Roaring-20s-Portraits')) return 'Roaring-20s-Portraits';
  if (galleryPath.includes('Reenactments')) return 'Reenactments';
  return 'default';
}

function getGalleryName(galleryPath) {
  // Extract readable gallery name from path
  // Handle both forward and back slashes, and full Windows paths
  const normalized = galleryPath.replace(/\\/g, '/');
  
  // Extract just the gallery portion after "Galleries/"
  const galleriesMatch = normalized.match(/Galleries\/(.+)\.mjs$/);
  if (!galleriesMatch) {
    // Fallback for relative paths
    const parts = normalized.split('/').filter(Boolean);
    const filename = parts[parts.length - 1].replace('.mjs', '').replace(/-/g, ' ');
    return filename;
  }
  
  const galleryRelative = galleriesMatch[1]; // e.g., "Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color"
  const parts = galleryRelative.split('/');
  
  // Get last 2-3 meaningful parts
  const colorOrBW = parts[parts.length - 1]; // Color or Black-White
  const category = parts[parts.length - 2]; // War, Portraits, Machines, etc.
  const era = parts[parts.length - 3]; // WWII, Civil-War, etc.
  
  // Build nice name like "WWII War Color" or "Civil War Portraits"
  const niceParts = [era, category, colorOrBW]
    .filter(Boolean)
    .map(p => p.replace(/-/g, ' '))
    .filter(p => !p.toLowerCase().includes('fine art photography'))
    .filter(p => !p.toLowerCase().includes('facing history'));
  
  return niceParts.join(' ');
}

function cleanAltText(alt) {
  if (!alt) return null;
  // Skip if it's just copyright or photographer name
  if (/^Wayne\s*Heim?\s*©?\s*\d*$/i.test(alt.trim())) return null;
  if (/^©?\s*\d*\s*Wayne\s*Heim?$/i.test(alt.trim())) return null;
  
  // Remove common suffixes - be more careful with the regex
  let cleaned = alt
    .replace(/\s*[-–—]+\s*Black\s*&?\s*White\s*Photography\s*by\s*Wayne\s*Heim?$/gi, '')
    .replace(/\s*[-–—]+\s*Photography\s*by\s*Wayne\s*Heim?$/gi, '')
    .replace(/\s*[-–—]+\s*Wayne\s*Heim?$/gi, '')
    .replace(/\s*[-–—]+\s*K4\s*Studios?$/gi, '')
    .replace(/\s*©\s*Wayne\s*Heim?.*$/gi, '')
    .replace(/\s*©\s*\d+.*$/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—]+\s*$/, '') // Remove trailing dashes
    .trim();
  return cleaned.length > 5 ? cleaned : null;
}

function cleanTitle(title) {
  if (!title) return null;
  // Clean up auto-generated titles
  let cleaned = title
    .replace(/\s*[-–—]\s*Wayne\s*Heim?.*$/gi, '')
    .replace(/\s*[-–—]\s*K4\s*Studios?.*$/gi, '')
    .replace(/\s*©.*$/gi, '')
    .replace(/^(Wwii|WWII)\s+/i, '') // Remove redundant WWII prefix
    .replace(/\s+/g, ' ')
    .trim();
  // Convert title case 
  cleaned = cleaned.split(' ').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
  return cleaned.length > 5 ? cleaned : null;
}

function generateUniqueContent(image, galleryPath) {
  const galleryKey = getGalleryKey(galleryPath);
  const phrases = galleryPhrases[galleryKey] || galleryPhrases.default;
  const galleryName = getGalleryName(galleryPath);
  
  // Use cleaned alt text as the unique identifier, fall back to cleaned title
  const alt = cleanAltText(image.alt) || cleanTitle(image.title) || `${galleryName} Image`;
  
  // Pick a random phrase and template based on image ID (deterministic)
  const hash = image.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const phraseIndex = hash % phrases.length;
  const storyTemplateIndex = hash % storyTemplates.length;
  const descTemplateIndex = hash % descriptionTemplates.length;
  
  const phrase = phrases[phraseIndex];
  const keywords = image.keywords || [];
  
  const newStory = storyTemplates[storyTemplateIndex](alt, galleryName, phrase);
  const newDescription = descriptionTemplates[descTemplateIndex](alt, galleryName, phrase, keywords);
  
  return {
    story: newStory,
    description: newDescription
  };
}

async function processGalleryFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Parse the galleryData array
  const match = content.match(/export const galleryData = (\[[\s\S]*?\]);/);
  if (!match) {
    console.log(`⚠️ No galleryData found: ${filePath}`);
    return { updated: 0, file: filePath };
  }
  
  // Load the report to know which images need updating
  const reportPath = path.join(__dirname, '../boilerplate-images-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const boilerplateIds = new Set(report.map(r => r.id));
  
  let updatedCount = 0;
  let newContent = content;
  
  // Dynamic import to get actual data
  const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
  const module = await import(fileUrl);
  const galleryData = module.galleryData || [];
  
  for (const img of galleryData) {
    if (!boilerplateIds.has(img.id)) continue;
    
    const { story: newStory, description: newDescription } = generateUniqueContent(img, filePath);
    
    // Replace in file content - find the image object and update story/description
    const oldStory = img.story || '';
    const oldDesc = img.description || '';
    
    if (oldStory) {
      // Escape special regex chars in old story
      const escapedOldStory = oldStory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const storyRegex = new RegExp(`"story":\\s*"${escapedOldStory.replace(/"/g, '\\"')}"`, 'g');
      if (storyRegex.test(newContent)) {
        newContent = newContent.replace(storyRegex, `"story": "${newStory.replace(/"/g, '\\"')}"`);
        updatedCount++;
      }
    }
  }
  
  if (updatedCount > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Updated ${updatedCount} images in: ${path.basename(filePath)}`);
  }
  
  return { updated: updatedCount, file: filePath };
}

async function main() {
  // Load the boilerplate report
  const reportPath = path.join(__dirname, '../boilerplate-images-report.json');
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Run find-boilerplate-images.mjs first to generate the report');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  console.log(`📄 Found ${report.length} images to update\n`);
  
  // Group by gallery file
  const byGallery = {};
  for (const item of report) {
    const galleryFile = path.join(__dirname, '../src/data/Galleries', item.gallery);
    if (!byGallery[galleryFile]) {
      byGallery[galleryFile] = [];
    }
    byGallery[galleryFile].push(item);
  }
  
  console.log(`📁 Across ${Object.keys(byGallery).length} gallery files\n`);
  
  // Preview first - show what would be generated
  console.log('📝 PREVIEW (sample images from different galleries):\n');
  
  // Get samples from different galleries
  const wwiiWar = report.filter(r => r.gallery.includes('WWII/War')).slice(0, 2);
  const wwiiPortraits = report.filter(r => r.gallery.includes('WWII/Portraits') && !r.gallery.includes('copy')).slice(0, 2);
  const cowboy = report.filter(r => r.gallery.includes('Cowboy')).slice(0, 1);
  const samples = [...wwiiWar, ...wwiiPortraits, ...cowboy];
  
  for (const item of samples) {
    const galleryFile = path.join(__dirname, '../src/data/Galleries', item.gallery);
    const fileUrl = `file://${galleryFile.replace(/\\/g, '/')}`;
    try {
      const module = await import(fileUrl);
      const galleryData = module.galleryData || [];
      const img = galleryData.find(i => i.id === item.id);
      if (img) {
        const { story, description } = generateUniqueContent(img, item.gallery);
        console.log(`ID: ${img.id}`);
        console.log(`Gallery: ${item.gallery.split('/').slice(-2).join('/')}`);
        console.log(`Alt: ${img.alt || 'MISSING'}`);
        console.log(`NEW Story: ${story}`);
        console.log('---');
      }
    } catch (e) {
      console.error(`Error previewing ${item.gallery}: ${e.message}`);
    }
  }
  
  console.log(`\n🚀 Applying changes to ${Object.keys(byGallery).length} gallery files...\n`);
  
  // Apply changes
  let totalUpdated = 0;
  for (const [file, items] of Object.entries(byGallery)) {
    const result = await processGalleryFile(file);
    totalUpdated += result.updated;
  }
  console.log(`\n✅ Total updated: ${totalUpdated} images`);
}

main().catch(console.error);
