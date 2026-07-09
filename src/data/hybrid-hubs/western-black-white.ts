import { galleryData as bwGallery }
	from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as narrativeBwGallery }
	from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';
import { galleryData as naBwGallery }
	from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs';

const bwPath =
	'/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White';
const bwAllPath =
	'/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all';
const narrativeBwPath =
	'/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White';
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
			alt: ensureAlt(item, 'Western black and white photography by Wayne Heim'),
			story: (item.story || fallbackStory).trim(),
			href: `${hrefBase}/${item.id}`,
		}));
}

export const pagePath = '/Western-Black-and-White-Photography';
export const imageSectionPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';
export const gridBasePath = bwPath;

export const landing = {
	title: 'Western Black and White Photography',
	subtitle: 'Western black and white photography where tone, contrast, and restraint give cowboy photos, frontier portraits, and Western art more lasting pressure than color alone.',
	keywords: [
		'western black and white photography',
		'black and white western art',
		'black and white cowboy photography',
		'black and white western portraits',
		'monochrome western photography',
		'western fine art black and white photography',
	],
	breadcrumb: '<a class="breadcrumb-link" href="/">Home</a> / <span class="breadcrumb-current">Western Black and White Photography</span>',
};

export const breadcrumbItems = [
	{ name: 'Home', item: 'https://www.k4studios.com/' },
	{ name: 'Western Black and White Photography', item: 'https://www.k4studios.com/Western-Black-and-White-Photography' },
];

export const hybridCarouselProps = {
	slides: [
		...buildHybridSlides(bwGallery, bwPath, 3, 'Black and white cowboy portraits where contrast and gesture do the work of narrative.'),
		...buildHybridSlides(narrativeBwGallery, narrativeBwPath, 2, 'Monochrome narrative Western frames where implication replaces spectacle.', 1),
		...buildHybridSlides(naBwGallery, naBwPath, 1, 'Black and white portrait work carrying historical gravity and presence.', 0),
	],
	galleryBasePath: bwPath,
	kicker: 'Selected Monochromes',
	counterLabel: 'Work',
};

export const storyBlocks = [
	{
		title: 'Western Black and White Photography',
		subhead: 'Monochrome works when it removes noise, not life.',
		paragraphs: [
			'Western black and white photography matters when tone, gesture, and atmosphere carry more weight without color than they would with it. The removal of color should sharpen the human presence in the frame, not flatten it into style.',
			'That is why the stronger monochrome pages in this group are not generic black-and-white galleries. They keep portraiture, narrative pressure, and historical gravity visible inside the tonal structure, with the <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White">black and white Western portrait gallery</a> and its <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all">complete black and white cowboy archive</a> acting as the proof set behind this parent page.',
		],
	},
	{
		subhead: 'Why this term needs its own route',
		paragraphs: [
			'Visitors searching black and white Western work are often looking for a different emotional register: less decorative warmth, more tension, more character, more consequence. The selection stays severe, selective, and tonally focused.',
			'That is why the grouped previews below stay monochrome-only. They make the differences between portraiture, narrative work, and Native American studies readable without diluting the term with unrelated color imagery.',
		],
	},
	{
		subhead: 'What black and white changes in this work',
		paragraphs: [
			'Monochrome lets posture, weathering, cloth, and face carry more of the image. It also makes restraint easier to feel. The frame stops selling atmosphere through color and has to earn it through structure instead.',
			'That shift is exactly why black and white Western art remains one of the stronger supporting terms in the cluster. It gives visitors a cleaner route into the most concentrated side of the work.',
		],
	},
];

export const explorationPaths = [
	{
		title: 'Western Portrait Photography',
		eyebrow: 'Portrait Route',
		hideEyebrow: true,
		href: '/western-portrait-photography',
		description: 'Move into the broader portrait page where color and black-and-white approaches can be compared side by side.',
		cta: 'Compare portrait paths -',
		accent: '#6d5b4a',
	},
	{
		title: 'Black and White Western Portraits',
		eyebrow: 'Primary Collection',
		href: bwPath,
		description: 'Go directly into the monochrome cowboy portrait collection where tone and expression carry more of the frame than color ever could.',
		cta: 'Explore black and white Western portraits -',
		accent: '#7b4a28',
		featured: true,
	},
	{
		title: 'Complete Black and White Cowboy Archive',
		eyebrow: 'Full Inventory',
		href: bwAllPath,
		description: 'Browse the full index of black and white cowboy portraits when you want every available monochrome image page in one crawlable set.',
		cta: 'Open the complete archive -',
		accent: '#5f524a',
	},
	{
		title: 'Cinematic Western Art',
		eyebrow: 'Narrative Route',
		hideEyebrow: true,
		href: '/cinematic-western-art',
		description: 'Follow the story-driven page where tension, implication, and atmosphere stay active even without overt action.',
		cta: 'Continue into the story -',
		accent: '#4d4037',
	},
];

export const featuredReadingTitle = 'Exploring Tone, Atmosphere and Story';
export const featuredReadingIntro = 'The strongest monochrome pages explain why black and white changes the emotional structure of the image instead of treating it as a filter choice. These guides help name that difference.';

export const featuredReadingItems = [
	{
		title: 'What Makes an Image Feel Cinematic?',
		href: '/Blog/what-makes-an-image-feel-cinematic',
		description: 'See why implication and restraint carry more pressure than surface drama, especially in monochrome work.',
		eyebrow: 'Guide',
	},
	{
		title: 'What Is Narrative Photography?',
		href: '/Blog/what-is-narrative-photography',
		description: 'Follow how still images hold a larger scene through consequence and withheld information.',
		eyebrow: 'Guide',
	},
	{
		title: 'What Is Painterly Photography?',
		href: '/Blog/what-is-painterly-photography',
		description: 'Look at how tonal sculpting and atmospheric control give photographic work more authored weight.',
		eyebrow: 'Guide',
	},
	{
		title: 'When the Medium Disappears',
		href: '/Blog/when-the-medium-disappears',
		description: 'See what happens when form, subject, and atmosphere merge into a single felt image rather than a visible technique.',
		eyebrow: 'Essay',
	},
];

export const gridImages = [
	...selectGridImages(bwGallery, bwPath, 1, 6, 'Black and white Western portrait by Wayne Heim'),
	...selectGridImages(narrativeBwGallery, narrativeBwPath, 1, 3, 'Black and white narrative Western photograph by Wayne Heim'),
	...selectGridImages(naBwGallery, naBwPath, 0, 3, 'Black and white Native American portrait by Wayne Heim'),
];

export const collection = {
	kicker: 'Selected Works',
	title: 'Selected Western Black and White Photography',
	intro: 'Three monochrome groupings that keep the page tonally coherent while still separating portraiture, narrative work, and historically grounded studies.',
};

export const collectionGroups = [
	{
		title: 'Black and White Cowboy Portrait Collection',
		description: 'Monochrome cowboy portraiture where expression, weathering, and contrast do the heavy lifting.',
		rows: [
			{
				label: 'Monochrome Collection',
				href: bwPath,
				cta: 'See more black and white cowboy portraits',
				items: selectCollectionPreviewRow(
					bwGallery,
					bwPath,
					1,
					4,
					'Black and white Western cowboy portrait by Wayne Heim',
					'Western Cowboy Portrait / Black and White',
				),
			},
		],
	},
	{
		title: 'Black and White Narrative Western Collection',
		description: 'Story-driven monochrome Western work where implication and aftermath stay active inside the frame.',
		rows: [
			{
				label: 'Monochrome Collection',
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
		title: 'Black and White Native American Collection',
		description: 'Historically grounded monochrome portraits that hold presence through tone, cloth, and facial structure rather than color cues.',
		rows: [
			{
				label: 'Monochrome Collection',
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
	title: 'Western Black and White Photography FAQ',
};

export const faqItems = [
	{
		q: 'What is Western black and white photography?',
		a: [
			'Western black and white photography is fine art monochrome work rooted in the American frontier - cowboy portraits, narrative scenes, and historically grounded portrait work where tone, contrast, and restraint carry the image further than color would.',
			'At K4 Studios it means authored work where removing color sharpens human presence rather than flattening it into style.',
		],
	},
	{
		q: 'Why does black and white work so well with Western portraiture?',
		a: [
			'Because it strips decorative color cues and forces expression, weathering, cloth, and contrast to carry the full weight of the image. The frame has to earn its atmosphere through structure alone.',
			"In Wayne Heim's work that means posture, facial character, and tonal depth doing the work that color would otherwise handle - producing images with more lasting pressure on the wall.",
		],
	},
	{
		q: 'How are these prints different from standard black and white cowboy photography?',
		a: [
			"Standard B&W cowboy photography documents people and places. Wayne Heim's work treats the cowboy as a character under pressure - weathered, mid-story, carrying consequence.",
			'The painterly process adds tonal sculpting and atmospheric depth beyond straight photography. Every image carries a title, a story, and an authored point of view.',
		],
	},
	{
		q: 'Can black and white Western prints work in modern interiors?',
		a: [
			'Yes - particularly well. Tonal monochrome work integrates cleanly in modern, transitional, and minimalist rooms without reading as decorative Western theme.',
			'A single strong B&W portrait in a clean space carries more weight than a grouped arrangement of color work.',
		],
	},
	{
		q: 'What print formats and sizes are available?',
		a: [
			'Every image is available as archival paper or wood fine art prints - including the Engrained Series on Baltic Birch panels, which adds grain texture that complements the tonal atmosphere of monochrome work.',
			'The Sketch Series opens at $25. Size options and edition details are inside each image page.',
		],
	},
	{
		q: 'Are these black and white Western prints available as limited editions?',
		a: [
			'Yes. The Chronicle Series offers signed limited editions with numbered certificates of authenticity.',
			'The Legend Series is ultra-limited - very small runs for collectors who want documented provenance and permanent wall placement. Open-edition works start at $25 with the Sketch Series.',
		],
	},
	{
		q: 'What subjects are covered in this black and white Western collection?',
		a: [
			'Three subject groups - cowboy portraits, frontier narrative scenes, and Native American portrait work.',
			'Each responds differently to monochrome: portraits carry character through expression and weathering; narratives carry story through shadow, silence, and implication; Native American portraits carry presence through tone, cloth, and facial structure.',
			'All three are organized as separate sections so collectors can feel those distinctions.',
		],
	},
	{
		q: "Where should I start if I'm choosing a black and white Western print?",
		a: [
			'Start with the cowboy portrait section for direct character presence and human gravity. Move into the narrative section for story-driven frontier atmosphere where shadow and implication do the work.',
			'Continue into the Native American section for historically grounded portrait work with tonal quiet and restraint. Click into any image to read the story before deciding. For help with a specific room, reach Wayne at <a href="mailto:wayne@k4studios.com">wayne@k4studios.com</a>.',
		],
	},
];

export const pageMeta = {
	title: 'Western Black and White Photography | Black and White Cowboy Photos',
	description: 'Western black and white photography by Wayne Heim, including black and white cowboy photos, monochrome frontier portraits, narrative Western scenes, and black and white Western art.',
};

export const structuredAbout = [
	'Western Black and White Photography',
	'Black and White Western Art',
	'Black and White Cowboy Photography',
	'Monochrome Western Photography',
	'Western Portrait Photography',
];

export const webPageAbout = [
	'Western Black and White Photography',
	'Black and White Western Portraits',
	'Cinematic Western Art',
	'Western Portrait Photography',
];

export const genre = 'Western Black and White Photography';
export const collectionAltPrefix = 'Western black and white photography';
