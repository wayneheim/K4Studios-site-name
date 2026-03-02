import * as color from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import * as bw from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import * as na from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';

const sets = [['Color', color.galleryData], ['Black-White', bw.galleryData], ['NA-Color', na.galleryData]];
for (const [name, data] of sets) {
  const rows = data.filter(r => r.visibility !== 'ghost' && r.id !== 'i-k4studios');
  const counts = rows.map(r => Array.isArray(r.keywords) ? r.keywords.length : 0);
  const dups = rows.filter(r => {
    const kws = (r.keywords || []).map(k => String(k).trim().toLowerCase());
    return new Set(kws).size !== kws.length;
  }).length;
  const avg = Math.round(counts.reduce((a,b)=>a+b,0) / counts.length);
  console.log(`${name}: images=${rows.length} kwAvg=${avg} kwMax=${Math.max(...counts)} over15=${counts.filter(c=>c>15).length} dupArrays=${dups}`);
}
