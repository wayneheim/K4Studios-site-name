/**
 * Hub data for the Western Fine Art Photography Collection hybrid page.
 *
 * This file centralizes all content for the first Hybrid Authority–Commerce Hub page.
 * Carousel picks, thesis copy, definition text, FAQ items, catalog grid, and collector close.
 *
 * Catalog images are pulled programmatically: top 8 rated-5 from each gallery.
 */

// ─── Gallery imports ─────────────────────────────────────────────────────────
import { galleryData as colorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as bwGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as naGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';

// ─── Gallery paths ───────────────────────────────────────────────────────────
export const galleryBasePath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color";

const bwGalleryPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White";
const naGalleryPath =
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color";

// ─── Image selection helper ──────────────────────────────────────────────────
function topRated(data: any[], count: number, skip: string[] = []) {
  return data
    .filter((i: any) =>
      i.visibility !== 'ghost' &&
      i.id !== 'i-k4studios' &&
      i.rating >= 4 &&
      !skip.includes(i.id)
    )
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .slice(0, count);
}

function ensureAlt(img: any) {
  const base = (img?.alt || img?.title || '').trim();
  if (!base) return 'Painterly Western fine art photography by Wayne Heim';
  // If alt is missing, avoid a weak title-only fallback.
  if (!img?.alt) return `${base} — painterly Western fine art photography by Wayne Heim`;
  return base;
}

// ─── Carousel: first 6 from Color.mjs (sortOrder 0-5) ───────────────────────
const carouselRaw = topRated(colorGallery, 6);
export const carouselSlides = carouselRaw.map((img: any) => ({
  id: img.id,
  title: img.title,
  alt: ensureAlt(img),
  story: img.story || '',
}));
const carouselIds = carouselSlides.map((s) => s.id);

// ─── Thesis: H1 + body ──────────────────────────────────────────────────────
export const thesis = {
  heading: "Cowboy & Frontier Fine Art Prints for Collectors",
  subtitle: "Story-driven painterly prints by Wayne Heim",
  body: [
    "These are not illustrations of the West — they are interpretations of it. Each piece begins with a camera but ends with a process closer to painting: layered textures, sculpted light, and a narrative that lives inside the frame long after the shutter closes.",
    "What distinguishes this body of work is its refusal to settle for the scenic. The American cowboy is not decoration here — he is protagonist, philosopher, laborer. The compositions draw on the visual language of Remington and Wyeth while occupying a distinctly photographic space: real light, real dust, real hands on real leather.",
    "The collection spans quiet character studies, cinematic action narratives, and moments of solitary reflection — each functioning as a One-Image Movie\u2122: a single frame built to carry the emotional weight of a larger, unfinished story. They are united by a painterly sensibility and an insistence that Western art can be both emotionally honest and museum-caliber.",
  ],
};

// ─── Definition: "What Is …?" block ─────────────────────────────────────────
export const definition = {
  heading: "Collector Lens: What Distinguishes This Work",
  paragraphs: [
    "This page is the collector-focused companion to the primary <a href=\"/Western-Fine-Art-Photography\">Western Fine Art Photography</a> hub. It represents a commercial subset of that broader Western fine art photography body of work rather than a separate definition or category owner. Rather than defining the entire field, it narrows the view to the kinds of cowboy and frontier images collectors tend to seek when they want painterly, authored Western work rather than generic decor.",
    "What distinguishes these pieces is not subject matter alone, but the way subject is handled. Composition is deliberate. Light is sculpted. Atmosphere carries implication. The work draws on the longer tradition of Western art while remaining unmistakably photographic.",
    "At K4 Studios, the process is <em>painterly</em>: tonal sculpting, selective texture, and disciplined color are used to create prints that reward long viewing. If you want the strict definition of the discipline, use the deep-dive essay. If you want to evaluate the work through a collector lens, this page is built for that purpose.",
    "From here, continue into the <a href=\"/Cowboy-Fine-Art-Photography\">Cowboy Fine Art Photography collection</a>, the broader <a href=\"/Western-Cowboy-Photography\">Western Cowboy Photography</a> body of work, or return to the main <a href=\"/Western-Fine-Art-Photography\">Western Fine Art Photography</a> hub.",
  ],
  essayHref: "/Blog/what-is-western-fine-art-photography",
  essayLabel: "Read the full definition →",
};

// ─── FAQ: 5 collector-focused questions ({q, a} format — site standard) ──────
export const faqItems = [
  {
    q: "What makes painterly Western photography different from traditional photography?",
    a: [
      "Painterly Western photography is authored rather than merely captured. While traditional photography often prioritizes documentation, painterly work prioritizes interpretation. Composition, tonal sculpting, selective texture overlays, and color grading are deliberately shaped to evoke the visual traditions of Western painting while remaining rooted in photographic truth. The result occupies a space between painting and photography — narrative-driven, emotionally layered, and intentionally crafted for exhibition and collection."
    ],
  },
  {
    q: "Are these limited edition prints?",
    a: [
      "Yes. Each work is produced in carefully controlled editions. Whether on archival paper or Wayne Heim's proprietary Engrained wood panels, prints are numbered, signed, and inspected for tonal fidelity. The limited structure ensures collectability and preserves long-term value, distinguishing these works from open-edition décor reproductions."
    ],
  },
  {
    q: "What is an Engrained wood print?",
    a: [
      "Engrained prints are produced directly onto hand-finished wood panels using a layered UV process that integrates image and grain. Rather than masking the material, the wood becomes part of the visual language. The result is a tactile, dimensional surface that echoes traditional Western illustration while remaining unmistakably photographic."
    ],
  },
  {
    q: "What sizes are available?",
    a: [
      "Works are available in multiple formats, including museum-grade archival paper, premium canvas, and Engrained wood panels. Select pieces are offered in larger \"Legends\" editions for collectors seeking statement-scale presentation. Custom sizing and installation consultations are available by request."
    ],
  },
  {
    q: "Is this staged photography or documentary work?",
    a: [
      "The scenes are directed and composed with the intention of narrative authorship. While rooted in historical research and authentic costuming, the goal is not reportage but interpretation. Each image is constructed to function as a self-contained story — a \"one-image film\" — rather than a simple record of an event."
    ],
  },
];

// ─── Catalog Grid: 8 per gallery × 3 galleries = 24 images ──────────────────
const colorCatalog = topRated(colorGallery, 8, carouselIds).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${galleryBasePath}/${img.id}`,
}));

const bwCatalog = topRated(bwGallery, 8).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${bwGalleryPath}/${img.id}`,
}));

const naCatalog = topRated(naGallery, 8).map((img: any) => ({
  id: img.id, title: img.title, alt: ensureAlt(img),
  href: `${naGalleryPath}/${img.id}`,
}));

export const catalogImages = [...colorCatalog, ...bwCatalog, ...naCatalog];

// ─── Collector Close ─────────────────────────────────────────────────────────
export const collectorClose = {
  heading: "Collected by Those Who Demand the Exceptional",
  paragraphs: [
    "Every piece in this collection is produced as a limited-edition archival print — on museum-grade paper, premium canvas, or Wayne's proprietary Engrained wood panels. Each print is hand-inspected for tonal accuracy and archival integrity before it ships.",
    "These works are not mass-produced décor. They are authored, numbered, and intended to hold their value — on your wall and in the market. Commissions, custom sizing, and corporate installations are available by direct inquiry.",
  ],
  ctaHref: galleryBasePath,
  ctaLabel: "Explore the Full Collection",
};

// ─── Page Meta ───────────────────────────────────────────────────────────────
export const pageMeta = {
  title: "Cowboy & Frontier Fine Art Prints for Collectors | K4 Studios",
  description:
    "Collector-focused selection of cowboy and frontier fine art prints by Wayne Heim. Painterly limited-edition works on archival paper, canvas, and Engrained wood panels, built for exhibition and long-term collecting.",
  ogImage: "i-ncFcHDM",
};

// ─── Breadcrumb ──────────────────────────────────────────────────────────────
export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Cowboy & Frontier Fine Art Prints</span>';
