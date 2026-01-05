const fs = require('fs');

const content = fs.readFileSync('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs', 'utf8');
const m = content.match(/export const galleryData = (\[[\s\S]*\]);/);
const data = eval(m[1]);

// AI-generated story patterns (not real K4 stories)
const fakePatterns = [
  'This image embodies',
  "Wayne Heim's exploration",
  'Delving into',
  'captured by Wayne Heim in his signature style',
  'A testament to',
  'A powerful statement in photography',
  'Enjoy a new image from',
  'New photo by Wayne Heim',
  'New fine art photography by Wayne Heim',
  'Check back soon for complete story',
  'Full story on image to follow',
  'Full image story to follow'
];

let fake = 0, real = 0;
const fakeStories = [];
const realStoriesWithFR = [];

data.forEach(img => {
  if (!img.story) return;
  
  const isFake = fakePatterns.some(p => img.story.includes(p));
  const hasFR = /frederic remington/i.test(img.story);
  
  if (isFake) {
    fake++;
    if (hasFR) fakeStories.push({ id: img.id, story: img.story });
  } else {
    real++;
    if (hasFR) realStoriesWithFR.push({ id: img.id, story: img.story.substring(0, 200) });
  }
});

console.log('=== Story Classification ===');
console.log('Fake AI stories:', fake);
console.log('Real K4 stories:', real);

console.log('\n=== Fake stories with "Frederic Remington" (safe to replace) ===');
console.log('Count:', fakeStories.length);

console.log('\n=== REAL stories with "Frederic Remington" (DO NOT TOUCH) ===');
console.log('Count:', realStoriesWithFR.length);
realStoriesWithFR.forEach(s => {
  console.log('ID:', s.id);
  console.log('Story:', s.story + '...');
  console.log('');
});
