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
      alt: ensureAlt(item, 'Western portrait photography by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/western-portrait-photography';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';
export const gridBasePath = colorPath;

export const landing = {
  title: 'Western Portrait Photography',
  subtitle: 'Western portrait photography built around character, atmosphere, and authored presence rather than generic frontier pose or costume shorthand.',
  keywords: [
    'western portrait photography',
    'western portraits',
    'cowboy portrait photography',
    'western cowboy portraits',
    'black and white western portraits',
    'native american portrait photography',
    'western fine art portrait photography',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Portrait Photography</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Western Portrait Photography', item: 'https://www.k4studios.com/western-portrait-photography' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(colorGallery, colorPath, 2, 'Cowboy portrait work where weathering, restraint, and expression keep the frame active.'),
    ...buildHybridSlides(naGallery, naPath, 2, 'Portrait work grounded in presence, collaboration, and historical weight.', 1),
    ...buildHybridSlides(bwGallery, bwPath, 1, 'Black and white Western portraits where tone and posture do as much work as likeness.', 2),
    ...buildHybridSlides(narrativeColorGallery, narrativeColorPath, 1, 'Story-driven Western figures that feel suspended inside a larger scene.', 4),
  ],
  galleryBasePath: colorPath,
  kicker: 'Selected Portraits',
  counterLabel: 'Portrait',
};

export const storyBlocks = [
  {
    title: 'Western Portrait Photography',
    subhead: 'The strongest Western portraits do not stop at likeness.',
    paragraphs: [
      'Western portrait photography works best when the figure arrives as a person before arriving as an icon. Once the image turns into cowboy shorthand or historical costume alone, it loses the pressure that makes portraiture stay active on the wall.',
      'The better pages in this cluster succeed because they let expression, posture, weathering, and atmosphere do the heavy lifting first. The portrait feels chosen, not stacked into a category bin.',
    ],
  },
  {
    subhead: 'Why this term needs a curated route',
    paragraphs: [
      'Visitors searching Western portraits are often looking for several related things at once: cowboy portraiture, black and white Western studies, and historically grounded portrait work with more gravity than decor. The collection separates those paths without making the experience feel commercial or overbuilt.',
      'That is why the page stays selective up front, then opens into grouped portrait lanes below instead of dumping the whole archive in one flat wall.',
    ],
  },
  {
    subhead: 'What gives these portraits their hold',
    paragraphs: [
      'In this body of work, portraiture is carried by painterly light, tonal control, and the sense that a life exists outside the frame. The subject is not simply being shown. The image is asking the viewer to remain with the person a little longer.',
      'That is the bridge from Western portrait photography into the larger K4 system of narrative, atmosphere, and collector-grade print presence.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Western Black and White Photography',
    eyebrow: 'Monochrome Route',
    hideEyebrow: true,
    href: '/Western-Black-and-White-Photography',
    description: 'Follow the black-and-white path where character, contrast, and tonal restraint sharpen the portrait side of the work.',
    cta: 'See the monochrome portraits -',
    accent: '#6d5b4a',
  },
  {
    title: 'Western Cowboy Portraits',
    eyebrow: 'Primary Collection',
    href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
    description: 'Move into the main portrait collection where cowboy character, painterly light, and historical pressure hold the frame together.',
    cta: 'Explore Western cowboy portraits -',
    accent: '#7b4a28',
    featured: true,
  },
  {
    title: 'Western Fine Art Photography Collection',
    eyebrow: 'Broader Context',
    hideEyebrow: true,
    href: '/western-fine-art-photography-collection',
    description: 'Step out into the broader collection page where portraiture connects to narrative Western images and collector-facing routes.',
    cta: 'Open the broader collection -',
    accent: '#4d4037',
  },
];

export const featuredReadingTitle = 'Exploring Character, Presence and Story';
export const featuredReadingIntro = 'The stronger portrait-facing pages explain why a figure holds the frame instead of treating portraiture as a costume category. These pieces deepen that recognition without turning the page into a lecture.';

export const featuredReadingItems = [
  {
    title: 'What Is Western Cowboy Art?',
    href: '/Blog/what-is-western-cowboy-art',
    description: 'See why cowboy imagery matters only when the figure is treated as character rather than symbol.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Narrative Photography?',
    href: '/Blog/what-is-narrative-photography',
    description: 'Follow how a portrait can imply motive, tension, and a larger unseen chapter without losing stillness.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Painterly Photography?',
    href: '/Blog/what-is-painterly-photography',
    description: 'See how tone, atmosphere, and selective control turn a photographed figure into an authored image.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Visual Storytelling?',
    href: '/Blog/what-is-visual-storytelling-in-photography',
    description: 'Look at how gesture, distance, and withheld information keep portrait work open after the first look.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(colorGallery, colorPath, 1, 4, 'Western cowboy portrait by Wayne Heim'),
  ...selectGridImages(naGallery, naPath, 1, 4, 'Native American portrait by Wayne Heim'),
  ...selectGridImages(bwGallery, bwPath, 2, 2, 'Black and white Western portrait by Wayne Heim'),
  ...selectGridImages(narrativeColorGallery, narrativeColorPath, 5, 2, 'Narrative Western portrait by Wayne Heim'),
];

export const collection = {
  kicker: 'Selected Works',
  title: 'Selected Western Portrait Photography',
  intro: 'Three portrait-led groupings with paired color and black-and-white rows, built to keep the page curated while still opening deeper paths into each body of work.',
};

export const collectionGroups = [
  {
    title: 'Western Cowboy Portrait Collection',
    description: 'Portrait-driven Western work where character, weathering, and restraint keep the figure from collapsing into stereotype.',
    rows: [
      {
        label: 'Color Collection',
        href: colorPath,
        cta: 'See more cowboy portraits',
        items: selectCollectionPreviewRow(
          colorGallery,
          colorPath,
          1,
          4,
          'Western cowboy portrait by Wayne Heim',
          'Western Cowboy Portrait / Color',
        ),
      },
      {
        label: 'Black and White Collection',
        href: bwPath,
        cta: 'See more black and white cowboy portraits',
        items: selectCollectionPreviewRow(
          bwGallery,
          bwPath,
          1,
          4,
          'Black and white Western cowboy portrait by Wayne Heim',
          'Western Cowboy Portrait / Black and White',
        ),
      },
    ],
  },
  {
    title: 'Native American Collection',
    description: 'Historically grounded portrait work that adds cultural and moral weight to the wider Western portrait conversation.',
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
          'Native American portrait by Wayne Heim',
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
          'Black and white Native American portrait by Wayne Heim',
          'Native American / Black and White',
        ),
      },
    ],
  },
  {
    title: 'Western Narrative Works Collection',
    description: 'Story-driven Western images where the human figure stays active inside a larger scene, giving portrait intent a wider dramatic field.',
    rows: [
      {
        label: 'Color Collection',
        href: narrativeColorPath,
        cta: 'See more narrative Western works',
        items: selectCollectionPreviewRow(
          narrativeColorGallery,
          narrativeColorPath,
          5,
          4,
          'Narrative Western work by Wayne Heim',
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
          'Black and white narrative Western work by Wayne Heim',
          'Western Narratives / Black and White',
        ),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Collector Questions',
  title: 'Western Portrait Photography FAQ',
};

export const faqItems = [
  {
    q: 'What makes these Western portraits different from generic cowboy imagery?',
    a: [
      'The emphasis is on character, pressure, and atmosphere rather than recognizable costume alone. The portrait has to keep working after the cowboy or frontier subject is named.',
    ],
  },
  {
    q: 'Why pair color and black-and-white rows on the same page?',
    a: [
      'Because visitors responding to portraiture often move between painterly color and monochrome presence. Showing both keeps the page curated while still making those differences legible.',
    ],
  },
  {
    q: 'Is this page only about cowboy portraits?',
    a: [
      'No. Cowboy portraiture is central, but the page also opens into Native American portraits and narrative Western images where portrait presence extends into a larger story field.',
    ],
  },
  {
    q: 'Where should I go if I want only black-and-white work?',
    a: [
      'Start with <a href="/Western-Black-and-White-Photography">Western Black and White Photography</a> for the monochrome-specific route.',
    ],
  },
  {
    q: 'Can these portraits be collected as prints?',
    a: [
      'Yes. Once the image is chosen, continue into <a href="/Western-Photography-Prints">Western Photography Prints</a> or <a href="/Other/Print-Options">Print Options</a> to compare presentation formats.',
    ],
  },
  {
    q: 'Why include narrative work on a portrait page?',
    a: [
      'Because the stronger portraits here often imply a larger unseen scene. Narrative Western work shows that same pressure operating on a wider stage.',
    ],
  },
];

export const pageMeta = {
  title: 'Western Portrait Photography | Character-Driven Cowboy and Frontier Portraits – K4 Studios',
  description: 'Western portrait photography by Wayne Heim presented as a curated route into cowboy portraits, Native American portrait work, and black-and-white Western character studies.',
};

export const structuredAbout = [
  'Western Portrait Photography',
  'Western Portraits',
  'Cowboy Portrait Photography',
  'Native American Portrait Photography',
  'Western Fine Art Photography',
];

export const webPageAbout = [
  'Western Portrait Photography',
  'Western Cowboy Portraits',
  'Western Black and White Photography',
  'Western Fine Art Photography Collection',
];

export const genre = 'Western Portrait Photography';
export const collectionAltPrefix = 'Western portrait photography';
