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
  title: "The WWII: Men and Machines",
  subtitle: "Painterly WWII Men and Machines Themed Photography by Wayne Heim",
  breadcrumb: "Facing History | WWII | Men & Machines",

  tombstones: [
    {
      title: 'Color WWII Men & Machines',
      href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color',
      thumb: colorImg ? colorImg.src || colorImg.url || '' : '',
      alt: colorImg ? colorImg.alt || colorImg.title || '' : '',
    },
    {
      title: 'Black & White Men and Machines',
      href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White',
      thumb: bwImg ? bwImg.src || bwImg.url || '' : '',
      alt: bwImg ? bwImg.alt || bwImg.title || '' : '',
    },
  ]
};
