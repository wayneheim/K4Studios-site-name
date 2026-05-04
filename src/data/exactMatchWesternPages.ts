// @ts-nocheck
import { galleryData as cowboyColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBwData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as westernNarrativesColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as nativeColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';

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

function proxySrc(id, size = 'm') {
  return `/img/${id}/${size}.jpg`;
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
    src: proxySrc(id, 'm'),
    srcL: proxySrc(id, 'l'),
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
