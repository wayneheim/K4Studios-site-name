import { commercialIntentPages } from './commercialIntentPages';
import { galleryData as nativeBlackWhiteData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs';

export const pagePath = '/Western-Fine-Art';
export const pageTitle = 'Western Fine Art | K4 Studios — Gallery of Western Fine Art';
export const pageDescription = 'K4 Studios — Gallery of Western Fine Art. Western fine art photography by Wayne Heim — cowboy portraits, frontier narratives, Native American portraits, and landscapes as fine art prints.';
export const opening = "Western fine art is author-driven work that engages the American West — its landscape, people, and mythology — with intentional composition, narrative depth, and artistic restraint. At K4 Studios, that standard is met with a camera: real photographs, shaped by painterly handling, of the working West and the people who built it. The collection below is offered as archival fine art prints, signed Chronicle and Legend limited editions, and Engrained wood panels.";

// Use the same live gallery sources and split collection card supported by the doorways.
const model = commercialIntentPages.contemporaryWesternArt;
const hub = commercialIntentPages.westernFineArtPhotography;
const orderedSections = [0, 1, 2, 5, 3, 4].map(index => model.gridSections[index]);
const titles = [
  'Frontier Narrative Western Wall Art — Color',
  'Western Fine Art Cowboy Portraits — Color',
  'Native American Western Fine Art Portraits',
  'Western Fine Art Landscape Photography',
  'Black and White Narrative Western Wall Art',
  'Black and White Cowboy Portrait Wall Art',
];

// First portrait-oriented photograph in each of the six displayed grids.
export const heroPortraitIds = [
  'i-LCspRF4', // Day in Review — narrative color, image 2
  'i-ncFcHDM', // One Last Look — cowboy color, image 1
  'i-LmpRvHw', // Watching the High Ground — Native American color, image 3
  'i-SNtZNVm', // The Long Bend — Western landscape, image 4
  'i-mqQxwNn', // Standing Watch — narrative black and white, image 1
  'i-2GsTkqf', // Standing His Ground — cowboy black and white, image 2
];

export const taxonomy = [
  { name: 'Cowboy Portraits', text: "The working figure as character, not costume: age, humor, fatigue, and guarded stillness, lit with a painter's patience.", label: 'Cowboy Portraits collection', href: hub.gridSections[0].galleryPath },
  { name: 'Frontier Narratives', text: 'One-frame stories with a before and an after. The moment is interrupted; the viewer steps inside and finishes it.', label: 'Frontier Narratives collection', href: hub.gridSections[1].galleryPath },
  { name: 'Native American Portraits', text: 'Historical presence carried with dignity and restraint — never scenery, never spectacle.', label: 'Native American Portraits collection', href: hub.gridSections[2].galleryPath },
  { name: 'Western Landscapes', text: 'The land as a force in the story: distance, weather, and silence at scale.', label: 'Western Landscapes collection', href: hub.gridSections[3].galleryPath },
  { name: 'Black-and-White Western', text: 'The restraint test: tone, structure, and shadow, with the comfort of color removed.', label: 'Black & White collections', href: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White' },
];

export const faqItems = [
  {
    q: 'What is Western fine art?',
    a: ['Western fine art is author-driven work that engages the American West — cowboy and ranch life, frontier narratives, Native American portraiture, Western landscapes, and the region\'s historical presence — with intentional composition, narrative depth, and artistic restraint, regardless of medium. For the full definition and the standard behind it, read <a href="/Blog/what-is-western-fine-art">What Is Western Fine Art?</a>.'],
  },
  { q: 'Can I buy the work shown on this page as prints?', a: ['Yes. Every image opens to its own page with story, sizing, edition, and collector details.'] },
  {
    q: 'What print formats are available?',
    a: ['Images are available as archival paper prints and, where offered, as <a href="/Engrained">Engrained Series</a> panels printed directly onto Baltic Birch wood. Material, size, and edition options are listed inside each image\'s page.'],
  },
  { q: 'Are limited editions signed and numbered?', a: ['Yes. Chronicle and Legend limited editions are individually signed and numbered, and each includes a certificate of authenticity documenting edition status and provenance.'] },
  {
    q: 'How do I choose a size for a room?',
    a: ['Start with the wall, the viewing distance, and whether the piece needs to anchor the room or work within a grouping. Smaller pieces suit shelves, studies, and intimate placements; larger prints hold fireplaces, entries, offices, and lodge walls. If you are choosing for a specific wall, contact Wayne at <!--email_off-->wayne@k4studios.com<!--/email_off--> with the dimensions and a room photo for sizing guidance or a complimentary mockup.'],
  },
  {
    q: 'Do you work with interior designers and hospitality projects?',
    a: ['Yes. Western fine art from this collection can be sourced for living rooms, offices, lodges, ranch interiors, and <a href="/Western-Interior-Design-Art">boutique hospitality projects</a>, including multi-piece installations.'],
  },
];

export const westernFineArtPage = {
  ...model,
  canonicalPath: pagePath,
  contentBasePath: model.basePath,
  breadcrumbHtml: '<a href="/">Home</a> / Western Fine Art Gallery',
  breadcrumbStructuredItems: [],
  identity: { collectionName: 'Western Fine Art', gatewayBrandLabel: 'Western Fine Art' },
  relatedCollectionsSlug: '/Western-Fine-Art-Photography',
  gridSections: orderedSections.map((section, index) => ({
    ...section,
    title: titles[index],
    description: '',
    limit: 15,
    ...(index === 2 ? {
      alternateCtaHref: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White/all#collection-browser',
      alternateCtaLabel: 'See the full black and white Native American portrait collection',
      alternateCtaKicker: 'Black & White Collection',
      alternateCtaCount: `${nativeBlackWhiteData.filter((item: any) => item?.id && item.id !== 'i-k4studios' && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase())).length} works in this gallery`,
    } : {}),
  })),
  faqItems,
  gatewayVideoWidget: null,
  copy: {
    seoTitle: pageTitle,
    seoDescription: pageDescription,
    gatewayKicker: 'K4 STUDIOS — GALLERY OF WESTERN FINE ART',
    gatewayIntroCopy: opening,
    gatewaySupportingCopy: '',
    gatewayCollectionName: 'Western Fine Art',
    breadcrumbCurrentName: 'Western Fine Art Gallery',
    catalogSectionKicker: 'Selected Western Wall Art — {sectionCount} in Series',
    conceptBlock1Title: 'THE STANDARD',
    conceptBlock1Copy: 'A cowboy, a longhorn, and a sunset do not make fine art — they make a subject. Western fine art begins when an author shapes that subject with intent: choosing the moment, the light, and what the frame refuses to explain. Work made to match a sofa or fill a souvenir shelf may picture the West, but it does not meet the standard. Every piece in the grids below was made to be considered over time — and to keep returning meaning long after the first look. The full standard is defined in our essay, <a href="/Blog/what-is-western-fine-art">What Is Western Fine Art?</a>',
    conceptBlock2Title: 'THE FIGURE AND THE STORY',
    conceptBlock2Copy: 'The Western figure carries the quickest signal of the genre — and the quickest risk of flattening into costume. These portraits and narrative scenes work against that flattening. The evidence of lived work stays in the frame — hats, dust, leather, hands, gaze — while painterly handling slows the image down until presence replaces type. What you are looking at is not lifestyle photography. It is a person, mid-story, who has not agreed to explain himself.',
    conceptBlock3Title: 'PRESENCE, NOT SPECTACLE',
    conceptBlock3Copy: 'Western fine art also has to answer for what earlier Western art often simplified. Native American subjects cannot function as scenery or decorative heritage without weakening the work — and the tradition. The portrait studies below are organized around stillness, dignity, and atmosphere: historical presence, carried quietly.',
    conceptBlock4Title: 'THE LAND AS SUBJECT',
    conceptBlock4Copy: 'Landscape is one of the strongest signals in Western fine art because the West has always been read through distance and scale. But a landscape holds a wall — and a viewer — only when the land feels like a force, not a backdrop: weather coming, light failing, a fence leaning more than it stands. These are the open registers of the collection, the silence that makes the human figure elsewhere feel smaller and more real.',
    conceptBlock5Title: 'THE MONOCHROME TEST',
    conceptBlock5Copy: 'Remove color and a Western image has nowhere to hide. What remains is tone, structure, face, distance, and shadow — the bones of the picture. The black-and-white narratives and portraits below are the restraint test of the whole collection: the same authored standard, carried without the warmth that does half the work in color.',
    showAuthorityPanel: false,
    faqTitle: 'Western Fine Art FAQ',
  },
};
