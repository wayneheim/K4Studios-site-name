const path = require('path');
const { buildImageSeoTitle } = require('./tmp_buildImageSeoTitle.cjs');
(async () => {
  const mod = await import(pathToFileURL(path.resolve('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs')).href);
  const image = (mod.galleryData || []).find((item) => item && item.id === 'i-44jcjTQ');
  if (!image) throw new Error('image not found');
  const title = buildImageSeoTitle(image, {
    galleryPath: 'Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color',
    galleryTitle: 'Western Narratives'
  });
  console.log(JSON.stringify({ id: image.id, originalTitle: image.title, generatedTitle: title }, null, 2));
})();
function pathToFileURL(filePath) {
  let resolved = path.resolve(filePath).replace(/\\/g, '/');
  if (!resolved.startsWith('/')) resolved = '/' + resolved;
  return new URL('file://' + resolved);
}
