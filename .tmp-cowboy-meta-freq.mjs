import * as color from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import * as bw from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import * as na from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';

const sets=[['Color',color.galleryData],['Black-White',bw.galleryData],['NA-Color',na.galleryData]];

for (const [name, data] of sets) {
  const rows=data.filter(x=>x.visibility!=='ghost' && x.id!=='i-k4studios');
  const kwFreq=new Map();
  const descPrefixFreq=new Map();
  const altEndsByWayne = rows.filter(r=>String(r.alt||'').toLowerCase().includes('by wayne heim')).length;
  const altHasCopyright = rows.filter(r=>/|copyright/i.test(String(r.alt||''))).length;

  for (const r of rows) {
    const kws=(r.keywords||[]).map(k=>String(k).trim()).filter(Boolean);
    for (const kw of kws) kwFreq.set(kw, (kwFreq.get(kw)||0)+1);

    const d=String(r.description||'').replace(/\s+/g,' ').trim();
    const p=d.slice(0,80);
    if (p) descPrefixFreq.set(p, (descPrefixFreq.get(p)||0)+1);
  }

  const topKw=[...kwFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15);
  const repetitivePrefixes=[...descPrefixFreq.entries()].filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,10);

  console.log(`\n=== ${name} ===`);
  console.log('altEndsByWayne:', altEndsByWayne, 'altHasCopyright:', altHasCopyright);
  console.log('Top keywords:');
  for (const [kw,c] of topKw) console.log(`  ${c}x | ${kw}`);
  console.log('Repeated description starts (>=3):');
  for (const [p,c] of repetitivePrefixes) console.log(`  ${c}x | ${p}`);
}
