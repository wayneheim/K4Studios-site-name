import { galleryData as engrainedGallery } from '../Other/K4-Select-Series/Engrained/Engrained-Series.mjs';
import { galleryData as cowboyColor } from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBlackWhite } from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as narrativeColor } from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as narrativeBlackWhite } from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';
import { galleryData as nativeColor } from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';
import { galleryData as landscapeWest } from '../Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs';
import { galleryData as landscapeMountains } from '../Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs';

export const galleryBasePath = '/Other/K4-Select-Series/Engrained/Engrained-Series';

const cowboyPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const cowboyBlackWhitePath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White';
const narrativePath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const narrativeBlackWhitePath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White';
const nativePath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color';
const landscapeWestPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery';
const mountainsPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains';

const interiorSignals = [
  'interior',
  'inside',
  'indoors',
  'room',
  'cabin',
  'window',
  'lamplight',
  'saloon',
  'frontier interior',
  'western interior design',
  'rustic interiors',
];

function isVisible(img: any) {
  return img && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost' && img.visibility !== 'hidden';
}

function rankByEditorialOrder(a: any, b: any) {
  const ratingA = typeof a?.rating === 'number' ? a.rating : 0;
  const ratingB = typeof b?.rating === 'number' ? b.rating : 0;
  if (ratingA !== ratingB) return ratingB - ratingA;

  const orderA = typeof a?.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b?.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
  return orderA - orderB;
}

function ensureAlt(img: any) {
  const base = String(img?.alt || img?.title || '').trim();
  return base || 'Western interior design art by Wayne Heim';
}

function textBlob(img: any) {
  const keywords = Array.isArray(img?.keywords) ? img.keywords.join(' ') : '';
  return `${img?.title || ''} ${img?.alt || ''} ${img?.description || ''} ${img?.story || ''} ${img?.notes || ''} ${keywords}`.toLowerCase();
}

function hasInteriorSignal(img: any) {
  const text = textBlob(img);
  return interiorSignals.some((signal) => text.includes(signal));
}

function toCarouselStory(img: any) {
  const raw = String(img?.story || img?.description || '').replace(/\s+/g, ' ').trim();
  if (!raw) {
    return 'Western fine art photography presented as Engrained wood prints for interior-focused spaces.';
  }
  return raw.length > 220 ? `${raw.slice(0, 217).trim()}...` : raw;
}

function pickTop(data: any[], count: number, skipIds: string[] = []) {
  const skip = new Set(skipIds);
  return (data || [])
    .filter((img: any) => isVisible(img) && !skip.has(img.id))
    .sort(rankByEditorialOrder)
    .slice(0, count);
}

function isBlockedGridTitle(img: any) {
  const title = String(img?.title || '').trim().toLowerCase();
  return title === 'for better or worse';
}

function pickTopCatalog(data: any[], count: number, skipIds: string[] = []) {
  const skip = new Set(skipIds);
  return (data || [])
    .filter((img: any) => isVisible(img) && !skip.has(img.id) && !isBlockedGridTitle(img))
    .sort(rankByEditorialOrder)
    .slice(0, count);
}

function toCatalogCard(img: any, hrefBase: string) {
  return {
    id: img.id,
    title: img.title,
    alt: ensureAlt(img),
    href: `${hrefBase}/${img.id}`,
  };
}

function replaceTitleInCards(cards: any[], titleToReplace: string, replacementCard: any | null) {
  if (!replacementCard) return cards;
  const target = titleToReplace.trim().toLowerCase();
  return cards.map((card: any) => {
    const title = String(card?.title || '').trim().toLowerCase();
    return title === target ? replacementCard : card;
  });
}

function takeNextUnique(pool: any[], usedIds: Set<string>) {
  while (pool.length) {
    const candidate = pool.shift();
    if (!candidate?.id || usedIds.has(candidate.id)) continue;
    usedIds.add(candidate.id);
    return candidate;
  }
  return null;
}

function buildMixedCatalog(
  pools: Record<string, any[]>,
  slotPattern: string[],
  maxCount: number
) {
  const usedIds = new Set<string>();
  const mixed: any[] = [];

  for (let i = 0; mixed.length < maxCount && i < maxCount * 8; i += 1) {
    const slot = slotPattern[i % slotPattern.length];
    const pool = pools[slot] || [];
    const next = takeNextUnique(pool, usedIds);
    if (next) mixed.push(next);
  }

  if (mixed.length < maxCount) {
    const fallbackOrder = Object.values(pools).flat();
    for (const card of fallbackOrder) {
      if (mixed.length >= maxCount) break;
      if (!card?.id || usedIds.has(card.id)) continue;
      usedIds.add(card.id);
      mixed.push(card);
    }
  }

  return mixed;
}

const engrainedVisible = (engrainedGallery || []).filter((img: any) => isVisible(img));
const interiorEngrained = engrainedVisible.filter((img: any) => hasInteriorSignal(img)).sort(rankByEditorialOrder);
const engrainedFallback = engrainedVisible.sort(rankByEditorialOrder);

const interiorCarouselPool = [
  ...interiorEngrained,
  ...engrainedFallback.filter((img: any) => !interiorEngrained.some((existing: any) => existing.id === img.id)),
];

const carouselSource = interiorCarouselPool.slice(0, 8);

export const carouselSlides = carouselSource.map((img: any) => ({
  id: img.id,
  title: img.title,
  alt: ensureAlt(img),
  story: toCarouselStory(img),
  href: `${galleryBasePath}/${img.id}`,
}));

const carouselIds = new Set(carouselSlides.map((slide: any) => slide.id));

export const thesis = {
  heading: 'Western Wall Art for Interior Designers and Spec Teams',
  subtitle: 'Specification-driven painterly Western artwork for residential, hospitality, and lodge projects',
  body: [
    'Specifier-ready western wall art for interior designers, residential project teams, lodge properties, and boutique hospitality interiors.',
    'Design projects rarely fail on taste-they fail on placement, scale, sequence, and the handoff between concept board and approved artwork package.',
    'This page is built for interior teams sourcing western wall art for interior designers: artwork selected for entry statements, focal walls, transition zones, guest suites, corridors, and supporting moments across multi-room plans.',
    'Each piece is constructed to carry visual weight without overpowering the space-allowing designers to control tone, pacing, and narrative presence across a project.',
    'Use this as a working layer between concept direction and final install-where selections move from mood board to specification with clearer sizing, material, and placement decisions.',
  ],
};

export const definition = {
  heading: 'Specifier Framework: Placement, Scale, and Narrative Role',
  paragraphs: [
    'The priority here is use-case clarity: entry statement, focal wall, transition piece, hospitality suite, corridor rhythm, or supporting layer.',
    'Each image is chosen as statement western artwork for living room, lodge, ranch, boutique hotel, and hospitality interiors where visual hierarchy matters.',
    'Rather than relying on subject alone, the work is built through a painterly approach-layering light, atmosphere, and composition to create imagery that holds attention and integrates into the structure of a space.',
    'This allows selections to move cleanly from mood board to install plan, with artwork choices tied to scale, room role, material finish, and viewing distance.',
    'Need broader philosophy? Return to the <a href="/Western-Interior-Design-Art">Western Interior Design Art hub</a>.',
    'Need aesthetic direction? Compare <a href="/Modern-Western-Interior-Design-Art">Modern</a> and <a href="/Rustic-Western-Interior-Design-Art">Rustic</a> interior pathways.',
    'Ready to build a project? Use this page to define placement, scale, and sequencing across the space, then review <a href="/Other/Print-Options">print options</a> or <a href="/Contact">contact K4 Studios</a> for project-specific guidance.',
    'For full narrative context behind the work, explore the <a href="/Facing-History/Wild-West">Wild West collection</a>.',
  ],
  essayHref: '/Western-Wall-Art',
  essayLabel: 'See the full Western Wall Art hub ->',
};

export const faqItems = [
  {
    q: 'What type of interior projects fit this work best?',
    a: [
      'These pieces are most effective in projects where art needs to lead the room: residential living spaces, mountain homes, ranch properties, boutique hospitality, executive interiors, and heritage-inspired renovations.'
    ],
  },
  {
    q: 'Why feature Engrained images for interior design?',
    a: [
      'Engrained wood prints introduce material texture directly into the visual read of the artwork. The birch grain interacts with tone and color, which helps the work feel integrated with wood, stone, leather, and natural-fiber interior palettes.'
    ],
  },
  {
    q: 'Can I specify by room scale and wall dimensions?',
    a: [
      'Yes. Prints are available in multiple formats and sizes, including larger statement options. Room-based sizing and placement guidance is available for designers and collectors building around a specific wall, furniture plan, suite package, or hospitality zone.'
    ],
  },
  {
    q: 'Are these open-edition decor prints?',
    a: [
      'No. Works are produced as controlled collector editions with archival standards, including signed and numbered output where applicable. The emphasis is authored fine art, not mass-market decor inventory.'
    ],
  },
  {
    q: 'How should I start sourcing for a multi-room project?',
    a: [
      'Start with this mixed painterly grid to map mood and subject direction, then continue to the linked galleries by category. This makes it easier to maintain visual consistency while varying subject matter across rooms.',
      'For design teams, the practical next step is to identify anchor walls first, then fill transition zones and secondary rooms with quieter works that support the same visual language.'
    ],
  },
  {
    q: 'Can K4 Studios help with designer or hospitality art packages?',
    a: [
      'Yes. For interior designers, lodge properties, boutique hospitality spaces, and multi-room residential projects, selections can be discussed around wall size, viewing distance, material finish, subject mix, and project rhythm. Start with the grid on this page, then use the contact page for project-specific sourcing.'
    ],
  },
  {
    q: 'Where can I view the full collection?',
    a: [
      'The full body of work lives within the <a href="/Facing-History/Wild-West">Wild West collection</a> in the Facing History section. This page focuses on placement and project use, while the Wild West collection presents the broader narrative context behind the images.'
    ],
  },
];

const catalogNarrativeColor = pickTopCatalog(narrativeColor, 10, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativePath));
const catalogNarrativeBlackWhite = pickTopCatalog(narrativeBlackWhite, 6, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativeBlackWhitePath));
const slowBreathImage = pickTopCatalog(narrativeColor, 80, Array.from(carouselIds)).find(
  (img: any) => String(img?.title || '').trim().toLowerCase() === 'the slow breath of evening'
);
const slowBreathCard = slowBreathImage ? toCatalogCard(slowBreathImage, narrativePath) : null;
const catalogCowboyColorBase = pickTopCatalog(cowboyColor, 7, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyPath));
const catalogCowboyColor = replaceTitleInCards(catalogCowboyColorBase, 'Weathered', slowBreathCard);
const catalogCowboyBlackWhite = pickTopCatalog(cowboyBlackWhite, 4, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyBlackWhitePath));
const catalogNative = pickTopCatalog(nativeColor, 5, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, nativePath));
const catalogWestLandscapes = pickTopCatalog(landscapeWest, 6, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, landscapeWestPath));
const catalogMountainLandscapes = pickTopCatalog(landscapeMountains, 5, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, mountainsPath));

const catalogPools = {
  narrativeColor: [...catalogNarrativeColor],
  narrativeBlackWhite: [...catalogNarrativeBlackWhite],
  cowboyColor: [...catalogCowboyColor],
  cowboyBlackWhite: [...catalogCowboyBlackWhite],
  nativeColor: [...catalogNative],
  landscapeWest: [...catalogWestLandscapes],
  landscapeMountains: [...catalogMountainLandscapes],
};

const catalogSlotPattern = [
  'narrativeColor',
  'landscapeWest',
  'cowboyColor',
  'narrativeBlackWhite',
  'landscapeMountains',
  'nativeColor',
  'narrativeColor',
  'cowboyBlackWhite',
  'landscapeWest',
  'narrativeColor',
  'nativeColor',
  'landscapeMountains',
  'narrativeBlackWhite',
  'cowboyColor',
  'landscapeWest',
  'narrativeColor',
  'cowboyBlackWhite',
  'landscapeMountains',
];

export const catalogImages = buildMixedCatalog(catalogPools, catalogSlotPattern, 30);

export const collectorClose = {
  heading: 'Specification Confidence for Multi-Room Projects',
  paragraphs: [
    'Every piece shown here is tied to a direct gallery path with edition options, making it easier to move from concept board to approved specification. The set supports focal moments and supporting placements without breaking narrative cohesion.',
    'For interior teams managing residential, lodge, or hospitality installs, this page is designed to reduce sourcing friction while preserving authored, collector-grade quality.',
  ],
  ctaHref: '/Western-Interior-Design-Art',
  ctaLabel: 'Return to the Western Interior Design Art Hub',
};

export const pageMeta = {
  title: 'Western Wall Art for Interior Designers | Placement-Ready Statement Artwork',
  description:
    'Western wall art for interior designers by Wayne Heim, curated as placement-ready statement western artwork for residential, lodge, and hospitality projects.',
  ogImage: carouselSlides[0]?.id || 'i-Lk9XZKB',
};

export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Wall Art for Interior Designers</span>';
