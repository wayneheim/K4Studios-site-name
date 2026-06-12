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
      alt: ensureAlt(item, 'Cowboy wall art by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/cowboy-wall-art';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';
export const gridBasePath = colorPath;

export const landing = {
  title: 'Cowboy Wall Art',
  subtitle: 'Cowboy wall art and cowboy artwork by Wayne Heim, shaped as painterly Western fine art prints for rooms, collectors, and frontier-story interiors.',
  keywords: [
    'cowboy wall art',
    'western cowboy wall art',
    'cowboy art prints',
    'western wall art',
    'western cowboy art prints',
    'western cowboy art',
    'cowboy artwork',
    'cowboy artwork prints',
    'cowboy paintings',
    'cowboy photos',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Cowboy Wall Art</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Cowboy Wall Art', item: 'https://www.k4studios.com/cowboy-wall-art' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(colorGallery, colorPath, 3, 'Cowboy portraiture where the figure arrives as character before it arrives as icon.'),
    ...buildHybridSlides(narrativeColorGallery, narrativeColorPath, 2, 'Narrative frontier frames where atmosphere and consequence do as much work as the subject.', 6),
    ...buildHybridSlides(bwGallery, bwPath, 1, 'Black and white cowboy work where tonal restraint keeps the myth from turning into costume.', 1),
  ],
  galleryBasePath: colorPath,
  kicker: 'Portraits and Atmosphere',
  counterLabel: 'Work',
};

export const storyBlocks = [
  {
    title: 'Cowboy Wall Art',
    subhead: 'Cowboy artwork for walls, rooms, and collector print paths.',
    paragraphs: [
      'These cowboy artworks begin as photographic scenes, then are shaped through Wayne Heim\'s painterly process into narrative Western fine art prints with the mood and presence of classic cowboy paintings.',
      'Cowboy wall art is easy to flatten into a decor category, which is exactly why the page has to stay visually disciplined. If it turns into a giant pile of images, the work starts reading like inventory instead of authored presence.',
      'The better move is to open with a stronger visual tag, define what kind of cowboy work this is, and then keep the sample tight enough that the page still feels curated.',
    ],
  },
  {
    subhead: 'What the stronger cowboy pages already prove',
    paragraphs: [
      'The K4 pages that already rank around cowboy and black-and-white Western terms are not noisy commercial pages. They let portraiture, atmosphere, and historical pressure do the heavy lifting, then route visitors into the right galleries.',
      'That calls for a cleaner wall-art and narrative presentation rather than trying to out-catalog a marketplace result.',
    ],
  },
  {
    subhead: 'What this page is really selling',
    paragraphs: [
      'At the surface it is cowboy wall art. Underneath, it opens into Western Cowboy Portraits, story-driven Western photography, and collector-grade print presentation, revealing the deeper structure instead of burying it under quantity.',
      'That is why the lower sections favor selected works, grouped collection previews, and supporting reading over endless grid expansion.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Western Cowboy Portraits',
    eyebrow: 'Primary Collection',
    href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
    description: 'Go directly into the portrait work where weathering, restraint, and human pressure push the figure past stereotype.',
    cta: 'Enter the portraits -',
    accent: '#7b4a28',
    featured: true,
  },
  {
    title: 'Cowboy Art Prints',
    eyebrow: 'Commercial Bridge',
    hideEyebrow: true,
    href: '/cowboy-art-prints',
    description: 'Move into the print-facing page that reframes cowboy intent through authorship, presence, and collector logic.',
    cta: 'Explore cowboy prints -',
    accent: '#6d5b4a',
  },
  {
    title: 'Western Wall Art',
    eyebrow: 'Buyer Route',
    hideEyebrow: true,
    href: '/Western-Wall-Art',
    description: 'Use the broader Western wall art page for room placement, Western prints, Western wall decor, and interior display intent.',
    cta: 'Open the wall art hub -',
    accent: '#73543a',
  },
  {
    title: 'Western Storytelling Photography',
    eyebrow: 'Narrative Route',
    hideEyebrow: true,
    href: '/western-storytelling-photography',
    description: 'Follow the interpretive path where the work is named more directly as story-driven, atmospheric, and unresolved.',
    cta: 'Follow the story -',
    accent: '#4d4037',
  },
];

export const featuredReadingTitle = 'Exploring Atmosphere, Story and Character';
export const featuredReadingIntro = 'The strongest cowboy-facing pages explain why the work feels more human, more atmospheric, and less generic than the usual category. These pieces support that recognition without making the page noisy.';

export const featuredReadingItems = [
  {
    title: 'What Is Western Cowboy Art?',
    href: '/Blog/what-is-western-cowboy-art',
    description: 'See how cowboy art becomes more than frontier shorthand when the figure is treated as character rather than symbol.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Makes an Image Feel Cinematic?',
    href: '/Blog/what-makes-an-image-feel-cinematic',
    description: 'Follow how implication, pacing, and restraint make a still frame feel charged beyond the first glance.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Narrative Photography?',
    href: '/Blog/what-is-narrative-photography',
    description: 'See how one frame can carry motive, consequence, and the sense of a wider unseen chapter.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Is Painterly Photography?',
    href: '/Blog/what-is-painterly-photography',
    description: 'Look at the role of tone, edge, and atmosphere in making photographic work feel authored rather than merely captured.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(colorGallery, colorPath, 0, 4, 'Cowboy wall art by Wayne Heim'),
  ...selectGridImages(narrativeColorGallery, narrativeColorPath, 8, 4, 'Narrative cowboy wall art by Wayne Heim'),
  ...selectGridImages(bwGallery, bwPath, 1, 2, 'Black and white cowboy wall art by Wayne Heim'),
  ...selectGridImages(naGallery, naPath, 1, 2, 'Native American cowboy wall art by Wayne Heim'),
];

export const collection = {
  kicker: 'Selected Works',
  title: 'Selected Cowboy Wall Art',
  intro: 'Three grouped collection lanes with paired color and black-and-white rows, built to keep the page deliberate while still opening the broader portrait and narrative system underneath.',
};

export const collectionGroups = [
  {
    title: 'Western Cowboy Portrait Collection',
    description: 'Portrait-led cowboy wall art where weathering, restraint, and painterly light carry the figure past stereotype.',
    rows: [
      {
        label: 'Color Collection',
        href: colorPath,
        cta: 'See more cowboy wall art portraits',
        items: selectCollectionPreviewRow(
          colorGallery,
          colorPath,
          0,
          4,
          'Cowboy wall art by Wayne Heim',
          'Western Cowboy Portrait / Color',
        ),
      },
      {
        label: 'Black and White Collection',
        href: bwPath,
        cta: 'See more black and white cowboy wall art',
        items: selectCollectionPreviewRow(
          bwGallery,
          bwPath,
          1,
          4,
          'Black and white cowboy wall art by Wayne Heim',
          'Western Cowboy Portrait / Black and White',
        ),
      },
    ],
  },
  {
    title: 'Western Narrative Works Collection',
    description: 'Story-driven Western wall art where implication and atmosphere keep the page from collapsing into surface theme alone.',
    rows: [
      {
        label: 'Color Collection',
        href: narrativeColorPath,
        cta: 'See more narrative Western wall art',
        items: selectCollectionPreviewRow(
          narrativeColorGallery,
          narrativeColorPath,
          8,
          4,
          'Narrative cowboy wall art by Wayne Heim',
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
          'Black and white narrative Western wall art by Wayne Heim',
          'Western Narratives / Black and White',
        ),
      },
    ],
  },
  {
    title: 'Native American Collection',
    description: 'Historically grounded portrait work that adds cultural and visual depth to the broader cowboy wall art route.',
    rows: [
      {
        label: 'Color Collection',
        href: naPath,
        cta: 'See more Native American wall art portraits',
        items: selectCollectionPreviewRow(
          naGallery,
          naPath,
          1,
          4,
          'Native American wall art portrait by Wayne Heim',
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
          'Black and white Native American wall art portrait by Wayne Heim',
          'Native American / Black and White',
        ),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Collector Questions',
  title: 'Cowboy Wall Art FAQ',
};

export const faqItems = [
  {
    q: 'What separates this from generic cowboy wall decor?',
    a: [
      'The emphasis is on character, atmosphere, and consequence rather than nostalgia alone. The work is meant to stay visually active rather than resolve itself at first glance.',
    ],
  },
  {
    q: 'Why keep the page to grouped previews instead of a huge grid?',
    a: [
      'Because a grouped page protects the feel of the work. Once the interface starts acting like an oversized catalog, it stops helping the visitor recognize what makes the images distinct.',
    ],
  },
  {
    q: 'Where should I go if I want the full portrait collection?',
    a: [
      'Go directly to <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits">Western Cowboy Portraits</a> for the broader portrait index and deeper collection view.',
    ],
  },
  {
    q: 'Is this page more about wall art or prints?',
    a: [
      'It begins with wall-art intent, but it naturally connects to print decisions and collector routes. If you are focused on editions and formats, continue to <a href="/cowboy-art-prints">Cowboy Art Prints</a> or <a href="/Other/Print-Options">Print Options</a>.',
    ],
  },
  {
    q: 'Why include narrative and Native American groupings here?',
    a: [
      'Because many visitors responding to cowboy wall art are actually reacting to atmosphere, withheld story, and the broader human weight of the Western body of work. Those grouped lanes make that visible.',
    ],
  },
  {
    q: 'Can these works be collected beyond standard paper prints?',
    a: [
      'Yes. Select works are available across archival paper and select wood presentation routes depending on the image and series.',
    ],
  },
];

export const pageMeta = {
  title: 'Cowboy Wall Art | Cowboy Artwork & Western Cowboy Art Prints',
  description: 'Cowboy wall art by Wayne Heim featuring cowboy artwork, Western cowboy art prints, painterly cowboy photography, and narrative frontier portraits for collectors and rooms.',
};

export const structuredAbout = [
  'Cowboy Wall Art',
  'Western Cowboy Portraits',
  'Cowboy Art Prints',
  'Western Storytelling Photography',
  'Western Wall Art',
];

export const webPageAbout = [
  'Cowboy Wall Art',
  'Western Cowboy Portraits',
  'Cowboy Art Prints',
  'Western Storytelling Photography',
];

export const genre = 'Cowboy Wall Art';
export const collectionAltPrefix = 'Cowboy wall art';
