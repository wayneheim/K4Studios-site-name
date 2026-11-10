
/**
 * What Is Western Art? — Root Definition Article
 * 
 * Purpose: Own the definition layer for "Western Art" (broadest umbrella term)
 * This is the semantic root that feeds authority to all Western-related pages.
 * 
 * Architecture:
 * - Historical context + contemporary relevance
 * - Article schema (not gallery)
 * - Feeds authority to: Western Fine Art, Western Fine Art Photography, Artistic Western Photography
 * - Positions K4 as definitional authority, not just vendor
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";









import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-western-art";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-western-art";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Header image bar - 7 images fading from edges to center (5:7 portrait crop)
export const headerImages = [
  { id: "i-jWDDpC4", alt: "Atmospheric landscape of the American West" },
  { id: "i-LCspRF4", alt: "Cowboy at dusk reviewing the day" },
  { id: "i-B7ZSdfs", alt: "Character portrait from the frontier tradition" },
  { id: "i-k4b6c5b", alt: "Iconic moment in the visual language of the West" },
  { id: "i-T7TFJX2", alt: "Frontier portraiture with narrative presence" },
  { id: "i-cFhZXJc", alt: "Atmospheric Western narrative photograph" },
  { id: "i-vJSCrqC", alt: "Native American portrait honoring tradition" },
];

// Demo section images
export const image1 = {
  id: "i-trZrk2w",
  src: getProxySrc("i-trZrk2w", "l"),
  alt: "Cowboy on night watch in frontier darkness, shaped by narrative light in Western art"
};
export const image2 = {
  id: "i-Q2NXpjG",
  src: getProxySrc("i-Q2NXpjG", "l"),
  alt: "Western landscape used as an emotional setting rather than a literal record"
};
export const image3 = {
  id: "i-hMXZ8Xh",
  src: getProxySrc("i-hMXZ8Xh", "l"),
  alt: "Weathered cowboy portrait expressing hardship, endurance, and inner strain in Western art"
};
export const image4 = {
  id: "i-8VPQmkW",
  src: getProxySrc("i-8VPQmkW", "l"),
  alt: "Ranch hand in natural light, representing frontier labor before the cowboy became a legend"
};

export const pageTitle = "What Is Western Art? History, Meaning, and Evolution";
export const pageDescription = "What is Western art? The American tradition, not European art history. Explore its history, meaning, and evolution from Remington and Russell through contemporary Western fine art photography.";
export const metaDescription = "What is Western art? The American tradition, not European art history — its history, meaning, and evolution from Remington and Russell to today.";

export const westernArtFaq = [
  {
    q: "What is Western art?",
    a: "Western art is a visual tradition built around the landscapes, people, conflicts, and ideals of the American West. It is defined not by medium but by authorship, the artist's intent, composition, and engagement with the subject of the West. Its subjects include cowboys, frontier life, Native American portrait work, Western landscapes, and the historical and contemporary realities of life in the American West.",
  },
  {
    q: "Is western art the same as European art history?",
    a: "No. They share the word, but not the meaning. Western art in the art history context refers to the European painting tradition from ancient Greece through contemporary Europe. Western art in the American context refers to the visual tradition rooted in the American West, including cowboy portraits, frontier narratives, Indigenous portraiture, and Western landscapes. This article addresses the American tradition.",
  },
  {
    q: "Who were the most important Western artists historically?",
    a: "Frederic Remington and Charles M. Russell are foundational figures who established the visual language of the American West through frontier character, human consequence, and the narrative discipline of the withheld moment. Albert Bierstadt helped establish the landscape tradition. The Taos Society of Artists expanded the subject to include Indigenous life and New Mexico landscape. Norman Rockwell carried narrative Western sensibility into illustration with major influence on film and popular culture.",
  },
  {
    q: "What defines Western art versus Western decor?",
    a: "Western art is defined by authorship, intent, and compositional rigor. Western decor uses frontier symbols such as hats, horses, and desert horizons as shorthand for a look. What distinguishes art from decor is whether the work carries the artist's vision and rewards sustained viewing, or simply fills a space with familiar imagery.",
  },
  {
    q: "Can photography be Western art?",
    a: "Yes. The distinction between painting and photography as fine art mediums dissolved over the 20th century as institutions including MoMA, the Getty, and the Smithsonian elevated photography to equal footing with painting. What matters is not medium but authorship, whether the photographer brings intent, compositional discipline, and narrative depth to the subject.",
  },
  {
    q: "What is the difference between Western art and frontier art?",
    a: "Frontier art is a subset of Western art focused specifically on the frontier period, the late 19th century era of westward expansion, cattle drives, conflict, and settlement. Western art is broader, encompassing frontier history, contemporary ranch life, Indigenous cultural traditions, Western landscapes, and the ongoing meaning of the American West as subject and symbol.",
  },
  {
    q: "Is Western art still being made today?",
    a: "Yes. Contemporary Western artists work across painting, sculpture, and photography. Some continue the heroic tradition. Others explore modern ranch life, environmental tension, cultural identity, and the psychological weight of Western spaces. The subject has expanded, but the core themes of isolation, endurance, freedom, consequence, and land as both refuge and challenge remain central.",
  },
  {
    q: "Where can I see contemporary Western art?",
    a: "Major institutions including the National Cowboy and Western Heritage Museum, the Autry Museum of the American West, the Denver Art Museum's Petrie Institute, and the C.M. Russell Museum hold significant Western art collections. Contemporary Western fine art photography by Wayne Heim is available at K4 Studios through cowboy portraits, frontier narratives, Native American portrait work, and Western landscapes as archival fine art prints.",
  },
];

export const faqStructuredData = getFAQPageStructuredData(westernArtFaq, canonicalUrl);

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImages[2].id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
  getAbsoluteProxySrc(image4.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Western Art", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Western Art? History, Meaning, and Evolution",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-02-04",
    dateModified: "2026-05-16",
    articleSection: "Art History",
    definedTerm: {
      name: "Western Art",
      description: pageDescription,
    },
    keywords: [
      "western art",
      "what is western art",
      "western art definition",
      "western art history",
      "american western art",
      "cowboy art",
      "western fine art"
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
  seoDescription: metaDescription,
  description: metaDescription,
  story: metaDescription,
  keywords: "western art, what is western art, western art definition, western art history, american western art, cowboy art, western fine art",
  ogTitle: pageTitle,
  ogDescription: metaDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(headerImages[2].id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: metaDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(headerImages[2].id, "l"),
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true,
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Is Western Art?`;

import visualData from './what-is-western-art.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 1, pagePath: sectionPath, focusKey: "cowboy-portraits-0" };
