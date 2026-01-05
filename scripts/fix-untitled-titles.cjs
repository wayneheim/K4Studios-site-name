const fs = require('fs');
const path = require('path');

// Gallery files to process (not /Other)
const galleryFiles = [
  'src/data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Black-White/Black-White.mjs',
  'src/data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Color/Color.mjs',
  'src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs',
  'src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs',
];

// Title templates that rotate based on image ID hash
const titleTemplates = {
  'Landscapes': [
    'Landscape Study',
    'Natural Light',
    'Quiet Moment',
    'Field Work',
    'Open Country',
    'Distant View',
    'Morning Light',
    'Evening Study',
  ],
  'Western-Cowboy-Portraits': [
    'Western Portrait',
    'Frontier Study',
    'Cowboy Portrait',
    'Range Rider',
    'Trail Hand',
    'Western Figure',
    'Horseman',
    'Working Cowboy',
  ],
  'default': [
    'Fine Art Study',
    'Portrait',
    'Composition',
    'Study in Light',
    'Untitled Work',
  ]
};

// Simple hash function for consistent selection
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function pick(arr, seed) {
  return arr[hashString(seed) % arr.length];
}

function getGalleryType(filePath) {
  if (filePath.includes('Landscapes')) return 'Landscapes';
  if (filePath.includes('Western-Cowboy-Portraits')) return 'Western-Cowboy-Portraits';
  return 'default';
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/export const galleryData = (\[[\s\S]*\]);/);
  if (!match) {
    console.log('Could not parse:', filePath);
    return 0;
  }
  
  const galleryType = getGalleryType(filePath);
  const templates = titleTemplates[galleryType];
  
  let data;
  try {
    data = eval(match[1]);
  } catch (e) {
    console.log('Eval error:', filePath, e.message);
    return 0;
  }
  
  let fixed = 0;
  data.forEach(img => {
    if (img.title === 'Untitled') {
      // Pick a title based on image ID for consistency
      img.title = pick(templates, img.id);
      fixed++;
    }
  });
  
  if (fixed > 0) {
    // Reconstruct the file
    const header = content.substring(0, content.indexOf('export const galleryData'));
    const jsonStr = JSON.stringify(data, null, 2)
      .replace(/"([^"]+)":/g, ' "$1":') // fix spacing
      .replace(/^\s{2}/gm, ' ');        // reduce indent
    const newContent = header + 'export const galleryData = ' + jsonStr + ';\n';
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
  
  return fixed;
}

console.log('=== Fixing Untitled Titles in Gallery Files ===\n');

let totalFixed = 0;
galleryFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const fixed = processFile(file);
    if (fixed > 0) {
      console.log(`${path.basename(file)}: ${fixed} titles fixed`);
      totalFixed += fixed;
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log(`\nTotal: ${totalFixed} Untitled titles fixed`);
