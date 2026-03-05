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
  heading: "Cowboy & Western Fine Art Photography for Collectors",
  subtitle: "Story-driven painterly prints by Wayne Heim",
  body: [
    "These are not illustrations of the West — they are interpretations of it. Each piece begins with a camera but ends with a process closer to painting: layered textures, sculpted light, and a narrative that lives inside the frame long after the shutter closes.",
    "What distinguishes this body of work is its refusal to settle for the scenic. The American cowboy is not decoration here — he is protagonist, philosopher, laborer. The compositions draw on the visual language of Remington and Wyeth while occupying a distinctly photographic space: real light, real dust, real hands on real leather.",
    "The collection spans quiet character studies, cinematic action narratives, and moments of solitary reflection — each functioning as a One-Image Movie\u2122: a single frame built to carry the emotional weight of a larger, unfinished story. They are united by a painterly sensibility and an insistence that Western art can be both emotionally honest and museum-caliber.",
  ],
};

// ─── Definition: "What Is …?" block ─────────────────────────────────────────
export const definition = {
  heading: "What Is Western Fine Art Photography?",
  paragraphs: [
    "Western fine art photography is the deliberate, authored interpretation of American Western subjects — cowboys, frontier landscapes, rodeo, ranch life — through a photographic process that prioritizes artistic vision over documentary record. Unlike commercial stock, tourism imagery, or editorial coverage, the fine art practitioner controls composition, palette, and post-process to produce work intended for exhibition, collection, and long-term cultural value.",
    "Here, 'Western art' refers to the American West — frontier life, cowboys, and 19th-century Western history — not European or Western civilization art traditions.",
    "It’s useful to name what it is <em>not</em>: Western fine art photography is not simply ‘a photo of a cowboy’ or a scenic postcard with a Western label. It is closer to the tradition of Western art—work that carries lineage from artists like Frederic Remington and Charles M. Russell—because it is built to communicate mood, myth, labor, and place. When done well, the frame behaves like a short story: subject, setting, and tension are composed with intent. That’s why many collectors searching for <strong>fine art Western photography</strong> are really searching for authorship, not documentation.",
    "At K4 Studios, the process is <em>painterly</em>: each image undergoes tonal sculpting, selective texture overlays, and color grading that reference the traditions of Western illustration while remaining rooted in photographic truth. The goal is not artificiality; it’s interpretation—shaping light and texture until the image reads with the weight of a painting while remaining unmistakably photographic.",
    "If you’re exploring this genre through the collector lens, start with the <a href=\"/Cowboy-Fine-Art-Photography\">Cowboy Fine Art Photography collection</a> and the broader <a href=\"/Western-Cowboy-Photography\">Western Cowboy Photography</a> body of work. These pages show how a consistent visual language—craft, narrative, and printmaking intent—creates <strong>Western fine art photography</strong> that’s meant to live on walls and hold meaning over time.",
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
  title: "Western Fine Art Photography Collection | K4 Studios",
  description:
    "Curated collection of cowboy and Western fine art photography by Wayne Heim. Painterly limited-edition prints for collectors — archival paper, canvas, and Engrained wood panels. Explore fine art Western photography built for exhibition and collecting.",
  ogImage: "i-ncFcHDM",
};

// ─── Breadcrumb ──────────────────────────────────────────────────────────────
export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Fine Art Photography Collection</span>';
