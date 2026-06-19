import { galleryData as engrainedGallery }
  from '../Other/K4-Select-Series/Engrained/Engrained-Series.mjs';

const engrainedPath = '/Other/K4-Select-Series/Engrained/Engrained-Series';

function cleanItems(data: any[]) {
  return (data || [])
    .filter((item: any) => item && typeof item.id === 'string')
    .filter((item: any) => item.id !== 'i-k4studios')
    .filter((item: any) => item.visibility !== 'ghost' && item.visibility !== 'hidden' && item.visibility !== 'hide')
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function ensureAlt(item: any, fallbackAlt: string) {
  const base = (item?.alt || item?.title || fallbackAlt).trim();
  return base || fallbackAlt;
}

function hasAnySignal(text: string, signals: string[]) {
  return signals.some((signal) => text.includes(signal));
}

function textBlob(item: any) {
  return [
    item?.title,
    item?.description,
    item?.alt,
    item?.story,
    item?.notes,
    ...(item?.keywords || []),
    item?.linkedGalleryPath,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const visible = cleanItems(engrainedGallery);
const landscapeSignals = ['landscape', 'mountain', 'waterfall', 'aspen', 'sunset', 'crystal mill', 'teton', 'wyoming'];
const narrativeSignals = ['train', 'showdown', 'confrontation', 'reckoning', 'party', 'journey', 'mile', 'grief', 'mourning', 'parting', 'farewell', 'reunion', 'welcome', 'story', 'narrative'];
const portraitSignals = ['portrait', 'cowboy', 'woman', 'homesteader', 'sheriff', 'rifle', 'buffalo hunter', 'hat', 'cabin window'];

const landscapeItems = visible.filter((item: any) => {
  const text = textBlob(item);
  return hasAnySignal(text, landscapeSignals) || String(item?.linkedGalleryPath || '').includes('/Landscapes/');
});

const landscapeIds = new Set(landscapeItems.map((item: any) => item.id));

const narrativeSeedItems = visible.filter((item: any) => {
  const text = textBlob(item);
  return !landscapeIds.has(item.id) && (hasAnySignal(text, narrativeSignals) || String(item?.linkedGalleryPath || '').includes('Western-Narratives'));
});

const narrativeIds = new Set(narrativeSeedItems.map((item: any) => item.id));

const portraitSeedItems = visible.filter((item: any) => {
  const text = textBlob(item);
  return !landscapeIds.has(item.id) && !narrativeIds.has(item.id) && (hasAnySignal(text, portraitSignals) || String(item?.linkedGalleryPath || '').includes('Western-Cowboy-Portraits') || String(item?.linkedGalleryPath || '').includes('Native-Americans'));
});

const portraitIds = new Set(portraitSeedItems.map((item: any) => item.id));
const remainingItems = visible.filter((item: any) => !landscapeIds.has(item.id) && !narrativeIds.has(item.id) && !portraitIds.has(item.id));

const narrativeItems = [...narrativeSeedItems, ...remainingItems];
const portraitItems = portraitSeedItems;

function selectGridImages(items: any[], count: number, fallbackAlt: string, excludedIds: string[] = []) {
  return items
    .filter((item: any) => !excludedIds.includes(item.id))
    .slice(0, count)
    .map((item: any) => ({
    id: item.id,
    title: item.title || 'Featured Work',
    alt: ensureAlt(item, fallbackAlt),
    href: `${engrainedPath}/${item.id}`,
    }));
}

function selectCollectionPreviewRow(items: any[], count: number, fallbackAlt: string, seriesLabel: string, excludedIds: string[] = []) {
  return items
    .filter((item: any) => !excludedIds.includes(item.id))
    .slice(0, count)
    .map((item: any) => ({
    id: item.id,
    title: item.title || 'Featured Work',
    alt: ensureAlt(item, fallbackAlt),
    href: `${engrainedPath}/${item.id}`,
    seriesLabel,
    }));
}

function buildHybridSlides(items: any[], count: number, fallbackStory: string, offset: number = 0) {
  return items.slice(offset, offset + count).map((item: any) => ({
    id: item.id,
    title: item.title || 'Featured Work',
    alt: ensureAlt(item, 'Engrained wood print by Wayne Heim'),
    story: (item.story || fallbackStory).trim(),
    href: `${engrainedPath}/${item.id}`,
  }));
}

const visibleById = new Map(visible.map((item: any) => [item.id, item]));

function storyIntro(item: any) {
  const source = String(item?.story || item?.description || '').trim();
  return source
    .split(/\n\s*\n/)
    .find(Boolean)
    ?.replace(/\s+/g, ' ')
    .trim() || item?.description || '';
}

function localSlide(imageId: string, src: string, fallback: any = {}) {
  const item: any = visibleById.get(imageId) || {};
  return {
    id: item.id,
    title: item.title || fallback.title || 'Featured Work',
    alt: ensureAlt(item, fallback.alt || 'Engrained wood print by Wayne Heim'),
    src,
    story: storyIntro(item) || fallback.story || '',
    href: item.id ? `${engrainedPath}/${item.id}` : engrainedPath,
  };
}

const localEngrainedCarouselSlides = [
  localSlide('i-mrHbrNb', '/images/Untitled-1_0000_2-coffee.jpg.jpg'),
  localSlide('i-C58KMqF', '/images/Untitled-1_0001_3%20church.jpg.jpg'),
  localSlide('i-5VmRqpZ', '/images/Untitled-1_0003_4%20fence.jpg.jpg'),
  localSlide('i-wV53528', '/images/Untitled-1_0008_4sign.jpg.jpg'),
  localSlide('i-4cdDwZt', '/images/Untitled-1_0009_5%20buffy.jpg.jpg'),
  localSlide('i-hVBkc7Q', '/images/Untitled-1_0013_9-barn.jpg.jpg'),
  localSlide('i-b4wG4vh', '/images/Untitled-1_0014_10b%20puff.jpg.jpg'),
  localSlide('i-NQ5tCTb', '/images/Untitled-1_0016_11%20lake.jpg.jpg'),
  {
    title: 'Framed Engrained Mockup',
    alt: 'Framed Engrained wood print mockup set',
    src: '/images/Untitled-1_0018_Frame_Mockup_Set_16_11%20cod.jpg.jpg',
    story: 'A finished presentation view shows the Engrained idea as a display-ready wall piece.',
    href: engrainedPath,
  },
];

export const pagePath = '/Engrained';
export const imageSectionPath = engrainedPath;
export const gridBasePath = engrainedPath;
export const galleryPaths = [engrainedPath];
export const galleryDatasOverride = [engrainedGallery];

export const landing = {
  title: 'Engrained Series',
  subtitle: 'Engrained wood prints where Wayne Heim’s painterly Western imagery fuses with Baltic birch grain so the material itself becomes part of the story.',
  keywords: [
    'engrained',
    'engrained wood prints',
    'western art on wood',
    'wood print fine art',
    'western wood prints',
    'painterly wood prints',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Engrained Series</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Engrained Series', item: 'https://www.k4studios.com/Engrained' },
];

export const hybridCarouselProps = {
  slides: localEngrainedCarouselSlides,
  galleryBasePath: engrainedPath,
  kicker: 'Selected Wood Prints',
  counterLabel: 'Panel',
};

const heroSlideIds = hybridCarouselProps.slides.map((slide: any) => slide.id);

export const storyBlocks = [
  {
    title: 'Engrained Series',
    subhead: 'Wood grain is not background here. It is part of the evidence.',
    paragraphs: [
      'Engrained exists because some images want a material with memory already inside it. Printed on Baltic birch through Wayne Heim’s layered UV process, these works do not hide the wood grain. They recruit it. The grain becomes a natural roadmap running through the image like weather through a face, or history through an old story.',
      'That makes Engrained more than a print format. It is a specific visual idea: painterly Western imagery, vintage stories, rugged life, and landscape atmosphere meeting a surface that already carries age, texture, and imperfection before the image arrives.',
    ],
  },
  {
    subhead: 'Why the material changes the story',
    paragraphs: [
      'Many Western images gain force when they stop feeling slick. The birch softens polish and returns the work to something tactile. Faces feel unearthed. Frontier scenes feel found rather than staged. Landscapes absorb a dry, weathered presence that paper cannot produce in the same way.',
      'The strongest Engrained pieces therefore sit right at the intersection of nature and narrative. The wood carries rings, lines, and irregularity. The image carries people, places, and consequence. Together they create a piece that feels built rather than merely printed.',
    ],
  },
  {
    subhead: 'Rugged life, vintage stories, and landscapes on wood',
    paragraphs: [
      'Some collectors come for the cowboy portraits. Others for the old-West tension, train scenes, grief, resolve, and reunion. Others want landscapes where the grain gives mountains, weather, and open country a deeper physical presence. Engrained has room for all three branches because the underlying idea is the same: the material is telling part of the story.',
      'The selections below separate those branches just enough to browse clearly while keeping the larger Engrained concept intact for visitors who want a distinctive Western statement piece rather than a standard wall print.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Engrained Series Gallery',
    eyebrow: 'Primary Collection Route',
    href: engrainedPath,
    description: 'Move directly into the full Engrained gallery if you want the deepest image inventory and purchase path.',
    cta: 'Browse the full series -',
    accent: '#6b5345',
    featured: true,
  },
  {
    title: 'Print Options',
    eyebrow: 'Format Route',
    href: '/Other/Print-Options',
    description: 'Compare Engrained against archival paper and other available presentation formats after identifying the image that belongs in the room.',
    cta: 'Compare print formats -',
    accent: '#5f4f43',
  },
  {
    title: 'Western Wall Art',
    eyebrow: 'Room Route',
    hideEyebrow: true,
    href: '/Western-Wall-Art',
    description: 'Use the broader wall-art route if you want to compare Engrained with other Western presentation styles and room contexts.',
    cta: 'See broader wall art -',
    accent: '#7a624d',
  },
];

export const featuredReadingTitle = 'Exploring Material, Story and Presence';
export const featuredReadingIntro = 'Engrained works best when the visitor understands both the artistic thesis and the material logic behind the format.';

export const featuredReadingItems = [
  {
    title: 'Art of the West',
    href: '/Art-of-the-West',
    description: 'See the broader artistic field that gives the Engrained subjects their weight before the material is even introduced.',
    eyebrow: 'Concept',
  },
  {
    title: 'One-Image Movie',
    href: '/One-Image-Movie',
    description: 'Understand the story-bearing still-image idea that gives many Engrained works their psychological pressure.',
    eyebrow: 'Concept',
  },
  {
    title: 'Narrative Western Art',
    href: '/Narrative-Western-Art',
    description: 'Follow the thesis branch where frontier imagery is built to be read as much as seen.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Painterly Photography?',
    href: '/Blog/what-is-painterly-photography',
    description: 'See why atmosphere, tonal restraint, and visual authorship matter before the work is fused into wood.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(portraitItems, 4, 'Engrained portrait wood print by Wayne Heim', heroSlideIds),
  ...selectGridImages(narrativeItems, 4, 'Engrained narrative wood print by Wayne Heim', heroSlideIds),
  ...selectGridImages(landscapeItems, 4, 'Engrained landscape wood print by Wayne Heim', heroSlideIds),
];

export const collection = {
  kicker: 'Wood Print Selections',
  title: 'Engrained Series by Branch',
  intro: 'The material stays constant. What changes is the kind of story or subject the grain is amplifying.',
};

export const collectionGroups = [
  {
    title: 'Rugged Life and Portraiture',
    description: 'Wood-forward Western portraits where faces, clothing, and posture take on extra age and tactile presence through the birch surface.',
    rows: [
      {
        label: 'Portrait Selection',
        href: engrainedPath,
        cta: 'See more portrait panels',
        items: selectCollectionPreviewRow(
          portraitItems,
          4,
          'Engrained portrait wood print by Wayne Heim',
          'Portraits',
          heroSlideIds,
        ),
      },
    ],
  },
  {
    title: 'Vintage Stories and Frontier Tension',
    description: 'Narrative works where the wood grain reinforces the age, silence, and psychological pressure already present in the scene.',
    rows: [
      {
        label: 'Narrative Selection',
        href: engrainedPath,
        cta: 'See more narrative panels',
        items: selectCollectionPreviewRow(
          narrativeItems,
          4,
          'Engrained narrative wood print by Wayne Heim',
          'Narratives',
          heroSlideIds,
        ),
      },
    ],
  },
  {
    title: 'Landscapes in Natural Grain',
    description: 'Landscape panels where mountain, sky, water, and weather interact with the wood like a second layer of terrain.',
    rows: [
      {
        label: 'Landscape Selection',
        href: engrainedPath,
        cta: 'See more landscape panels',
        items: selectCollectionPreviewRow(
          landscapeItems,
          4,
          'Engrained landscape wood print by Wayne Heim',
          'Landscapes',
          heroSlideIds,
        ),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Engrained Questions',
  title: 'Engrained Series FAQ',
};

export const faqItems = [
  {
    q: 'What is Engrained?',
    a: [
      'Engrained is Wayne Heim’s wood-print presentation where painterly images are fused onto Baltic birch so the natural grain becomes part of the final visual language rather than being hidden beneath it.',
    ],
  },
  {
    q: 'Why print these works on wood instead of paper?',
    a: [
      'Because some Western images gain force from a surface that already carries texture, age, and imperfection. The wood makes the work feel unearthed, weathered, and physically present in a way paper cannot fully replicate.',
    ],
  },
  {
    q: 'Does Engrained only work for cowboy portraits?',
    a: [
      'No. The series also includes vintage narrative scenes and landscapes where grain, weather, and subject can reinforce each other naturally.',
    ],
  },
  {
    q: 'Is every Engrained piece a limited edition work?',
    a: [
      'Yes. The Engrained works sit inside the limited-edition K4 system rather than behaving like mass-market wood decor.',
    ],
  },
  {
    q: 'Where can I see the full Engrained inventory?',
    a: [
      'Open the <a href="/Other/K4-Select-Series/Engrained/Engrained-Series">Engrained Series gallery</a> if you want the full set of available panels and image-level purchase paths.',
    ],
  },
];

export const pageMeta = {
  title: 'Engrained Series | Western Art on Wood by Wayne Heim – K4 Studios',
  description: 'Engrained wood prints by Wayne Heim blending Baltic birch grain with painterly Western portraits, frontier stories, and atmospheric landscapes.',
};

export const structuredAbout = [
  'Engrained Series',
  'Western Art on Wood',
  'Wood Print Fine Art',
  'Painterly Western Photography',
  'Engrained Wood Prints',
];

export const webPageAbout = [
  'Engrained Series',
  'Western Wood Prints',
  'Wood Print Fine Art',
  'Baltic Birch Art Panels',
];

export const genre = 'Western Art on Wood';
export const collectionAltPrefix = 'Engrained wood print';
