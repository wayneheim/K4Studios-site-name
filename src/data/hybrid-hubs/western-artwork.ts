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
      'Western artwork is often used as a catch-all phrase, but most pages built around it collapse into either generic decor or a single narrow subject. This page works differently. It treats Western artwork as a serious authored field that can hold portraiture, narrative frontier scenes, and landscapes without flattening them into the same decorative sentence.',
      'That matters because people searching this phrase are often looking for something broader than cowboy iconography alone. They want Western artwork for sale, but they also want to know whether the work has atmosphere, seriousness, and enough visual authority to live with over time.',
    ],
  },
  {
    subhead: 'Portrait, story, and land all belong here',
    paragraphs: [
      'The West was never only a face, and it was never only a horizon. Strong Western artwork has room for both. Portraiture carries character and human weather. Narrative scenes carry tension, consequence, and memory. Landscapes carry scale, silence, and the geography that shaped everything else.',
      'Seen together, those branches create a more honest route for the term. Instead of treating Western themed art like a style bucket, the page lets the category open into the kinds of work people actually mean when they want something deeper than themed merchandise.',
    ],
  },
  {
    subhead: 'What makes this artwork different',
    paragraphs: [
      'At K4 Studios the work is built through a painterly photographic process where tone, atmosphere, and restraint do as much work as subject. That means the broad phrase Western artwork can still land on something authored: images that feel collected rather than sourced, and lived with rather than merely matched to a room.',
      'The finished works are rooted in camera-based photography and shaped through Wayne Heim\'s trained illustrator eye - light, color, texture, atmosphere, focus, and judgment working together rather than formulaic production.',
      'If the visitor wants a narrower path, the routes below break the field into landscapes, portraits, narrative work, and collector formats without losing the larger Western-art frame that brought them here in the first place.',
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
    description: 'Use the print-focused route if the visitor is ready to compare images as purchasable works rather than simply browse the category.',
    cta: 'Shop the print path -',
    accent: '#6c5a4d',
  },
  {
    title: 'Western Wall Art',
    eyebrow: 'Commercial Route',
    hideEyebrow: true,
    href: '/Western-Wall-Art',
    description: 'Use the broad wall-art page for Western prints, Western wall decor, room placement, and print-format buying intent.',
    cta: 'Explore wall art -',
    accent: '#70523c',
  },
];

export const featuredReadingTitle = 'Exploring Art, Story and Atmosphere';
export const featuredReadingIntro = 'These pages do the semantic work that the broad phrase Western artwork cannot carry by itself.';

export const featuredReadingItems = [
  {
    title: 'Art of the West',
    href: '/Art-of-the-West',
    description: 'Use the concept page when the visitor needs the larger artistic field behind the category term.',
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
  intro: 'The page keeps the broad term intact but breaks it into the actual visual families people usually mean when they search it.',
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
    q: 'What does Western artwork mean on this page?',
    a: [
      'It means a broader authored field rather than a single subject bucket: portraiture, narrative frontier scenes, and landscapes connected by painterly treatment, atmosphere, and collector-grade intent.',
    ],
  },
  {
    q: 'Is this page meant to cover western themed art too?',
    a: [
      'Yes, but in a narrowed way. The page acknowledges that searchers use western themed art as a broad phrase while directing them toward work with more depth than theme-based decor alone.',
    ],
  },
  {
    q: 'Can I buy the work shown here?',
    a: [
      'Yes. The linked galleries and print routes open into purchasable works across archival paper, canvas, and selected specialty formats depending on the image.',
    ],
  },
  {
    q: 'Why combine portraits, narratives, and landscapes under one route?',
    a: [
      'Because the term western artwork is inherently broad. A better page lets the visitor start broad, then move into the branch that matches what they actually want once the intent becomes clearer.',
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
