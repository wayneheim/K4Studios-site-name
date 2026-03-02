import * as color from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import * as bw from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import * as na from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';

for (const [name, data] of [['Color', color.galleryData], ['Black-White', bw.galleryData], ['NA-Color', na.galleryData]]) {
  const rows = data.filter(r => r.visibility !== 'ghost' && r.id !== 'i-k4studios');
  const lengths = rows.map(r => String(r.alt || '').trim().length);
  const avg = Math.round(lengths.reduce((a,b)=>a+b,0)/lengths.length);
  const over140 = lengths.filter(n => n > 140).length;
  const over160 = lengths.filter(n => n > 160).length;
  console.log(`${name}: images=${rows.length} altAvg=${avg} altMax=${Math.max(...lengths)} over140=${over140} over160=${over160}`);
}
