import { galleryData as waterGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs';
import { galleryData as mountainsGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs';
import { galleryData as sunsetsGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs';

const waterPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water';
const mountainsPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains';
const sunsetsPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets';

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

function selectGridImages(data: any[], hrefBase: string, offset: number, count: number, fallbackAlt: string, excludedIds: string[] = []) {
  return cleanItems(data)
    .filter((item: any) => !excludedIds.includes(item.id))
    .slice(offset, offset + count)
    .map((item: any) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: ensureAlt(item, fallbackAlt),
      href: `${hrefBase}/${item.id}`,
    }));
}

function selectCollectionPreviewRow(
  data: any[],
  hrefBase: string,
  offset: number,
  count: number,
  fallbackAlt: string,
  seriesLabel: string,
  excludedIds: string[] = [],
) {
  return cleanItems(data)
    .filter((item: any) => !excludedIds.includes(item.id))
    .slice(offset, offset + count)
    .map((item: any) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: ensureAlt(item, fallbackAlt),
      href: `${hrefBase}/${item.id}`,
      seriesLabel,
    }));
}

function buildHybridSlides(data: any[], hrefBase: string, count: number, fallbackStory: string, offset: number = 0) {
  return cleanItems(data)
    .slice(offset, offset + count)
    .map((item: any) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: ensureAlt(item, 'Western landscape art by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/western-landscape-art';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes';
export const gridBasePath = mountainsPath;
export const galleryPaths = [mountainsPath, sunsetsPath, waterPath];

export const landing = {
  title: 'Western Landscape Art',
  subtitle: 'Western landscape art shaped through painterly mountain light, waterfall atmosphere, Tetons stillness, and Rocky Mountain presence rather than generic scenic inventory.',
  keywords: [
    'western landscape art',
    'waterfall photography',
    'mountain photography',
    'tetons photography',
    'rocky mountains photography',
    'painterly western landscapes',
    'western fine art landscapes',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Landscape Art</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Western Landscape Art', item: 'https://www.k4studios.com/western-landscape-art' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(mountainsGallery, mountainsPath, 2, 'Painterly mountain work where weather, distance, and endurance hold the frame.'),
    ...buildHybridSlides(waterGallery, waterPath, 2, 'Water and waterfall images where movement, reflection, and gravity shape the scene.', 1),
    ...buildHybridSlides(sunsetsGallery, sunsetsPath, 2, 'Western sunset landscapes where color arrives as atmosphere rather than spectacle.', 1),
  ],
  galleryBasePath: mountainsPath,
  kicker: 'Selected Landscapes',
  counterLabel: 'Landscape',
};

const heroSlideIds = hybridCarouselProps.slides.map((slide: any) => slide.id);

export const storyBlocks = [
  {
    title: 'Western Landscape Art',
    subhead: 'The land was never just backdrop.',
    paragraphs: [
      'The strongest Western landscape art does not treat the land as decoration behind the legend. It treats mountains, rivers, weather, and distance as active forces that shaped frontier life in the first place. That is why this page brings painterly mountain photography, waterfall photography, and Western landscape images together under one route.',
      'In this body of work, the West is carried through atmosphere and pressure rather than through postcard shorthand. The Tetons, the Rocky Mountains, reflective water, and sunset light matter here because they hold stillness, scale, and consequence inside the frame.',
    ],
  },
  {
    subhead: 'Why this page carries mountains, water, and sunsets together',
    paragraphs: [
      'People searching Western landscape art are often looking for adjacent ideas at the same time: mountain photography, waterfall photography, Teton views, Rocky Mountain presence, and painterly Western scenery that feels serious enough to live as art rather than filler decor.',
      'That overlap is natural, so the page is built as a thematic cluster rather than three thin routes competing against each other. Water carries motion and reflection. Mountains carry endurance and scale. Sunsets carry transition, warmth, and the final pressure of light before the day closes.',
    ],
  },
  {
    subhead: 'A painterly route through the Mountain West',
    paragraphs: [
      'The Tetons and the broader Rocky Mountain country appear here not as travel markers, but as emotional geography. Some images are quiet and reflective. Others carry weather, storm light, or the suspended calm that arrives just before the land changes again.',
      'Seen together, these themes create a cleaner and more useful route for collectors who want Western landscape art with atmosphere and authorship, whether they enter through mountain photography, waterfall imagery, or the broader Western fine art landscape tradition.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Painterly Landscapes',
    eyebrow: 'Primary Gallery Route',
    href: '/Galleries/Painterly-Fine-Art-Photography/Landscapes',
    description: 'Move into the broader painterly landscape gallery where the Western branch opens into additional locations, moods, and atmospheric studies.',
    cta: 'Explore painterly landscapes -',
    accent: '#6a5748',
    featured: true,
  },
  {
    title: 'Mountain Themed Landscapes',
    eyebrow: 'Mountain Route',
    hideEyebrow: true,
    href: mountainsPath,
    description: 'Follow the mountain path deeper into Tetons, Rocky Mountain views, weather breaks, and painterly peaks shaped by distance and silence.',
    cta: 'Open the mountain gallery -',
    accent: '#4f5d63',
  },
  {
    title: 'Print Options',
    eyebrow: 'Collector Route',
    hideEyebrow: true,
    href: '/Other/Print-Options',
    description: 'Compare archival paper, canvas, metal, and other presentation formats once the image itself has earned the space.',
    cta: 'Compare formats -',
    accent: '#7b644e',
  },
];

export const featuredReadingTitle = 'Exploring Land, Atmosphere and Presence';
export const featuredReadingIntro = 'The stronger landscape pages explain why terrain feels lived and remembered instead of merely scenic. These pieces help frame that difference.';

export const featuredReadingItems = [
  {
    title: 'What Is Western Art?',
    href: '/Blog/what-is-western-art',
    description: 'See the larger tradition that turns the American West from subject matter into a serious artistic language.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Painterly Photography?',
    href: '/Blog/what-is-painterly-photography',
    description: 'Follow how tone, edge, and atmospheric control let a landscape feel authored rather than simply recorded.',
    eyebrow: 'Guide',
  },
  {
    title: 'Art of the West',
    href: '/Art-of-the-West',
    description: 'Step into the larger concept page where land, frontier memory, narrative, and artistic lineage sit under one Western umbrella.',
    eyebrow: 'Concept',
  },
  {
    title: 'What Makes an Image Feel Cinematic?',
    href: '/Blog/what-makes-an-image-feel-cinematic',
    description: 'See how silence, tension, and implied change can make a landscape hold the viewer longer than surface beauty alone.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(mountainsGallery, mountainsPath, 0, 4, 'Western mountain landscape by Wayne Heim', heroSlideIds),
  ...selectGridImages(waterGallery, waterPath, 0, 4, 'Western water and waterfall landscape by Wayne Heim', heroSlideIds),
  ...selectGridImages(sunsetsGallery, sunsetsPath, 0, 4, 'Western sunset landscape by Wayne Heim', heroSlideIds),
];

export const collection = {
  kicker: 'Thematic Selections',
  title: 'Painterly Western Landscape Themes',
  intro: 'One color row per theme, built around the actual image pools for water, sunsets, and mountains so the page reflects the landscape inventory honestly.',
};

export const collectionGroups = [
  {
    title: 'Western Landscape Themes',
    description: 'Three thematic rows that let mountain photography, waterfall photography, and painterly Western sunset work live together without flattening them into one scenic pile.',
    rows: [
      {
        label: 'Water and Waterfall Landscapes',
        href: waterPath,
        cta: 'See more water landscapes',
        items: selectCollectionPreviewRow(
          waterGallery,
          waterPath,
          0,
          4,
          'Western waterfall landscape by Wayne Heim',
          'Water / Color',
          heroSlideIds,
        ),
      },
      {
        label: 'Sunset Landscapes',
        href: sunsetsPath,
        cta: 'See more sunset landscapes',
        items: selectCollectionPreviewRow(
          sunsetsGallery,
          sunsetsPath,
          0,
          4,
          'Western sunset landscape by Wayne Heim',
          'Sunsets / Color',
          heroSlideIds,
        ),
      },
      {
        label: 'Mountain Landscapes',
        href: mountainsPath,
        cta: 'See more mountain landscapes',
        items: selectCollectionPreviewRow(
          mountainsGallery,
          mountainsPath,
          0,
          4,
          'Western mountain landscape by Wayne Heim',
          'Mountains / Color',
          heroSlideIds,
        ),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Landscape Questions',
  title: 'Western Landscape Art FAQ',
};

export const faqItems = [
  {
    q: 'What does Western landscape art mean on this page?',
    a: [
      'It means painterly landscape work from the American West where land, weather, reflection, and distance carry as much emotional weight as the subject label itself. The goal is not generic scenery, but authored Western landscape presence.',
    ],
  },
  {
    q: 'Does this page also cover waterfall photography and mountain photography?',
    a: [
      'Yes. This page is intentionally built to serve those adjacent searches together because the intent overlaps naturally. Visitors looking for Western landscape art are often also looking for painterly mountain photography, waterfall scenes, and Tetons or Rocky Mountain imagery.',
    ],
  },
  {
    q: 'Are the Tetons and Rocky Mountains part of the collection?',
    a: [
      'Yes. The mountain selections include Tetons and Rocky Mountain country, alongside other Western landscapes where scale, weather, and quiet atmosphere carry the frame.',
    ],
  },
  {
    q: 'Why is there one row per theme instead of color and black and white pairs?',
    a: [
      'Because these particular landscape source pools are color-only. The page is built around the real inventory so the structure stays honest and focused instead of forcing a format split that does not exist in the data.',
    ],
  },
  {
    q: 'Where should I go if I want the broader painterly landscape gallery?',
    a: [
      'Start with <a href="/Galleries/Painterly-Fine-Art-Photography/Landscapes">Painterly Landscapes</a> if you want the wider landscape route beyond these Western thematic clusters.',
    ],
  },
  {
    q: 'Can I compare print materials before choosing a landscape image?',
    a: [
      'Yes. Visit <a href="/Other/Print-Options">Print Options</a> to compare archival paper, canvas, metal, and related presentation formats after you have identified the image that belongs in the room.',
    ],
  },
];

export const pageMeta = {
  title: 'Western Landscape Art | Painterly Mountain and Waterfall Photography by Wayne Heim – K4 Studios',
  description: 'Western landscape art by Wayne Heim featuring painterly mountain photography, waterfall imagery, Tetons, Rocky Mountain views, and Western sunset landscapes.',
};

export const structuredAbout = [
  'Western Landscape Art',
  'Painterly Landscape Photography',
  'Mountain Photography',
  'Waterfall Photography',
  'Tetons',
  'Rocky Mountains',
];

export const webPageAbout = [
  'Western Landscape Art',
  'Mountain Photography',
  'Waterfall Photography',
  'Western Sunset Landscapes',
];

export const genre = 'Western Landscape Art';
export const collectionAltPrefix = 'Western landscape art';