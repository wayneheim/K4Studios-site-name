export const WILD_WEST_HUB_PATH = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West';

import { galleryData as westernNarrativesColorGallery } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as westernCowboyPortraitsColorGallery } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';

// Deep content imports for active pages
import { storySections as cinematicStory, deepFaqItems as cinematicFaq } from './cinematic-western-art';
import { storySections as cowboyPrintsStory, deepFaqItems as cowboyPrintsFaq } from './cowboy-art-prints';
import { storySections as storytellingStory, deepFaqItems as storytellingFaq } from './western-storytelling-photography';

export interface DoorwayFaqItem {
  question: string;
  answer: string;
}

export interface DoorwayStorySection {
  subhead: string;
  paragraphs: string[];
}

export interface DoorwayDeepFaqItem {
  question: string;
  answers: string[];
}

export interface DoorwaySecondaryLink {
  href: string;
  label: string;
}

export interface DoorwayHeroImage {
  id: string;
  title: string;
  alt: string;
  href: string;
}

export interface DoorwayPage {
  active: boolean;
  slug: string;
  h1: string;
  introParagraph: string;
  expansionParagraphs: [string, ...string[]];
  metaDescription: string;
  metaTitle?: string;
  faqItems?: DoorwayFaqItem[];
  primaryCtaText?: string;
  secondaryLinks?: DoorwaySecondaryLink[];
  heroImages?: DoorwayHeroImage[];
  /** Deep content — present on active SEO-competitive pages */
  storySections?: DoorwayStorySection[];
  deepFaqItems?: DoorwayDeepFaqItem[];
  gridImages?: DoorwayHeroImage[];
}

function selectHeroImages(
  gallery: any[],
  galleryPath: string,
  offset = 0,
  count = 3
): DoorwayHeroImage[] {
  return (gallery || [])
    .filter((item) => item && typeof item.id === 'string')
    .filter((item) => /^i-[A-Za-z0-9]+$/.test(item.id))
    .filter((item) => item.id !== 'i-k4studios')
    .filter((item) => !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase()) && item.visibility !== 'hidden' && item.visibility !== 'hide')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(offset, offset + count)
    .map((item) => ({
      id: item.id,
      title: item.title || 'Featured Work',
      alt: (item.alt || item.title || 'Featured Western image').trim(),
      href: `${galleryPath}/${item.id}`,
    }));
}

const westernNarrativesColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color';
const westernCowboyPortraitsColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';

const cinematicHeroImages = selectHeroImages(westernNarrativesColorGallery, westernNarrativesColorPath, 0, 3);
const cowboyPrintsHeroImages = selectHeroImages(westernCowboyPortraitsColorGallery, westernCowboyPortraitsColorPath, 0, 3);
const storytellingHeroImages = selectHeroImages(westernNarrativesColorGallery, westernNarrativesColorPath, 3, 3);

// Curated image grids for active pages (12 images each, like Western Wall Art's 25-image grid)
const cinematicGridImages = selectHeroImages(westernNarrativesColorGallery, westernNarrativesColorPath, 0, 12);
const cowboyPrintsGridImages = selectHeroImages(westernCowboyPortraitsColorGallery, westernCowboyPortraitsColorPath, 0, 12);
const storytellingGridImages = [
  ...selectHeroImages(westernNarrativesColorGallery, westernNarrativesColorPath, 0, 6),
  ...selectHeroImages(westernCowboyPortraitsColorGallery, westernCowboyPortraitsColorPath, 0, 6),
];

// Phase 3 lock: pages are staged in one registry, but only active entries are generated.
export const doorwayPages: DoorwayPage[] = [
  {
    active: false,
    slug: 'what-is-western-art',
    h1: 'What Is Western Art?',
    metaTitle: 'What Is Western Art? - Wayne Heim',
    metaDescription:
      'A clear definition of Western art through subject, structure, and story, with a path into K4 Studios Wild West work.',
    introParagraph:
      'Western art is visual work rooted in the history, mythology, and human realities of the American frontier. At its strongest, it is not just about costumes or scenery; it is about consequence, character, and cultural memory carried through image-making.',
    expansionParagraphs: [
      'In K4\'s lane, that meaning is carried through painterly light, cinematic restraint, and narrative pressure inside a single frame. The goal is not generic nostalgia but authored work where gesture, atmosphere, and composition imply a larger story.',
      'That distinction matters for collectors because it separates decorative Western motifs from fine art with repeat viewing depth. The image keeps unfolding over time instead of delivering everything at first glance.',
    ],
    faqItems: [
      {
        question: 'Is Western art only cowboy imagery?',
        answer:
          'No. Cowboy subjects are part of it, but Western art also includes landscape, frontier social life, conflict, labor, and historical memory.',
      },
      {
        question: 'What makes Western art feel contemporary?',
        answer:
          'Contemporary Western art keeps the historical language but applies modern authorship, pacing, and emotional structure rather than repeating old formulas.',
      },
    ],
    primaryCtaText: 'Explore the Wild West Collection',
    secondaryLinks: [
      { href: '/Western-Fine-Art-Photography', label: 'Western Fine Art Photography' },
      { href: '/Narrative-Western-Art', label: 'Narrative Western Art' },
      { href: '/Blog/what-is-western-art', label: 'Western Art: Long-Form Definition' },
    ],
  },
  {
    active: false,
    slug: 'what-is-painterly-photography',
    h1: 'What Is Painterly Photography?',
    metaTitle: 'What Is Painterly Photography? - Wayne Heim',
    metaDescription:
      'Understand painterly photography as authored light, tone, and atmosphere, not filters, in the K4 Studios Western context.',
    introParagraph:
      'Painterly photography is photography constructed with the visual logic of painting: controlled light, tonal hierarchy, compositional weight, and atmosphere. It is less about effects and more about how an image is authored to hold mood and structure.',
    expansionParagraphs: [
      'At K4, painterly does not mean soft-focus nostalgia. It means deliberate rendering of form and depth so the frame feels lived in, with color or monochrome serving story rather than spectacle.',
      'That approach aligns naturally with narrative Western work because painterly decisions can direct attention, pace interpretation, and reinforce the emotional pressure inside a scene.',
    ],
    faqItems: [
      {
        question: 'Is painterly photography the same as heavy editing?',
        answer:
          'No. Editing can support painterly outcomes, but the core is authored structure in capture and composition, not a preset look.',
      },
      {
        question: 'Can black and white be painterly?',
        answer:
          'Yes. Tonal control, edge behavior, and light placement often make painterly structure even more visible in black and white.',
      },
    ],
    primaryCtaText: 'See the Art Behind the Story',
    secondaryLinks: [
      { href: '/Western-Fine-Art-Photography', label: 'Western Fine Art Photography' },
      { href: '/Blog/what-is-painterly-photography', label: 'Painterly Photography: Long-Form Guide' },
      { href: '/Narrative-Western-Art', label: 'Narrative Western Art' },
    ],
  },
  {
    active: false,
    slug: 'narrative-western-art',
    h1: 'What Is Narrative Western Art?',
    metaTitle: 'What Is Narrative Western Art? - Wayne Heim',
    metaDescription:
      'A concise definition of narrative Western art and how K4 frames story, tension, and implied sequence in still imagery.',
    introParagraph:
      'Narrative Western art is Western image-making where story is structural, not decorative. The frame suggests a before and after, so the viewer experiences implication, tension, and human stakes rather than a static genre pose.',
    expansionParagraphs: [
      'In K4\'s work, that usually appears through restrained gesture, controlled distance between figures, and directional light that reads like a narrative cue. The frame functions as a one-image movie rather than a solved illustration.',
      'This differs from traditional motif-driven Western imagery because authorship is carried by consequence and emotional pacing. The myth remains present, but the human structure beneath it becomes the real subject.',
    ],
    faqItems: [
      {
        question: 'How is narrative Western art different from traditional Western art?',
        answer:
          'Traditional work may prioritize iconic subject matter, while narrative Western art prioritizes story pressure and implied sequence inside the composition.',
      },
      {
        question: 'Does narrative always require visible action?',
        answer:
          'No. Stillness can carry stronger narrative force when posture, light, and framing imply what has happened or what is about to happen.',
      },
    ],
    primaryCtaText: 'Explore the Wild West Collection',
    secondaryLinks: [
      { href: '/Narrative-Western-Art', label: 'Narrative Western Art Hub' },
      { href: '/Blog/narrative-western-art-vs-traditional', label: 'Narrative vs Traditional Western Art' },
      {
        href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
        label: 'Western Narratives Gallery',
      },
    ],
  },
  {
    active: false,
    slug: 'western-fine-art-photography',
    h1: 'Western Fine Art Photography',
    metaTitle: 'Western Fine Art Photography - Wayne Heim',
    metaDescription:
      'Western fine art photography defined through authored composition, painterly atmosphere, and narrative intent.',
    introParagraph:
      'Western fine art photography is Western subject matter interpreted through authored visual decisions, not just recorded as documentary or decor. It prioritizes composition, tone, pacing, and intent so the image carries lasting artistic weight.',
    expansionParagraphs: [
      'In K4\'s lane, this includes painterly rendering, cinematic atmosphere, and narrative framing that gives each image a human center. The point is not to mimic film stills or vintage style, but to build coherent visual language around frontier themes.',
      'For collectors, this distinction is practical: stronger fine art work remains structurally compelling across formats and over time. It rewards close looking instead of relying on novelty or trend aesthetics.',
    ],
    faqItems: [
      {
        question: 'What separates Western fine art photography from Western photography generally?',
        answer:
          'Fine art photography is defined by sustained authorship and artistic intent, while general Western photography can include documentary, editorial, or commercial uses.',
      },
      {
        question: 'Is this category only black and white work?',
        answer:
          'No. Both color and black and white can be fine art when structure, tonal control, and narrative intent are consistent.',
      },
    ],
    primaryCtaText: 'See the Art Behind the Story',
    secondaryLinks: [
      { href: '/Western-Fine-Art-Photography', label: 'Western Fine Art Photography Hub' },
      { href: '/wayne-heim-western-fine-art-photography', label: 'Artist Authority Page' },
      { href: '/Blog/what-is-western-fine-art-photography', label: 'Definition Guide' },
    ],
  },
  {
    active: false,
    slug: 'cinematic-western-art',
    h1: 'What Makes Western Art Feel Cinematic?',
    metaTitle: 'What Makes Western Art Feel Cinematic? - Wayne Heim',
    metaDescription:
      'A direct explanation of cinematic Western art in still images through implication, atmosphere, and narrative pressure.',
    introParagraph:
      'A Western frame turns cinematic when it feels caught in the middle of something. In K4\'s lane, that pressure comes from painterly light, withheld information, and the sense that the real moment started before you arrived.',
    expansionParagraphs: [
      'Selective reveal, directional light, and distance between figure and ground do the work. The frame feels lived, not arranged.',
      'Nothing is over-explained. The image holds tension, leaves the before and after offscreen, and keeps opening on repeat viewing.',
    ],
    faqItems: [
      {
        question: 'Does cinematic mean film-like color treatment?',
        answer:
          'Not by itself. Cinematic presence is mostly structural: implication, pacing, framing, and emotional direction.',
      },
      {
        question: 'Can a quiet portrait feel cinematic?',
        answer:
          'Yes. Cinematic force often comes from restraint and unresolved tension, not spectacle.',
      },
    ],
    primaryCtaText: 'Experience the Scene in the Wild West Collection',
    secondaryLinks: [
      { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West', label: 'Wild West Hub' },
      {
        href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
        label: 'Western Narratives Gallery',
      },
      { href: '/Blog/what-makes-an-image-feel-cinematic', label: 'Cinematic Image Guide' },
    ],
    heroImages: cinematicHeroImages,
    storySections: cinematicStory,
    deepFaqItems: cinematicFaq,
    gridImages: cinematicGridImages,
  },
  {
    active: false,
    slug: 'cowboy-art-prints',
    h1: 'Cowboy Art Prints',
    metaTitle: 'Cowboy Art Prints - Wayne Heim',
    metaDescription:
      'Cowboy art prints with a collector-facing focus on authored story, painterly atmosphere, and long-term visual depth.',
    introParagraph:
      'The right cowboy print does not just fill a wall. It brings presence with it: character, atmosphere, and enough pressure in the frame to stay alive after the first look.',
    expansionParagraphs: [
      'In K4\'s lane, the value is not the hat, the horse, or the genre signal. It is the way light, gesture, and restraint turn the print into something you live with.',
      'That is where collector value starts. The image works as art first and keeps its grip long after the room is finished.',
    ],
    faqItems: [
      {
        question: 'Are cowboy art prints mainly decorative?',
        answer:
          'They can be, but collector-grade cowboy prints are selected for artistic structure and narrative depth, not only for matching decor style.',
      },
      {
        question: 'What should I look for first in a cowboy print?',
        answer:
          'Start with composition, light, and emotional clarity. If those are strong, the subject will continue to hold value over time.',
      },
    ],
    primaryCtaText: 'Collect from the Wild West Collection',
    secondaryLinks: [
      { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West', label: 'Wild West Hub' },
      { href: '/Western-Photography-Prints', label: 'Western Photography Prints' },
      {
        href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
        label: 'Western Cowboy Portraits',
      },
    ],
    heroImages: cowboyPrintsHeroImages,
    storySections: cowboyPrintsStory,
    deepFaqItems: cowboyPrintsFaq,
    gridImages: cowboyPrintsGridImages,
  },
  {
    active: false,
    slug: 'western-wall-art',
    h1: 'Western Wall Art',
    metaTitle: 'Western Wall Art - Wayne Heim',
    metaDescription:
      'Western wall art defined for buyers who want more than decor: painterly atmosphere, narrative clarity, and collector depth.',
    introParagraph:
      'Western wall art is art displayed in interior spaces using Western subjects, tone, and visual language. At its best, it does not stop at style cues; it brings authored image structure and emotional continuity into the room.',
    expansionParagraphs: [
      'In K4\'s lane, Western wall art begins with room intent, then opens toward stronger work built on painterly light, cinematic restraint, and narrative presence. The room benefit remains, but the artistic standard rises.',
      'That shift helps separate collectible wall art from interchangeable decor prints. The best pieces carry human tension and story logic that keep them active as art, not just accessories.',
    ],
    faqItems: [
      {
        question: 'How is Western wall art different from Western decor?',
        answer:
          'Decor can be style-first, while stronger wall art is composition-first and retains artistic depth beyond the initial look.',
      },
      {
        question: 'Can Western wall art still work in modern interiors?',
        answer:
          'Yes. Painterly and restrained pieces often integrate well with modern spaces because they rely on structure and tone rather than visual clutter.',
      },
    ],
    primaryCtaText: 'Explore the Wild West Collection',
    secondaryLinks: [
      { href: '/Western-Wall-Art', label: 'Western Wall Art Hub' },
      { href: '/Western-Wall-Art-for-Interior-Designers', label: 'Western Wall Art for Designers' },
      { href: '/Western-Interior-Design-Art', label: 'Western Interior Design Art' },
    ],
  },
  {
    active: false,
    slug: 'western-storytelling-photography',
    h1: 'Western Storytelling Photography',
    metaTitle: 'Western Storytelling Photography - Wayne Heim',
    metaDescription:
      'Western storytelling photography defined through implied narrative, painterly-cinematic restraint, and frontier human stakes.',
    introParagraph:
      'The moment does not resolve. It holds. Western storytelling photography lives in that pressure, where one frame carries the feeling of a before and after without spelling either one out.',
    expansionParagraphs: [
      'In K4\'s lane, gesture, spacing, and light direction do the talking. The frame feels entered, not explained.',
      'That is the one-image movie: tension over explanation, human stakes under the myth, and just enough withheld to keep the image moving after it stands still.',
    ],
    faqItems: [
      {
        question: 'Is storytelling photography the same as documentary photography?',
        answer:
          'Not always. Documentary can be one form of storytelling, but authored narrative photography may also stage or shape scenes to communicate deeper structure.',
      },
      {
        question: 'Do storytelling photos need multiple images?',
        answer:
          'No. A single image can be storytelling-driven when composition and atmosphere imply a larger narrative arc.',
      },
    ],
    primaryCtaText: 'Step Into the Story in the Wild West Collection',
    secondaryLinks: [
      { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West', label: 'Wild West Hub' },
      {
        href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
        label: 'Western Narratives Gallery',
      },
      { href: '/Narrative-Western-Art', label: 'Narrative Western Art' },
    ],
    heroImages: storytellingHeroImages,
    storySections: storytellingStory,
    deepFaqItems: storytellingFaq,
    gridImages: storytellingGridImages,
  },
  {
    active: false,
    slug: 'cinematic-cowboy-photography',
    h1: 'Cinematic Cowboy Photography',
    metaTitle: 'Cinematic Cowboy Photography - Wayne Heim',
    metaDescription:
      'Cinematic cowboy photography focused on narrative tension, painterly light, and human structure beneath frontier myth.',
    introParagraph:
      'Cinematic cowboy photography uses still imagery to imply motion, consequence, and character pressure around a cowboy subject. It is less about stylized grading and more about story-bearing composition.',
    expansionParagraphs: [
      'In K4\'s lane, cinematic force comes from directional light, controlled distance, and moments that feel suspended between decisions. The frame reads as part of a larger sequence, even when no action is explicit.',
      'This approach keeps cowboy imagery grounded in human stakes rather than costume shorthand. It supports collector-facing work that holds attention over repeated viewing.',
    ],
    faqItems: [
      {
        question: 'What makes cowboy photography cinematic?',
        answer:
          'Narrative implication, emotional pacing, and composition that suggests what happened before and after the frame.',
      },
      {
        question: 'Is cinematic style just color treatment?',
        answer:
          'No. Structure, gesture, and atmosphere do most of the work; grading alone does not create narrative pressure.',
      },
    ],
    primaryCtaText: 'Explore the Wild West Collection',
    secondaryLinks: [
      { href: '/Blog/what-makes-an-image-feel-cinematic', label: 'What Makes an Image Feel Cinematic?' },
      { href: '/Western-Cowboy-Photography', label: 'Western Cowboy Photography' },
      { href: '/Narrative-Western-Art', label: 'Narrative Western Art' },
    ],
  },
  {
    active: false,
    slug: 'cowboy-storytelling-art',
    h1: 'Cowboy Storytelling Art',
    metaTitle: 'Cowboy Storytelling Art - Wayne Heim',
    metaDescription:
      'Cowboy storytelling art focused on frontier character, implied narrative, and painterly-cinematic structure.',
    introParagraph:
      'Cowboy storytelling art centers on cowboy subjects but treats them as narrative carriers rather than static symbols. The frame is built to suggest motive, consequence, and emotional direction.',
    expansionParagraphs: [
      'In K4\'s lane, the storytelling comes from restrained gesture, controlled light, and compositional pacing. The image reads as a lived fragment of a larger sequence.',
      'That keeps the work anchored to human structure beneath myth, where character and pressure matter more than frontier costume shorthand.',
    ],
    faqItems: [
      {
        question: 'How is cowboy storytelling art different from cowboy decor?',
        answer:
          'It is authored for narrative and emotional depth, not just thematic familiarity.',
      },
      {
        question: 'Does storytelling art need visible action?',
        answer:
          'No. Stillness can carry strong narrative tension when composition and atmosphere are deliberate.',
      },
    ],
    primaryCtaText: 'Explore the Wild West Collection',
    secondaryLinks: [
      { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West', label: 'Wild West Hub' },
      {
        href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
        label: 'Western Narratives Gallery',
      },
      { href: '/Western-Cowboy-Photography', label: 'Western Cowboy Photography' },
    ],
  },
  {
    active: false,
    slug: 'western-action-photography',
    h1: 'Western Action Photography',
    metaTitle: 'Western Action Photography - Wayne Heim',
    metaDescription:
      'Western action photography focused on tension, implied movement, and story-driven frontier moments.',
    introParagraph:
      'Western action photography captures frontier moments where motion, tension, and consequence are central to meaning. In K4\'s approach, action is framed as narrative structure, not spectacle alone.',
    expansionParagraphs: [
      'Painterly and cinematic restraint keep action scenes legible and emotionally grounded. The frame suggests what led to the moment and what may follow.',
      'That makes the work less about visual noise and more about lived pressure inside the story. The viewer reads intent, not just movement.',
    ],
    faqItems: [
      {
        question: 'Is Western action photography only fast motion scenes?',
        answer:
          'No. Action can include charged pauses and decision points where consequence is clearly implied.',
      },
      {
        question: 'What gives action photography artistic depth?',
        answer:
          'Compositional control, emotional clarity, and narrative context that survive beyond immediate impact.',
      },
    ],
    primaryCtaText: 'See the Art Behind the Story',
    secondaryLinks: [
      { href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West', label: 'Wild West Hub' },
      {
        href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
        label: 'Western Narratives Gallery',
      },
      { href: '/Blog/what-makes-an-image-feel-cinematic', label: 'Cinematic Image Guide' },
    ],
  },
  {
    active: false,
    slug: 'rustic-cowboy-wall-art',
    h1: 'Rustic Cowboy Wall Art',
    metaTitle: 'Rustic Cowboy Wall Art - Wayne Heim',
    metaDescription:
      'Rustic cowboy wall art for decor intent that pivots to narrative, painterly, and collector-facing Western work.',
    introParagraph:
      'Rustic cowboy wall art is Western art selected for warm, textured interiors that lean on frontier character. The strongest versions keep rustic atmosphere while still functioning as authored art, not commodity decor.',
    expansionParagraphs: [
      'For K4, this category begins with interior intent, then moves toward painterly and narrative distinctions that make the work collectible. The room reads rustic, but the image carries deeper structure.',
      'That balance helps buyers avoid interchangeable motif prints. A stronger rustic cowboy piece still holds emotional and compositional depth after the design trend cycle moves on.',
    ],
    faqItems: [
      {
        question: 'Is rustic cowboy wall art mainly decor?',
        answer:
          'It can be decor-first, but collector-grade options preserve artistic structure and story so the work remains meaningful over time.',
      },
      {
        question: 'Can rustic cowboy art still feel contemporary?',
        answer:
          'Yes. Contemporary handling of light, pacing, and narrative can keep rustic subject matter visually current.',
      },
    ],
    primaryCtaText: 'Explore the Wild West Collection',
    secondaryLinks: [
      { href: '/Western-Wall-Art', label: 'Western Wall Art' },
      { href: '/Western-Photography-Prints', label: 'Western Photography Prints' },
      { href: '/Western-Interior-Design-Art', label: 'Western Interior Design Art' },
    ],
  },
];

export const activeDoorwayPages: DoorwayPage[] = doorwayPages.filter((page) => page.active);
export const inactiveDoorwayPages: DoorwayPage[] = doorwayPages.filter((page) => !page.active);
