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
 * Grid images pulled from grouped western print surfaces: cowboy portraits,
 * Wild West narrative work, and Native American portraiture.
 */

// ─── Gallery imports ─────────────────────────────────────────────────────────
import { galleryData as colorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as bwGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as narrativeColorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as narrativeBWGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';
import { galleryData as naGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';

// ─── Gallery paths ───────────────────────────────────────────────────────────
const colorPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color";
const bwPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White";
const narrativeColorPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color";
const narrativeBWPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White";
const naPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color";

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
// Balance the print grid across cowboy portraits, narrative western art, and Native American portraiture.
const OFFSET = 9;
const colorGrid = topRated(colorGallery, 16, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${colorPath}/${img.id}`,
}));
const bwGrid = topRated(bwGallery, 12, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${bwPath}/${img.id}`,
}));
const narrativeColorGrid = topRated(narrativeColorGallery, 16, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${narrativeColorPath}/${img.id}`,
}));
const narrativeBWGrid = topRated(narrativeBWGallery, 8, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${narrativeBWPath}/${img.id}`,
}));
const naGrid = topRated(naGallery, 8, OFFSET).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${naPath}/${img.id}`,
}));

export const gridImages = [
  ...colorGrid,
  ...bwGrid,
  ...narrativeColorGrid,
  ...narrativeBWGrid,
  ...naGrid,
];

// ─── Hero ────────────────────────────────────────────────────────────────────
export const hero = {
  heading: "Western Photography Prints",
  paragraphs: [
    "Western photography prints from K4 Studios are built for collectors who want more than rustic decor language or generic Western wall art. These are authored cowboy portraits, frontier narratives, and historically grounded Western images created through Wayne Heim's <a href='/Other/One-Image-Movie' class='cl-hero__link'>One-Image Movie\u2122</a> approach to fine art photography. That story-driven branch also connects to the site's broader <a href='/Narrative-Western-Art' class='cl-hero__link'>Narrative Western Art</a> classification, then resolves here as museum-grade prints meant to live on a wall for years.",
    "The collections below include black and white Western photography prints, color cowboy portraits, narrative western art prints, and Indigenous portrait work, available across archival paper, premium canvas, and proprietary Engrained\u2122 hardwood presentation. Browse by subject or compare collector tiers, sizes, and materials below.",
  ],
  ctaHref: "#prints-grid",
  ctaLabel: "Browse Limited Editions",
};

// ─── Editions Block ──────────────────────────────────────────────────────────
export const editions = {
  heading: "Western Photography Print Formats and Collector Editions",
  intro: "Western photography prints are available as open and limited editions across archival paper, canvas, and Engrained\u2122 hardwood formats.",
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
  heading: "Shop Western Photography Print Collections",
  links: [
    {
      title: "Color Western Photography Prints",
      href: colorPath,
      description: "Painterly cowboy and frontier character studies offered as collectible color Western photography prints.",
    },
    {
      title: "Black and White Western Photography Prints",
      href: bwPath,
      description: "Cinematic monochrome cowboy portraits and frontier scenes with tonal depth and museum-quality print presence.",
    },
    {
      title: "Narrative Western Art Prints",
      href: narrativeColorPath,
      description: "Story-driven Wild West scenes and One-Image Movie compositions translated into collectible narrative western art prints.",
    },
    {
      title: "Indigenous Western Portrait Prints",
      href: naPath,
      description: "Painterly portrait prints honoring Native American Western heritage through research, restraint, and narrative presence.",
    },
  ],
};

// ─── Purchase Confidence Block ───────────────────────────────────────────────
export const confidence = {
  heading: "Why Collect These Western Photography Prints",
  points: [
    "Archival papers rated for 100+ year longevity",
    "Large format options up to 60\u2033 and beyond",
    "Hand-signed editions (Legend tier and above)",
    "Certificate of authenticity with every limited edition",
    "Proprietary Engrained\u2122 wood panel process",
    "Custom sizing, framing guidance, and corporate installation available",
  ],
};

// ─── Page Meta ───────────────────────────────────────────────────────────────
export const pageMeta = {
  title: "Western Photography Prints | Limited Edition Cowboy & Frontier Prints – K4 Studios",
  description:
    "Western photography prints by Wayne Heim featuring cowboy portraits, black and white frontier imagery, narrative western art prints, and historically grounded fine art prints in archival paper, canvas, and Engrained\u2122 wood formats.",
  ogImage: "i-ncFcHDM",
};

// ─── Breadcrumb ──────────────────────────────────────────────────────────────
export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Photography Prints</span>';
