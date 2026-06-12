// @ts-nocheck
import { galleryData as cowboyColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBwData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as westernNarrativesColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as nativeColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';
import { getSemanticImageUrl } from '@/utils/imageProxy.js';

const COWBOY_COLOR_PATH = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const COWBOY_BW_PATH = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White';
const WESTERN_NARRATIVES_PATH = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const NATIVE_COLOR_PATH = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color';
const WILD_WEST_PATH = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West';

const galleries = {
  cowboyColor: { path: COWBOY_COLOR_PATH, data: cowboyColorData },
  cowboyBw: { path: COWBOY_BW_PATH, data: cowboyBwData },
  westernNarratives: { path: WESTERN_NARRATIVES_PATH, data: westernNarrativesColorData },
  nativeColor: { path: NATIVE_COLOR_PATH, data: nativeColorData },
};

function cleanText(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*©\s*Wayne Heim\s*$/i, '')
    .trim();
}

function proxySrc(item, gallery, size = 'm') {
  return getSemanticImageUrl(item, { galleryPath: gallery.path }, size);
}

function image(source, id, caption, altOverride = '') {
  const gallery = galleries[source];
  const item = gallery.data.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing exact-match landing image ${id}`);

  return {
    id,
    title: item.title || 'Western fine art print',
    alt: altOverride || item.alt || item.title || 'Western painterly fine art photography by Wayne Heim',
    description: cleanText(item.description || item.notes || item.title),
    caption,
    src: proxySrc(item, gallery, 'm'),
    srcL: proxySrc(item, gallery, 'l'),
    href: `${gallery.path}/${id}`,
    buyLink: item.buyLink || '',
  };
}

const wildWestCollectorLinks = [
  {
    href: `${WESTERN_NARRATIVES_PATH}/all`,
    label: 'Western Narratives Color Collection',
  },
  {
    href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all',
    label: 'Western Narratives Black & White Collection',
  },
  {
    href: `${COWBOY_COLOR_PATH}/all`,
    label: 'Western Cowboy Portraits Color Collection',
  },
  {
    href: `${COWBOY_BW_PATH}/all`,
    label: 'Western Cowboy Portraits Black & White Collection',
  },
  {
    href: `${NATIVE_COLOR_PATH}/all`,
    label: 'Native American Color Series',
  },
  {
    href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White/all',
    label: 'Native American Black & White Series',
  },
];

const westernThemeLinks = [
  { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History', label: 'Facing History' },
  { href: '/Narrative-Western-Art', label: 'Narrative Western Art' },
  { href: '/Other/Narrative-Art', label: 'Narrative Art' },
  { href: '/Other/Seeing', label: 'Seeing Essays' },
  { href: '/Blog/what-is-painterly-photography', label: 'What Is Painterly Photography?' },
  { href: '/Blog/what-is-western-fine-art-photography', label: 'What Is Western Fine Art Photography?' },
  { href: '/Other/K4-Select-Series/Engrained', label: 'Engrained Wood Prints' },
  { href: '/Other/Print-Options', label: 'Compare fine art print options' },
];

export const westernPainterlyFineArtPhotographyPage = {
  path: '/western-painterly-fine-art-photography',
  title: 'Western Painterly Fine Art Photography | K4 Studios',
  h1: 'Western Painterly Fine Art Photography',
  metaDescription:
    'Western painterly fine art photography by Wayne Heim, blending camera-based realism, painterly atmosphere, cinematic composition, and Western storytelling into collectible fine art prints.',
  intro:
    'Western painterly fine art photography by Wayne Heim blends camera-based realism with painterly atmosphere, cinematic composition, and Western storytelling. These collectible fine art prints draw from cowboy life, frontier history, Western portraiture, landscapes, and the human structure beneath the myth.',
  breadcrumbLabel: 'Western Painterly Fine Art Photography',
  schemaAbout: [
    'Western Painterly Fine Art Photography',
    'Painterly Western Fine Art Photography',
    'Western Fine Art Photography',
    'Cowboy Photography',
    'Western Storytelling',
  ],
  keywords: [
    'western painterly fine art photography',
    'painterly western fine art photography',
    'painterly western photography',
    'western fine art prints',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Western painterly fine art photography image grid',
  gridHeading: 'Featured Western Painterly Fine Art Photography',
  heroLink: {
    href: WILD_WEST_PATH,
    label: 'Explore the Wild West work',
  },
  heroImage: image('westernNarratives', 'i-LCspRF4', 'Cowboy life, frontier pause, and painterly Western atmosphere.', 'Cowboy beside a wagon at sunset in a Western painterly fine art photography scene.'),
  gridImages: [
    image('westernNarratives', 'i-7Mzzbvp', 'A narrative Western scene built around motion, dust, and consequence.', 'Three cowboys racing on horseback through dust in a cinematic Western frontier image.'),
    image('westernNarratives', 'i-c5K798H', 'A cinematic frontier moment rendered as collectible Western fine art.', 'Cowboy standoff with revolver, coiled rope, and painterly Western atmosphere.'),
    image('nativeColor', 'i-qLzRgbS', 'Western history held through presence, dignity, and human continuity.', 'Indigenous historical portrait shaped with fine art light and Western storytelling.'),
    image('westernNarratives', 'i-4zxZQQ2', 'Mounted Western travel shaped by sky, distance, and frontier weather.', 'Mounted riders pausing under a dramatic prairie sky in camera-based Western art.'),
    image('westernNarratives', 'i-89qzJ6S', 'A frontier pairing where presence and landscape carry the story.', 'Indigenous scout and frontier trapper beside a horse in a painterly Western portrait.'),
    image('westernNarratives', 'i-7VWX9vk', 'A lone rider scene held in dust, light, and Western implication.', 'Lone rider leading a horse beneath a fiery sky in a Western fine art photograph.'),
    image('westernNarratives', 'i-kQfftQ2', 'A narrative Western confrontation built around pressure and restraint.', 'Frontier porch confrontation with drawn gun, dust, and narrative Western tension.'),
    image('westernNarratives', 'i-gxMVNh3', 'Western storytelling carried by light, setting, and implication.', 'Frontier street moment with painterly Western light and story-driven atmosphere.'),
  ],
  sections: [
    {
      h2: 'What Is Western Painterly Fine Art Photography?',
      paragraphs: [
        'Western painterly fine art photography combines photographic capture with painterly atmosphere, compositional control, texture, and cinematic storytelling. It is Western photography shaped with the intent of fine art rather than stock imagery, documentary record, or generic decor.',
        'In Wayne Heim\'s work, the camera remains the foundation. The painterly quality comes from human decisions: light, color, edge, focus, atmosphere, and restraint. The result is photographic Western art that feels authored, collected, and lived with over time.',
      ],
    },
    {
      h2: 'Camera-Based Western Art with a Painter\'s Eye',
      paragraphs: [
        'Wayne Heim brings the trained eye of an illustrator to camera-based Western photography. Each finished image is shaped for structure and story, not pushed through a preset or decorative effect.',
        'Cowboy portraits, frontier scenes, historical subjects, horses, and Western landscapes are handled as parts of one visual language: painterly fine art photography rooted in real subjects and deliberate craft.',
      ],
    },
    {
      h2: 'Western Stories, Not Just Western Scenes',
      paragraphs: [
        'These images are not merely Western scenes. They are story-bearing frames where posture, silence, dust, weather, and distance imply what happened before the viewer arrived.',
        'That is the K4 Studios distinction: stronger authorship, clearer artistic thesis, and Western imagery built around the human structure beneath the myth.',
      ],
    },
    {
      h2: 'Collectible Western Fine Art Prints',
      paragraphs: [
        'Selected Western painterly photographs are available as collectible fine art prints through K4 Studios. Print pages provide image details, edition context, and collector-focused options for archival presentation.',
      ],
    },
  ],
  printLinks: [
    { href: '/Western-Photography-Prints', label: 'Explore available Western photography prints' },
    { href: '/Western-Fine-Art-Photography', label: 'View the Western fine art photography collection' },
    { href: '/Other/Print-Options', label: 'Compare fine art print options' },
  ],
  collectorLinks: wildWestCollectorLinks,
  themeLinks: westernThemeLinks,
  faqItems: [
    {
      q: 'What is Western painterly fine art photography?',
      a: ['Western painterly fine art photography combines photographic capture with painterly atmosphere, composition, texture, and cinematic storytelling. Wayne Heim\'s work uses real Western subjects and historical settings as the foundation for collectible fine art prints.'],
    },
    {
      q: 'Is Western painterly photography a painting or a photograph?',
      a: ['Wayne Heim\'s Western painterly photography begins as camera-based photography. The painterly quality comes from the artist\'s human judgment in light, color, atmosphere, texture, and composition.'],
    },
    {
      q: 'What subjects appear in Wayne Heim\'s Western painterly fine art photography?',
      a: ['The work includes cowboy life, frontier scenes, Western portraits, historical reenactment imagery, landscapes, horses, and narrative moments shaped to feel cinematic and story-driven.'],
    },
  ],
};

export const cowboyPainterlyFineArtPhotographyPage = {
  path: '/cowboy-painterly-fine-art-photography',
  title: 'Cowboy Painterly Fine Art Photography | K4 Studios',
  h1: 'Cowboy Painterly Fine Art Photography',
  metaDescription:
    'Cowboy painterly fine art photography by Wayne Heim, featuring cinematic cowboy portraits, frontier scenes, Western storytelling, and collectible camera-based fine art prints.',
  intro:
    'Cowboy painterly fine art photography by Wayne Heim brings cowboy life, frontier character, and Western storytelling into collectible fine art prints. Each image begins with photographic capture and is shaped with painterly atmosphere, cinematic restraint, and the trained eye of an illustrator.',
  breadcrumbLabel: 'Cowboy Painterly Fine Art Photography',
  schemaAbout: [
    'Cowboy Painterly Fine Art Photography',
    'Painterly Cowboy Photography',
    'Cowboy Fine Art Photography',
    'Western Cowboy Portraits',
    'Western Storytelling',
  ],
  keywords: [
    'cowboy painterly fine art photography',
    'painterly cowboy photography',
    'cowboy fine art photography',
    'cowboy fine art prints',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Cowboy painterly fine art photography image grid',
  gridHeading: 'Featured Cowboy Painterly Fine Art Photography',
  heroLink: {
    href: WILD_WEST_PATH,
    label: 'Explore the Wild West work',
  },
  heroImage: image('cowboyColor', 'i-ncFcHDM', 'Painterly cowboy portrait with quiet frontier tension.', 'Bearded cowboy in a red shirt and wide-brimmed hat, rendered as painterly cowboy photography.'),
  gridImages: [
    image('cowboyColor', 'i-k4b6c5b', 'Weathered cowboy character study rendered as collectible fine art.', 'Elder cowboy portrait with soft dust tones, weathered expression, and Western character.'),
    image('cowboyColor', 'i-3SxncXS', 'Elder cowboy portrait shaped by dust, memory, and atmosphere.', 'Long-bearded frontier rider in a cowboy painterly fine art photography portrait.'),
    image('westernNarratives', 'i-bq4FKvX', 'Working cowboy rhythm held in rope, dawn light, and dust.', 'Working cowboy handling rope at dawn in warm frontier light and dust.'),
    image('cowboyBw', 'i-DJMTZ8z', 'Black and white cowboy portrait with tonal restraint.', 'Black and white Western cowboy resting beside a coiled rope with quiet restraint.'),
    image('cowboyColor', 'i-6xn5rMd', 'A weathered cowboy face treated with painterly restraint and authority.', 'Older Western man with long beard and weathered face in a painterly cowboy portrait.'),
    image('cowboyColor', 'i-Dw6Z8ff', 'Doorway light and lawman posture shaped into a cinematic cowboy image.', 'Lawman standing in warm doorway light with cinematic cowboy presence.'),
    image('cowboyColor', 'i-b3vCXwR', 'Frontier waiting, Western posture, and cowboy character in one frame.', 'Frontier sheriff waiting behind a wooden railing in a Western character study.'),
    image('cowboyColor', 'i-8BbMZjs', 'Working cowboy attention held in painterly Western light.', 'Cowboy minding the herd in a painterly Western portrait with working-ranch character.'),
  ],
  sections: [
    {
      h2: 'Cowboy Art Built from Real Photographic Capture',
      paragraphs: [
        'Cowboy painterly fine art photography at K4 Studios begins with real photographic capture. The subjects, light, costumes, settings, and gestures are recorded by the camera before Wayne Heim shapes the final image through painterly judgment.',
        'That foundation matters. These are not simulated cowboy paintings. They are camera-based Western photographs carried into fine art through composition, atmosphere, texture, and restraint.',
      ],
    },
    {
      h2: 'Painterly Cowboy Photography with Story Beneath the Myth',
      paragraphs: [
        'The cowboy is treated as a human subject, not a costume or symbol. Posture, silence, grit, consequence, and waiting do more of the work than spectacle.',
        'The result is painterly cowboy photography with narrative weight: images that suggest a larger life beyond the frame and a human structure beneath the Western myth.',
      ],
    },
    {
      h2: 'From Frontier Character to Fine Art Print',
      paragraphs: [
        'Selected cowboy painterly photographs are available as collectible fine art prints through K4 Studios. Image pages provide print and collection details for collectors who want Western cowboy art built around authorship and atmosphere.',
      ],
    },
  ],
  printLinks: [
    { href: '/cowboy-art-prints', label: 'View cowboy fine art prints' },
    { href: '/Cowboy-Fine-Art-Photography', label: 'Explore the cowboy fine art photography hub' },
    { href: '/Other/Print-Options', label: 'Compare fine art print options' },
  ],
  collectorLinks: wildWestCollectorLinks,
  themeLinks: [
    { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits', label: 'Western Cowboy Portraits' },
    { href: '/western-painterly-fine-art-photography', label: 'Western Painterly Fine Art Photography' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'What is cowboy painterly fine art photography?',
      a: ['Cowboy painterly fine art photography focuses on cowboy subjects rendered through photographic capture and painterly post-production, creating Western images with atmosphere, character, and narrative weight.'],
    },
    {
      q: 'What makes Wayne Heim\'s cowboy photography different?',
      a: ['Wayne Heim\'s cowboy photography emphasizes story, posture, silence, consequence, and the human structure beneath the Western myth rather than simple cowboy spectacle.'],
    },
    {
      q: 'Are these cowboy images available as fine art prints?',
      a: ['Selected cowboy painterly photographs are available as collectible fine art prints through K4 Studios, with image pages providing print and collection details.'],
    },
  ],
};

export const cowboyPicturesPage = {
  path: '/cowboy-pictures',
  title: 'Cowboy Pictures & Cowboy Photos | K4 Studios',
  h1: 'Cowboy Pictures and Cowboy Photos',
  metaDescription:
    'Cowboy pictures and cowboy photos by Wayne Heim, presented as painterly Western fine art photography, collectible cowboy portraits, frontier scenes, and story-driven prints.',
  intro:
    'Cowboy pictures and cowboy photos at K4 Studios are not stock cowboy imagery or disposable Western decor. Wayne Heim builds each photograph around character, atmosphere, and the quiet pressure of the American West, then presents selected works as collectible fine art prints.',
  breadcrumbLabel: 'Cowboy Pictures',
  schemaAbout: [
    'Cowboy Pictures',
    'Cowboy Photography',
    'Western Cowboy Pictures',
    'Cowboy Portraits',
    'Western Fine Art Prints',
  ],
  keywords: [
    'cowboy pictures',
    'western cowboy pictures',
    'cowboy photography',
    'cowboy fine art prints',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Cowboy pictures image grid',
  gridHeading: 'Featured Cowboy Pictures',
  heroLink: {
    href: COWBOY_COLOR_PATH,
    label: 'Browse the cowboy portrait collection',
  },
  heroImage: image('cowboyColor', 'i-QWcX7JT', 'A direct cowboy character study built for presence and repeat viewing.', 'Painterly cowboy picture of a Western character in period clothing with controlled light and frontier atmosphere.'),
  gridImages: [
    image('cowboyColor', 'i-MvZxkQh', 'Cowboy portrait with grit, stillness, and lived-in Western character.', 'Cowboy picture showing a weathered frontier figure in painterly Western light.'),
    image('cowboyColor', 'i-6Ffpw9t', 'A quiet cowboy image shaped by gesture, clothing, and atmosphere.', 'Fine art cowboy picture of a Western man in hat and period dress.'),
    image('cowboyColor', 'i-jcLJT4J', 'Frontier portraiture with a story held beneath the surface.', 'Cowboy portrait picture with cinematic Western mood and painterly finish.'),
    image('cowboyColor', 'i-T6bD4w7', 'Western character and human restraint carried through a single frame.', 'Cowboy fine art picture with rustic clothing, hat, and atmospheric light.'),
    image('cowboyColor', 'i-NKdPDCg', 'Old West presence translated into a collectible cowboy image.', 'Vintage-feeling cowboy picture by Wayne Heim with painterly color and frontier detail.'),
    image('cowboyColor', 'i-Mm3jXFH', 'A cowboy portrait selected for collector-facing Western wall presence.', 'Cowboy picture made as fine art photography with authentic Western character.'),
    image('cowboyColor', 'i-ZPmj5Wk', 'Cowboy image with painterly restraint and narrative weight.', 'Western cowboy picture with expressive posture and cinematic frontier atmosphere.'),
    image('cowboyColor', 'i-8zFZ3jn', 'A character-first cowboy photograph for buyers seeking more than decor.', 'Fine art cowboy picture of a frontier figure in dramatic painterly light.'),
  ],
  sections: [
    {
      h2: 'Cowboy Pictures with Fine Art Intent',
      paragraphs: [
        'People may search for cowboy pictures in simple language, but the work does not have to be simple. These images begin with real photographic subjects and are shaped through painterly decisions in light, tone, composition, and atmosphere.',
        'The result is cowboy imagery that can answer a direct visual search while still leading collectors toward authored Western fine art.',
      ],
    },
    {
      h2: 'Portraits, Frontier Mood, and Story',
      paragraphs: [
        'A strong cowboy picture carries more than a hat and a pose. It should hold posture, silence, pressure, and the feeling that the person in the frame belongs to a larger story.',
        'Wayne Heim treats the cowboy as a human subject first. Costume, setting, and period detail support the image, but character does the heavier work.',
      ],
    },
    {
      h2: 'From Browse Intent to Collector Prints',
      paragraphs: [
        'Selected cowboy pictures are available through K4 Studios as fine art prints, with image pages leading into print options, archive paths, and related Western collections.',
      ],
    },
  ],
  collectorEyebrow: 'Cowboy Collection',
  collectorHeading: 'Cowboy Pictures as Collectible Fine Art Prints',
  collectorText:
    'Move from quick cowboy-picture browsing into the deeper Western cowboy portrait archive, where selected images are presented as collector-grade fine art prints with series context, image pages, and archival print options.',
  printLinks: [
    { href: '/cowboy-art-prints', label: 'View cowboy art prints' },
    { href: '/Cowboy-Fine-Art-Photography', label: 'Cowboy fine art photography' },
    { href: '/Other/Print-Options', label: 'Compare print options' },
  ],
  collectorLinks: [
    { href: `${COWBOY_COLOR_PATH}/all`, label: 'Cowboy Pictures in Color' },
    { href: `${COWBOY_BW_PATH}/all`, label: 'Black and White Cowboy Pictures' },
    { href: '/Cowboy-Fine-Art-Photography', label: 'Cowboy Fine Art Photography Hub' },
    { href: '/cowboy-art-prints', label: 'Cowboy Art Prints' },
  ],
  themeLinks: [
    { href: '/Western-Cowboy-Photography', label: 'Western Cowboy Photography' },
    { href: '/cowboy-painterly-fine-art-photography', label: 'Cowboy Painterly Fine Art Photography' },
    { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits', label: 'Western Cowboy Portraits' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'Are these cowboy pictures photographs or paintings?',
      a: ['These cowboy pictures begin as camera-based photography. Wayne Heim then shapes the final work with painterly control of light, atmosphere, tone, and composition.'],
    },
    {
      q: 'Can cowboy pictures be collected as fine art prints?',
      a: ['Yes. Selected cowboy images at K4 Studios are presented as fine art prints with collector-focused print options and links into the larger Western archive.'],
    },
    {
      q: 'What makes these cowboy pictures different from generic Western decor?',
      a: ['They are built around authorship, character, and story rather than generic cowboy symbols. The goal is an image that keeps its force after the first glance.'],
    },
  ],
};

export const westernCowboyPicturesPage = {
  path: '/western-cowboy-pictures',
  title: 'Western Cowboy Pictures | K4 Studios',
  h1: 'Western Cowboy Pictures',
  metaDescription:
    'Western cowboy pictures by Wayne Heim: painterly cowboy portraits, frontier scenes, Western narratives, and collectible fine art photography prints.',
  intro:
    'Western cowboy pictures by Wayne Heim gather cowboy portraits, frontier scenes, and story-driven Western moments into a browse-first fine art entry. The language is direct, but the work is built with painterly craft, narrative structure, and collector intent.',
  breadcrumbLabel: 'Western Cowboy Pictures',
  schemaAbout: [
    'Western Cowboy Pictures',
    'Cowboy Pictures',
    'Western Photography',
    'Wild West Pictures',
    'Collectible Western Prints',
  ],
  keywords: [
    'western cowboy pictures',
    'cowboy pictures',
    'western pictures',
    'wild west cowboy pictures',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Western cowboy pictures image grid',
  gridHeading: 'Featured Western Cowboy Pictures',
  heroLink: {
    href: WILD_WEST_PATH,
    label: 'Explore the Wild West archive',
  },
  heroImage: image('westernNarratives', 'i-bfKMXS9', 'Western cowboy atmosphere held in dust, distance, and story.', 'Western cowboy picture with frontier characters and cinematic painterly atmosphere.'),
  gridImages: [
    image('westernNarratives', 'i-44jcjTQ', 'Cowboy art energy with a direct commercial search path.', 'Western cowboy picture of a frontier subject rendered as painterly fine art photography.'),
    image('westernNarratives', 'i-B7ZSdfs', 'Western life photographed as a story-bearing cowboy scene.', 'Cowboy picture from the American West with narrative staging and painterly finish.'),
    image('westernNarratives', 'i-NdQnj6P', 'Frontier character and Western setting held in one collectible image.', 'Western cowboy fine art picture with period clothing and atmospheric light.'),
    image('westernNarratives', 'i-G7csptc', 'A Western cowboy moment shaped for collectors rather than stock use.', 'Painterly Western cowboy picture with cinematic composition and frontier detail.'),
    image('westernNarratives', 'i-r5Pb7zJ', 'Cowboy picture with Old West mood and implied narrative.', 'Western cowboy scene with story-driven atmosphere and fine art print potential.'),
    image('westernNarratives', 'i-RsLmsLZ', 'A frontier image selected for Western story and collector wall presence.', 'Western cowboy picture showing historical character, mood, and painterly craft.'),
    image('westernNarratives', 'i-Wx5scCf', 'Human presence, frontier detail, and Western picture-search clarity.', 'Western cowboy photograph with painterly light and authentic frontier styling.'),
    image('westernNarratives', 'i-rfFBRQM', 'A Western cowboy image with quiet tension and visual restraint.', 'Western cowboy picture by Wayne Heim with collectible fine art atmosphere.'),
  ],
  sections: [
    {
      h2: 'Western Cowboy Pictures for Buyers and Collectors',
      paragraphs: [
        'This page meets the plain-language search for Western cowboy pictures, then points that search toward stronger work: painterly, camera-based fine art photography with real subjects and deliberate Western structure.',
        'The images are chosen for character, atmosphere, and story potential rather than for generic cowboy signaling.',
      ],
    },
    {
      h2: 'Beyond the Simple Cowboy Image',
      paragraphs: [
        'A Western cowboy picture can be straightforward without being shallow. In Wayne Heim\'s work, hats, dust, tack, cabins, streets, and frontier clothing become visual supports for human presence.',
        'That lets the page answer commercial image intent while still reinforcing K4 Studios as an authored Western fine art collection.',
      ],
    },
    {
      h2: 'A Direct Route into the Wild West Work',
      paragraphs: [
        'From here, viewers can move into the full Wild West archive, the Western Cowboy Portraits collection, related black and white studies, and collector print options.',
      ],
    },
  ],
  collectorEyebrow: 'Western Cowboy Archive',
  collectorHeading: 'Browse Western Cowboy Pictures by Collection',
  collectorText:
    'Use this page as a simple visual doorway into Wayne Heim\'s Western cowboy archive: color portraits, black and white studies, narrative scenes, and selected fine art prints built for collectors.',
  printLinks: [
    { href: '/Western-Photography-Prints', label: 'Western photography prints' },
    { href: '/cowboy-art-prints', label: 'Cowboy art prints' },
    { href: '/Other/Print-Options', label: 'Print options' },
  ],
  collectorLinks: wildWestCollectorLinks,
  themeLinks: [
    { href: '/cowboy-pictures', label: 'Cowboy Pictures' },
    { href: '/Western-Cowboy-Photography', label: 'Western Cowboy Photography' },
    { href: '/Western-Fine-Art-Photography', label: 'Western Fine Art Photography' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'What are Western cowboy pictures?',
      a: ['Western cowboy pictures are images centered on cowboy subjects, frontier settings, and the visual language of the American West. At K4 Studios they are presented as painterly fine art photography rather than generic stock imagery.'],
    },
    {
      q: 'Are these Western cowboy pictures available as prints?',
      a: ['Selected works connect to image pages and print options where collectors can explore available formats and related Western collections.'],
    },
    {
      q: 'How is this page different from the Western Cowboy Photography hub?',
      a: ['This page is a direct commercial doorway for picture-search intent. The broader hub carries more category authority and deeper explanatory structure.'],
    },
  ],
};

export const oldWestPicturesPage = {
  path: '/old-west-pictures',
  title: 'Old West Pictures | K4 Studios',
  h1: 'Old West Pictures',
  metaDescription:
    'Old West pictures by Wayne Heim featuring painterly frontier scenes, cowboy characters, Western narratives, historical atmosphere, and collectible fine art prints.',
  intro:
    'Old West pictures at K4 Studios turn simple frontier search language into a route toward painterly Western fine art photography. Wayne Heim builds these images around character, setting, tension, and the human weight behind the Old West myth.',
  breadcrumbLabel: 'Old West Pictures',
  schemaAbout: [
    'Old West Pictures',
    'Wild West Pictures',
    'Western Frontier Pictures',
    'Old West Photography',
    'Western Fine Art Prints',
  ],
  keywords: [
    'old west pictures',
    'wild west pictures',
    'old west photography',
    'western frontier pictures',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Old West pictures image grid',
  gridHeading: 'Featured Old West Pictures',
  heroLink: {
    href: WILD_WEST_PATH,
    label: 'Enter the Wild West collection',
  },
  heroImage: image('westernNarratives', 'i-Sc9hZGs', 'Old West atmosphere shaped by story, place, and human stakes.', 'Old West picture with frontier characters, period setting, and painterly Western atmosphere.'),
  gridImages: [
    image('westernNarratives', 'i-LL2Gp5r', 'Frontier life translated into a collectible Old West image.', 'Old West picture by Wayne Heim with historical clothing and cinematic painterly light.'),
    image('westernNarratives', 'i-trZrk2w', 'A Western narrative scene with the feeling of a larger story beyond the frame.', 'Old West fine art picture showing frontier mood and story-driven composition.'),
    image('westernNarratives', 'i-HBRmWg4', 'Old West picture language with authored fine art structure.', 'Painterly Old West scene with period detail, atmosphere, and Western narrative tension.'),
    image('westernNarratives', 'i-MHGPvcs', 'A frontier moment held between memory, myth, and consequence.', 'Old West picture featuring Western characters in a cinematic historical setting.'),
    image('westernNarratives', 'i-fM9qmKW', 'Western history rendered as a story-first fine art photograph.', 'Old West photography print candidate with painterly tone and frontier character.'),
    image('westernNarratives', 'i-hMXZ8Xh', 'Saloon-era atmosphere and Old West character in painterly light.', 'Old West picture with cowboy saloon mood and collectible Western art presence.'),
    image('westernNarratives', 'i-7mFGRtw', 'A quiet Western scene built around implication rather than spectacle.', 'Old West frontier picture with painterly atmosphere and story-led composition.'),
    image('westernNarratives', 'i-tBPfdxS', 'Old West imagery selected for mood, character, and collector appeal.', 'Old West picture by Wayne Heim with historical Western setting and fine art finish.'),
  ],
  sections: [
    {
      h2: 'Old West Pictures with a Collector Path',
      paragraphs: [
        'Old West pictures is a plain search phrase, and that is exactly why it matters. This page meets that intent quickly, then moves viewers into Wayne Heim\'s deeper Wild West collection.',
        'The work uses historical settings, frontier characters, period clothing, and painterly photographic craft to create images that feel collected rather than consumed.',
      ],
    },
    {
      h2: 'Frontier Scenes, Not Empty Nostalgia',
      paragraphs: [
        'The strongest Old West images are not just nostalgic props. They carry pressure: waiting, leaving, deciding, surviving, remembering.',
        'K4 Studios leans into that pressure so the Old West becomes a human visual field, not only a decorative style.',
      ],
    },
    {
      h2: 'From Old West Search to Western Fine Art',
      paragraphs: [
        'The page links into Wild West narrative archives, cowboy portraits, related Native American portrait work, and print options for collectors who want Western art with story depth.',
      ],
    },
  ],
  collectorEyebrow: 'Frontier Collection',
  collectorHeading: 'Old West Pictures as Fine Art Prints',
  collectorText:
    'Browse Old West scenes as part of a larger Western fine art archive, including frontier narratives, cowboy portraits, and collector-oriented print paths from K4 Studios.',
  printLinks: [
    { href: '/old-western-art', label: 'Old Western Art' },
    { href: '/wild-west-art', label: 'Wild West Art' },
    { href: '/Western-Photography-Prints', label: 'Western photography prints' },
  ],
  collectorLinks: [
    { href: `${WESTERN_NARRATIVES_PATH}/all`, label: 'Old West Narrative Scenes' },
    { href: `${COWBOY_COLOR_PATH}/all`, label: 'Old West Cowboy Portraits' },
    { href: `${NATIVE_COLOR_PATH}/all`, label: 'Native American Western Portraits' },
    { href: '/Other/Print-Options', label: 'Fine Art Print Options' },
  ],
  themeLinks: [
    { href: '/american-wild-west', label: 'American Wild West' },
    { href: '/Western-Frontier-Art', label: 'Western Frontier Art' },
    { href: '/vintage-western-art', label: 'Vintage Western Art' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'Are these real Old West pictures?',
      a: ['They are contemporary fine art photographs built from historical Western subjects, living history settings, and painterly photographic craft. They are not public-domain archival photos from the 1800s.'],
    },
    {
      q: 'Can Old West pictures work as collectible art?',
      a: ['Yes, when the image has authorship, composition, atmosphere, and story. K4 Studios presents selected Old West-inspired works as fine art prints rather than generic nostalgia images.'],
    },
    {
      q: 'What subjects appear in these Old West pictures?',
      a: ['The work includes cowboy figures, frontier streets, saloon-era mood, travel scenes, historical portraits, and narrative Western moments.'],
    },
  ],
};

export const cowboyArtworkPrintsPage = {
  path: '/cowboy-artwork-prints',
  title: 'Cowboy Artwork Prints | K4 Studios',
  h1: 'Cowboy Artwork Prints',
  metaDescription:
    'Cowboy artwork prints by Wayne Heim: painterly Western photography, collector-focused cowboy portraits, limited-edition print language, and series-based fine art presentation.',
  intro:
    'Cowboy artwork prints by Wayne Heim are built for collectors who want more than cowboy-themed wall decor. These painterly Western photographs are presented through collection, series, edition, and archival print language so the work can be understood as authored fine art.',
  breadcrumbLabel: 'Cowboy Artwork Prints',
  schemaAbout: [
    'Cowboy Artwork Prints',
    'Cowboy Art Prints',
    'Limited Edition Cowboy Prints',
    'Western Fine Art Prints',
    'Collector Cowboy Art',
  ],
  keywords: [
    'cowboy artwork prints',
    'cowboy art prints',
    'limited edition cowboy prints',
    'cowboy fine art prints',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Cowboy artwork prints image grid',
  gridHeading: 'Featured Cowboy Artwork Prints',
  heroLink: {
    href: '/Other/Print-Options',
    label: 'Compare collector print options',
  },
  heroImage: image('cowboyColor', 'i-TtXPkVK', 'Cowboy artwork print candidate with strong character and Western presence.', 'Cowboy artwork print by Wayne Heim featuring a frontier figure in painterly fine art photography style.'),
  gridImages: [
    image('cowboyColor', 'i-TVSQHzg', 'Cowboy portrait selected for collection depth and edition-minded presentation.', 'Limited-edition style cowboy artwork print with Western character and painterly light.'),
    image('cowboyColor', 'i-3ppJNtd', 'A collector-facing cowboy print built around expression and restraint.', 'Cowboy artwork print showing a weathered Western subject with fine art atmosphere.'),
    image('cowboyColor', 'i-XR9PZT5', 'Western cowboy artwork with presence suited to archival print display.', 'Cowboy fine art print candidate with authentic frontier styling and painterly finish.'),
    image('cowboyColor', 'i-bFwNMZK', 'Cowboy image chosen for series continuity and wall-scale strength.', 'Cowboy artwork print by Wayne Heim with cinematic Western mood and collector appeal.'),
    image('cowboyColor', 'i-5BtMrfM', 'A cowboy portrait that reads as artwork first, subject second.', 'Collector cowboy print with period clothing, hat, and painterly Western light.'),
    image('cowboyColor', 'i-8VPQmkW', 'Fine art cowboy print language anchored by human character.', 'Cowboy artwork print featuring Western portraiture and story-driven atmosphere.'),
    image('cowboyColor', 'i-Cz82g6x', 'Cowboy artwork shaped for limited-edition and series presentation.', 'Western cowboy artwork print with dramatic expression and archival fine art tone.'),
    image('cowboyColor', 'i-QWT3QZ4', 'A print-forward cowboy image with strong collector entry value.', 'Cowboy artwork print candidate with painterly photography and Old West character.'),
  ],
  sections: [
    {
      h2: 'Cowboy Artwork Prints for Collectors',
      paragraphs: [
        'Cowboy artwork prints at K4 Studios are framed as collectible works: image-led, series-aware, and connected to archival presentation rather than generic poster language.',
        'The print is not an afterthought. It is part of how the work is encountered, lived with, and collected.',
      ],
    },
    {
      h2: 'Series, Edition, and Print Context',
      paragraphs: [
        'A collector needs more than a nice cowboy image. They need to understand the visual series it belongs to, the story value of the subject, and the available print path.',
        'Wayne Heim\'s cowboy work fits naturally into portrait series, Wild West narratives, painterly fine art photography, and limited-edition collector language.',
      ],
    },
    {
      h2: 'Artwork, Not Cowboy Decor',
      paragraphs: [
        'Cowboy artwork prints can still work beautifully on a wall, but their value begins with authorship: light, expression, atmosphere, composition, and a reason to keep looking.',
      ],
    },
  ],
  collectorEyebrow: 'Limited Edition Print Path',
  collectorHeading: 'Cowboy Artwork Prints, Series, and Collector Editions',
  collectorText:
    'Explore cowboy artwork through collection pages, image pages, and print options designed for collector decision-making: series fit, archival presentation, limited-edition language, and long-term Western fine art value.',
  printLinks: [
    { href: '/Other/Print-Options', label: 'Compare collector print options' },
    { href: '/cowboy-art-prints', label: 'Cowboy art prints' },
    { href: '/Other/K4-Select-Series/Engrained', label: 'Engrained wood print series' },
  ],
  collectorLinks: [
    { href: `${COWBOY_COLOR_PATH}/all`, label: 'Cowboy Artwork Print Candidates' },
    { href: `${COWBOY_BW_PATH}/all`, label: 'Monochrome Cowboy Print Studies' },
    { href: '/Cowboy-Fine-Art-Photography', label: 'Cowboy Fine Art Photography Collection' },
    { href: '/Other/Series', label: 'K4 Studios Series and Editions' },
  ],
  themeLinks: [
    { href: '/cowboy-pictures', label: 'Cowboy Pictures' },
    { href: '/vintage-cowboy-art', label: 'Vintage Cowboy Art' },
    { href: '/cowboy-painterly-fine-art-photography', label: 'Cowboy Painterly Fine Art Photography' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'What are cowboy artwork prints?',
      a: ['Cowboy artwork prints are printed fine art works centered on cowboy subjects. At K4 Studios they begin as Wayne Heim photographs and are shaped with painterly authorship for collector presentation.'],
    },
    {
      q: 'Are these limited edition cowboy prints?',
      a: ['K4 Studios uses collection, series, and edition language where it applies. Individual image pages and print-option pages provide the best path for current collector details.'],
    },
    {
      q: 'How are cowboy artwork prints different from cowboy posters?',
      a: ['The emphasis is on authorship, archival print presentation, and long-term image strength rather than mass-market decorative reproduction.'],
    },
  ],
};

export const westernCowboyArtPage = {
  path: '/western-cowboy-art',
  title: 'Western Cowboy Art | Fine Art Prints by Wayne Heim',
  h1: 'Western Cowboy Art',
  metaDescription:
    'Western cowboy art by Wayne Heim, blending painterly photography, cowboy portraiture, frontier character, Western story, and collector-focused fine art print paths.',
  intro:
    'Western cowboy art at K4 Studios is built from camera-based fine art photography with a painterly Western finish. Wayne Heim treats cowboy subjects as character, story, and collector-worthy fine art rather than generic frontier decoration.',
  breadcrumbLabel: 'Western Cowboy Art',
  schemaAbout: [
    'Western Cowboy Art',
    'Cowboy Art',
    'Western Art',
    'Cowboy Fine Art Photography',
    'Western Fine Art Prints',
  ],
  keywords: [
    'western cowboy art',
    'cowboy western art',
    'cowboy art',
    'western cowboy fine art',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Western cowboy art image grid',
  gridHeading: 'Featured Western Cowboy Art',
  heroLink: {
    href: COWBOY_COLOR_PATH,
    label: 'View the Western cowboy portraits',
  },
  heroImage: image('cowboyColor', 'i-Dthbn8K', 'Western cowboy art with painterly atmosphere and human grit.', 'Western cowboy art image of a frontier character in painterly fine art photography style.'),
  gridImages: [
    image('cowboyColor', 'i-8cXqSjj', 'Cowboy art built around expression, light, and Western presence.', 'Western cowboy art portrait by Wayne Heim with hat, weathered face, and painterly tone.'),
    image('cowboyColor', 'i-D3HdMmb', 'A cowboy figure shaped as collectible Western artwork.', 'Cowboy Western art photograph with Old West styling and fine art atmosphere.'),
    image('cowboyColor', 'i-dwk4K8v', 'Western character study with print-worthy cowboy art presence.', 'Western cowboy art image with rustic frontier clothing and dramatic painterly light.'),
    image('cowboyColor', 'i-J8Tr628', 'A cowboy portrait with the visual weight of Western fine art.', 'Cowboy art by Wayne Heim showing period Western mood and painterly photographic craft.'),
    image('cowboyColor', 'i-dqdZcnX', 'Old West character rendered as modern Western cowboy art.', 'Western cowboy fine art portrait with authentic frontier character and collector appeal.'),
    image('cowboyColor', 'i-HHxxcsM', 'A restrained cowboy artwork selected for long-term wall presence.', 'Western cowboy art print candidate with expressive face, hat, and painterly tone.'),
    image('cowboyColor', 'i-NBsQ59h', 'Cowboy art that leans into memory without becoming generic decor.', 'Old West cowboy art photograph with historical atmosphere and fine art composition.'),
    image('cowboyColor', 'i-CgCxXGG', 'Western cowboy artwork carried by character and atmospheric light.', 'Western cowboy art by Wayne Heim with frontier clothing and painterly finish.'),
  ],
  sections: [
    {
      h2: 'Western Cowboy Art with Authorship',
      paragraphs: [
        'Western cowboy art can become formula quickly when the subject is treated as costume or symbol. K4 Studios uses the phrase as a commercial entry point, but the work stays grounded in human presence, painterly structure, and photographic authorship.',
        'The cowboy remains recognizable, but the image has to work as art first: composition, light, restraint, and story all have to hold.',
      ],
    },
    {
      h2: 'Cowboy Subject, Fine Art Treatment',
      paragraphs: [
        'Wayne Heim\'s cowboy images begin as photographs of real people, settings, and period detail. The finished work is shaped through painterly decisions that give the image atmosphere and collector depth.',
        'That approach lets Western cowboy art speak to both old-school keyword intent and serious fine art expectations.',
      ],
    },
    {
      h2: 'A Direct Route to Cowboy Collections',
      paragraphs: [
        'This page connects cowboy art searchers to the deeper K4 Studios cowboy portrait archive, painterly Western pages, and print options for collectors.',
      ],
    },
  ],
  collectorEyebrow: 'Western Cowboy Collection',
  collectorHeading: 'Western Cowboy Art as Collectible Fine Art',
  collectorText:
    'Browse Western cowboy art through Wayne Heim\'s cowboy portrait series, image pages, and fine art print paths, with emphasis on character, atmosphere, archival presentation, and collector value.',
  printLinks: [
    { href: '/cowboy-art-prints', label: 'Cowboy art prints' },
    { href: '/cowboy-fine-art-prints', label: 'Cowboy fine art prints' },
    { href: '/Other/Print-Options', label: 'Fine art print options' },
  ],
  collectorLinks: [
    { href: `${COWBOY_COLOR_PATH}/all`, label: 'Western Cowboy Art in Color' },
    { href: `${COWBOY_BW_PATH}/all`, label: 'Western Cowboy Art in Black & White' },
    { href: '/Cowboy-Fine-Art-Photography', label: 'Cowboy Fine Art Photography' },
    { href: '/cowboy-painterly-fine-art-photography', label: 'Painterly Cowboy Photography' },
  ],
  themeLinks: [
    { href: '/western-cowboy-pictures', label: 'Western Cowboy Pictures' },
    { href: '/Western-Cowboy-Photography', label: 'Western Cowboy Photography' },
    { href: '/American-Western-Art', label: 'American Western Art' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'What is Western cowboy art?',
      a: ['Western cowboy art is Western art centered on cowboy subjects, frontier character, and the visual language of the American West. At K4 Studios it is presented through painterly fine art photography.'],
    },
    {
      q: 'Is this cowboy art photography or painting?',
      a: ['Wayne Heim\'s Western cowboy art begins as camera-based photography and is then shaped with painterly light, tone, atmosphere, and composition.'],
    },
    {
      q: 'Can Western cowboy art be collected as fine art prints?',
      a: ['Yes. Selected cowboy works connect to image pages, collection pages, and print-option paths for collectors interested in Western fine art presentation.'],
    },
  ],
};

export const cowboyFineArtPrintsPage = {
  path: '/cowboy-fine-art-prints',
  title: 'Cowboy Fine Art Prints | K4 Studios',
  h1: 'Cowboy Fine Art Prints',
  metaDescription:
    'Cowboy fine art prints by Wayne Heim: painterly Western cowboy portraits, collector series, archival print options, limited-edition language, and fine art presentation.',
  intro:
    'Cowboy fine art prints by Wayne Heim are built for collectors who want Western cowboy imagery with authorship, series context, and archival presentation. These are painterly camera-based works, selected and positioned as fine art rather than cowboy-themed posters.',
  breadcrumbLabel: 'Cowboy Fine Art Prints',
  schemaAbout: [
    'Cowboy Fine Art Prints',
    'Cowboy Art Prints',
    'Limited Edition Cowboy Prints',
    'Cowboy Fine Art Photography',
    'Western Collector Prints',
  ],
  keywords: [
    'cowboy fine art prints',
    'cowboy art prints',
    'limited edition cowboy prints',
    'western cowboy fine art prints',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Cowboy fine art prints image grid',
  gridHeading: 'Featured Cowboy Fine Art Prints',
  heroLink: {
    href: '/Other/Print-Options',
    label: 'Review fine art print options',
  },
  heroImage: image('cowboyColor', 'i-QGCQt7M', 'Cowboy fine art print candidate with strong Western character.', 'Cowboy fine art print by Wayne Heim featuring a frontier portrait with painterly Western atmosphere.'),
  gridImages: [
    image('cowboyColor', 'i-8W7jxkN', 'Collector cowboy portrait selected for archival print presence.', 'Cowboy fine art print candidate with Western hat, expression, and painterly light.'),
    image('cowboyColor', 'i-n8TX2qS', 'Fine art cowboy image with series-worthy character and restraint.', 'Cowboy collector print by Wayne Heim with rustic frontier styling and fine art finish.'),
    image('cowboyColor', 'i-tVxgfZN', 'A cowboy print candidate built around mood, posture, and story.', 'Limited-edition style cowboy fine art print with Western character and painterly tone.'),
    image('cowboyColor', 'i-TgkwSbh', 'Cowboy portraiture presented through a collector print lens.', 'Cowboy fine art photography print candidate with dramatic Western atmosphere.'),
    image('cowboyColor', 'i-BtCH5S3', 'A Western cowboy image strong enough for print-first presentation.', 'Cowboy fine art print showing authentic period detail and painterly photographic craft.'),
    image('cowboyColor', 'i-TQw7vC7', 'Cowboy fine art print language anchored by human presence.', 'Western cowboy print candidate with character-led composition and fine art finish.'),
    image('cowboyColor', 'i-S5zV9h4', 'Collector-facing cowboy work with atmospheric Western tone.', 'Cowboy fine art print by Wayne Heim with Old West mood and archival print appeal.'),
    image('cowboyColor', 'i-rC7SvgP', 'A cowboy image selected for limited-edition and series context.', 'Cowboy fine art print candidate with painterly light and frontier subject matter.'),
  ],
  sections: [
    {
      h2: 'Cowboy Fine Art Prints for Serious Western Buyers',
      paragraphs: [
        'This page leans intentionally into print language: collector, series, archival, limited-edition, and fine art presentation. The goal is to meet commercial intent without making the work feel like commodity decor.',
        'Each selected image is a cowboy photograph shaped with painterly authorship and positioned for collectors who care about character and long-term visual strength.',
      ],
    },
    {
      h2: 'Series Context and Edition Thinking',
      paragraphs: [
        'A cowboy fine art print should not stand alone as an isolated product tile. It belongs to a larger body of work: Western Cowboy Portraits, Wild West narratives, painterly Western photography, and Wayne Heim\'s collector print structure.',
        'That context helps buyers understand why the image matters, where it sits inside the collection, and how it can be collected.',
      ],
    },
    {
      h2: 'Archival Presentation over Poster Language',
      paragraphs: [
        'The print path emphasizes fine art presentation, not casual poster reproduction. Buyers can move from this page into image pages, print options, series information, and related cowboy collections.',
      ],
    },
  ],
  collectorEyebrow: 'Collector Print Path',
  collectorHeading: 'Cowboy Fine Art Prints, Series, and Editions',
  collectorText:
    'Explore cowboy fine art prints through image pages, collection archives, series context, and archival print options, with collector language around limited editions, long-term presentation, and Western fine art value.',
  printLinks: [
    { href: '/Other/Print-Options', label: 'Compare fine art print options' },
    { href: '/Other/Series', label: 'Series and editions' },
    { href: '/Other/K4-Select-Series/Engrained', label: 'Engrained collector series' },
  ],
  collectorLinks: [
    { href: `${COWBOY_COLOR_PATH}/all`, label: 'Cowboy Fine Art Print Candidates' },
    { href: `${COWBOY_BW_PATH}/all`, label: 'Black & White Cowboy Print Studies' },
    { href: '/Cowboy-Fine-Art-Photography', label: 'Cowboy Fine Art Photography Collection' },
    { href: '/cowboy-artwork-prints', label: 'Cowboy Artwork Prints' },
  ],
  themeLinks: [
    { href: '/western-cowboy-art', label: 'Western Cowboy Art' },
    { href: '/cowboy-painterly-fine-art-photography', label: 'Cowboy Painterly Fine Art Photography' },
    { href: '/Western-Photography-Prints', label: 'Western Photography Prints' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'What makes a cowboy print a fine art print?',
      a: ['A cowboy print becomes fine art when authorship, composition, archival presentation, and collector context matter more than simple subject decoration.'],
    },
    {
      q: 'Are cowboy fine art prints limited editions?',
      a: ['Edition and series details should be reviewed through the image and print-option paths. This page is designed to direct collectors toward those details.'],
    },
    {
      q: 'How are cowboy fine art prints different from cowboy art prints?',
      a: ['Cowboy fine art prints is the more collector-specific phrase. It emphasizes authorship, archival quality, series context, and long-term image value.'],
    },
  ],
};

export const cowboyThemedArtworkPage = {
  path: '/cowboy-themed-artwork',
  title: 'Cowboy Themed Artwork | K4 Studios',
  h1: 'Cowboy Themed Artwork',
  metaDescription:
    'Cowboy themed artwork by Wayne Heim, using painterly Western photography, frontier portraiture, cowboy subjects, and collector-focused fine art print presentation.',
  intro:
    'Cowboy themed artwork can sound like decor language, but K4 Studios uses it as a doorway into stronger Western fine art. Wayne Heim\'s cowboy images are built from real photographic subjects, painterly atmosphere, and narrative restraint.',
  breadcrumbLabel: 'Cowboy Themed Artwork',
  schemaAbout: [
    'Cowboy Themed Artwork',
    'Cowboy Artwork',
    'Western Themed Art',
    'Cowboy Wall Art',
    'Cowboy Fine Art Prints',
  ],
  keywords: [
    'cowboy themed artwork',
    'cowboy artwork',
    'western themed artwork',
    'cowboy themed art',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Cowboy themed artwork image grid',
  gridHeading: 'Featured Cowboy Themed Artwork',
  heroLink: {
    href: COWBOY_COLOR_PATH,
    label: 'Browse cowboy themed work',
  },
  heroImage: image('cowboyColor', 'i-SBjhvGf', 'Cowboy themed artwork with fine art structure and Western atmosphere.', 'Cowboy themed artwork by Wayne Heim featuring a Western portrait with painterly light.'),
  gridImages: [
    image('cowboyColor', 'i-WzTZ6Jv', 'Cowboy artwork that answers theme intent without losing authorship.', 'Cowboy themed fine art photograph with frontier clothing and Western mood.'),
    image('cowboyColor', 'i-9q5B7FX', 'A cowboy-themed image carried by expression and painterly restraint.', 'Western cowboy themed artwork with dramatic portrait lighting and collector appeal.'),
    image('cowboyColor', 'i-7RWxjz3', 'Cowboy subject matter shaped into fine art wall presence.', 'Cowboy themed artwork print candidate with rustic Western styling and painterly finish.'),
    image('cowboyColor', 'i-grM2LkC', 'A Western character image for buyers searching cowboy themes.', 'Cowboy themed artwork by Wayne Heim with period detail and fine art composition.'),
    image('cowboyColor', 'i-GKFFQzH', 'Cowboy artwork with Old West tone and story-first atmosphere.', 'Cowboy themed Western art photograph with frontier character and painterly tone.'),
    image('cowboyColor', 'i-GSPLsk9', 'Theme-driven cowboy art elevated by character and light.', 'Cowboy themed artwork showing Western portraiture and collectible print presence.'),
    image('cowboyColor', 'i-MB2KXB3', 'A cowboy image with enough structure to move beyond decor.', 'Cowboy themed fine art image with Western hat, expression, and atmospheric light.'),
    image('cowboyColor', 'i-5T9mQqT', 'Cowboy artwork selected for mood, authenticity, and print value.', 'Cowboy themed artwork print by Wayne Heim with painterly Western photography style.'),
  ],
  sections: [
    {
      h2: 'Cowboy Theme, Fine Art Standard',
      paragraphs: [
        'Cowboy themed artwork is useful commercial language because it matches how buyers search. The page can meet that phrase while still raising the standard from theme-first decor to image-first fine art.',
        'At K4 Studios, the cowboy theme is carried by character, setting, clothing, and atmosphere, but the image has to succeed through composition and authorship.',
      ],
    },
    {
      h2: 'Western Artwork without Generic Decor Signals',
      paragraphs: [
        'The danger of themed art is sameness. Wayne Heim\'s cowboy work avoids that by emphasizing expression, gesture, silence, and the feeling of a larger frontier story.',
        'That makes the work useful for buyers who started with a decor phrase but may respond to deeper collector language once they see the images.',
      ],
    },
    {
      h2: 'A Browse Doorway into Cowboy Fine Art',
      paragraphs: [
        'This page links into cowboy portraits, cowboy fine art prints, Western cowboy art, and print options so theme-based visitors can move naturally toward the collection.',
      ],
    },
  ],
  collectorEyebrow: 'Theme to Collection',
  collectorHeading: 'Cowboy Themed Artwork with Collector Depth',
  collectorText:
    'Use this page as a bridge from cowboy-themed search intent into Wayne Heim\'s cowboy portrait collections, fine art print options, and series-aware Western artwork.',
  printLinks: [
    { href: '/cowboy-fine-art-prints', label: 'Cowboy fine art prints' },
    { href: '/cowboy-artwork-prints', label: 'Cowboy artwork prints' },
    { href: '/Other/Print-Options', label: 'Fine art print options' },
  ],
  collectorLinks: [
    { href: `${COWBOY_COLOR_PATH}/all`, label: 'Cowboy Themed Color Artwork' },
    { href: `${COWBOY_BW_PATH}/all`, label: 'Cowboy Themed Black & White Artwork' },
    { href: '/western-cowboy-art', label: 'Western Cowboy Art' },
    { href: '/Cowboy-Fine-Art-Photography', label: 'Cowboy Fine Art Photography' },
  ],
  themeLinks: [
    { href: '/cowboy-pictures', label: 'Cowboy Pictures' },
    { href: '/cowboy-wall-art', label: 'Cowboy Wall Art' },
    { href: '/Western-Cowboy-Photography', label: 'Western Cowboy Photography' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'What is cowboy themed artwork?',
      a: ['Cowboy themed artwork is art centered on cowboy subjects, Western character, and frontier visual language. At K4 Studios that theme is handled through painterly fine art photography.'],
    },
    {
      q: 'Is cowboy themed artwork mainly decor?',
      a: ['It can be decor-first elsewhere, but K4 Studios treats cowboy themes through authorship, image structure, and collector print presentation.'],
    },
    {
      q: 'Can cowboy themed artwork be collected as fine art?',
      a: ['Yes, when the image has craft, story, and presentation depth. These pages guide buyers toward cowboy collections and fine art print options.'],
    },
  ],
};

export const westernArtPrintsPage = {
  path: '/western-art-prints',
  title: 'Western Art Prints | K4 Studios',
  h1: 'Western Art Prints',
  metaDescription:
    'Western art prints by Wayne Heim, including painterly cowboy portraits, frontier narratives, Native American portrait work, collector series, and limited-edition fine art print paths.',
  intro:
    'Western art prints by Wayne Heim bring cowboy portraits, frontier narratives, Native American portrait work, and painterly Western scenes into a collector-focused print context for buyers looking for Western art with series depth, limited-edition language, and fine art presentation.',
  breadcrumbLabel: 'Western Art Prints',
  schemaAbout: [
    'Western Art Prints',
    'Western Fine Art Prints',
    'Limited Edition Western Prints',
    'Cowboy Art Prints',
    'American West Art Prints',
  ],
  keywords: [
    'western art prints',
    'western fine art prints',
    'limited edition western prints',
    'american west art prints',
    'Wayne Heim',
    'K4 Studios',
  ],
  gridLabel: 'Western art prints image grid',
  gridHeading: 'Featured Western Art Prints',
  heroLink: {
    href: '/Other/Print-Options',
    label: 'Review print and collector options',
  },
  heroImage: image('westernNarratives', 'i-5TtHV8g', 'Western art print candidate from the story-driven Wild West collection.', 'Western art print by Wayne Heim featuring frontier narrative atmosphere and painterly fine art photography.'),
  gridImages: [
    image('westernNarratives', 'i-9BhX2Lj', 'A Western narrative print with cinematic story pressure.', 'Western fine art print candidate with frontier characters and painterly light.'),
    image('westernNarratives', 'i-46kWCqc', 'Western art print selected for atmosphere and collector wall presence.', 'Limited-edition style Western art print with Old West mood and fine art composition.'),
    image('nativeColor', 'i-rRdrQBg', 'Native American portrait work within the broader Western art print field.', 'Western art print featuring Native American portrait photography by Wayne Heim.'),
    image('nativeColor', 'i-4Hz6D7k', 'A historically grounded portrait with Western collection relevance.', 'Fine art Western print candidate with Indigenous portrait subject and painterly treatment.'),
    image('nativeColor', 'i-LmpRvHw', 'Western art print language broadened beyond cowboy iconography.', 'Western fine art print featuring Native American subject, color, and painterly atmosphere.'),
    image('nativeColor', 'i-WfRwfpM', 'Collector-facing Western portrait with cultural and historical presence.', 'Western art print candidate with Indigenous portraiture and fine art photographic craft.'),
    image('nativeColor', 'i-69qsFwx', 'A Western print selection built around dignity, presence, and restraint.', 'Painterly Western art print featuring Native American portrait work by Wayne Heim.'),
    image('nativeColor', 'i-NgkC4Zt', 'Western art print candidate connecting history, portraiture, and collection depth.', 'Western fine art print with Native American subject and collector-focused presentation.'),
  ],
  sections: [
    {
      h2: 'Western Art Prints with Collection Depth',
      paragraphs: [
        'Western art prints is a valuable commercial phrase, but it should not flatten the work into product language alone. This page presents prints as a collector path into Wayne Heim\'s larger Western fine art archive.',
        'The selection includes cowboy imagery, frontier narrative, and Native American portrait work so the page signals Western breadth without becoming generic.',
      ],
    },
    {
      h2: 'Limited Edition and Series Language',
      paragraphs: [
        'Collectors need orientation: what series does the image belong to, what subject branch does it represent, and how should the print be understood beyond size and material?',
        'K4 Studios can use Western art prints as a commercial entry point while emphasizing limited-edition context, collection structure, archival presentation, and long-term image value.',
      ],
    },
    {
      h2: 'From Western Decor Search to Fine Art Decision',
      paragraphs: [
        'The page meets buyers who may begin with wall art or print intent, then guides them toward authored Western fine art: stronger images, clearer series relationships, and print options built around collecting.',
      ],
    },
  ],
  collectorEyebrow: 'Collector Print Entry',
  collectorHeading: 'Western Art Prints, Limited Editions, and Series',
  collectorText:
    'Use this page as a print-first doorway into K4 Studios: Western narratives, cowboy portraits, Native American portrait work, series context, limited-edition language, and archival presentation for collectors.',
  printLinks: [
    { href: '/Western-Photography-Prints', label: 'Western photography prints' },
    { href: '/Other/Print-Options', label: 'Fine art print options' },
    { href: '/Other/Series', label: 'Series and editions' },
  ],
  collectorLinks: [
    { href: `${WESTERN_NARRATIVES_PATH}/all`, label: 'Western Narrative Print Candidates' },
    { href: `${COWBOY_COLOR_PATH}/all`, label: 'Cowboy Portrait Print Candidates' },
    { href: `${NATIVE_COLOR_PATH}/all`, label: 'Native American Portrait Print Candidates' },
    { href: '/Other/K4-Select-Series/Engrained', label: 'Engrained Collector Series' },
  ],
  themeLinks: [
    { href: '/American-Western-Art', label: 'American Western Art' },
    { href: '/Western-Fine-Art-Photography', label: 'Western Fine Art Photography' },
    { href: '/cowboy-art-prints', label: 'Cowboy Art Prints' },
    { href: '/cowboy-artwork-prints', label: 'Cowboy Artwork Prints' },
    ...westernThemeLinks,
  ],
  faqItems: [
    {
      q: 'What types of Western art prints are available at K4 Studios?',
      a: ['The Western print path includes cowboy portraits, frontier narrative scenes, Native American portrait work, painterly Western photography, and selected series-based fine art print options.'],
    },
    {
      q: 'Are these Western art prints limited editions?',
      a: ['Edition and series details should be confirmed through the relevant image and print-option paths. This page is designed to guide collectors toward those deeper print decisions.'],
    },
    {
      q: 'How are Western art prints different from Western photography prints?',
      a: ['Western art prints is the broader commercial phrase. At K4 Studios, the work is camera-based, but the print is positioned as authored Western fine art rather than ordinary photographic reproduction.'],
    },
  ],
};
