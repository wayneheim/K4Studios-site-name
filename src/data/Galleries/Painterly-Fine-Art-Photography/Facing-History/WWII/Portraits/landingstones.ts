import { galleryData as colorGallery } from './Color.mjs';
import { galleryData as bwGallery } from './Black-White.mjs';

// Universal filter for visible images
function filterGalleryImages(images) {
  return images.filter(
    img =>
      img.id !== 'i-k4studios' &&
      (!img.visibility || img.visibility !== 'ghost')
  );
}

// Random pick helper
function pickRandom(images) {
  if (!images.length) return null;
  return images[Math.floor(Math.random() * images.length)];
}

const colorPool = filterGalleryImages(colorGallery);
const bwPool = filterGalleryImages(bwGallery);

const colorImg = pickRandom(colorPool);
const bwImg = pickRandom(bwPool);

export const landingWestern = {
  title: "The WWII Portraits 1940's: The Greatest Generation",
  subtitle: "Painterly WWII Portraits History Themed Photography by Wayne Heim",
     breadcrumb: 
  `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History" style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;" onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Facing History</a> |
  <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII" style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;" onmouseover="this.style.color='Olive'" onmouseout="this.style.color='inherit'">WWII</a> | Portraits`,

  tombstones: [
    {
      title: 'Color WWII Portraits',
      href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color',
      thumb: colorImg ? colorImg.src || colorImg.url || '' : '',
      alt: colorImg ? colorImg.alt || colorImg.title || '' : '',
    },
    {
      title: 'Black & White WWII Portraits',
      href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White',
      thumb: bwImg ? bwImg.src || bwImg.url || '' : '',
      alt: bwImg ? bwImg.alt || bwImg.title || '' : '',
    },
  ]
};
