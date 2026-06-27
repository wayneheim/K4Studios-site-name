import { galleryData as colorGallery } from './Color.mjs';
import { galleryData as bwGallery } from './Black-White.mjs';

// Universal filter for visible images
function filterGalleryImages(images) {
  return images.filter(
    img =>
      img.id !== 'i-k4studios' &&
      (!img.visibility || !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(img.visibility ?? 'show').trim().toLowerCase()))
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

export const landingWestern: any = {
  title: "WWII Portraits — Faces of The Greatest Generation",
  subtitle: "Step Inside the Story — Sacrifice & Brotherhood in Painterly Fine Art",
  description: "WWII portraits and painterly World War II reenactment photography by Wayne Heim, focused on sacrifice, resilience, and the people behind the uniform.",

  // Keywords for structured data and semantic SEO (not meta keywords)
  keywords: [
    "WWII Portraits",
    "One-Image Movie",
    "the Greatest Generation",
    "WWII photography",
    "wartime portrait photography",
    "painterly WWII portraits",
    "WWII Sacrifice & Brotherhood",
    "greatest generation photos",
    "heroic portraits"
  ],

  breadcrumb: 
  `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History" style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;" onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Facing History</a> |
  <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII" style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;" onmouseover="this.style.color='olive'" onmouseout="this.style.color='inherit'">WWII</a> | Portraits`,

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
