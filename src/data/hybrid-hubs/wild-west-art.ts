import { galleryData as cowboyColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBwGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as narrativeColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as narrativeBwGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';
import { galleryData as naColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';
import { galleryData as naBwGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs';

const cowboyColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const cowboyBwPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White';
const narrativeColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const narrativeBwPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White';
const naColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color';
const naBwPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White';

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

function buildHybridSlides(data: any[], hrefBase: string, count: number, fallbackStory: string, offset: number = 0) {
  return cleanItems(data)
    .slice(offset, offset + count)
    .map((item: any) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: ensureAlt(item, 'Wild West art by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/wild-west-art';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West';
export const gridBasePath = narrativeColorPath;
export const galleryPaths = [narrativeColorPath, narrativeBwPath, cowboyColorPath, cowboyBwPath, naColorPath, naBwPath];

export const landing = {
  title: 'Wild West Art',
  subtitle: 'Wild West art shaped through painterly photography, frontier storytelling, cowboy imagery, and cinematic scenes of the American West.',
  keywords: [
    'wild west art',
    'wild west artwork',
    'old west art',
    'wild west poster',
    'old west posters',
    'wild west paintings',
    'wild west photos',
    'wild west pictures',
    'pictures wild west',
    'western frontier art',
    'frontier art',
    'frontier western art',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Wild West Art</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Wild West Art', item: 'https://www.k4studios.com/wild-west-art' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(narrativeColorGallery, narrativeColorPath, 2, 'Wild West narratives where the frame holds a before and after.'),
    ...buildHybridSlides(cowboyColorGallery, cowboyColorPath, 2, 'Portrait-driven frontier work where age, duty, and weather stay visible.'),
    ...buildHybridSlides(naColorGallery, naColorPath, 2, 'Foundational portrait work that widens the West beyond cowboy shorthand.', 1),
  ],
  galleryBasePath: narrativeColorPath,
  kicker: 'Selected Frontier Works',
  counterLabel: 'Scene',
};

const heroSlideIds = hybridCarouselProps.slides.map((slide: any) => slide.id);

export const storyBlocks = [
  {
    title: 'Wild West Art',
    subhead: 'The phrase only matters if it points past costume and cliché.',
    paragraphs: [
      'Wild West art is one of those terms people use because they know the atmosphere they want before they know the exact category. They may mean vintage cowboy art, old western art, or frontier scenes that feel steeped in myth. The stronger route is not to deny that language, but to deepen it until the search lands on work with real narrative and historical pressure.',
      'That is why this page sits closer to frontier memory than to novelty nostalgia. The Wild West becomes meaningful when the legend is forced back through the people, land, silence, and consequence that produced it. For the historical bridge behind the phrase, see <a href="/american-wild-west">American Wild West</a>; this page remains the art, prints, posters, and collector route.',
    ],
  },
  {
    subhead: 'Vintage does not have to mean hollow',
    paragraphs: [
      'Vintage western art often gets reduced to distressed surfaces and familiar tropes. Better Wild West artwork keeps the age and atmosphere, but restores the human stakes. A pause before violence. A weathered face. A railroad confrontation. A quiet portrait that feels older than the label wrapped around it.',
      'This page therefore brings together narrative frontier scenes, old-West portraiture, and deeper historical foundations. It lets the visitor start with the phrase Wild West art and then discover whether they really want a definition page, a print-buying page, or the deeper frontier galleries themselves.',
    ],
  },
  {
    subhead: 'Old West feeling, authored rather than imitated',
    paragraphs: [
      'At K4 Studios the Wild West branch is built through painterly photography, not retro effects. Tone, restraint, and atmospheric control carry the period feeling. The result can speak to visitors searching vintage western art while still holding up as collected work rather than themed decor.',
      'From here the paths divide naturally into narrative scenes, black-and-white frontier portraits, and historically grounded Native portrait work that widens the story beyond the usual icons.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Wild West Collection',
    eyebrow: 'Primary Frontier Route',
    href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West',
    description: 'Move into the main Wild West gateway where frontier themes branch into narratives, portraits, and Native histories.',
    cta: 'Explore the Wild West collection -',
    accent: '#6f4f3d',
    featured: true,
  },
  {
    title: 'Old Western Art',
    eyebrow: 'Definition Route',
    href: '/old-western-art',
    description: 'Use the exact-match definition page if the visitor is really asking what old western art means and how the term differs from literal antique art.',
    cta: 'Read the definition -',
    accent: '#7a614f',
  },
  {
    title: 'American Wild West',
    eyebrow: 'Historical Bridge',
    href: '/american-wild-west',
    description: 'Read the cultural and historical bridge page when the visitor needs the frontier context before choosing Wild West art or prints.',
    cta: 'Read the bridge -',
    accent: '#6b5548',
  },
  {
    title: 'Women of the Wild West',
    eyebrow: 'Subject Route',
    hideEyebrow: true,
    href: '/women-of-the-wild-west',
    description: 'Follow the subject page for frontier women, women of the Old West, and the featured Women of the West video route.',
    cta: 'Explore frontier women -',
    accent: '#6f5148',
  },
  {
    title: 'Vintage Western Art',
    eyebrow: 'Commercial Route',
    hideEyebrow: true,
    href: '/vintage-western-art',
    description: 'Follow the curated commercial page if the visitor wants vintage western art or vintage cowboy art with clearer print-buying intent.',
    cta: 'Shop vintage western art -',
    accent: '#55504c',
  },
];

export const featuredReadingTitle = 'Exploring Frontier Memory and Legend';
export const featuredReadingIntro = 'These supporting pages explain why the Wild West can still operate as serious art language instead of mere nostalgia.';

export const featuredReadingItems = [
  {
    title: 'Art of the West',
    href: '/Art-of-the-West',
    description: 'Use the broader concept page to place Wild West art inside the larger field of Western art rather than inside a novelty silo.',
    eyebrow: 'Concept',
  },
  {
    title: 'Narrative Western Art',
    href: '/Narrative-Western-Art',
    description: 'Follow the story-bearing branch where implication matters more than action alone.',
    eyebrow: 'Guide',
  },
  {
    title: 'Old Western Art',
    href: '/old-western-art',
    description: 'See how old western art is being defined here as contemporary work that carries 1880s-era frontier story and atmosphere rather than antique-object collecting.',
    eyebrow: 'Guide',
  },
  {
    title: 'Vintage Western Art',
    href: '/vintage-western-art',
    description: 'Use the commercial route when the frontier mood is already right and the visitor wants a curated page of purchasable work.',
    eyebrow: 'Prints',
  },
];

export const gridImages = [
  ...selectGridImages(narrativeColorGallery, narrativeColorPath, 0, 4, 'Wild West narrative artwork by Wayne Heim', heroSlideIds),
  ...selectGridImages(cowboyBwGallery, cowboyBwPath, 0, 4, 'Old West portrait artwork by Wayne Heim', heroSlideIds),
  ...selectGridImages(naColorGallery, naColorPath, 0, 2, 'Frontier portrait artwork by Wayne Heim', heroSlideIds),
  ...selectGridImages(narrativeBwGallery, narrativeBwPath, 0, 2, 'Vintage western artwork by Wayne Heim', heroSlideIds),
];

export const collection = {
  kicker: 'Frontier Branches',
  title: 'Wild West Art by Theme',
  intro: 'The phrase gathers several adjacent search intents, so the page breaks them into the real visual branches that carry the frontier feeling.',
};

export const collectionGroups = [
  {
    title: 'Wild West Narratives',
    description: 'Scenes where confrontation, suspense, aftermath, and implied motion keep the frontier alive beyond the visible instant.',
    rows: [
      {
        label: 'Color Collection',
        href: narrativeColorPath,
        cta: 'See more color narratives',
        items: selectCollectionPreviewRow(
          narrativeColorGallery,
          narrativeColorPath,
          0,
          4,
          'Wild West narrative artwork by Wayne Heim',
          'Narratives / Color',
          heroSlideIds,
        ),
      },
      {
        label: 'Black and White Collection',
        href: narrativeBwPath,
        cta: 'See more black and white narratives',
        items: selectCollectionPreviewRow(
          narrativeBwGallery,
          narrativeBwPath,
          0,
          4,
          'Black and white Wild West artwork by Wayne Heim',
          'Narratives / Black and White',
          heroSlideIds,
        ),
      },
    ],
  },
  {
    title: 'Old West Portraits',
    description: 'Portrait-led work where grit, character, restraint, and period feeling make vintage cowboy art land as something human rather than theatrical.',
    rows: [
      {
        label: 'Color Collection',
        href: cowboyColorPath,
        cta: 'See more color portraits',
        items: selectCollectionPreviewRow(
          cowboyColorGallery,
          cowboyColorPath,
          0,
          4,
          'Vintage cowboy artwork by Wayne Heim',
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
          0,
          4,
          'Old western portrait artwork by Wayne Heim',
          'Portraits / Black and White',
          heroSlideIds,
        ),
      },
    ],
  },
  {
    title: 'Broader Frontier Foundations',
    description: 'Portrait work that keeps Wild West art connected to older human and cultural foundations rather than reducing the frontier to one mythology.',
    rows: [
      {
        label: 'Color Collection',
        href: naColorPath,
        cta: 'See more Native portraits',
        items: selectCollectionPreviewRow(
          naColorGallery,
          naColorPath,
          0,
          4,
          'Frontier portrait artwork by Wayne Heim',
          'Native Portraits / Color',
          heroSlideIds,
        ),
      },
      {
        label: 'Black and White Collection',
        href: naBwPath,
        cta: 'See more black and white Native portraits',
        items: selectCollectionPreviewRow(
          naBwGallery,
          naBwPath,
          0,
          4,
          'Black and white frontier portrait artwork by Wayne Heim',
          'Native Portraits / Black and White',
          heroSlideIds,
        ),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Frontier Questions',
  title: 'Wild West Art FAQ',
};

export const faqItems = [
  {
    q: 'What does Wild West art mean on this page?',
    a: [
      'It means frontier-focused artwork shaped by narrative tension, old-West portraiture, and painterly atmosphere rather than novelty Western motifs alone.',
    ],
  },
  {
    q: 'Where should I go if I want old western art or vintage western art more directly?',
    a: [
      'Use <a href="/old-western-art">Old Western Art</a> for the definition layer or <a href="/vintage-western-art">Vintage Western Art</a> for the curated commercial route. This page stays broader and discovery-oriented.',
    ],
  },
  {
    q: 'Is this the same as the American Wild West page?',
    a: [
      'No. <a href="/american-wild-west">American Wild West</a> is the historical bridge page. Wild West Art is the visual and collector route for Wild West artwork, Old West art, frontier artwork, prints, posters, and image browsing.',
    ],
  },
  {
    q: 'Why include Native portrait work under Wild West art?',
    a: [
      'Because the American frontier was never carried by one mythology alone. The stronger Wild West route widens the historical field instead of narrowing it to cowboy shorthand.',
    ],
  },
  {
    q: 'Can I buy prints from these Wild West collections?',
    a: [
      'Yes. The linked galleries open into purchasable works and print-format routes for collectors who want to move from frontier mood into a specific image choice.',
    ],
  },
  {
    q: 'Where should I go if I want the broader Western art concept instead of just the Wild West branch?',
    a: [
      'Use <a href="/Art-of-the-West">Art of the West</a> or <a href="/Blog/what-is-western-art">What Is Western Art?</a> if you want the larger field behind the frontier branch.',
    ],
  },
];

export const pageMeta = {
  title: 'Wild West Art | Frontier Artwork by Wayne Heim – K4 Studios',
  description: 'Wild West art by Wayne Heim featuring frontier artwork, wild west photos, old west art, cowboy imagery, painterly photography, and cinematic scenes of the American West.',
};

export const structuredAbout = [
  'Wild West Art',
  'Old West Art',
  'Wild West Posters',
  'Wild West Paintings',
  'Wild West Photos',
  'Wild West Pictures',
  'Western Frontier Art',
  'Frontier Art',
  'Narrative Western Art',
];

export const webPageAbout = [
  'Wild West Art',
  'Wild West Artwork',
  'Old West Art',
  'Old West Posters',
  'Wild West Photos',
  'Western Frontier Art',
  'Frontier Artwork',
  'Frontier Art',
];

export const genre = 'Wild West Art';
export const collectionAltPrefix = 'Wild West art';
