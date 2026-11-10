
/**
 * What Is Western Cowboy Art? — Cornerstone Definition Article
 * 
 * Purpose: Own the definition layer for "Western Cowboy Art"
 * Positions K4 as authority on cowboy art as both history and fine art tradition.
 * 
 * Architecture:
 * - Prose-first, definitional
 * - Article schema (not gallery)
 * - Image block after key section (SERP visibility)
 * - Internal hub that feeds galleries
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";








import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-western-cowboy-art";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-western-cowboy-art";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Header image banner
export const headerImage = {
  id: "i-vP7bLLc",
  src: getProxySrc("i-vP7bLLc", "l"),
  alt: "Western cowboy art — cowboy portrait in warm directional light capturing character and frontier presence"
};

// Example images - cowboy-focused
export const image1 = {
  id: "i-KVxkXrV",
  src: getProxySrc("i-KVxkXrV", "l"),
  alt: "Cowboy portrait in frontier light emphasizing character, vigilance, and the human weight behind the Western icon"
};
export const image2 = {
  id: "i-Dw6Z8ff",
  src: getProxySrc("i-Dw6Z8ff", "l"),
  alt: "Cowboy figure in painterly atmosphere where narrative presence matters more than spectacle"
};
export const image3 = {
  id: "i-8BbMZjs",
  src: getProxySrc("i-8BbMZjs", "l"),
  alt: "Western cowboy portrait expressing quiet determination and psychological depth beyond heroic pose"
};

// Darker aftermath images for "Where Cowboy Art Goes From Here"
export const darkImage1 = {
  id: "i-B7ZSdfs",
  src: getProxySrc("i-B7ZSdfs", "l"),
  alt: "Cowboy figure carrying the emotional weight of consequence after action"
};
export const darkImage2 = {
  id: "i-rfFBRQM",
  src: getProxySrc("i-rfFBRQM", "l"),
  alt: "Western cowboy scene shaped by loss, absence, and quiet aftermath beyond frontier myth"
};
export const darkImage3 = {
  id: "i-HBRmWg4",
  src: getProxySrc("i-HBRmWg4", "l"),
  alt: "Western cowboy portrait focused on psychological weight and what remains when the action is over"
};

export const pageTitle = "What Is Western Cowboy Art? Definition, History, and Meaning";
export const pageDescription = "What is Western cowboy art? Explore the history, myth, and enduring meaning of the American cowboy across painting, sculpture, and fine art photography.";

export const westernCowboyArtFaq = [
  { q: "What is Western cowboy art?", a: "Western cowboy art depicts and interprets the people, work, landscapes, traditions, and mythology associated with cowboy life in the American West. It includes painting, sculpture, photography, and other artistic media. Some works celebrate familiar Western imagery, while others explore the personal experiences, historical realities, and human stories beneath those images." },
  { q: "How did cowboy art develop?", a: "Cowboy art grew alongside the cultural memory of the American West. Artists and illustrators such as Charles M. Russell and Frederic Remington helped establish many of its enduring visual traditions, portraying frontier life, ranch work, conflict, movement, and the people who inhabited the West. Later generations continued to interpret those subjects through changing artistic styles and media." },
  { q: "Is Western cowboy art still being created today?", a: "Yes. Contemporary artists continue to explore cowboy life and the American West through painting, sculpture, photography, and other forms. Some revisit historical subjects, while others portray the working West as it exists today. The tradition continues because its people, landscapes, conflicts, and questions remain meaningful subjects for artistic interpretation." },
  { q: "Can photography be Western cowboy art?", a: "Absolutely. Artistic identity is not determined solely by medium. Photography can communicate the same narrative, emotional, and historical concerns explored in traditional Western painting and sculpture. In Wayne Heim's painterly Western fine art, camera-captured moments created with living historians are developed into authored compositions that place human story and artistic intention at the center of the finished work." },
  { q: "How is Western cowboy fine art different from Western decor?", a: "Western decor often emphasizes the visual character, materials, and atmosphere associated with the American West. Western cowboy fine art may share that visual appeal while also expressing an artist's individual vision, narrative, or interpretation of Western life. The two purposes can coexist. A work of fine art can enrich an interior while continuing to reveal deeper meaning through the stories it carries." },
];

export const faqStructuredData = getFAQPageStructuredData(westernCowboyArtFaq, canonicalUrl);

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
  getAbsoluteProxySrc(darkImage1.id, "l"),
  getAbsoluteProxySrc(darkImage2.id, "l"),
  getAbsoluteProxySrc(darkImage3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Western Art", item: "https://www.k4studios.com/Blog/what-is-western-art" },
    { name: "Western Cowboy Art", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Western Cowboy Art?",
    description: pageDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-02-04",
    dateModified: "2026-05-28",
    articleSection: "Fine Art Photography",
    definedTerm: {
      name: "Western Cowboy Art",
      description: pageDescription,
    },
    keywords: [
      "western cowboy art",
      "cowboy art",
      "western art",
      "cowboy photography",
      "western fine art",
      "American cowboy art",
      "western cowboy artwork"
    ]
  },
  defaults: {
    copyrightNotice: "© Wayne Heim",
    license: "https://www.k4studios.com/copyright",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/"
  }
});

// OG/Twitter capped at L
export const meta = {
  description: pageDescription,
  keywords: "western cowboy art, cowboy art, western art, cowboy photography, western fine art, American cowboy art, western cowboy artwork",
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterCard: "summary_large_image"
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Western Cowboy Art`;

import visualData from './what-is-western-cowboy-art.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 6, pagePath: sectionPath, focusKey: "cowboy-portraits-0" };
