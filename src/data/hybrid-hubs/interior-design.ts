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
  return img && img.id && img.id !== 'i-k4studios' && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(img.visibility ?? 'show').trim().toLowerCase()) && img.visibility !== 'hidden';
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
  heading: 'Western Interior Design Art for Intentional Rooms',
  subtitle: 'Painterly Western fine art photography created for interior spaces, available as museum-quality prints and wood editions',
  body: [
    'Western interior design often leans on texture, palette, and material—but rarely on authorship or narrative presence.',
    'This work is built for interiors that need more than visual cohesion. It introduces narrative weight, authored perspective, and a sense of lived presence into the room—art that holds attention over time rather than disappearing into the environment.',
    'Each image is constructed, not simply captured. What can best be described as one-image films, these pieces suggest a moment before and after the frame, allowing the viewer to participate in the story rather than simply observe it.',
    'This is not western décor. It is statement western artwork for interior design—built to anchor a space, define a wall, and integrate into modern, rustic, and transitional interiors.',
  ],
};

export const definition = {
  heading: 'Designed for Western Interior Projects',
  paragraphs: [
    'This page targets western interior design not as a style category, but as a functional application. The focus is on artwork that performs inside real spaces—residential, hospitality, and commercial—where scale, tone, and narrative presence matter.',
    'The work itself is built differently. Rather than documenting a moment, each image is constructed with a painterly approach—layering light, composition, and atmosphere to create something closer to memory than record. The result is imagery that holds attention, invites interpretation, and reveals more over time.',
    'This is what allows the work to function as a conversation point within a room. It does not rely on scale or subject alone, but on the way the image holds attention and invites interpretation over time.<br><br>For those who have seen the expected versions of western art, these pieces offer something unfamiliar—images that feel lived-in, cinematic, and psychologically present rather than purely decorative.<br><br>This makes the work particularly suited for interiors that need a focal point with depth—spaces where the goal is not just cohesion, but presence.',
    'The Engrained series is one material-forward expression of this approach, introducing depth through Baltic birch wood prints, while the broader painterly collection allows flexibility across modern, rustic, and transitional interiors.',
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
];

const catalogNarrativeColor = pickTopCatalog(narrativeColor, 11, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativePath));
const catalogNarrativeBlackWhite = pickTopCatalog(narrativeBlackWhite, 6, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativeBlackWhitePath));
const slowBreathImage = pickTopCatalog(narrativeColor, 80, Array.from(carouselIds)).find(
  (img: any) => String(img?.title || '').trim().toLowerCase() === 'the slow breath of evening'
);
const slowBreathCard = slowBreathImage ? toCatalogCard(slowBreathImage, narrativePath) : null;
const catalogCowboyColorBase = pickTopCatalog(cowboyColor, 6, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyPath));
const catalogCowboyColor = replaceTitleInCards(catalogCowboyColorBase, 'Weathered', slowBreathCard);
const catalogCowboyBlackWhite = pickTopCatalog(cowboyBlackWhite, 5, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyBlackWhitePath));
const catalogNative = pickTopCatalog(nativeColor, 5, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, nativePath));
const catalogWestLandscapes = pickTopCatalog(landscapeWest, 7, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, landscapeWestPath));
const catalogMountainLandscapes = pickTopCatalog(landscapeMountains, 6, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, mountainsPath));

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
  'cowboyColor',
  'landscapeWest',
  'narrativeBlackWhite',
  'nativeColor',
  'landscapeMountains',
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
  heading: 'Specify with Confidence',
  paragraphs: [
    'Every piece shown here is tied to a real gallery path so you can review additional angles, related works, and edition options before final selection. The collection supports both single statement placements and multi-room rollouts.',
    'If you are sourcing for a design project, these works can be selected by mood, subject, and material format to keep visual cohesion without repeating the same image language in every space.',
  ],
  ctaHref: '/Western-Wall-Art',
  ctaLabel: 'Explore the Western Wall Art Collection',
};

export const pageMeta = {
  title: 'Western Interior Design Art | Statement Western Artwork',
  description:
    'Western interior design art and western interior design artwork by Wayne Heim, curated as statement western artwork and fine art for western interiors.',
  ogImage: carouselSlides[0]?.id || 'i-Lk9XZKB',
};

export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Interior Design Art</span>';
