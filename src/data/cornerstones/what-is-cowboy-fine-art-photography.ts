
/**
 * What Is Cowboy Fine Art Photography? — Cornerstone Definition Article
 * 
 * Purpose: Own the definition layer for "Cowboy Fine Art Photography"
 * Positions K4 as authority on cowboy photography as fine art discipline.
 * 
 * Architecture:
 * - Prose-first, definitional
 * - Article schema (not gallery)
 * - Image block after key section (SERP visibility)
 * - Internal hub that feeds galleries
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";






import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-cowboy-fine-art-photography";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-cowboy-fine-art-photography";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Header image banner
export const headerImage = {
  id: "i-H8VZWJM",
  src: getProxySrc("i-H8VZWJM", "l"),
  alt: "Cowboy fine art photography — black and white portrait capturing character, presence, and psychological depth"
};

// Example images - cowboy fine art focused
export const image1 = {
  id: "i-mqDfN5z",
  src: getProxySrc("i-mqDfN5z", "l"),
  alt: "Cowboy fine art photography — painterly light and narrative restraint"
};
export const image2 = {
  id: "i-fJ9WQSS",
  src: getProxySrc("i-fJ9WQSS", "l"),
  alt: "Cowboy fine art photography — character study with atmospheric depth"
};
export const image3 = {
  id: "i-r5Pb7zJ",
  src: getProxySrc("i-r5Pb7zJ", "l"),
  alt: "Cowboy fine art photography — moment suspended in narrative tension"
};

// Narrative western images for the aside callouts
export const narrativeImage1 = {
  id: "i-LCspRF4",
  src: getProxySrc("i-LCspRF4", "l"),
  alt: "Cowboy standing beside frontier wagon at sunset on open prairie, warm golden hour light in painterly Western photograph."
};
export const narrativeImage2 = {
  id: "i-mqQxwNn",
  src: getProxySrc("i-mqQxwNn", "l"),
  alt: "By a window, a cowboy holds a rifle and looks outward, partially lit in a black and white Western portrait."
};
export const narrativeImage3 = {
  id: "i-ncFcHDM",
  src: getProxySrc("i-ncFcHDM", "l"),
  alt: "A bearded cowboy in a red shirt and wide-brimmed hat stands alone in soft morning light, facing forward in an open Western landscape."
};

export const pageTitle = "What Is Cowboy Fine Art Photography? - Wayne Heim";
export const pageDescription = "Cowboy fine art photography treats the cowboy as a subject for authored portraiture—built with narrative intent, painterly craft, and psychological depth rather than documentation or nostalgia.";
export const metaDescription = "Cowboy fine art photography treats the cowboy as a subject for authored portraiture — built with narrative intent, painterly handling, and psychological depth.";

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
  getAbsoluteProxySrc(narrativeImage1.id, "l"),
  getAbsoluteProxySrc(narrativeImage2.id, "l"),
  getAbsoluteProxySrc(narrativeImage3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Western Art", item: "https://www.k4studios.com/Blog/what-is-western-art" },
    { name: "Western Fine Art", item: "https://www.k4studios.com/Blog/what-is-western-fine-art" },
    { name: "Western Fine Art Photography", item: "https://www.k4studios.com/Blog/what-is-western-fine-art-photography" },
    { name: "Cowboy Fine Art Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Cowboy Fine Art Photography?",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-02-14",
    articleSection: "Fine Art Photography",
    definedTerm: {
      name: "Cowboy Fine Art Photography",
      description: pageDescription,
    },
    keywords: [
      "cowboy fine art photography",
      "cowboy photography",
      "cowboy portraits",
      "western fine art photography",
      "cowboy art",
      "American West photography"
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
  description: metaDescription,
  keywords: "cowboy fine art photography, cowboy photography, cowboy portraits, western fine art photography, cowboy art, American West photography",
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

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Cowboy Fine Art Photography`;

import visualData from './what-is-cowboy-fine-art-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 8, pagePath: sectionPath, focusKey: "cowboy-portraits-0" };
