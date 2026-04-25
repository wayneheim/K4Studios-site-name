import { galleryData as colorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as bwGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as narrativeColorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as narrativeBwGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';
import { galleryData as naGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';
import { galleryData as naBwGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs';

const colorPath =
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const bwPath =
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White';
const narrativeColorPath =
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const narrativeBwPath =
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White';
const naPath =
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color';
const naBwPath =
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White';

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

function selectGridImages(data: any[], hrefBase: string, offset: number, count: number, fallbackAlt: string) {
  return cleanItems(data)
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
) {
  return cleanItems(data)
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
      alt: ensureAlt(item, 'Western photography print by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/Western-Photography-Prints';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';
export const gridBasePath = colorPath;

export const landing = {
  title: 'Western Photography Prints',
  subtitle: 'Western photography prints that work as authored entry points into story, atmosphere, and collector-grade presence rather than generic category inventory.',
  keywords: [
    'western photography prints',
    'western art prints',
    'western prints',
    'cowboy art prints',
    'western fine art prints',
    'western wall art',
    'cowboy wall art',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Photography Prints</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Western Photography Prints', item: 'https://www.k4studios.com/Western-Photography-Prints' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(colorGallery, colorPath, 2, 'Cowboy portraiture where weathering, restraint, and presence keep the frame active.'),
    ...buildHybridSlides(narrativeColorGallery, narrativeColorPath, 2, 'Narrative Western images that carry the pressure of a larger story.', 4),
    ...buildHybridSlides(bwGallery, bwPath, 1, 'Black and white Western prints where tonal control does as much work as subject.', 2),
    ...buildHybridSlides(naGallery, naPath, 1, 'Historically grounded portrait work that gives the broader print path moral and visual weight.', 1),
  ],
  galleryBasePath: colorPath,
  kicker: 'Selected Prints',
  counterLabel: 'Print',
};

export const storyBlocks = [
  {
    title: 'Western Photography Prints',
    subhead: 'A print page should feel curated, not piled high.',
    paragraphs: [
      'Western photography prints should not behave like a crowded storefront. The stronger move is to name the kind of work being offered, show a restrained sample, and let the visitor feel where the deeper story actually lives.',
      'Many visitors arrive through plain-language intent like western art prints, western prints, cowboy art prints, or western wall art. This page keeps that doorway open while preserving K4\'s narrative-first standard.',
      'That matters here because the winning K4 pages in search are not generic catalog pages. They are cleaner hybrid pages and gallery endpoints that frame the work through atmosphere, narrative pressure, and authorship before asking for commitment.',
    ],
  },
  {
    subhead: 'What makes these Western prints different',
    paragraphs: [
      'These prints are built from cowboy portraits, Wild West narratives, and historically grounded images that keep atmosphere and consequence active on the wall. They are not just Western subjects translated into product language.',
      'The page therefore works best when it meets print intent at the surface, then gradually reveals the deeper visual system underneath.',
    ],
  },
  {
    subhead: 'Where the page should send the visitor',
    paragraphs: [
      'Some visitors need a clean wall-art path. Others need the narrative bridge that explains why the work feels cinematic or unresolved. Others are ready for formats and collector options. This page should open those routes without turning into all of them at once.',
      'For stronger subject routes, continue into <a href="/Cowboy-Fine-Art-Photography">Cowboy Fine Art Photography</a>, <a href="/wild-west-art">Wild West photography and art</a>, and <a href="/western-portrait-photography">cowgirl and Western portrait photography</a>.',
      'That is why the sample below stays selective and the lower sections push into Western Wall Art, Western Storytelling Photography, and print-format decisions instead of dumping the full archive up front.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Western Storytelling Photography',
    eyebrow: 'Narrative Bridge',
    hideEyebrow: true,
    href: '/western-storytelling-photography',
    description: 'Move into the interpretive page that explains how one frame can carry the moment before and the moment after.',
    cta: 'Follow the story -',
    accent: '#6d5b4a',
  },
  {
    title: 'Western Wall Art Prints',
    eyebrow: 'Primary Western Print Path',
    href: '/Western-Wall-Art',
    description: 'Follow the cleaner wall-art path where Western print intent turns into room presence without losing the authored feel that makes the work different.',
    cta: 'Explore Western Wall Art Prints -',
    accent: '#7b4a28',
    featured: true,
  },
  {
    title: 'Print Options',
    eyebrow: 'Collector Route',
    hideEyebrow: true,
    href: '/Other/Print-Options',
    description: 'Compare archival paper, canvas, metal, and presentation choices once the image itself has earned the space.',
    cta: 'Compare formats -',
    accent: '#4d4037',
  },
];

export const featuredReadingTitle = 'Exploring Atmosphere, Story and Presence';
export const featuredReadingIntro = 'The pages that perform best for this site explain what the work is doing before they lean on product language. These are the supporting guides that make the print page feel deeper rather than busier.';

export const featuredReadingItems = [
  {
    title: 'What Makes an Image Feel Cinematic?',
    href: '/Blog/what-makes-an-image-feel-cinematic',
    description: 'See why cinematic force comes from implication, pacing, and withheld information rather than surface treatment alone.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Narrative Photography?',
    href: '/Blog/what-is-narrative-photography',
    description: 'Follow the story structure beneath the frame and see how a still image can hold a larger unseen chapter.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Visual Storytelling?',
    href: '/Blog/what-is-visual-storytelling-in-photography',
    description: 'Look at how motive, tension, and consequence can be felt without the picture ever spelling the scene out.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Painterly Photography?',
    href: '/Blog/what-is-painterly-photography',
    description: 'See how tone, edge, and atmosphere make a photograph feel authored rather than merely recorded.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(colorGallery, colorPath, 2, 4, 'Western cowboy portrait print by Wayne Heim'),
  ...selectGridImages(narrativeColorGallery, narrativeColorPath, 5, 4, 'Narrative Western print by Wayne Heim'),
  ...selectGridImages(bwGallery, bwPath, 2, 2, 'Black and white Western print by Wayne Heim'),
  ...selectGridImages(naGallery, naPath, 1, 2, 'Historically grounded portrait print by Wayne Heim'),
];

export const collection = {
  kicker: 'Selected Works',
  title: 'Selected Western Photography Prints',
  intro: 'Three collection groupings with paired color and black-and-white rows, built to feel curated while still giving visitors a clear path deeper into each body of work.',
};

export const collectionGroups = [
  {
    title: 'Western Narrative Works',
    description: 'A story-driven Western print collection where implication, tension, and aftermath keep the frame open after the first look.',
    rows: [
      {
        label: 'Color Collection',
        href: narrativeColorPath,
        cta: 'See more narrative works',
        items: selectCollectionPreviewRow(
          narrativeColorGallery,
          narrativeColorPath,
          5,
          4,
          'Narrative Western print by Wayne Heim',
          'Western Narratives / Color',
        ),
      },
      {
        label: 'Black and White Collection',
        href: narrativeBwPath,
        cta: 'See more black and white narratives',
        items: selectCollectionPreviewRow(
          narrativeBwGallery,
          narrativeBwPath,
          1,
          4,
          'Black and white narrative Western print by Wayne Heim',
          'Western Narratives / Black and White',
        ),
      },
    ],
  },
  {
    title: 'Western Cowboy Portrait Collection',
    description: 'A portrait-driven Western print collection where character, weathering, and restraint do the work before the product language starts.',
    rows: [
      {
        label: 'Color Collection',
        href: colorPath,
        cta: 'See more color portraits',
        items: selectCollectionPreviewRow(
          colorGallery,
          colorPath,
          2,
          4,
          'Western cowboy portrait print by Wayne Heim',
          'Western Cowboy Portrait / Color',
        ),
      },
      {
        label: 'Black and White Collection',
        href: bwPath,
        cta: 'See more black and white portraits',
        items: selectCollectionPreviewRow(
          bwGallery,
          bwPath,
          2,
          4,
          'Black and white Western cowboy portrait print by Wayne Heim',
          'Western Cowboy Portrait / Black and White',
        ),
      },
    ],
  },
  {
    title: 'Native American Collection',
    description: 'A historically grounded portrait collection that adds moral and visual weight to the larger Western print path.',
    rows: [
      {
        label: 'Color Collection',
        href: naPath,
        cta: 'See more Native American portraits',
        items: selectCollectionPreviewRow(
          naGallery,
          naPath,
          1,
          4,
          'Native American portrait print by Wayne Heim',
          'Native American / Color',
        ),
      },
      {
        label: 'Black and White Collection',
        href: naBwPath,
        cta: 'See more black and white Native American portraits',
        items: selectCollectionPreviewRow(
          naBwGallery,
          naBwPath,
          0,
          4,
          'Black and white Native American portrait print by Wayne Heim',
          'Native American / Black and White',
        ),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Collector Questions',
  title: 'Western Photography Prints FAQ',
};

export const faqItems = [
  {
    q: 'What makes these Western photography prints different from generic Western decor?',
    a: [
      'They are built around atmosphere, character, and narrative pressure rather than relying only on familiar Western signals. The subject matters, but so does the authored structure around it.',
    ],
  },
  {
    q: 'Why show only a smaller selection on this page?',
    a: [
      'Because this page works better as a curated entry point. A selective group of images keeps the work feeling intentional, then the linked paths carry visitors deeper into the right collections.',
    ],
  },
  {
    q: 'Are these open editions or limited editions?',
    a: [
      'Both. Some works are available as open archival prints, while select images are offered as signed or limited editions depending on the series and presentation format.',
    ],
  },
  {
    q: 'Where should I go if I want the cleaner wall-art path?',
    a: [
      'Start with <a href="/Western-Wall-Art">Western Wall Art</a> if your intent is primarily about how the work lives in a room. It keeps the interface cleaner while still routing into the deeper K4 system.',
    ],
  },
  {
    q: 'Where should I go if I want more story and less product language?',
    a: [
      'Move into <a href="/western-storytelling-photography">Western Storytelling Photography</a> or the <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West">Wild West</a> collection if what you are really responding to is atmosphere, tension, and narrative structure.',
    ],
  },
  {
    q: 'Can I compare print materials before choosing an image?',
    a: [
      'Yes. The <a href="/Other/Print-Options">Print Options</a> page explains archival paper, canvas, metal, and related presentation choices so the format decision can follow the image decision.',
    ],
  },
];

export const pageMeta = {
  title: 'Western Photography Prints | Curated Western Art Prints by Wayne Heim – K4 Studios',
  description: 'Western photography prints by Wayne Heim presented as a curated entry into story-driven cowboy portraits, Wild West narratives, and collector-grade Western wall presence.',
};

export const structuredAbout = [
  'Western Photography Prints',
  'Western Art Prints',
  'Western Wall Art',
  'Narrative Western Art',
  'Cowboy Art Prints',
];

export const webPageAbout = [
  'Western Photography Prints',
  'Western Wall Art',
  'Western Storytelling Photography',
  'Print Options',
];

export const genre = 'Western Photography Prints';
export const collectionAltPrefix = 'Western photography print';