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
		.filter((item: any) => item.visibility !== 'ghost' && item.visibility !== 'hidden' && item.visibility !== 'hide')
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
	subtitle: 'Western black and white photography where tone, contrast, and restraint give cowboy and frontier imagery more lasting pressure than color alone.',
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
			'That is why the stronger monochrome pages in this cluster are not generic black-and-white galleries. They keep portraiture, narrative pressure, and historical gravity visible inside the tonal structure, with the <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White">black and white Western portrait gallery</a> and its <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all">complete black and white cowboy archive</a> acting as the proof set behind this parent page.',
		],
	},
	{
		subhead: 'Why this term needs its own route',
		paragraphs: [
			'Visitors searching black and white Western work are often looking for a different emotional register: less decorative warmth, more tension, more character, more consequence. The page should reflect that by staying more severe, more selective, and more tonally focused.',
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
		q: 'Why does black and white work so well with Western portraiture?',
		a: [
			'Because it strips away decorative color cues and lets expression, cloth, weathering, and contrast carry more of the meaning. The image has to earn its atmosphere through structure.',
		],
	},
	{
		q: 'Is this page about monochrome style or monochrome storytelling?',
		a: [
			'Storytelling. The black-and-white treatment matters here because it changes the emotional pressure of the image, not because it adds a period effect.',
		],
	},
	{
		q: 'Why separate portrait, narrative, and Native American work?',
		a: [
			'Because monochrome affects each body of work a little differently. Grouping them separately lets visitors feel those distinctions instead of reading everything as one undifferentiated archive.',
		],
	},
	{
		q: 'Where should I go if I want color as well?',
		a: [
			'Move into <a href="/western-portrait-photography">Western Portrait Photography</a> or <a href="/western-fine-art-photography-collection">Western Fine Art Photography Collection</a> for paired color and black-and-white routes.',
		],
	},
	{
		q: 'Can monochrome works still be collected as prints?',
		a: [
			'Yes. Continue into <a href="/Western-Photography-Prints">Western Photography Prints</a> or <a href="/Other/Print-Options">Print Options</a> once the image choice is clear.',
		],
	},
	{
		q: 'Does this page support the black and white western art term as well?',
		a: [
			'Yes. The page is built to serve visitors looking for black and white Western art, black and white cowboy photography, and monochrome Western portrait work through one coherent route.',
		],
	},
];

export const pageMeta = {
	title: 'Western Black and White Photography | Monochrome Cowboy and Frontier Work – K4 Studios',
	description: 'Western black and white photography by Wayne Heim presented as a curated route into monochrome cowboy portraits, narrative Western scenes, and Native American portrait work.',
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
