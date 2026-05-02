import { galleryData as cowboyColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBwGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as narrativeColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as narrativeBwGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';

const cowboyColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const cowboyBwPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White';
const narrativeColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const narrativeBwPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White';

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
      alt: ensureAlt(item, 'Vintage western art by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/vintage-western-art';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West';
export const gridBasePath = narrativeColorPath;
export const galleryPaths = [narrativeColorPath, narrativeBwPath, cowboyColorPath, cowboyBwPath];

export const landing = {
  title: 'Vintage Western Art',
  subtitle: 'Vintage western art for collectors who want 1880s-era frontier feeling, cowboy presence, and painterly story weight rather than literal antique-object nostalgia.',
  keywords: [
    'vintage western art',
    'vintage cowboy art',
    'vintage western prints',
    'vintage cowboy print',
    'old western art',
    'old west posters',
    'vintage western wall art',
    'old west art',
    'old western art for sale',
    'old west wall art',
    'frontier art prints',
    'vintage western art prints',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Vintage Western Art</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Vintage Western Art', item: 'https://www.k4studios.com/vintage-western-art' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(narrativeColorGallery, narrativeColorPath, 2, 'Old-West narrative scenes that feel collected because the story pressure stays active.'),
    ...buildHybridSlides(cowboyColorGallery, cowboyColorPath, 2, 'Vintage cowboy portraits where character and weathering matter more than costume shorthand.'),
    ...buildHybridSlides(narrativeBwGallery, narrativeBwPath, 1, 'Black-and-white frontier work where tonal age and restraint do as much work as subject.', 1),
    ...buildHybridSlides(cowboyBwGallery, cowboyBwPath, 1, 'Monochrome cowboy studies that carry old-West gravity without drifting into kitsch.', 1),
  ],
  galleryBasePath: narrativeColorPath,
  kicker: 'Selected Vintage Works',
  counterLabel: 'Print',
};

const heroSlideIds = hybridCarouselProps.slides.map((slide: any) => slide.id);

export const storyBlocks = [
  {
    title: 'Vintage Western Art',
    subhead: 'The right page has to separate vintage feeling from antique-object confusion.',
    paragraphs: [
      'Vintage western art is one of those phrases people use when they want the emotional weather of the 1880s-era frontier but do not necessarily want a literal antique. They want the room presence of an older West: weathered figures, frontier interiors, hard light, story, silence, and the feeling that the image belongs to a longer American memory.',
      'That is the approach here. This page treats vintage western art as contemporary authored work that carries old-West atmosphere and story weight strongly enough to satisfy the search, while remaining collector-ready as fine art prints rather than faux-aged decor props.',
      'It is also the intended K4 route for vintage cowboy art, vintage western prints, vintage western wall art, old western art, old west art, and old west posters.',
    ],
  },
  {
    subhead: 'Vintage cowboy art should still feel human',
    paragraphs: [
      'The strongest vintage cowboy art does not lean only on hats, holsters, and sepia shorthand. It keeps the person alive inside the frame. Posture, fatigue, calculation, humor, consequence, and pressure all matter more than a costume checklist.',
      'That is why this page blends portrait-led work with narrative frontier scenes. Some collectors want the single figure. Others want the old-West room, confrontation, pursuit, or aftermath. The shared denominator is atmosphere with believable human stakes.',
    ],
  },
  {
    subhead: 'A cleaner buying route',
    paragraphs: [
      'This page is intentionally more commercial than the broader Wild West hub. It narrows the field to a curated selection, then sends visitors into the right galleries and print options once they know which branch of vintage western art they actually want to live with.',
      'That keeps vintage western prints, a single vintage cowboy print, old western art, and old west posters on one useful route instead of splitting closely related collector intent into thin pages. If the visitor needs the definition before the purchase path, the linked old-west article handles that question directly. If they already know the mood they want, the grid and collection sections below keep the path simple.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Old Western Art',
    eyebrow: 'Definition Route',
    href: '/old-western-art',
    description: 'Read the exact-match definition page if the visitor is still asking what old western art means and how it differs from literal antiques.',
    cta: 'Read the definition -',
    accent: '#715846',
  },
  {
    title: 'Wild West Art',
    eyebrow: 'Discovery Route',
    href: '/wild-west-art',
    description: 'Open the broader discovery page if the visitor wants frontier atmosphere first and can sort intent afterward.',
    cta: 'Explore the frontier hub -',
    accent: '#7b4a28',
    featured: true,
  },
  {
    title: 'Print Options',
    eyebrow: 'Collector Route',
    hideEyebrow: true,
    href: '/Other/Print-Options',
    description: 'Compare archival paper, canvas, metal, and presentation choices once the right vintage-western image has been found.',
    cta: 'Compare print formats -',
    accent: '#564a42',
  },
  {
    title: 'Western Wall Art',
    eyebrow: 'Buyer Route',
    hideEyebrow: true,
    href: '/Western-Wall-Art',
    description: 'Move to the broader commercial wall-art hub for western prints, room placement, and decor/collector buying intent.',
    cta: 'Open wall art hub -',
    accent: '#6b5040',
  },
];

export const featuredReadingTitle = 'Exploring Vintage Atmosphere, Story and Presence';
export const featuredReadingIntro = 'These supporting pages help explain why the work lands as old-West atmosphere instead of generic retro styling.';

export const featuredReadingItems = [
  {
    title: 'Old Western Art',
    href: '/old-western-art',
    description: 'See the definition page that frames old western art as contemporary imagery carrying 1880s-era frontier memory rather than antique-object collecting.',
    eyebrow: 'Guide',
  },
  {
    title: 'Art of the West',
    href: '/Art-of-the-West',
    description: 'Place the vintage frontier branch inside the larger Western-art tradition instead of leaving it stranded as a decor phrase.',
    eyebrow: 'Concept',
  },
  {
    title: 'One-Image Movie',
    href: '/One-Image-Movie',
    description: 'Follow the still-image storytelling idea that gives many frontier scenes their cinematic pressure.',
    eyebrow: 'Concept',
  },
  {
    title: 'What Is Painterly Photography?',
    href: '/Blog/what-is-painterly-photography',
    description: 'Understand why tone, atmosphere, and restraint make period-driven work feel authored rather than themed.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(narrativeColorGallery, narrativeColorPath, 2, 4, 'Vintage western narrative art by Wayne Heim', heroSlideIds),
  ...selectGridImages(cowboyColorGallery, cowboyColorPath, 2, 4, 'Vintage cowboy art by Wayne Heim', heroSlideIds),
  ...selectGridImages(narrativeBwGallery, narrativeBwPath, 1, 2, 'Black and white old western art by Wayne Heim', heroSlideIds),
  ...selectGridImages(cowboyBwGallery, cowboyBwPath, 1, 2, 'Black and white vintage cowboy portrait by Wayne Heim', heroSlideIds),
];

export const collection = {
  kicker: 'Curated Vintage Paths',
  title: 'Vintage Western Art by Collector Mood',
  intro: 'The page stays commercial, but it still breaks the work into the distinct moods collectors usually mean when they search for vintage western art.',
};

export const collectionGroups = [
  {
    title: 'Frontier Narrative Prints',
    description: 'Old-West scenes where confrontation, watchfulness, aftermath, and implied motion keep the work alive after the first glance.',
    rows: [
      {
        label: 'Color Collection',
        href: narrativeColorPath,
        cta: 'See more color narratives',
        items: selectCollectionPreviewRow(
          narrativeColorGallery,
          narrativeColorPath,
          2,
          4,
          'Vintage western narrative print by Wayne Heim',
          'Narratives / Color',
          heroSlideIds,
        ),
      },
      {
        label: 'Black and White Collection',
        href: narrativeBwPath,
        cta: 'See more monochrome narratives',
        items: selectCollectionPreviewRow(
          narrativeBwGallery,
          narrativeBwPath,
          1,
          4,
          'Black and white old western print by Wayne Heim',
          'Narratives / Black and White',
          heroSlideIds,
        ),
      },
    ],
  },
  {
    title: 'Vintage Cowboy Portrait Prints',
    description: 'Portrait-led work where grit, posture, age, and frontier restraint make the vintage feeling read as human rather than theatrical.',
    rows: [
      {
        label: 'Color Collection',
        href: cowboyColorPath,
        cta: 'See more color portraits',
        items: selectCollectionPreviewRow(
          cowboyColorGallery,
          cowboyColorPath,
          2,
          4,
          'Vintage cowboy portrait print by Wayne Heim',
          'Portraits / Color',
          heroSlideIds,
        ),
      },
      {
        label: 'Black and White Collection',
        href: cowboyBwPath,
        cta: 'See more black and white portraits',
        items: selectCollectionPreviewRow(
          cowboyBwGallery,
          cowboyBwPath,
          1,
          4,
          'Black and white vintage cowboy print by Wayne Heim',
          'Portraits / Black and White',
          heroSlideIds,
        ),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Collector Questions',
  title: 'Vintage Western Art FAQ',
};

export const faqItems = [
  {
    q: 'What does vintage western art mean on this page?',
    a: [
      'It means contemporary authored images that carry the atmosphere, costume world, restraint, and story pressure of the 1880s-era frontier. It does not mean literal antique art objects from the nineteenth century.',
    ],
  },
  {
    q: 'Is this page also meant for vintage cowboy art searches?',
    a: [
      'Yes. The portrait branch and the narrative branch both support vintage cowboy art intent, but they do so with collector-grade work rather than novelty Western decor.',
    ],
  },
  {
    q: 'Where should I go if I want the definition first?',
    a: [
      'Use <a href="/old-western-art">Old Western Art</a> if you want the meaning and framing behind the term before you move into the buying path.',
    ],
  },
  {
    q: 'Can I buy prints from the work shown here?',
    a: [
      'Yes. The linked galleries open into purchasable works, and the print-options route helps compare formats once the right image has been chosen.',
    ],
  },
  {
    q: 'Does this page cover vintage western prints and old west posters too?',
    a: [
      'Yes. Those searches usually describe the same collector path: Western imagery with old-West atmosphere that can live as a print or wall piece. This page keeps vintage western prints, vintage cowboy print, old western art, and old west posters together until there is enough evidence to split them.',
    ],
  },
  {
    q: 'How is this different from the Wild West Art page?',
    a: [
      'Wild West Art is the broader discovery page. This page is narrower and more commercial, built for visitors who already know they want vintage western or old-West wall presence.',
    ],
  },
];

export const pageMeta = {
  title: 'Vintage Western Art | Vintage Cowboy Art Prints by Wayne Heim – K4 Studios',
  description: 'Vintage western art by Wayne Heim featuring vintage cowboy art, vintage western prints, old western art, old west posters, and painterly frontier prints for collectors.',
};

export const structuredAbout = [
  'Vintage Western Art',
  'Vintage Cowboy Art',
  'Vintage Western Prints',
  'Vintage Cowboy Print',
  'Old Western Art',
  'Old West Posters',
  'Old Western Art For Sale',
  'Frontier Art Prints',
  'Wild West Art',
];

export const webPageAbout = [
  'Vintage Western Art',
  'Vintage Cowboy Art',
  'Vintage Western Prints',
  'Vintage Cowboy Print',
  'Old West Wall Art',
  'Old West Posters',
  'Frontier Art Prints',
];

export const genre = 'Vintage Western Art';
export const collectionAltPrefix = 'Vintage western art';
