const path = require('path');
const { buildImageSeoTitle } = require('./tmp_buildImageSeoTitle.cjs');
(async () => {
  const westernNarratives = await import(pathToFileURL(path.resolve('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs')).href);
  const cowboyPortraitsMaster = await import(pathToFileURL(path.resolve('src/data/galleryMaps/PainterlyMasterData.mjs')).href);
  const westernImage = (westernNarratives.galleryData || []).find((item) => item && item.id === 'i-44jcjTQ');
  const cowboyImage = (cowboyPortraitsMaster.galleryDataMap?.['/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color'] || []).find((item) => item && item.id === 'i-44jcjTQ');

  console.log(JSON.stringify({
    westernNarratives: buildImageSeoTitle(westernImage, {
      galleryPath: 'Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color',
      galleryTitle: 'Western Narratives'
    }),
    cowboyPortraits: buildImageSeoTitle(cowboyImage, {
      galleryPath: 'Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color',
      galleryTitle: 'Western Cowboy Portraits'
    })
  }, null, 2));
})();
function pathToFileURL(filePath) {
  let resolved = path.resolve(filePath).replace(/\\/g, '/');
  if (!resolved.startsWith('/')) resolved = '/' + resolved;
  return new URL('file://' + resolved);
}
