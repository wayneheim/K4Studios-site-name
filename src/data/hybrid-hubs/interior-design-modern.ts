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
  heading: 'Modern Western Interior Design Art for Clean Statement Spaces',
  subtitle: 'Elevated painterly work with restraint, negative space, and tonal balance',
  body: [
    'Modern western interior design often leans on palette and material, but can lose authorship as it trends toward sameness.',
    'This western interior design artwork is curated for clean, contemporary spaces where negative space, tonal restraint, and compositional calm matter as much as subject.',
    'The mix favors atmospheric landscapes and edited narrative moments so statement western artwork feels intentional in modern interiors rather than themed or literal.',
    'This keeps the space quiet—but never empty.',
  ],
};

export const definition = {
  heading: 'Designed for Contemporary Western Interiors',
  paragraphs: [
    'This page targets <strong>modern western interior design</strong> and <strong>contemporary western interior design</strong> through an edited set of fine art for western interiors. The emphasis is restraint, visual breathing room, and tonal control.',
    'Landscapes and open compositions do more of the structural work here, while portrait and narrative pieces are used as controlled focal points to keep modern spaces emotionally alive without overpowering the room.',
    'For the broader category view, return to the <a href="/Western-Interior-Design-Art">Western Interior Design Art hub</a>.<br><br>If you need warmer material language, see <a href="/Rustic-Western-Interior-Design-Art">Rustic Western Interior Design Art</a>.<br><br>For project sourcing and placement strategy, use <a href="/Western-Wall-Art-for-Interior-Designers">Western Wall Art for Interior Designers</a>.<br><br>This direction is best suited for interiors where restraint, spacing, and tonal control matter more than overt theme or subject.',
  ],
  essayHref: '/Western-Wall-Art',
  essayLabel: 'See the full Western Wall Art hub ->',
};

export const faqItems = [
  {
    q: 'What type of interior projects fit this work best?',
    a: [
      'This work is designed for interiors where the goal is more than visual cohesion. It performs best in spaces that benefit from a focal point with depth-living rooms, studies, hospitality suites, and design-led commercial environments.',
      'Rather than filling space, the work anchors it. It introduces narrative presence, giving a room something to hold onto over time rather than something that blends into the background.'
    ],
  },
  {
    q: 'Why feature Engrained images for interior design?',
    a: [
      'The Engrained series introduces a material-forward option where the natural wood grain becomes part of the image itself. This allows the work to sit naturally within wood, stone, and neutral-heavy interiors without feeling applied.',
      'However, Engrained is one expression of the broader painterly approach. The same narrative-driven imagery is available across multiple formats depending on the needs of the space.'
    ],
  },
  {
    q: 'Can I specify by room scale and wall dimensions?',
    a: [
      'Yes. Works can be selected and scaled based on wall size, viewing distance, and the role each piece plays within the room.',
      'Larger works tend to function as anchors, while smaller or quieter pieces support the overall composition. The goal is not uniformity, but balance across the space.'
    ],
  },
  {
    q: 'Are these open-edition decor prints?',
    a: [
      'No. This is not western decor.',
      'While open editions are available, the work itself is constructed as fine art rather than decorative imagery. Each piece is designed to carry authorship, narrative weight, and long-term visual presence within a space.',
      'The difference is not just in the edition structure, but in how the image behaves once installed.'
    ],
  },
  {
    q: 'How should I start sourcing for a multi-room project?',
    a: [
      'Start by identifying where statement moments are needed versus where quieter supporting pieces should live.',
      'From there, use a mix of landscapes and narrative works to control pacing, tone, and visual rhythm across the space. For full project planning-including placement, scale, and sequencing-see the <a href="/Western-Wall-Art-for-Interior-Designers">Western Wall Art for Interior Designers</a> page.'
    ],
  },
  {
    q: 'When should I choose the modern path over the rustic path?',
    a: [
      'Choose the modern path when the space relies on restraint, negative space, and tonal control. In these environments, the work should support the architecture without overwhelming it.',
      'The rustic path is better suited for interiors where texture, warmth, and material presence are part of the design language.',
      'Both approaches use the same underlying body of work-the difference is how the images are selected and weighted within the space.'
    ],
  },
  {
    q: 'What makes modern western interior design art different from standard contemporary western wall art?',
    a: [
      'Modern western interior design art is selected as statement western artwork with spatial intent, not as theme-based decor. The emphasis is on restraint, composition, and narrative pressure that can hold a room without visual noise.',
      'This collection is built as fine art for western interiors through painterly western photography, giving designers and collectors a more authored option than generic contemporary western wall art.'
    ],
  },
  {
    q: 'Can modern western wall art work in luxury residential and boutique hospitality interiors?',
    a: [
      'Yes. In luxury homes and boutique hospitality projects, modern western wall art is most effective when used as a pacing tool: a few focal statement pieces supported by quieter landscape works to control rhythm across suites, corridors, and shared rooms.',
      'This contemporary western interior design approach keeps the space refined while still delivering authored narrative presence, which is why it is frequently specified as fine art for western interiors rather than decorative inventory.'
    ],
  },
];

const catalogNarrativeColor = pickTopCatalog(narrativeColor, 8, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativePath));
const catalogNarrativeBlackWhite = pickTopCatalog(narrativeBlackWhite, 4, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, narrativeBlackWhitePath));
const slowBreathImage = pickTopCatalog(narrativeColor, 80, Array.from(carouselIds)).find(
  (img: any) => String(img?.title || '').trim().toLowerCase() === 'the slow breath of evening'
);
const slowBreathCard = slowBreathImage ? toCatalogCard(slowBreathImage, narrativePath) : null;
const catalogCowboyColorBase = pickTopCatalog(cowboyColor, 3, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyPath));
const catalogCowboyColor = replaceTitleInCards(catalogCowboyColorBase, 'Weathered', slowBreathCard);
const catalogCowboyBlackWhite = pickTopCatalog(cowboyBlackWhite, 2, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, cowboyBlackWhitePath));
const catalogNative = pickTopCatalog(nativeColor, 2, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, nativePath));
const catalogWestLandscapes = pickTopCatalog(landscapeWest, 11, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, landscapeWestPath));
const catalogMountainLandscapes = pickTopCatalog(landscapeMountains, 9, Array.from(carouselIds)).map((img: any) => toCatalogCard(img, mountainsPath));

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
  'landscapeWest',
  'narrativeColor',
  'landscapeMountains',
  'cowboyColor',
  'landscapeWest',
  'narrativeBlackWhite',
  'landscapeMountains',
  'nativeColor',
  'landscapeWest',
  'narrativeColor',
  'cowboyBlackWhite',
  'landscapeMountains',
  'landscapeWest',
  'narrativeColor',
  'landscapeMountains',
  'narrativeBlackWhite',
  'nativeColor',
  'landscapeWest',
  'narrativeColor',
];

export const catalogImages = buildMixedCatalog(catalogPools, catalogSlotPattern, 30);

export const collectorClose = {
  heading: 'Collected for Modern Western Interiors',
  paragraphs: [
    'Use this pathway when a project needs statement western artwork without visual noise. The sequence is intentionally weighted toward open compositions and tonal calm so rooms retain architectural clarity.',
    'For design teams specifying across multiple zones, this mix supports clean focal moments while preserving cohesion across modern, transitional, and contemporary western interiors.',
  ],
  ctaHref: '/Western-Interior-Design-Art',
  ctaLabel: 'Return to the Western Interior Design Art Hub',
};

export const pageMeta = {
  title: 'Modern Western Interior Design Art for Clean, Statement Spaces',
  description:
    'Modern western interior design artwork by Wayne Heim, curated for clean contemporary spaces with tonal restraint, narrative clarity, and statement-ready fine art for western interiors.',
  ogImage: carouselSlides[0]?.id || 'i-Lk9XZKB',
};

export const breadcrumb =
  '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Modern Western Interior Design Art</span>';
