import { galleryData as cowboyColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as narrativeColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as mountainsGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs';
import { galleryData as waterGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs';

const cowboyPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const narrativePath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const mountainsPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains';
const waterPath = '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water';

function cleanItems(data: any[]) {
  return (data || [])
    .filter((item: any) => item && typeof item.id === 'string')
    .filter((item: any) => item.id !== 'i-k4studios')
    .filter((item: any) => !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase()) && item.visibility !== 'hidden' && item.visibility !== 'hide')
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
      alt: ensureAlt(item, 'Western artwork by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/western-artwork';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';
export const gridBasePath = cowboyPath;
export const galleryPaths = [cowboyPath, narrativePath, mountainsPath, waterPath];

export const landing = {
  title: 'Western Artwork',
  subtitle: 'Western artwork by Wayne Heim blending fine art photography, painterly finishing, and cinematic storytelling into Western art prints rooted in frontier life, cowboy history, and the mythic American West.',
  keywords: [
    'western artwork',
    'western artwork for sale',
    'western art paintings',
    'western paintings',
    'western themed art',
    'western fine art',
    'western fine art photography',
    'western art prints',
    'western wall artwork',
    'painterly western artwork',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Artwork</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Western Artwork', item: 'https://www.k4studios.com/western-artwork' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(cowboyColorGallery, cowboyPath, 2, 'Portrait-driven Western artwork where weathering and character stay stronger than costume.'),
    ...buildHybridSlides(narrativeColorGallery, narrativePath, 2, 'Narrative Western scenes where the frame behaves like an unfinished chapter.'),
    ...buildHybridSlides(mountainsGallery, mountainsPath, 1, 'Painterly mountain work where land acts like emotional structure rather than scenery.'),
    ...buildHybridSlides(waterGallery, waterPath, 1, 'Water-driven Western landscapes where reflection and motion keep the picture active.', 1),
  ],
  galleryBasePath: cowboyPath,
  kicker: 'Selected Artwork',
  counterLabel: 'Work',
};

const heroSlideIds = hybridCarouselProps.slides.map((slide: any) => slide.id);

export const storyBlocks = [
  {
    title: 'Western Artwork',
    subhead: 'Western art prints, painterly photography, and frontier subjects under one clear roof.',
    paragraphs: [
      'Wayne Heim\'s Western artwork blends fine art photography, painterly finishing, and cinematic storytelling to create Western art prints rooted in frontier life, cowboy history, and the mythic American West.',
      'Western artwork can carry more than a familiar subject. In Wayne Heim\'s work, the category opens into portraiture, narrative frontier scenes, and atmospheric Western landscapes - each shaped with painterly restraint, historical memory, and collector-grade intent.',
      'The result reaches beyond cowboy iconography alone. These works hold atmosphere, seriousness, and enough visual authority to live with over time as collectible Western artwork.',
    ],
  },
  {
    subhead: 'Portrait, story, and land all belong here',
    paragraphs: [
      'The West was never only a face, and it was never only a horizon. Strong Western artwork has room for both. Portraiture carries character and human weather. Narrative scenes carry tension, consequence, and memory. Landscapes carry scale, silence, and the geography that shaped everything else.',
      'Seen together, those branches create a more honest shape for the term. Western themed art can be more than a style bucket when the work carries authorship, depth, and a stronger sense of place than themed merchandise.',
    ],
  },
  {
    subhead: 'What makes this artwork different',
    paragraphs: [
      'At K4 Studios the work is built through a painterly photographic process where tone, atmosphere, and restraint do as much work as subject. That means the broad phrase Western artwork can still land on something authored: images that feel collected rather than sourced, and lived with rather than merely matched to a room.',
      'The finished works are rooted in camera-based photography and shaped through Wayne Heim\'s trained illustrator eye - light, color, texture, atmosphere, focus, and judgment working together rather than formulaic production.',
      'The narrower branches below move through landscapes, portraits, narrative work, and collector formats while keeping the larger Western-art frame intact.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Western Landscape Art',
    eyebrow: 'Landscape Route',
    href: '/western-landscape-art',
    description: 'Follow the atmospheric branch where mountains, water, Tetons, and Western light carry the work.',
    cta: 'Explore landscape artwork -',
    accent: '#5b6b70',
    featured: true,
  },
  {
    title: 'Western Portrait Photography',
    eyebrow: 'Portrait Route',
    href: '/western-portrait-photography',
    description: 'Move into portrait-driven work where the individual matters as much as the archetype.',
    cta: 'Open portrait works -',
    accent: '#7b5438',
  },
  {
    title: 'Western Photography Prints',
    eyebrow: 'Collector Route',
    hideEyebrow: true,
    href: '/Western-Photography-Prints',
    description: 'A print-focused path for comparing images as purchasable works across collector formats.',
    cta: 'Shop the print path -',
    accent: '#6c5a4d',
  },
  {
    title: 'Western Wall Art',
    eyebrow: 'Commercial Route',
    hideEyebrow: true,
    href: '/Western-Wall-Art',
    description: 'Western prints, Western wall decor, room placement, and print formats for display-focused collectors.',
    cta: 'Explore wall art -',
    accent: '#70523c',
  },
];

export const featuredReadingTitle = 'Exploring Art, Story and Atmosphere';
export const featuredReadingIntro = 'These related guides add history, definition, and craft context around the larger Western artwork tradition.';

export const featuredReadingItems = [
  {
    title: 'Art of the West',
    href: '/Art-of-the-West',
    description: 'A wider look at the artistic field behind the Western artwork tradition.',
    eyebrow: 'Concept',
  },
  {
    title: 'What Is Western Art?',
    href: '/Blog/what-is-western-art',
    description: 'See the historical definition behind the broader Western art tradition.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Narrative Photography?',
    href: '/Blog/what-is-narrative-photography',
    description: 'Follow the story-bearing branch where a still image implies a larger unseen sequence.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Painterly Photography?',
    href: '/Blog/what-is-painterly-photography',
    description: 'Understand why authored tone and atmosphere matter when a broad category term has to lead to serious work.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(cowboyColorGallery, cowboyPath, 0, 4, 'Western portrait artwork by Wayne Heim', heroSlideIds),
  ...selectGridImages(narrativeColorGallery, narrativePath, 0, 4, 'Narrative Western artwork by Wayne Heim', heroSlideIds),
  ...selectGridImages(mountainsGallery, mountainsPath, 0, 2, 'Western mountain artwork by Wayne Heim', heroSlideIds),
  ...selectGridImages(waterGallery, waterPath, 0, 2, 'Western landscape artwork by Wayne Heim', heroSlideIds),
];

export const collection = {
  kicker: 'Artwork Paths',
  title: 'Three Branches of Western Artwork',
  intro: 'Western artwork spans portraiture, narrative frontier scenes, and landscape work without losing the larger tradition that connects them.',
};

export const collectionGroups = [
  {
    title: 'Western Portrait Artwork',
    description: 'Character-led work where weathering, posture, and implied history keep the frame human before it becomes iconic.',
    rows: [
      {
        label: 'Portrait Selection',
        href: cowboyPath,
        cta: 'See more portraits',
        items: selectCollectionPreviewRow(
          cowboyColorGallery,
          cowboyPath,
          0,
          4,
          'Western portrait artwork by Wayne Heim',
          'Portraits',
          heroSlideIds,
        ),
      },
    ],
  },
  {
    title: 'Narrative Frontier Artwork',
    description: 'Story-driven scenes where the visible moment carries the pressure of what came before and what may follow after.',
    rows: [
      {
        label: 'Narrative Selection',
        href: narrativePath,
        cta: 'See more narrative works',
        items: selectCollectionPreviewRow(
          narrativeColorGallery,
          narrativePath,
          0,
          4,
          'Narrative Western artwork by Wayne Heim',
          'Narratives',
          heroSlideIds,
        ),
      },
    ],
  },
  {
    title: 'Western Landscape Artwork',
    description: 'Mountain and water-driven work that keeps the land active as emotional structure rather than decorative filler.',
    rows: [
      {
        label: 'Landscape Selection',
        href: mountainsPath,
        cta: 'See more landscapes',
        items: [
          ...selectCollectionPreviewRow(
            mountainsGallery,
            mountainsPath,
            0,
            2,
            'Western mountain artwork by Wayne Heim',
            'Mountains',
            heroSlideIds,
          ),
          ...selectCollectionPreviewRow(
            waterGallery,
            waterPath,
            0,
            2,
            'Western landscape artwork by Wayne Heim',
            'Water',
            heroSlideIds,
          ),
        ],
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Artwork Questions',
  title: 'Western Artwork FAQ',
};

export const faqItems = [
  {
    q: 'What does Western artwork include?',
    a: [
      'It means a broader authored field rather than a single subject bucket: portraiture, narrative frontier scenes, and landscapes connected by painterly treatment, atmosphere, and collector-grade intent.',
    ],
  },
  {
    q: 'Does western themed art belong here too?',
    a: [
      'Yes, when the work carries more depth than theme-based decor alone. Wayne Heim\'s Western themed art is shaped through atmosphere, historical memory, and painterly photographic treatment.',
    ],
  },
  {
    q: 'Can I buy the work shown here?',
    a: [
      'Yes. The linked galleries and print routes open into purchasable works across archival paper and selected wood formats depending on the image.',
    ],
  },
  {
    q: 'Why combine portraits, narratives, and landscapes under one route?',
    a: [
      'Because western artwork is inherently broad. Portraits, narrative scenes, and landscapes each carry a different part of the Western tradition, and each branch supports a different kind of collector interest.',
    ],
  },
  {
    q: 'Where should I go if I want the historical definition behind the category?',
    a: [
      'Start with <a href="/Art-of-the-West">Art of the West</a> or <a href="/Blog/what-is-western-art">What Is Western Art?</a> if you want the concept and history behind the label rather than the shopping route.',
    ],
  },
];

export const pageMeta = {
  title: 'Western Artwork | Western Art Prints & Painterly Western Art',
  description: 'Western artwork by Wayne Heim blending fine art photography, painterly finishing, cowboy history, frontier life, and cinematic storytelling into collectible Western art prints.',
};

export const structuredAbout = [
  'Western Artwork',
  'Western Themed Art',
  'Narrative Western Art',
  'Western Portraits',
  'Western Landscape Art',
];

export const webPageAbout = [
  'Western Artwork',
  'Western Fine Art',
  'Painterly Western Photography',
  'Western Themed Art',
];

export const genre = 'Western Artwork';
export const collectionAltPrefix = 'Western artwork';
