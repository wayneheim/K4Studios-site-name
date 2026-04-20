const paths=[
  'src/data/Galleries/Fine-Art-Photography/Portraits/Black-White.mjs',
  'src/data/Galleries/Fine-Art-Photography/Portraits/Color.mjs',
  'src/data/Galleries/Fine-Art-Photography/Portraits/Reenactors.mjs'
];
for (const rel of paths) {
  const mod=require(require('path').resolve(rel));
  const data=(mod.galleryData||[]).filter(x=>x && x.id && x.id!=='i-k4studios').slice(0,5);
  console.log('\nFILE', rel);
  for (const img of data) {
    console.log(JSON.stringify({id:img.id,title:img.title,alt:img.alt,description:img.description,story:img.story}, null, 2));
  }
}
