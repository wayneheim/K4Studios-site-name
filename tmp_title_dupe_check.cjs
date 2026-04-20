const fs=require('fs');
const path=require('path');
const files=[
  'src/data/Galleries/Fine-Art-Photography/Portraits/Black-White.mjs',
  'src/data/Galleries/Fine-Art-Photography/Portraits/Color.mjs',
  'src/data/Galleries/Fine-Art-Photography/Portraits/Reenactors.mjs'
];
for(const rel of files){
  const abs=path.resolve(rel);
  const mod=require(abs);
  const data=mod.galleryData||[];
  const counts=new Map();
  for(const img of data){
    const title=String(img.title||'').trim();
    if(!title) continue;
    counts.set(title,(counts.get(title)||0)+1);
  }
  const dupes=[...counts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,10);
  console.log('\nFILE',rel);
  console.log('IMAGES',data.length);
  console.log('DUPES',JSON.stringify(dupes));
}
