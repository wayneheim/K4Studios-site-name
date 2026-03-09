/**
 * Data for the Western Photography Prints commercial landing page.
 *
 * Commercial-intent page targeting:
 *   "western photography prints", "western fine art photography prints",
 *   "limited edition western photography", "cowboy photography prints"
 *
 * This page does NOT compete for "western fine art photography" (pillar owns that).
 * It converts: editions, materials, buy-readiness.
 *
 * Grid images pulled from the 3 Western Cowboy Portraits galleries only.
 */

// ─── Gallery imports ─────────────────────────────────────────────────────────
import { galleryData as colorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as bwGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as naGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';

// ─── Gallery paths ───────────────────────────────────────────────────────────
const colorPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color";
const bwPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White";
const naPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color";

export const galleryBasePath = colorPath;

// ─── Image selection ─────────────────────────────────────────────────────────
function topRated(data: any[], count: number, skip = 0) {
  return data
    .filter((i: any) =>
      i.visibility !== 'ghost' &&
      i.id !== 'i-k4studios' &&
      i.rating >= 4
    )
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .slice(skip, skip + count);
}

function ensureAlt(img: any) {
  const base = (img?.alt || img?.title || '').trim();
  if (!base) return 'Western photography print by Wayne Heim \u2014 limited edition fine art';
  if (!img?.alt) return `${base} \u2014 limited edition Western fine art print`;
  return base;
}

// Skip first 9 per gallery so we don't duplicate the pillar page's picks.
// 30 color + 18 B&W + 12 NA = 60 total grid images (15 rows × 4 cols).
const OFFSET = 9;
const colorGrid = topRated(colorGallery, 30, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${colorPath}/${img.id}`,
}));
const bwGrid = topRated(bwGallery, 18, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${bwPath}/${img.id}`,
}));
const naGrid = topRated(naGallery, 12, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${naPath}/${img.id}`,
}));

export const gridImages = [...colorGrid, ...bwGrid, ...naGrid];

// ─── Hero ────────────────────────────────────────────────────────────────────
export const hero = {
  heading: "Western Photography Prints (Limited Edition)",
  paragraphs: [
    "Limited edition Western photography prints from K4 Studios \u2014 cinematic cowboy portraits and frontier narratives created through Wayne Heim\u2019s <a href='/Other/One-Image-Movie' class='cl-hero__link'>One-Image Movie\u2122</a> approach to Western fine art photography. Each image is composed to carry the weight of a larger story, then produced as a museum-grade archival print built to last.",
    "Available in structured collector tiers ranging from open archival editions to ultra-limited signed canvases and proprietary Engrained\u2122 hardwood panels. Browse the collection below or contact the studio for custom sizing and corporate installations.",
  ],
  ctaHref: "#prints-grid",
  ctaLabel: "Browse Limited Editions",
};

// ─── Editions Block ──────────────────────────────────────────────────────────
export const editions = {
  heading: "The K4 Collector Edition Structure",
  intro: "Open Edition & Limited Edition Western Photography Prints by Wayne Heim",
  tiers: [
    {
      name: "Sketch",
      icon: "\u273D",
      description: "Accessible archival proof prints — ideal for new collectors and gift purchases.",
    },
    {
      name: "Foundation",
      icon: "\u272F",
      description: "Museum-grade archival prints in versatile sizes — the most flexible tier for framing and home display.",
    },
    {
      name: "Chronicle",
      icon: "\u2318",
      description: "Numbered limited edition of 250 — for collectors seeking scarcity without the premium canvas tier.",
    },
    {
      name: "Legend",
      icon: "\u2756",
      description: "Ultra-limited edition of 12, hand-signed — designed for serious Western art collectors.",
    },
    {
      name: "Engrained\u2122",
      icon: "\u25C8",
      description: "One-of-a-kind UV-printed hardwood presentation — where the wood grain becomes part of the image itself.",
    },
  ],
};

// ─── Sub-Category Links ──────────────────────────────────────────────────────
export const subCategories = {
  heading: "Explore Western Photography Collections",
  links: [
    {
      title: "Cowboy Portraits \u2014 Color",
      href: colorPath,
      description: "Painterly cowboy character studies in full color.",
    },
    {
      title: "Cowboy Portraits \u2014 Black & White",
      href: bwPath,
      description: "Cinematic monochrome cowboy portraits with tonal depth.",
    },
    {
      title: "Native American Portraits",
      href: naPath,
      description: "Painterly portraits honoring Native American Western heritage.",
    },
  ],
};

// ─── Purchase Confidence Block ───────────────────────────────────────────────
export const confidence = {
  heading: "Museum-Quality Presentation",
  points: [
    "Archival papers rated for 100+ year longevity",
    "Large format options up to 60\u2033 and beyond",
    "Hand-signed editions (Legend tier and above)",
    "Certificate of authenticity with every limited edition",
    "Proprietary Engrained\u2122 wood panel process",
    "Custom sizing and corporate installation available",
  ],
};

// ─── Page Meta ───────────────────────────────────────────────────────────────
export const pageMeta = {
  title: "Western Photography Prints | Limited Edition Fine Art",
  description:
    "Limited edition Western photography prints featuring cinematic cowboy portraits, historical themes, and painterly fine art imagery. Museum-quality prints available in multiple sizes.",
  ogImage: "i-ncFcHDM",
};

// ─── Breadcrumb ──────────────────────────────────────────────────────────────
export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Photography Prints</span>';
