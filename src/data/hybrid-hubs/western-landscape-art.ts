import { galleryData as waterGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs';
import { galleryData as mountainsGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs';
import { galleryData as sunsetsGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs';
import { galleryData as painterlyWestGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs';
import { galleryData as traditionalWestGallery }
  from '@/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs';

const waterPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water';
const mountainsPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains';
const sunsetsPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets';
const painterlyWestPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery';
const traditionalWestPath = '/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery';

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
export const galleryPaths = [painterlyWestPath, traditionalWestPath, mountainsPath, sunsetsPath, waterPath];

export const landing = {
  title: 'Western Landscape Art',
  subtitle: 'Western landscape art shaped through painterly mountain light, waterfall atmosphere, Tetons stillness, and Rocky Mountain presence rather than generic scenic inventory.',
  keywords: [
    'western landscape art',
    'western landscape wall art',
    'western landscape art prints',
    'fine art western landscape prints',
    'waterfall photography',
    'waterfall fine art prints',
    'mountain photography',
    'mountain wall art',
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
      'For collectors, western landscape wall art works best when the image carries more than scenery. The right print brings atmosphere into a room without becoming generic decor: mountain weather, water movement, Western distance, and the quiet pressure of place.',
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
  {
    subhead: 'Western landscape prints for rooms that need presence',
    paragraphs: [
      'A landscape print has to survive the room after the first glance. Scale, contrast, tonal restraint, and surface choice all matter because the work becomes part of daily attention rather than a passing scenic view.',
      'This page therefore treats western landscape art prints as collector objects first. The gallery rows below lead into the actual proof: painterly Western locations, traditional Western mountain studies, water and waterfall work, and sunset images where light is atmosphere rather than decoration.',
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
    description: 'Compare archival paper and select wood presentation formats once the image itself has earned the space.',
    cta: 'Compare formats -',
    accent: '#7b644e',
  },
  {
    title: 'Western Wall Art',
    eyebrow: 'Commercial Route',
    hideEyebrow: true,
    href: '/Western-Wall-Art',
    description: 'Compare the broader Western wall-art route if you are choosing by room presence, format, and long-term display.',
    cta: 'Open wall art guide -',
    accent: '#8a5d3d',
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
    title: 'Western Wall Art',
    href: '/Western-Wall-Art',
    description: 'Use the buyer-focused wall-art page to compare collector entry points, room fit, and print formats across Western subjects.',
    eyebrow: 'Collector',
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
  ...selectGridImages(sunsetsGallery, sunsetsPath, 4, 4, 'Western sunset landscape by Wayne Heim', heroSlideIds),
];

export const collection = {
  kicker: 'Thematic Selections',
  title: 'Western Landscape Art Prints and Proof Galleries',
  intro: 'A compact route through the actual landscape inventory: Western locations, mountain weather, water movement, and sunset atmosphere for collectors comparing wall art and fine art print paths.',
};

export const collectionGroups = [
  {
    title: 'Western Landscape Themes',
    description: 'Rows built from real image pools so the page can answer commercial landscape intent without inventing inventory or flattening the work into generic scenic decor.',
    rows: [
      {
        label: 'Painterly Western Location Landscapes',
        href: painterlyWestPath,
        cta: 'See more painterly Western landscapes',
        items: selectCollectionPreviewRow(
          painterlyWestGallery,
          painterlyWestPath,
          0,
          4,
          'Painterly Western landscape wall art by Wayne Heim',
          'West / Painterly',
          heroSlideIds,
        ),
      },
      {
        label: 'Traditional Western Mountain Landscapes',
        href: traditionalWestPath,
        cta: 'See more traditional Western landscapes',
        items: selectCollectionPreviewRow(
          traditionalWestGallery,
          traditionalWestPath,
          0,
          4,
          'Traditional Western mountain photography print by Wayne Heim',
          'West / Traditional',
          heroSlideIds,
        ),
      },
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
          4,
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
      'Western landscape art here means painterly fine art photography of American West and Canadian Rockies locations - open country, mountain weather, waterfall motion, alpine lakes, and the visual pressure of land that carries more than scenery. These are authored works with tonal depth and atmosphere, not travel or documentary photography.',
    ],
  },
  {
    q: 'Can Western landscape art work as wall art without becoming decor?',
    a: [
      'Yes - when the image carries atmosphere rather than postcard shorthand. Wayne Heim\'s landscape work is built around place as presence: mountain weather, water movement, and the quiet authority of open country. A single strong landscape scaled for an anchor wall changes the atmosphere of a room without becoming generic Western theme decor.',
    ],
  },
  {
    q: 'Where should I start if I am choosing by print format or room fit?',
    a: [
      'Start with scale. Large-format mountain and Teton prints work best as anchor pieces in great rooms, lodge lobbies, and open-plan living spaces where the image needs to carry distance. Waterfall and water prints work well in smaller spaces where motion and tonal contrast matter more than scale. Paper and wood presentation options are inside each image page alongside size details.',
    ],
  },
  {
    q: 'Does this page also cover waterfall photography and mountain photography?',
    a: [
      'Yes. Waterfall photography and mountain photography both land here as part of the Western landscape route. Water carries motion, reflection, and tonal contrast. Mountains carry scale, endurance, and peak-and-weather presence. Together they form the full range of Western landscape atmosphere available in the collection.',
    ],
  },
  {
    q: 'Are the Tetons and Rocky Mountains part of the collection?',
    a: [
      'Yes. The Teton Range appears across multiple works in the American West section - Schwabacher Landing reflections, Jackson Lake sunrise, storm light on the peaks, and open country approaches. The Canadian Rockies section covers Banff, Jasper, alpine lakes, and waterfall country from the northern frontier. Both ranges are treated as emotional geography rather than travel markers.',
    ],
  },
  {
    q: 'Can I compare print materials before choosing a landscape image?',
    a: [
      'Yes. Every image page lists available substrates - archival paper and select wood presentations including the Engrained Series Baltic Birch panels. For landscape work specifically, wood substrates can complement the tonal range of mountain and water imagery particularly well. Material details and size options are inside each image page. Questions about a specific piece? Reach Wayne at <a href="mailto:wayne@k4studios.com">wayne@k4studios.com</a>.',
    ],
  },
  {
    q: 'What size Western landscape art prints are available?',
    a: [
      'Prints range from 5x7 Sketch Series works through large-format statement pieces suited for great rooms, lodge lobbies, and open-plan living spaces. Landscape work scales particularly well - the wider the print, the more the distance and atmosphere of the image carry into the room. Size options vary by image and are listed inside each image page.',
    ],
  },
  {
    q: 'What is the difference between Western landscape art and standard landscape photography?',
    a: [
      'Standard landscape photography documents place and light. Wayne Heim\'s Western landscape art treats land as emotional structure - open country that shaped frontier life, mountains that carry endurance and scale, water that moves with consequence. The painterly process adds tonal depth and atmosphere that separates the work from documentary or travel photography.',
    ],
  },
];

export const pageMeta = {
  title: 'Western Landscape Art Prints | Mountain, Waterfall and Western Wall Art by Wayne Heim - K4 Studios',
  description: 'Western landscape art prints by Wayne Heim featuring painterly mountain wall art, waterfall fine art prints, Tetons, Rocky Mountain views, and Western sunset landscapes.',
};

export const structuredAbout = [
  'Western Landscape Art',
  'Western Landscape Wall Art',
  'Western Landscape Art Prints',
  'Painterly Landscape Photography',
  'Mountain Photography',
  'Mountain Wall Art',
  'Waterfall Photography',
  'Waterfall Fine Art Prints',
  'Tetons',
  'Rocky Mountains',
];

export const webPageAbout = [
  'Western Landscape Art',
  'Western Landscape Wall Art',
  'Fine Art Western Landscape Prints',
  'Mountain Photography',
  'Waterfall Photography',
  'Western Sunset Landscapes',
];

export const genre = 'Western Landscape Art';
export const collectionAltPrefix = 'Western landscape art';
