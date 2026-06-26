import { galleryData as warColorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs';
import { galleryData as warBWGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs';
import { galleryData as machinesColorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs';
import { galleryData as machinesBWGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs';
import { galleryData as portraitsColorGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs';
import { galleryData as portraitsBWGallery }
  from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs';

const wwiiPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII';
const warColorPath = `${wwiiPath}/War/Color`;
const warBWPath = `${wwiiPath}/War/Black-White`;
const machinesColorPath = `${wwiiPath}/Machines/Color`;
const machinesBWPath = `${wwiiPath}/Machines/Black-White`;
const portraitsColorPath = `${wwiiPath}/Portraits/Color`;
const portraitsBWPath = `${wwiiPath}/Portraits/Black-White`;

function cleanItems(data: any[]) {
  return (data || [])
    .filter((item: any) => item && typeof item.id === 'string')
    .filter((item: any) => item.id !== 'i-k4studios')
    .filter((item: any) => item.visibility !== 'ghost' && item.visibility !== 'hidden' && item.visibility !== 'hide')
    .sort((a: any, b: any) => {
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
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

function buildHybridSlides(data: any[], hrefBase: string, count: number, fallbackStory: string, offset: number = 0) {
  return cleanItems(data)
    .slice(offset, offset + count)
    .map((item: any) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: ensureAlt(item, 'WWII themed fine art print by Wayne Heim'),
      story: (item.story || item.description || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

export const pagePath = '/WWII-Themed-Fine-Art-Prints';
export const imageSectionPath = wwiiPath;
export const gridBasePath = warColorPath;
export const galleryPaths = [
  warColorPath,
  warBWPath,
  machinesColorPath,
  machinesBWPath,
  portraitsColorPath,
  portraitsBWPath,
];

export const landing = {
  title: 'WWII Themed Fine Art Prints',
  subtitle: 'Contemporary World War II inspired wall art and collector prints built with living historians, period detail, painterly light, and narrative intent.',
  keywords: [
    'WWII themed fine art prints',
    'WWII inspired art prints',
    'WWII themed photography prints',
    'WWII wall art',
    'World War II inspired wall art',
    'military history art prints',
    'WWII reenactment photography prints',
    'historically themed fine art photography',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <a class="breadcrumb-link" href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII">WWII</a> / <span class="breadcrumb-current">WWII Themed Fine Art Prints</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'WWII Fine Art Photography', item: 'https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII' },
  { name: 'WWII Themed Fine Art Prints', item: 'https://www.k4studios.com/WWII-Themed-Fine-Art-Prints' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlides(warColorGallery, warColorPath, 2, 'WWII themed fine art where battle pressure is held through light and restraint.'),
    ...buildHybridSlides(machinesColorGallery, machinesColorPath, 2, 'Military machines and human consequence shaped as painterly war-themed art.', 1),
    ...buildHybridSlides(portraitsColorGallery, portraitsColorPath, 2, 'WWII inspired portraits where service, fatigue, and memory carry the frame.', 1),
  ],
  galleryBasePath: warColorPath,
  kicker: 'Selected WWII Works',
  counterLabel: 'WWII Print',
};

const heroSlideIds = hybridCarouselProps.slides.map((slide: any) => slide.id);

export const storyBlocks = [
  {
    title: 'WWII Themed Fine Art Prints',
    subhead: 'Not archival war photographs. Contemporary fine art built from living history.',
    paragraphs: [
      'These are not archival World War II photographs. They are contemporary WWII-themed fine art photographs created with living historians, period detail, painterly light, and narrative intent: images built to feel remembered, not merely recorded.',
      'That distinction matters for collectors and searchers alike. K4 Studios is not presenting documentary record photography or public-domain war archives. Wayne Heim is creating WWII inspired art prints from real reenactors, researched equipment, and authored visual decisions.',
      'The result is military history art that can live on a wall without becoming generic decor. Each image is selected for emotional pressure, print presence, and the kind of unresolved story that keeps opening over time.',
    ],
  },
  {
    subhead: 'A collector route through World War II inspired wall art',
    paragraphs: [
      'The strongest WWII wall art does not rely on explosions, uniforms, or machinery alone. It holds the human cost of the era through posture, fatigue, camaraderie, silence, and the heavy geometry of machines built for consequence.',
      'This page gathers the commercial print path while preserving the larger <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII">WWII Fine Art Photography</a> hub as the main gallery parent. The rows below are proof sections: War, Machines, and Portraits in both color and black and white.',
    ],
  },
  {
    subhead: 'Prints shaped for memory, not nostalgia',
    paragraphs: [
      'A WWII themed fine art print has to carry respect before it carries style. The goal is not costume novelty or battlefield spectacle. It is a contemporary encounter with service, pressure, and memory.',
      'Collectors can begin with the full WWII hub, compare individual image pages, then use <a href="/Other/Print-Options">Print Options</a> to choose the material, scale, and finish that lets the image hold its place.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'WWII Fine Art Photography',
    eyebrow: 'Primary Gallery Parent',
    href: wwiiPath,
    description: 'Open the main WWII gallery hub for the full collector route through War, Machines, and Portraits.',
    cta: 'Enter the WWII hub -',
    accent: '#5e584e',
    featured: true,
  },
  {
    title: 'Historically Themed Photography',
    eyebrow: 'Definition Route',
    hideEyebrow: true,
    href: '/Blog/what-is-historically-themed-photography',
    description: 'See why this work is contemporary historically themed fine art rather than archival historical photography.',
    cta: 'Read the definition -',
    accent: '#6f5b4a',
  },
  {
    title: 'Print Options',
    eyebrow: 'Collector Route',
    hideEyebrow: true,
    href: '/Other/Print-Options',
    description: 'Compare archival paper and select wood presentation formats before choosing a print.',
    cta: 'Compare formats -',
    accent: '#7d634b',
  },
];

export const featuredReadingTitle = 'Understanding the WWII Print Path';
export const featuredReadingIntro = 'These related pages keep the commercial route connected to the larger K4 historical and collector framework.';

export const featuredReadingItems = [
  {
    title: 'What Is Historically Themed Photography?',
    href: '/Blog/what-is-historically-themed-photography',
    description: 'Clarifies why K4 historical work is contemporary fine art made from historical subject matter, not archive.',
    eyebrow: 'Definition',
  },
  {
    title: 'Facing History',
    href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History',
    description: 'Follow the larger historical collection across the Western frontier, Civil War, World War II, and the Roaring 20s.',
    eyebrow: 'Collection',
  },
  {
    title: 'Civil War Art',
    href: '/Civil-War-Art',
    description: 'A parallel historical art path for Civil War inspired photography and narrative fine art prints.',
    eyebrow: 'Related',
  },
  {
    title: 'Print Options',
    href: '/Other/Print-Options',
    description: 'Compare print materials and formats after choosing the image that belongs in the room.',
    eyebrow: 'Collector',
  },
];

export const gridImages = [
  ...selectCollectionPreviewRow(warColorGallery, warColorPath, 0, 4, 'WWII themed battle art print by Wayne Heim', 'War / Color', heroSlideIds),
  ...selectCollectionPreviewRow(machinesColorGallery, machinesColorPath, 0, 4, 'WWII military machine fine art print by Wayne Heim', 'Machines / Color', heroSlideIds),
  ...selectCollectionPreviewRow(portraitsColorGallery, portraitsColorPath, 0, 4, 'WWII inspired portrait art print by Wayne Heim', 'Portraits / Color', heroSlideIds),
];

export const collection = {
  kicker: 'WWII Print Proof',
  title: 'Browse WWII Themed Fine Art Print Sections',
  intro: 'Six compact proof rows, one for each WWII gallery branch, so the commercial page stays rich without overwhelming the collector path.',
};

export const collectionGroups = [
  {
    title: 'WWII War, Machines, and Portraits',
    description: 'Each row leads into the ranking/proof galleries. The page explains the buyer path; the galleries carry the visual inventory.',
    rows: [
      {
        label: 'Art of War - Color',
        href: warColorPath,
        cta: 'See more color war images',
        items: selectCollectionPreviewRow(warColorGallery, warColorPath, 0, 4, 'WWII themed color war art print by Wayne Heim', 'War / Color', heroSlideIds),
      },
      {
        label: 'Art of War - Black and White',
        href: warBWPath,
        cta: 'See more black and white war images',
        items: selectCollectionPreviewRow(warBWGallery, warBWPath, 0, 4, 'Black and white WWII themed war art print by Wayne Heim', 'War / B&W', heroSlideIds),
      },
      {
        label: 'Men and Machines - Color',
        href: machinesColorPath,
        cta: 'See more color machine images',
        items: selectCollectionPreviewRow(machinesColorGallery, machinesColorPath, 0, 4, 'WWII military machine wall art by Wayne Heim', 'Machines / Color', heroSlideIds),
      },
      {
        label: 'Men and Machines - Black and White',
        href: machinesBWPath,
        cta: 'See more black and white machine images',
        items: selectCollectionPreviewRow(machinesBWGallery, machinesBWPath, 0, 4, 'Black and white WWII military machine print by Wayne Heim', 'Machines / B&W', heroSlideIds),
      },
      {
        label: 'WWII Portraits - Color',
        href: portraitsColorPath,
        cta: 'See more color portraits',
        items: selectCollectionPreviewRow(portraitsColorGallery, portraitsColorPath, 0, 4, 'WWII inspired portrait art print by Wayne Heim', 'Portraits / Color', heroSlideIds),
      },
      {
        label: 'WWII Portraits - Black and White',
        href: portraitsBWPath,
        cta: 'See more black and white portraits',
        items: selectCollectionPreviewRow(portraitsBWGallery, portraitsBWPath, 0, 4, 'Black and white WWII inspired portrait print by Wayne Heim', 'Portraits / B&W', heroSlideIds),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Collector Questions',
  title: 'WWII Themed Fine Art Prints FAQ',
};

export const faqItems = [
  {
    q: 'Are these archival World War II photographs?',
    a: [
      'No. These are contemporary WWII-themed fine art photographs created with living historians, period detail, painterly light, and narrative intent. They are built as art prints, not archival record photographs.',
    ],
  },
  {
    q: 'What is the difference between WWII photography and WWII themed fine art prints?',
    a: [
      'Plain WWII photography often points to documentary, archival, or historical record images. K4 Studios uses World War II as subject and story for contemporary fine art prints made with real reenactors and researched historical detail.',
    ],
  },
  {
    q: 'Where should I start if I want to browse the full WWII collection?',
    a: [
      'Start with the <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII">WWII Fine Art Photography</a> hub, then move into War, Machines, or Portraits depending on the kind of story you want to collect.',
    ],
  },
  {
    q: 'Are these available as wall art?',
    a: [
      'Yes. Individual image pages lead into the available print and purchase path, and <a href="/Other/Print-Options">Print Options</a> explains presentation formats and materials.',
    ],
  },
  {
    q: 'Why use living historians and reenactors?',
    a: [
      'Living historians bring knowledge of gesture, kit, posture, equipment, and period atmosphere into the frame. Wayne uses that presence as the foundation for authored, painterly fine art rather than costume novelty.',
    ],
  },
  {
    q: 'Can these prints work outside a military collection?',
    a: [
      'Yes. The strongest pieces often function as studies of service, burden, fatigue, memory, and human consequence. They can suit collectors of military history, historically themed art, or narrative fine art.',
    ],
  },
];

export const pageMeta = {
  title: 'WWII Themed Fine Art Prints | World War II Inspired Wall Art by Wayne Heim',
  description: 'WWII themed fine art prints by Wayne Heim: contemporary World War II inspired wall art created with living historians, period detail, painterly light, and narrative intent.',
};

export const structuredAbout = [
  'WWII Themed Fine Art Prints',
  'World War II Inspired Wall Art',
  'WWII Inspired Art Prints',
  'Military History Art Prints',
  'WWII Reenactment Photography',
  'Historically Themed Fine Art Photography',
];

export const webPageAbout = [
  'WWII Themed Fine Art Prints',
  'WWII Wall Art',
  'Military History Art Prints',
  'World War II Inspired Wall Art',
];

export const genre = 'WWII Themed Fine Art Prints';
export const collectionAltPrefix = 'WWII themed fine art print';
