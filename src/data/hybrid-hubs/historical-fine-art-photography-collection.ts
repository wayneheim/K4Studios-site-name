import { galleryData as cowboyColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as narrativeColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as naColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';
import { galleryData as civilWarColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs';
import { galleryData as civilWarBwGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White.mjs';
import { galleryData as wwiiPortraitColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs';
import { galleryData as wwiiWarColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs';
import { galleryData as wwiiMachinesColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs';
import { galleryData as roaringColorGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs';
import { galleryData as roaringBwGallery }
  from '../Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs';

const facingHistoryPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History';
const wildWestPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West';
const civilWarPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits';
const wwiiPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII';
const roaringPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits';

const cowboyColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const narrativeColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const naColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color';
const civilWarColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color';
const civilWarBwPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White';
const wwiiPortraitColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color';
const wwiiWarColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color';
const wwiiMachinesColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color';
const roaringColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color';
const roaringBwPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White';

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

function selectGridImages(
  data: any[],
  hrefBase: string,
  offset: number,
  count: number,
  fallbackAlt: string,
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
  additionalExcludedIds: string[] = [],
) {
  const blockedIds = new Set([...(excludedIds || []), ...(additionalExcludedIds || [])]);

  return cleanItems(data)
    .filter((item: any) => !blockedIds.has(item.id))
    .slice(offset, offset + count)
    .map((item: any) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: ensureAlt(item, fallbackAlt),
      href: `${hrefBase}/${item.id}`,
      seriesLabel,
    }));
}

function selectMixedPreviewRow(
  sources: Array<{
    data: any[];
    hrefBase: string;
    offset: number;
    count: number;
    fallbackAlt: string;
    seriesLabel: string;
    excludedIds?: string[];
  }>,
) {
  const seenIds = new Set<string>();

  return sources.flatMap((source) => {
    const items = selectCollectionPreviewRow(
      source.data,
      source.hrefBase,
      source.offset,
      source.count,
      source.fallbackAlt,
      source.seriesLabel,
      source.excludedIds || [],
      Array.from(seenIds),
    );

    items.forEach((item) => seenIds.add(item.id));
    return items;
  });
}

function buildHybridSlides(data: any[], hrefBase: string, count: number, fallbackStory: string, offset: number = 0) {
  return cleanItems(data)
    .slice(offset, offset + count)
    .map((item: any) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: ensureAlt(item, 'Historical fine art photography by Wayne Heim'),
      story: (item.story || fallbackStory).trim(),
      href: `${hrefBase}/${item.id}`,
    }));
}

function buildHybridSlideById(data: any[], hrefBase: string, id: string, fallbackStory: string) {
  const item = cleanItems(data).find((entry: any) => entry.id === id);

  if (!item) {
    return [];
  }

  return [{
    id: item.id,
    title: item.title || 'Featured Work',
    alt: ensureAlt(item, 'Historical fine art photography by Wayne Heim'),
    story: (item.story || fallbackStory).trim(),
    href: `${hrefBase}/${item.id}`,
  }];
}

export const pagePath = '/historical-fine-art-photography-collection';
export const imageSectionPath = facingHistoryPath;
export const gridBasePath = narrativeColorPath;
export const galleryPaths = [
  narrativeColorPath,
  cowboyColorPath,
  naColorPath,
  civilWarColorPath,
  civilWarBwPath,
  wwiiPortraitColorPath,
  wwiiWarColorPath,
  wwiiMachinesColorPath,
  roaringColorPath,
  roaringBwPath,
];

export const landing = {
  title: 'The Facing History Series',
  subtitle: 'A painterly historical series moving through American time zones to give life back to the unnamed and the stories history never finished telling.',
  keywords: [
    'historical fine art photography collection',
    'historical fine art photography',
    'american history art',
    'historical reenactment photography',
    'world war ii art photography',
    'civil war fine art photography',
  ],
  breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Historical Fine Art Photography Collection</span>',
};

export const breadcrumbItems = [
  { name: 'Home', item: 'https://www.k4studios.com/' },
  { name: 'Historical Fine Art Photography Collection', item: 'https://www.k4studios.com/historical-fine-art-photography-collection' },
];

export const hybridCarouselProps = {
  slides: [
    ...buildHybridSlideById(civilWarColorGallery, civilWarColorPath, 'i-9q7BrTt', 'Civil War imagery focused on youth, duty, and the human weight carried beneath symbol.'),
    ...buildHybridSlideById(wwiiPortraitColorGallery, wwiiPortraitColorPath, 'i-spgGWcn', 'WWII portraits shaped by service, resolve, and the cost that lingers after action.'),
    ...buildHybridSlideById(wwiiMachinesColorGallery, wwiiMachinesColorPath, 'i-rBtrrtx', 'WWII machine studies where steel, memory, and mechanical resolve carry the wartime burden forward.'),
    ...buildHybridSlideById(roaringColorGallery, roaringColorPath, 'i-5bqK2s3', 'Roaring Twenties portraits where glamour, restraint, and social pressure share the same room.'),
    ...buildHybridSlideById(narrativeColorGallery, narrativeColorPath, 'i-LCspRF4', 'Frontier narrative work where consequence stays present under the legend.'),
  ],
  galleryBasePath: narrativeColorPath,
  kicker: 'American Time Zones',
  counterLabel: 'Era',
};

const heroSlideIds = hybridCarouselProps.slides.map((slide: any) => slide.id);

export const storyBlocks = [
  {
    title: 'The Facing History Series',
    subhead: 'Its central principle is simple: give life back to the unnamed, and to the stories history was too busy to fully record.',
    paragraphs: [
      'Facing History is not built around monuments, public myth, or costume for its own sake. It is built around the people underneath them: the lives that carried the weight, the choices that shaped what followed, and the human stories that never stopped mattering just because time moved on.',
      'The series moves through the American frontier, the Civil War, World War II, and the Roaring Twenties, but the real subject is deeper than era. It is labor, sacrifice, waiting, resolve, grief, rebellion, silence, and consequence. The unseen structure. The armature beneath the legend.',
    ],
  },
  {
    subhead: 'The mission is not to illustrate history. It is to make it feel inhabited again.',
    paragraphs: [
      'That is where Facing History separates itself from reenactment spectacle and period nostalgia. The work begins with researched lives, emotional truth, and painterly authorship, then uses light, atmosphere, gesture, and restraint to close the distance between viewer and past until the image stops feeling archived and starts feeling present.',
      'The time-zone structure below is simply a way of traveling through that larger mission. Each branch has its own pressure and climate: frontier distance, Civil War burden, wartime endurance, Jazz-Age reinvention. But all of them belong to the same body of work, and all of them serve the same larger series.',
    ],
  },
  {
    subhead: 'Many of these images are built as unfinished stories, inviting the viewer inside to finish what still lives beyond the frame.',
    paragraphs: [
      'That is the storytelling move underneath the series. A frame does not have to explain everything to feel complete. It can remain open. It can hold the breath before the decision, the silence after the loss, the gesture that suggests a larger life pressing just beyond the visible edge. That unfinished pressure is what invites the viewer to step inside rather than stand outside and merely observe.',
      'In that sense, Facing History is not just about what appears inside the image. It is about what continues beyond it. The larger story. The unwritten chapter. The sense that the past is still moving, and that the viewer has now been asked to carry part of it forward.',
    ],
  },
];

export const explorationPaths = [
  {
    title: 'Facing History',
    hideEyebrow: true,
    href: facingHistoryPath,
    description: 'Enter the main series hub where the full historical body of work opens out beyond this curated time-zone passage.',
    cta: 'Enter the full series -',
    accent: '#7a4a2d',
    featured: true,
  },
  {
    title: 'Historical Reenactment Photography',
    hideEyebrow: true,
    href: '/Historical-Reenactment-Photography',
    description: 'Read the page that frames the work through living history, reenactment, and the craft of turning research into story-driven fine art.',
    cta: 'Read the historical guide -',
    accent: '#6a5a4c',
  },
  {
    title: 'One-Image Movie',
    hideEyebrow: true,
    href: '/One-Image-Movie',
    description: 'Step into the storytelling idea behind unfinished narrative imagery that invites the viewer to complete the story beyond the frame.',
    cta: 'Explore the storytelling thesis -',
    accent: '#5a4637',
  },
];

export const featuredReadingTitle = 'Reading Story, Memory, and the Unfinished Frame';
export const featuredReadingIntro = 'These pages deepen the ideas underneath Facing History: the hidden structure beneath legend, the difference between record and authored image, and the way a still frame can keep opening after the first glance.';

export const featuredReadingItems = [
  {
    title: 'Inside the Frame: Armature Beneath the Legend',
    href: '/Blog/armature-beneath-the-legend',
    description: 'Read the clearest statement of the hidden labor, sacrifice, and determination holding the visible legend up.',
    eyebrow: 'Essay',
  },
  {
    title: 'What Is Visual Storytelling in Photography?',
    href: '/Blog/what-is-visual-storytelling-in-photography',
    description: 'Follow how a still image begins to imply what came before, what may follow, and what remains emotionally at stake.',
    eyebrow: 'Guide',
  },
  {
    title: 'Narrative vs Documentary Photography',
    href: '/Blog/narrative-vs-documentary-photography',
    description: 'See where historical truth stays intact but the image is still shaped to carry atmosphere, implication, and authored consequence.',
    eyebrow: 'Guide',
  },
  {
    title: 'What Makes an Image Feel Cinematic?',
    href: '/Blog/what-makes-an-image-feel-cinematic',
    description: 'Read the single-frame storytelling guide behind images that stay open, pressurized, and unfinished in the right way.',
    eyebrow: 'Guide',
  },
];

export const gridImages = [
  ...selectGridImages(narrativeColorGallery, narrativeColorPath, 0, 3, 'Historical frontier work by Wayne Heim', heroSlideIds),
  ...selectGridImages(civilWarColorGallery, civilWarColorPath, 0, 3, 'Civil War fine art photography by Wayne Heim', heroSlideIds),
  ...selectGridImages(wwiiWarColorGallery, wwiiWarColorPath, 0, 3, 'World War II fine art photography by Wayne Heim', heroSlideIds),
  ...selectGridImages(roaringColorGallery, roaringColorPath, 0, 3, 'Roaring Twenties fine art photography by Wayne Heim', heroSlideIds),
];

export const collection = {
  kicker: 'American Time Zones',
  title: 'Move Through Facing History by Time Zone',
  intro: 'These four branches are not separate themes loosely gathered together. They are four climates inside the same larger series, each carrying its own unfinished lives, emotional weather, and human stakes.',
};

export const collectionGroups = [
  {
    title: 'The Frontier Time Zone',
    description: 'The West stripped back to labor, distance, endurance, Native presence, and the human lives holding frontier legend up from underneath.',
    rows: [
      {
        label: 'Curated Collection',
        href: wildWestPath,
        cta: 'Enter the Wild West galleries',
        items: selectMixedPreviewRow([
          {
            data: narrativeColorGallery,
            hrefBase: narrativeColorPath,
            offset: 0,
            count: 2,
            fallbackAlt: 'Frontier narrative by Wayne Heim',
            seriesLabel: 'Wild West Narratives',
            excludedIds: heroSlideIds,
          },
          {
            data: cowboyColorGallery,
            hrefBase: cowboyColorPath,
            offset: 0,
            count: 1,
            fallbackAlt: 'Western portrait by Wayne Heim',
            seriesLabel: 'Western Cowboy Portraits',
            excludedIds: heroSlideIds,
          },
          {
            data: naColorGallery,
            hrefBase: naColorPath,
            offset: 0,
            count: 1,
            fallbackAlt: 'Native American portrait by Wayne Heim',
            seriesLabel: 'Native Americans',
            excludedIds: heroSlideIds,
          },
        ]),
      },
    ],
  },
  {
    title: 'The Civil War Time Zone',
    description: 'A nation under strain, told through rank, fatigue, separation, deliberation, and the long human accounting that follows war.',
    rows: [
      {
        label: 'Curated Collection',
        href: civilWarPath,
        cta: 'Enter the Civil War portraits',
        items: selectMixedPreviewRow([
          {
            data: civilWarColorGallery,
            hrefBase: civilWarColorPath,
            offset: 0,
            count: 2,
            fallbackAlt: 'Civil War historical portrait by Wayne Heim',
            seriesLabel: 'Civil War / Color',
            excludedIds: heroSlideIds,
          },
          {
            data: civilWarBwGallery,
            hrefBase: civilWarBwPath,
            offset: 0,
            count: 2,
            fallbackAlt: 'Black and white Civil War portrait by Wayne Heim',
            seriesLabel: 'Civil War / Black and White',
            excludedIds: heroSlideIds,
          },
        ]),
      },
    ],
  },
  {
    title: 'The World War II Time Zone',
    description: 'Portraiture, battle, and machinery held together by brotherhood, fatigue, sacrifice, and the human cost still visible beneath war.',
    rows: [
      {
        label: 'Curated Collection',
        href: wwiiPath,
        cta: 'Enter the World War II collection',
        items: selectMixedPreviewRow([
          {
            data: wwiiPortraitColorGallery,
            hrefBase: wwiiPortraitColorPath,
            offset: 0,
            count: 1,
            fallbackAlt: 'World War II portrait by Wayne Heim',
            seriesLabel: 'WWII Portraits',
            excludedIds: heroSlideIds,
          },
          {
            data: wwiiWarColorGallery,
            hrefBase: wwiiWarColorPath,
            offset: 0,
            count: 2,
            fallbackAlt: 'World War II battlefield image by Wayne Heim',
            seriesLabel: 'WWII War',
            excludedIds: heroSlideIds,
          },
          {
            data: wwiiMachinesColorGallery,
            hrefBase: wwiiMachinesColorPath,
            offset: 0,
            count: 1,
            fallbackAlt: 'World War II machine study by Wayne Heim',
            seriesLabel: 'WWII Machines',
            excludedIds: heroSlideIds,
          },
        ]),
      },
    ],
  },
  {
    title: 'The Roaring Twenties Time Zone',
    description: 'Glamour, rebellion, elegance, and reinvention, with the harder pressure of the era still visible beneath the surface sheen.',
    rows: [
      {
        label: 'Curated Collection',
        href: roaringPath,
        cta: 'Enter the Roaring Twenties portraits',
        items: selectMixedPreviewRow([
          {
            data: roaringColorGallery,
            hrefBase: roaringColorPath,
            offset: 0,
            count: 2,
            fallbackAlt: 'Roaring Twenties portrait by Wayne Heim',
            seriesLabel: 'Roaring 20s / Color',
            excludedIds: heroSlideIds,
          },
          {
            data: roaringBwGallery,
            hrefBase: roaringBwPath,
            offset: 0,
            count: 2,
            fallbackAlt: 'Black and white Roaring Twenties portrait by Wayne Heim',
            seriesLabel: 'Roaring 20s / Black and White',
            excludedIds: heroSlideIds,
          },
        ]),
      },
    ],
  },
];

export const faqSection = {
  kicker: 'Collection Questions',
  title: 'Historical Fine Art Photography Collection FAQ',
  tagline: '"History does not live in symbols alone. It lives in the people beneath them."',
};

export const faqItems = [
  {
    q: 'Is this page the same thing as Facing History?',
    a: [
      'No. This is a curated collection-facing route into the broader <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History">Facing History</a> series. It is built to make the historical branches legible quickly, then push visitors toward the main hub once they know where they want to go deeper.',
    ],
  },
  {
    q: 'Why organize the eras as time zones instead of one long mixed grid?',
    a: [
      'Because the work changes emotional climate from one era to the next. Treating the branches as time zones keeps the frontier, Civil War, World War II, and Roaring Twenties material distinct without making the page feel like a textbook chronology.',
    ],
  },
  {
    q: 'Is this documentary history or reenactment coverage?',
    a: [
      'It is story-driven fine art grounded in historical reenactment, period atmosphere, and authored image-making. The work is rooted in historical subject matter, but it is built to carry tension, implication, and emotional consequence rather than behave like neutral record alone.',
    ],
  },
  {
    q: 'Does the collection focus only on famous figures and public legends?',
    a: [
      'No. A central part of the series is the people history did not always pause to record by name. The work keeps returning to labor, duty, endurance, waiting, and the hidden human structure that made larger legends possible.',
    ],
  },
  {
    q: 'Where should I go if I want the broader historical thesis behind the work?',
    a: [
      'Start with <a href="/Historical-Reenactment-Photography">Historical Reenactment Photography</a> for the authority frame, then read <a href="/Blog/armature-beneath-the-legend">Armature Beneath the Legend</a> for the clearest statement of the underlying idea.',
    ],
  },
  {
    q: 'Can I buy prints from the eras linked here?',
    a: [
      'Yes. Each time-zone route opens into gallery pages with individual works and print-buying paths, so the collection can function as both discovery route and collecting route once a specific image starts leading.',
    ],
  },
];

export const pageMeta = {
  title: 'Facing History Series | Historical Fine Art Photography by Wayne Heim - K4 Studios',
  description: 'The Facing History Series by Wayne Heim is a historical fine art photography collection moving through Wild West, Civil War, World War II, and Roaring Twenties work shaped by story, atmosphere, and historical memory.',
};

export const structuredAbout = [
  'Historical Fine Art Photography Collection',
  'Historical Fine Art Photography',
  'American History Art',
  'Facing History',
  'Historical Reenactment Photography',
  'Narrative Historical Series',
];

export const webPageAbout = [
  'Historical Fine Art Photography Collection',
  'Facing History',
  'Historical Reenactment Photography',
  'American History Art',
];

export const genre = 'Historical Fine Art Photography Collection';
export const collectionAltPrefix = 'Historical fine art photography collection';