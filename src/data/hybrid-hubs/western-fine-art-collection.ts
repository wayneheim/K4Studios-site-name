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
		.filter((item: any) => !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase()) && item.visibility !== 'hidden' && item.visibility !== 'hide')
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
			alt: ensureAlt(item, 'Western fine art photography by Wayne Heim'),
			story: (item.story || fallbackStory).trim(),
			href: `${hrefBase}/${item.id}`,
		}));
}

export const pagePath = '/western-fine-art-photography-collection';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';
export const gridBasePath = colorPath;

export const landing = {
	title: 'Western Fine Art Photography Collection',
	subtitle: 'A curated Western fine art photography collection where portraiture, narrative pressure, and painterly restraint give the American West authored presence instead of generic category sprawl.',
	keywords: [
		'western fine art photography collection',
		'western fine art photography',
		'painterly western photography',
		'western art photography collection',
		'western narrative photography',
		'cowboy fine art photography',
	],
	breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Fine Art Photography Collection</span>',
};

export const breadcrumbItems = [
	{ name: 'Home', item: 'https://www.k4studios.com/' },
	{ name: 'Western Fine Art Photography Collection', item: 'https://www.k4studios.com/western-fine-art-photography-collection' },
];

export const hybridCarouselProps = {
	slides: [
		...buildHybridSlides(colorGallery, colorPath, 2, 'Cowboy portrait work where authorship starts with character rather than costume.'),
		...buildHybridSlides(narrativeColorGallery, narrativeColorPath, 2, 'Narrative Western images that feel like a larger scene compressed into one frame.', 4),
		...buildHybridSlides(naGallery, naPath, 1, 'Historically grounded portrait work with cultural and moral weight.', 1),
		...buildHybridSlides(bwGallery, bwPath, 1, 'Monochrome Western portraits where tone and restraint keep the frame open.', 2),
	],
	galleryBasePath: colorPath,
	kicker: 'Curated Collection',
	counterLabel: 'Work',
};

export const storyBlocks = [
	{
		title: 'Western Fine Art Photography Collection',
		subhead: 'A curated survey of the Western body of work.',
		paragraphs: [
			'A Western fine art photography collection should help visitors feel the logic of the work before asking them to process quantity. When a selection becomes too crowded, the authored quality of the images can disappear under too many simultaneous choices.',
			'This collection starts with a disciplined sample, then opens into the major bodies of work: portraits, narrative scenes, monochrome studies, and collector-facing print pages.',
		],
	},
	{
		subhead: 'Why the collection belongs together',
		paragraphs: [
			'The broader Western Fine Art Photography page explains the medium, lineage, and larger field around the work. This collection view stays closer to the artwork itself, gathering the pieces as a collectible body with a clear sense of shape and progression.',
			'The result is enough context to orient the viewer, enough curation to preserve tone, and enough movement to continue into the right gallery without turning the page into a wall of thumbnails.',
		],
	},
	{
		subhead: 'What holds the collection together',
		paragraphs: [
			'Across cowboy portraiture, Wild West narratives, and Native American portrait work, the common thread is authorship. Painterly light, tonal shaping, and narrative implication keep the work from behaving like stock Western imagery.',
			'That continuity is what lets the collection term remain useful. It gives the visitor one clean front door into several stronger sub-routes without pretending the page itself should contain everything.',
		],
	},
];

export const explorationPaths = [
	{
		title: 'Western Portrait Photography',
		eyebrow: 'Portrait Route',
		hideEyebrow: true,
		href: '/western-portrait-photography',
		description: 'Move into the portrait-led page where character, presence, and paired color and black-and-white rows carry the work.',
		cta: 'Explore the portraits -',
		accent: '#6d5b4a',
	},
	{
		title: 'Western Fine Art Photography',
		eyebrow: 'Broader Context',
		href: '/Western-Fine-Art-Photography',
		description: 'Open the broader Western fine art photography guide for the definition, lineage, and larger body of work behind this curated collection.',
		cta: 'Open the main Western fine art page -',
		accent: '#7b4a28',
		featured: true,
	},
	{
		title: 'Western Photography Prints',
		eyebrow: 'Collector Route',
		hideEyebrow: true,
		href: '/Western-Photography-Prints',
		description: 'Continue into the print-facing page once the image choice is leading and material questions start to matter.',
		cta: 'Move into prints -',
		accent: '#4d4037',
	},
];

export const featuredReadingTitle = 'Exploring Medium, Story and Collection Logic';
export const featuredReadingIntro = 'The better collection pages explain why the work belongs together before they lean on product language. These guides support that broader frame around medium, atmosphere, and authored structure.';

export const featuredReadingItems = [
	{
		title: 'What Is Western Fine Art Photography?',
		href: '/Blog/what-is-western-fine-art-photography',
		description: 'Read the definition layer behind the medium and see how it separates authored work from decor or stock Western imagery.',
		eyebrow: 'Guide',
	},
	{
		title: 'What Is Painterly Photography?',
		href: '/Blog/what-is-painterly-photography',
		description: 'See how tone, edge, and atmosphere make photographic work feel authored rather than merely recorded.',
		eyebrow: 'Guide',
	},
	{
		title: 'What Is Visual Storytelling?',
		href: '/Blog/what-is-visual-storytelling-in-photography',
		description: 'Follow how still images carry motive, tension, and consequence without spelling the whole scene out.',
		eyebrow: 'Guide',
	},
	{
		title: 'What Makes an Image Feel Cinematic?',
		href: '/Blog/what-makes-an-image-feel-cinematic',
		description: 'See why implication and pacing matter when an image has to stay alive after the subject is recognized.',
		eyebrow: 'Guide',
	},
];

export const gridImages = [
	...selectGridImages(colorGallery, colorPath, 2, 4, 'Western fine art photography by Wayne Heim'),
	...selectGridImages(narrativeColorGallery, narrativeColorPath, 5, 4, 'Narrative Western fine art photography by Wayne Heim'),
	...selectGridImages(bwGallery, bwPath, 2, 2, 'Black and white Western fine art photography by Wayne Heim'),
	...selectGridImages(naGallery, naPath, 1, 2, 'Native American Western fine art photography by Wayne Heim'),
];

export const collection = {
	kicker: 'Selected Works',
	title: 'Selected Western Fine Art Photography Collection',
	intro: 'Three grouped collection lanes with paired color and black-and-white rows, built to feel selective while still showing the breadth of the broader Western body of work.',
};

export const collectionGroups = [
	{
		title: 'Western Cowboy Portrait Collection',
		description: 'Character-led portrait work where weathering, restraint, and authored light keep the figure active on the wall.',
		rows: [
			{
				label: 'Color Collection',
				href: colorPath,
				cta: 'See more cowboy portraits',
				items: selectCollectionPreviewRow(
					colorGallery,
					colorPath,
					2,
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
					2,
					4,
					'Black and white Western cowboy portrait by Wayne Heim',
					'Western Cowboy Portrait / Black and White',
				),
			},
		],
	},
	{
		title: 'Western Narrative Works Collection',
		description: 'Story-driven Western work where atmosphere, implication, and aftermath extend the collection beyond pure portraiture.',
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
	{
		title: 'Native American Collection',
		description: 'Historically grounded portrait work that adds depth, continuity, and cultural seriousness to the wider collection.',
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
];

export const faqSection = {
	kicker: 'Collector Questions',
	title: 'Western Fine Art Photography Collection FAQ',
};

export const faqItems = [
	{
		q: 'How is this different from the main Western Fine Art Photography page?',
		a: [
			'The main page carries broader authority and legacy context. This collection page is narrower and more curated, giving visitors a cleaner way to see the work as a collectible body before moving into individual galleries or print options.',
		],
	},
	{
		q: 'Why group the collection instead of showing one large mixed grid?',
		a: [
			'Because grouping makes the internal logic of the work easier to feel. Visitors can see how portraiture, narrative work, and Native American portraiture relate without losing the curated tone of the page.',
		],
	},
	{
		q: 'Is this page meant more for discovery or for collecting?',
		a: [
			'Both, but in sequence. It begins with discovery, then leads into <a href="/Western-Photography-Prints">Western Photography Prints</a> or <a href="/Other/Print-Options">Print Options</a> once collecting intent becomes explicit.',
		],
	},
	{
		q: 'Does this page still support the broader Western fine art photography term?',
		a: [
			'Yes. It focuses on the collection-facing version of that term, while the broader Western Fine Art Photography guide carries the definition, lineage, and field-level framing.',
		],
	},
	{
		q: 'Why keep Native American portrait work inside this collection page?',
		a: [
			'Because it is part of the broader Western body of work and brings a different kind of historical and moral weight into the collection than cowboy portraiture alone can carry.',
		],
	},
	{
		q: 'Where should I go if I want the deeper story-driven route?',
		a: [
			'Move into <a href="/cinematic-western-art">Cinematic Western Art</a> or <a href="/western-storytelling-photography">Western Storytelling Photography</a> if atmosphere, implication, and narrative pressure are what you are really responding to.',
		],
	},
];

export const pageMeta = {
	title: 'Western Fine Art Photography Collection - Wayne Heim',
	description: 'A curated Western fine art photography collection by Wayne Heim, linking cowboy portraiture, narrative Western imagery, Native American portrait work, and collector-facing print routes.',
};

export const structuredAbout = [
	'Western Fine Art Photography Collection',
	'Western Fine Art Photography',
	'Painterly Western Photography',
	'Narrative Western Art',
	'Cowboy Fine Art Photography',
];

export const webPageAbout = [
	'Western Fine Art Photography Collection',
	'Western Fine Art Photography',
	'Western Portrait Photography',
	'Western Photography Prints',
];

export const genre = 'Western Fine Art Photography Collection';
export const collectionAltPrefix = 'Western fine art photography';
