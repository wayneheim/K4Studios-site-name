
/**
 * What Is Historical Western Photography? — Day 3 SEO Reclassification
 * 
 * Purpose: DEFINE the term "historical western photography" to resolve ambiguity.
 * This is not about ranking a blog post — it's about teaching Google the proper
 * interpretation of the term so the flagship hub (/Historical-Western-Art) inherits clarity.
 * 
 * Key clarifications:
 * - "Historical" refers to subject/theme, NOT when the work was created
 * - Contemporary fine art depicting historical Western life
 * - Contrast against modern ranch photography
 * - Contrast against documentary Western work
 * - Links prominently to /Historical-Western-Art
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";








import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-historical-western-photography";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-historical-western-photography";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Header image - cowboy that represents historical narrative
export const headerImage = {
  id: "i-7GcQw6R",
  src: getProxySrc("i-7GcQw6R", "l"),
  alt: "Historical Western photography: contemporary fine art depicting frontier psychology"
};

// Demo images showing range of historical Western work
export const image1 = {
  id: "i-5fm7Hhr",
  src: getProxySrc("i-5fm7Hhr", "l"),
  alt: "Cowboy portrait exploring the psychological tension of frontier life"
};
export const image2 = {
  id: "i-66qXms3",
  src: getProxySrc("i-66qXms3", "l"),
  alt: "Historical Western photography using painterly composition and period authenticity"
};
export const image3 = {
  id: "i-c5K798H",
  src: getProxySrc("i-c5K798H", "l"),
  alt: "Narrative Western art depicting the lived experience of the American frontier"
};
export const image4 = {
  id: "i-KVxkXrV",
  src: getProxySrc("i-KVxkXrV", "l"),
  alt: "Contemporary fine art photography with historical Western themes"
};

export const bodyImages = [
  {
    id: "i-6Ffpw9t",
    src: getProxySrc("i-6Ffpw9t", "l"),
    alt: "Frontier scene with atmospheric depth"
  },
  {
    id: "i-89qzJ6S",
    src: getProxySrc("i-89qzJ6S", "l"),
    alt: "Character study in warm directional light"
  },
  {
    id: "i-c5K798H",
    src: getProxySrc("i-c5K798H", "l"),
    alt: "Defiant moment — tension composed rather than captured"
  },
  {
    id: "i-LCspRF4",
    src: getProxySrc("i-LCspRF4", "l"),
    alt: "Cowboy at dusk in quiet reflection"
  },
];

export const pageTitle = "What Is Historical Western Photography? Definition and Distinction";
export const titleTag = "What Is Historical Western Photography? Definition";
export const pageDescription = "Historical Western photography does not mean antique photographs. It refers to contemporary fine art depicting historical Western life through narrative construction and painterly composition.";
export const metaDescription = "Historical Western photography does not mean antique photographs. It is contemporary fine art depicting historical Western life through narrative construction.";

export const historicalWesternPhotographyFaq = [
  { q: "Is historical Western photography the same as antique Western photography?", a: "Not necessarily. Antique Western photographs were created during an earlier historical period and may provide direct visual evidence of the people, places, and circumstances of that time. Contemporary historical Western photography can revisit those subjects through reenactment, interpretation, or fine art. Its historical subject matter does not require the photograph itself to be old." },
  { q: "Is historical Western photography documentary photography?", a: "The broader field includes documentary records and archival imagery. In the fine-art sense this page defines, no: documentary photography captures real moments without intervention, while historical Western fine art is constructed, directed, and authored. Wayne Heim begins with camera-captured material made with living historians, then develops it into narrative fine art rather than presenting it as a record of the event." },
  { q: "How is historical Western photography different from modern ranch photography?", a: "Modern ranch photography generally depicts the people, animals, work, and landscapes of the contemporary West. Historical Western photography focuses on earlier periods or their interpretation, often through period clothing, tools, settings, and historically informed activities. Both can communicate authentic Western experiences, but they approach different moments in the region's continuing history." },
  { q: "What role do living historians play in Wayne Heim's work?", a: "Living historians bring researched knowledge, practiced skills, period clothing, and an understanding of historical life to the scenes Wayne photographs. They are active collaborators whose participation helps establish a believable foundation. Heim then uses that captured material as the starting point for his own artistic interpretation, refining the finished composition around its intended story." },
  { q: "Why does the distinction between historical photography and historical fine art matter?", a: "The distinction clarifies what the image is intended to accomplish. A documentary photograph may be evaluated for the information it preserves or communicates. A work of historical narrative fine art may draw upon authentic material while asking broader questions about human experience, memory, and meaning. Wayne Heim's finished work is intended to be understood as authored art — not merely as a record of the circumstances in which the original photograph was made." },
];

export const faqStructuredData = getFAQPageStructuredData(historicalWesternPhotographyFaq, canonicalUrl);

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
  getAbsoluteProxySrc(image4.id, "l"),
  getAbsoluteProxySrc(bodyImages[0].id, "l"),
  getAbsoluteProxySrc(bodyImages[1].id, "l"),
  getAbsoluteProxySrc(bodyImages[2].id, "l"),
  getAbsoluteProxySrc(bodyImages[3].id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Western Art", item: "https://www.k4studios.com/Blog/what-is-western-art" },
    { name: "Western Fine Art", item: "https://www.k4studios.com/Blog/what-is-western-fine-art" },
    { name: "Western Fine Art Photography", item: "https://www.k4studios.com/Blog/what-is-western-fine-art-photography" },
    { name: "Historical Western Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Historical Western Photography? Definition and Distinction",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-02-13",
    articleSection: "Fine Art",
    definedTerm: {
      name: "Historical Western Photography",
      description: pageDescription,
    },
    keywords: [
      "historical western photography",
      "historical western art",
      "western fine art photography",
      "frontier photography",
      "narrative western photography",
      "historically themed western art"
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

// OG/Twitter meta
export const meta = {
  description: metaDescription,
  keywords: "historical western photography, historical western art, western fine art photography, frontier photography, narrative western photography",
  ogTitle: pageTitle,
  ogDescription: metaDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: metaDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Historical Western Photography`;

import visualData from './what-is-historical-western-photography.json';
export const pageData = { layout: {title: titleTag,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 7, pagePath: sectionPath, focusKey: "western-narrative-color" };
