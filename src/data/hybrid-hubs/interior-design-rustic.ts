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
  heading: 'Rustic Western Interior Design Art with Material Presence',
  subtitle: 'Painterly Western fine art with material presence for lodge, ranch, and wood-led interiors',
  body: [
    'Painterly Western fine art created for interiors where material, texture, and human presence carry the room.',
    'Rustic western interior design is grounded in material truth-wood, stone, leather, iron-and surfaces that feel lived-in rather than applied.',
    'This work is selected for tactile authority. Grain, weathering, and human presence give the room visual weight, allowing the artwork to feel embedded in the space rather than layered on top.',
    'Each image carries narrative structure beneath that surface. These are not decorative western prints, but constructed moments-what can be described as one-image films-that hold attention and invite interpretation over time.',
    'The result is statement western artwork that brings warmth, texture, and emotional presence into lodge-scale, ranch, and hospitality interiors.',
  ],
};

export const definition = {
  heading: 'Designed for Rustic Western Spaces',
  paragraphs: [
    'This page targets rustic western interior design as a functional application, where material presence, warmth, and visual weight are central to the space.',
    'The work itself is built to support that environment. Rather than relying on subject alone, each image is constructed with a painterly approach-layering light, atmosphere, and composition to create imagery that feels grounded, lived-in, and structurally present.',
    'This allows the work to carry more than visual interest. It becomes part of the room\'s material language, reinforcing tone, texture, and continuity across the space.',
    'The Engrained series is one material-forward expression of this approach, introducing depth through Baltic birch wood prints, while the broader collection allows flexibility across rustic, transitional, and hybrid interiors.',
    'Use this route when a room needs warmth, tactile presence, and grounded narrative weight.',
    'This direction is best suited for interiors where texture, material continuity, and human presence are part of the design language-spaces that benefit from visual weight rather than negative space.',
    'For a cleaner, more restrained direction, see <a href="/Modern-Western-Interior-Design-Art">Modern Western Interior Design Art</a>.',
    'For placement, scale, and sourcing across projects, use <a href="/Western-Wall-Art-for-Interior-Designers">Western Wall Art for Interior Designers</a>.',
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
    q: 'Why does material matter more in rustic interiors?',
    a: [
      'Rustic interiors rely on material continuity-wood, stone, and tactile surfaces that carry visual weight across the space.',
      'Artwork that aligns with that language feels embedded rather than applied. Material-forward options like Engrained support this directly, but the underlying painterly construction ensures the imagery itself carries the same sense of depth and presence.'
    ],
  },
  {
    q: 'Can I specify by room scale and wall dimensions?',
    a: [
      'Yes. Prints are available in multiple formats and sizes, including larger statement options. Room-based sizing and placement guidance is available for designers and collectors building around a specific wall or furniture plan.'
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
      'Start with this mixed painterly grid to map mood and subject direction, then continue to the linked galleries by category. This makes it easier to maintain visual consistency while varying subject matter across rooms.'
    ],
  },
  {
    q: 'Can rustic western wall art still work in refined lodge and modern-rustic interiors?',
    a: [
      'Yes. Rustic western wall art works best in refined spaces when selection is weighted by material tone and visual density: stronger statement western artwork in anchor zones, quieter pieces in transition areas, and consistent framing language across rooms.',
      'This approach keeps rustic western interior design grounded without feeling heavy, and it is especially effective for western lodge wall art programs where warmth, texture, and collector-level finish all need to coexist.'
    ],
  },
];

const catalogNarrativeColor = pickTopCatalog(narrativeColor, 9, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativePath));
const catalogNarrativeBlackWhite = pickTopCatalog(narrativeBlackWhite, 6, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativeBlackWhitePath));
const slowBreathImage = pickTopCatalog(narrativeColor, 80, Array.from(carouselIds)).find(
  (img: any) => String(img?.title || '').trim().toLowerCase() === 'the slow breath of evening'
);
const slowBreathCard = slowBreathImage ? toCatalogCard(slowBreathImage, narrativePath) : null;
const catalogCowboyColorBase = pickTopCatalog(cowboyColor, 10, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyPath));
const catalogCowboyColor = replaceTitleInCards(catalogCowboyColorBase, 'Weathered', slowBreathCard);
const catalogCowboyBlackWhite = pickTopCatalog(cowboyBlackWhite, 7, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyBlackWhitePath));
const catalogNative = pickTopCatalog(nativeColor, 7, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, nativePath));
const catalogWestLandscapes = pickTopCatalog(landscapeWest, 4, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, landscapeWestPath));
const catalogMountainLandscapes = pickTopCatalog(landscapeMountains, 3, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, mountainsPath));

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
  'cowboyColor',
  'nativeColor',
  'narrativeColor',
  'cowboyBlackWhite',
  'landscapeWest',
  'narrativeColor',
  'cowboyColor',
  'nativeColor',
  'landscapeMountains',
  'narrativeBlackWhite',
  'cowboyColor',
  'cowboyBlackWhite',
  'nativeColor',
  'narrativeColor',
  'landscapeWest',
  'cowboyColor',
  'narrativeBlackWhite',
  'landscapeMountains',
];

export const catalogImages = buildMixedCatalog(catalogPools, catalogSlotPattern, 30);

export const collectorClose = {
  heading: 'Built for Warm, Material-Driven Interiors',
  paragraphs: [
    'This route is tuned for spaces where texture carries emotional value. Portrait-led narratives, weathered surfaces, and wood-forward presentation create a room language that feels rooted rather than styled.',
    'For designers and collectors working across cabins, lodges, ranch homes, or hospitality projects, these works provide tactile focal points that still maintain collector-grade authorship.',
  ],
  ctaHref: '/Western-Interior-Design-Art',
  ctaLabel: 'Return to the Western Interior Design Art Hub',
};

export const pageMeta = {
  title: 'Rustic Western Interior Design Art for Warm, Textural Spaces',
  description:
    'Rustic western interior design artwork featuring Engrained wood prints, cowboy narrative portraits, and tactile statement western artwork for lodge, ranch, and warm-material interiors.',
  ogImage: carouselSlides[0]?.id || 'i-Lk9XZKB',
};

export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Rustic Western Interior Design Art</span>';
