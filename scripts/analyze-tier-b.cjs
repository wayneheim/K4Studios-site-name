const fs = require('fs');

const content = fs.readFileSync('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs', 'utf8');
const match = content.match(/export const galleryData = (\[[\s\S]*\]);/);
const data = eval(match[1]);

// Find AI template images
const aiPattern = data.filter(img => img.description && 
  img.description.startsWith('A painterly Western photograph of a cowboy, defined by'));

// Count duplicates
const descCounts = {};
aiPattern.forEach(img => {
  descCounts[img.description] = (descCounts[img.description] || 0) + 1;
});

// Find duplicates with meaningful titles (excluding generic SEO titles)
const genericPatterns = [
  'Cowboy Art',
  'Cowboy Portraits', 
  'Fine Art',
  'Capturing',
  'Exploring',
  'Study',
  'Western Landscapes',
  'Frederic Remington',
  'Wild West Photography',
  'Historic Western',
  'Cowboy Painting',
  'Western Cowboys',
  'Frontier Life',
  'Rustic Charm',
  'Western Art',
  'Outlaw Portraits'
];

const dupeWithTitles = aiPattern.filter(img => {
  if (descCounts[img.description] <= 1) return false;
  if (!img.title || img.title === 'Untitled') return false;
  
  // Exclude generic SEO titles
  for (const pattern of genericPatterns) {
    if (img.title.includes(pattern)) return false;
  }
  return true;
});

console.log('=== Tier B Analysis ===');
console.log('Total AI template images:', aiPattern.length);
console.log('With duplicate descriptions:', aiPattern.filter(img => descCounts[img.description] > 1).length);
console.log('With meaningful titles:', dupeWithTitles.length);

console.log('\n=== Sample Meaningful Titles ===');
dupeWithTitles.slice(0, 20).forEach(img => {
  const themes = img.themes ? Object.keys(img.themes) : [];
  console.log('-', img.title, '| themes:', themes.join(', ') || 'none');
});

console.log('\n=== Transformation Strategy ===');
console.log('For images with meaningful titles like "Marshal", "Lord, show me a sign", etc.');
console.log('Insert title after the style phrase to differentiate.');
